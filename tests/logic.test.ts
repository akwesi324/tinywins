import { test } from "node:test";
import assert from "node:assert/strict";
import { lightDayExtras, orderForDay, reminderText, addTask, CapError, moveTask, dueReminders, recordReminder, pointsEarned, pointsBalance, claimReward, streak, awardBadges, currentTask, slotsLeft } from "../src/lib/logic.ts";
import { emptyState, type State, type Task } from "../src/lib/types.ts";
import { addDays, scheduleFields, todayIn, zonedTime } from "../src/lib/dates.ts";
import { CONGRATS, pickMessage } from "../src/lib/messages.ts";

const TZ = "Africa/Accra"; // UTC+0, no DST
let n = 0;
function task(date: string, extra: Partial<Task> = {}): Task {
  const time = extra.time ?? null;
  return {
    id: `t${++n}`, date, title: `Task ${n}`, emoji: "⭐", color: "sky", time, ...scheduleFields(date, time, TZ),
    estimateMin: null, prepMin: 0, remindEvery: 15, steps: [], done: false, doneAt: null, snoozedUntil: null,
    focusSeconds: 0, createdAt: new Date(zonedTime(date, "07:00", TZ)).toISOString(), ...extra,
  };
}

test("a day holds at most 5 tasks, and moving respects the cap", () => {
  let s: State = emptyState();
  for (let i = 0; i < 5; i++) s = addTask(s, task("2026-11-10"));
  assert.equal(slotsLeft(s, "2026-11-10"), 0);
  assert.throws(() => addTask(s, task("2026-11-10")), CapError);
  s = addTask(s, task("2026-11-11"));
  assert.throws(() => moveTask(s, s.tasks.at(-1)!.id, "2026-11-10"), CapError);
  const moved = moveTask(s, s.tasks[0].id, "2026-11-11");
  assert.equal(slotsLeft(moved, "2026-11-10"), 1);
});

test("timed task: get-ready, start, then repeat every N minutes until done", () => {
  const t = task("2026-11-10", { time: "10:00", prepMin: 10, remindEvery: 15 });
  const at = (hhmm: string) => zonedTime("2026-11-10", hhmm, TZ);
  let log = {};
  assert.deepEqual(dueReminders([t], log, at("09:45"), "2026-11-10"), []);
  const prep = dueReminders([t], log, at("09:51"), "2026-11-10");
  assert.deepEqual(prep, [{ taskId: t.id, kind: "prep" }]);
  log = recordReminder(log, prep[0], at("09:51"));
  assert.deepEqual(dueReminders([t], log, at("09:55"), "2026-11-10"), []);
  const start = dueReminders([t], log, at("10:00"), "2026-11-10");
  assert.equal(start[0].kind, "start");
  log = recordReminder(log, start[0], at("10:00"));
  assert.deepEqual(dueReminders([t], log, at("10:10"), "2026-11-10"), []);
  assert.equal(dueReminders([t], log, at("10:15"), "2026-11-10")[0].kind, "nag");
  assert.deepEqual(dueReminders([{ ...t, done: true }], log, at("11:00"), "2026-11-10"), [], "done tasks are quiet");
  assert.deepEqual(dueReminders([{ ...t, snoozedUntil: at("11:30") }], log, at("11:00"), "2026-11-10"), [], "snoozed tasks are quiet");
  assert.deepEqual(dueReminders([t], log, at("11:00"), "2026-11-11"), [], "only today's tasks remind");
});

test("untimed task reminds through the day from 08:00", () => {
  const t = task("2026-11-10", { remindEvery: 30 });
  const at = (hhmm: string) => zonedTime("2026-11-10", hhmm, TZ);
  assert.deepEqual(dueReminders([t], {}, at("07:50"), "2026-11-10"), []);
  assert.equal(dueReminders([t], {}, at("08:30"), "2026-11-10").length, 1);
  const log = recordReminder({}, { taskId: t.id, kind: "nag" }, at("08:30"));
  assert.equal(dueReminders([t], log, at("08:50"), "2026-11-10").length, 0);
  assert.equal(dueReminders([t], log, at("09:00"), "2026-11-10").length, 1);
});

test("time zones: start times and 'today' follow the user's zone", () => {
  assert.equal(new Date(zonedTime("2026-11-10", "09:00", "Africa/Accra")).toISOString(), "2026-11-10T09:00:00.000Z");
  assert.equal(new Date(zonedTime("2026-11-10", "09:00", "America/New_York")).toISOString(), "2026-11-10T14:00:00.000Z");
  assert.equal(new Date(zonedTime("2026-07-10", "09:00", "Europe/London")).toISOString(), "2026-07-10T08:00:00.000Z");
  assert.equal(todayIn("Pacific/Auckland", Date.parse("2026-11-10T12:00:00Z")), "2026-11-11");
});

test("points, rewards and the perfect-day bonus", () => {
  let s: State = emptyState();
  for (let i = 0; i < 5; i++) s = addTask(s, task("2026-11-10", { done: true, steps: [{ id: "a", text: "x", done: true }] }));
  assert.equal(pointsEarned(s), 5 * 10 + 5 * 2 + 25);
  s = claimReward(s, "r-episode", new Date());
  assert.equal(pointsBalance(s), 85 - 50);
  assert.throws(() => claimReward(s, "r-episode", new Date()), /more points/);
});

test("streaks forgive one rest day a week and survive an unfinished today", () => {
  let s: State = emptyState();
  const today = "2026-11-10";
  for (const d of [0, -1, -3, -4, -5]) s = addTask(s, task(addDays(today, d), { done: true }));
  assert.equal(streak(s, today).current, 5, "one missed day (-2) is a rest day");
  assert.equal(streak(s, addDays(today, 1)).current, 5, "nothing done yet today keeps yesterday's streak");
  s = { ...s, tasks: s.tasks.filter((t) => t.date !== addDays(today, -4)) };
  assert.equal(streak(s, today).current, 3, "a second gap within a week ends the streak (counts today, -1, -3)");
});

test("badges are awarded once", () => {
  let s: State = addTask(emptyState(), task("2026-11-10", { done: true }));
  const first = awardBadges(s, "2026-11-10", new Date());
  assert.deepEqual(first.fresh.map((b) => b.id), ["first-win"]);
  s = first.state;
  assert.equal(awardBadges(s, "2026-11-10", new Date()).fresh.length, 0);
});

test("focus picks the started task first, and congrats never repeat back to back", () => {
  let s: State = emptyState();
  s = addTask(s, task("2026-11-10", { time: "15:00" }));
  s = addTask(s, task("2026-11-10", { time: "09:00" }));
  assert.equal(currentTask(s, zonedTime("2026-11-10", "10:00", TZ), "2026-11-10")?.time, "09:00");
  const a = pickMessage(CONGRATS, 3, () => 3 / CONGRATS.length);
  assert.notEqual(a.index, 3);
});

test("low-energy day: gentler reminders, easiest first, lighter day, double step points", () => {
  const day = "2026-11-10";
  const at = (hhmm: string) => zonedTime(day, hhmm, TZ);
  const t = task(day, { time: "10:00", remindEvery: 10 });
  const log = recordReminder({}, { taskId: t.id, kind: "start" }, at("10:00"));
  assert.equal(dueReminders([t], log, at("10:10"), day).length, 1, "normal day: every 10 min");
  assert.equal(dueReminders([t], log, at("10:10"), day, true).length, 0, "low day: not yet");
  assert.equal(dueReminders([t], log, at("10:30"), day, true).length, 1, "low day: after 30 min");
  assert.match(reminderText(t, "nag", true).body, /2 minutes|Small/);

  let s: State = emptyState();
  s = addTask(s, task(day, { title: "Big", estimateMin: 120 }));
  s = addTask(s, task(day, { title: "Small", estimateMin: 5 }));
  s = addTask(s, task(day, { title: "Medium", estimateMin: 30 }));
  s = addTask(s, task(day, { title: "Unknown" }));
  s = addTask(s, task(day, { title: "Done already", done: true }));
  assert.deepEqual(orderForDay(s.tasks, true).map((x) => x.title).slice(0, 2), ["Small", "Medium"]);
  assert.deepEqual(lightDayExtras(s, day).map((x) => x.title).sort(), ["Big", "Unknown"], "keeps 3 in total, the easiest");

  const stepped: State = addTask(emptyState(), task(day, { steps: [{ id: "a", text: "x", done: true }] }));
  assert.equal(pointsEarned(stepped), 2);
  assert.equal(pointsEarned({ ...stepped, energy: { [day]: "low" } }), 4);
});
