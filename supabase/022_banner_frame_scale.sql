-- Banners and frames on the same kind of clear, stepped scale as the themes. Safe to re-run.
-- Run after 021_price_scale.sql.
--
-- Banners   200  quieter pictures      Strings, Honey Hollow, Sunrise Hill
--           300  fuller scenes         Capsule Route, Sky Grove, Rainy Cabin, Orbit
-- Frames    100  plain colours         Sunset, Forest, Ocean, Mono, Onyx
--           200  shaped or detailed    Chrome, Cat ears, Bunny ears, Hearts, Pixel, Terminal, Circuit board, Critical roll
--           300  animated              Pulse, Glitch, Aurora, Sparkle
-- (The animated profile picture perk stays at 500, the top of the scale.)
-- Anyone who already owns one keeps it; purchases remember what they paid.
update public.shop_items set price = 200 where id in ('banner-strings', 'banner-hive', 'banner-sunrise');
update public.shop_items set price = 300 where id in ('banner-route', 'banner-grove', 'banner-cabin', 'banner-orbit');
update public.shop_items set price = 100 where id in ('frame-sunset', 'frame-forest', 'frame-ocean', 'frame-mono', 'frame-onyx');
update public.shop_items set price = 200 where id in ('frame-chrome', 'frame-cat', 'frame-bunny', 'frame-hearts', 'frame-pixel', 'frame-terminal', 'frame-circuit', 'frame-d20');
update public.shop_items set price = 300 where id in ('frame-pulse', 'frame-glitch', 'frame-aurora', 'frame-sparkle');
