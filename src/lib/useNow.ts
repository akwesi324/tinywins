"use client";

import { useSyncExternalStore } from "react";

// A shared clock that ticks every few seconds (one timer for the whole app).
let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 5000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Current time in ms, refreshed every 5 s (0 during server rendering). */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => (now || (now = Date.now())), () => 0);
}
