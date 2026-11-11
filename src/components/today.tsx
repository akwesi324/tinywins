"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore, type NewTask } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { COLOR, EMOJIS, btn, input, panel } from "@/lib/colors";
import { COLORS, MAX_TASKS_PER_DAY, type ColorKey, type Task } from "@/lib/types.ts";
import { addDays, formatDuration, minutesBetween, relative } from "@/lib/dates.ts";
import { dayPosition } from "@/lib/logic.ts";
import { IconCheck, IconClock, IconFocus, IconPlay, IconSnooze } from "@/components/icons";

// ------------------------------------------------------------------ slots + timeline

export function Slots({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <div className="space-y-2" aria-label={`${done} of ${tasks.length} done, ${MAX_TASKS_PER_DAY - tasks.length} slots free`}>
      <div className="flex gap-1.5">
        {Array.from({ length: MAX_TASKS_PER_DAY }, (_, i) => {
          const t = tasks[i];
          return <span key={i} className={`h-2 flex-1 rounded-full transition ${t ? (t.done ? COLOR[t.color].bar : `${COLOR[t.color].bar} opacity-30`) : "bg-slate-200 dark:bg-slate-800"}`} />;
        })}
      </div>
      <p className="text-xs font-medium text-slate-500">{tasks.length} of {MAX_TASKS_PER_DAY} slots used · {done} done</p>
    </div>
  );
}

/** Time-blindness helper: the waking day as a bar, with the tasks on it and a "now" marker. */
export function DayTimeline({ tasks, isToday }: { tasks: Task[]; isToday: boolean }) {
  const now = useNow();
  const timed = tasks.filter((t) => t.startsAt != null);
  const pos = now ? dayPosition(now) : 0;
  return (
    <div className="pt-3">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-indigo-100 via-sky-100 to-cyan-100 dark:from-indigo-500/15 dark:via-sky-500/15 dark:to-cyan-500/15">
        {isToday && now > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300 dark:bg-slate-600" style={{ width: `${pos * 100}%` }} />}
        {timed.map((t) => (
          <span key={t.id} title={`${t.time} ${t.title}`} className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-slate-900 ${COLOR[t.color].dot} ${t.done ? "opacity-40" : ""}`} style={{ left: `${dayPosition(t.startsAt!) * 100}%` }} />
        ))}
        {isToday && now > 0 && <span className="absolute -top-1.5 h-5 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400" style={{ left: `${pos * 100}%` }} aria-label="Now" />}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-400"><span>7:00</span><span>11:00</span><span>15:00</span><span>19:00</span><span>23:00</span></div>
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
    <article className={`flex overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition dark:bg-slate-900 dark:ring-slate-800 ${task.done ? "opacity-60" : ""}`}>
      <span className={`w-1.5 shrink-0 ${c.bar}`} aria-hidden />
      <div className="min-w-0 flex-1 space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${c.chip}`} aria-hidden>{task.emoji}</span>
          <div className="min-w-0 flex-1">
            <h3 className={`text-lg font-bold leading-snug text-slate-900 dark:text-white ${task.done ? "line-through" : ""}`}>{task.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1"><IconClock className="h-3.5 w-3.5" />{task.time ?? "Any time"}</span>
              {task.estimateMin ? <span>~{task.estimateMin} min</span> : null}
              {task.focusSeconds > 0 ? <span>{formatDuration(task.focusSeconds)} focused</span> : null}
            </p>
          </div>
          <button onClick={() => toggleDone(task.id)} aria-pressed={task.done} aria-label={task.done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600"}`}>
            <IconCheck className="h-5 w-5" />
          </button>
        </div>

        {/* time-blindness: how long until it starts */}
        {isToday && !task.done && mins != null && (
          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span className={mins <= 0 ? c.text : "text-slate-600 dark:text-slate-300"}>{mins > 0 ? `Starts ${relative(mins)}` : mins > -1 ? "Starting now" : `Started ${relative(mins)}`}</span>
              {task.prepMin > 0 && mins > 0 && <span className="text-slate-500">Get ready {relative(mins - task.prepMin)}</span>}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${mins <= 0 ? 100 : Math.max(4, 100 - Math.min(100, (mins / 120) * 100))}%` }} />
            </div>
          </div>
        )}
        {snoozed && <p className="text-sm text-slate-500">Snoozed until {new Date(task.snoozedUntil!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}

        {task.steps.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Steps {stepsDone}/{task.steps.length}</p>
            <ul className="space-y-0.5">
              {task.steps.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={s.done} onChange={() => toggleStep(task.id, s.id)} className="h-5 w-5 accent-emerald-600" />
                    <span className={s.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"}>{s.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!task.done && isToday && low && <Link href={`/now?task=${task.id}&minutes=2`} className={btn.primary}><IconPlay className="h-4 w-4" />Just 2 minutes</Link>}
          {!task.done && isToday && <Link href={`/now?task=${task.id}`} className={btn.soft}><IconFocus className="h-4 w-4" />Focus</Link>}
          {!task.done && isToday && <button className={btn.soft} onClick={() => snooze(task.id, 10)}><IconSnooze className="h-4 w-4" />Snooze 10</button>}
          <button className={btn.ghost} onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "Less" : "More"}</button>
        </div>
        {open && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newStep.trim()) { setSteps(task.id, [...task.steps, { id: "", text: newStep, done: false }]); setNewStep(""); } }}>
              <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Add a small step" maxLength={120} className={input} disabled={task.steps.length >= 12} />
              <button className={btn.soft} disabled={!newStep.trim()}>Add</button>
            </form>
            <div className="flex flex-wrap gap-2">
              {!task.done && <button className={btn.soft} onClick={() => moveTask(task.id, addDays(task.date, 1))}>Move to {isToday ? "tomorrow" : "next day"}</button>}
              {task.steps.length > 0 && <button className={btn.ghost} onClick={() => setSteps(task.id, [])}>Clear steps</button>}
              <button className={`${btn.ghost} text-rose-600 dark:text-rose-400`} onClick={() => confirm(`Delete "${task.title}"?`) && deleteTask(task.id)}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ------------------------------------------------------------------ add task

const REMIND_OPTIONS = [5, 10, 15, 30, 60, 0];
const label = "text-sm font-semibold text-slate-700 dark:text-slate-300";

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
    <form onSubmit={submit} className={`${panel} space-y-5`}>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">New task</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to get done?" maxLength={120} required autoFocus className={`${input} text-lg font-semibold`} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={`${label} mb-2`}>Icon</p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((x) => (
              <button type="button" key={x} onClick={() => setEmoji(x)} aria-pressed={emoji === x} className={`grid h-9 w-9 place-items-center rounded-lg text-lg transition ${emoji === x ? "bg-sky-50 ring-2 ring-blue-500 dark:bg-sky-500/15" : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800"}`}>{x}</button>
            ))}
          </div>
        </div>
        <div>
          <p className={`${label} mb-2`}>Colour</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((k) => (
              <button type="button" key={k} onClick={() => setColor(k)} aria-label={COLOR[k].label} aria-pressed={color === k} className={`h-8 w-8 rounded-full ${COLOR[k].dot} transition ${color === k ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900" : "opacity-80 hover:opacity-100"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={label}>Start time (optional)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
        </label>
        <label className="space-y-1.5">
          <span className={label}>Your time estimate (min)</span>
          <input type="number" inputMode="numeric" min={1} max={600} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="e.g. 20" className={input} />
        </label>
        {time && (
          <label className="space-y-1.5">
            <span className={label}>Get-ready alert</span>
            <select value={prep} onChange={(e) => setPrep(e.target.value)} className={input}>
              {[0, 5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m ? `${m} min before` : "None"}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1.5">
          <span className={label}>Reminders</span>
          <select value={remind} onChange={(e) => setRemind(Number(e.target.value))} className={input}>
            {REMIND_OPTIONS.map((m) => <option key={m} value={m}>{m ? `Every ${m} min until done` : "Once only"}</option>)}
          </select>
        </label>
      </div>

      <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={label}>Small steps <span className="font-normal text-slate-500">(optional, makes starting easier)</span></p>
          {aiEnabled && <button type="button" onClick={suggest} disabled={aiBusy || title.trim().length < 2} className={btn.soft}>{aiBusy ? "Thinking..." : "Suggest steps"}</button>}
        </div>
        {aiError && <p className="text-sm text-rose-600">{aiError}</p>}
        <ol className="space-y-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm font-semibold text-slate-400">{i + 1}</span>
              <input value={s} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))} maxLength={120} className={`${input} py-2`} />
              <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className={btn.ghost} aria-label="Remove step">✕</button>
            </li>
          ))}
        </ol>
        {steps.length < 12 && (
          <div className="flex gap-2">
            <input value={stepDraft} onChange={(e) => setStepDraft(e.target.value)} maxLength={120} placeholder="e.g. Open the document" className={`${input} py-2`}
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
