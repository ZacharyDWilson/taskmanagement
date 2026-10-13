-- Usernames. Run after 011_shop_cosmetics.sql.
--
-- Every profile now has two names:
--   display_name  what everyone sees around the app. Anything the person likes.
--   username      their real first and last name in some form: "Jane Doe", "jane.doe", "jane_doe",
--                 "JaneDoe", with an optional number on the end ("jane.doe2"). Unique, case-insensitive.
-- Older accounts keep username empty until they add one in My Profile.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists college text check (college is null or char_length(college) <= 80);

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (
  username is null or username ~ '^([A-Za-z][A-Za-z''-]*[ ._]+[A-Za-z][A-Za-z''-]*|[A-Z][a-z]+[A-Z][a-z]+)[0-9]{0,4}$'
);

create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null;

-- Sign-up form can ask "is this one free?" before creating the account (works while signed out).
create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(btrim(name)))
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- New accounts get both names from the sign-up form.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, username, college)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(btrim(new.raw_user_meta_data->>'username'), ''),
    nullif(left(btrim(new.raw_user_meta_data->>'college'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- A username is locked once it is set. People can add one if they don't have one yet, but only
-- someone with direct database access (you, in the Supabase SQL editor) can change it afterwards.
create or replace function public.lock_username()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.username is not null
     and new.username is distinct from old.username
     and auth.uid() is not null then
    raise exception 'Your username is locked. Ask the group admin to change it.';
  end if;
  return new;
end $$;

drop trigger if exists profiles_lock_username on public.profiles;
create trigger profiles_lock_username
  before update on public.profiles
  for each row execute function public.lock_username();
