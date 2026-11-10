"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components (all of the app's reads and writes go through row level security). */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
