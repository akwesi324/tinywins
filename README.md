# TinyWins 🌟

A colourful day planner for ADHD brains. Plan up to **5 tasks a day**, get **reminded until they're done**, and get **a celebration for every win**.

## Features

- **5 tasks a day, max.** The limit is enforced by the database, so it can't be bypassed. Unfinished tasks can be moved to another day with one tap.
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
- Supabase: Postgres, Auth, and row level security on every table.
- Web Push (VAPID), triggered every minute by Supabase `pg_cron`.
- Optional Claude API for step suggestions.

## Setup

1. Create a Supabase project. Run `supabase/migrations/20261110120000_tinywins.sql` in the SQL Editor.
2. In **Authentication → URL Configuration**, set the Site URL and add `https://<site>/auth/callback` to the redirect URLs.
3. Generate push keys with `npx web-push generate-vapid-keys`, and pick a random `CRON_SECRET`.
4. Run locally:
   ```bash
   npm install
   cp .env.example .env.local   # fill in the values
   npm run dev
   ```
5. Deploy on Vercel with the same environment variables. Then run `supabase/schedule-reminders.sql`, with your site URL and `CRON_SECRET` filled in, to start the every-minute reminder job.

## Tests

| Command | What it checks |
|---|---|
| `npm test` | The core rules: the daily cap, reminder timing (including time zones and low-energy days), points, streaks, badges and messages |
| `powershell -File supabase/tests/run.ps1` | The database on a local PostgreSQL: cap enforcement, one-time reminders, low-energy timing, and privacy between users and anonymous visitors |
| `npm run typecheck && npm run lint && npm run build` | Types, lint and the production build |
| `npm run test:e2e` | A browser run against a live deployment (needs a test Supabase project) |

---

&copy; MaskedOps 2026
