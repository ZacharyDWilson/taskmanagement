-- Six more timer styles (they work for both the Pomodoro and the Count up timer) and bundles you can buy together.
-- Safe to re-run. Run after 025_achievements.sql.
--
--   Desk Set  : Candle, Vinyl, Sunrise      (680 separately, 480 as a bundle)
--   Tech Set  : Neon, Rocket, Battery       (520 separately, 380 as a bundle)
--   Full Set  : all six                     (1200 separately, 800 as a bundle)
--
-- A bundle costs its price, but if you already own some of the styles in it you only pay for the rest, in proportion.
-- Buying a bundle gives you each style as a normal purchase, so everything else (equipping, owning) works as before.

insert into public.shop_items (id, kind, name, price, sort) values
  ('timer-neon',    'timer', 'Neon',    160, 37),
  ('timer-battery', 'timer', 'Battery', 160, 38),
  ('timer-candle',  'timer', 'Candle',  200, 39),
  ('timer-rocket',  'timer', 'Rocket',  200, 40),
  ('timer-sunrise', 'timer', 'Sunrise', 240, 41),
  ('timer-vinyl',   'timer', 'Vinyl',   240, 42)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;

create table if not exists public.shop_bundles (
  id text primary key,
  name text not null,
  blurb text not null default '',
  price int not null check (price >= 0),
  items text[] not null,
  sort int not null default 0
);
alter table public.shop_bundles enable row level security;
drop policy if exists "members read bundles" on public.shop_bundles;
create policy "members read bundles" on public.shop_bundles for select to authenticated using (true);

-- (id, name, blurb, price, items, sort)
insert into public.shop_bundles (id, name, blurb, price, items, sort) values
  ('bundle-desk', 'Desk Set',  'A warm desk: a candle that burns down, a record that plays, a sunrise.', 480,
    array['timer-candle', 'timer-vinyl', 'timer-sunrise'], 1),
  ('bundle-tech', 'Tech Set',  'Glowing neon, a rocket on its way, a battery that drains and charges.', 380,
    array['timer-neon', 'timer-rocket', 'timer-battery'], 2),
  ('bundle-full', 'Full Set',  'All six of the new timer styles together.', 800,
    array['timer-candle', 'timer-vinyl', 'timer-sunrise', 'timer-neon', 'timer-rocket', 'timer-battery'], 3)
on conflict (id) do update set
  name = excluded.name, blurb = excluded.blurb, price = excluded.price, items = excluded.items, sort = excluded.sort;

-- Buy a bundle. Returns your coins left.
create or replace function public.buy_bundle(bundle text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b record;
  n int;
  missing text[];
  cost int;
  bal int;
  first_item boolean := true;
  it text;
  paid int;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into b from public.shop_bundles where id = bundle;
  if not found then raise exception 'That bundle does not exist'; end if;

  n := coalesce(array_length(b.items, 1), 0);
  select coalesce(array_agg(i), '{}') into missing
  from unnest(b.items) as i
  where not exists (select 1 from public.purchases where user_id = me and item_id = i);

  if coalesce(array_length(missing, 1), 0) = 0 then raise exception 'You already own everything in that bundle'; end if;
  if exists (select 1 from public.shop_items s where s.id = any (b.items) and s.exclusive) then
    raise exception 'That bundle includes something that can only be earned';
  end if;

  -- pay in proportion to what you do not have yet
  cost := ceil(b.price::numeric * array_length(missing, 1) / n)::int;
  bal := public.coin_balance(me);
  if bal < cost then raise exception 'Not enough coins: you have %, it costs %', bal, cost; end if;

  -- spread the price across the new items; the first one takes any rounding left over
  foreach it in array missing loop
    paid := cost / array_length(missing, 1);
    if first_item then paid := paid + (cost - paid * array_length(missing, 1)); first_item := false; end if;
    insert into public.purchases (user_id, item_id, price_paid) values (me, it, paid) on conflict do nothing;
  end loop;
  return bal - cost;
end $$;
grant execute on function public.buy_bundle(text) to authenticated;
