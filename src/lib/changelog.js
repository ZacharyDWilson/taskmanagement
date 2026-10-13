// The version history people see in the mail (inbox) pop-up, newest first. A plain-language version of what went out.
// Add a new entry at the TOP with every release: the first entry's version is the one shown top left (src/lib/version.js).
// { version, date: 'YYYY-MM-DD', title, points: [short bullet, ...] }
export const CHANGELOG = [
  {
    version: '2.18', date: '2026-10-14', title: 'A clearer Overview',
    points: [
      'A single LOCK IN: Focus button now sits at the top of Due today.',
      'Canvas / Brightspace assignments moved under your week and show a short summary ("Found 3 assignments") for this week and next. Open shows the full list by day with Add, or Add all.',
      'Your week card fits without scrolling: your name, level and XP share one line, and the day bars stretch to the space available.',
      'The leaderboard has the whole right side: your place and how far the next person is, a podium for the top three, and bars for everyone else.',
    ],
  },
  {
    version: '2.17', date: '2026-10-14', title: 'Notifications and tagging friends',
    points: [
      'The mail button has a new "For you" tab: comments on your posts, reactions (grouped, so three people is one line) and when someone tags you.',
      'Type @ in a post or a comment to tag a friend. Their name becomes a link to their profile and they get a notification.',
      'Up to 5 people per post or comment. Notifications clear themselves after 30 days.',
    ],
  },
  {
    version: '2.16', date: '2026-10-14', title: 'Share cards and pinned posts',
    points: [
      'Share a badge you earned from the Achievements page: it appears on the feed as a card with the badge and its name.',
      'Share your study time for today or this week from the Study page. The numbers come from your real sessions, so a card cannot be made up.',
      'The admin can pin up to 3 posts to the top of the feed. Pinned posts stay until they are unpinned.',
      'Share buttons now show what will be posted and wait for "Post to feed", so nothing is posted by accident.',
      'Deleting a post is two taps in the post itself (no browser pop-up), and shows a message if it could not be deleted.',
    ],
  },
  {
    version: '2.15', date: '2026-10-14', title: 'A richer feed, and a lighter site',
    points: [
      'Posts can be just words, with an optional photo and a tag: Study session, Finished something, Question, Win or Need motivation.',
      'New on the feed: filter tabs (All, Mine, Questions, Wins), a "Has photo" switch, Load more, times like "2h ago", tap a photo to enlarge it, and hold a reaction to see who gave it.',
      'You can fix the words of your post for 10 minutes. Reactions now update at once.',
      'Posts disappear after 14 days to keep the site free. "Download my posts" on your profile saves yours, with photos, as one file.',
      'Finished tasks tidy away after two weeks, and tasks you never finished after three. Your XP and achievements are not affected.',
      'Photos load smaller and faster, and profile pictures are stored at a sensible size.',
    ],
  },
  {
    version: '2.14', date: '2026-10-13', title: 'Top bar card follows your saved profile, and a calmer default background',
    points: [
      'The small profile card at the top now updates as soon as you save your picture, colour or banner.',
      'The default banner is now called Checker: a very light grey and white checkerboard, turned on its side in large squares.',
      'The edit-profile form is one field per row on narrow screens, so names and the file picker are no longer cut off.',
    ],
  },
  {
    version: '2.13', date: '2026-10-13', title: 'Inbox for announcements and version history',
    points: [
      'A new mail button at the top, next to Settings. It holds announcements from the admin and the version history, and shows a small dot when something is new.',
      'Big updates now pop up once when you open the app. Close it and the dot stays until you open the inbox.',
      'The Settings button is just the gear now.',
      'A calmer top bar: your level and coins are together in one small card with your banner and picture, and the version number moved into Settings and Mail.',
    ],
  },
  {
    version: '2.12', date: '2026-10-13', title: 'Version label and a fully still side bar',
    points: [
      'The version number is shown at the top and in Settings.',
      'Turning off "Animate the side bar" now means it really is still, even when you hover.',
      'A clearer gear icon for Settings.',
    ],
  },
  {
    version: '2.11', date: '2026-10-13', title: 'Profile fits short screens',
    points: [
      'Fixed the profile being cut off on small laptops and Chromebooks.',
      'Posts are a short strip you scroll sideways, with your numbers and study bars under it.',
      'New setting: turn off the side bar animations on their own.',
    ],
  },
  {
    version: '2.8 to 2.10', date: '2026-10-13', title: 'Community rules, one at a time',
    points: [
      'The rules are read and agreed to one by one, each with a short pause, then confirmed together.',
      'Everyone re-accepts the new version the next time they open the app.',
    ],
  },
  {
    version: '2.7', date: '2026-10-13', title: 'Rules, reporting and moderation',
    points: [
      'A community rules page, and a Report link on other people\'s posts and comments.',
      'Mutes and bans from posting and commenting, applied by the database itself.',
      'An admin dashboard for people, reports, posts and announcements.',
    ],
  },
  {
    version: '2.6', date: '2026-10-13', title: 'Count-up timer, timer bundles and Brightspace',
    points: [
      'Study now has a Count up stopwatch for the whole day, saved as study time at midnight.',
      'Six new timer styles, sold in bundles. Every style works for both timers.',
      'Brightspace calendars can be connected as well as Canvas.',
      'A small ? button on every page explains how to use it.',
    ],
  },
  {
    version: '2.4 to 2.5', date: '2026-10-13', title: 'Achievements',
    points: [
      '21 achievements with badges on your profile, coin rewards, and a few styles you can only earn.',
      'Everyone\'s badges are visible on their profile, the leaderboard and the feed.',
    ],
  },
  {
    version: '2.3', date: '2026-10-13', title: 'More banners and lighter on old phones',
    points: [
      'Ten new banners: chalkboard, terminal, circuit board, science lab, stadium, hardwood, campus, skyline, library and paint.',
      'Theme cards now show a picture of the page and its colours.',
      'Small pop-ups for posting, commenting, choosing a photo and planning tasks.',
      'Calm mode also drops the frosted blur, which helps older phones.',
    ],
  },
  {
    version: '2.1 to 2.2', date: '2026-10-13', title: 'Handheld Glow, Coral Shore shells and fair prices',
    points: [
      'New Handheld Glow theme with glossy console-style buttons.',
      'Coral Shore\'s side buttons are seashells.',
      'One clear price scale for themes, banners and frames.',
    ],
  },
  {
    version: '2.0', date: '2026-10-13', title: 'Smoother theme changes',
    points: [
      'A short loading page when you switch themes, and a pop-up when your picture, frame or banner updates.',
      'Study-time bars fill in their own way in each theme.',
    ],
  },
  {
    version: '1.5 to 1.9', date: '2026-10-13', title: 'A calmer To Do and more themes',
    points: [
      'Tasks are added in one place (To plan) and dragged onto days.',
      'The planner has Day, Week and Month views and a class filter.',
      'Canvas assignments are shown a week at a time, and finished tasks tidy themselves away after a week.',
      'Dusty Rose and Glazed Tile themes, a liquid tab bar on phones, and an install-the-app section.',
    ],
  },
  {
    version: '1.0 to 1.4', date: '2026-10-13', title: 'Settings, a logo and more ways to look',
    points: [
      'A Settings menu for sounds, motion and notifications, and a new LOCK IN logo.',
      'Calm mode, many new frames, animated GIF profile pictures, themed side buttons and Frutiger Aero.',
      'Canvas assignments and an install prompt.',
    ],
  },
  {
    version: '0.1 to 0.95', date: '2026-10-12', title: 'The first versions',
    points: [
      'To Do and a weekly planner, a focus timer, a progress feed, a leaderboard and Study Buddy.',
      'XP, levels, coins and the Shop, with themes, banners, frames and timer styles.',
      'A welcome tour and a login splash.',
    ],
  },
]
