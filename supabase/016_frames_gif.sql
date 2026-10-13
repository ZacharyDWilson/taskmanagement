-- More picture frames (general, sleek, cute, nerdy and animated) plus the animated-GIF profile picture perk.
-- Safe to re-run. Run after 015_signature_docks.sql.
--
-- Frames are rows in `cosmetics` (so profiles.frame can point at them) with a price in `shop_items`.
-- min_level 9999 = never by level; only buying one unlocks it (check_cosmetics already enforces that).

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items
  add constraint shop_items_kind_check check (kind in ('theme', 'banner', 'frame', 'timer', 'perk'));

insert into public.cosmetics (id, kind, name, min_level) values
  ('frame-sunset',   'frame', 'Sunset',        9999),
  ('frame-forest',   'frame', 'Forest',        9999),
  ('frame-ocean',    'frame', 'Ocean',         9999),
  ('frame-onyx',     'frame', 'Onyx',          9999),
  ('frame-chrome',   'frame', 'Chrome',        9999),
  ('frame-mono',     'frame', 'Mono',          9999),
  ('frame-cat',      'frame', 'Cat ears',      9999),
  ('frame-bunny',    'frame', 'Bunny ears',    9999),
  ('frame-hearts',   'frame', 'Hearts',        9999),
  ('frame-pixel',    'frame', 'Pixel',         9999),
  ('frame-terminal', 'frame', 'Terminal',      9999),
  ('frame-circuit',  'frame', 'Circuit board', 9999),
  ('frame-d20',      'frame', 'Critical roll', 9999),
  ('frame-aurora',   'frame', 'Aurora',        9999),
  ('frame-pulse',    'frame', 'Pulse',         9999),
  ('frame-sparkle',  'frame', 'Sparkle',       9999),
  ('frame-glitch',   'frame', 'Glitch',        9999)
on conflict (id) do nothing;

insert into public.shop_items (id, kind, name, price, sort) values
  ('frame-sunset',   'frame', 'Sunset',        100, 40),
  ('frame-forest',   'frame', 'Forest',        100, 41),
  ('frame-ocean',    'frame', 'Ocean',         100, 42),
  ('frame-mono',     'frame', 'Mono',          120, 43),
  ('frame-onyx',     'frame', 'Onyx',          150, 44),
  ('frame-chrome',   'frame', 'Chrome',        180, 45),
  ('frame-cat',      'frame', 'Cat ears',      160, 46),
  ('frame-bunny',    'frame', 'Bunny ears',    160, 47),
  ('frame-hearts',   'frame', 'Hearts',        160, 48),
  ('frame-pixel',    'frame', 'Pixel',         180, 49),
  ('frame-terminal', 'frame', 'Terminal',      180, 50),
  ('frame-circuit',  'frame', 'Circuit board', 180, 51),
  ('frame-d20',      'frame', 'Critical roll', 180, 52),
  ('frame-pulse',    'frame', 'Pulse',         260, 53),
  ('frame-glitch',   'frame', 'Glitch',        280, 54),
  ('frame-aurora',   'frame', 'Aurora',        300, 55),
  ('frame-sparkle',  'frame', 'Sparkle',       320, 56),
  ('perk-gif',       'perk',  'Animated profile picture (GIF)', 500, 60)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;

-- A GIF profile picture can only be saved by someone who bought the perk.
create or replace function public.check_gif_avatar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.avatar_path is distinct from old.avatar_path
     and new.avatar_path ~* '\.gif$'
     and not exists (select 1 from public.purchases where user_id = new.id and item_id = 'perk-gif') then
    raise exception 'Buy the animated profile picture in the Shop first (GIF)';
  end if;
  return new;
end $$;

drop trigger if exists check_gif_avatar on public.profiles;
create trigger check_gif_avatar before update on public.profiles
  for each row execute function public.check_gif_avatar();
