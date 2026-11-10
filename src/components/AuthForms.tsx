"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { register, requestPasswordReset, signIn, updatePassword, type FormState } from "@/app/actions/auth";
import { btn, input } from "@/lib/colors";

function Submit({ children, pending }: { children: React.ReactNode; pending: string }) {
  const { pending: busy } = useFormStatus();
  return <button className={`${btn.primary} w-full py-4 text-lg`} disabled={busy}>{busy ? pending : children}</button>;
}

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">{state.error}</p>;
  if (state?.ok) return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{state.ok}</p>;
  return null;
}

const label = "space-y-1 block";
const span = "text-sm font-semibold text-slate-700 dark:text-slate-300";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className={label}><span className={span}>Email</span><input type="email" name="email" required autoComplete="email" className={input} /></label>
      <label className={label}><span className={span}>Password</span><input type="password" name="password" required autoComplete="current-password" className={input} /></label>
      <Message state={state} />
      <Submit pending="Signing in...">Sign in</Submit>
      <p className="text-center font-bold"><Link href="/forgot-password" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Forgot your password?</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(register, undefined);
  const [tz] = useState(() => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"));
  if (state?.ok) return <Message state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="timezone" value={tz} />
      <label className={label}><span className={span}>What should we call you?</span><input name="display_name" required maxLength={60} autoComplete="given-name" className={input} /></label>
      <label className={label}><span className={span}>Email</span><input type="email" name="email" required autoComplete="email" className={input} /></label>
      <label className={label}><span className={span}>Password (at least 8 characters)</span><input type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" className={input} /></label>
      <Message state={state} />
      <Submit pending="Creating your account...">Create account</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className={label}><span className={span}>Email</span><input type="email" name="email" required autoComplete="email" className={input} /></label>
      <Message state={state} />
      <Submit pending="Sending...">Send reset link</Submit>
    </form>
  );
}

export function ResetForm({ userId, secret }: { userId: string; secret: string }) {
  const [state, action] = useActionState(updatePassword, undefined);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Message state={state} />
        <Link href="/login" className={`${btn.primary} w-full`}>Sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="secret" value={secret} />
      <label className={label}><span className={span}>New password</span><input type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" className={input} /></label>
      <Message state={state} />
      <Submit pending="Saving...">Save password</Submit>
    </form>
  );
}
