import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import PickerModal from './PickerModal.jsx'
import { replayTour } from './Tour.jsx'

// How to use each page, in a few plain steps. The small ? button in the top bar opens the one for the page you are on.
const HELP = {
  '/': {
    title: 'Home',
    intro: 'Your week at a glance.',
    steps: [
      'The top card shows your level, XP and the hours you studied. Use the arrows to look at other weeks.',
      '"Due today" lists what is planned for today. Tick a task to finish it and earn XP.',
      'The leaderboard ranks this week\'s focus time. Tap a name to open that person\'s profile.',
      'If you connected Canvas, this week\'s assignments show here with an Add button.',
    ],
  },
  '/todo': {
    title: 'To Do',
    intro: 'Plan your week by dragging tasks onto days.',
    steps: [
      'Type a task under "To plan" and press Add. New tasks always start here, with no day.',
      'Drag a task onto a day (or onto the Day, Week or Month planner). On a phone, a row of day buttons pops up while you drag.',
      'Click a task to set its class, due date, time, category and notes.',
      'Use the class filter above the planner to show one subject at a time.',
      'Finished tasks tidy themselves away after two weeks, and tasks you never finished after three weeks. Your XP stays.',
    ],
  },
  '/feed': {
    title: 'Feed',
    intro: 'Share what you got done.',
    steps: [
      'Press "Share your progress". A photo is optional: a few words is enough. Pick a tag (Question, Win...) so friends can filter for it.',
      'React with an emoji (hold one to see who gave it), tap a photo to enlarge it, or open "Add a comment".',
      'You can fix the words of your post for 10 minutes, and delete your own posts and comments any time.',
      'Type @ in a post or comment to tag a friend. They are told in the mail button.',
      'Share a badge from Achievements, or your study time from the Study page, and it shows up here as a card.',
      'Posts disappear after 14 days. "Download my posts" on your profile saves yours as one file first.',
    ],
  },
  '/study': {
    title: 'Study',
    intro: 'Time your focus and study with friends.',
    steps: [
      'Pomodoro: press Start for a focus round (25 minutes by default). The time is saved for you when it ends. Change the lengths under the clock.',
      'Count up: a stopwatch for the whole day. Pause and resume whenever you like. At midnight the total is saved as study time and the clock resets to zero. "Save now" saves it early.',
      'Study Buddy: open yourself up to study together, or pick someone who is already open.',
      'Your focus minutes earn XP, 1 per minute, and climb the weekly leaderboard.',
    ],
  },
  '/profile': {
    title: 'Profile',
    intro: 'This is how friends see you.',
    steps: [
      'Open "Edit your profile" to change your name, picture, bio and colour. Press Save profile to keep changes.',
      'Under Style, pick a page theme, picture frame and banner. Ones you own show up here.',
      'Your badges sit under your level bar. Pin your favourites on the Achievements page.',
      'Coins come from XP and achievements. Spend them in the Shop.',
    ],
  },
  '/shop': {
    title: 'Shop',
    intro: 'Spend coins on how your page looks.',
    steps: [
      'Themes, banners, frames and timer styles each have a price in coins.',
      'Press the price to buy. Once you own something, press Equip (or choose it on your profile).',
      'Some styles are earn-only and cannot be bought. You unlock them with achievements.',
    ],
  },
  '/achievements': {
    title: 'Achievements',
    intro: 'Goals that earn badges and rewards.',
    steps: [
      'Each card shows how close you are. Reaching the goal unlocks the badge and its reward automatically.',
      'Rewards are coins, and a few exclusive styles you cannot buy.',
      'Pin up to 3 earned badges to show them first on your profile.',
    ],
  },
}

export default function PageHelp() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const key = pathname.startsWith('/profile') ? '/profile' : pathname.startsWith('/achievements') ? '/achievements' : pathname
  const page = HELP[key]
  if (!page) return null
  return (
    <>
      <button type="button" className="help-btn" onClick={() => setOpen(true)} aria-label={'How to use ' + page.title} title="How to use this page">?</button>
      {open && (
        <PickerModal title={page.title + ': how to use it'} hint={page.intro} onClose={() => setOpen(false)}>
          <ol className="help-steps">
            {page.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <div className="row">
            <button type="button" className="secondary" onClick={() => { setOpen(false); replayTour() }}>Replay the welcome tour</button>
          </div>
        </PickerModal>
      )}
    </>
  )
}
