-- 2.17: notifications (comments, reactions, mentions) and @mentions in posts and comments. Safe to re-run.
-- Run after 032_share_cards_pin.sql.
--
--  * posts.mentions / comments.mentions: the people tagged (ids). The text keeps "@Name" for reading.
--  * notifications: one row per thing that happened TO you. Only you can read or clear your own.
--  * the database makes them (triggers), so nothing can be forged from the browser.
--  * they are tidied away after 30 days by the nightly cleanup.

alter table public.posts add column if not exists mentions uuid[] not null default '{}';
alter table public.comments add column if not exists mentions uuid[] not null default '{}';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,      -- who it is for
  actor_id uuid references public.profiles(id) on delete set null,             -- who did it
  kind text not null check (kind in ('comment', 'reaction', 'mention_post', 'mention_comment')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  detail text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_time on public.notifications (user_id, created_at desc);
-- one reaction notification per person per post, however many emoji they tap
create unique index if not exists notifications_one_reaction
  on public.notifications (user_id, actor_id, post_id) where kind = 'reaction';
alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "clear own notifications" on public.notifications;
create policy "clear own notifications" on public.notifications for delete to authenticated using (auth.uid() = user_id);

-- up to 5 real people, never yourself
create or replace function public.guard_mentions()
returns trigger language plpgsql set search_path = '' as $$
begin
  select coalesce(array_agg(id), '{}') into new.mentions from (
    select id from public.profiles where id = any (new.mentions) and id <> new.user_id limit 5
  ) s;
  return new;
end $$;
drop trigger if exists posts_guard_mentions on public.posts;
create trigger posts_guard_mentions before insert on public.posts for each row execute function public.guard_mentions();
drop trigger if exists comments_guard_mentions on public.comments;
create trigger comments_guard_mentions before insert on public.comments for each row execute function public.guard_mentions();

create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  -- the post's author, unless they are already being told through a mention
  if owner is not null and owner <> new.user_id and not (owner = any (new.mentions)) then
    insert into public.notifications (user_id, actor_id, kind, post_id, comment_id, detail)
    values (owner, new.user_id, 'comment', new.post_id, new.id, left(new.body, 80));
  end if;
  insert into public.notifications (user_id, actor_id, kind, post_id, comment_id, detail)
  select m, new.user_id, 'mention_comment', new.post_id, new.id, left(new.body, 80) from unnest(new.mentions) as m;
  return new;
end $$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.notify_comment();

create or replace function public.notify_post_mentions()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, post_id, detail)
  select m, new.user_id, 'mention_post', new.id, left(new.body, 80) from unnest(new.mentions) as m;
  return new;
end $$;
drop trigger if exists posts_notify_mentions on public.posts;
create trigger posts_notify_mentions after insert on public.posts for each row execute function public.notify_post_mentions();

create or replace function public.notify_reaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid; snippet text;
begin
  select user_id, left(body, 80) into owner, snippet from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, kind, post_id, detail)
    values (owner, new.user_id, 'reaction', new.post_id, coalesce(snippet, ''))
    on conflict (user_id, actor_id, post_id) where kind = 'reaction' do nothing;
  end if;
  return new;
end $$;
drop trigger if exists reactions_notify on public.reactions;
create trigger reactions_notify after insert on public.reactions for each row execute function public.notify_reaction();

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read = true where user_id = auth.uid() and not read
$$;
grant execute on function public.mark_notifications_read() to authenticated;

-- nightly job: everything from 031, plus notifications older than 30 days
create or replace function public.nightly_cleanup()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare out jsonb;
begin
  out := jsonb_build_object(
    'tasks',         public.purge_old_done_tasks(),
    'posts',         public.expire_old_posts(),
    'sessions',      public.rollup_old_sessions(),
    'xp_rows',       public.rollup_old_xp_log());
  delete from public.reports where status = 'resolved' and created_at < now() - interval '60 days';
  delete from public.announcements where expires_at is not null and expires_at < now() - interval '30 days';
  delete from public.admin_log where created_at < now() - interval '180 days';
  delete from public.study_queue where joined_at < now() - interval '1 day';
  delete from public.notifications where created_at < now() - interval '30 days';
  return out;
end $$;
revoke all on function public.nightly_cleanup() from public, anon, authenticated;
grant execute on function public.nightly_cleanup() to service_role;
