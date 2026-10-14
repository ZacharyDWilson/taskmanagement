-- Study streak with a daily coin bonus.
-- A day counts when you focused at least 10 minutes on it (your own local date). Consecutive counting days make a streak,
-- and one missed day in any 7 is forgiven (a "grace day": it does not break the streak and does not add to it).
-- Each day you press Claim after reaching 10 minutes: 3 coins per streak day (up to 30 coins a day from day 10),
-- plus a one-off bonus when the streak hits 14 days (+75) and 30 days (+250).
-- The caller sends its own date and its UTC offset in minutes (east of UTC is positive), so an evening session in the
-- Americas does not count as "tomorrow".

create table if not exists public.streak_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  streak int not null,
  amount int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.streak_claims enable row level security;
drop policy if exists "read own streak claims" on public.streak_claims;
create policy "read own streak claims" on public.streak_claims for select to authenticated using (auth.uid() = user_id);

-- minutes of focus per local day for the last 120 days
create or replace function public.streak_minutes(uid uuid, offset_min int)
returns table (d date, mins int)
language sql stable security definer set search_path = '' as $$
  select ((created_at at time zone 'utc') + make_interval(mins => offset_min))::date as d, sum(minutes)::int as mins
  from public.study_sessions
  where user_id = uid and created_at > now() - interval '125 days'
  group by 1
$$;
revoke all on function public.streak_minutes(uuid, int) from public, anon, authenticated;

-- the current streak ending at local_day (or the day before when today has not reached 10 minutes yet)
create or replace function public.streak_length(uid uuid, local_day date, offset_min int)
returns int language plpgsql stable security definer set search_path = '' as $$
declare
  n int := 0; cur date; last_miss date := null; ok boolean; steps int := 0;
begin
  if coalesce((select mins from public.streak_minutes(uid, offset_min) where d = local_day), 0) >= 10 then cur := local_day;
  else cur := local_day - 1; end if;
  while steps < 120 loop
    steps := steps + 1;
    select coalesce((select mins from public.streak_minutes(uid, offset_min) where d = cur), 0) >= 10 into ok;
    if ok then
      n := n + 1;
    elsif n > 0 and (last_miss is null or last_miss - cur >= 7) and
          coalesce((select mins from public.streak_minutes(uid, offset_min) where d = cur - 1), 0) >= 10 then
      last_miss := cur;              -- one forgiven day, only if the streak carries on right before it
    else
      exit;
    end if;
    cur := cur - 1;
  end loop;
  return n;
end $$;
revoke all on function public.streak_length(uuid, date, int) from public, anon, authenticated;

create or replace function public.streak_status(local_day date, offset_min int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  s int; today_min int; claimed boolean; best int;
  week jsonb;
begin
  if me is null then raise exception 'Sign in first'; end if;
  s := public.streak_length(me, local_day, offset_min);
  today_min := coalesce((select mins from public.streak_minutes(me, offset_min) where d = local_day), 0);
  claimed := exists (select 1 from public.streak_claims where user_id = me and day = local_day);
  best := greatest(s, coalesce((select max(streak) from public.streak_claims where user_id = me), 0));
  select jsonb_agg(jsonb_build_object('day', g::date, 'mins', coalesce(m.mins, 0), 'done', coalesce(m.mins, 0) >= 10) order by g)
    into week
  from generate_series(local_day - 6, local_day, interval '1 day') g
  left join public.streak_minutes(me, offset_min) m on m.d = g::date;
  return jsonb_build_object('streak', s, 'best', best, 'today_minutes', today_min, 'today_done', today_min >= 10,
                            'claimed_today', claimed, 'week', coalesce(week, '[]'::jsonb));
end $$;
grant execute on function public.streak_status(date, int) to authenticated;

create or replace function public.claim_streak_bonus(local_day date, offset_min int default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  s int; amt int; extra int := 0;
begin
  if me is null then raise exception 'Sign in first'; end if;
  -- the claimed day must be today where the caller is (UTC date, give or take a day)
  if local_day < (now() at time zone 'utc')::date - 1 or local_day > (now() at time zone 'utc')::date + 1 then
    raise exception 'That day can not be claimed';
  end if;
  if coalesce((select mins from public.streak_minutes(me, offset_min) where d = local_day), 0) < 10 then
    raise exception 'Focus for 10 minutes first';
  end if;
  if exists (select 1 from public.streak_claims where user_id = me and day = local_day) then
    raise exception 'Already claimed today';
  end if;
  s := public.streak_length(me, local_day, offset_min);
  if s = 14 then extra := 75; elsif s = 30 then extra := 250; end if;
  amt := least(s, 10) * 3 + extra;
  insert into public.streak_claims (user_id, day, streak, amount) values (me, local_day, s, amt);
  return jsonb_build_object('streak', s, 'amount', amt, 'milestone', extra);
end $$;
grant execute on function public.claim_streak_bonus(date, int) to authenticated;

-- coins now include claimed streak bonuses
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
    - coalesce((select sum(price_paid) from public.purchases where user_id = uid), 0)
  )::int
  from l
$$;
