import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Done / Snooze buttons on a reminder notification (called by the service worker with the session cookie). */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/tasks/[id]/action">) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: task } = await supabase.from("tasks").select("id, steps").eq("id", id).maybeSingle(); // RLS: own tasks only
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body?.action === "done") {
    const steps = ((task.steps ?? []) as { id: string; text: string; done: boolean }[]).map((s) => ({ ...s, done: true }));
    await supabase.from("tasks").update({ done: true, done_at: new Date().toISOString(), snoozed_until: null, steps }).eq("id", id);
  } else if (body?.action === "snooze") {
    await supabase.from("tasks").update({ snoozed_until: new Date(Date.now() + 10 * 60000).toISOString() }).eq("id", id);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
