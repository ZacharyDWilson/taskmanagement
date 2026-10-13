import { useState } from 'react'
import { classesFrom, useTasks } from '../lib/tasks.js'
import { levelFromXp } from '../lib/levels.js'
import { useMyXp } from '../lib/xp.jsx'
import { useToast } from '../lib/toast.jsx'
import { isDemoId } from '../lib/demo.js' // DEMO
import Inbox from '../components/Inbox.jsx'
import WeekPlanner from '../components/WeekPlanner.jsx'
import TaskModal from '../components/TaskModal.jsx'

export default function Todo() {
  const { tasks, error, add, update, toggle, move, remove } = useTasks()
  const { xp, refresh } = useMyXp()
  const toast = useToast()
  const [openId, setOpenId] = useState(null)
  const openTask = tasks.find(t => t.id === openId)

  // Run a change that might finish (or un-finish) a task, then say what it did to your XP.
  // `finishing` is true when the task is being completed, false when it's being un-completed.
  async function withXp(task, finishing, run) {
    const before = xp ?? 0
    await run()
    if (finishing === null || isDemoId(task.id)) return // DEMO: filler tasks are local only and earn nothing
    const after = await refresh()
    const gained = after - before
    if (finishing) {
      if (gained > 0) toast(`+${gained} XP for finishing "${task.title}"`, 'xp')
      else toast("That's today's task XP limit (10 tasks). Great work!", 'info')
      const lvBefore = levelFromXp(before)
      const lvAfter = levelFromXp(after)
      if (lvAfter > lvBefore) {
        let bonus = 0
        for (let l = lvBefore + 1; l <= lvAfter; l++) bonus += 25 * l
        toast(`🎉 Level up! You're now level ${lvAfter}. Bonus: +${bonus} coins`, 'level')
      }
    } else if (gained < 0) {
      toast(`${gained} XP (task marked not done)`, 'info')
    }
  }

  const toggleTask = task => withXp(task, !task.done, () => toggle(task))
  const saveTask = (task, patch) =>
    withXp(task, patch.done !== task.done ? patch.done : null, () => update(task, patch))

  return (
    <div className="todo">
      {error && <p className="warn todo-error">{error}</p>}
      <Inbox tasks={tasks} add={add} toggle={toggleTask} remove={remove} move={move}
        onOpen={t => setOpenId(t.id)} />
      <WeekPlanner tasks={tasks} add={add} toggle={toggleTask} remove={remove} move={move}
        onOpen={t => setOpenId(t.id)} />
      {openTask && (
        <TaskModal
          key={openTask.id}
          task={openTask}
          courses={classesFrom(tasks)}
          onSave={patch => saveTask(openTask, patch)}
          onDelete={() => remove(openTask)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
