-- Animated banner (GIF): a picture (or GIF) as your profile banner, a Shop perk. Safe to re-run. Run after 048_old_library.sql.
alter table public.profiles add column if not exists banner_path text;
alter table public.profiles drop constraint if exists profiles_banner_path_shape;
alter table public.profiles add constraint profiles_banner_path_shape
  check (banner_path is null or (char_length(banner_path) <= 200 and banner_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(gif|jpg)$'));

insert into public.shop_items (id, kind, name, price, sort) values
  ('perk-gif-banner', 'perk', 'Animated banner (GIF)', 500, 61)
on conflict (id) do update set price = excluded.price, name = excluded.name, sort = excluded.sort;

-- A banner picture can only be set by someone who bought the perk, and only from their own folder.
create or replace function public.check_banner_picture()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.banner_path is distinct from old.banner_path and new.banner_path is not null then
    if not exists (select 1 from public.purchases where user_id = new.id and item_id = 'perk-gif-banner') then
      raise exception 'Buy the animated banner in the Shop first (GIF)';
    end if;
    if new.banner_path not like new.id::text || '/%' then
      raise exception 'That banner picture is not yours';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists check_banner_picture on public.profiles;
create trigger check_banner_picture before update on public.profiles for each row execute function public.check_banner_picture();
