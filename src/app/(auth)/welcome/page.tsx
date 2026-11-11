import WelcomeTour from "@/components/WelcomeTour";

export default function WelcomePage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-sky-400">A planner built for ADHD</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
          Plan less. <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-sky-400 dark:to-cyan-300">Finish more.</span>
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">Keep the day small enough to actually do, and get nudged until it&apos;s done.</p>
      </section>
      <WelcomeTour />
    </div>
  );
}
