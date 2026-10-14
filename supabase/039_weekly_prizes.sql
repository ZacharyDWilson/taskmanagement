-- Weekly leaderboard prizes. The leaderboard counts focus minutes Monday to Sunday (Eastern time). When the week
-- ends, the top 3 win coins: 1st 150, 2nd 100, 3rd 50 (you need at least 30 focus minutes that week to win, and a
-- tie goes to whoever reached the total first). A scheduled job awards them early Monday morning, once per week.

create table if not exists public.weekly_prizes (
  week_start date not null,                      -- the Monday of the week that ended
  rank int not null check (rank between 1 and 3),
  user_id uuid not null references public.profiles(id) on delete cascade,
  minutes int not null,
  coins int not null,
  seen_at timestamptz,                           -- when the winner was told (the pop-up in the app)
  created_at timestamptz not null default now(),
  primary key (week_start, rank),
  unique (week_start, user_id)
);
alter table public.weekly_prizes enable row level security;
drop policy if exists "members read weekly prizes" on public.weekly_prizes;
create policy "members read weekly prizes" on public.weekly_prizes for select to authenticated using (true);

create or replace function public.award_weekly_prizes(for_week date default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  ws date;
  r record;
  i int := 0;
  prizes int[] := array[150, 100, 50];
begin
  ws := coalesce(for_week, date_trunc('week', now() at time zone 'America/New_York')::date - 7);
  for r in
    select s.user_id, sum(s.minutes)::int as mins
    from public.study_sessions s
    where (s.created_at at time zone 'America/New_York')::date >= ws
      and (s.created_at at time zone 'America/New_York')::date < ws + 7
    group by s.user_id
    having sum(s.minutes) >= 30
    order by sum(s.minutes) desc, max(s.created_at) asc
    limit 3
  loop
    i := i + 1;
    insert into public.weekly_prizes (week_start, rank, user_id, minutes, coins)
    values (ws, i, r.user_id, r.mins, prizes[i])
    on conflict do nothing;
  end loop;
  return i;
end $$;
revoke all on function public.award_weekly_prizes(date) from public, anon, authenticated;

-- last week's winners, with names, for the leaderboard card
create or replace function public.weekly_winners()
returns table (week_start date, rank int, user_id uuid, display_name text, avatar_path text, color text, frame text, minutes int, coins int)
language sql stable security definer set search_path = '' as $$
  select w.week_start, w.rank, w.user_id, p.display_name, p.avatar_path, p.color, p.frame, w.minutes, w.coins
  from public.weekly_prizes w join public.profiles p on p.id = w.user_id
  where w.week_start = (select max(week_start) from public.weekly_prizes)
  order by w.rank
$$;
grant execute on function public.weekly_winners() to authenticated;

-- prizes you have not been told about yet (returns them and marks them told)
create or replace function public.my_new_prizes()
returns table (week_start date, rank int, coins int, minutes int)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  return query
    update public.weekly_prizes w set seen_at = now()
    where w.user_id = auth.uid() and w.seen_at is null
    returning w.week_start, w.rank, w.coins, w.minutes;
end $$;
grant execute on function public.my_new_prizes() to authenticated;

-- coins now include weekly prizes
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
    - coalesce((select sum(price_paid) from public.purchases where user_id = uid), 0)
  )::int
  from l
$$;

-- every Monday at 05:15 UTC (after midnight Eastern, summer and winter time)
select cron.schedule('weekly-prizes', '15 5 * * 1', $$select public.award_weekly_prizes()$$);
