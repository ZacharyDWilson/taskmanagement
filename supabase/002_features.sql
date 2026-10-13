-- Run after schema.sql. Adds profiles, tasks, study sessions, reactions, leaderboard.

-- Profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Friend',
  bio text not null default '' check (char_length(bio) <= 200),
  avatar_path text,
  color text not null default 'blue',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "members read profiles" on public.profiles
  for select to authenticated using (true);
create policy "members insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "members update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile automatically whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for anyone who signed up before this ran.
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- Posts: image + short caption --------------------------------------------
alter table public.posts add column if not exists image_path text;
alter table public.posts add constraint posts_caption_len check (char_length(body) <= 140) not valid;
alter table public.posts add constraint posts_user_profile_fk
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Reactions ----------------------------------------------------------------
create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('like', 'fire', 'clap', 'strong')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);
alter table public.reactions enable row level security;

create policy "members read reactions" on public.reactions
  for select to authenticated using (true);
create policy "members add own reactions" on public.reactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "members remove own reactions" on public.reactions
  for delete to authenticated using (auth.uid() = user_id);

-- Tasks (daily list + week planner) ---------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  day date not null,
  color text not null default 'blue',
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_day on public.tasks (user_id, day);
alter table public.tasks enable row level security;

create policy "own tasks select" on public.tasks
  for select to authenticated using (auth.uid() = user_id);
create policy "own tasks insert" on public.tasks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own tasks update" on public.tasks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks delete" on public.tasks
  for delete to authenticated using (auth.uid() = user_id);

-- Study sessions (from the Pomodoro timer) --------------------------------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  minutes int not null check (minutes between 1 and 240),
  created_at timestamptz not null default now()
);
create index if not exists study_sessions_user_time on public.study_sessions (user_id, created_at);
alter table public.study_sessions enable row level security;

create policy "members read sessions" on public.study_sessions
  for select to authenticated using (true);
create policy "members add own sessions" on public.study_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "members delete own sessions" on public.study_sessions
  for delete to authenticated using (auth.uid() = user_id);

-- Weekly leaderboard -------------------------------------------------------
create or replace function public.weekly_leaderboard(since timestamptz)
returns table (user_id uuid, display_name text, avatar_path text, color text, minutes int)
language sql stable security invoker as $$
  select p.id, p.display_name, p.avatar_path, p.color, sum(s.minutes)::int
  from public.study_sessions s
  join public.profiles p on p.id = s.user_id
  where s.created_at >= since
  group by p.id, p.display_name, p.avatar_path, p.color
  order by 5 desc
  limit 20
$$;
