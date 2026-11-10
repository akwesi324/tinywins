// Creates (or updates) the cron-job.org job that calls the reminder endpoint every minute.
// cron-job.org is free and allows a 1-minute schedule (Appwrite's free plan only allows hourly).
//   CRONJOB_API_KEY=... SITE_URL=https://... CRON_SECRET=...   node scripts/setup-cron.mjs
// (cron-job.org -> Settings -> API -> create an API key)
import fs from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = path.join(import.meta.dirname, "..", file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const { CRONJOB_API_KEY, SITE_URL, CRON_SECRET } = process.env;
if (!CRONJOB_API_KEY || !SITE_URL || !CRON_SECRET) {
  console.error("Set CRONJOB_API_KEY, SITE_URL and CRON_SECRET.");
  process.exit(1);
}

const API = "https://api.cron-job.org";
const TITLE = "TinyWins reminders";
async function call(method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${CRONJOB_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`cron-job.org ${method} ${route}: HTTP ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

const job = {
  url: `${SITE_URL.replace(/\/$/, "")}/api/cron/reminders`,
  title: TITLE,
  enabled: true,
  saveResponses: false,
  requestTimeout: 30,
  requestMethod: 1, // POST
  extendedData: { headers: { Authorization: `Bearer ${CRON_SECRET}` }, body: "" },
  schedule: { timezone: "UTC", expiresAt: 0, hours: [-1], mdays: [-1], minutes: [-1], months: [-1], wdays: [-1] }, // every minute
  notification: { onFailure: true, onSuccess: false, onDisable: true },
};

const { jobs = [] } = await call("GET", "/jobs");
const existing = jobs.find((j) => j.title === TITLE);
if (existing) {
  await call("PATCH", `/jobs/${existing.jobId}`, { job });
  console.log(`Updated job ${existing.jobId}: every minute -> ${job.url}`);
} else {
  const { jobId } = await call("PUT", "/jobs", { job });
  console.log(`Created job ${jobId}: every minute -> ${job.url}`);
}
