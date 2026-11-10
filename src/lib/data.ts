import "server-only";
import { createHash } from "node:crypto";
import { AppwriteException, ID, Query, type Models } from "node-appwrite";
import { adminClient, DB, T, type Prefs, type SessionUser } from "@/lib/appwrite";
import { MAX_TASKS_PER_DAY, type ColorKey, type Energy, type ReminderLog, type State, type Step, type Task } from "@/lib/types.ts";
import { reminderGap, type ReminderKind } from "@/lib/logic.ts";

// Server-side data access. Every function takes the user id from a verified session and filters
// on it, so one user can never read or change another user's rows.

type Row = Models.DefaultRow & Record<string, unknown>;
const tables = () => adminClient().tables;
const all = (userId: string, extra: string[] = []) => [Query.equal("userId", userId), Query.limit(5000), ...extra];

export class CapError extends Error {}
export const isConflict = (e: unknown) => e instanceof AppwriteException && e.code === 409;

// ------------------------------------------------------------------ mapping
const ms = (v: unknown) => (typeof v === "string" && v ? Date.parse(v) : null);
const iso = (n: number | null) => (n == null ? null : new Date(n).toISOString());

export function rowToTask(r: Row): Task & { slot: number } {
  let steps: Step[] = [];
  try {
    steps = JSON.parse(String(r.steps ?? "[]"));
  } catch {
    steps = [];
  }
  return {
    id: r.$id, date: String(r.date), slot: Number(r.slot), title: String(r.title), emoji: String(r.emoji), color: r.color as ColorKey,
    time: (r.time as string | null) ?? null, startsAt: ms(r.startsAt), dayStartAt: ms(r.dayStartAt) ?? 0,
    estimateMin: (r.estimateMin as number | null) ?? null, prepMin: Number(r.prepMin ?? 0), remindEvery: Number(r.remindEvery ?? 0),
    steps, done: Boolean(r.done), doneAt: (r.doneAt as string | null) ?? null, snoozedUntil: ms(r.snoozedUntil),
    focusSeconds: Number(r.focusSeconds ?? 0), createdAt: r.$createdAt,
  };
}

export function taskToRow(t: Task) {
  return {
    date: t.date, title: t.title, emoji: t.emoji, color: t.color, time: t.time, startsAt: iso(t.startsAt), dayStartAt: iso(t.dayStartAt),
    estimateMin: t.estimateMin, prepMin: t.prepMin, remindEvery: t.remindEvery, steps: JSON.stringify(t.steps), done: t.done,
    doneAt: t.doneAt, snoozedUntil: iso(t.snoozedUntil), focusSeconds: t.focusSeconds,
  };
}

// ------------------------------------------------------------------ load
export async function loadState(user: SessionUser): Promise<State & { name: string }> {
  const db = tables();
  const [tasks, rewards, claims, focus, badges, energy, reminders] = await Promise.all([
    db.listRows<Row>({ databaseId: DB, tableId: T.tasks, queries: all(user.id, [Query.orderAsc("date")]) }),
    db.listRows<Row>({ databaseId: DB, tableId: T.rewards, queries: all(user.id, [Query.orderAsc("cost")]) }),
    db.listRows<Row>({ databaseId: DB, tableId: T.claims, queries: all(user.id) }),
    db.listRows<Row>({ databaseId: DB, tableId: T.focus, queries: all(user.id) }),
    db.listRows<Row>({ databaseId: DB, tableId: T.badges, queries: all(user.id) }),
    db.listRows<Row>({ databaseId: DB, tableId: T.energy, queries: all(user.id) }),
    db.listRows<Row>({ databaseId: DB, tableId: T.reminders, queries: all(user.id, [Query.greaterThan("$createdAt", new Date(Date.now() - 3 * 86400_000).toISOString())]) }),
  ]);
  return {
    version: 1,
    name: user.name,
    tasks: tasks.rows.map(rowToTask).map(({ slot: _s, ...t }) => (void _s, t)),
    rewards: rewards.rows.map((r) => ({ id: r.$id, title: String(r.title), emoji: String(r.emoji), cost: Number(r.cost) })),
    claims: claims.rows.map((c) => ({ rewardId: String(c.rewardId ?? ""), title: String(c.title), cost: Number(c.cost), at: c.$createdAt })),
    focusSessions: focus.rows.map((f) => ({ date: String(f.date), minutes: Number(f.minutes), taskId: (f.taskId as string | null) ?? null, at: f.$createdAt })),
    badges: badges.rows.map((b) => ({ id: String(b.badgeId), at: b.$createdAt })),
    energy: Object.fromEntries(energy.rows.map((e) => [String(e.date), e.level as Energy])),
    reminders: toLog(reminders.rows),
    settings: { timezone: user.prefs.timezone, ...user.prefs.settings },
    lastCongrats: user.prefs.lastCongrats,
  };
}

export function toLog(rows: Row[]): ReminderLog {
  const log: ReminderLog = {};
  for (const r of rows) {
    const id = String(r.taskId);
    const at = Date.parse(r.$createdAt);
    const cur = (log[id] ??= {});
    if (r.kind === "prep") cur.prep = at;
    if (r.kind === "start") cur.start = at;
    cur.last = Math.max(cur.last ?? 0, at);
  }
  return log;
}

// ------------------------------------------------------------------ tasks (5 slots per day)
async function usedSlots(userId: string, date: string, exceptId?: string) {
  const rows = await tables().listRows<Row>({ databaseId: DB, tableId: T.tasks, queries: [Query.equal("userId", userId), Query.equal("date", date), Query.limit(10)] });
  return new Set(rows.rows.filter((r) => r.$id !== exceptId).map((r) => Number(r.slot)));
}

/**
 * Writes `data` into a free slot (1-5) of `date`. The unique index (userId, date, slot) makes the
 * database refuse a 6th task even when two requests race: a collision just tries the next slot.
 */
async function withFreeSlot(userId: string, date: string, write: (slot: number) => Promise<unknown>, exceptId?: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const used = await usedSlots(userId, date, exceptId);
    const free = [1, 2, 3, 4, 5].filter((s) => !used.has(s));
    if (!free.length) throw new CapError(`TinyWins keeps each day to ${MAX_TASKS_PER_DAY} tasks. Finish or move one first.`);
    for (const slot of free) {
      try {
        await write(slot);
        return;
      } catch (e) {
        if (!isConflict(e)) throw e;
      }
    }
  }
  throw new CapError(`TinyWins keeps each day to ${MAX_TASKS_PER_DAY} tasks. Finish or move one first.`);
}

export async function createTask(userId: string, task: Task) {
  await withFreeSlot(userId, task.date, (slot) =>
    tables().createRow<Row>({ databaseId: DB, tableId: T.tasks, rowId: task.id, data: { userId, slot, ...taskToRow(task) } }),
  );
}

async function ownTask(userId: string, id: string): Promise<(Task & { slot: number }) | null> {
  try {
    const row = await tables().getRow<Row>({ databaseId: DB, tableId: T.tasks, rowId: id });
    return row.userId === userId ? rowToTask(row) : null;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return null;
    throw e;
  }
}

/** Updates fields of the user's own task. Moving to another date takes a free slot there. */
export async function updateTask(userId: string, id: string, patch: Partial<ReturnType<typeof taskToRow>>) {
  const existing = await ownTask(userId, id);
  if (!existing) throw new Error("NOT_FOUND");
  const db = tables();
  if (patch.date && patch.date !== existing.date) {
    await withFreeSlot(userId, patch.date, (slot) => db.updateRow<Row>({ databaseId: DB, tableId: T.tasks, rowId: id, data: { ...patch, slot } }), id);
    await clearReminders(userId, id);
    return;
  }
  if (patch.startsAt !== undefined && patch.startsAt !== (existing.startsAt == null ? null : iso(existing.startsAt))) await clearReminders(userId, id);
  await db.updateRow({ databaseId: DB, tableId: T.tasks, rowId: id, data: patch });
}

export async function deleteTask(userId: string, id: string) {
  if (!(await ownTask(userId, id))) return;
  await tables().deleteRow({ databaseId: DB, tableId: T.tasks, rowId: id });
  await clearReminders(userId, id);
}

export async function getOwnTask(userId: string, id: string) {
  return ownTask(userId, id);
}

// ------------------------------------------------------------------ reminders (each fires once)
async function clearReminders(userId: string, taskId: string) {
  await tables().deleteRows({ databaseId: DB, tableId: T.reminders, queries: [Query.equal("userId", userId), Query.equal("taskId", taskId)] });
}

/**
 * Records a reminder and returns true if this caller should show it. Row ids are deterministic
 * (task + kind, or task + nag number), so when the server job and an open tab race, the database
 * accepts only one of them.
 */
export async function takeReminder(userId: string, task: Task, kind: ReminderKind, now: number, low: boolean): Promise<boolean> {
  if (task.done || (task.snoozedUntil && task.snoozedUntil > now)) return false;
  let suffix: string;
  if (kind === "prep") suffix = "p";
  else if (kind === "start") suffix = "s";
  else {
    const gap = Math.max(1, reminderGap(task, low)) * 60000;
    const anchor = task.startsAt ?? task.dayStartAt;
    suffix = `n${Math.max(0, Math.floor((now - anchor) / gap))}`;
  }
  try {
    await tables().createRow({ databaseId: DB, tableId: T.reminders, rowId: `${task.id}.${suffix}`, data: { userId, taskId: task.id, kind } });
    return true;
  } catch (e) {
    if (isConflict(e)) return false;
    throw e;
  }
}

// ------------------------------------------------------------------ everything else
export async function addFocus(userId: string, taskId: string | null, date: string, minutes: number) {
  const db = tables();
  await db.createRow({ databaseId: DB, tableId: T.focus, rowId: ID.unique(), data: { userId, taskId, date, minutes } });
  if (taskId) {
    const t = await ownTask(userId, taskId);
    if (t) await db.updateRow({ databaseId: DB, tableId: T.tasks, rowId: taskId, data: { focusSeconds: Math.min(86400, t.focusSeconds + minutes * 60) } });
  }
}

export async function addReward(userId: string, title: string, emoji: string, cost: number) {
  const row = await tables().createRow<Row>({ databaseId: DB, tableId: T.rewards, rowId: ID.unique(), data: { userId, title, emoji, cost } });
  return { id: row.$id, title, emoji, cost };
}

export async function deleteReward(userId: string, id: string) {
  const row = await tables().getRow<Row>({ databaseId: DB, tableId: T.rewards, rowId: id }).catch(() => null);
  if (row?.userId === userId) await tables().deleteRow({ databaseId: DB, tableId: T.rewards, rowId: id });
}

export async function addClaim(userId: string, rewardId: string, title: string, cost: number) {
  await tables().createRow({ databaseId: DB, tableId: T.claims, rowId: ID.unique(), data: { userId, rewardId, title, cost } });
}

export async function addBadges(userId: string, badgeIds: string[]) {
  for (const badgeId of badgeIds) {
    await tables()
      .createRow({ databaseId: DB, tableId: T.badges, rowId: `${userId}.${badgeId}`.slice(0, 36), data: { userId, badgeId } })
      .catch((e) => {
        if (!isConflict(e)) throw e;
      });
  }
}

export async function setEnergy(userId: string, date: string, level: Energy) {
  await tables().upsertRow({ databaseId: DB, tableId: T.energy, rowId: `${userId}.${date}`, data: { userId, date, level } });
}

export async function savePrefs(userId: string, prefs: Prefs) {
  await adminClient().users.updatePrefs({ userId, prefs });
}

export async function seedRewards(userId: string) {
  for (const [title, emoji, cost] of [["Watch an episode of my show", "📺", 50], ["My favourite snack", "🍫", 30], ["A walk outside with music", "🎧", 20]] as const) {
    await addReward(userId, title, emoji, cost);
  }
}

const endpointId = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 36);

export async function savePushSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string }) {
  // one row per browser endpoint: if another account used this browser before, it moves to this one
  await tables().upsertRow({ databaseId: DB, tableId: T.push, rowId: endpointId(sub.endpoint), data: { userId, ...sub } });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const id = endpointId(endpoint);
  const row = await tables().getRow<Row>({ databaseId: DB, tableId: T.push, rowId: id }).catch(() => null);
  if (row?.userId === userId) await tables().deleteRow({ databaseId: DB, tableId: T.push, rowId: id });
}

export async function countAiRequestsLastHour(userId: string) {
  const r = await tables().listRows({ databaseId: DB, tableId: T.ai, queries: [Query.equal("userId", userId), Query.greaterThan("$createdAt", new Date(Date.now() - 3600_000).toISOString()), Query.limit(100)] });
  return r.rows.length;
}

export async function logAiRequest(userId: string) {
  await tables().createRow({ databaseId: DB, tableId: T.ai, rowId: ID.unique(), data: { userId } });
}
