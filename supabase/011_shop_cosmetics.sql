-- Banners (and later frames) you can buy with coins. Run after 010_shop.sql.
--
-- A shop banner is a normal row in `cosmetics` (so profiles.banner can point at it) that has a price in
-- `shop_items`. Level doesn't unlock it; owning it does. The check below is enforced in the database,
-- so nobody can equip a banner they haven't bought.

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items
  add constraint shop_items_kind_check check (kind in ('theme', 'banner', 'frame', 'timer'));

-- min_level 9999 = "never by level"; only a purchase unlocks these.
insert into public.cosmetics (id, kind, name, min_level) values
  ('banner-hive',  'banner', 'Honey Hollow', 9999),
  ('banner-grove', 'banner', 'Sky Grove',    9999),
  ('banner-cabin', 'banner', 'Rainy Cabin',  9999),
  ('banner-orbit', 'banner', 'Orbit',         9999)
on conflict (id) do nothing;

insert into public.shop_items (id, kind, name, price, sort) values
  ('banner-hive',  'banner', 'Honey Hollow', 200, 20),
  ('banner-grove', 'banner', 'Sky Grove',    250, 21),
  ('banner-cabin', 'banner', 'Rainy Cabin',  250, 22),
  ('banner-orbit', 'banner', 'Orbit',         250, 23)
on conflict (id) do nothing;

create or replace function public.check_cosmetics()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lvl int;
  need int;
  pick text;
begin
  if new.frame is distinct from old.frame or new.banner is distinct from old.banner then
    lvl := public.level_for_xp(public.user_xp(new.id));
    foreach pick in array array[new.frame, new.banner] loop
      if exists (select 1 from public.shop_items where id = pick) then
        -- bought styles: you must own them
        if not exists (select 1 from public.purchases where user_id = new.id and item_id = pick) then
          raise exception 'Buy that style in the Shop first';
        end if;
      else
        select min_level into need from public.cosmetics where id = pick;
        if need > lvl then
          raise exception 'Reach level % to unlock that style', need;
        end if;
      end if;
    end loop;
  end if;
  return new;
end $$;

-- Lofi Nights theme (the profile.theme check needs to know about it)
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight'));
insert into public.shop_items (id, kind, name, price, sort) values
  ('lofi', 'theme', 'Lofi Nights', 300, 7),
  ('shore', 'theme', 'Coral Shore', 300, 8),
  ('twilight', 'theme', 'Twilight Sky', 300, 9)
on conflict (id) do nothing;

-- Keep-alive: a tiny function the scheduled GitHub job calls so the free project never goes idle.
-- It reads nothing private and returns only the time.
create or replace function public.keepalive()
returns timestamptz language sql stable security definer set search_path = '' as $$
  select now()
$$;
grant execute on function public.keepalive() to anon, authenticated;

-- Timer styles you can buy (Plain is free and always available).
alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items
  add constraint shop_items_kind_check check (kind in ('theme', 'banner', 'frame', 'timer'));
insert into public.shop_items (id, kind, name, price, sort) values
  ('timer-bar',       'timer', 'Progress bar', 80,  30),
  ('timer-digital',   'timer', 'Digital',      120, 31),
  ('timer-ring',      'timer', 'Ring',         160, 32),
  ('timer-analog',    'timer', 'Analog',       200, 33),
  ('timer-flip',      'timer', 'Flip clock',   240, 34),
  ('timer-hourglass', 'timer', 'Hourglass',    280, 35),
  ('timer-garden',    'timer', 'Garden',       320, 36)
on conflict (id) do nothing;
