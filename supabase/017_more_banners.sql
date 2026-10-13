-- Three more shop banners (Capsule Route, Sunrise Hill, Strings). Safe to re-run. Run after 016_frames_gif.sql.
insert into public.cosmetics (id, kind, name, min_level) values
  ('banner-route',   'banner', 'Capsule Route', 9999),
  ('banner-sunrise', 'banner', 'Sunrise Hill',  9999),
  ('banner-strings', 'banner', 'Strings',       9999)
on conflict (id) do nothing;

insert into public.shop_items (id, kind, name, price, sort) values
  ('banner-route',   'banner', 'Capsule Route', 250, 24),
  ('banner-sunrise', 'banner', 'Sunrise Hill',  250, 25),
  ('banner-strings', 'banner', 'Strings',       250, 26)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;
