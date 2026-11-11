"use client";

import Link from "next/link";
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

const slideId = (n: number) => `tour-${n + 1}`;

/**
 * Feature tour: one card at a time, Next until the last one, then Get started.
 * Built from plain links and native horizontal scrolling (scroll snap), so Next and swiping work
 * as soon as the page appears, even before the JavaScript has loaded on a slow connection.
 * Once it has loaded, it only makes Next scroll smoothly without moving the page.
 */
export default function WelcomeTour() {
  function go(e: React.MouseEvent<HTMLAnchorElement>, n: number) {
    const target = document.getElementById(slideId(n));
    const track = target?.parentElement;
    if (!target || !track) return; // fall back to the plain link
    e.preventDefault();
    track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return (
    <section aria-label="What TinyWins does" className="space-y-4">
      <ol className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SLIDES.map((s, n) => {
          const last = n === SLIDES.length - 1;
          return (
            <li key={s.title} id={slideId(n)} className="w-full shrink-0 snap-center snap-always" aria-label={`${n + 1} of ${SLIDES.length}`}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.accent} text-white`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{s.title}</h2>
                <p className="mt-2 flex-1 leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="flex gap-1.5" aria-hidden>
                    {SLIDES.map((d, k) => (
                      <span key={d.title} className={`h-1.5 rounded-full ${k === n ? "w-6 bg-indigo-600 dark:bg-indigo-400" : "w-1.5 bg-slate-300 dark:bg-slate-700"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">{n + 1} / {SLIDES.length}</p>
                </div>

                <div className="mt-4 flex gap-3">
                  {n > 0 && (
                    <a href={`#${slideId(n - 1)}`} onClick={(e) => go(e, n - 1)} className={btn.soft} aria-label="Previous">
                      <IconArrowLeft />
                    </a>
                  )}
                  {last ? (
                    <Link href="/register" className={`${btn.primary} flex-1 py-3.5`}>
                      Get started <IconArrowRight />
                    </Link>
                  ) : (
                    <a href={`#${slideId(n + 1)}`} onClick={(e) => go(e, n + 1)} className={`${btn.primary} flex-1 py-3.5`}>
                      Next <IconArrowRight />
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400">Sign in</Link>
      </p>
    </section>
  );
}
