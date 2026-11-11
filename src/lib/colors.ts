import type { ColorKey } from "./types.ts";

// Colour coding stays (it helps an ADHD brain scan the day), but as calm accents rather than
// full-colour cards. Full class strings: Tailwind only generates classes it can see.
export const COLOR: Record<ColorKey, { bar: string; chip: string; dot: string; text: string; ring: string; hex: string; label: string }> = {
  rose: { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500", hex: "#f43f5e", label: "Rose" },
  orange: { bar: "bg-orange-500", chip: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300", dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500", hex: "#f97316", label: "Orange" },
  amber: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", ring: "ring-amber-500", hex: "#f59e0b", label: "Amber" },
  lime: { bar: "bg-lime-600", chip: "bg-lime-50 text-lime-800 dark:bg-lime-500/10 dark:text-lime-300", dot: "bg-lime-600", text: "text-lime-700 dark:text-lime-400", ring: "ring-lime-600", hex: "#65a30d", label: "Lime" },
  emerald: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500", hex: "#10b981", label: "Green" },
  sky: { bar: "bg-sky-500", chip: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500", hex: "#0ea5e9", label: "Sky" },
  violet: { bar: "bg-violet-500", chip: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500", hex: "#8b5cf6", label: "Violet" },
  fuchsia: { bar: "bg-fuchsia-500", chip: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300", dot: "bg-fuchsia-500", text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-500", hex: "#d946ef", label: "Magenta" },
};

export const EMOJIS = ["⭐", "📚", "🧹", "💊", "🏃", "🍳", "💼", "📞", "🛒", "🧺", "💻", "✏️", "🦷", "🛏️", "🌱", "🎨", "💧", "📧", "🚗", "🐶"];

// Cool gradients: the brand runs indigo -> blue -> cyan, with violet and teal accents.
export const gradient = {
  brand: "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500",
  brandDiag: "bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400",
  text: "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-sky-400 dark:to-cyan-300",
  soft: "bg-gradient-to-br from-indigo-50 via-sky-50 to-cyan-50 dark:from-indigo-500/10 dark:via-sky-500/10 dark:to-cyan-500/10",
  line: "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400",
};

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-5 py-3 font-semibold text-white shadow-md shadow-blue-500/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none",
  soft:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800",
  ghost: "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
};
export const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
export const panel = "rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800";
export const heading = "text-2xl font-bold tracking-tight text-slate-900 dark:text-white";
export const muted = "text-slate-500 dark:text-slate-400";
