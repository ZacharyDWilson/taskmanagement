-- Security hardening (found by testing the app as an ordinary signed-in member).
--  1. Focus time could be invented: any member could insert unlimited study sessions and mint XP, coins, streaks and
--     weekly prizes. Now a session must be recent and a member can log at most 12 hours in any 24.
--  2. profiles.starter_chosen / tos_version could be edited directly, which let a member re-open the free starter
--     theme pick again and again. starter_chosen can now only go from false to true, and tos_version / tos_accepted_at
--     change only through the accept_terms function.
--  3. A member could set their own created_at when posting, commenting or adding a task (to dodge the 14-day expiry
--     and daily limits). The database now stamps it.
--  4. Functions were runnable by anyone holding the public key. Now only signed-in members can run them (the two
--     that must work before sign-in, username_available and keepalive, stay open).
--  5. The photo bucket accepted any file type and size. Now images only, 5 MB each.

-- 1) study sessions ------------------------------------------------------------------------------------------------
create or replace function public.guard_study_session()
returns trigger language plpgsql set search_path = '' as $$
declare used int;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;   -- server functions are trusted
  if new.created_at > now() + interval '5 minutes' or new.created_at < now() - interval '7 days' then
    raise exception 'That session time is not allowed';
  end if;
  select coalesce(sum(minutes), 0) into used from public.study_sessions
    where user_id = new.user_id and created_at > now() - interval '24 hours';
  if used + new.minutes > 720 then
    raise exception 'Daily focus time limit reached (12 hours)';
  end if;
  return new;
end $$;
drop trigger if exists study_sessions_guard on public.study_sessions;
create trigger study_sessions_guard before insert on public.study_sessions
  for each row execute function public.guard_study_session();

-- 2) profile flags -------------------------------------------------------------------------------------------------
create or replace function public.guard_profile_flags()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.starter_chosen := false; new.tos_version := 0; new.tos_accepted_at := null;
    elsif (new.starter_chosen is distinct from old.starter_chosen and not (old.starter_chosen = false and new.starter_chosen = true))
       or new.tos_version is distinct from old.tos_version
       or new.tos_accepted_at is distinct from old.tos_accepted_at then
      raise exception 'That setting can not be changed directly';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_flags on public.profiles;
create trigger profiles_guard_flags before insert or update on public.profiles
  for each row execute function public.guard_profile_flags();

-- 3) the database stamps created_at ----------------------------------------------------------------------------------
create or replace function public.stamp_created_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then new.created_at := now(); end if;
  return new;
end $$;
drop trigger if exists posts_stamp on public.posts;
create trigger posts_stamp before insert on public.posts for each row execute function public.stamp_created_at();
drop trigger if exists comments_stamp on public.comments;
create trigger comments_stamp before insert on public.comments for each row execute function public.stamp_created_at();
drop trigger if exists tasks_stamp on public.tasks;
create trigger tasks_stamp before insert on public.tasks for each row execute function public.stamp_created_at();

-- 4) who may run the functions -------------------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, has_function_privilege('authenticated', p.oid, 'execute') as authed
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.authed then execute format('grant execute on function %s to authenticated', f.sig); end if;
  end loop;
end $$;
grant execute on function public.username_available(text) to anon;
grant execute on function public.keepalive() to anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- 5) the photo bucket -----------------------------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'uploads';
