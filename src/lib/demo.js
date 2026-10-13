// FILLER DATA for the test version. Nothing here touches the database.
//
// Turn it on/off with VITE_DEMO_DATA=true/false in .env (restart the dev server after changing it).
// To remove it for good: delete this file, then delete every line marked "DEMO" (search for "DEMO").
import { addDays, isoDate, startOfWeek } from './dates.js'

export const DEMO = import.meta.env.VITE_DEMO_DATA === 'true'
export const isDemoId = id => typeof id === 'string' && id.startsWith('demo-')

const PEOPLE = {
  priya: { display_name: 'Priya', color: 'purple', frame: 'frame-rainbow' },
  maya: { display_name: 'Maya', color: 'pink', frame: 'frame-gold' },
  jordan: { display_name: 'Jordan', color: 'blue', frame: 'frame-gradient' },
  sam: { display_name: 'Sam', color: 'green', frame: 'frame-ring' },
  alex: { display_name: 'Alex', color: 'amber', frame: 'frame-none' },
}
const person = key => ({ ...PEOPLE[key], avatar_path: null })
const uid = key => `demo-${key}`
const minsAgo = m => new Date(Date.now() - m * 60000).toISOString()

// Leaderboard ---------------------------------------------------------------
const WEEK_MINUTES = { priya: 640, maya: 515, jordan: 380, sam: 215, alex: 90 }
export const demoLeaderboard = () =>
  Object.entries(WEEK_MINUTES)
    .map(([key, minutes]) => ({ user_id: uid(key), ...person(key), minutes }))

// Tasks (your own, spread over this week) -----------------------------------
export function demoTasks() {
  const week = startOfWeek()
  const todayIdx = (new Date().getDay() + 6) % 7
  const day = i => isoDate(addDays(week, i))
  const list = [
    [0, 'Read chapter 4 of Biology', 'green', true],
    [0, 'Finish calc problem set', 'blue', true],
    [1, 'Lab report first draft', 'red', true],
    [2, 'Study group: organic chem', 'purple', false],
    [3, 'History essay outline', 'amber', false],
    [4, 'Quiz review: Spanish vocab', 'teal', false],
    [5, 'Laundry + meal prep', 'pink', false],
    [todayIdx, 'Review lecture notes', 'blue', false],
    [todayIdx, 'Email professor about the essay', 'amber', false],
    [todayIdx, '30 min of flashcards', 'purple', true],
  ]
  const blank = { course: '', category: '', due_date: null, due_time: null, criteria: '', notes: '' }
  const details = {
    0: { course: 'Biology 101', category: 'Reading' },
    1: { course: 'Calculus II', category: 'Homework', due_date: day(0) },
    2: { course: 'Biology 101', category: 'Homework' },
    3: { course: 'Organic Chemistry', category: 'Study', due_date: day(2) },
    4: {
      course: 'US History', category: 'Project', due_date: day(4), due_time: '23:59:00',
      criteria: '3 pages, at least 5 sources, clear thesis statement, MLA format.',
      notes: 'Professor recommended the library database over Google.',
    },
    5: { course: 'Spanish 201', category: 'Exam', due_date: day(4) },
  }
  const scheduled = list.map(([i, title, color, done], n) => ({
    ...blank, id: `demo-task-${n}`, title, day: day(i), color, done, created_at: minsAgo(600 - n),
    ...(details[n] ?? {}),
  }))
  // Not scheduled yet: these sit in the "To plan" list until dragged onto a day.
  const unscheduled = [
    ['Start research paper bibliography', 'US History', 'Project', 'amber'],
    ['Read lab handout for Thursday', 'Chemistry', 'Reading', 'green'],
    ['Plan study group schedule', '', 'Personal', 'pink'],
  ].map(([title, course, category, color], n) => ({
    ...blank, id: `demo-task-inbox-${n}`, title, day: null, color, done: false, course, category,
    created_at: minsAgo(300 - n),
  }))
  return [...scheduled, ...unscheduled]
}

// Past days' focus time for the weekly stats ---------------------------------
export function demoSessions() {
  const week = startOfWeek()
  const todayIdx = (new Date().getDay() + 6) % 7
  const minutes = [50, 75, 40, 90, 60, 35, 0]
  return minutes.flatMap((m, i) => {
    if (i > todayIdx || !m) return []
    const at = addDays(week, i)
    at.setHours(i === todayIdx ? 0 : 14, 5, 0, 0) // today's filler session is just after midnight

    return [{ minutes: m, created_at: at.toISOString() }]
  })
}

// Feed posts -----------------------------------------------------------------
const art = (a, b, label) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/>` +
    `<stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="640" height="400" fill="url(#g)"/>` +
    `<text x="320" y="225" font-size="72" text-anchor="middle" fill="white" font-family="sans-serif">${label}</text></svg>`)

const react = (kind, ...keys) => keys.map(k => ({ kind, user_id: uid(k) }))

export const demoPosts = () => [
  {
    id: 'demo-post-1', user_id: uid('priya'), body: 'Chem notes done. 2 hours in the library, no phone.',
    image_url: art('#7c3aed', '#c026d3', '📚 Chem notes'), created_at: minsAgo(35),
    profiles: person('priya'),
    reactions: [...react('fire', 'maya', 'jordan', 'sam'), ...react('like', 'alex')],
  },
  {
    id: 'demo-post-2', user_id: uid('maya'), body: 'Finished the whole problem set before dinner!',
    image_url: art('#0ea5e9', '#2563eb', '✏️ Problem set'), created_at: minsAgo(190),
    profiles: person('maya'),
    reactions: [...react('clap', 'priya', 'sam'), ...react('strong', 'jordan')],
  },
  {
    id: 'demo-post-3', user_id: uid('jordan'), body: 'Coffee + flashcards before my 9am.',
    image_url: art('#f59e0b', '#ef4444', '☕ Flashcards'), created_at: minsAgo(60 * 20),
    profiles: person('jordan'),
    reactions: [...react('like', 'maya', 'priya')],
  },
].map(p => ({ ...p, demo: true }))

// Feed comments ----------------------------------------------------------------
const comment = (id, key, body, mins) =>
  ({ id, user_id: uid(key), body, created_at: minsAgo(mins), profiles: person(key) })
const DEMO_COMMENTS = {
  'demo-post-1': [
    comment('demo-c-1', 'maya', 'Okay Priya, that focus is unreal 🔥', 20),
    comment('demo-c-2', 'jordan', 'What time did you start?', 12),
  ],
  'demo-post-2': [comment('demo-c-3', 'sam', 'Teach me your ways', 120)],
}
export const demoComments = postId => [...(DEMO_COMMENTS[postId] ?? [])]

// Study Buddy queue ------------------------------------------------------------
export const demoQueue = () => [
  { user_id: uid('jordan'), role: 'have_room', room: 'Jenks 421', note: 'Orgo midterm review',
    matched_with: null, joined_at: minsAgo(12), profiles: person('jordan') },
  { user_id: uid('sam'), role: 'need_room', room: '', note: 'Writing a history essay',
    matched_with: null, joined_at: minsAgo(25), profiles: person('sam') },
  { user_id: uid('priya'), role: 'need_room', room: '', note: 'Calc II practice problems',
    matched_with: null, joined_at: minsAgo(40), profiles: person('priya') },
]

// Profile pages for the filler friends (/#/profile/demo-priya, etc.) ---------------
// XP values are chosen so each person's frame and banner are ones they'd really have unlocked.
const PROFILE_EXTRA = {
  priya: { bio: 'Pre-med, coffee-fueled, library regular. Ask me about orgo. 📚', banner: 'banner-aurora', xp: 3200 },
  maya: { bio: 'Calc grind. Plant mom. Study sessions are better with snacks.', banner: 'banner-sunset', xp: 1500 },
  jordan: { bio: 'Chem major. 9am classes are a personality.', banner: 'banner-ocean', xp: 1100 },
  sam: { bio: 'History nerd. Essay procrastinator in recovery.', banner: 'banner-solid', xp: 400 },
  alex: { bio: 'New here, trying to build a streak.', banner: 'banner-solid', xp: 120 },
}
const GALLERY = [
  ['#7c3aed', '#c026d3', '📚 Notes'], ['#0ea5e9', '#2563eb', '✏️ Practice'], ['#10b981', '#06b6d4', '🧪 Lab'],
  ['#f59e0b', '#ef4444', '☕ Late night'], ['#ec4899', '#8b5cf6', '🧠 Flashcards'], ['#14b8a6', '#22c55e', '📖 Reading'],
]

export function demoProfile(id) {
  const key = String(id).replace('demo-', '')
  if (!PEOPLE[key]) return null
  const { bio, banner, xp } = PROFILE_EXTRA[key]
  return {
    profile: { id, ...person(key), bio, banner },
    xp,
    minutes: WEEK_MINUTES[key],
    posts: GALLERY.slice(0, key === 'priya' ? 6 : 3)
      .map(([a, b, label], n) => ({ id: `demo-gallery-${key}-${n}`, body: label, image_url: art(a, b, label) })),
  }
}
