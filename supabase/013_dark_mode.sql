-- Light / Dark at the start. Run after 012_username.sql.
-- 'dark' is the dark version of the default look. It is free, so it needs no purchase, like 'default'.

alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default', 'dark', 'gordon', 'stonybrook', 'aero', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade', 'lofi', 'shore', 'twilight'));

create or replace function public.check_theme_owned()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.theme is distinct from old.theme and new.theme not in ('default', 'dark', 'gordon', 'stonybrook') then
    if not exists (select 1 from public.purchases where user_id = new.id and item_id = new.theme) then
      raise exception 'You don''t own that theme yet. Get it in the Shop.';
    end if;
  end if;
  return new;
end $$;

insert into public.shop_items (id, kind, name, price, sort) values
  ('aero', 'theme', 'Frutiger Aero', 600, 10)
on conflict (id) do update set price = excluded.price;
