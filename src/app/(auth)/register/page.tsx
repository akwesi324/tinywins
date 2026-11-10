import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/AuthForms";
import { panel } from "@/lib/colors";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
        <p className="mt-1 text-slate-500">Takes under a minute. Your plans sync across your devices.</p>
      </div>
      <div className={panel}>
        <RegisterForm />
      </div>
      <p className="text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400">Sign in</Link>
      </p>
    </div>
  );
}
