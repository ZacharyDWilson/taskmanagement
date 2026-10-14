-- Temporary invite codes: a code works for a short window (15 minutes by default) and then stops working.
-- Codes are made on request with   select * from public.make_invite_code();   (service role / SQL editor only).
-- The old permanent code in app_settings is switched off, so sign-ups need a live temporary code.

create table if not exists public.invite_codes (
  code text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.invite_codes enable row level security;   -- no policies: not readable from the site
revoke all on public.invite_codes from anon, authenticated;

create or replace function public.make_invite_code(minutes int default 15)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare c text; e timestamptz;
begin
  c := 'LOCK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  e := now() + make_interval(mins => greatest(1, least(minutes, 1440)));
  insert into public.invite_codes (code, expires_at) values (c, e);
  return query select c, e;
end $$;
revoke all on function public.make_invite_code(int) from public, anon, authenticated;

create or replace function public.require_invite_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  expected text;
  given text;
  ok boolean := false;
begin
  given := lower(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  if given <> '' then
    -- a live temporary code
    select exists (select 1 from public.invite_codes c where lower(c.code) = given and c.expires_at > now()) into ok;
    -- the old permanent code, only if one is still set
    if not ok then
      select value into expected from public.app_settings where key = 'invite_code';
      ok := expected is not null and btrim(expected) <> '' and lower(btrim(expected)) = given;
    end if;
  end if;
  if not ok then
    raise exception 'Invalid or expired invite code';
  end if;
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  delete from public.invite_codes where expires_at < now() - interval '1 day';   -- tidy up
  return new;
end $$;

-- switch the permanent code off (temporary codes only from now on)
update public.app_settings set value = '' where key = 'invite_code';
