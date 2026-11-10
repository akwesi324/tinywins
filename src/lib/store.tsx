"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/app/actions/data";
import { awardBadges, addTask as addTaskRule, claimReward as claimRule, lightDayExtras, moveTask as moveRule, slotsLeft, type Badge } from "@/lib/logic.ts";
import { addDays, scheduleFields, todayIn } from "@/lib/dates.ts";
import { CONGRATS, PERFECT_DAY, STEP_CHEERS, pickMessage } from "@/lib/messages.ts";
import { emptyState, type ColorKey, type Energy, type Settings, type State, type Step, type Task } from "@/lib/types.ts";

export type Celebration = { id: number; kind: "task" | "perfect" | "step" | "badge"; text: string; badges: Badge[] };
export type NewTask = { date: string; title: string; emoji: string; color: ColorKey; time: string | null; estimateMin: number | null; prepMin: number; remindEvery: number; steps: string[] };

type Store = {
  ready: boolean;
  loadFailed: boolean;
  state: State;
  name: string;
  today: string;
  error: string | null;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  clearError: () => void;
  addTask: (t: NewTask) => Promise<boolean>;
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
  /** Low-energy "lighter day": moves the hardest unfinished tasks to later, keeping 3. */
  lightenDay: () => Promise<number>;
  reload: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
};

/** 20 lowercase letters/digits, the id format Appwrite accepts (created here so saves can be instant). */
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>(emptyState);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [today, setToday] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const stateRef = useRef(state);
  const counter = useRef(0);

  const apply = useCallback((next: State) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const tick = () => setToday(todayIn(stateRef.current.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [state.settings.timezone]);

  const reload = useCallback(async () => {
    // one quiet retry: a slow network shouldn't leave anyone staring at a spinner
    let res = await api.loadAll().catch(() => null);
    if (!res?.ok) res = await api.loadAll().catch(() => null);
    if (!res || !res.ok || !res.value) {
      const message = res && !res.ok ? res.error : "Couldn't reach TinyWins. Check your connection.";
      if (message.includes("Sign in")) return router.replace("/login");
      setError(message);
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    const { name: n, ...s } = res.value;
    setName(n);
    apply(s);
    setReady(true);
  }, [apply, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the server
    reload();
  }, [reload]);

  const celebrate = useCallback((kind: Celebration["kind"], text: string, badges: Badge[] = []) => {
    counter.current += 1;
    setCelebration({ id: counter.current, kind, text, badges });
  }, []);

  /** Optimistic update: show it now, save, roll back with a message if the save fails. */
  const commit = useCallback(
    async (next: State, write: () => Promise<{ ok: boolean; error?: string }>) => {
      const before = stateRef.current;
      apply(next);
      const res = await write();
      if (!res.ok) {
        apply(before);
        setError(res.error ?? "Couldn't save that.");
        return false;
      }
      return true;
    },
    [apply],
  );

  const awardAndSave = useCallback(async (next: State) => {
    const { state: withBadges, fresh } = awardBadges(next, todayIn(next.settings.timezone), new Date());
    if (fresh.length) await api.saveBadges(fresh.map((b) => b.id));
    return { next: withBadges, fresh };
  }, []);

  const replaceTask = (s: State, t: Task): State => ({ ...s, tasks: s.tasks.map((x) => (x.id === t.id ? t : x)) });

  const store: Store = {
    ready,
    loadFailed,
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
        id: newId(), date: t.date, title: t.title.trim(), emoji: t.emoji, color: t.color, time: t.time, ...scheduleFields(t.date, t.time, s.settings.timezone),
        estimateMin: t.estimateMin, prepMin: t.prepMin, remindEvery: t.remindEvery,
        steps: t.steps.filter((x) => x.trim()).slice(0, 12).map((text) => ({ id: newId(), text: text.trim().slice(0, 120), done: false })),
        done: false, doneAt: null, snoozedUntil: null, focusSeconds: 0, createdAt: new Date().toISOString(),
      };
      try {
        return await commit(addTaskRule(s, task), () => api.createTask(task));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that task.");
        return false;
      }
    },

    toggleDone: async (id) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return;
      const done = !task.done;
      const merged: Task = { ...task, done, doneAt: done ? new Date().toISOString() : null, snoozedUntil: null, steps: done ? task.steps.map((x) => ({ ...x, done: true })) : task.steps };
      let next = replaceTask(s, merged);
      const ok = await commit(next, () => api.updateTask(id, { done: merged.done, doneAt: merged.doneAt, snoozedUntil: null, steps: merged.steps }));
      if (!ok || !done) return;
      const award = await awardAndSave(next);
      next = award.next;
      const day = next.tasks.filter((t) => t.date === merged.date);
      const perfect = day.length === 5 && day.every((t) => t.done);
      const msg = pickMessage(perfect ? PERFECT_DAY : CONGRATS, perfect ? -1 : next.lastCongrats);
      if (!perfect) next = { ...next, lastCongrats: msg.index };
      apply(next);
      celebrate(perfect ? "perfect" : "task", msg.text, award.fresh);
      if (!perfect) api.savePrefs(next.settings, msg.index);
    },

    toggleStep: async (taskId, stepId) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const steps = task.steps.map((x) => (x.id === stepId ? { ...x, done: !x.done } : x));
      const checked = steps.find((x) => x.id === stepId)?.done;
      let next = replaceTask(s, { ...task, steps });
      const ok = await commit(next, () => api.updateTask(taskId, { steps }));
      if (!ok || !checked) return;
      const award = await awardAndSave(next);
      next = award.next;
      apply(next);
      if (award.fresh.length) celebrate("badge", "New badge unlocked!", award.fresh);
      else if (steps.every((x) => x.done)) celebrate("step", "All steps done! Tap Done to finish the task. 🎯");
      else celebrate("step", pickMessage(STEP_CHEERS, -1).text);
    },

    setSteps: async (taskId, steps) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const clean = steps.filter((x) => x.text.trim()).slice(0, 12).map((x) => ({ ...x, id: x.id || newId(), text: x.text.trim().slice(0, 120) }));
      await commit(replaceTask(s, { ...task, steps: clean }), () => api.updateTask(taskId, { steps: clean }));
    },

    moveTask: async (id, toDay) => {
      const s = stateRef.current;
      try {
        const moved = moveRule(s, id, toDay).tasks.find((t) => t.id === id)!;
        const withTimes: Task = { ...moved, ...scheduleFields(toDay, moved.time, s.settings.timezone), snoozedUntil: null };
        return await commit(replaceTask(s, withTimes), () =>
          api.updateTask(id, { date: toDay, startsAt: withTimes.startsAt, dayStartAt: withTimes.dayStartAt, snoozedUntil: null }),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't move that task.");
        return false;
      }
    },

    snooze: async (id, minutes) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return;
      const until = Date.now() + minutes * 60000;
      await commit(replaceTask(s, { ...task, snoozedUntil: until }), () => api.updateTask(id, { snoozedUntil: until }));
    },

    deleteTask: async (id) => {
      const s = stateRef.current;
      await commit({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }, () => api.deleteTask(id));
    },

    logFocus: async (taskId, minutes) => {
      const s = stateRef.current;
      const date = todayIn(s.settings.timezone);
      let next: State = {
        ...s,
        focusSessions: [...s.focusSessions, { date, minutes, taskId, at: new Date().toISOString() }],
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, focusSeconds: Math.min(86400, t.focusSeconds + minutes * 60) } : t)),
      };
      if (!(await commit(next, () => api.logFocus(taskId, date, minutes)))) return;
      const award = await awardAndSave(next);
      next = award.next;
      apply(next);
      celebrate(award.fresh.length ? "badge" : "step", `Focus session done: ${minutes} minutes of real work! 🎯`, award.fresh);
    },

    addReward: async (title, emoji, cost) => {
      const res = await api.addReward(title.trim().slice(0, 80), emoji, cost);
      if (!res.ok || !res.value) return setError(res.ok ? "Couldn't add that reward." : res.error);
      const cur = stateRef.current;
      apply({ ...cur, rewards: [...cur.rewards, res.value].sort((a, b) => a.cost - b.cost) });
    },

    deleteReward: async (id) => {
      const s = stateRef.current;
      await commit({ ...s, rewards: s.rewards.filter((r) => r.id !== id) }, () => api.deleteReward(id));
    },

    claimReward: async (id) => {
      const s = stateRef.current;
      try {
        let next = claimRule(s, id, new Date());
        const c = next.claims.at(-1)!;
        if (!(await commit(next, () => api.claimReward(id, c.title, c.cost)))) return false;
        const award = await awardAndSave(next);
        next = award.next;
        apply(next);
        celebrate(award.fresh.length ? "badge" : "task", `Enjoy it: ${c.title}! You earned it. 🎁`, award.fresh);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't claim that reward.");
        return false;
      }
    },

    saveSettings: async (patch) => {
      const s = stateRef.current;
      const settings = { ...s.settings, ...patch };
      await commit({ ...s, settings }, () => api.savePrefs(settings, s.lastCongrats));
    },

    setEnergy: async (level) => {
      const s = stateRef.current;
      const day = todayIn(s.settings.timezone);
      await commit({ ...s, energy: { ...s.energy, [day]: level } }, () => api.setEnergy(level));
    },

    lightenDay: async () => {
      const day = todayIn(stateRef.current.settings.timezone);
      let moved = 0;
      for (const t of lightDayExtras(stateRef.current, day)) {
        let target = addDays(day, 1);
        for (let i = 0; i < 14 && slotsLeft(stateRef.current, target) === 0; i++) target = addDays(target, 1);
        if (await store.moveTask(t.id, target)) moved += 1;
      }
      if (moved) celebrate("step", `Moved ${moved} to later. Today is lighter now. 💜`);
      return moved;
    },

    reload,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
