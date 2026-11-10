"use server";

import { z } from "zod";
import { AppwriteException } from "node-appwrite";
import { DB, T, adminClient, isId, requireUser, type Prefs } from "@/lib/appwrite";
import * as data from "@/lib/data";
import { BADGES } from "@/lib/logic.ts";
import { todayIn } from "@/lib/dates.ts";
import { COLORS, type Energy, type Settings, type State, type Task } from "@/lib/types.ts";
import type { ReminderKind } from "@/lib/logic.ts";

export type Result<T = undefined> = { ok: true; value?: T } | { ok: false; error: string };

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const id = z.string().refine(isId, "bad id");
const step = z.object({ id: z.string().min(1).max(40), text: z.string().trim().min(1).max(120), done: z.boolean() });
const taskShape = z.object({
  id,
  date,
  title: z.string().trim().min(1).max(120),
  emoji: z.string().min(1).max(16),
  color: z.enum(COLORS),
  time: hhmm.nullable(),
  startsAt: z.number().int().nullable(),
  dayStartAt: z.number().int(),
  estimateMin: z.number().int().min(1).max(600).nullable(),
  prepMin: z.number().int().min(0).max(180),
  remindEvery: z.number().int().min(0).max(240),
  steps: z.array(step).max(12),
  done: z.boolean(),
  doneAt: z.string().nullable(),
  snoozedUntil: z.number().int().nullable(),
  focusSeconds: z.number().int().min(0).max(86400),
  createdAt: z.string(),
});

async function run<T>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  try {
    const user = await requireUser();
    return { ok: true, value: await fn(user.id) };
  } catch (e) {
    if (e instanceof data.CapError) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "UNAUTHENTICATED") return { ok: false, error: "Your session ended. Sign in again." };
    if (e instanceof Error && e.message === "NOT_FOUND") return { ok: false, error: "That task no longer exists." };
    if (e instanceof z.ZodError) return { ok: false, error: "Some of that wasn't valid." };
    console.error("data action failed", e instanceof AppwriteException ? `${e.code} ${e.type}` : e);
    return { ok: false, error: "Couldn't save that. Check your connection and try again." };
  }
}

export async function loadAll(): Promise<Result<State & { name: string }>> {
  try {
    const user = await requireUser();
    return { ok: true, value: await data.loadState(user) };
  } catch {
    return { ok: false, error: "Your session ended. Sign in again." };
  }
}

export async function createTask(task: Task) {
  return run((uid) => data.createTask(uid, taskShape.parse(task)));
}

const patchShape = taskShape.omit({ id: true, createdAt: true }).partial();
export async function updateTask(taskId: string, patch: Partial<Task>) {
  return run(async (uid) => {
    const p = patchShape.parse(patch);
    const row: Record<string, unknown> = {};
    if (p.date !== undefined) row.date = p.date;
    if (p.title !== undefined) row.title = p.title;
    if (p.emoji !== undefined) row.emoji = p.emoji;
    if (p.color !== undefined) row.color = p.color;
    if (p.time !== undefined) row.time = p.time;
    if (p.startsAt !== undefined) row.startsAt = p.startsAt == null ? null : new Date(p.startsAt).toISOString();
    if (p.dayStartAt !== undefined) row.dayStartAt = new Date(p.dayStartAt).toISOString();
    if (p.estimateMin !== undefined) row.estimateMin = p.estimateMin;
    if (p.prepMin !== undefined) row.prepMin = p.prepMin;
    if (p.remindEvery !== undefined) row.remindEvery = p.remindEvery;
    if (p.steps !== undefined) row.steps = JSON.stringify(p.steps);
    if (p.done !== undefined) row.done = p.done;
    if (p.doneAt !== undefined) row.doneAt = p.doneAt;
    if (p.snoozedUntil !== undefined) row.snoozedUntil = p.snoozedUntil == null ? null : new Date(p.snoozedUntil).toISOString();
    if (p.focusSeconds !== undefined) row.focusSeconds = p.focusSeconds;
    await data.updateTask(uid, id.parse(taskId), row);
  });
}

export async function deleteTask(taskId: string) {
  return run((uid) => data.deleteTask(uid, id.parse(taskId)));
}

/** Claims a due reminder for the open tab (false if the server push or another tab already sent it). */
export async function takeReminder(taskId: string, kind: ReminderKind) {
  return run(async (uid) => {
    const task = await data.getOwnTask(uid, id.parse(taskId));
    if (!task || !["prep", "start", "nag"].includes(kind)) return false;
    const energy = await adminClient().tables.getRow({ databaseId: DB, tableId: T.energy, rowId: `${uid}.${task.date}` }).catch(() => null);
    return data.takeReminder(uid, task, kind, Date.now(), energy?.level === "low");
  });
}

export async function logFocus(taskId: string | null, day: string, minutes: number) {
  return run((uid) => data.addFocus(uid, taskId == null ? null : id.parse(taskId), date.parse(day), z.number().int().min(1).max(120).parse(minutes)));
}

export async function addReward(title: string, emoji: string, cost: number) {
  return run((uid) => data.addReward(uid, z.string().trim().min(1).max(80).parse(title), z.string().min(1).max(16).parse(emoji), z.number().int().min(1).max(10000).parse(cost)));
}

export async function deleteReward(rewardId: string) {
  return run((uid) => data.deleteReward(uid, z.string().min(1).max(36).parse(rewardId)));
}

export async function claimReward(rewardId: string, title: string, cost: number) {
  return run((uid) => data.addClaim(uid, z.string().min(1).max(36).parse(rewardId), z.string().min(1).max(80).parse(title), z.number().int().min(1).max(10000).parse(cost)));
}

const badgeIds = new Set(BADGES.map((b) => b.id));
export async function saveBadges(ids: string[]) {
  return run((uid) => data.addBadges(uid, ids.filter((b) => badgeIds.has(b))));
}

export async function setEnergy(level: Energy) {
  return run(async (uid) => {
    const user = await requireUser();
    await data.setEnergy(uid, todayIn(user.prefs.timezone), z.enum(["low", "ok", "high"]).parse(level));
  });
}

const settingsShape = z.object({
  timezone: z.string().min(1).max(64).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }),
  notifications: z.boolean(),
  sound: z.boolean(),
  focusMin: z.number().int().min(1).max(60),
  breakMin: z.number().int().min(1).max(30),
});

export async function savePrefs(settings: Settings, lastCongrats: number) {
  return run(async (uid) => {
    const { timezone, ...rest } = settingsShape.parse(settings);
    const prefs: Prefs = { timezone, settings: rest, lastCongrats: z.number().int().min(-1).max(100).parse(lastCongrats) };
    await data.savePrefs(uid, prefs);
  });
}
