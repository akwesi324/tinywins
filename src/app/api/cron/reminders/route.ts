import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Query, type Models } from "node-appwrite";
import { DB, T, adminClient, readPrefs } from "@/lib/appwrite";
import { rowToTask, takeReminder, toLog } from "@/lib/data";
import { dueReminders, reminderText } from "@/lib/logic.ts";
import { addDays, todayIn } from "@/lib/dates.ts";
import { pushConfigured, sendPush } from "@/lib/push";

// Called every minute by the Appwrite scheduled function (appwrite/reminder-trigger) with
// "Authorization: Bearer <CRON_SECRET>". Sends the reminders that are due as push notifications.
export const maxDuration = 60;

type Row = Models.DefaultRow & Record<string, unknown>;

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

  const { tables, users } = adminClient();
  const now = Date.now();
  const utcToday = todayIn("UTC", now);
  const subs = (await tables.listRows<Row>({ databaseId: DB, tableId: T.push, queries: [Query.limit(5000)] })).rows;
  if (!subs.length) return NextResponse.json({ sent: 0 });
  const userIds = [...new Set(subs.map((s) => String(s.userId)))];

  let sent = 0;
  for (const uid of userIds) {
    // Open tasks from yesterday to tomorrow (UTC) cover "today" in every time zone.
    const [tasks, energy, logs, user] = await Promise.all([
      tables.listRows<Row>({ databaseId: DB, tableId: T.tasks, queries: [Query.equal("userId", uid), Query.equal("done", false), Query.between("date", addDays(utcToday, -1), addDays(utcToday, 1)), Query.limit(20)] }),
      tables.listRows<Row>({ databaseId: DB, tableId: T.energy, queries: [Query.equal("userId", uid), Query.equal("level", "low"), Query.greaterThanEqual("date", addDays(utcToday, -1)), Query.limit(5)] }),
      tables.listRows<Row>({ databaseId: DB, tableId: T.reminders, queries: [Query.equal("userId", uid), Query.greaterThan("$createdAt", new Date(now - 2 * 86400_000).toISOString()), Query.limit(500)] }),
      users.get({ userId: uid }).catch(() => null),
    ]);
    if (!user) continue;
    const tz = readPrefs(user.prefs as Record<string, unknown>).timezone;
    const today = todayIn(tz, now);
    const low = energy.rows.some((e) => e.date === today);
    const mine = tasks.rows.map(rowToTask);
    for (const due of dueReminders(mine, toLog(logs.rows), now, today, low)) {
      const task = mine.find((t) => t.id === due.taskId)!;
      // false means an open tab (or a parallel run) already showed this reminder
      if (!(await takeReminder(uid, task, due.kind, now, low))) continue;
      const text = reminderText(task, due.kind, low);
      for (const sub of subs.filter((s) => s.userId === uid)) {
        const result = await sendPush({ endpoint: String(sub.endpoint), p256dh: String(sub.p256dh), auth: String(sub.auth) }, { ...text, taskId: task.id });
        if (result === "gone") await tables.deleteRow({ databaseId: DB, tableId: T.push, rowId: sub.$id });
        if (result === "sent") sent += 1;
      }
    }
  }
  return NextResponse.json({ sent });
}

export const GET = run;
export const POST = run;
