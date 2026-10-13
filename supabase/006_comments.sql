-- Comments on feed posts. Run after 005_invite_code.sql.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_time on public.comments (post_id, created_at);
alter table public.comments enable row level security;

create policy "members read comments" on public.comments
  for select to authenticated using (true);
create policy "members add own comments" on public.comments
  for insert to authenticated with check (auth.uid() = user_id);
-- You can delete your own comments, and the author of a post can clear comments on it.
create policy "delete own or on own post" on public.comments
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );
