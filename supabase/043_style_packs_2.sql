-- Two more Style packs: Cybercore and Scrapbook (700 coins each). Safe to re-run. Run after 042_style_packs.sql.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'umaine', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight', 'rose', 'tile', 'handheld', 'golden', 'clay', 'brutal', 'wabi', 'cyber', 'scrap'));

insert into public.shop_items (id, kind, name, price, sort) values
  ('cyber', 'theme', 'Cybercore', 700, 24),
  ('scrap', 'theme', 'Scrapbook', 700, 25)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
