"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore, type NewTask } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { COLOR, EMOJIS, btn, input, panel } from "@/lib/colors";
import { COLORS, MAX_TASKS_PER_DAY, type ColorKey, type Task } from "@/lib/types.ts";
import { addDays, formatDuration, minutesBetween, relative } from "@/lib/dates.ts";
import { dayPosition } from "@/lib/logic.ts";

// ------------------------------------------------------------------ slots + timeline

export function Slots({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${tasks.filter((t) => t.done).length} of ${tasks.length} done, ${MAX_TASKS_PER_DAY - tasks.length} slots free`}>
      {Array.from({ length: MAX_TASKS_PER_DAY }, (_, i) => {
        const t = tasks[i];
        return (
          <span key={i} className={`grid h-9 w-9 place-items-center rounded-full text-lg transition ${t ? (t.done ? `${COLOR[t.color].solid} scale-110 shadow-lg` : `${COLOR[t.color].soft} ring-2 ${COLOR[t.color].ring}`) : "border-2 border-dashed border-slate-300 dark:border-slate-700"}`}>
            {t ? (t.done ? "✓" : t.emoji) : ""}
          </span>
        );
      })}
    </div>
  );
}

/** Time-blindness helper: the waking day as a bar, with the tasks on it and a "now" marker. */
export function DayTimeline({ tasks, isToday }: { tasks: Task[]; isToday: boolean }) {
  const now = useNow();
  const timed = tasks.filter((t) => t.startsAt != null);
  const pos = now ? dayPosition(now) : 0;
  return (
    <div className="pt-2">
      <div className="relative h-4 rounded-full bg-gradient-to-r from-amber-200 via-sky-200 to-violet-300 dark:from-amber-900/60 dark:via-sky-900/60 dark:to-violet-900/60">
        {isToday && now > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-slate-900/15 dark:bg-white/15" style={{ width: `${pos * 100}%` }} />}
        {timed.map((t) => (
          <span key={t.id} title={`${t.time} ${t.title}`} className={`absolute -top-1.5 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-sm shadow ${t.done ? "bg-white opacity-60" : COLOR[t.color].solid}`} style={{ left: `${dayPosition(t.startsAt!) * 100}%` }}>
            {t.done ? "✓" : t.emoji}
          </span>
        ))}
        {isToday && now > 0 && (
          <span className="absolute -top-3 h-10 w-1 -translate-x-1/2 rounded-full bg-rose-500 shadow-lg" style={{ left: `${pos * 100}%` }} aria-label="Now" />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-400"><span>7:00</span><span>11:00</span><span>15:00</span><span>19:00</span><span>23:00</span></div>
    </div>
  );
}

// ------------------------------------------------------------------ task card

export function TaskCard({ task, today, low = false }: { task: Task; today: string; low?: boolean }) {
  const { toggleDone, toggleStep, snooze, moveTask, deleteTask, setSteps } = useStore();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [newStep, setNewStep] = useState("");
  const c = COLOR[task.color];
  const isToday = task.date === today;
  const mins = task.startsAt != null && now ? minutesBetween(now, task.startsAt) : null;
  const stepsDone = task.steps.filter((s) => s.done).length;
  const snoozed = task.snoozedUntil && now && task.snoozedUntil > now;

  return (
    <article className={`overflow-hidden rounded-3xl shadow-xl transition ${task.done ? "opacity-75" : ""}`}>
      <div className={`bg-gradient-to-br ${c.card} p-4 text-white`}>
        <div className="flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/25 text-3xl" aria-hidden>{task.emoji}</span>
          <div className="min-w-0 flex-1">
            <h3 className={`text-xl font-black leading-tight drop-shadow-sm ${task.done ? "line-through decoration-4" : ""}`}>{task.title}</h3>
            <p className="mt-0.5 text-sm font-bold text-white/90">
              {task.time ? `⏰ ${task.time}` : "Any time today"}
              {task.estimateMin ? ` · ⏳ ~${task.estimateMin} min` : ""}
              {task.focusSeconds > 0 ? ` · 🎯 ${formatDuration(task.focusSeconds)} focused` : ""}
            </p>
          </div>
          <button onClick={() => toggleDone(task.id)} aria-pressed={task.done} aria-label={task.done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-white text-2xl font-black transition active:scale-90 ${task.done ? "bg-white text-emerald-500" : "bg-white/20 hover:bg-white/40"}`}>
            {task.done ? "✓" : ""}
          </button>
        </div>

        {/* time-blindness: how long until it starts */}
        {isToday && !task.done && mins != null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs font-extrabold">
              <span>{mins > 0 ? `Starts ${relative(mins)}` : mins > -1 ? "Starting now!" : `Started ${relative(mins)}`}</span>
              {task.prepMin > 0 && mins > 0 && <span>Get ready {relative(mins - task.prepMin)}</span>}
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${mins <= 0 ? 100 : Math.max(4, 100 - Math.min(100, (mins / 120) * 100))}%` }} />
            </div>
          </div>
        )}
        {snoozed && <p className="mt-2 text-sm font-bold">😴 Snoozed until {new Date(task.snoozedUntil!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
      </div>

      <div className="space-y-3 bg-white p-4 dark:bg-slate-900">
        {task.steps.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-400">Tiny steps {stepsDone}/{task.steps.length}</p>
            <ul className="space-y-1.5">
              {task.steps.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={s.done} onChange={() => toggleStep(task.id, s.id)} className="h-6 w-6 accent-emerald-500" />
                    <span className={`font-semibold ${s.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"}`}>{s.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {!task.done && isToday && low && <Link href={`/now?task=${task.id}&minutes=2`} className={btn.primary}>⏱️ Just 2 minutes</Link>}
          {!task.done && isToday && <Link href={`/now?task=${task.id}`} className={btn.soft}>🎯 Focus</Link>}
          {!task.done && isToday && <button className={btn.soft} onClick={() => snooze(task.id, 10)}>😴 Snooze 10</button>}
          <button className={btn.soft} onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "Less" : "More"}</button>
        </div>
        {open && (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newStep.trim()) { setSteps(task.id, [...task.steps, { id: crypto.randomUUID(), text: newStep, done: false }]); setNewStep(""); } }}>
              <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Add a tiny step" maxLength={120} className={input} disabled={task.steps.length >= 12} />
              <button className={btn.soft} disabled={!newStep.trim()}>Add</button>
            </form>
            <div className="flex flex-wrap gap-2">
              {!task.done && <button className={btn.soft} onClick={() => moveTask(task.id, addDays(task.date, 1))}>➡️ Move to {isToday ? "tomorrow" : "next day"}</button>}
              {task.steps.length > 0 && <button className={btn.ghost} onClick={() => setSteps(task.id, [])}>Clear steps</button>}
              <button className={`${btn.ghost} text-rose-600`} onClick={() => confirm(`Delete "${task.title}"?`) && deleteTask(task.id)}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ------------------------------------------------------------------ add task

const REMIND_OPTIONS = [5, 10, 15, 30, 60, 0];

export function AddTask({ date, aiEnabled, onDone, defaultColor }: { date: string; aiEnabled: boolean; onDone: () => void; defaultColor: ColorKey }) {
  const { addTask } = useStore();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [color, setColor] = useState<ColorKey>(defaultColor);
  const [time, setTime] = useState("");
  const [estimate, setEstimate] = useState("");
  const [prep, setPrep] = useState("10");
  const [remind, setRemind] = useState(15);
  const [steps, setSteps] = useState<string[]>([]);
  const [stepDraft, setStepDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function suggest() {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, minutes: estimate ? Number(estimate) : null }) });
      const json = (await res.json()) as { steps?: string[]; error?: string };
      if (!res.ok || !json.steps) throw new Error(json.error ?? "No suggestions right now.");
      setSteps(json.steps);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "No suggestions right now.");
    } finally {
      setAiBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const t: NewTask = {
      date, title, emoji, color, time: time || null, estimateMin: estimate ? Math.min(600, Math.max(1, Number(estimate))) : null,
      prepMin: time ? Number(prep) : 0, remindEvery: remind, steps,
    };
    const ok = await addTask(t);
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <form onSubmit={submit} className={`${panel} space-y-4`}>
      <h2 className="text-xl font-black text-slate-900 dark:text-white">New task ✨</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to get done?" maxLength={120} required autoFocus className={`${input} text-lg font-bold`} />

      <div>
        <p className="mb-1 text-sm font-extrabold text-slate-500">Pick an emoji</p>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((x) => (
            <button type="button" key={x} onClick={() => setEmoji(x)} aria-pressed={emoji === x} className={`grid h-11 w-11 place-items-center rounded-xl text-2xl transition ${emoji === x ? "scale-110 bg-fuchsia-100 ring-2 ring-fuchsia-400 dark:bg-fuchsia-950" : "bg-slate-100 dark:bg-slate-800"}`}>{x}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-extrabold text-slate-500">Pick a colour</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((k) => (
            <button type="button" key={k} onClick={() => setColor(k)} aria-label={COLOR[k].label} aria-pressed={color === k} className={`h-10 w-10 rounded-full bg-gradient-to-br ${COLOR[k].card} transition ${color === k ? "scale-125 ring-4 ring-offset-2 ring-slate-900/20 dark:ring-white/40 dark:ring-offset-slate-900" : ""}`} />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-extrabold text-slate-500">Start time (optional)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-extrabold text-slate-500">How long will it take? (min)</span>
          <input type="number" inputMode="numeric" min={1} max={600} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="e.g. 20" className={input} />
        </label>
        {time && (
          <label className="space-y-1">
            <span className="text-sm font-extrabold text-slate-500">&ldquo;Get ready&rdquo; alert</span>
            <select value={prep} onChange={(e) => setPrep(e.target.value)} className={input}>
              {[0, 5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m ? `${m} min before` : "No get-ready alert"}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="text-sm font-extrabold text-slate-500">Keep reminding me</span>
          <select value={remind} onChange={(e) => setRemind(Number(e.target.value))} className={input}>
            {REMIND_OPTIONS.map((m) => <option key={m} value={m}>{m ? `Every ${m} min until done` : "Only once"}</option>)}
          </select>
        </label>
      </div>

      <div className="space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-slate-500">Tiny steps (optional, makes starting easier)</p>
          {aiEnabled && <button type="button" onClick={suggest} disabled={aiBusy || title.trim().length < 2} className={btn.soft}>{aiBusy ? "Thinking..." : "✨ Suggest steps"}</button>}
        </div>
        {aiError && <p className="text-sm font-semibold text-rose-600">{aiError}</p>}
        <ol className="space-y-1">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 text-center font-black text-fuchsia-500">{i + 1}</span>
              <input value={s} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))} maxLength={120} className={`${input} py-2`} />
              <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className={btn.ghost} aria-label="Remove step">✕</button>
            </li>
          ))}
        </ol>
        {steps.length < 12 && (
          <div className="flex gap-2">
            <input value={stepDraft} onChange={(e) => setStepDraft(e.target.value)} maxLength={120} placeholder="e.g. Put on shoes" className={`${input} py-2`}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (stepDraft.trim()) { setSteps([...steps, stepDraft]); setStepDraft(""); } } }} />
            <button type="button" className={btn.soft} disabled={!stepDraft.trim()} onClick={() => { setSteps([...steps, stepDraft]); setStepDraft(""); }}>Add</button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className={`${btn.primary} flex-1`} disabled={busy || !title.trim()}>{busy ? "Adding..." : "Add to my day"}</button>
        <button type="button" className={btn.soft} onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
