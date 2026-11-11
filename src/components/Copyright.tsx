/** Copyright line shown at the bottom of every page. */
export default function Copyright({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-600 dark:text-slate-300">MaskedOps</span>. All rights reserved.
    </p>
  );
}
