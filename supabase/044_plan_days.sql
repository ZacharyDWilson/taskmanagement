-- Work days: extra days you plan to work on a task, besides its main "planned for" day. Safe to re-run.
alter table public.tasks add column if not exists plan_days date[] not null default '{}';
alter table public.tasks drop constraint if exists tasks_plan_days_max;
alter table public.tasks add constraint tasks_plan_days_max check (cardinality(plan_days) <= 31);
