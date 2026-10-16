-- Style packs: Clay Pop, Neo Brutal and Wabi-Sabi (700 coins each). Safe to re-run. Run after 038_umaine_theme.sql.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'umaine', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight', 'rose', 'tile', 'handheld', 'golden', 'clay', 'brutal', 'wabi'));

-- (check_theme_owned from 038 already requires a purchase for any theme outside the free list, so these need buying.)
insert into public.shop_items (id, kind, name, price, sort) values
  ('clay', 'theme', 'Clay Pop', 700, 21),
  ('brutal', 'theme', 'Neo Brutal', 700, 22),
  ('wabi', 'theme', 'Wabi-Sabi', 700, 23)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
