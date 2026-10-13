-- Handheld Glow theme (glossy game buttons, 400 coins: a signature dock) and three new banners. Cozy Island moves up to 500
-- (the sakura tree, petals and flower dock make it one of the fullest looks). Safe to re-run.
-- Run after 022_banner_frame_scale.sql.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight', 'rose', 'tile', 'handheld'));

insert into public.shop_items (id, kind, name, price, sort) values
  ('handheld', 'theme', 'Handheld Glow', 400, 13)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;

update public.shop_items set price = 500 where id in ('island');

-- banners: a row in cosmetics (so profiles.banner can point at it) plus a price in shop_items
insert into public.cosmetics (id, kind, name, min_level) values
  ('banner-valley', 'banner', 'Valley Run',    9999),
  ('banner-pond',   'banner', 'Lily Pond',     9999),
  ('banner-glow',   'banner', 'Handheld Glow', 9999)
on conflict (id) do nothing;

insert into public.shop_items (id, kind, name, price, sort) values
  ('banner-valley', 'banner', 'Valley Run',    300, 27),
  ('banner-pond',   'banner', 'Lily Pond',     300, 28),
  ('banner-glow',   'banner', 'Handheld Glow', 300, 29)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
