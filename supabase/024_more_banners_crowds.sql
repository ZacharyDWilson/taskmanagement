-- Ten more banners for different crowds. Safe to re-run. Run after 023_handheld_glow_and_banners.sql.
-- Nerds: Chalkboard, Terminal, Circuit Board, Science Lab. Sporty: Stadium Lights, Hardwood.
-- Everyday: Campus Quad, City Sunset, The Stacks, Paint Splash.   (200 = quieter pictures, 300 = fuller scenes)
insert into public.cosmetics (id, kind, name, min_level) values
  ('banner-chalk', 'banner', 'Chalkboard', 9999),
  ('banner-terminal', 'banner', 'Terminal', 9999),
  ('banner-circuit', 'banner', 'Circuit Board', 9999),
  ('banner-lab', 'banner', 'Science Lab', 9999),
  ('banner-stadium', 'banner', 'Stadium Lights', 9999),
  ('banner-court', 'banner', 'Hardwood', 9999),
  ('banner-quad', 'banner', 'Campus Quad', 9999),
  ('banner-skyline', 'banner', 'City Sunset', 9999),
  ('banner-library', 'banner', 'The Stacks', 9999),
  ('banner-paint', 'banner', 'Paint Splash', 9999)
on conflict (id) do nothing;

insert into public.shop_items (id, kind, name, price, sort) values
  ('banner-chalk', 'banner', 'Chalkboard', 200, 30),
  ('banner-terminal', 'banner', 'Terminal', 200, 31),
  ('banner-circuit', 'banner', 'Circuit Board', 300, 32),
  ('banner-lab', 'banner', 'Science Lab', 300, 33),
  ('banner-stadium', 'banner', 'Stadium Lights', 300, 34),
  ('banner-court', 'banner', 'Hardwood', 300, 35),
  ('banner-quad', 'banner', 'Campus Quad', 300, 36),
  ('banner-skyline', 'banner', 'City Sunset', 200, 37),
  ('banner-library', 'banner', 'The Stacks', 300, 38),
  ('banner-paint', 'banner', 'Paint Splash', 200, 39)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
