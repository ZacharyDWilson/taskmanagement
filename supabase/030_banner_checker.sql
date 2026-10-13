-- The default banner is now a quiet light checkerboard, so call it "Checker" instead of "Solid". Safe to re-run.
-- Run after 029_updates_mail.sql. (The id stays banner-solid so nobody's saved choice changes.)
update public.cosmetics set name = 'Checker' where id = 'banner-solid';
