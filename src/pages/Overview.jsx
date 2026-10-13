import { useState } from 'react'
import { Link } from 'react-router-dom'
import TaskModal from '../components/TaskModal.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useTasks } from '../lib/tasks.js'
import { useXp } from '../lib/levels.js'
import { usePomodoro, mmss } from '../lib/pomodoro.jsx'
import LevelCard from '../components/LevelCard.jsx'
import WeekStats from '../components/WeekStats.jsx'
import TodayList from '../components/TodayList.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import CanvasCard from '../components/CanvasCard.jsx'

export default function Overview() {
  const { user } = useAuth()
  const { tasks, error, add, update, toggle, remove } = useTasks()
  const [openId, setOpenId] = useState(null)
  const openTask = tasks.find(t => t.id === openId)
  const courses = [...new Set(tasks.map(t => t.course).filter(Boolean))]
  const timer = usePomodoro()
  const version = timer.logged
  const name = user.user_metadata?.display_name
  const xp = useXp(user.id, version)

  return (
    <div className="dash">
      <div className="col">
        <section className="card">
          <h1>Hey{name ? `, ${name}` : ''} 👋</h1>
          <LevelCard xp={xp} />
        </section>
        <WeekStats tasks={tasks} version={version} />
        {error && <p className="warn">{error}</p>}
        <TodayList tasks={tasks} add={add} toggle={toggle} remove={remove} onOpen={t => setOpenId(t.id)} />
      </div>
      <div className="col">
        <section className="card">
          <h2>Focus</h2>
          <p className="muted">
            {timer.running
              ? `${timer.mode === 'focus' ? 'Focusing' : 'On break'}, ${mmss(timer.left)} left.`
              : 'Ready when you are.'}
          </p>
          <Link to="/pomodoro"><button>{timer.running ? 'Open timer' : 'Start a focus session'}</button></Link>
        </section>
        <CanvasCard />
        <Leaderboard version={version} />
      </div>
      {openTask && (
        <TaskModal key={openTask.id} task={openTask} courses={courses}
          onSave={patch => update(openTask, patch)} onDelete={() => remove(openTask)}
          onClose={() => setOpenId(null)} />
      )}
    </div>
  )
}
