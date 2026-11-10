import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { Account, Client, TablesDB, Users } from "node-appwrite";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/types.ts";

// All Appwrite access happens on the server. The browser never gets the API key; it only holds an
// httpOnly session cookie. Every data function is scoped to the signed-in user's id.

export const SESSION_COOKIE = "tw_session";
export const DB = "tinywins";
export const T = {
  tasks: "tasks",
  reminders: "reminders",
  rewards: "rewards",
  claims: "claims",
  focus: "focus_sessions",
  badges: "badges",
  energy: "energy",
  push: "push_subscriptions",
  ai: "ai_requests",
} as const;

function config() {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !key) throw new Error("Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY (see .env.example).");
  return { endpoint, project, key };
}

/** Full access with the API key: only for server code that has already identified the user. */
export function adminClient() {
  const { endpoint, project, key } = config();
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  return { client, tables: new TablesDB(client), users: new Users(client), account: new Account(client) };
}

/** No key and no session: for guest operations such as password recovery. */
export function guestAccount() {
  const { endpoint, project } = config();
  return new Account(new Client().setEndpoint(endpoint).setProject(project));
}

/** Acts as the user who owns the session secret. */
export function sessionClient(secret: string) {
  const { endpoint, project } = config();
  const client = new Client().setEndpoint(endpoint).setProject(project).setSession(secret);
  return { client, account: new Account(client) };
}

export type Prefs = { timezone: string; settings: Omit<Settings, "timezone">; lastCongrats: number };

export function readPrefs(raw: Record<string, unknown> | undefined): Prefs {
  const p = raw ?? {};
  const { timezone: _tz, ...defaults } = DEFAULT_SETTINGS;
  void _tz;
  return {
    timezone: typeof p.timezone === "string" && p.timezone ? p.timezone : "UTC",
    settings: { ...defaults, ...(typeof p.settings === "object" && p.settings ? (p.settings as object) : {}) },
    lastCongrats: typeof p.lastCongrats === "number" ? p.lastCongrats : -1,
  };
}

export type SessionUser = { id: string; email: string; name: string; prefs: Prefs };

/** The signed-in user, verified with Appwrite (cached per request). */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return null;
  try {
    const me = await sessionClient(secret).account.get();
    return { id: me.$id, email: me.email, name: me.name, prefs: readPrefs(me.prefs as Record<string, unknown>) };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/** Appwrite ids: 20 lowercase letters/digits (we create them so writes can be optimistic). */
export const isId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{20}$/.test(v);

export class TimeoutError extends Error {}

/** Gives up waiting after `ms` (Appwrite occasionally stalls; the user then sees a clear message). */
export function withTimeout<T>(work: Promise<T>, ms = 20000): Promise<T> {
  return Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new TimeoutError("TIMEOUT")), ms))]);
}
