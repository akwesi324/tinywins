"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { AddTask, DayTimeline, Slots, TaskCard } from "@/components/today";
import { btn, panel } from "@/lib/colors";
import { addDays, prettyDay } from "@/lib/dates.ts";
import { LIGHT_DAY_TASKS, isLowDay, lightDayExtras, orderForDay, pointsBalance, streak, tasksOn } from "@/lib/logic.ts";
import { COLORS, MAX_TASKS_PER_DAY, type Energy } from "@/lib/types.ts";

const ENERGY: { level: Energy; emoji: string; label: string }[] = [
  { level: "low", emoji: "😴", label: "Low" },
  { level: "ok", emoji: "🙂", label: "Okay" },
  { level: "high", emoji: "⚡", label: "Buzzing" },
];

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}${name ? `, ${name}` : ""}!`;
}

function EnergyCheckIn({ current, onPick }: { current: Energy | undefined; onPick: (e: Energy) => void }) {
  return (
    <section className={`${panel} space-y-3`} aria-label="Energy check-in">
      <h2 className="text-lg font-black text-slate-900 dark:text-white">{current ? "Your energy today" : "How's your energy today?"}</h2>
      <div className="grid grid-cols-3 gap-2">
        {ENERGY.map((e) => (
          <button key={e.level} onClick={() => onPick(e.level)} aria-pressed={current === e.level}
            className={`rounded-2xl p-3 text-center font-extrabold transition active:scale-95 ${current === e.level ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
            <span className="block text-3xl" aria-hidden>{e.emoji}</span>
            {e.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function TodayView({ aiEnabled }: { aiEnabled: boolean }) {
  const store = useStore();
  const { state, today, name } = store;
  const [day, setDay] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const shown = day ?? today;
  const isToday = shown === today;
  const low = isLowDay(state, shown);
  const tasks = tasksOn(state, shown);
  const ordered = orderForDay(tasks, low && isToday);
  const doneCount = tasks.filter((t) => t.done).length;
  const s = streak(state, today);
  const extras = isToday && low ? lightDayExtras(state, today) : [];
  const full = tasks.length >= MAX_TASKS_PER_DAY;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 bg-clip-text text-3xl font-black text-transparent">{greeting(name)}</h1>
          <p className="font-bold text-slate-500">{doneCount === tasks.length && tasks.length ? "Everything done! 🎉" : `${doneCount} of ${tasks.length} done`}</p>
        </div>
        <div className="flex gap-2 text-center">
          <div className="rounded-2xl bg-orange-100 px-3 py-2 dark:bg-orange-950/60" title="Day streak">
            <span className="block text-xl" aria-hidden>🔥</span>
            <span className="text-sm font-black text-orange-700 dark:text-orange-300">{s.current}</span>
          </div>
          <div className="rounded-2xl bg-amber-100 px-3 py-2 dark:bg-amber-950/60" title="Points">
            <span className="block text-xl" aria-hidden>⭐</span>
            <span className="text-sm font-black text-amber-700 dark:text-amber-300">{pointsBalance(state)}</span>
          </div>
        </div>
      </header>

      {isToday && (!state.energy[today] || low) && <EnergyCheckIn current={state.energy[today]} onPick={store.setEnergy} />}

      {isToday && low && (
        <section className="rounded-3xl bg-gradient-to-br from-violet-200 to-sky-200 p-5 text-violet-950 dark:from-violet-950 dark:to-sky-950 dark:text-violet-100">
          <p className="text-lg font-black">💜 Low-energy day mode</p>
          <p className="mt-1 font-semibold">That&apos;s okay. Easiest tasks are first, reminders are gentler, and tiny steps earn double points. Even 2 minutes counts.</p>
          {extras.length > 0 && (
            <button className={`${btn.primary} mt-3`} onClick={() => store.lightenDay()}>
              Keep {LIGHT_DAY_TASKS} today, move {extras.length} to later
            </button>
          )}
        </section>
      )}

      <section className={`${panel} space-y-4`}>
        <div className="flex items-center justify-between gap-2">
          <button className={btn.ghost} onClick={() => setDay(addDays(shown, -1))} aria-label="Previous day">◀</button>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900 dark:text-white">{prettyDay(shown, today)}</p>
            {!isToday && <button className="text-sm font-bold text-fuchsia-600" onClick={() => setDay(null)}>Back to today</button>}
          </div>
          <button className={btn.ghost} onClick={() => setDay(addDays(shown, 1))} aria-label="Next day">▶</button>
        </div>
        <div className="flex justify-center"><Slots tasks={tasks} /></div>
        <DayTimeline tasks={tasks} isToday={isToday} />
      </section>

      <div className="space-y-4">
        {ordered.map((t) => <TaskCard key={t.id} task={t} today={today} low={low && isToday} />)}
        {!tasks.length && !adding && (
          <div className="rounded-3xl border-4 border-dashed border-fuchsia-200 p-8 text-center dark:border-fuchsia-900">
            <p className="text-5xl" aria-hidden>🌤️</p>
            <p className="mt-2 text-lg font-black text-slate-700 dark:text-slate-200">{isToday ? "A fresh day! What's one thing you'd like to do?" : "Nothing planned yet."}</p>
          </div>
        )}
      </div>

      {adding ? (
        <AddTask date={shown} aiEnabled={aiEnabled} onDone={() => setAdding(false)} defaultColor={COLORS[(tasks.length * 3 + 5) % COLORS.length]} />
      ) : full ? (
        <p className="rounded-3xl bg-gradient-to-r from-emerald-100 to-sky-100 p-5 text-center font-bold text-emerald-900 dark:from-emerald-950 dark:to-sky-950 dark:text-emerald-200">
          5 is the magic number! 🖐️ Finish one, or move one to another day, to make room.
        </p>
      ) : (
        <button className={`${btn.primary} w-full py-4 text-lg`} onClick={() => setAdding(true)}>
          + Add a task ({MAX_TASKS_PER_DAY - tasks.length} {MAX_TASKS_PER_DAY - tasks.length === 1 ? "slot" : "slots"} left)
        </button>
      )}
      {adding && low && isToday && tasks.length >= LIGHT_DAY_TASKS && (
        <p className="text-center font-semibold text-violet-700 dark:text-violet-300">Low-energy day: 3 tasks is plenty. It&apos;s fine to save this for tomorrow. 💜</p>
      )}
    </div>
  );
}
