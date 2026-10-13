-- 2.16: share cards on the feed (an achievement, or your study time) and pinned posts. Safe to re-run.
-- Run after 031_save_space.sql.
--
-- A card cannot be faked: it is made only by share_to_feed(), which looks up the achievement or adds up the study
-- minutes itself. Direct inserts that carry card data are refused.

alter table public.posts add column if not exists share_kind text check (share_kind in ('achievement', 'study_day', 'study_week'));
alter table public.posts add column if not exists share_data jsonb;
alter table public.posts add column if not exists pinned boolean not null default false;
alter table public.posts add column if not exists pinned_at timestamptz;
create index if not exists posts_pinned_idx on public.posts (pinned) where pinned;

-- editing: cards and pins are not edited like words, and a pin change by an admin is not a "caption edit"
create or replace function public.guard_post_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id or new.image_path is distinct from old.image_path
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the caption and tag of a post can be changed';
  end if;
  if new.body is not distinct from old.body and new.kind is not distinct from old.kind then
    return new;                                            -- nothing the 10-minute rule is about (for example a pin)
  end if;
  if old.share_kind is not null then
    raise exception 'A shared card cannot be edited. Delete it and share again.';
  end if;
  if now() - old.created_at > interval '10 minutes' then
    raise exception 'Posts can be edited for 10 minutes after posting';
  end if;
  new.edited_at := now();
  return new;
end $$;

-- only an admin pins; card data only comes from share_to_feed()
create or replace function public.guard_post_flags()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.pinned and not public.is_admin() then raise exception 'Only an admin can pin a post'; end if;
    if (new.share_kind is not null or new.share_data is not null)
       and coalesce(current_setting('app.sharing', true), '') <> 'on' then
      raise exception 'Cards are made with the Share button';
    end if;
  else
    if new.pinned is distinct from old.pinned and not public.is_admin() then
      raise exception 'Only an admin can pin a post';
    end if;
    if new.share_kind is distinct from old.share_kind or new.share_data is distinct from old.share_data then
      raise exception 'A shared card cannot be changed';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists posts_guard_flags on public.posts;
create trigger posts_guard_flags before insert or update on public.posts for each row execute function public.guard_post_flags();

-- share an achievement or your study time. card: 'achievement' (ref = achievement id), 'study_day' or 'study_week'
-- (since = when your day / week began, on your device; it can reach back at most 26 hours / 8 days)
create or replace function public.share_to_feed(card text, ref text default null, since timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  data jsonb;
  text_body text;
  tag text;
  mins int;
  n int;
  a record;
  pid uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;

  if card = 'achievement' then
    select ac.* into a from public.achievements ac
      join public.user_achievements ua on ua.achievement_id = ac.id and ua.user_id = me
      where ac.id = ref;
    if not found then raise exception 'You have not earned that badge yet'; end if;
    if exists (select 1 from public.posts where user_id = me and share_kind = 'achievement' and share_data ->> 'id' = a.id) then
      raise exception 'You already shared that badge';
    end if;
    data := jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon, 'tier', a.tier, 'description', a.description);
    text_body := 'Unlocked the "' || a.name || '" badge';
    tag := 'win';

  elsif card in ('study_day', 'study_week') then
    if since is null then raise exception 'Missing start time'; end if;
    if since < now() - (case when card = 'study_day' then interval '26 hours' else interval '8 days' end) then
      raise exception 'That is too far back';
    end if;
    select coalesce(sum(minutes), 0), count(*) into mins, n
      from public.study_sessions where user_id = me and created_at >= since;
    if mins < 1 then raise exception 'No study time to share yet'; end if;
    if exists (select 1 from public.posts where user_id = me and share_kind = card and created_at > now() - interval '20 hours') then
      raise exception 'You already shared that today';
    end if;
    data := jsonb_build_object('minutes', mins, 'sessions', n);
    text_body := case when card = 'study_day' then 'Studied ' else 'Studied this week: ' end
      || (mins / 60) || 'h ' || lpad((mins % 60)::text, 2, '0') || 'm'
      || case when card = 'study_day' then ' today' else '' end;
    tag := 'study';

  else
    raise exception 'Unknown card';
  end if;

  perform set_config('app.sharing', 'on', true);
  insert into public.posts (user_id, body, kind, share_kind, share_data)
  values (me, text_body, tag, card, data)
  returning id into pid;
  perform set_config('app.sharing', 'off', true);
  return pid;
end $$;
grant execute on function public.share_to_feed(text, text, timestamptz) to authenticated;

-- an admin pins (up to 3) or unpins a post
create or replace function public.admin_pin_post(pid uuid, pin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if pin and (select count(*) from public.posts where pinned and id <> pid) >= 3 then
    raise exception 'Up to 3 posts can be pinned. Unpin one first.';
  end if;
  update public.posts set pinned = pin, pinned_at = case when pin then now() else null end where id = pid;
  perform public.admin_note(case when pin then 'pinned post' else 'unpinned post' end, null, pid::text);
end $$;
grant execute on function public.admin_pin_post(uuid, boolean) to authenticated;

-- pinned posts do not expire while pinned (everything else in expire_old_posts is unchanged from 031)
create or replace function public.expire_old_posts()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  drop table if exists pg_temp._exp;
  create temp table _exp on commit drop as
    select * from (
      select p.id, p.user_id, p.image_path, p.created_at, p.pinned,
             row_number() over (partition by p.user_id, p.created_at::date order by p.created_at) as rn
      from public.posts p
    ) x
    where x.created_at::date < (now() - interval '14 days')::date
      and not x.pinned
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
