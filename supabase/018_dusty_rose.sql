-- Dusty Rose look (pink, cream, sage and cocoa). Safe to re-run. Run after 017_more_banners.sql.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight', 'rose'));

insert into public.shop_items (id, kind, name, price, sort) values
  ('rose', 'theme', 'Dusty Rose', 550, 11)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
