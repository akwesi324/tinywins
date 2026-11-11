"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { AddTask, DayTimeline, Slots, TaskCard } from "@/components/today";
import { btn, panel } from "@/lib/colors";
import { addDays, prettyDay } from "@/lib/dates.ts";
import { LIGHT_DAY_TASKS, isLowDay, lightDayExtras, orderForDay, pointsBalance, streak, tasksOn } from "@/lib/logic.ts";
import { COLORS, MAX_TASKS_PER_DAY, type Energy } from "@/lib/types.ts";
import { IconArrowLeft, IconArrowRight, IconBattery, IconFlame, IconStar } from "@/components/icons";

const ENERGY: { level: Energy; label: string; hint: string }[] = [
  { level: "low", label: "Low", hint: "Running on empty" },
  { level: "ok", label: "Steady", hint: "A normal day" },
  { level: "high", label: "High", hint: "Ready to go" },
];

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}${name ? `, ${name}` : ""}`;
}

function EnergyCheckIn({ current, onPick }: { current: Energy | undefined; onPick: (e: Energy) => void }) {
  return (
    <section className={`${panel} space-y-3`} aria-label="Energy check-in">
      <h2 className="font-bold text-slate-900 dark:text-white">{current ? "Your energy today" : "How's your energy today?"}</h2>
      <div className="grid grid-cols-3 gap-2">
        {ENERGY.map((e) => (
          <button key={e.level} onClick={() => onPick(e.level)} aria-pressed={current === e.level}
            className={`rounded-xl p-3 text-left transition active:scale-[0.98] ${current === e.level ? "bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"}`}>
            <span className="block font-bold">{e.label}</span>
            <span className={`block text-xs ${current === e.level ? "text-sky-100" : "text-slate-500"}`}>{e.hint}</span>
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
          <h1 className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-indigo-400 dark:via-sky-400 dark:to-cyan-300">{greeting(name)}</h1>
          <p className="text-slate-500">{tasks.length && doneCount === tasks.length ? "Everything for today is done." : `${doneCount} of ${tasks.length} done`}</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800" title="Day streak">
            <IconFlame className="h-4 w-4 text-orange-500" />{s.current}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800" title="Points">
            <IconStar className="h-4 w-4 text-amber-500" />{pointsBalance(state)}
          </span>
        </div>
      </header>

      {isToday && (!state.energy[today] || low) && <EnergyCheckIn current={state.energy[today]} onPick={store.setEnergy} />}

      {isToday && low && (
        <section className="flex gap-3 rounded-2xl bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 p-5 ring-1 ring-indigo-100 dark:from-violet-500/10 dark:via-indigo-500/10 dark:to-sky-500/10 dark:ring-indigo-500/20">
          <IconBattery className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <div>
            <p className="font-bold text-indigo-950 dark:text-indigo-100">Low-energy day mode</p>
            <p className="mt-1 text-sm text-indigo-900/80 dark:text-indigo-200/80">
              That&apos;s okay. The easiest tasks are first, reminders are gentler, and small steps earn double points. Two minutes of effort still counts.
            </p>
            {extras.length > 0 && (
              <button className={`${btn.primary} mt-3`} onClick={() => store.lightenDay()}>
                Keep {LIGHT_DAY_TASKS} today, move {extras.length} to later
              </button>
            )}
          </div>
        </section>
      )}

      <section className={`${panel} space-y-4`}>
        <div className="flex items-center justify-between gap-2">
          <button className={btn.ghost} onClick={() => setDay(addDays(shown, -1))} aria-label="Previous day"><IconArrowLeft /></button>
          <div className="text-center">
            <p className="font-bold text-slate-900 dark:text-white">{prettyDay(shown, today)}</p>
            {!isToday && <button className="text-sm font-semibold text-indigo-600 dark:text-indigo-400" onClick={() => setDay(null)}>Back to today</button>}
          </div>
          <button className={btn.ghost} onClick={() => setDay(addDays(shown, 1))} aria-label="Next day"><IconArrowRight /></button>
        </div>
        <Slots tasks={tasks} />
        <DayTimeline tasks={tasks} isToday={isToday} />
      </section>

      <div className="space-y-3">
        {ordered.map((t) => <TaskCard key={t.id} task={t} today={today} low={low && isToday} />)}
        {!tasks.length && !adding && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <p className="font-semibold text-slate-700 dark:text-slate-200">{isToday ? "Nothing planned yet. What's one thing you'd like to get done?" : "Nothing planned for this day."}</p>
          </div>
        )}
      </div>

      {adding ? (
        <AddTask date={shown} aiEnabled={aiEnabled} onDone={() => setAdding(false)} defaultColor={COLORS[(tasks.length * 3 + 5) % COLORS.length]} />
      ) : full ? (
        <p className="rounded-2xl bg-white p-5 text-center text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
          That&apos;s five, the limit for one day. Finish one or move one to another day to make room.
        </p>
      ) : (
        <button className={`${btn.primary} w-full py-3.5`} onClick={() => setAdding(true)} data-add-task>
          + Add a task ({MAX_TASKS_PER_DAY - tasks.length} {MAX_TASKS_PER_DAY - tasks.length === 1 ? "slot" : "slots"} left)
        </button>
      )}
      {adding && low && isToday && tasks.length >= LIGHT_DAY_TASKS && (
        <p className="text-center text-sm text-indigo-700 dark:text-indigo-300">Low-energy day: three tasks is plenty. It&apos;s fine to save this for tomorrow.</p>
      )}
    </div>
  );
}
