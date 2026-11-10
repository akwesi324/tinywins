-- Database tests: run by supabase/tests/run.ps1 after local-shim.sql and the migration.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create function public.t_check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'ok   %', p_label;
end $$;
create function public.t_fails(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate in ('42601', '42703', '42883', '42P01') then raise exception 'FAIL: % has a test error: %', p_label, sqlerrm; end if;
    raise notice 'ok   % (refused: %)', p_label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % was allowed', p_label;
end $$;
grant execute on function public.t_check(boolean, text), public.t_fails(text, text) to anon, authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', '{"display_name":"Ama","timezone":"Africa/Accra"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.test', '{"display_name":"Kofi","timezone":"Not/AZone"}');
select t_check((select timezone from profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'Africa/Accra', 'sign-up stores the time zone');
select t_check((select timezone from profiles where id = '00000000-0000-0000-0000-0000000000b2') = 'UTC', 'an invalid time zone falls back to UTC');
select t_check((select count(*) from rewards where user_id = '00000000-0000-0000-0000-0000000000a1') = 3, 'sign-up adds starter rewards');

-- ---------------------------------------------------------------- user A
set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
insert into tasks (date, title, day_start_at) select '2026-11-10', 'Task ' || g, '2026-11-10 08:00+00' from generate_series(1, 5) g;
select t_check((select count(*) from tasks) = 5, 'five tasks on one day');
select t_fails($$insert into tasks (date, title, day_start_at) values ('2026-11-10', 'Sixth', '2026-11-10 08:00+00')$$, 'a sixth task on the same day is refused');
insert into tasks (date, title, day_start_at) values ('2026-11-11', 'Tomorrow', '2026-11-11 08:00+00');
select t_fails($$update tasks set date = '2026-11-10' where title = 'Tomorrow'$$, 'moving a task into a full day is refused');
update tasks set done = true, done_at = now() where title = 'Task 1';
select t_check((select done from tasks where title = 'Task 1'), 'editing a task on a full day still works');
select t_fails($$insert into tasks (date, title, day_start_at, user_id) values ('2026-11-12', 'Planted', now(), '00000000-0000-0000-0000-0000000000b2')$$, 'cannot create tasks for someone else');
select t_fails($$insert into tasks (date, title, day_start_at, color) values ('2026-11-12', 'x', now(), 'black')$$, 'unknown colours refused');
select t_fails($$insert into tasks (date, title, day_start_at, time) values ('2026-11-12', 'x', now(), '25:00')$$, 'invalid times refused');

-- reminders: each fires once, nags respect the interval, done/snoozed tasks stay quiet
update tasks set time = '10:00', starts_at = '2026-11-10 10:00+00', remind_every = 15 where title = 'Task 2';
select t_check(take_reminder((select id from tasks where title = 'Task 2'), 'start', '2026-11-10 10:00+00'), 'start reminder fires');
select t_check(not take_reminder((select id from tasks where title = 'Task 2'), 'start', '2026-11-10 10:01+00'), 'start reminder fires only once');
select t_check(not take_reminder((select id from tasks where title = 'Task 2'), 'nag', '2026-11-10 10:05+00'), 'nag waits for the interval');
select t_check(take_reminder((select id from tasks where title = 'Task 2'), 'nag', '2026-11-10 10:15+00'), 'nag fires after 15 minutes');
insert into energy_checkins (date, level) values ('2026-11-10', 'low');
select t_check(not take_reminder((select id from tasks where title = 'Task 2'), 'nag', '2026-11-10 10:35+00'), 'low-energy day: nags wait 30 min, not 15');
select t_check(take_reminder((select id from tasks where title = 'Task 2'), 'nag', '2026-11-10 10:45+00'), 'low-energy day: nag after 30 min');
select t_fails($$insert into energy_checkins (date, level) values ('2026-11-10', 'ok')$$, 'one check-in per day (update it instead)');
select t_fails($$insert into energy_checkins (date, level) values ('2026-11-11', 'meh')$$, 'unknown energy levels refused');
update tasks set snoozed_until = '2026-11-10 11:00+00' where title = 'Task 2';
select t_check(not take_reminder((select id from tasks where title = 'Task 2'), 'nag', '2026-11-10 10:58+00'), 'snoozed task is quiet');
select t_check(not take_reminder((select id from tasks where title = 'Task 1'), 'nag', '2026-11-10 10:45+00'), 'finished task is quiet');
update tasks set date = '2026-11-12', day_start_at = '2026-11-12 08:00+00', time = null, starts_at = null where title = 'Task 2';
select t_check(not exists (select 1 from reminder_log where task_id = (select id from tasks where title = 'Task 2')), 'moving a task resets its reminders');

insert into push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/abc', 'key', 'auth');
select t_fails($$insert into push_subscriptions (endpoint, p256dh, auth) values ('http://insecure.example/x', 'k', 'a')$$, 'push endpoints must be https');
insert into badges (badge_id) values ('first-win');
insert into claims (title, cost) values ('Snack', 30);
insert into focus_sessions (date, minutes) values ('2026-11-10', 15);
reset role;

-- ---------------------------------------------------------------- user B sees none of it
set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
select t_check((select count(*) from tasks) = 0, 'other user sees no tasks');
select t_check((select count(*) from profiles) = 1, 'other user sees only their own profile');
select t_check((select count(*) from rewards) = 3, 'other user sees only their own rewards');
select t_check((select count(*) from push_subscriptions) + (select count(*) from badges) + (select count(*) from claims) + (select count(*) from focus_sessions) + (select count(*) from reminder_log) + (select count(*) from energy_checkins) = 0, 'other user sees none of the rest');
with u as (update tasks set done = true returning 1) select t_check(count(*) = 0, 'other user cannot change tasks') from u;
with d as (delete from tasks returning 1) select t_check(count(*) = 0, 'other user cannot delete tasks') from d;
select t_check(not take_reminder((select id from tasks limit 1), 'start', now()), 'other user cannot take reminders');
insert into tasks (date, title, day_start_at) select '2026-11-10', 'B ' || g, '2026-11-10 08:00+00' from generate_series(1, 5) g;
select t_check((select count(*) from tasks) = 5, 'the cap is per user');
reset role;

-- ---------------------------------------------------------------- anonymous
set role anon; select set_config('request.jwt.claim.sub', '', false);
select t_fails($$select * from tasks$$, 'anon cannot read tasks');
select t_fails($$select * from profiles$$, 'anon cannot read profiles');
select t_fails($$select take_reminder(gen_random_uuid(), 'start', now())$$, 'anon cannot take reminders');
reset role;

select 'ALL DATABASE TESTS PASSED' as result;
