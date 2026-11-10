# TinyWins 🌟

A colourful day planner for ADHD brains. Plan up to **5 tasks a day**, get **reminded until they're done**, and get **a celebration for every win**.

## Features

- **5 tasks a day, max.** The limit is enforced by the database (a unique slot index), so it can't be bypassed. Unfinished tasks can be moved to another day with one tap.
- **Reminders that keep going:**
  - an optional "get ready" alert before a task starts;
  - an alert when it starts;
  - then a reminder every 5–60 minutes until it's done, snoozed or moved.
  - Push notifications have **Done** and **Snooze 10 min** buttons and arrive even when the site is closed. While the site is open, reminders also show as a big banner with a chime.
- **Celebrations:** confetti and a cheerful message for every finished task, a special one for a perfect 5/5 day, and small cheers for each tiny step.
- **Low-energy days 💜:** a quick daily energy check-in. On a 😴 day TinyWins:
  - lists the easiest tasks first;
  - offers to keep only 3 and move the rest;
  - reminds half as often, with softer wording;
  - shows a "just 2 minutes" start button;
  - gives double points for tiny steps.
- **Focus mode:** shows only the current task, with its tiny steps and a colourful focus/break timer.
- **Time-blindness helpers:** a day timeline with a moving "now" marker, "starts in…" bars on each task, and a comparison of your time guesses with real focus time.
- **Tiny steps:** break a task into small checkable steps, written yourself or suggested by AI (optional).
- **Streaks, points and badges:** missing a day isn't harsh, because one rest day a week is forgiven.
- **Rewards you choose:** spend points on your own treats.
- **Installable:** add it to your phone's home screen. On iPhone this is required for notifications.

## Tech

- Next.js 16 (App Router, TypeScript) with Tailwind CSS.
- [Appwrite](https://appwrite.io) (open source): accounts, database and a scheduled function.
  - All data access runs on the server with an API key the browser never sees, and every query is scoped to the signed-in user.
  - The daily cap is a unique index on (user, day, slot 1–5), so the database itself refuses a 6th task.
  - Each reminder is recorded under a fixed id, so it can only be sent once.
- Web Push (VAPID), triggered every minute by an Appwrite scheduled function.
- Optional Claude API for step suggestions.

## Setup

1. In [Appwrite Cloud](https://cloud.appwrite.io), create a project. Copy its endpoint and project ID, and create an API key with all scopes. Under **Add platform → Web**, add your site's hostname so password-reset links can point to it.
2. Generate push keys with `npx web-push generate-vapid-keys`, and pick a random `CRON_SECRET`.
3. Copy `.env.example` to `.env.local` and fill it in. Then run `npm install` and `npm run setup:appwrite`. This creates the database, the tables with their indexes, and the every-minute reminder function. It's safe to run again.
4. Run `npm run dev`, or deploy to Vercel with the same environment variables. Run `npm run setup:appwrite` again once `SITE_URL` is the live address.

## Tests

| Command | What it checks |
|---|---|
| `npm test` | The core rules: the daily cap, reminder timing (including time zones and low-energy days), points, streaks, badges and messages |
| `npm run typecheck && npm run lint && npm run build` | Types, lint and the production build |
| `npm run test:e2e` | A browser run against a live deployment: sign-up, energy check-in and low-energy mode, the 5-task cap (also checked in the database), celebrations, the lighter day, focus mode, rewards and privacy between users. It deletes its test users afterwards |

---

&copy; MaskedOps 2026
