import { useState } from 'react'
import { useTasks } from '../lib/tasks.js'
import Inbox from '../components/Inbox.jsx'
import WeekPlanner from '../components/WeekPlanner.jsx'
import TaskModal from '../components/TaskModal.jsx'

export default function Todo() {
  const { tasks, error, add, update, toggle, move, remove } = useTasks()
  const [openId, setOpenId] = useState(null)
  const openTask = tasks.find(t => t.id === openId)
  const courses = [...new Set(tasks.map(t => t.course).filter(Boolean))]

  return (
    <div className="todo">
      {error && <p className="warn todo-error">{error}</p>}
      <Inbox tasks={tasks} add={add} toggle={toggle} remove={remove} move={move}
        onOpen={t => setOpenId(t.id)} />
      <WeekPlanner tasks={tasks} add={add} toggle={toggle} remove={remove} move={move}
        onOpen={t => setOpenId(t.id)} />
      {openTask && (
        <TaskModal
          key={openTask.id}
          task={openTask}
          courses={courses}
          onSave={patch => update(openTask, patch)}
          onDelete={() => remove(openTask)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
