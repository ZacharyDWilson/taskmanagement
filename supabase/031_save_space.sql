-- 2.15: keep the free plan small, and richer posts. Safe to re-run. Run after 030_banner_checker.sql.
--
--  * posts: photo optional, a tag, caption editing for 10 minutes, a daily cap, and they expire after 14 days
--  * tasks: finished ones go after 14 days, unfinished ones after 21 (counted from the latest of created / planned / due)
--  * nothing a person has EARNED goes down: XP, coins and achievement progress that came from expired posts, comments,
--    reactions and old study rows are copied into user_archive first
--  * old study rows and XP rows (older than 90 days) are merged into one row per day; totals stay exact
--  * old reports, announcements and admin log lines are tidied
--  * a nightly job does it all, and the cleanup-files edge function deletes the photo FILES (deleting a row alone
--    can leave the file sitting in storage, still counting against the free limit)

-- 1) posts ------------------------------------------------------------------------------------------------------------
alter table public.posts add column if not exists kind text check (kind in ('study', 'done', 'question', 'win', 'motivation'));
alter table public.posts add column if not exists edited_at timestamptz;

-- a post needs a photo or some words (older posts all have a photo, so they are not re-checked)
alter table public.posts drop constraint if exists posts_has_content;
alter table public.posts add constraint posts_has_content
  check (image_path is not null or char_length(btrim(body)) > 0) not valid;

drop policy if exists "members edit own posts" on public.posts;
create policy "members edit own posts" on public.posts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- only the words and the tag can change, and only for 10 minutes
create or replace function public.guard_post_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id or new.image_path is distinct from old.image_path
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the caption and tag of a post can be changed';
  end if;
  if now() - old.created_at > interval '10 minutes' then
    raise exception 'Posts can be edited for 10 minutes after posting';
  end if;
  if new.body is distinct from old.body or new.kind is distinct from old.kind then new.edited_at := now(); end if;
  return new;
end $$;
drop trigger if exists posts_guard_edit on public.posts;
create trigger posts_guard_edit before update on public.posts for each row execute function public.guard_post_edit();

-- at most 10 posts a day each (text-only posts are easy to flood)
create or replace function public.cap_daily_posts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.posts where user_id = new.user_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'That is 10 posts in a day. Come back tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists posts_cap_daily on public.posts;
create trigger posts_cap_daily before insert on public.posts for each row execute function public.cap_daily_posts();

-- 2) what a person has earned from things that later expire ---------------------------------------------------------------
create table if not exists public.user_archive (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  posts int not null default 0,            -- posts that expired
  post_xp int not null default 0,          -- the XP those posts were worth (25 each, 3 a day)
  reactions int not null default 0,        -- reactions received on posts that expired (2 XP each)
  comments int not null default 0,         -- comments written that went away with an expired post
  sessions int not null default 0,         -- study sessions merged into daily rows
  longest_session int not null default 0   -- the longest single session among them
);
alter table public.user_archive enable row level security;   -- no policies: only the functions can read or write it

alter table public.xp_log add column if not exists tasks int not null default 1;   -- how many finished tasks a row stands for

-- XP now includes what was archived
create or replace function public.user_xp(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  select (
    coalesce((select sum(minutes) from public.study_sessions where user_id = uid), 0)
    + coalesce((select sum(amount) from public.xp_log where user_id = uid), 0)
    + 25 * coalesce((
        select sum(least(c, 3)) from (
          select count(*) c from public.posts where user_id = uid group by created_at::date
        ) p), 0)
    + 2 * (
        select count(*) from public.reactions r
        join public.posts po on po.id = r.post_id
        where po.user_id = uid and r.user_id <> uid)
    + coalesce((select post_xp + 2 * reactions from public.user_archive where user_id = uid), 0)
  )::int
$$;

create or replace function public.my_achievement_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  streak int;
  best_week int;
  a public.user_archive;
begin
  if me is null then return '{}'::jsonb; end if;
  select * into a from public.user_archive where user_id = me;

  select coalesce(max(n), 0) into streak from (
    select count(*) as n from (
      select d, d - (row_number() over (order by d))::int as grp
      from (select distinct created_at::date as d from public.study_sessions where user_id = me) days
    ) runs group by grp
  ) r;

  select coalesce(max(m), 0) into best_week from (
    select sum(minutes) as m from public.study_sessions where user_id = me group by date_trunc('week', created_at)
  ) w;

  return jsonb_build_object(
    'tasks_done',         (select coalesce(sum(tasks), 0) from public.xp_log where user_id = me),
    'sessions',           (select count(*) from public.study_sessions where user_id = me) + coalesce(a.sessions, 0),
    'focus_minutes',      (select coalesce(sum(minutes), 0) from public.study_sessions where user_id = me),
    -- rows older than 90 days may be merged days, so only newer rows count as single sessions; the archive keeps the rest
    'longest_session',    greatest(
                            (select coalesce(max(minutes), 0) from public.study_sessions
                              where user_id = me and created_at::date >= (now() - interval '90 days')::date),
                            coalesce(a.longest_session, 0)),
    'streak_days',        streak,
    'weekly_minutes_best', best_week,
    'posts',              (select count(*) from public.posts where user_id = me) + coalesce(a.posts, 0),
    'comments',           (select count(*) from public.comments where user_id = me) + coalesce(a.comments, 0),
    'reactions_received', (select count(*) from public.reactions r join public.posts p on p.id = r.post_id
                            where p.user_id = me and r.user_id <> me) + coalesce(a.reactions, 0),
    'level',              public.level_for_xp(public.user_xp(me)),
    'purchases',          (select count(*) from public.purchases where user_id = me and price_paid > 0),
    'profile_complete',   (select case when coalesce(bio, '') <> '' and avatar_path is not null then 1 else 0 end
                            from public.profiles where id = me)
  );
end $$;
grant execute on function public.my_achievement_stats() to authenticated;

-- 3) post expiry (14 days) -----------------------------------------------------------------------------------------------
-- photo files waiting to be removed from storage by the cleanup-files edge function
create table if not exists public.file_trash (
  path text primary key,
  queued_at timestamptz not null default now()
);
alter table public.file_trash enable row level security;      -- no policies: only the server side reads it

-- whole days at a time, so the "3 posts a day" XP rule archives exactly. Posts with an open report stay until it is resolved.
create or replace function public.expire_old_posts()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  drop table if exists pg_temp._exp;
  create temp table _exp on commit drop as
    select * from (
      select p.id, p.user_id, p.image_path, p.created_at,
             row_number() over (partition by p.user_id, p.created_at::date order by p.created_at) as rn
      from public.posts p
    ) x
    where x.created_at::date < (now() - interval '14 days')::date
      and not exists (select 1 from public.reports r where r.post_id = x.id and r.status = 'open');

  insert into public.user_archive (user_id, posts, post_xp, reactions)
  select e.user_id, count(*)::int, (25 * count(*) filter (where e.rn <= 3))::int, coalesce(sum(rc.n), 0)::int
  from _exp e
  left join lateral (
    select count(*) as n from public.reactions r where r.post_id = e.id and r.user_id <> e.user_id
  ) rc on true
  group by e.user_id
  on conflict (user_id) do update set
    posts = public.user_archive.posts + excluded.posts,
    post_xp = public.user_archive.post_xp + excluded.post_xp,
    reactions = public.user_archive.reactions + excluded.reactions;

  insert into public.user_archive (user_id, comments)
  select c.user_id, count(*)::int from public.comments c join _exp e on e.id = c.post_id group by c.user_id
  on conflict (user_id) do update set comments = public.user_archive.comments + excluded.comments;

  -- the photo and its small copy (photo.jpg and photo.t.jpg)
  insert into public.file_trash (path)
  select image_path from _exp where image_path is not null
  union
  select regexp_replace(image_path, '[.]jpg$', '.t.jpg') from _exp where image_path ~ '[.]jpg$'
  on conflict do nothing;

  delete from public.posts where id in (select id from _exp);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expire_old_posts() from public, anon, authenticated;

-- 4) photo files nothing points to any more (a picture chosen then never saved, an old profile picture, ...) -----------
create or replace function public.storage_orphans()
returns setof text language sql security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'uploads'
    and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.posts p
                    where p.image_path = o.name or regexp_replace(p.image_path, '[.]jpg$', '.t.jpg') = o.name)
    and not exists (select 1 from public.profiles pr where pr.avatar_path = o.name)
  limit 300
$$;
revoke all on function public.storage_orphans() from public, anon, authenticated;
grant execute on function public.storage_orphans() to service_role;

-- 5) tasks: finished after 14 days, unfinished after 21 --------------------------------------------------------------------
-- an unfinished task's 21 days run from the latest of: created, the day it is planned for, its due date.
-- Every task that exists now starts a fresh clock, so nobody loses one overnight.
alter table public.tasks add column if not exists expire_from timestamptz not null default now();

create or replace function public.set_task_done_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.done then
    if tg_op = 'INSERT' or old.done is distinct from true or new.done_at is null then
      new.done_at := now();
    end if;
  else
    new.done_at := null;                                   -- marked "not done" again: the clock resets
    if tg_op = 'UPDATE' and old.done then new.expire_from := now(); end if;
  end if;
  return new;
end $$;

create or replace function public.purge_old_done_tasks()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.tasks
  where (done and done_at is not null and done_at < now() - interval '14 days')
     or (not done and greatest(expire_from, day::timestamptz, due_date::timestamptz) < now() - interval '21 days');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_old_done_tasks() from public, anon, authenticated;

create or replace function public.purge_my_done_tasks()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then return 0; end if;
  delete from public.tasks
  where user_id = auth.uid()
    and ((done and done_at is not null and done_at < now() - interval '14 days')
      or (not done and greatest(expire_from, day::timestamptz, due_date::timestamptz) < now() - interval '21 days'));
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.purge_my_done_tasks() to authenticated;

-- 6) merge old rows (older than 90 days) into one row a day. Totals, streaks and weekly bests do not change. ------------
create or replace function public.rollup_old_sessions()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; k int; i int; left_m int; total int := 0;
begin
  for r in
    select user_id, created_at::date as d, sum(minutes)::int as m, count(*)::int as c,
           max(minutes)::int as mx, min(created_at) as first_at
    from public.study_sessions
    where created_at::date < (now() - interval '90 days')::date
    group by user_id, created_at::date
    having count(*) > ceil(sum(minutes) / 240.0)
  loop
    k := ceil(r.m / 240.0)::int;
    insert into public.user_archive (user_id, sessions, longest_session) values (r.user_id, r.c - k, r.mx)
    on conflict (user_id) do update set
      sessions = public.user_archive.sessions + (r.c - k),
      longest_session = greatest(public.user_archive.longest_session, r.mx);
    delete from public.study_sessions where user_id = r.user_id and created_at::date = r.d;
    left_m := r.m;
    for i in 0 .. k - 1 loop
      insert into public.study_sessions (user_id, minutes, created_at)
      values (r.user_id, least(240, left_m), r.first_at + make_interval(secs => i));
      left_m := left_m - 240;
    end loop;
    total := total + (r.c - k);
  end loop;
  return total;
end $$;
revoke all on function public.rollup_old_sessions() from public, anon, authenticated;

create or replace function public.rollup_old_xp_log()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; total int := 0;
begin
  for r in
    select user_id, earned_on, sum(amount)::int as a, sum(tasks)::int as t, count(*)::int as c
    from public.xp_log
    where task_id is null and earned_on < current_date - 90
    group by user_id, earned_on
    having count(*) > 1
  loop
    delete from public.xp_log where user_id = r.user_id and earned_on = r.earned_on and task_id is null;
    insert into public.xp_log (user_id, amount, earned_on, tasks) values (r.user_id, r.a, r.earned_on, r.t);
    total := total + r.c - 1;
  end loop;
  return total;
end $$;
revoke all on function public.rollup_old_xp_log() from public, anon, authenticated;

-- 7) the nightly job -------------------------------------------------------------------------------------------------------
create or replace function public.nightly_cleanup()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare out jsonb;
begin
  out := jsonb_build_object(
    'tasks',         public.purge_old_done_tasks(),
    'posts',         public.expire_old_posts(),
    'sessions',      public.rollup_old_sessions(),
    'xp_rows',       public.rollup_old_xp_log());
  delete from public.reports where status = 'resolved' and created_at < now() - interval '60 days';
  delete from public.announcements where expires_at is not null and expires_at < now() - interval '30 days';
  delete from public.admin_log where created_at < now() - interval '180 days';
  delete from public.study_queue where joined_at < now() - interval '1 day';
  return out;
end $$;
revoke all on function public.nightly_cleanup() from public, anon, authenticated;
grant execute on function public.nightly_cleanup() to service_role;

do $$
begin
  create extension if not exists pg_cron;
  begin perform cron.unschedule('purge-done-tasks'); exception when others then null; end;
  perform cron.schedule('nightly-cleanup', '15 4 * * *', 'select public.nightly_cleanup()');
exception when others then
  raise notice 'pg_cron is not available here (%). The cleanup-files function runs the same cleanup when the app is used.', sqlerrm;
end $$;
