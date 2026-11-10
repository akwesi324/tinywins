-- Runs the reminder job every minute (push notifications for users who turned reminders on).
-- Run once in the Supabase SQL Editor after deploying the site, replacing the two values:
--   <SITE_URL>     e.g. https://tinywins.vercel.app
--   <CRON_SECRET>  the same random value as the CRON_SECRET environment variable on Vercel
-- (Vercel's free plan only runs cron jobs once a day, so the schedule lives in Supabase.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'tinywins-reminders';

select cron.schedule(
  'tinywins-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := '<SITE_URL>/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
