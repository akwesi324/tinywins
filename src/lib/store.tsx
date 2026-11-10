"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { awardBadges, addTask as addTaskRule, claimReward as claimRule, lightDayExtras, moveTask as moveRule, slotsLeft, type Badge } from "@/lib/logic.ts";
import { scheduleFields, todayIn } from "@/lib/dates.ts";
import { CONGRATS, PERFECT_DAY, STEP_CHEERS, pickMessage } from "@/lib/messages.ts";
import { DEFAULT_SETTINGS, emptyState, type ColorKey, type Energy, type ReminderLog, type Settings, type State, type Step, type Task } from "@/lib/types.ts";
import { addDays } from "@/lib/dates.ts";

// -------------------------------------------------------------- row mapping
type TaskRow = {
  id: string; date: string; title: string; emoji: string; color: string; time: string | null; starts_at: string | null; day_start_at: string;
  estimate_min: number | null; prep_min: number; remind_every: number; steps: Step[]; done: boolean; done_at: string | null;
  snoozed_until: string | null; focus_seconds: number; created_at: string;
};
const ms = (iso: string | null) => (iso ? Date.parse(iso) : null);
const iso = (n: number | null) => (n == null ? null : new Date(n).toISOString());

const fromRow = (r: TaskRow): Task => ({
  id: r.id, date: r.date, title: r.title, emoji: r.emoji, color: r.color as ColorKey, time: r.time, startsAt: ms(r.starts_at), dayStartAt: Date.parse(r.day_start_at),
  estimateMin: r.estimate_min, prepMin: r.prep_min, remindEvery: r.remind_every, steps: r.steps ?? [], done: r.done, doneAt: r.done_at,
  snoozedUntil: ms(r.snoozed_until), focusSeconds: r.focus_seconds, createdAt: r.created_at,
});
const toRow = (t: Task) => ({
  id: t.id, date: t.date, title: t.title, emoji: t.emoji, color: t.color, time: t.time, starts_at: iso(t.startsAt), day_start_at: iso(t.dayStartAt),
  estimate_min: t.estimateMin, prep_min: t.prepMin, remind_every: t.remindEvery, steps: t.steps, done: t.done, done_at: t.doneAt,
  snoozed_until: iso(t.snoozedUntil), focus_seconds: t.focusSeconds,
});

// -------------------------------------------------------------- store
export type Celebration = { id: number; kind: "task" | "perfect" | "step" | "badge"; text: string; badges: Badge[] };
export type NewTask = { date: string; title: string; emoji: string; color: ColorKey; time: string | null; estimateMin: number | null; prepMin: number; remindEvery: number; steps: string[] };

type Store = {
  ready: boolean;
  state: State;
  name: string;
  today: string;
  error: string | null;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  clearError: () => void;
  addTask: (t: NewTask) => Promise<boolean>;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  toggleStep: (taskId: string, stepId: string) => Promise<void>;
  setSteps: (taskId: string, steps: Step[]) => Promise<void>;
  moveTask: (id: string, toDay: string) => Promise<boolean>;
  snooze: (id: string, minutes: number) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  logFocus: (taskId: string | null, minutes: number) => Promise<void>;
  addReward: (title: string, emoji: string, cost: number) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  claimReward: (id: string) => Promise<boolean>;
  saveSettings: (s: Partial<Settings>) => Promise<void>;
  setEnergy: (level: Energy) => Promise<void>;
  /** Low-energy "lighter day": moves the hardest unfinished tasks to tomorrow, keeping 3. Returns how many moved. */
  lightenDay: () => Promise<number>;
  reload: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
};

const friendly = (e: { code?: string; message?: string } | null) =>
  e?.code === "P0001" && e.message ? e.message : "Couldn't save that. Check your connection and try again.";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<State>(emptyState);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [today, setToday] = useState("");
  const stateRef = useRef(state);
  /** Applies a new state now (the ref is read by the next action before React re-renders). */
  const apply = useCallback((next: State) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const counter = useRef(0);

  // keep "today" current in the user's time zone (crosses midnight while open)
  useEffect(() => {
    const tick = () => setToday(todayIn(stateRef.current.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [state.settings.timezone]);

  const reload = useCallback(async () => {
    const [{ data: profile }, tasks, rewards, claims, focus, badges, reminders, energy] = await Promise.all([
      supabase.from("profiles").select("*").maybeSingle(),
      supabase.from("tasks").select("*").order("date"),
      supabase.from("rewards").select("*").order("cost"),
      supabase.from("claims").select("*").order("at"),
      supabase.from("focus_sessions").select("*").order("at"),
      supabase.from("badges").select("*"),
      supabase.from("reminder_log").select("*"),
      supabase.from("energy_checkins").select("date, level"),
    ]);
    const log: ReminderLog = {};
    for (const r of reminders.data ?? []) log[r.task_id] = { prep: ms(r.prep) ?? undefined, start: ms(r.start) ?? undefined, last: ms(r.last) ?? undefined };
    setName(profile?.display_name ?? "");
    apply({
      version: 1,
      tasks: (tasks.data ?? []).map(fromRow),
      rewards: (rewards.data ?? []).map((r) => ({ id: r.id, title: r.title, emoji: r.emoji, cost: r.cost })),
      claims: (claims.data ?? []).map((c) => ({ rewardId: c.reward_id, title: c.title, cost: c.cost, at: c.at })),
      focusSessions: (focus.data ?? []).map((f) => ({ date: f.date, minutes: f.minutes, taskId: f.task_id, at: f.at })),
      badges: (badges.data ?? []).map((b) => ({ id: b.badge_id, at: b.at })),
      energy: Object.fromEntries((energy.data ?? []).map((e) => [e.date, e.level as Energy])),
      reminders: log,
      settings: { ...DEFAULT_SETTINGS, ...(profile?.settings ?? {}), timezone: profile?.timezone ?? "UTC" },
      lastCongrats: profile?.last_congrats ?? -1,
    });
    setReady(true);
  }, [supabase, apply]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the database
    reload();
  }, [reload]);

  /** Awards any newly earned badges and returns them. */
  const checkBadges = useCallback(
    async (next: State): Promise<{ next: State; fresh: Badge[] }> => {
      const { state: withBadges, fresh } = awardBadges(next, todayIn(next.settings.timezone), new Date());
      if (fresh.length) await supabase.from("badges").insert(fresh.map((b) => ({ badge_id: b.id })));
      return { next: withBadges, fresh };
    },
    [supabase],
  );

  const celebrate = useCallback((kind: Celebration["kind"], text: string, badges: Badge[] = []) => {
    counter.current += 1;
    setCelebration({ id: counter.current, kind, text, badges });
  }, []);

  /** Optimistic update: apply locally, write, roll back on failure. */
  const commit = useCallback(async (next: State, write: () => PromiseLike<{ error: { code?: string; message?: string } | null }>) => {
    const before = stateRef.current;
    apply(next);
    const { error: e } = await write();
    if (e) {
      apply(before);
      setError(friendly(e));
      return false;
    }
    return true;
  }, [apply]);

  const patchTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return null;
      let merged = { ...task, ...patch };
      if (patch.date !== undefined || patch.time !== undefined) merged = { ...merged, ...scheduleFields(merged.date, merged.time, s.settings.timezone) };
      return { s, task, merged };
    },
    [],
  );

  const store: Store = {
    ready,
    state,
    name,
    today,
    error,
    celebration,
    dismissCelebration: () => setCelebration(null),
    clearError: () => setError(null),

    addTask: async (t) => {
      const s = stateRef.current;
      const task: Task = {
        id: crypto.randomUUID(), date: t.date, title: t.title.trim(), emoji: t.emoji, color: t.color, time: t.time,
        ...scheduleFields(t.date, t.time, s.settings.timezone),
        estimateMin: t.estimateMin, prepMin: t.prepMin, remindEvery: t.remindEvery,
        steps: t.steps.filter((x) => x.trim()).slice(0, 12).map((text) => ({ id: crypto.randomUUID(), text: text.trim().slice(0, 120), done: false })),
        done: false, doneAt: null, snoozedUntil: null, focusSeconds: 0, createdAt: new Date().toISOString(),
      };
      try {
        const next = addTaskRule(s, task);
        return await commit(next, () => supabase.from("tasks").insert(toRow(task)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that task.");
        return false;
      }
    },

    updateTask: async (id, patch) => {
      const p = patchTask(id, patch);
      if (!p) return;
      await commit({ ...p.s, tasks: p.s.tasks.map((t) => (t.id === id ? p.merged : t)) }, () => supabase.from("tasks").update(toRow(p.merged)).eq("id", id));
    },

    toggleDone: async (id) => {
      const p = patchTask(id, {});
      if (!p) return;
      const done = !p.task.done;
      const merged: Task = { ...p.task, done, doneAt: done ? new Date().toISOString() : null, snoozedUntil: null, steps: done ? p.task.steps.map((x) => ({ ...x, done: true })) : p.task.steps };
      let next: State = { ...p.s, tasks: p.s.tasks.map((t) => (t.id === id ? merged : t)) };
      const ok = await commit(next, () => supabase.from("tasks").update({ done: merged.done, done_at: merged.doneAt, snoozed_until: null, steps: merged.steps }).eq("id", id));
      if (!ok || !done) return;
      const badgeResult = await checkBadges(next);
      next = badgeResult.next;
      const day = next.tasks.filter((t) => t.date === merged.date);
      const perfect = day.length === 5 && day.every((t) => t.done);
      const msg = pickMessage(perfect ? PERFECT_DAY : CONGRATS, perfect ? -1 : next.lastCongrats);
      if (!perfect) next = { ...next, lastCongrats: msg.index };
      apply(next);
      celebrate(perfect ? "perfect" : "task", msg.text, badgeResult.fresh);
      if (!perfect) await supabase.from("profiles").update({ last_congrats: msg.index }).eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
    },

    toggleStep: async (taskId, stepId) => {
      const p = patchTask(taskId, {});
      if (!p) return;
      const steps = p.task.steps.map((x) => (x.id === stepId ? { ...x, done: !x.done } : x));
      const checked = steps.find((x) => x.id === stepId)?.done;
      let next: State = { ...p.s, tasks: p.s.tasks.map((t) => (t.id === taskId ? { ...t, steps } : t)) };
      const ok = await commit(next, () => supabase.from("tasks").update({ steps }).eq("id", taskId));
      if (!ok || !checked) return;
      const badgeResult = await checkBadges(next);
      next = badgeResult.next;
      apply(next);
      if (badgeResult.fresh.length) celebrate("badge", "New badge unlocked!", badgeResult.fresh);
      else if (steps.every((x) => x.done)) celebrate("step", "All steps done! Tap Done to finish the task. 🎯");
      else celebrate("step", pickMessage(STEP_CHEERS, -1).text);
    },

    setSteps: async (taskId, steps) => {
      const p = patchTask(taskId, {});
      if (!p) return;
      const clean = steps.filter((x) => x.text.trim()).slice(0, 12).map((x) => ({ ...x, text: x.text.trim().slice(0, 120) }));
      await commit({ ...p.s, tasks: p.s.tasks.map((t) => (t.id === taskId ? { ...t, steps: clean } : t)) }, () => supabase.from("tasks").update({ steps: clean }).eq("id", taskId));
    },

    moveTask: async (id, toDay) => {
      const s = stateRef.current;
      try {
        let next = moveRule(s, id, toDay);
        const moved = next.tasks.find((t) => t.id === id)!;
        const withTimes = { ...moved, ...scheduleFields(toDay, moved.time, s.settings.timezone) };
        next = { ...next, tasks: next.tasks.map((t) => (t.id === id ? withTimes : t)) };
        return await commit(next, () =>
          supabase.from("tasks").update({ date: toDay, starts_at: iso(withTimes.startsAt), day_start_at: iso(withTimes.dayStartAt), snoozed_until: null }).eq("id", id),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't move that task.");
        return false;
      }
    },

    snooze: async (id, minutes) => {
      const until = Date.now() + minutes * 60000;
      const s = stateRef.current;
      await commit({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, snoozedUntil: until } : t)) }, () => supabase.from("tasks").update({ snoozed_until: iso(until) }).eq("id", id));
    },

    deleteTask: async (id) => {
      const s = stateRef.current;
      await commit({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }, () => supabase.from("tasks").delete().eq("id", id));
    },

    logFocus: async (taskId, minutes) => {
      const s = stateRef.current;
      const date = todayIn(s.settings.timezone);
      let next: State = {
        ...s,
        focusSessions: [...s.focusSessions, { date, minutes, taskId, at: new Date().toISOString() }],
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, focusSeconds: t.focusSeconds + minutes * 60 } : t)),
      };
      const task = next.tasks.find((t) => t.id === taskId);
      const ok = await commit(next, async () => {
        const a = await supabase.from("focus_sessions").insert({ task_id: taskId, date, minutes });
        if (a.error || !task) return a;
        return supabase.from("tasks").update({ focus_seconds: Math.min(86400, task.focusSeconds) }).eq("id", task.id);
      });
      if (!ok) return;
      const badgeResult = await checkBadges(next);
      next = badgeResult.next;
      apply(next);
      celebrate(badgeResult.fresh.length ? "badge" : "step", `Focus session done: ${minutes} minutes of real work! 🎯`, badgeResult.fresh);
    },

    addReward: async (title, emoji, cost) => {
      const { data, error: e } = await supabase.from("rewards").insert({ title: title.trim().slice(0, 80), emoji, cost }).select().single();
      if (e || !data) return setError(friendly(e));
      const cur = stateRef.current;
      apply({ ...cur, rewards: [...cur.rewards, { id: data.id, title: data.title, emoji: data.emoji, cost: data.cost }].sort((a, b) => a.cost - b.cost) });
    },

    deleteReward: async (id) => {
      const s = stateRef.current;
      await commit({ ...s, rewards: s.rewards.filter((r) => r.id !== id) }, () => supabase.from("rewards").delete().eq("id", id));
    },

    claimReward: async (id) => {
      const s = stateRef.current;
      try {
        let next = claimRule(s, id, new Date());
        const c = next.claims.at(-1)!;
        const ok = await commit(next, () => supabase.from("claims").insert({ reward_id: id, title: c.title, cost: c.cost }));
        if (!ok) return false;
        const badgeResult = await checkBadges(next);
        next = badgeResult.next;
        apply(next);
        celebrate(badgeResult.fresh.length ? "badge" : "task", `Enjoy it: ${c.title}! You earned it. 🎁`, badgeResult.fresh);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't claim that reward.");
        return false;
      }
    },

    saveSettings: async (patch) => {
      const s = stateRef.current;
      const settings = { ...s.settings, ...patch };
      const { timezone, ...rest } = settings;
      const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
      await commit({ ...s, settings }, () => supabase.from("profiles").update({ timezone, settings: rest }).eq("id", uid));
    },

    setEnergy: async (level) => {
      const s = stateRef.current;
      const day = todayIn(s.settings.timezone);
      await commit({ ...s, energy: { ...s.energy, [day]: level } }, () => supabase.from("energy_checkins").upsert({ date: day, level }, { onConflict: "user_id,date" }));
    },

    lightenDay: async () => {
      const s = stateRef.current;
      const day = todayIn(s.settings.timezone);
      let moved = 0;
      for (const t of lightDayExtras(s, day)) {
        // tomorrow, or the next day with room (the 5-a-day cap still applies)
        let target = addDays(day, 1);
        for (let i = 0; i < 14 && slotsLeft(stateRef.current, target) === 0; i++) target = addDays(target, 1);
        const before = stateRef.current;
        try {
          const next = moveRule(before, t.id, target);
          const withTimes = next.tasks.map((x) => (x.id === t.id ? { ...x, ...scheduleFields(target, x.time, before.settings.timezone) } : x));
          const m = withTimes.find((x) => x.id === t.id)!;
          const ok = await commit({ ...next, tasks: withTimes }, () =>
            supabase.from("tasks").update({ date: target, starts_at: iso(m.startsAt), day_start_at: iso(m.dayStartAt), snoozed_until: null }).eq("id", t.id),
          );
          if (ok) moved += 1;
        } catch {
          /* no room found; leave it */
        }
      }
      if (moved) celebrate("step", `Moved ${moved} to later. Today is lighter now. 💜`);
      return moved;
    },

    reload,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
