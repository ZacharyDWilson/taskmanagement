-- Levels + unlockable profile cosmetics. Run after 002_features.sql.

-- Catalog of unlockable styles (single source of truth for client and database).
create table if not exists public.cosmetics (
  id text primary key,
  kind text not null check (kind in ('frame', 'banner')),
  name text not null,
  min_level int not null
);
alter table public.cosmetics enable row level security;
create policy "members read cosmetics" on public.cosmetics
  for select to authenticated using (true);

insert into public.cosmetics (id, kind, name, min_level) values
  ('frame-none',     'frame',  'No frame',      1),
  ('frame-ring',     'frame',  'Classic ring',  1),
  ('frame-gold',     'frame',  'Gold',          3),
  ('frame-gradient', 'frame',  'Gradient',      5),
  ('frame-rainbow',  'frame',  'Rainbow',       8),
  ('frame-glow',     'frame',  'Neon glow',    12),
  ('frame-royal',    'frame',  'Royal',        16),
  ('banner-solid',   'banner', 'Solid',         1),
  ('banner-sunset',  'banner', 'Sunset',        2),
  ('banner-ocean',   'banner', 'Ocean',         4),
  ('banner-aurora',  'banner', 'Aurora',        6),
  ('banner-galaxy',  'banner', 'Galaxy',        9),
  ('banner-neon',    'banner', 'Neon grid',    12)
on conflict (id) do nothing;

alter table public.profiles
  add column if not exists frame text not null default 'frame-none' references public.cosmetics(id),
  add column if not exists banner text not null default 'banner-solid' references public.cosmetics(id);

-- XP: 1 per focus minute, 10 per finished task (max 10/day), 25 per post (max 3/day),
-- 2 per reaction received from someone else.
create or replace function public.user_xp(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  select (
    coalesce((select sum(minutes) from public.study_sessions where user_id = uid), 0)
    + 10 * coalesce((
        select sum(least(c, 10)) from (
          select count(*) c from public.tasks where user_id = uid and done group by day
        ) t), 0)
    + 25 * coalesce((
        select sum(least(c, 3)) from (
          select count(*) c from public.posts where user_id = uid group by created_at::date
        ) p), 0)
    + 2 * (
        select count(*) from public.reactions r
        join public.posts po on po.id = r.post_id
        where po.user_id = uid and r.user_id <> uid)
  )::int
$$;

-- Level n needs 50 * n * (n - 1) XP (L2 = 100, L3 = 300, L5 = 1000, L10 = 4500).
create or replace function public.level_for_xp(xp int)
returns int language sql immutable as $$
  select floor((1 + sqrt(1 + xp / 12.5)) / 2)::int
$$;

-- Stop people equipping styles above their level.
create or replace function public.check_cosmetics()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lvl int;
  need int;
begin
  if new.frame is distinct from old.frame or new.banner is distinct from old.banner then
    lvl := public.level_for_xp(public.user_xp(new.id));
    select max(min_level) into need from public.cosmetics where id in (new.frame, new.banner);
    if need > lvl then
      raise exception 'Reach level % to unlock that style', need;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_check_cosmetics on public.profiles;
create trigger profiles_check_cosmetics
  before update on public.profiles
  for each row execute function public.check_cosmetics();

-- Leaderboard now also returns each person's frame.
drop function if exists public.weekly_leaderboard(timestamptz);
create function public.weekly_leaderboard(since timestamptz)
returns table (user_id uuid, display_name text, avatar_path text, color text, frame text, minutes int)
language sql stable security invoker as $$
  select p.id, p.display_name, p.avatar_path, p.color, p.frame, sum(s.minutes)::int
  from public.study_sessions s
  join public.profiles p on p.id = s.user_id
  where s.created_at >= since
  group by p.id, p.display_name, p.avatar_path, p.color, p.frame
  order by 6 desc
  limit 20
$$;
