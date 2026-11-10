"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { btn, input, panel } from "@/lib/colors";
import { signOut } from "@/app/actions/auth";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState = "unsupported" | "off" | "on" | "blocked" | "working";

export default function SettingsView({ vapidKey }: { vapidKey: string | null }) {
  const { state, saveSettings } = useStore();
  const s = state.settings;
  const [push, setPush] = useState<PushState>("working");
  const [message, setMessage] = useState<string | null>(null);
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [s.timezone];
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) return setPush("unsupported");
      if (Notification.permission === "denied") return setPush("blocked");
      const reg = await navigator.serviceWorker.ready;
      setPush((await reg.pushManager.getSubscription()) ? "on" : "off");
    })();
  }, [vapidKey]);

  async function enablePush() {
    setMessage(null);
    setPush("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error();
      await saveSettings({ notifications: true });
      setPush("on");
      reg.showNotification("Reminders are on", { body: "TinyWins will nudge you until your tasks are done.", icon: "/icon.svg" });
    } catch {
      setPush("off");
      setMessage("Couldn't turn on reminders in this browser. Try again, or check the site's notification permission.");
    }
  }

  async function disablePush() {
    setPush("working");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    await saveSettings({ notifications: false });
    setPush("off");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>

      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reminders</h2>
        <p className="text-slate-600 dark:text-slate-300">
          Turn these on so TinyWins can remind you even when this page is closed. Each reminder has Done and Snooze buttons.
        </p>
        {push === "on" && <button className={btn.soft} onClick={disablePush}>Turn off reminders on this device</button>}
        {push === "off" && <button className={btn.primary} onClick={enablePush}>Turn on reminders</button>}
        {push === "working" && <p className="text-slate-500">One moment...</p>}
        {push === "blocked" && <p className="text-rose-600">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then come back.</p>}
        {push === "unsupported" && <p className="text-slate-500">This browser can&apos;t receive reminders while TinyWins is closed. Keep TinyWins open in a tab and you&apos;ll still get on-screen reminders.</p>}
        <p className="text-sm text-slate-500">On iPhone: tap Share → &ldquo;Add to Home Screen&rdquo;, open TinyWins from there, then turn reminders on.</p>
        {message && <p className="text-rose-600">{message}</p>}
        <label className="flex items-center gap-3 font-medium">
          <input type="checkbox" checked={s.sound} onChange={(e) => saveSettings({ sound: e.target.checked })} className="h-5 w-5 accent-indigo-600" />
          Play a chime with reminders and wins
        </label>
      </section>

      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Focus timer</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Focus minutes</span>
            <select value={s.focusMin} onChange={(e) => saveSettings({ focusMin: Number(e.target.value) })} className={input}>
              {[5, 10, 15, 20, 25, 30, 45].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Break minutes</span>
            <select value={s.breakMin} onChange={(e) => saveSettings({ breakMin: Number(e.target.value) })} className={input}>
              {[3, 5, 10, 15].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Time zone</h2>
        <p className="text-slate-600 dark:text-slate-300">Reminders use this to know when your day starts.</p>
        <select value={s.timezone} onChange={(e) => saveSettings({ timezone: e.target.value })} className={input}>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        {detected && detected !== s.timezone && <button className={btn.soft} onClick={() => saveSettings({ timezone: detected })}>Use this device&apos;s zone ({detected})</button>}
      </section>

      <form action={signOut}>
        <button className={`${btn.soft} w-full`}>Sign out</button>
      </form>
    </div>
  );
}
