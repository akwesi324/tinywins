import { NextResponse, type NextRequest } from "next/server";
import { currentUser, isId } from "@/lib/appwrite";
import { getOwnTask, updateTask } from "@/lib/data";

/** Done / Snooze buttons on a reminder notification (called by the service worker with the session cookie). */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/tasks/[id]/action">) {
  const { id } = await ctx.params;
  if (!isId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const task = await getOwnTask(user.id, id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action === "done") {
    const steps = task.steps.map((s) => ({ ...s, done: true }));
    await updateTask(user.id, id, { done: true, doneAt: new Date().toISOString(), snoozedUntil: null, steps: JSON.stringify(steps) });
  } else if (body?.action === "snooze") {
    await updateTask(user.id, id, { snoozedUntil: new Date(Date.now() + 10 * 60000).toISOString() });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
