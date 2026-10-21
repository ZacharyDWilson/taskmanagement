-- Style packs cost more than themes: they bring a floating dock, reshaped boxes, their own sounds and music.
-- Anyone who already bought one keeps it (purchases are not touched). Safe to re-run.
update public.shop_items set price = 900 where id in ('clay', 'brutal', 'wabi', 'cyber', 'scrap');
