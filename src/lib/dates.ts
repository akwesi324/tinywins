// Local-time date helpers (tasks belong to the user's own calendar day, not UTC).

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Epoch ms of HH:MM on the given day (local time). */
export function atTime(key: string, hhmm: string): number {
  const d = parseDateKey(key);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function minutesBetween(from: number, to: number): number {
  return Math.round((to - from) / 60000);
}

/** "in 25 min", "in 1 h 10 min", "20 min ago" */
export function relative(mins: number): string {
  const abs = Math.abs(mins);
  const text = abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}`;
  if (abs === 0) return "now";
  return mins > 0 ? `in ${text}` : `${text} ago`;
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function prettyDay(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === addDays(todayKey, 1)) return "Tomorrow";
  if (key === addDays(todayKey, -1)) return "Yesterday";
  return parseDateKey(key).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

// ------------------------------------------------------------------ time zones (server + client)

/** The user's calendar day (YYYY-MM-DD) in their IANA time zone. */
export function todayIn(timeZone: string, now: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function offsetMs(timeZone: string, at: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** Epoch ms of HH:MM on a calendar day in the given time zone. */
export function zonedTime(key: string, hhmm: string, timeZone: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetMs(timeZone, guess);
  const second = guess - offsetMs(timeZone, t); // correct across a DST change
  if (second !== t) t = second;
  return t;
}

/** Fills startsAt / dayStartAt for a task from its date and time in the user's zone. */
export function scheduleFields(date: string, time: string | null, timeZone: string) {
  return { startsAt: time ? zonedTime(date, time, timeZone) : null, dayStartAt: zonedTime(date, "08:00", timeZone) };
}
