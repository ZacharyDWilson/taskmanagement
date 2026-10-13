-- Major updates: an announcement can be marked "major", which makes it pop up once when people open the app.
-- (Every announcement also lands in the inbox, the mail button at the top.) Safe to re-run.
-- Run after 028_moderation_admin.sql.
alter table public.announcements add column if not exists major boolean not null default false;

drop function if exists public.admin_post_announcement(text, text, int);
create or replace function public.admin_post_announcement(head text, msg text default '', days int default 30, is_major boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  insert into public.announcements (title, body, major, expires_at, created_by)
  values (left(head, 100), left(coalesce(msg, ''), 600), coalesce(is_major, false),
          case when coalesce(days, 0) > 0 then now() + make_interval(days => days) end, auth.uid());
  perform public.admin_note(case when coalesce(is_major, false) then 'major announcement' else 'announcement' end, null, head);
end $$;
grant execute on function public.admin_post_announcement(text, text, int, boolean) to authenticated;
