-- Weekly repeats: "this happens every Monday and Wednesday". A repeat is a small recipe; the app turns it into normal
-- tasks (one per day, about five weeks ahead), so ticking them off, XP, moving and deleting all work as usual. Safe to re-run.
create table if not exists public.task_repeats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  course text not null default '' check (char_length(course) <= 60),
  category text not null default '' check (category in ('', 'Homework', 'Exam', 'Project', 'Reading', 'Study', 'Work', 'Personal', 'Other')),
  color text not null default 'blue',
  notes text not null default '' check (char_length(notes) <= 1000),
  weekdays smallint[] not null check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),   -- 0 = Sunday
  starts_on date not null default current_date,
  ends_on date,
  skips date[] not null default '{}' check (cardinality(skips) <= 200),    -- days you deleted or moved a copy of, so it does not come back
  created_at timestamptz not null default now()
);
alter table public.task_repeats enable row level security;
drop policy if exists "own repeats select" on public.task_repeats;
create policy "own repeats select" on public.task_repeats for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own repeats insert" on public.task_repeats;
create policy "own repeats insert" on public.task_repeats for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own repeats update" on public.task_repeats;
create policy "own repeats update" on public.task_repeats for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own repeats delete" on public.task_repeats;
create policy "own repeats delete" on public.task_repeats for delete to authenticated using (auth.uid() = user_id);

-- no more than 20 repeats per person
create or replace function public.limit_repeats()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.task_repeats where user_id = new.user_id) >= 20 then
    raise exception 'You can have up to 20 weekly repeats. Stop one first.';
  end if;
  return new;
end $$;
drop trigger if exists task_repeats_limit on public.task_repeats;
create trigger task_repeats_limit before insert on public.task_repeats for each row execute function public.limit_repeats();

-- which repeat a task is a copy of, and never two copies on one day
alter table public.tasks add column if not exists repeat_id uuid references public.task_repeats(id) on delete set null;
create unique index if not exists tasks_repeat_day_key on public.tasks (repeat_id, day) where repeat_id is not null;
