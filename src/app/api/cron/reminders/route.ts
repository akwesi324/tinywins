import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { dueReminders, reminderText } from "@/lib/logic.ts";
import { addDays, todayIn } from "@/lib/dates.ts";
import { pushConfigured, sendPush } from "@/lib/push";
import type { ReminderLog, Task, Step, ColorKey } from "@/lib/types.ts";

// Called every minute by Supabase (pg_cron + pg_net, see supabase/schedule-reminders.sql) with
// "Authorization: Bearer <CRON_SECRET>". Sends the reminders that are due as push notifications.
export const maxDuration = 60;

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "Push is not configured" }, { status: 503 });

  const db = createServiceClient();
  const now = Date.now();
  // Open tasks from yesterday to tomorrow (UTC) cover "today" in every time zone.
  const utcToday = todayIn("UTC", now);
  const { data: subs } = await db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
  if (!subs?.length) return NextResponse.json({ sent: 0 });
  const userIds = [...new Set(subs.map((s) => s.user_id))];

  const [{ data: tasks }, { data: profiles }, { data: logs }, { data: energy }] = await Promise.all([
    db.from("tasks").select("*").in("user_id", userIds).eq("done", false).gte("date", addDays(utcToday, -1)).lte("date", addDays(utcToday, 1)),
    db.from("profiles").select("id, timezone").in("id", userIds),
    db.from("reminder_log").select("*").in("user_id", userIds),
    db.from("energy_checkins").select("user_id, date, level").in("user_id", userIds).eq("level", "low").gte("date", addDays(utcToday, -1)),
  ]);

  const log: ReminderLog = {};
  for (const r of logs ?? []) log[r.task_id] = { prep: r.prep ? Date.parse(r.prep) : undefined, start: r.start ? Date.parse(r.start) : undefined, last: r.last ? Date.parse(r.last) : undefined };

  let sent = 0;
  for (const uid of userIds) {
    const tz = profiles?.find((p) => p.id === uid)?.timezone ?? "UTC";
    const mine: Task[] = (tasks ?? [])
      .filter((t) => t.user_id === uid)
      .map((t) => ({
        id: t.id, date: t.date, title: t.title, emoji: t.emoji, color: t.color as ColorKey, time: t.time,
        startsAt: t.starts_at ? Date.parse(t.starts_at) : null, dayStartAt: Date.parse(t.day_start_at), estimateMin: t.estimate_min,
        prepMin: t.prep_min, remindEvery: t.remind_every, steps: (t.steps ?? []) as Step[], done: t.done, doneAt: t.done_at,
        snoozedUntil: t.snoozed_until ? Date.parse(t.snoozed_until) : null, focusSeconds: t.focus_seconds, createdAt: t.created_at,
      }));
    const today = todayIn(tz, now);
    const low = (energy ?? []).some((e) => e.user_id === uid && e.date === today);
    for (const due of dueReminders(mine, log, now, today, low)) {
      // take_reminder records it atomically; false means an open tab (or a parallel run) already did
      const { data: take } = await db.rpc("take_reminder", { p_task: due.taskId, p_kind: due.kind, p_now: new Date(now).toISOString() });
      if (!take) continue;
      const task = mine.find((t) => t.id === due.taskId)!;
      const text = reminderText(task, due.kind, low);
      for (const sub of subs.filter((s) => s.user_id === uid)) {
        const result = await sendPush(sub, { ...text, taskId: task.id });
        if (result === "gone") await db.from("push_subscriptions").delete().eq("id", sub.id);
        if (result === "sent") sent += 1;
      }
    }
  }
  return NextResponse.json({ sent });
}

export const GET = run;
export const POST = run;
