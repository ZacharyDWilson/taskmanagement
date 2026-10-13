-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- Posts: any logged-in friend can read; you can only write/delete your own.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "members read posts" on public.posts
  for select to authenticated using (true);
create policy "members insert own posts" on public.posts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "members delete own posts" on public.posts
  for delete to authenticated using (auth.uid() = user_id);

-- File storage: bucket "uploads", each user writes only into their own folder.
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "members read uploads" on storage.objects
  for select to authenticated using (bucket_id = 'uploads');
create policy "members upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members delete own uploads" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
