-- Invite-only sign-ups, enforced in the database (the sign-up form alone could be bypassed).
-- Run after 004_study_buddy.sql. Replace CHANGE-ME-before-running below with your real code first.
--
-- To CHANGE the code later, run just this line in the SQL Editor:
--   update public.app_settings set value = 'new-code-here' where key = 'invite_code';

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);
alter table public.app_settings enable row level security;   -- no policies: nobody can read it from the site
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value) values ('invite_code', 'CHANGE-ME-before-running')
on conflict (key) do nothing;

create or replace function public.require_invite_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  expected text;
  given text;
begin
  select value into expected from public.app_settings where key = 'invite_code';
  given := new.raw_user_meta_data ->> 'invite_code';
  if expected is null or given is null or lower(btrim(given)) <> lower(btrim(expected)) then
    raise exception 'Invalid invite code';
  end if;
  -- Don't keep the code on the user's account.
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end $$;

drop trigger if exists require_invite_code on auth.users;
create trigger require_invite_code
  before insert on auth.users
  for each row execute function public.require_invite_code();
