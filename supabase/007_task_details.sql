-- Task details + an unscheduled "to plan" list. Run after 006_comments.sql.

-- A task with no day is "unscheduled" (it sits in the To plan list until dragged onto a day).
alter table public.tasks alter column day drop not null;

alter table public.tasks
  add column if not exists course text not null default '' check (char_length(course) <= 60),
  add column if not exists category text not null default ''
    check (category in ('', 'Homework', 'Exam', 'Project', 'Reading', 'Study', 'Work', 'Personal', 'Other')),
  add column if not exists due_date date,
  add column if not exists due_time time,
  add column if not exists criteria text not null default '' check (char_length(criteria) <= 1000),
  add column if not exists notes text not null default '' check (char_length(notes) <= 1000);
