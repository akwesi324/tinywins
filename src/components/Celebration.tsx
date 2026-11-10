"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Confetti, chime } from "@/components/effects";
import { btn } from "@/lib/colors";
import { IconCheck } from "@/components/icons";

/** A short, satisfying moment for finished tasks and badges; a quiet toast for steps. */
export default function Celebration() {
  const { celebration, dismissCelebration, state } = useStore();

  useEffect(() => {
    if (!celebration) return;
    if (state.settings.sound && celebration.kind !== "step") chime("win");
    const t = setTimeout(dismissCelebration, celebration.kind === "step" ? 2200 : 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per celebration
  }, [celebration?.id]);

  if (!celebration) return null;
  const big = celebration.kind === "perfect";

  if (celebration.kind === "step" && !celebration.badges.length) {
    return (
      <div role="status" className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="flex animate-[pop_.25s_ease-out] items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900">
          <IconCheck className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          {celebration.text}
        </div>
      </div>
    );
  }

  return (
    <>
      <Confetti burst={celebration.id} big={big} />
      <div role="alertdialog" aria-live="assertive" aria-label="Task completed" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-6 backdrop-blur-sm" onClick={dismissCelebration}>
        <div className="w-full max-w-sm animate-[pop_.3s_ease-out] rounded-2xl bg-white p-7 text-center shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
          <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${big ? "bg-indigo-600" : "bg-emerald-500"} text-white`}>
            <IconCheck className="h-7 w-7" />
          </span>
          <p className="mt-4 text-xl font-bold leading-snug tracking-tight text-slate-900 dark:text-white">{celebration.text}</p>
          {celebration.badges.length > 0 && (
            <div className="mt-4 space-y-2">
              {celebration.badges.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-left dark:bg-amber-500/10">
                  <span className="text-2xl" aria-hidden>{b.emoji}</span>
                  <span>
                    <span className="block text-sm font-bold text-amber-900 dark:text-amber-200">Badge unlocked: {b.title}</span>
                    <span className="block text-xs text-amber-800 dark:text-amber-300">{b.description}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={dismissCelebration} className={`${btn.primary} mt-6 w-full`} autoFocus>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}
