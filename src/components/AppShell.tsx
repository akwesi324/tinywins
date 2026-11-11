"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreProvider, useStore } from "@/lib/store";
import Celebration from "@/components/Celebration";
import ReminderEngine from "@/components/ReminderEngine";
import { IconFocus, IconProgress, IconSettings, IconToday } from "@/components/icons";
import { btn } from "@/lib/colors";

const NAV = [
  { href: "/", label: "Today", Icon: IconToday },
  { href: "/now", label: "Focus", Icon: IconFocus },
  { href: "/wins", label: "Progress", Icon: IconProgress },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

function ErrorToast() {
  const { error, clearError } = useStore();
  if (!error) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <button onClick={clearError} className="max-w-md rounded-xl bg-slate-900 px-5 py-3 text-left text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
        {error} <span className="ml-2 opacity-60">Dismiss</span>
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
          <p className="font-semibold text-slate-700 dark:text-slate-200">Couldn&apos;t load your day just now.</p>
          <button className={`${btn.primary} mt-4`} onClick={() => { clearError(); reload(); }}>Try again</button>
        </div>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-500">Getting your day ready...</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function AppShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const path = usePathname();
  return (
    <StoreProvider>
      <div className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-6">
        <Loading>{children}</Loading>
        {footer}
      </div>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/90">
        <ul className="mx-auto grid max-w-2xl grid-cols-4">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-1 py-3 text-xs font-semibold transition ${active ? "text-blue-600 dark:text-sky-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
                  {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400" aria-hidden />}
                  <Icon className="h-6 w-6" />
                  {label}
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
