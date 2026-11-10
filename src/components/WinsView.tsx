"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { btn, input, panel } from "@/lib/colors";
import { BADGES, estimateAccuracy, isLowDay, pointsBalance, pointsEarned, streak } from "@/lib/logic.ts";
import { formatDuration } from "@/lib/dates.ts";

const REWARD_EMOJIS = ["🎁", "📺", "🍫", "🎮", "🎧", "☕", "🛁", "🍦", "📖", "🛍️"];

export default function WinsView() {
  const { state, today, claimReward, addReward, deleteReward } = useStore();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [cost, setCost] = useState("40");
  const balance = pointsBalance(state);
  const s = streak(state, today);
  const done = state.tasks.filter((t) => t.done);
  const focusMin = state.focusSessions.reduce((n, f) => n + f.minutes, 0);
  const acc = estimateAccuracy(state);
  const earnedIds = new Set(state.badges.map((b) => b.id));
  const lowWins = done.filter((t) => isLowDay(state, t.date)).length;

  return (
    <div className="space-y-6">
      <h1 className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-3xl font-black text-transparent">Your wins 🏆</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { e: "⭐", v: balance, l: "points to spend", c: "from-amber-300 to-orange-400" },
          { e: "🔥", v: s.current, l: `day streak (best ${s.best})`, c: "from-orange-400 to-rose-500" },
          { e: "✅", v: done.length, l: "tasks finished", c: "from-emerald-400 to-teal-500" },
          { e: "🎯", v: formatDuration(focusMin * 60), l: "focused", c: "from-sky-400 to-violet-500" },
        ].map((x) => (
          <div key={x.l} className={`rounded-3xl bg-gradient-to-br ${x.c} p-4 text-white shadow-lg`}>
            <p className="text-2xl" aria-hidden>{x.e}</p>
            <p className="text-2xl font-black">{x.v}</p>
            <p className="text-sm font-bold text-white/90">{x.l}</p>
          </div>
        ))}
      </section>
      {s.restDayUsed && <p className="font-semibold text-slate-600 dark:text-slate-300">Your streak used a rest day this week. That&apos;s what rest days are for. 💜</p>}

      <section className={`${panel} space-y-4`}>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Rewards 🎁</h2>
          <p className="font-semibold text-slate-500">You&apos;ve earned {pointsEarned(state)} points in total. Spend them on treats you choose.</p>
        </div>
        <ul className="space-y-2">
          {state.rewards.map((r) => {
            const can = balance >= r.cost;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-3xl" aria-hidden>{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-slate-900 dark:text-white">{r.title}</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, (balance / r.cost) * 100)}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">{can ? "Ready to claim!" : `${r.cost - balance} more points`} · {r.cost} pts</p>
                </div>
                <button disabled={!can} onClick={() => claimReward(r.id)} className={can ? btn.primary : btn.soft}>Claim</button>
                <button onClick={() => confirm(`Remove "${r.title}"?`) && deleteReward(r.id)} className={btn.ghost} aria-label={`Remove ${r.title}`}>✕</button>
              </li>
            );
          })}
        </ul>
        <form className="space-y-2 rounded-2xl border-2 border-dashed border-slate-200 p-3 dark:border-slate-700"
          onSubmit={(e) => { e.preventDefault(); if (title.trim()) { addReward(title, emoji, Math.max(1, Math.min(10000, Number(cost) || 1))); setTitle(""); } }}>
          <p className="font-extrabold text-slate-700 dark:text-slate-200">Add your own reward</p>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_EMOJIS.map((x) => (
              <button type="button" key={x} onClick={() => setEmoji(x)} aria-pressed={emoji === x} className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${emoji === x ? "bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-950" : "bg-slate-100 dark:bg-slate-800"}`}>{x}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. 30 minutes of gaming" className={input} />
            <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min={1} max={10000} aria-label="Points needed" className={`${input} w-24`} />
          </div>
          <button className={btn.soft} disabled={!title.trim()}>Add reward</button>
        </form>
        {state.claims.length > 0 && (
          <p className="text-sm font-semibold text-slate-500">Last treat: {state.claims.at(-1)!.title} ({new Date(state.claims.at(-1)!.at).toLocaleDateString()})</p>
        )}
      </section>

      <section className={`${panel} space-y-3`}>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Badges ({earnedIds.size}/{BADGES.length})</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((b) => {
            const got = earnedIds.has(b.id);
            return (
              <li key={b.id} className={`rounded-2xl p-3 text-center ${got ? "bg-gradient-to-br from-amber-100 to-pink-100 dark:from-amber-950 dark:to-pink-950" : "bg-slate-100 opacity-60 grayscale dark:bg-slate-800"}`}>
                <p className="text-4xl" aria-hidden>{b.emoji}</p>
                <p className="font-black text-slate-900 dark:text-white">{b.title}</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{got ? "Unlocked!" : b.description}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`${panel} space-y-2`}>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Time check ⏱️</h2>
        {acc.count ? (
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            For {acc.count} finished task{acc.count === 1 ? "" : "s"} with a guess, you guessed <strong>{acc.avgEstimate} min</strong> on average and focused <strong>{acc.avgActual} min</strong>.{" "}
            {acc.avgActual > acc.avgEstimate * 1.2 ? "Things tend to take a bit longer than you think: try adding some extra time." : acc.avgActual < acc.avgEstimate * 0.8 ? "You're faster than you think!" : "Your guesses are spot on!"}
          </p>
        ) : (
          <p className="font-semibold text-slate-500">Add a time guess to a task and use the focus timer: TinyWins will show how your guesses compare with real time.</p>
        )}
        {lowWins > 0 && <p className="font-semibold text-violet-700 dark:text-violet-300">💜 You finished {lowWins} task{lowWins === 1 ? "" : "s"} on low-energy days. That takes real strength.</p>}
      </section>
    </div>
  );
}
