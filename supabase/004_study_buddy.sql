-- Study Buddy: an "open to group studying" queue with simple matching.
-- Run after 003_levels.sql.

create table if not exists public.study_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('have_room', 'need_room')),
  room text not null default '' check (char_length(room) <= 60),
  note text not null default '' check (char_length(note) <= 80),
  matched_with uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now()
);
alter table public.study_queue enable row level security;

create policy "members see the queue" on public.study_queue
  for select to authenticated using (true);
create policy "join the queue unmatched" on public.study_queue
  for insert to authenticated with check (auth.uid() = user_id and matched_with is null);
create policy "edit own queue entry" on public.study_queue
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leave the queue" on public.study_queue
  for delete to authenticated using (auth.uid() = user_id);

-- People may edit their own role/room/note, but matching only happens through the functions below.
revoke update on public.study_queue from authenticated;
grant update (role, room, note) on public.study_queue to authenticated;

create or replace function public.match_study_buddy(other uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or me = other then
    raise exception 'Invalid match';
  end if;
  perform 1 from public.study_queue where user_id = me and matched_with is null;
  if not found then
    raise exception 'Join the queue first';
  end if;
  perform 1 from public.study_queue where user_id = other and matched_with is null;
  if not found then
    raise exception 'That person is no longer available';
  end if;
  update public.study_queue set matched_with = other where user_id = me;
  update public.study_queue set matched_with = me where user_id = other;
end $$;

-- End a match but stay in the queue (both people go back to "open").
create or replace function public.unmatch_study_buddy()
returns void language sql security definer set search_path = '' as $$
  update public.study_queue set matched_with = null
  where user_id = auth.uid() or matched_with = auth.uid();
$$;

-- Leave the queue entirely; a partner (if any) goes back to "open".
create or replace function public.leave_study_queue()
returns void language sql security definer set search_path = '' as $$
  update public.study_queue set matched_with = null where matched_with = auth.uid();
  delete from public.study_queue where user_id = auth.uid();
$$;
