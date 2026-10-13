-- Achievements: goals that give a badge on your profile plus a reward (coins, and a few cosmetics that can ONLY be earned).
-- Safe to re-run. Run after 024_more_banners_crowds.sql.
--
-- How it works
--   * `achievements` is the catalogue (what to do, the badge, the reward).
--   * `user_achievements` records who earned what. Nobody can write to it directly; check_achievements() grants them.
--   * Everything is counted from data that already exists (study sessions, the XP ledger, posts, reactions...),
--     so it cannot be faked from the browser.
--   * Coin rewards are added into coin_balance(). Cosmetic rewards are recorded as a free "purchase" of an item that is
--     marked `exclusive`, which the Shop hides and buy_item() refuses to sell.

-- 1) exclusive items -----------------------------------------------------------------------------------------------
alter table public.shop_items add column if not exists exclusive boolean not null default false;

create or replace function public.buy_item(item text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cost int;
  locked boolean;
  bal int;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select price, exclusive into cost, locked from public.shop_items where id = item;
  if cost is null then raise exception 'That item is not in the shop'; end if;
  if locked then raise exception 'That one can only be earned with an achievement'; end if;
  if exists (select 1 from public.purchases where user_id = me and item_id = item) then
    raise exception 'You already own that';
  end if;
  bal := public.coin_balance(me);
  if bal < cost then
    raise exception 'Not enough coins: you have %, it costs %', bal, cost;
  end if;
  insert into public.purchases (user_id, item_id, price_paid) values (me, item, cost);
  return bal - cost;
end $$;

create or replace function public.choose_starter_theme(item text)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  if (select starter_chosen from public.profiles where id = me) then
    raise exception 'You already picked your starter theme';
  end if;
  if not exists (select 1 from public.shop_items where id = item and kind = 'theme' and not exclusive) then
    raise exception 'That theme is not available';
  end if;
  insert into public.purchases (user_id, item_id, price_paid) values (me, item, 0)
  on conflict do nothing;
  update public.profiles set starter_chosen = true, theme = item where id = me;
end $$;

-- 2) the catalogue and who earned what ----------------------------------------------------------------------------
create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  tier text not null check (tier in ('bronze', 'silver', 'gold')),
  stat text not null,
  goal int not null check (goal > 0),
  reward_coins int not null default 0 check (reward_coins >= 0),
  reward_item text references public.shop_items(id),
  sort int not null default 0
);
alter table public.achievements enable row level security;
drop policy if exists "members read achievements" on public.achievements;
create policy "members read achievements" on public.achievements for select to authenticated using (true);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  coins_paid int not null default 0,
  pinned boolean not null default false,
  primary key (user_id, achievement_id)
);
create index if not exists user_achievements_user on public.user_achievements (user_id);
alter table public.user_achievements enable row level security;
-- badges are public on profiles; writing happens only through the functions below
drop policy if exists "members read earned achievements" on public.user_achievements;
create policy "members read earned achievements" on public.user_achievements for select to authenticated using (true);

-- 3) coins: achievement coins count towards your balance ------------------------------------------------------------
create or replace function public.coin_balance(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  with x as (select public.user_xp(uid) as xp),
       l as (select public.level_for_xp(xp) as lvl, xp from x)
  select greatest(0,
    floor(l.xp / 5.0)::int
    + 25 * ((l.lvl * (l.lvl + 1)) / 2 - 1)
    + coalesce((select sum(coins_paid) from public.user_achievements where user_id = uid), 0)
    - coalesce((select sum(price_paid) from public.purchases where user_id = uid), 0)
  )::int
  from l
$$;

-- 4) progress: every stat an achievement can be measured by ----------------------------------------------------------
create or replace function public.my_achievement_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  streak int;
  best_week int;
begin
  if me is null then return '{}'::jsonb; end if;

  -- longest run of consecutive days with a focus session (best ever, so missing a day never takes it away)
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
    'tasks_done',         (select count(*) from public.xp_log where user_id = me and task_id is not null),
    'sessions',           (select count(*) from public.study_sessions where user_id = me),
    'focus_minutes',      (select coalesce(sum(minutes), 0) from public.study_sessions where user_id = me),
    'longest_session',    (select coalesce(max(minutes), 0) from public.study_sessions where user_id = me),
    'streak_days',        streak,
    'weekly_minutes_best', best_week,
    'posts',              (select count(*) from public.posts where user_id = me),
    'comments',           (select count(*) from public.comments where user_id = me),
    'reactions_received', (select count(*) from public.reactions r join public.posts p on p.id = r.post_id
                            where p.user_id = me and r.user_id <> me),
    'level',              public.level_for_xp(public.user_xp(me)),
    'purchases',          (select count(*) from public.purchases where user_id = me and price_paid > 0),
    'profile_complete',   (select case when coalesce(bio, '') <> '' and avatar_path is not null then 1 else 0 end
                            from public.profiles where id = me)
  );
end $$;
grant execute on function public.my_achievement_stats() to authenticated;

-- 5) grant whatever you have newly earned (returns just the new ones, so the app can pop up a message) ---------------
create or replace function public.check_achievements()
returns table (ach_id text, ach_name text, ach_coins int, ach_item text)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  s jsonb;
  a record;
begin
  if me is null then return; end if;
  s := public.my_achievement_stats();
  for a in select * from public.achievements order by sort loop
    continue when exists (select 1 from public.user_achievements where user_id = me and achievement_id = a.id);
    if coalesce((s ->> a.stat)::int, 0) >= a.goal then
      insert into public.user_achievements (user_id, achievement_id, coins_paid) values (me, a.id, a.reward_coins);
      if a.reward_item is not null then
        insert into public.purchases (user_id, item_id, price_paid) values (me, a.reward_item, 0) on conflict do nothing;
      end if;
      ach_id := a.id; ach_name := a.name; ach_coins := a.reward_coins; ach_item := a.reward_item;
      return next;
    end if;
  end loop;
end $$;
grant execute on function public.check_achievements() to authenticated;

-- choose up to 3 earned badges to show first on your profile
create or replace function public.set_pinned_achievements(ids text[])
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  if coalesce(array_length(ids, 1), 0) > 3 then raise exception 'You can pin up to 3 badges'; end if;
  update public.user_achievements set pinned = (achievement_id = any (coalesce(ids, '{}'))) where user_id = me;
end $$;
grant execute on function public.set_pinned_achievements(text[]) to authenticated;

-- 6) earn-only cosmetics (hidden from the Shop) ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight', 'rose', 'tile', 'handheld', 'golden'));

insert into public.cosmetics (id, kind, name, min_level) values
  ('frame-laurel',  'frame',  'Laurel Wreath', 9999),
  ('frame-ember',   'frame',  'Ember',         9999),
  ('banner-summit', 'banner', 'Summit',        9999),
  ('banner-trophy', 'banner', 'Trophy Room',   9999)
on conflict (id) do nothing;

insert into public.shop_items (id, kind, name, price, sort, exclusive) values
  ('frame-laurel',  'frame',  'Laurel Wreath', 0, 70, true),
  ('frame-ember',   'frame',  'Ember',         0, 71, true),
  ('banner-summit', 'banner', 'Summit',        0, 72, true),
  ('banner-trophy', 'banner', 'Trophy Room',   0, 73, true),
  ('golden',        'theme',  'Golden Hour',   0, 74, true)
on conflict (id) do update set name = excluded.name, exclusive = true, price = 0;

-- 7) the achievements -------------------------------------------------------------------------------------------------
-- (id, name, description, icon, tier, stat, goal, coins, reward item, sort)
insert into public.achievements (id, name, description, icon, tier, stat, goal, reward_coins, reward_item, sort) values
  ('first-task',     'First Check',      'Finish your first task.',                          '✅', 'bronze', 'tasks_done',          1,    10,  null,            1),
  ('first-focus',    'Locked In',        'Complete your first focus session.',               '🔒', 'bronze', 'sessions',            1,    10,  null,            2),
  ('first-post',     'Show and Tell',    'Share your first progress post.',                  '📸', 'bronze', 'posts',               1,    15,  null,            3),
  ('all-set',        'All Set Up',       'Add a profile picture and a bio.',                 '🧑‍🎓', 'bronze', 'profile_complete',   1,    25,  null,            4),
  ('streak-3',       'On a Roll',        'Study three days in a row.',                       '🔥', 'bronze', 'streak_days',         3,    40,  null,            10),
  ('streak-7',       'Week Warrior',     'Study seven days in a row.',                       '🏅', 'silver', 'streak_days',         7,    100, 'frame-laurel',  11),
  ('week-5h',        'Five Hour Week',   'Focus for 5 hours in a single week.',              '⏳', 'bronze', 'weekly_minutes_best', 300,  40,  null,            12),
  ('week-15h',       'Full-Time Student','Focus for 15 hours in a single week.',             '📚', 'silver', 'weekly_minutes_best', 900,  100, null,            13),
  ('session-60',     'Deep Dive',        'Finish a 60 minute focus session.',                '🌊', 'bronze', 'longest_session',     60,   30,  null,            20),
  ('session-120',    'Marathon',         'Finish a 2 hour focus session.',                   '🏃', 'silver', 'longest_session',     120,  75,  null,            21),
  ('hours-25',       '25 Hours In',      'Focus for 25 hours in total.',                     '⛰️', 'silver', 'focus_minutes',       1500, 100, 'banner-summit', 22),
  ('hours-100',      'Centurion',        'Focus for 100 hours in total.',                    '👑', 'gold',   'focus_minutes',       6000, 300, 'golden',        23),
  ('tasks-25',       'Task Slayer',      'Finish 25 tasks.',                                 '⚔️', 'bronze', 'tasks_done',          25,   40,  null,            30),
  ('tasks-100',      'Finisher',         'Finish 100 tasks.',                                '🌋', 'silver', 'tasks_done',          100,  120, 'frame-ember',   31),
  ('comments-10',    'Good Friend',      'Write 10 comments on posts.',                      '💬', 'bronze', 'comments',            10,   30,  null,            40),
  ('reactions-10',   'Fan Favourite',    'Get 10 reactions on your posts.',                  '❤️', 'bronze', 'reactions_received',  10,   30,  null,            41),
  ('reactions-50',   'Crowd Pleaser',    'Get 50 reactions on your posts.',                  '🎉', 'silver', 'reactions_received',  50,   100, null,            42),
  ('level-5',        'Rising Star',      'Reach level 5.',                                   '⭐', 'silver', 'level',               5,    75,  null,            50),
  ('level-10',       'Veteran',          'Reach level 10.',                                  '🏆', 'gold',   'level',               10,   250, 'banner-trophy', 51),
  ('first-buy',      'Window Shopper',   'Buy something in the Shop.',                       '🛍️', 'bronze', 'purchases',           1,    20,  null,            60),
  ('collector',      'Collector',        'Own 6 things you bought in the Shop.',             '🧺', 'silver', 'purchases',           6,    100, null,            61)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, icon = excluded.icon, tier = excluded.tier, stat = excluded.stat,
  goal = excluded.goal, reward_coins = excluded.reward_coins, reward_item = excluded.reward_item, sort = excluded.sort;
