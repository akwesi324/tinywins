import type { ColorKey } from "./types.ts";

// Full class strings (Tailwind only generates classes it can see written out).
export const COLOR: Record<ColorKey, { card: string; solid: string; soft: string; text: string; ring: string; hex: string; label: string }> = {
  rose: { card: "from-rose-400 to-pink-500", solid: "bg-rose-500", soft: "bg-rose-100 dark:bg-rose-950/60", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-400", hex: "#f43f5e", label: "Strawberry" },
  orange: { card: "from-orange-400 to-amber-500", solid: "bg-orange-500", soft: "bg-orange-100 dark:bg-orange-950/60", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-400", hex: "#f97316", label: "Tangerine" },
  amber: { card: "from-amber-300 to-yellow-400", solid: "bg-amber-400", soft: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-400", hex: "#f59e0b", label: "Sunshine" },
  lime: { card: "from-lime-400 to-green-500", solid: "bg-lime-500", soft: "bg-lime-100 dark:bg-lime-950/60", text: "text-lime-700 dark:text-lime-300", ring: "ring-lime-400", hex: "#84cc16", label: "Lime" },
  emerald: { card: "from-emerald-400 to-teal-500", solid: "bg-emerald-500", soft: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-400", hex: "#10b981", label: "Mint" },
  sky: { card: "from-sky-400 to-blue-500", solid: "bg-sky-500", soft: "bg-sky-100 dark:bg-sky-950/60", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-400", hex: "#0ea5e9", label: "Ocean" },
  violet: { card: "from-violet-400 to-purple-500", solid: "bg-violet-500", soft: "bg-violet-100 dark:bg-violet-950/60", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-400", hex: "#8b5cf6", label: "Grape" },
  fuchsia: { card: "from-fuchsia-400 to-pink-500", solid: "bg-fuchsia-500", soft: "bg-fuchsia-100 dark:bg-fuchsia-950/60", text: "text-fuchsia-700 dark:text-fuchsia-300", ring: "ring-fuchsia-400", hex: "#d946ef", label: "Bubblegum" },
};

export const EMOJIS = ["⭐", "📚", "🧹", "💊", "🏃", "🍳", "💼", "📞", "🛒", "🧺", "💻", "✏️", "🦷", "🛏️", "🌱", "🎨", "💧", "📧", "🚗", "🐶"];

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 px-5 py-3 font-extrabold text-white shadow-lg shadow-fuchsia-500/25 transition active:scale-95 disabled:opacity-50",
  soft: "inline-flex items-center justify-center gap-2 rounded-2xl bg-white/80 px-4 py-2.5 font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white active:scale-95 disabled:opacity-50 dark:bg-slate-800/80 dark:text-slate-100 dark:ring-slate-700",
  ghost: "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800",
};
export const input =
  "w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-4 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-fuchsia-900";
export const panel = "rounded-3xl bg-white/90 p-5 shadow-xl shadow-violet-500/5 ring-1 ring-slate-200/70 dark:bg-slate-900/90 dark:ring-slate-800";
