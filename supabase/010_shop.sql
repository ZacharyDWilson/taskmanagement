-- Coins and the theme shop. Run after 009_buddy_room_until.sql.
--
-- Coins are earned from XP: 1 coin per 5 XP, plus a level-up bonus of 25 x each new level reached.
-- Spending never touches XP or level. Purchases and the starter pick go through the functions below,
-- so the site can't be tricked into giving away themes.

create table if not exists public.shop_items (
  id text primary key,
  kind text not null check (kind in ('theme')),
  name text not null,
  price int not null check (price >= 0),
  sort int not null default 0
);
alter table public.shop_items enable row level security;
create policy "members read shop items" on public.shop_items
  for select to authenticated using (true);

insert into public.shop_items (id, kind, name, price, sort) values
  ('sprout',  'theme', 'Sprout Squad',   300, 1),
  ('console', 'theme', 'Retro Console',  300, 2),
  ('capsule', 'theme', 'Capsule Quest',  300, 3),
  ('island',  'theme', 'Cozy Island',    300, 4),
  ('meadow',  'theme', 'Hero''s Meadow', 450, 5),
  ('arcade',  'theme', 'Starlit Arcade', 450, 6)
on conflict (id) do nothing;

create table if not exists public.purchases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.shop_items(id),
  price_paid int not null check (price_paid >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.purchases enable row level security;
-- You can see what you own. Nobody can insert directly; buying goes through buy_item().
create policy "read own purchases" on public.purchases
  for select to authenticated using (auth.uid() = user_id);

-- One free starter theme per person.
alter table public.profiles add column if not exists starter_chosen boolean not null default false;

-- Coins you have right now (never below zero).
create or replace function public.coin_balance(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  with x as (select public.user_xp(uid) as xp),
       l as (select public.level_for_xp(xp) as lvl, xp from x)
  select greatest(0,
    floor(l.xp / 5.0)::int
    + 25 * ((l.lvl * (l.lvl + 1)) / 2 - 1)
    - coalesce((select sum(price_paid) from public.purchases where user_id = uid), 0)
  )::int
  from l
$$;

create or replace function public.buy_item(item text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cost int;
  bal int;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select price into cost from public.shop_items where id = item;
  if cost is null then raise exception 'That item is not in the shop'; end if;
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
  if not exists (select 1 from public.shop_items where id = item and kind = 'theme') then
    raise exception 'That theme is not available';
  end if;
  insert into public.purchases (user_id, item_id, price_paid) values (me, item, 0)
  on conflict do nothing;
  update public.profiles set starter_chosen = true, theme = item where id = me;
end $$;

-- You can only equip Classic or a theme you own.
create or replace function public.check_theme_owned()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.theme is distinct from old.theme and new.theme <> 'default' then
    if not exists (select 1 from public.purchases where user_id = new.id and item_id = new.theme) then
      raise exception 'You don''t own that theme yet. Get it in the Shop.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_check_theme_owned on public.profiles;
create trigger profiles_check_theme_owned
  before update on public.profiles
  for each row execute function public.check_theme_owned();
