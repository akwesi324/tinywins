// One-time (and re-runnable) Appwrite setup: database, tables, columns, indexes, and the
// every-minute reminder function. Needs APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
// and for the function SITE_URL + CRON_SECRET.
//   node scripts/setup-appwrite.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AppwriteException, Client, Functions, ID, TablesDB, TablesDBIndexType as IndexType } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

for (const file of [".env.local", ".env"]) {
  const p = path.join(import.meta.dirname, "..", file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, SITE_URL, CRON_SECRET } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY.");
  process.exit(1);
}
const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const db = new TablesDB(client);
const fn = new Functions(client);
const DB = "tinywins";

const exists = (e) => e instanceof AppwriteException && e.code === 409;
async function ignoreExisting(p) {
  try {
    return await p;
  } catch (e) {
    if (!exists(e)) throw e;
  }
}

// column helpers: [key, type, options]
const v = (key, size, required = true) => ({ key, type: "varchar", size, required });
const i = (key, required = true, min, max) => ({ key, type: "integer", required, min, max });
const b = (key) => ({ key, type: "boolean", required: true });
const d = (key, required = false) => ({ key, type: "datetime", required });
const e = (key, elements) => ({ key, type: "enum", elements, required: true });
const t = (key) => ({ key, type: "text", required: false });

const TABLES = {
  tasks: {
    columns: [
      v("userId", 36), v("date", 10), i("slot", true, 1, 5), v("title", 120), v("emoji", 16),
      e("color", ["rose", "orange", "amber", "lime", "emerald", "sky", "violet", "fuchsia"]),
      v("time", 5, false), d("startsAt"), d("dayStartAt", true), i("estimateMin", false, 1, 600), i("prepMin", true, 0, 180),
      i("remindEvery", true, 0, 240), t("steps"), b("done"), d("doneAt"), d("snoozedUntil"), i("focusSeconds", true, 0, 86400),
    ],
    // the 5-a-day cap: one task per (user, day, slot 1-5)
    indexes: [["user_date_slot", IndexType.Unique, ["userId", "date", "slot"]], ["user_date", IndexType.Key, ["userId", "date"]], ["open_by_date", IndexType.Key, ["done", "date"]]],
  },
  reminders: { columns: [v("userId", 36), v("taskId", 36), e("kind", ["prep", "start", "nag"])], indexes: [["user", IndexType.Key, ["userId"]], ["task", IndexType.Key, ["userId", "taskId"]]] },
  rewards: { columns: [v("userId", 36), v("title", 80), v("emoji", 16), i("cost", true, 1, 10000)], indexes: [["user", IndexType.Key, ["userId"]]] },
  claims: { columns: [v("userId", 36), v("rewardId", 36, false), v("title", 80), i("cost", true, 1, 10000)], indexes: [["user", IndexType.Key, ["userId"]]] },
  focus_sessions: { columns: [v("userId", 36), v("taskId", 36, false), v("date", 10), i("minutes", true, 1, 120)], indexes: [["user", IndexType.Key, ["userId"]]] },
  badges: { columns: [v("userId", 36), v("badgeId", 40)], indexes: [["user", IndexType.Key, ["userId"]]] },
  energy: { columns: [v("userId", 36), v("date", 10), e("level", ["low", "ok", "high"])], indexes: [["user", IndexType.Key, ["userId", "date"]], ["level_date", IndexType.Key, ["level", "date"]]] },
  push_subscriptions: { columns: [v("userId", 36), { key: "endpoint", type: "text", required: true }, v("p256dh", 200), v("auth", 100)], indexes: [["user", IndexType.Key, ["userId"]]] },
  ai_requests: { columns: [v("userId", 36)], indexes: [["user", IndexType.Key, ["userId"]]] },
};

async function createColumn(tableId, c) {
  const base = { databaseId: DB, tableId, key: c.key, required: c.required };
  if (c.type === "varchar") return db.createVarcharColumn({ ...base, size: c.size });
  if (c.type === "integer") return db.createIntegerColumn({ ...base, min: c.min ?? null, max: c.max ?? null });
  if (c.type === "boolean") return db.createBooleanColumn(base);
  if (c.type === "datetime") return db.createDatetimeColumn(base);
  if (c.type === "enum") return db.createEnumColumn({ ...base, elements: c.elements });
  if (c.type === "text") return db.createTextColumn(base);
  throw new Error(`unknown column type ${c.type}`);
}

async function waitForColumns(tableId) {
  for (let n = 0; n < 60; n++) {
    const { columns } = await db.listColumns({ databaseId: DB, tableId });
    if (columns.every((c) => c.status === "available")) return;
    const failed = columns.find((c) => c.status === "failed");
    if (failed) throw new Error(`column ${tableId}.${failed.key} failed: ${failed.error}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`columns of ${tableId} not ready`);
}

console.log(`Appwrite project ${APPWRITE_PROJECT_ID}`);
await ignoreExisting(db.create({ databaseId: DB, name: "TinyWins" }));
for (const [tableId, spec] of Object.entries(TABLES)) {
  // no table permissions: only the server (API key) reads or writes; it scopes every query to the user
  await ignoreExisting(db.createTable({ databaseId: DB, tableId, name: tableId, permissions: [], rowSecurity: false }));
  for (const c of spec.columns) await ignoreExisting(createColumn(tableId, c));
  await waitForColumns(tableId);
  for (const [key, type, columns] of spec.indexes) await ignoreExisting(db.createIndex({ databaseId: DB, tableId, key, type, columns }));
  console.log(`  table ${tableId}: ${spec.columns.length} columns, ${spec.indexes.length} indexes`);
}

if (!SITE_URL || !CRON_SECRET) {
  console.log("SITE_URL / CRON_SECRET not set: skipping the reminder function.");
  process.exit(0);
}

const FUNCTION_ID = "reminder-trigger";
const runtimes = (await fn.listRuntimes()).runtimes.map((r) => r.key).filter((k) => /^node-\d+/.test(k)).sort((a, b) => parseFloat(b.slice(5)) - parseFloat(a.slice(5)));
const runtime = runtimes.find((r) => ["node-22", "node-20.0", "node-21.0"].includes(r)) ?? runtimes[0];
const settings = { name: "Reminder trigger", runtime, execute: [], schedule: "* * * * *", timeout: 60, entrypoint: "src/main.js", commands: "", logging: true, enabled: true };
try {
  await fn.create({ functionId: FUNCTION_ID, ...settings });
} catch (err) {
  if (!exists(err)) throw err;
  await fn.update({ functionId: FUNCTION_ID, ...settings });
}
for (const [key, value, secret] of [["SITE_URL", SITE_URL.replace(/\/$/, ""), false], ["CRON_SECRET", CRON_SECRET, true]]) {
  const { variables } = await fn.listVariables({ functionId: FUNCTION_ID });
  const existing = variables.find((x) => x.key === key);
  if (existing) await fn.updateVariable({ functionId: FUNCTION_ID, variableId: existing.$id, key, value, secret });
  else await fn.createVariable({ functionId: FUNCTION_ID, variableId: ID.unique(), key, value, secret });
}
const archive = path.join(os.tmpdir(), `tinywins-reminder-${Date.now()}.tar.gz`);
execFileSync("tar", ["-czf", archive, "-C", path.join(import.meta.dirname, "..", "appwrite", "reminder-trigger"), "."]);
const deployment = await fn.createDeployment({ functionId: FUNCTION_ID, code: InputFile.fromPath(archive, "code.tar.gz"), activate: true });
fs.rmSync(archive, { force: true });
console.log(`  function ${FUNCTION_ID} (${runtime}) scheduled every minute, deployment ${deployment.$id}`);
