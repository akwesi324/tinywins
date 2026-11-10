-- TinyWins schema. Every row belongs to one user and only that user can see or change it.
-- The 5-tasks-a-day cap is enforced here (not just in the app), and reminders are recorded
-- atomically so the server push and an open tab never both fire the same reminder.

-- -------------------------------------------------------------------- tables
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  settings jsonb not null default '{"sound": true, "focusMin": 15, "breakMin": 5}'::jsonb,
  last_congrats int not null default -1,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  title text not null check (char_length(title) between 1 and 120),
  emoji text not null default '⭐' check (char_length(emoji) <= 16),
  color text not null default 'sky' check (color in ('rose', 'orange', 'amber', 'lime', 'emerald', 'sky', 'violet', 'fuchsia')),
  time text check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  starts_at timestamptz,
  day_start_at timestamptz not null,
  estimate_min int check (estimate_min between 1 and 600),
  prep_min int not null default 0 check (prep_min between 0 and 180),
  remind_every int not null default 15 check (remind_every between 0 and 240),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 12),
  done boolean not null default false,
  done_at timestamptz,
  snoozed_until timestamptz,
  focus_seconds int not null default 0 check (focus_seconds between 0 and 86400),
  created_at timestamptz not null default now(),
  check ((time is null) = (starts_at is null))
);
create index if not exists tasks_user_date_idx on public.tasks (user_id, date);
create index if not exists tasks_open_idx on public.tasks (date) where not done;

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  emoji text not null default '🎁' check (char_length(emoji) <= 16),
  cost int not null check (cost between 1 and 10000),
  created_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  reward_id uuid references public.rewards on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  cost int not null check (cost between 1 and 10000),
  at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid references public.tasks on delete set null,
  date date not null,
  minutes int not null check (minutes between 1 and 120),
  at timestamptz not null default now()
);

create table if not exists public.badges (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  badge_id text not null check (char_length(badge_id) <= 40),
  at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.reminder_log (
  task_id uuid primary key references public.tasks on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  prep timestamptz,
  start timestamptz,
  last timestamptz
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);

-- one energy check-in per day; "low" turns on the gentler low-energy mode for that day
create table if not exists public.energy_checkins (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  level text not null check (level in ('low', 'ok', 'high')),
  at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  at timestamptz not null default now()
);

-- -------------------------------------------------------------------- 5 tasks a day
create or replace function public.enforce_daily_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.date = old.date and new.user_id = old.user_id then
    return new;
  end if;
  -- serialize concurrent inserts for the same user and day
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || new.date::text));
  if (select count(*) from public.tasks where user_id = new.user_id and date = new.date and id <> new.id) >= 5 then
    raise exception 'TinyWins keeps each day to 5 tasks. Finish or move one first.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists tasks_daily_cap on public.tasks;
create trigger tasks_daily_cap before insert or update of date, user_id on public.tasks for each row execute function public.enforce_daily_cap();

-- moving a task to another day resets its reminders
create or replace function public.reset_reminders_on_move() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.date <> old.date or new.starts_at is distinct from old.starts_at then
    delete from public.reminder_log where task_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists tasks_reset_reminders on public.tasks;
create trigger tasks_reset_reminders after update on public.tasks for each row execute function public.reset_reminders_on_move();

-- -------------------------------------------------------------------- reminders
-- Records that a reminder fired, only if it is still due (atomic). Returns true if the caller
-- should show it. Used by the server push job (service role) and by the open app (own tasks).
create or replace function public.take_reminder(p_task uuid, p_kind text, p_now timestamptz default now())
returns boolean language plpgsql set search_path = public as $$
declare
  t public.tasks;
  r public.reminder_log;
  v_gap int;
begin
  select * into t from public.tasks where id = p_task; -- RLS applies to app callers
  if t.id is null or t.done or (t.snoozed_until is not null and t.snoozed_until > p_now) then
    return false;
  end if;
  insert into public.reminder_log (task_id, user_id) values (t.id, t.user_id) on conflict (task_id) do nothing;
  select * into r from public.reminder_log where task_id = t.id for update;
  if p_kind = 'prep' then
    if r.prep is not null then return false; end if;
    update public.reminder_log set prep = p_now, last = p_now where task_id = t.id;
  elsif p_kind = 'start' then
    if r.start is not null then return false; end if;
    update public.reminder_log set start = p_now, last = p_now where task_id = t.id;
  elsif p_kind = 'nag' then
    -- low-energy day: half as often, at most every 30 minutes
    v_gap := case when exists (select 1 from public.energy_checkins e where e.user_id = t.user_id and e.date = t.date and e.level = 'low')
                  then greatest(t.remind_every * 2, 30) else greatest(t.remind_every, 1) end;
    if r.last is not null and p_now - r.last < make_interval(mins => v_gap) - interval '20 seconds' then
      return false;
    end if;
    update public.reminder_log set last = p_now where task_id = t.id;
  else
    return false;
  end if;
  return true;
end $$;

-- -------------------------------------------------------------------- sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tz text := coalesce(nullif(new.raw_user_meta_data->>'timezone', ''), 'UTC');
begin
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  insert into public.profiles (id, display_name, timezone)
  values (new.id, left(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 60), v_tz)
  on conflict (id) do nothing;
  insert into public.rewards (user_id, title, emoji, cost) values
    (new.id, 'Watch an episode of my show', '📺', 50),
    (new.id, 'My favourite snack', '🍫', 30),
    (new.id, 'A walk outside with music', '🎧', 20);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.rewards enable row level security;
alter table public.claims enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.badges enable row level security;
alter table public.reminder_log enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.ai_requests enable row level security;
alter table public.energy_checkins enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'rewards', 'claims', 'focus_sessions', 'badges', 'push_subscriptions', 'energy_checkins'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own reminders" on public.reminder_log;
create policy "own reminders" on public.reminder_log for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own ai requests" on public.ai_requests;
create policy "own ai requests" on public.ai_requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "log ai requests" on public.ai_requests;
create policy "log ai requests" on public.ai_requests for insert to authenticated with check (user_id = auth.uid());

-- nothing for anonymous visitors
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.take_reminder(uuid, text, timestamptz) to authenticated, service_role;
