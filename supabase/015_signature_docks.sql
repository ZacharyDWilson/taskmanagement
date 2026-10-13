-- Signature dock looks (flower, monitor, star and record buttons) are a step above the plain colour looks.
-- Safe to re-run. Nobody loses a look they already own; only the shop price changes.
update public.shop_items set price = 500 where id in ('island', 'console', 'arcade', 'lofi');
