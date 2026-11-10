"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNow } from "@/lib/useNow";
import { useStore } from "@/lib/store";
import { COLOR, btn, panel } from "@/lib/colors";
import { currentTask, isLowDay, tasksOn } from "@/lib/logic.ts";
import { chime } from "@/components/effects";

type Phase = "idle" | "focus" | "break";

function Ring({ fraction, color, label, sub }: { fraction: number; color: string; label: string; sub: string }) {
  const r = 88;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-60 w-60">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="100" cy="100" r={r} fill="none" strokeWidth="16" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle cx="100" cy="100" r={r} fill="none" strokeWidth="16" strokeLinecap="round" stroke={color} strokeDasharray={c} strokeDashoffset={c * (1 - fraction)} style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-5xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white" role="timer" aria-live="off">{label}</p>
          <p className="font-bold text-slate-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}

/** Epoch ms `ms` from now (kept outside components: reading the clock is not render-pure). */
const inMs = (ms: number) => Date.now() + ms;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export default function FocusView({ taskId, minutes }: { taskId: string | null; minutes: number | null }) {
  const { state, today, toggleDone, toggleStep, logFocus } = useStore();
  const [chosen, setChosen] = useState<string | null>(taskId);
  const [phase, setPhase] = useState<Phase>("idle");
  const [endAt, setEndAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [length, setLength] = useState(minutes ?? state.settings.focusMin);
  const [paused, setPaused] = useState<number | null>(null);
  const now = useNow();

  const todays = tasksOn(state, today).filter((t) => !t.done);
  const task = (chosen && state.tasks.find((t) => t.id === chosen)) || currentTask(state, now, today) || todays[0] || null;
  const color = COLOR[task?.color ?? "violet"];
  const low = isLowDay(state, today);

  // countdown
  useEffect(() => {
    if (phase === "idle" || paused != null) return;
    const tick = () => {
      const left = Math.round((endAt - inMs(0)) / 1000);
      setRemaining(left);
      if (left > 0) return;
      if (phase === "focus") {
        logFocus(task?.id ?? null, length);
        if (state.settings.sound) chime("win");
        notify("Focus session done", `Take a ${state.settings.breakMin}-minute break.`);
        setPhase("break");
        setEndAt(inMs(state.settings.breakMin * 60000));
      } else {
        if (state.settings.sound) chime();
        notify("Break's over", task ? `Back to: ${task.title}` : "Ready for another round?");
        setPhase("idle");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restarts only when the phase/end changes
  }, [phase, endAt, paused]);

  function start(mins: number) {
    setLength(mins);
    setPhase("focus");
    setPaused(null);
    setEndAt(inMs(mins * 60000));
    setRemaining(mins * 60);
  }
  function togglePause() {
    if (paused == null) setPaused(remaining);
    else {
      setEndAt(inMs(paused * 1000));
      setPaused(null);
    }
  }

  const total = (phase === "break" ? state.settings.breakMin : length) * 60;
  const left = paused ?? remaining;
  const fraction = phase === "idle" ? 0 : 1 - left / total;

  if (!task) {
    return (
      <div className={`${panel} text-center`}>
        <p className="text-xl font-bold">Nothing left to focus on today.</p>
        <p className="mt-1 text-slate-500">Everything planned is done, or nothing is planned yet.</p>
        <Link href="/" className={`${btn.primary} mt-4`}>Back to today</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={`${panel} relative overflow-hidden text-center`}>
        <span className={`absolute inset-x-0 top-0 h-1.5 ${color.bar}`} aria-hidden />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Right now, just this</p>
        <span className={`mx-auto mt-3 grid h-14 w-14 place-items-center rounded-2xl text-3xl ${color.chip}`} aria-hidden>{task.emoji}</span>
        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{task.title}</h1>
        {task.estimateMin && <p className="mt-1 text-sm text-slate-500">Your estimate: ~{task.estimateMin} min</p>}
      </div>

      <section className={`${panel} space-y-4`}>
        <Ring fraction={fraction} color={phase === "break" ? "#10b981" : color.hex} label={phase === "idle" ? `${length}:00` : mmss(left)} sub={phase === "focus" ? (paused != null ? "Paused" : "Focus time") : phase === "break" ? "Break" : "Ready when you are"} />
        {phase === "idle" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap justify-center gap-2">
              {[2, 5, 15, 25].map((m) => (
                <button key={m} onClick={() => start(m)} className={m === 2 && low ? btn.primary : btn.soft}>{m === 2 ? "Just 2 min" : `${m} min`}</button>
              ))}
            </div>
            <button onClick={() => start(length)} className={`${btn.primary} w-full py-4 text-lg`}>▶ Start {length} minutes</button>
            {low && <p className="text-center text-sm text-indigo-700 dark:text-indigo-300">Low-energy day: start with two minutes. If you keep going, great. If not, that still counts.</p>}
          </div>
        ) : (
          <div className="flex justify-center gap-2">
            {phase === "focus" && <button onClick={togglePause} className={btn.soft}>{paused != null ? "▶ Resume" : "⏸ Pause"}</button>}
            <button onClick={() => { setPhase("idle"); setPaused(null); }} className={btn.ghost}>Stop</button>
          </div>
        )}
      </section>

      {task.steps.length > 0 && (
        <section className={`${panel} space-y-2`}>
          <h2 className="font-bold text-slate-900 dark:text-white">Steps</h2>
          {task.steps.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
              <input type="checkbox" checked={s.done} onChange={() => toggleStep(task.id, s.id)} className="h-5 w-5 accent-emerald-600" />
              <span className={s.done ? "text-slate-400 line-through" : "font-medium"}>{s.text}</span>
            </label>
          ))}
        </section>
      )}

      <div className="flex gap-2">
        <button onClick={() => toggleDone(task.id)} className={`${btn.primary} flex-1 py-4 text-lg`}>Mark as done</button>
        {todays.length > 1 && (
          <button onClick={() => setChosen(todays[(todays.findIndex((t) => t.id === task.id) + 1) % todays.length].id)} className={btn.soft}>Next task</button>
        )}
      </div>
    </div>
  );
}

function notify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || !document.hidden) return;
  navigator.serviceWorker?.ready.then((reg) => reg.showNotification(title, { body, icon: "/icon.svg" })).catch(() => {});
}
