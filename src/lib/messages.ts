// Celebration messages. Warm, specific, never sarcastic.

export const CONGRATS = [
  "YES! You did it! 🎉",
  "Look at you go! That's one more win. 🌟",
  "Boom! Task crushed. 💥",
  "You started, and you finished. That's the hard part! 🙌",
  "Your brain said 'later', you said 'now'. Legend. 🦸",
  "Done and dusted! ✨",
  "That's a tiny win, and tiny wins add up! 🌱",
  "High five! ✋ Future you says thanks.",
  "You showed up for yourself today. 💖",
  "Another one bites the dust! 🎸",
  "Checked off! Feel that? That's momentum. 🚀",
  "Nailed it! 🔨",
  "You turned a plan into a win. 🏆",
  "Proud of you. Seriously. 🌈",
  "Victory dance time! 💃🕺",
  "One step closer to an awesome day! ☀️",
  "Mission accomplished! 🛰️",
  "That was brave. Starting is hard, and you did it. 🦁",
  "Goal reached. Treat yourself kindly today. 🍦",
  "Brilliant! Your focus paid off. 🎯",
];

export const PERFECT_DAY = [
  "ALL FIVE DONE! 🌈 That's a perfect day. You are amazing!",
  "5 out of 5! 🏆 Take a bow, you earned it.",
  "Perfect day unlocked! 🎆 Go celebrate, you deserve it.",
];

export const STEP_CHEERS = ["Nice step! 👣", "Keep going! 💪", "Tiny step, big deal! ⭐", "Look at that progress! 📈", "On a roll! 🛼"];

/** Picks a message different from the last one shown. */
export function pickMessage(list: string[], last: number, random = Math.random): { text: string; index: number } {
  if (list.length === 1) return { text: list[0], index: 0 };
  let i = Math.floor(random() * list.length);
  if (i === last) i = (i + 1) % list.length;
  return { text: list[i], index: i };
}
