-- Old Library: a signature theme (bookshelves for a background, a dock of books), 500 coins. Safe to re-run. Run after 043_style_packs_2.sql.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'umaine', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight', 'rose', 'tile', 'handheld', 'golden', 'clay', 'brutal', 'wabi', 'cyber', 'scrap', 'library'));

insert into public.shop_items (id, kind, name, price, sort) values
  ('library', 'theme', 'Old Library', 500, 26)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
