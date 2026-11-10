"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreProvider, useStore } from "@/lib/store";
import Celebration from "@/components/Celebration";
import ReminderEngine from "@/components/ReminderEngine";

const NAV = [
  { href: "/", label: "Today", icon: "🗓️" },
  { href: "/now", label: "Focus", icon: "🎯" },
  { href: "/wins", label: "Wins", icon: "🏆" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function ErrorToast() {
  const { error, clearError } = useStore();
  if (!error) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <button onClick={clearError} className="max-w-md rounded-2xl bg-slate-900 px-5 py-3 text-left font-semibold text-white shadow-xl dark:bg-white dark:text-slate-900">
        {error} <span className="ml-2 opacity-60">Tap to close</span>
      </button>
    </div>
  );
}

function Loading({ children }: { children: React.ReactNode }) {
  const { ready, loadFailed, reload, clearError } = useStore();
  if (!ready && loadFailed) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <div className="text-5xl" aria-hidden>🌧️</div>
          <p className="mt-2 font-bold text-slate-600 dark:text-slate-300">Couldn&apos;t load your day just now.</p>
          <button className="mt-4 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 font-extrabold text-white" onClick={() => { clearError(); reload(); }}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <div className="animate-bounce text-5xl" aria-hidden>🌟</div>
          <p className="mt-2 font-bold text-slate-500">Getting your day ready...</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <StoreProvider>
      <div className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-6">
        <Loading>{children}</Loading>
      </div>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/50 bg-white/85 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/85">
        <ul className="mx-auto grid max-w-2xl grid-cols-4">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-3 text-xs font-extrabold transition ${active ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-slate-500"}`}>
                  <span className={`text-2xl transition ${active ? "scale-125" : ""}`} aria-hidden>{n.icon}</span>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <ReminderEngine />
      <Celebration />
      <ErrorToast />
    </StoreProvider>
  );
}
