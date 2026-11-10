"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { takeReminder } from "@/app/actions/data";
import { useStore } from "@/lib/store";
import { dueReminders, isLowDay, recordReminder, reminderText } from "@/lib/logic.ts";
import type { ReminderLog } from "@/lib/types.ts";
import { COLOR, btn } from "@/lib/colors";
import { chime } from "@/components/effects";

type Banner = { taskId: string | null; title: string; body: string };

/**
 * While TinyWins is open: checks every 30 s for due reminders, shows a banner + chime, and a
 * system notification when the tab is in the background. the database guarantees
 * each reminder fires once even when the server push job runs at the same time.
 */
export default function ReminderEngine() {
  const { state, today, ready, reload, toggleDone, snooze } = useStore();
  const [banner, setBanner] = useState<Banner | null>(null);
  const log = useRef<ReminderLog>({});
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    log.current = { ...state.reminders, ...log.current };
  }, [state.reminders]);

  // service worker (push notifications + notification buttons)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "reminder") {
        setBanner({ taskId: e.data.taskId ?? null, title: e.data.title, body: e.data.body });
        if (latest.current.settings.sound) chime();
      }
      if (e.data?.type === "changed") reload();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  // the reminder loop
  useEffect(() => {
    if (!ready || !today) return;
    const check = async () => {
      const s = latest.current;
      const now = Date.now();
      const low = isLowDay(s, today);
      for (const due of dueReminders(s.tasks, log.current, now, today, low)) {
        log.current = recordReminder(log.current, due, now); // don't ask again this tick
        const res = await takeReminder(due.taskId, due.kind);
        if (!res.ok || !res.value) continue;
        const task = s.tasks.find((t) => t.id === due.taskId);
        if (!task) continue;
        const text = reminderText(task, due.kind, low);
        setBanner({ taskId: task.id, ...text });
        if (s.settings.sound) chime();
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          const reg = await navigator.serviceWorker?.ready;
          reg?.showNotification(text.title, {
            body: text.body, tag: task.id, requireInteraction: true, icon: "/icon.svg", data: { taskId: task.id },
            actions: [{ action: "done", title: "Done ✅" }, { action: "snooze", title: "Snooze 10 min" }],
          } as NotificationOptions);
        }
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [ready, today]);

  // flash the tab title while a reminder is waiting
  useEffect(() => {
    if (!banner) return;
    const original = document.title;
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? `⏰ ${banner.title}` : original;
    }, 1200);
    return () => {
      clearInterval(id);
      document.title = original;
    };
  }, [banner]);

  if (!banner) return null;
  const task = state.tasks.find((t) => t.id === banner.taskId);
  const color = COLOR[task?.color ?? "violet"];
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-40 p-3 sm:p-4">
      <div className={`mx-auto max-w-xl animate-[wiggle_.6s_ease-in-out_2] rounded-3xl bg-gradient-to-r ${color.card} p-1 shadow-2xl`}>
        <div className="rounded-[1.35rem] bg-white p-4 dark:bg-slate-900">
          <p className="text-lg font-black text-slate-900 dark:text-white">⏰ {banner.title}</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{banner.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {task && !task.done && (
              <>
                <button className={btn.primary} onClick={() => { setBanner(null); toggleDone(task.id); }}>Done ✅</button>
                <button className={btn.soft} onClick={() => { setBanner(null); snooze(task.id, 10); }}>Snooze 10 min</button>
                <Link className={btn.soft} href={`/now?task=${task.id}`} onClick={() => setBanner(null)}>Focus on it</Link>
              </>
            )}
            <button className={btn.ghost} onClick={() => setBanner(null)}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
