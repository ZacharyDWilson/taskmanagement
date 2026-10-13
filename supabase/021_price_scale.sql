-- One clear price scale for themes: +100 per step, starting at 200. Safe to re-run.
-- Run after 020_auto_clean_done_tasks.sql.
--
--   200  Basic       colours and a moving background        Sprout Squad, Capsule Quest, Twilight Sky
--   300  Detailed    a richer scene                         Hero's Meadow
--   400  Signature   the side buttons change shape          Cozy Island, Retro Console, Starlit Arcade,
--                                                           Lofi Nights, Glazed Tile, Coral Shore
--   500  Premium     signature buttons plus the fullest scene   Dusty Rose, Frutiger Aero
--
-- People who already bought a theme keep it and are not charged again (purchases stores what they paid).
update public.shop_items set price = 200 where id in ('sprout', 'capsule', 'twilight');
update public.shop_items set price = 300 where id in ('meadow');
update public.shop_items set price = 400 where id in ('island', 'console', 'arcade', 'lofi', 'tile', 'shore');
update public.shop_items set price = 500 where id in ('rose', 'aero');
