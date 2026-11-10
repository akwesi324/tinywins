"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppwriteException, ID } from "node-appwrite";
import { z } from "zod";
import { SESSION_COOKIE, TimeoutError, adminClient, guestAccount, sessionClient, withTimeout } from "@/lib/appwrite";
import { seedRewards, savePrefs } from "@/lib/data";
import { DEFAULT_SETTINGS } from "@/lib/types.ts";
import { siteUrl } from "@/lib/env";

export type FormState = { error?: string; ok?: string } | undefined;

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const password = z.string().min(8, "Use at least 8 characters").max(256);
const timezone = z.string().min(1).max(64).regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/).catch("UTC");

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** Creates an Appwrite session with the server key and keeps its secret in an httpOnly cookie. */
async function startSession(mail: string, pass: string) {
  const session = await adminClient().account.createEmailPasswordSession({ email: mail, password: pass });
  (await cookies()).set(SESSION_COOKIE, session.secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expire),
  });
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1).max(256) }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };
  try {
    await withTimeout(startSession(parsed.data.email, parsed.data.password));
  } catch (e) {
    if (e instanceof TimeoutError) return { error: "Signing in is taking too long. Try again in a moment." };
    if (e instanceof AppwriteException && e.code === 429) return { error: "Too many tries. Take a short break and try again in a few minutes." };
    return { error: "That email and password don't match. Try again?" };
  }
  redirect(safeNext(form.get("next")));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ display_name: z.string().trim().min(1, "What should we call you?").max(60), email, password, timezone })
    .safeParse({ display_name: form.get("display_name"), email: form.get("email"), password: form.get("password"), timezone: form.get("timezone") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;
  try {
    await withTimeout(createAccount(v));
  } catch (e) {
    if (e instanceof TimeoutError) return { error: "That's taking too long. Try signing in: your account may already be ready." };
    if (e instanceof AppwriteException && e.code === 409) return { error: "You already have an account. Sign in instead!" };
    if (e instanceof AppwriteException && e.code === 400) return { error: e.message.includes("password") ? "Pick a stronger password (not a common one)." : "Check your details and try again." };
    console.error("register failed", e);
    return { error: "Could not create your account. Try again." };
  }
  redirect("/");
}

/** Creates the user, their preferences and starter rewards, then signs them in. */
async function createAccount(v: { display_name: string; email: string; password: string; timezone: string }) {
  const user = await adminClient().users.create({ userId: ID.unique(), email: v.email, password: v.password, name: v.display_name });
  const { timezone: _tz, ...settings } = DEFAULT_SETTINGS;
  void _tz;
  await savePrefs(user.$id, { timezone: v.timezone, settings, lastCongrats: -1 });
  await seedRewards(user.$id);
  await startSession(v.email, v.password);
}

export async function signOut() {
  const jar = await cookies();
  const secret = jar.get(SESSION_COOKIE)?.value;
  if (secret) await sessionClient(secret).account.deleteSession({ sessionId: "current" }).catch(() => {});
  jar.delete(SESSION_COOKIE);
  redirect("/welcome");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  // Appwrite emails a link to /reset-password?userId=...&secret=... (same answer either way)
  await guestAccount().createRecovery({ email: parsed.data, url: `${siteUrl()}/reset-password` }).catch(() => {});
  return { ok: "If there's an account for that email, a reset link is on its way. 📬" };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ userId: z.string().min(1).max(36), secret: z.string().min(1).max(512), password })
    .safeParse({ userId: form.get("userId"), secret: form.get("secret"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues.find((i) => i.path[0] === "password")?.message ?? "That reset link isn't valid. Ask for a new one." };
  try {
    await guestAccount().updateRecovery(parsed.data);
  } catch {
    return { error: "That reset link has expired. Ask for a new one." };
  }
  return { ok: "Password changed! You can sign in now. 🎉" };
}
