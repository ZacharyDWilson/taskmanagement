-- Daily bonus: finish EVERY task planned for a day (at least 3) and earn 5 XP per task, up to 10 tasks (max 50 XP).
-- It is a row in xp_log (kind 'day_bonus'), so it turns into coins and levels like any other XP. Un-tick a task or add
-- a new unfinished one to that day and the bonus is recalculated (taken back if the day is no longer complete).
-- Only tasks that have existed for 30 minutes count, so a pile of freshly created tasks can't be ticked straight away.
-- Only a day within one day of today (UTC) is ever recalculated, so old days are never touched by clean-up deletes.

alter table public.xp_log add column if not exists kind text not null default 'task';
create unique index if not exists xp_log_day_bonus_once on public.xp_log (user_id, earned_on) where kind = 'day_bonus';

-- the 10-tasks-a-day XP limit counts task rows only, never the bonus
create or replace function public.award_task_xp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.done and (tg_op = 'INSERT' or old.done is distinct from true) then
    if (select count(*) from public.xp_log
        where user_id = new.user_id and earned_on = (now() at time zone 'utc')::date and kind = 'task') < 10 then
      insert into public.xp_log (user_id, task_id, amount) values (new.user_id, new.id, 10)
      on conflict do nothing;
    end if;
  elsif tg_op = 'UPDATE' and old.done and not new.done then
    delete from public.xp_log where task_id = new.id;
  end if;
  return new;
end $$;

create or replace function public.sync_day_bonus(uid uuid, d date)
returns void language plpgsql security definer set search_path = '' as $$
declare total int; open_n int; aged int;
begin
  if uid is null or d is null then return; end if;
  if d < (now() at time zone 'utc')::date - 1 or d > (now() at time zone 'utc')::date + 1 then return; end if;
  select count(*), count(*) filter (where not done),
         count(*) filter (where done and created_at <= now() - interval '30 minutes')
    into total, open_n, aged
  from public.tasks where user_id = uid and day = d;
  if total >= 3 and open_n = 0 and aged >= 3 then
    insert into public.xp_log (user_id, amount, earned_on, kind, tasks)
    values (uid, 5 * least(aged, 10), d, 'day_bonus', 0)
    on conflict (user_id, earned_on) where kind = 'day_bonus' do update set amount = excluded.amount;
  else
    delete from public.xp_log where user_id = uid and earned_on = d and kind = 'day_bonus';
  end if;
end $$;
revoke all on function public.sync_day_bonus(uuid, date) from public, anon, authenticated;

create or replace function public.tasks_sync_day_bonus()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_day_bonus(old.user_id, old.day);
  else
    perform public.sync_day_bonus(new.user_id, new.day);
    if tg_op = 'UPDATE' and old.day is distinct from new.day then
      perform public.sync_day_bonus(old.user_id, old.day);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists tasks_day_bonus on public.tasks;
create trigger tasks_day_bonus
  after insert or update of done, day or delete on public.tasks
  for each row execute function public.tasks_sync_day_bonus();
