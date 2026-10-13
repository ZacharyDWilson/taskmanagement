-- Community rules, moderation (mute / ban from posting and commenting), reports, announcements, and the admin dashboard.
-- Safe to re-run. Run after 027_brightspace_and_loose_links.sql.
--
-- IMPORTANT: this does not make anyone an admin. After running it, run supabase/make-admin.local.sql (a private file that is
-- not in the repo) to add your own account to app_admins. Only people in app_admins can use the dashboard functions, and
-- every one of them checks that on the server, so hiding the page in the app is only a convenience, not the protection.

-- 1) who is an admin -----------------------------------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;        -- no policies: nobody can read or write it through the API

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid())
$$;
grant execute on function public.is_admin() to authenticated;

-- 2) accepting the rules ---------------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists tos_version int not null default 0;
alter table public.profiles add column if not exists tos_accepted_at timestamptz;

create or replace function public.accept_terms(v int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  update public.profiles set tos_version = greatest(tos_version, v), tos_accepted_at = now() where id = auth.uid();
end $$;
grant execute on function public.accept_terms(int) to authenticated;

-- 3) mute and ban (from posting and commenting) ------------------------------------------------------------------------------
create table if not exists public.user_moderation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null check (status in ('muted', 'banned')),
  reason text not null default '',
  until timestamptz,                       -- when it lifts by itself; empty = until an admin lifts it
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.user_moderation enable row level security;
drop policy if exists "read own moderation" on public.user_moderation;
create policy "read own moderation" on public.user_moderation for select to authenticated using (auth.uid() = user_id);

-- 'muted' / 'banned' while it applies, otherwise null
create or replace function public.posting_block(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.status from public.user_moderation m
  where m.user_id = uid and (m.until is null or m.until > now())
$$;

create or replace function public.enforce_can_post()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s text; r text;
begin
  s := public.posting_block(new.user_id);
  if s is not null then
    select reason into r from public.user_moderation where user_id = new.user_id;
    raise exception 'You can''t post or comment right now (%).%', s, case when coalesce(r, '') <> '' then ' Reason: ' || r else '' end;
  end if;
  return new;
end $$;

drop trigger if exists posts_enforce_can_post on public.posts;
create trigger posts_enforce_can_post before insert on public.posts for each row execute function public.enforce_can_post();
drop trigger if exists comments_enforce_can_post on public.comments;
create trigger comments_enforce_can_post before insert on public.comments for each row execute function public.enforce_can_post();

-- 4) reports -------------------------------------------------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  target_user uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  created_at timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);
create unique index if not exists reports_once_per_post on public.reports (reporter, post_id) where post_id is not null;
create unique index if not exists reports_once_per_comment on public.reports (reporter, comment_id) where comment_id is not null;
alter table public.reports enable row level security;
drop policy if exists "read own reports" on public.reports;
create policy "read own reports" on public.reports for select to authenticated using (auth.uid() = reporter);

create or replace function public.submit_report(post uuid, comment uuid, why text)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); tgt uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if post is null and comment is null then raise exception 'Nothing to report'; end if;
  if post is not null then select user_id into tgt from public.posts where id = post; else select user_id into tgt from public.comments where id = comment; end if;
  if tgt is null then raise exception 'That is no longer there'; end if;
  if tgt = me then raise exception 'You can delete your own posts and comments instead'; end if;
  insert into public.reports (reporter, target_user, post_id, comment_id, reason)
  values (me, tgt, post, case when post is null then comment else null end, left(coalesce(nullif(trim(why), ''), 'Other'), 300))
  on conflict do nothing;
end $$;
grant execute on function public.submit_report(uuid, uuid, text) to authenticated;

-- 5) announcements (shown to everyone) -----------------------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '' check (char_length(body) <= 600),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);
alter table public.announcements enable row level security;
drop policy if exists "members read announcements" on public.announcements;
create policy "members read announcements" on public.announcements for select to authenticated using (true);

-- 6) coin grants (an admin can add or remove coins; they count in coin_balance) ---------------------------------------------------
create table if not exists public.coin_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  note text not null default '',
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.coin_grants enable row level security;
drop policy if exists "read own coin grants" on public.coin_grants;
create policy "read own coin grants" on public.coin_grants for select to authenticated using (auth.uid() = user_id);

create or replace function public.coin_balance(uid uuid)
returns int language sql stable security definer set search_path = '' as $$
  with x as (select public.user_xp(uid) as xp),
       l as (select public.level_for_xp(xp) as lvl, xp from x)
  select greatest(0,
    floor(l.xp / 5.0)::int
    + 25 * ((l.lvl * (l.lvl + 1)) / 2 - 1)
    + coalesce((select sum(coins_paid) from public.user_achievements where user_id = uid), 0)
    + coalesce((select sum(amount) from public.coin_grants where user_id = uid), 0)
    - coalesce((select sum(price_paid) from public.purchases where user_id = uid), 0)
  )::int
  from l
$$;

-- 7) a log of what admins did ----------------------------------------------------------------------------------------------------
create table if not exists public.admin_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user uuid,
  detail text not null default '',
  created_at timestamptz not null default now()
);
alter table public.admin_log enable row level security;       -- no policies: only the functions below can read it

create or replace function public.admin_note(act text, tgt uuid, info text)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_log (admin_id, action, target_user, detail) values (auth.uid(), act, tgt, left(coalesce(info, ''), 500))
$$;
revoke all on function public.admin_note(text, uuid, text) from public, anon, authenticated;

-- 8) the dashboard functions. Each one refuses anyone who is not in app_admins. ---------------------------------------------------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'users',        (select count(*) from public.profiles),
    'new_7d',       (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_7d',    (select count(distinct user_id) from public.study_sessions where created_at > now() - interval '7 days'),
    'focus_hours_7d', (select round(coalesce(sum(minutes), 0) / 60.0, 1) from public.study_sessions where created_at > now() - interval '7 days'),
    'posts',        (select count(*) from public.posts),
    'posts_7d',     (select count(*) from public.posts where created_at > now() - interval '7 days'),
    'comments',     (select count(*) from public.comments),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'muted',        (select count(*) from public.user_moderation where status = 'muted' and (until is null or until > now())),
    'banned',       (select count(*) from public.user_moderation where status = 'banned' and (until is null or until > now())),
    'tasks_done_7d', (select count(*) from public.xp_log where earned_on > current_date - 7 and task_id is not null)
  );
end $$;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_list_users()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select jsonb_agg(t.u order by (t.u ->> 'created_at') desc) from (
      select jsonb_build_object(
        'id', p.id, 'display_name', p.display_name, 'username', p.username, 'college', p.college,
        'email', u.email, 'created_at', p.created_at, 'last_sign_in', u.last_sign_in_at,
        'xp', public.user_xp(p.id), 'level', public.level_for_xp(public.user_xp(p.id)), 'coins', public.coin_balance(p.id),
        'posts', (select count(*) from public.posts where user_id = p.id),
        'comments', (select count(*) from public.comments where user_id = p.id),
        'status', coalesce(public.posting_block(p.id), 'active'),
        'mod_reason', m.reason, 'mod_until', m.until, 'tos_version', p.tos_version
      ) as u
      from public.profiles p
      left join auth.users u on u.id = p.id
      left join public.user_moderation m on m.user_id = p.id
    ) t
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_recent_posts(n int default 40)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'user_id', p.user_id, 'author', pr.display_name, 'body', p.body, 'image_path', p.image_path,
      'created_at', p.created_at,
      'comments', (select count(*) from public.comments c where c.post_id = p.id),
      'reports', (select count(*) from public.reports r where r.post_id = p.id and r.status = 'open')
    ) order by p.created_at desc)
    from (select * from public.posts order by created_at desc limit greatest(1, least(n, 200))) p
    left join public.profiles pr on pr.id = p.user_id
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_recent_posts(int) to authenticated;

create or replace function public.admin_list_reports()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'reason', r.reason, 'status', r.status, 'created_at', r.created_at, 'resolution', r.resolution,
      'reporter', rp.display_name, 'target_user', r.target_user, 'target', tp.display_name,
      'post_id', r.post_id, 'comment_id', r.comment_id,
      'content', coalesce(po.body, co.body, ''), 'image_path', po.image_path
    ) order by (r.status = 'open') desc, r.created_at desc)
    from public.reports r
    left join public.profiles rp on rp.id = r.reporter
    left join public.profiles tp on tp.id = r.target_user
    left join public.posts po on po.id = r.post_id
    left join public.comments co on co.id = r.comment_id
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_list_reports() to authenticated;

create or replace function public.admin_set_moderation(uid uuid, new_status text, why text, days int default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if uid = auth.uid() then raise exception 'You can''t moderate your own account'; end if;
  if new_status = 'active' then
    delete from public.user_moderation where user_id = uid;
  elsif new_status in ('muted', 'banned') then
    insert into public.user_moderation (user_id, status, reason, until, updated_by)
    values (uid, new_status, left(coalesce(why, ''), 300), case when coalesce(days, 0) > 0 then now() + make_interval(days => days) end, auth.uid())
    on conflict (user_id) do update set status = excluded.status, reason = excluded.reason, until = excluded.until,
      updated_by = excluded.updated_by, updated_at = now();
  else
    raise exception 'Unknown status';
  end if;
  perform public.admin_note('set ' || new_status, uid, coalesce(why, '') || case when coalesce(days, 0) > 0 then ' (' || days || ' days)' else '' end);
end $$;
grant execute on function public.admin_set_moderation(uuid, text, text, int) to authenticated;

create or replace function public.admin_grant_coins(uid uuid, amount int, note text default '')
returns int language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if amount = 0 or abs(amount) > 20000 then raise exception 'Amount must be between -20000 and 20000 and not zero'; end if;
  insert into public.coin_grants (user_id, amount, note, granted_by) values (uid, amount, left(coalesce(note, ''), 200), auth.uid());
  perform public.admin_note('coins ' || amount, uid, note);
  return public.coin_balance(uid);
end $$;
grant execute on function public.admin_grant_coins(uuid, int, text) to authenticated;

create or replace function public.admin_grant_item(uid uuid, item text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.shop_items where id = item) then raise exception 'No such item'; end if;
  insert into public.purchases (user_id, item_id, price_paid) values (uid, item, 0) on conflict do nothing;
  perform public.admin_note('item ' || item, uid, '');
end $$;
grant execute on function public.admin_grant_item(uuid, text) to authenticated;

create or replace function public.admin_delete_post(pid uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare path text; owner uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select image_path, user_id into path, owner from public.posts where id = pid;
  delete from public.posts where id = pid;
  perform public.admin_note('delete post', owner, pid::text);
  return path;
end $$;
grant execute on function public.admin_delete_post(uuid) to authenticated;

create or replace function public.admin_delete_comment(cid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select user_id into owner from public.comments where id = cid;
  delete from public.comments where id = cid;
  perform public.admin_note('delete comment', owner, cid::text);
end $$;
grant execute on function public.admin_delete_comment(uuid) to authenticated;

create or replace function public.admin_resolve_report(rid uuid, outcome text default 'resolved')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.reports set status = 'resolved', resolution = left(coalesce(outcome, 'resolved'), 100) where id = rid;
  perform public.admin_note('resolve report', null, outcome);
end $$;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;

create or replace function public.admin_post_announcement(head text, msg text default '', days int default 7)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  insert into public.announcements (title, body, expires_at, created_by)
  values (left(head, 100), left(coalesce(msg, ''), 600), case when coalesce(days, 0) > 0 then now() + make_interval(days => days) end, auth.uid());
  perform public.admin_note('announcement', null, head);
end $$;
grant execute on function public.admin_post_announcement(text, text, int) to authenticated;

create or replace function public.admin_delete_announcement(aid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.announcements where id = aid;
  perform public.admin_note('delete announcement', null, aid::text);
end $$;
grant execute on function public.admin_delete_announcement(uuid) to authenticated;

create or replace function public.admin_recent_log(n int default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'created_at', l.created_at, 'action', l.action, 'detail', l.detail,
      'admin', ap.display_name, 'target', tp.display_name
    ) order by l.created_at desc)
    from (select * from public.admin_log order by created_at desc limit greatest(1, least(n, 200))) l
    left join public.profiles ap on ap.id = l.admin_id
    left join public.profiles tp on tp.id = l.target_user
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_recent_log(int) to authenticated;
