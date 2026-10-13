-- Glazed Tile look (relief tiles in moss, amber, teal and terracotta). Safe to re-run. Run after 018_dusty_rose.sql.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight', 'rose', 'tile'));

insert into public.shop_items (id, kind, name, price, sort) values
  ('tile', 'theme', 'Glazed Tile', 500, 12)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
