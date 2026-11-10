import Link from "next/link";
import { btn } from "@/lib/colors";

const FEATURES = [
  { e: "🖐️", t: "Just 5 a day", d: "No endless lists. Pick up to five things that matter today.", c: "from-violet-400 to-fuchsia-500" },
  { e: "🔔", t: "Reminds you until it's done", d: "Friendly nudges that keep coming (with Done and Snooze buttons) so nothing slips away.", c: "from-orange-400 to-rose-500" },
  { e: "🎉", t: "Celebrates every win", d: "Confetti, cheers, points, badges and rewards you choose yourself.", c: "from-amber-300 to-orange-400" },
  { e: "💜", t: "Kind on low-energy days", d: "Tell it you're running low and it lightens your day, softens reminders and doubles points for tiny steps.", c: "from-sky-400 to-violet-500" },
  { e: "🎯", t: "One thing at a time", d: "Focus mode shows only the task in front of you, with a colourful timer.", c: "from-emerald-400 to-teal-500" },
  { e: "⏱️", t: "Makes time visible", d: "See your day as a timeline, how long until things start, and how your time guesses compare.", c: "from-lime-400 to-emerald-500" },
];

export default function WelcomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 bg-clip-text text-5xl font-black leading-tight text-transparent">Plan small. Win big.</h1>
        <p className="mt-3 text-lg font-bold text-slate-600 dark:text-slate-300">A colourful day planner made for ADHD brains.</p>
        <div className="mt-6 grid gap-3">
          <Link href="/register" className={`${btn.primary} py-4 text-lg`}>Start for free 🚀</Link>
          <Link href="/login" className={btn.soft}>I already have an account</Link>
        </div>
      </section>
      <ul className="grid gap-3">
        {FEATURES.map((f) => (
          <li key={f.t} className={`rounded-3xl bg-gradient-to-br ${f.c} p-5 text-white shadow-lg`}>
            <p className="text-3xl" aria-hidden>{f.e}</p>
            <p className="mt-1 text-xl font-black">{f.t}</p>
            <p className="font-semibold text-white/90">{f.d}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
