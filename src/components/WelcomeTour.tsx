"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { btn } from "@/lib/colors";
import { IconArrowLeft, IconArrowRight, IconBattery, IconBell, IconClock, IconFocus, IconProgress, IconToday } from "@/components/icons";

const SLIDES = [
  { icon: IconToday, accent: "bg-indigo-500", title: "Five tasks. That's the day.", body: "No endless lists. Choose up to five things that matter today and let the rest wait for tomorrow." },
  { icon: IconBell, accent: "bg-rose-500", title: "Reminders that don't give up", body: "Nudges keep coming until a task is done, snoozed or moved. Done and Snooze are one tap away, right from the notification." },
  { icon: IconProgress, accent: "bg-emerald-500", title: "Progress you can see", body: "Every finished task counts: points, streaks with a built-in rest day, and rewards you choose for yourself." },
  { icon: IconBattery, accent: "bg-amber-500", title: "Low-energy days are part of the plan", body: "Check in with your energy. On a low day TinyWins keeps three tasks, eases the reminders and shows you the easiest place to start." },
  { icon: IconFocus, accent: "bg-sky-500", title: "One thing at a time", body: "Focus mode shows a single task and its next small step, with a timer that can start at two minutes if that's all you've got." },
  { icon: IconClock, accent: "bg-violet-500", title: "Time you can see", body: "A timeline of your day, how long until each task starts, and how your estimates compare with how long things really take." },
];

/** Feature tour: one card at a time, Next until the last one, then Get started. */
export default function WelcomeTour() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const last = i === SLIDES.length - 1;
  const next = () => (last ? router.push("/register") : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What TinyWins does"
      className="space-y-5"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") back();
      }}
    >
      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx < -40 && !last) setI(i + 1);
          if (dx > 40) back();
          touchX.current = null;
        }}
      >
        <ul className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {SLIDES.map((s, n) => (
            <li key={s.title} className="w-full shrink-0" aria-roledescription="slide" aria-label={`${n + 1} of ${SLIDES.length}`} aria-hidden={n !== i}>
              <div className="flex min-h-64 flex-col rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.accent} text-white`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{s.title}</h2>
                <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {SLIDES.map((s, n) => (
            <span key={s.title} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-indigo-600 dark:bg-indigo-400" : "w-1.5 bg-slate-300 dark:bg-slate-700"}`} />
          ))}
        </div>
        <p className="text-sm text-slate-500" aria-live="polite">{i + 1} / {SLIDES.length}</p>
      </div>

      <div className="flex gap-3">
        {i > 0 && (
          <button type="button" onClick={back} className={btn.soft} aria-label="Previous">
            <IconArrowLeft />
          </button>
        )}
        <button type="button" onClick={next} className={`${btn.primary} flex-1 py-3.5`}>
          {last ? "Get started" : "Next"}
          <IconArrowRight />
        </button>
      </div>
      <p className="text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400">Sign in</Link>
      </p>
    </section>
  );
}
