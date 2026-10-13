-- Finished tasks tidy themselves away a week after they were marked done. Safe to re-run.
-- Run after 019_glazed_tile.sql.
--
-- XP is safe: finishing a task is recorded in xp_log (008_task_xp_and_themes.sql), which keeps its rows when the
-- task is deleted, so cleaning up never lowers anyone's level or coins.

-- 1) remember WHEN a task was finished
alter table public.tasks add column if not exists done_at timestamptz;

-- tasks that are already done start their week from now (nobody loses one overnight)
update public.tasks set done_at = now() where done and done_at is null;

create or replace function public.set_task_done_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.done then
    if tg_op = 'INSERT' or old.done is distinct from true or new.done_at is null then
      new.done_at := now();
    end if;
  else
    new.done_at := null;        -- marked "not done" again: the clock resets
  end if;
  return new;
end $$;

drop trigger if exists tasks_set_done_at on public.tasks;
create trigger tasks_set_done_at
  before insert or update of done on public.tasks
  for each row execute function public.set_task_done_at();

create index if not exists tasks_done_at_idx on public.tasks (done_at) where done;

-- 2) the clean-up itself
-- everyone's old finished tasks (used by the nightly job below)
create or replace function public.purge_old_done_tasks()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.tasks where done and done_at is not null and done_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_old_done_tasks() from public, anon, authenticated;

-- just my own (the app calls this each time the To Do page opens, so it works even without the nightly job)
create or replace function public.purge_my_done_tasks()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then return 0; end if;
  delete from public.tasks
  where user_id = auth.uid() and done and done_at is not null and done_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.purge_my_done_tasks() to authenticated;

-- 3) a nightly job, when the project has the pg_cron extension available (it is optional)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('purge-done-tasks', '15 4 * * *', 'select public.purge_old_done_tasks()');
exception when others then
  raise notice 'pg_cron is not available here (%). The app still cleans up each person''s tasks when they open To Do.', sqlerrm;
end $$;
