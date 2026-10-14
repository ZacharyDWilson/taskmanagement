-- Post text can be up to 280 characters in the app (MAX_CAPTION in Feed.jsx), but the database still stopped at 140,
-- so any longer post failed with: violates check constraint "posts_caption_len". Bring the database up to 280.
alter table public.posts drop constraint if exists posts_caption_len;
alter table public.posts add constraint posts_caption_len check (char_length(body) <= 280);
