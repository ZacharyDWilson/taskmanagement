-- Study Buddy: how long a room is yours, and live alerts. Run after 008_task_xp_and_themes.sql.

-- When the room is booked until (shown to everyone in the queue).
alter table public.study_queue add column if not exists room_until timestamptz;
grant update (room_until) on public.study_queue to authenticated;

-- Let the app hear about new queue entries and matches live (powers the alerts).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_queue'
  ) then
    alter publication supabase_realtime add table public.study_queue;
  end if;
end $$;
