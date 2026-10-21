-- Style packs cost more than themes: every box, button and field is reshaped, and they bring their own sounds and music.
-- Anyone who already bought one keeps it (purchases are not touched). Safe to re-run.
update public.shop_items set price = 900 where id in ('clay', 'brutal', 'wabi', 'cyber', 'scrap');
