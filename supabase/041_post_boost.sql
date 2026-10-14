-- Post boost: posting to the Feed doubles the coins from your next focus session.
-- A post made within the last 48 hours boosts the next focus session: the session's normal coins are (minutes / 5),
-- and the boost adds the same amount again, up to +30 coins. It can happen ONCE A DAY (Eastern time), however many
-- posts you make. Needs 039_weekly_prizes.sql applied first
-- (coin_balance below includes the weekly prizes too).

do $$ begin
  if to_regclass('public.weekly_prizes') is null then
    raise exception 'Run 039_weekly_prizes.sql first';
  end if;
end $$;

create table if not exists public.post_boosts (
  post_id uuid primary key references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid,
  minutes int not null,
  coins int not null,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  day date not null default ((now() at time zone 'America/New_York')::date)
);
create unique index if not exists post_boosts_once_a_day on public.post_boosts (user_id, day);
create index if not exists post_boosts_user on public.post_boosts (user_id, created_at desc);
alter table public.post_boosts enable row level security;
drop policy if exists "read own boosts" on public.post_boosts;
create policy "read own boosts" on public.post_boosts for select to authenticated using (auth.uid() = user_id);

-- when a focus session is saved, spend one unused recent post on it
create or replace function public.apply_post_boost()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pid uuid; bonus int;
begin
  bonus := least(30, new.minutes / 5);
  if bonus < 1 then return new; end if;
  -- once a day: already boosted today? then this session earns the normal coins
  if exists (select 1 from public.post_boosts b where b.user_id = new.user_id
             and b.day = (now() at time zone 'America/New_York')::date) then
    return new;
  end if;
  select p.id into pid from public.posts p
  where p.user_id = new.user_id
    and p.created_at > now() - interval '48 hours'
    and not exists (select 1 from public.post_boosts b where b.post_id = p.id)
  order by p.created_at
  limit 1;
  if pid is not null then
    insert into public.post_boosts (post_id, user_id, session_id, minutes, coins)
    values (pid, new.user_id, new.id, new.minutes, bonus)
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists study_sessions_post_boost on public.study_sessions;
create trigger study_sessions_post_boost after insert on public.study_sessions
  for each row execute function public.apply_post_boost();

-- for the Study page: is a boost ready right now?
create or replace function public.boost_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); ready boolean;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select exists (
    select 1 from public.posts p
    where p.user_id = me and p.created_at > now() - interval '48 hours'
      and not exists (select 1 from public.post_boosts b where b.post_id = p.id)
  ) and not exists (
    select 1 from public.post_boosts b where b.user_id = me and b.day = (now() at time zone 'America/New_York')::date
  ) into ready;
  return jsonb_build_object('ready', ready);
end $$;
grant execute on function public.boost_status() to authenticated;

-- bonuses you have not been told about yet (returns them once, then marks them told)
create or replace function public.boost_news()
returns table (coins int, minutes int)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  return query
    update public.post_boosts b set seen_at = now()
    where b.user_id = auth.uid() and b.seen_at is null
    returning b.coins, b.minutes;
end $$;
grant execute on function public.boost_news() to authenticated;

-- coins now include post boosts (and keep the weekly prizes, streaks, grants and badges)
create or replace function public.coin_balance(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  with x as (select public.user_xp(uid) as xp),
       l as (select public.level_for_xp(xp) as lvl, xp from x)
  select greatest(0,
    floor(l.xp / 5.0)::int
    + 25 * ((l.lvl * (l.lvl + 1)) / 2 - 1)
    + coalesce((select sum(coins_paid) from public.user_achievements where user_id = uid), 0)
    + coalesce((select sum(amount) from public.coin_grants where user_id = uid), 0)
    + coalesce((select sum(amount) from public.streak_claims where user_id = uid), 0)
    + coalesce((select sum(coins) from public.weekly_prizes where user_id = uid), 0)
    + coalesce((select sum(coins) from public.post_boosts where user_id = uid), 0)
    - coalesce((select sum(price_paid) from public.purchases where user_id = uid), 0)
  )::int
  from l
$$;
