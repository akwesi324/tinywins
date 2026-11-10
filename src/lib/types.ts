export const MAX_TASKS_PER_DAY = 5;

export const COLORS = ["rose", "orange", "amber", "lime", "emerald", "sky", "violet", "fuchsia"] as const;
export type ColorKey = (typeof COLORS)[number];

export type Step = { id: string; text: string; done: boolean };

export type Task = {
  id: string;
  date: string; // YYYY-MM-DD (local)
  title: string;
  emoji: string;
  color: ColorKey;
  time: string | null; // HH:MM start time, or null for "any time today"
  startsAt: number | null; // epoch ms of date+time in the user's time zone (set when saved)
  dayStartAt: number; // epoch ms of 08:00 that day in the user's time zone (reminders for untimed tasks start here)
  estimateMin: number | null; // how long the user thinks it will take
  prepMin: number; // "get ready" heads-up this many minutes before the start (0 = none)
  remindEvery: number; // minutes between reminders until done (0 = off)
  steps: Step[];
  done: boolean;
  doneAt: string | null; // ISO
  snoozedUntil: number | null; // epoch ms
  focusSeconds: number; // time spent in focus sessions on this task
  createdAt: string; // ISO
};

export type Reward = { id: string; title: string; emoji: string; cost: number };
export type Claim = { rewardId: string; title: string; cost: number; at: string };
export type FocusSession = { date: string; minutes: number; taskId: string | null; at: string };
export type EarnedBadge = { id: string; at: string };
export type Energy = "low" | "ok" | "high";

export type Settings = {
  timezone: string; // IANA, e.g. "Africa/Accra"
  notifications: boolean;
  sound: boolean;
  focusMin: number;
  breakMin: number;
};

/** Which reminders have already fired, so a reload never repeats them. */
export type ReminderLog = Record<string, { prep?: number; start?: number; last?: number }>;

export type State = {
  version: 1;
  tasks: Task[];
  rewards: Reward[];
  claims: Claim[];
  focusSessions: FocusSession[];
  badges: EarnedBadge[];
  energy: Record<string, Energy>; // date -> check-in
  reminders: ReminderLog;
  settings: Settings;
  lastCongrats: number;
};

export const DEFAULT_SETTINGS: Settings = { timezone: "UTC", notifications: false, sound: true, focusMin: 15, breakMin: 5 };

export const emptyState = (): State => ({
  version: 1,
  tasks: [],
  rewards: [
    { id: "r-episode", title: "Watch an episode of my show", emoji: "📺", cost: 50 },
    { id: "r-snack", title: "My favourite snack", emoji: "🍫", cost: 30 },
    { id: "r-walk", title: "A walk outside with music", emoji: "🎧", cost: 20 },
  ],
  claims: [],
  focusSessions: [],
  badges: [],
  energy: {},
  reminders: {},
  settings: { ...DEFAULT_SETTINGS },
  lastCongrats: -1,
});
