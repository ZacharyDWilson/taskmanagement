import { useAuth } from '../lib/auth.jsx'
import { useTasks } from '../lib/tasks.js'
import { useMyXp } from '../lib/xp.jsx'
import { usePomodoro } from '../lib/pomodoro.jsx'
import WeekProgress from '../components/WeekProgress.jsx'
import DueToday from '../components/DueToday.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import CanvasCard from '../components/CanvasCard.jsx'
import { useToast } from '../lib/toast.jsx'

// A read-only dashboard: how your week is going (and the assignments found for it), what's due today with the
// one-tap LOCK IN button, and the whole right side for the weekly leaderboard.
export default function Overview() {
  const { user } = useAuth()
  const { tasks, error, add } = useTasks()
  const toast = useToast()
  const timer = usePomodoro()
  const version = timer.logged
  const name = user.user_metadata?.display_name
  const { xp } = useMyXp()

  return (
    <div className="dash overview">
      <div className="col">
        <WeekProgress name={name} xp={xp} tasks={tasks} version={version} />
        <CanvasCard tasks={tasks} onAdd={(title, ...rest) => { toast(`✓ "${title}" added to your To Do`, 'info', { silent: true }); return add(title, ...rest) }} />
      </div>

      <div className="col">
        {error && <p className="warn">{error}</p>}
        <DueToday tasks={tasks} />
      </div>

      <div className="col">
        <Leaderboard version={version} />
      </div>
    </div>
  )
}
