// Celebration messages. Warm, specific, never sarcastic.

export const CONGRATS = [
  "Done. That's real progress.",
  "Nice work. One more off your plate.",
  "You started and you finished. That's the hard part.",
  "Checked off. Momentum is building.",
  "That's a win. Future you will notice.",
  "Good job following through.",
  "Done and dusted.",
  "Another one finished. Keep the streak of small wins going.",
  "You showed up for yourself today.",
  "Finished. Take a breath before the next one.",
  "Solid. That task is no longer living in your head.",
  "You beat the 'later'. Well done.",
  "Progress, not perfection, and that was progress.",
  "That took focus. Nicely done.",
  "Off the list. Enjoy that feeling for a second.",
]

export const PERFECT_DAY = [
  "All five done. That's a full day, and you finished it.",
  "Five out of five. Everything you planned, done.",
  "A complete day. Take the rest of it off your mind.",
]

export const STEP_CHEERS = ["Step done.", "Good, keep going.", "One step closer.", "Nice, that's moving.", "Progress."]

/** Picks a message different from the last one shown. */
export function pickMessage(list: string[], last: number, random = Math.random): { text: string; index: number } {
  if (list.length === 1) return { text: list[0], index: 0 };
  let i = Math.floor(random() * list.length);
  if (i === last) i = (i + 1) % list.length;
  return { text: list[i], index: i };
}
