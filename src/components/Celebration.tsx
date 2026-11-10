"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Confetti, chime } from "@/components/effects";
import { btn } from "@/lib/colors";

/** Full-screen celebration for finished tasks, perfect days and badges; a small toast for steps. */
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
        <div className="animate-[pop_.35s_ease-out] rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 px-5 py-3 text-lg font-extrabold text-white shadow-xl">
          {celebration.text}
        </div>
      </div>
    );
  }

  return (
    <>
      <Confetti burst={celebration.id} big={big} />
      <div role="alertdialog" aria-live="assertive" aria-label="Celebration" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-6 backdrop-blur-sm" onClick={dismissCelebration}>
        <div className="w-full max-w-sm animate-[pop_.45s_cubic-bezier(.2,1.6,.4,1)] rounded-[2rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 p-1 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="rounded-[1.8rem] bg-white p-7 text-center dark:bg-slate-900">
            <div className="text-6xl" aria-hidden>{big ? "🌈" : celebration.badges.length ? celebration.badges[0].emoji : "🎉"}</div>
            <p className="mt-3 text-2xl font-black leading-tight text-slate-900 dark:text-white">{celebration.text}</p>
            {celebration.badges.length > 0 && (
              <div className="mt-4 space-y-2">
                {celebration.badges.map((b) => (
                  <div key={b.id} className="rounded-2xl bg-amber-100 px-4 py-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <span className="font-extrabold">New badge: {b.emoji} {b.title}</span>
                    <span className="block text-sm">{b.description}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={dismissCelebration} className={`${btn.primary} mt-6 w-full`} autoFocus>
              Yay! Keep going
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
