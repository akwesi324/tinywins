// Pure rules of the app: the daily cap, reminders, points, streaks, badges, rewards.
// No browser APIs here, so everything is unit-tested in tests/.
import { MAX_TASKS_PER_DAY, type ReminderLog, type State, type Task } from "./types.ts";
import { addDays, parseDateKey } from "./dates.ts";

// ------------------------------------------------------------------ daily cap

export const tasksOn = (state: State, day: string) =>
  state.tasks.filter((t) => t.date === day).sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.createdAt.localeCompare(b.createdAt));

export const slotsLeft = (state: State, day: string) => Math.max(0, MAX_TASKS_PER_DAY - state.tasks.filter((t) => t.date === day).length);

export class CapError extends Error {}

/** Adds a task, refusing a 6th one on the same day. */
export function addTask(state: State, task: Task): State {
  if (slotsLeft(state, task.date) === 0) {
    throw new CapError(`You already have ${MAX_TASKS_PER_DAY} tasks for this day. Finish or move one first.`);
  }
  return { ...state, tasks: [...state.tasks, task] };
}

/** Moves a task to another day (also capped). Clears snooze and reminder history. */
export function moveTask(state: State, id: string, toDay: string): State {
  const task = state.tasks.find((t) => t.id === id);
  if (!task || task.date === toDay) return state;
  if (slotsLeft(state, toDay) === 0) throw new CapError(`That day already has ${MAX_TASKS_PER_DAY} tasks.`);
  const reminders = { ...state.reminders };
  delete reminders[id];
  return { ...state, reminders, tasks: state.tasks.map((t) => (t.id === id ? { ...t, date: toDay, snoozedUntil: null } : t)) };
}

// ------------------------------------------------------------------ low-energy days

export const LIGHT_DAY_TASKS = 3;
export const isLowDay = (state: State, day: string) => state.energy[day] === "low";

/** Minutes between reminders: on a low-energy day half as often, and never more than every 30 min. */
export const reminderGap = (t: Task, low: boolean) => (low ? Math.max(t.remindEvery * 2, 30) : t.remindEvery);

/** Order for the day: by time normally; easiest (shortest, fewest steps) first on low days. */
export function orderForDay(tasks: Task[], low: boolean): Task[] {
  if (!low) return tasks;
  const effort = (t: Task) => (t.estimateMin ?? 45) + t.steps.filter((s) => !s.done).length * 3;
  return [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || effort(a) - effort(b));
}

/** Unfinished tasks a "lighter day" moves to tomorrow: keeps the easiest so at most 3 remain. */
export function lightDayExtras(state: State, day: string): Task[] {
  const all = tasksOn(state, day);
  const open = orderForDay(all.filter((t) => !t.done), true);
  const keep = Math.max(0, LIGHT_DAY_TASKS - all.filter((t) => t.done).length);
  return open.slice(keep);
}

// ------------------------------------------------------------------ reminders

export type ReminderKind = "prep" | "start" | "nag";
export type DueReminder = { taskId: string; kind: ReminderKind };

/**
 * Which reminders should fire now. A task keeps reminding every `remindEvery` minutes after it
 * starts (or through the day from 08:00, for tasks without a time) until it is done, snoozed or
 * moved. `today` is the user's own calendar day (the server passes it per user's time zone).
 */
export function dueReminders(tasks: Task[], log: ReminderLog, now: number, today: string, lowToday = false): DueReminder[] {
  const out: DueReminder[] = [];
  for (const t of tasks) {
    if (t.done || t.date !== today) continue;
    if (t.snoozedUntil && t.snoozedUntil > now) continue;
    const fired = log[t.id] ?? {};
    if (t.startsAt != null) {
      const start = t.startsAt;
      if (t.prepMin > 0 && !fired.prep && now >= start - t.prepMin * 60000 && now < start) {
        out.push({ taskId: t.id, kind: "prep" });
        continue;
      }
      if (now < start) continue;
      if (!fired.start) {
        out.push({ taskId: t.id, kind: "start" });
        continue;
      }
      if (t.remindEvery > 0 && now - (fired.last ?? fired.start) >= reminderGap(t, lowToday) * 60000) out.push({ taskId: t.id, kind: "nag" });
    } else if (t.remindEvery > 0) {
      const since = Math.max(fired.last ?? 0, t.dayStartAt, Date.parse(t.createdAt));
      if (now >= t.dayStartAt && now - since >= reminderGap(t, lowToday) * 60000) out.push({ taskId: t.id, kind: "nag" });
    }
  }
  return out;
}

export function recordReminder(log: ReminderLog, r: DueReminder, now: number): ReminderLog {
  const cur = { ...(log[r.taskId] ?? {}) };
  if (r.kind === "prep") cur.prep = now;
  if (r.kind === "start") cur.start = now;
  cur.last = now;
  return { ...log, [r.taskId]: cur };
}

export function reminderText(t: Task, kind: ReminderKind, low = false): { title: string; body: string } {
  const name = `${t.emoji} ${t.title}`;
  const next = t.steps.find((s) => !s.done)?.text;
  if (kind === "prep") return { title: `Get ready: ${name}`, body: `It starts in ${t.prepMin} min. Finish what you're doing and get set up.` };
  if (low) {
    if (kind === "start") return { title: `Gentle nudge: ${name}`, body: next ? `Low-energy day, so just this: ${next}` : "Low-energy day. Try just 2 minutes. That counts!" };
    return { title: `Whenever you're ready: ${name}`, body: next ? `Tiny step: ${next}. Small is still a win.` : "No pressure. Two minutes is enough to start." };
  }
  if (kind === "start") return { title: `Time for: ${name}`, body: next ? `First tiny step: ${next}` : "You've got this. Just start for 2 minutes." };
  return { title: `Still waiting: ${name}`, body: next ? `Next tiny step: ${next}` : "Tap Done when it's finished, or snooze it for a bit." };
}

// ------------------------------------------------------------------ points

export const POINTS = { task: 10, step: 2, focus: 5, perfectDay: 25 } as const;

export function pointsEarned(state: State): number {
  const tasks = state.tasks.filter((t) => t.done);
  // tiny steps count double on low-energy days
  const steps = state.tasks.reduce((n, t) => n + t.steps.filter((s) => s.done).length * (isLowDay(state, t.date) ? 2 : 1), 0);
  const perfectDays = new Set(tasks.map((t) => t.date));
  let perfect = 0;
  for (const day of perfectDays) {
    const all = state.tasks.filter((t) => t.date === day);
    if (all.length === 5 && all.every((t) => t.done)) perfect += 1;
  }
  return tasks.length * POINTS.task + steps * POINTS.step + state.focusSessions.length * POINTS.focus + perfect * POINTS.perfectDay;
}

export const pointsSpent = (state: State) => state.claims.reduce((n, c) => n + c.cost, 0);
export const pointsBalance = (state: State) => pointsEarned(state) - pointsSpent(state);

export function claimReward(state: State, rewardId: string, now: Date): State {
  const reward = state.rewards.find((r) => r.id === rewardId);
  if (!reward) return state;
  if (pointsBalance(state) < reward.cost) throw new Error(`You need ${reward.cost - pointsBalance(state)} more points for this one.`);
  return { ...state, claims: [...state.claims, { rewardId, title: reward.title, cost: reward.cost, at: now.toISOString() }] };
}

// ------------------------------------------------------------------ streaks

/**
 * Days in a row with at least one finished task. Kind rule: one missed day is forgiven (a
 * "rest day") if no other day was forgiven in the 7 days before it. A streak still counts if
 * today has nothing done yet.
 */
export function streak(state: State, today: string): { current: number; best: number; restDayUsed: boolean } {
  const active = new Set(state.tasks.filter((t) => t.done).map((t) => t.date));
  const walk = (start: string) => {
    let n = 0;
    let lastRest = -Infinity;
    let restUsed = false;
    let day = start;
    for (let i = 0; i < 3650; i++) {
      if (active.has(day)) n += 1;
      else if (n > 0 && i - lastRest > 7 && active.has(addDays(day, -1))) {
        lastRest = i;
        restUsed = true;
      } else break;
      day = addDays(day, -1);
    }
    return { n, restUsed };
  };
  const fromToday = walk(today);
  const current = active.has(today) ? fromToday : walk(addDays(today, -1));

  // best streak over all history (same rule)
  let best = current.n;
  for (const d of active) {
    if (!active.has(addDays(d, 1)) && !active.has(addDays(d, 2))) best = Math.max(best, walk(d).n);
  }
  return { current: current.n, best, restDayUsed: current.restUsed };
}

// ------------------------------------------------------------------ badges

export type Badge = { id: string; emoji: string; title: string; description: string; earned: (s: State, today: string) => boolean };

const doneTasks = (s: State) => s.tasks.filter((t) => t.done);
const focusMinutes = (s: State) => s.focusSessions.reduce((n, f) => n + f.minutes, 0);
const perfectDayCount = (s: State) => {
  const days = new Set(doneTasks(s).map((t) => t.date));
  return [...days].filter((d) => {
    const all = s.tasks.filter((t) => t.date === d);
    return all.length === 5 && all.every((t) => t.done);
  }).length;
};

export const BADGES: Badge[] = [
  { id: "first-win", emoji: "🌱", title: "First win", description: "Finish your first task", earned: (s) => doneTasks(s).length >= 1 },
  { id: "ten-wins", emoji: "🔟", title: "Ten wins", description: "Finish 10 tasks", earned: (s) => doneTasks(s).length >= 10 },
  { id: "fifty-wins", emoji: "🏅", title: "Fifty wins", description: "Finish 50 tasks", earned: (s) => doneTasks(s).length >= 50 },
  { id: "hundred-wins", emoji: "🏆", title: "Hundred club", description: "Finish 100 tasks", earned: (s) => doneTasks(s).length >= 100 },
  { id: "perfect-day", emoji: "🌈", title: "Perfect day", description: "Finish all 5 tasks in one day", earned: (s) => perfectDayCount(s) >= 1 },
  { id: "streak-3", emoji: "🔥", title: "On fire", description: "3-day streak", earned: (s, d) => streak(s, d).best >= 3 },
  { id: "streak-7", emoji: "⚡", title: "Full week", description: "7-day streak", earned: (s, d) => streak(s, d).best >= 7 },
  { id: "streak-30", emoji: "🚀", title: "Unstoppable", description: "30-day streak", earned: (s, d) => streak(s, d).best >= 30 },
  { id: "first-focus", emoji: "🎯", title: "In the zone", description: "Complete a focus session", earned: (s) => s.focusSessions.length >= 1 },
  { id: "focus-5h", emoji: "🧠", title: "Deep focus", description: "5 hours of focus in total", earned: (s) => focusMinutes(s) >= 300 },
  { id: "tiny-steps", emoji: "🪜", title: "Step by step", description: "Tick off 25 tiny steps", earned: (s) => s.tasks.reduce((n, t) => n + t.steps.filter((x) => x.done).length, 0) >= 25 },
  { id: "early-bird", emoji: "🐦", title: "Early bird", description: "Finish a task before 9:00", earned: (s) => doneTasks(s).some((t) => t.doneAt && new Date(t.doneAt).getHours() < 9) },
  { id: "showed-up", emoji: "💜", title: "Showed up anyway", description: "Finish a task on a low-energy day", earned: (s) => doneTasks(s).some((t) => isLowDay(s, t.date)) },
  { id: "treat-yourself", emoji: "🎁", title: "Treat yourself", description: "Claim your first reward", earned: (s) => s.claims.length >= 1 },
  {
    id: "good-guess", emoji: "⏱️", title: "Good guess", description: "Finish 5 tasks within 20% of your time estimate",
    earned: (s) => doneTasks(s).filter((t) => t.estimateMin && t.focusSeconds > 0 && Math.abs(t.focusSeconds / 60 - t.estimateMin) <= t.estimateMin * 0.2).length >= 5,
  },
];

/** Adds badges newly earned; returns the new state and the badges to celebrate. */
export function awardBadges(state: State, today: string, now: Date): { state: State; fresh: Badge[] } {
  const have = new Set(state.badges.map((b) => b.id));
  const fresh = BADGES.filter((b) => !have.has(b.id) && b.earned(state, today));
  if (!fresh.length) return { state, fresh };
  return { state: { ...state, badges: [...state.badges, ...fresh.map((b) => ({ id: b.id, at: now.toISOString() }))] }, fresh };
}

// ------------------------------------------------------------------ time-blindness helpers

/** How well the user's estimates match real focus time (finished tasks with both). */
export function estimateAccuracy(state: State): { count: number; avgEstimate: number; avgActual: number } {
  const rows = doneTasks(state).filter((t) => t.estimateMin && t.focusSeconds > 0);
  if (!rows.length) return { count: 0, avgEstimate: 0, avgActual: 0 };
  return {
    count: rows.length,
    avgEstimate: Math.round(rows.reduce((n, t) => n + (t.estimateMin ?? 0), 0) / rows.length),
    avgActual: Math.round(rows.reduce((n, t) => n + t.focusSeconds / 60, 0) / rows.length),
  };
}

/** Position (0-1) of a moment within the waking day 07:00-23:00, for the day timeline. */
export function dayPosition(ms: number): number {
  const d = new Date(ms);
  const mins = d.getHours() * 60 + d.getMinutes();
  return Math.min(1, Math.max(0, (mins - 7 * 60) / (16 * 60)));
}

/** The task to focus on now: the earliest unfinished timed task that has started, else the next one. */
export function currentTask(state: State, now: number, today: string): Task | null {
  const open = tasksOn(state, today).filter((t) => !t.done);
  return open.find((t) => t.startsAt != null && t.startsAt <= now) ?? open[0] ?? null;
}

export const isPast = (day: string, today: string) => parseDateKey(day) < parseDateKey(today);
