// TinyWins service worker: shows reminder notifications (also when the app is closed) and
// handles their Done / Snooze buttons.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function tellClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of clients) c.postMessage(message);
  return clients;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "TinyWins", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      await tellClients({ type: "reminder", ...data });
      await self.registration.showNotification(data.title || "TinyWins reminder", {
        body: data.body || "",
        tag: data.taskId || "tinywins",
        renotify: true,
        requireInteraction: true,
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: { taskId: data.taskId || null },
        actions: data.taskId
          ? [
              { action: "done", title: "Done ✅" },
              { action: "snooze", title: "Snooze 10 min" },
            ]
          : [],
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  const taskId = event.notification.data && event.notification.data.taskId;
  event.notification.close();
  event.waitUntil(
    (async () => {
      if (taskId && (event.action === "done" || event.action === "snooze")) {
        // Same-origin request: the browser sends the signed-in session cookie.
        await fetch(`/api/tasks/${taskId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: event.action }),
          credentials: "same-origin",
        }).catch(() => {});
        await tellClients({ type: "changed", taskId, action: event.action });
        return;
      }
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const url = taskId ? `/now?task=${taskId}` : "/";
      for (const c of clients) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
