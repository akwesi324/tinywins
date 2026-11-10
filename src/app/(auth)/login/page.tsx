import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/AuthForms";
import { panel } from "@/lib/colors";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
      {error && <p className="rounded-xl bg-rose-50 p-3 font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-200">That link has expired. Sign in, or ask for a new one.</p>}
      <div className={panel}>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
      <p className="text-center text-sm text-slate-500">
        New here? <Link href="/register" className="font-semibold text-indigo-600 dark:text-indigo-400">Create an account</Link>
      </p>
    </div>
  );
}
