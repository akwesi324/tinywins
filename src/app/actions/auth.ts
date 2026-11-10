"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

export type FormState = { error?: string; ok?: string } | undefined;

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const password = z.string().min(8, "Use at least 8 characters").max(72);
const timezone = z.string().min(1).max(64).regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/).catch("UTC");

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1).max(72) }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Check your inbox and tap the confirmation link first. 📬" };
    if (error.code === "over_request_rate_limit") return { error: "Too many tries. Take a short break and try again in a few minutes." };
    return { error: "That email and password don't match. Try again?" };
  }
  redirect(safeNext(form.get("next")));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ display_name: z.string().trim().min(1, "What should we call you?").max(60), email, password, timezone })
    .safeParse({ display_name: form.get("display_name"), email: form.get("email"), password: form.get("password"), timezone: form.get("timezone") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/`,
      data: { display_name: parsed.data.display_name, timezone: parsed.data.timezone },
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "You already have an account. Sign in instead!" };
    if (error.code === "weak_password") return { error: "Pick a stronger password." };
    return { error: "Could not create your account. Try again." };
  }
  if (data.session) redirect("/");
  return { ok: "Almost there! Check your email and tap the link to start. 📬" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  return { ok: "If there's an account for that email, a reset link is on its way. 📬" };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = password.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: "Could not update the password. Request a new link." };
  redirect("/");
}
