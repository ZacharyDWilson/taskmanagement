-- Calendar links from Brightspace (or any school calendar) as well as Canvas, and a looser link check. Safe to re-run.
-- Run after 026_timer_bundles.sql.
--
-- The link is still private to its owner (see 014_canvas.sql). The table keeps its name; "provider" says where it came from.
alter table public.canvas_feeds add column if not exists provider text not null default 'canvas';
alter table public.canvas_feeds drop constraint if exists canvas_feeds_provider_check;
alter table public.canvas_feeds add constraint canvas_feeds_provider_check check (provider in ('canvas', 'brightspace', 'other'));

-- any https link (Brightspace links end in .ics?token=... and some schools use other shapes)
alter table public.canvas_feeds drop constraint if exists canvas_feeds_url_check;
alter table public.canvas_feeds add constraint canvas_feeds_url_check
  check (url ~ '^https://[^ ]+$' and char_length(url) <= 1000);
