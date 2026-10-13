-- Permanent XP for finishing tasks + a saved page theme. Run after 007_task_details.sql.

-- XP ledger: finishing a task earns 10 XP (max 10 rewarded tasks per day). Rows stay even if the
-- task is later deleted, so tidying your list never lowers your level. Marking a task "not done"
-- takes that task's XP back. Only the trigger below writes here; people can only read their own rows.
create table if not exists public.xp_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  amount int not null check (amount >= 0),
  earned_on date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now()
);
create unique index if not exists xp_log_task_once on public.xp_log (task_id) where task_id is not null;
create index if not exists xp_log_user_day on public.xp_log (user_id, earned_on);
alter table public.xp_log enable row level security;

create policy "read own xp log" on public.xp_log
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.award_task_xp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.done and (tg_op = 'INSERT' or old.done is distinct from true) then
    if (select count(*) from public.xp_log
        where user_id = new.user_id and earned_on = (now() at time zone 'utc')::date) < 10 then
      insert into public.xp_log (user_id, task_id, amount) values (new.user_id, new.id, 10)
      on conflict do nothing;
    end if;
  elsif tg_op = 'UPDATE' and old.done and not new.done then
    delete from public.xp_log where task_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists tasks_award_xp on public.tasks;
create trigger tasks_award_xp
  after insert or update of done on public.tasks
  for each row execute function public.award_task_xp();

-- Credit tasks that were already finished before this existed (same 10-per-day cap).
insert into public.xp_log (user_id, task_id, amount, earned_on)
select user_id, id, 10, d from (
  select user_id, id, (created_at at time zone 'utc')::date as d,
         row_number() over (partition by user_id, (created_at at time zone 'utc')::date order by created_at) as rn
  from public.tasks where done
) t
where rn <= 10
on conflict do nothing;

-- Total XP: focus minutes + task ledger + posts (25 each, max 3/day) + reactions received (2 each).
create or replace function public.user_xp(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  select (
    coalesce((select sum(minutes) from public.study_sessions where user_id = uid), 0)
    + coalesce((select sum(amount) from public.xp_log where user_id = uid), 0)
    + 25 * coalesce((
        select sum(least(c, 3)) from (
          select count(*) c from public.posts where user_id = uid group by created_at::date
        ) p), 0)
    + 2 * (
        select count(*) from public.reactions r
        join public.posts po on po.id = r.post_id
        where po.user_id = uid and r.user_id <> uid)
  )::int
$$;

-- Each person's chosen page theme (so it follows them across devices).
alter table public.profiles
  add column if not exists theme text not null default 'default'
  check (theme in ('default', 'sprout', 'console', 'capsule', 'meadow', 'island', 'arcade'));
