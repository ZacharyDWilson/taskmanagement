-- A note for each work day: what you are doing that day. Stored as { "2026-10-22": "Read chapters 1 to 3" } on the task. Safe to re-run.
alter table public.tasks add column if not exists plan_notes jsonb not null default '{}'::jsonb;
alter table public.tasks drop constraint if exists tasks_plan_notes_shape;
alter table public.tasks add constraint tasks_plan_notes_shape check (jsonb_typeof(plan_notes) = 'object' and pg_column_size(plan_notes) <= 6000);
