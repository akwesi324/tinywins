"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { btn, input, panel } from "@/lib/colors";
import { BADGES, estimateAccuracy, isLowDay, pointsBalance, pointsEarned, streak } from "@/lib/logic.ts";
import { formatDuration } from "@/lib/dates.ts";
import { IconCheck, IconFlame, IconFocus, IconStar } from "@/components/icons";

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

  const stats = [
    { Icon: IconStar, tint: "text-amber-500", v: balance, l: "points to spend" },
    { Icon: IconFlame, tint: "text-orange-500", v: s.current, l: `day streak (best ${s.best})` },
    { Icon: IconCheck, tint: "text-emerald-500", v: done.length, l: "tasks finished" },
    { Icon: IconFocus, tint: "text-indigo-500", v: formatDuration(focusMin * 60), l: "focused" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Progress</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ Icon, tint, v, l }) => (
          <div key={l} className={panel}>
            <Icon className={`h-5 w-5 ${tint}`} />
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{v}</p>
            <p className="text-sm text-slate-500">{l}</p>
          </div>
        ))}
      </section>
      {s.restDayUsed && <p className="text-sm text-slate-600 dark:text-slate-300">Your streak used its rest day this week. That&apos;s what it&apos;s for.</p>}

      <section className={`${panel} space-y-4`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rewards</h2>
          <p className="text-sm text-slate-500">You&apos;ve earned {pointsEarned(state)} points in total. Spend them on things you choose.</p>
        </div>
        <ul className="space-y-2">
          {state.rewards.map((r) => {
            const can = balance >= r.cost;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="text-2xl" aria-hidden>{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">{r.title}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (balance / r.cost) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{can ? "Ready to claim" : `${r.cost - balance} more points`} · {r.cost} pts</p>
                </div>
                <button disabled={!can} onClick={() => claimReward(r.id)} className={can ? btn.primary : btn.soft}>Claim</button>
                <button onClick={() => confirm(`Remove "${r.title}"?`) && deleteReward(r.id)} className={btn.ghost} aria-label={`Remove ${r.title}`}>✕</button>
              </li>
            );
          })}
        </ul>
        <form className="space-y-3 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700"
          onSubmit={(e) => { e.preventDefault(); if (title.trim()) { addReward(title, emoji, Math.max(1, Math.min(10000, Number(cost) || 1))); setTitle(""); } }}>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add your own reward</p>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_EMOJIS.map((x) => (
              <button type="button" key={x} onClick={() => setEmoji(x)} aria-pressed={emoji === x} className={`grid h-9 w-9 place-items-center rounded-lg text-lg ${emoji === x ? "bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-500/15" : "bg-slate-100 dark:bg-slate-800"}`}>{x}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. An hour of gaming" className={input} />
            <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min={1} max={10000} aria-label="Points needed" className={`${input} w-24`} />
          </div>
          <button className={btn.soft} disabled={!title.trim()}>Add reward</button>
        </form>
        {state.claims.length > 0 && (
          <p className="text-sm text-slate-500">Last reward: {state.claims.at(-1)!.title} ({new Date(state.claims.at(-1)!.at).toLocaleDateString()})</p>
        )}
      </section>

      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Badges <span className="font-normal text-slate-500">{earnedIds.size}/{BADGES.length}</span></h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((b) => {
            const got = earnedIds.has(b.id);
            return (
              <li key={b.id} className={`rounded-xl p-3 ${got ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20" : "bg-slate-50 opacity-60 grayscale dark:bg-slate-800/50"}`}>
                <p className="text-2xl" aria-hidden>{b.emoji}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{b.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{got ? "Unlocked" : b.description}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`${panel} space-y-2`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Time check</h2>
        {acc.count ? (
          <p className="text-slate-600 dark:text-slate-300">
            For {acc.count} finished task{acc.count === 1 ? "" : "s"} with an estimate, you guessed <strong>{acc.avgEstimate} min</strong> on average and focused <strong>{acc.avgActual} min</strong>.{" "}
            {acc.avgActual > acc.avgEstimate * 1.2 ? "Things tend to take longer than you expect, so add a buffer." : acc.avgActual < acc.avgEstimate * 0.8 ? "You're faster than you think." : "Your estimates are accurate."}
          </p>
        ) : (
          <p className="text-slate-500">Add a time estimate to a task and use the focus timer. TinyWins will show how your estimates compare with real time.</p>
        )}
        {lowWins > 0 && <p className="text-sm text-indigo-700 dark:text-indigo-300">You finished {lowWins} task{lowWins === 1 ? "" : "s"} on low-energy days. That counts for a lot.</p>}
      </section>
    </div>
  );
}
