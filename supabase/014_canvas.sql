-- Canvas assignments. Run after 013_dark_mode.sql.
--
-- Each person pastes their own Canvas "Calendar Feed" link. It works like a password, so it lives in
-- its own table that only that person can read (never on the public profile).

create table if not exists public.canvas_feeds (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  url text not null check (url ~ '^https://[^ ]+\.ics$' and char_length(url) <= 600),
  updated_at timestamptz not null default now()
);
alter table public.canvas_feeds enable row level security;

drop policy if exists "own feed: read" on public.canvas_feeds;
create policy "own feed: read" on public.canvas_feeds for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own feed: insert" on public.canvas_feeds;
create policy "own feed: insert" on public.canvas_feeds for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own feed: update" on public.canvas_feeds;
create policy "own feed: update" on public.canvas_feeds for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own feed: delete" on public.canvas_feeds;
create policy "own feed: delete" on public.canvas_feeds for delete to authenticated using (auth.uid() = user_id);

-- Remember which tasks came from which Canvas assignment, so nothing is added twice.
alter table public.tasks add column if not exists canvas_uid text;
create unique index if not exists tasks_canvas_uid_key on public.tasks (user_id, canvas_uid) where canvas_uid is not null;
