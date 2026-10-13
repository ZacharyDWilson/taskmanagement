import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { addDays, isoDate, startOfWeek } from './dates.js'
import { DEMO, demoTasks, isDemoId } from './demo.js' // DEMO

export const CATEGORIES = ['Homework', 'Exam', 'Project', 'Reading', 'Study', 'Work', 'Personal', 'Other']

// The classes/subjects already used on tasks, most recently used first.
export function classesFrom(tasks) {
  const sorted = [...tasks].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  return [...new Set(sorted.map(t => t.course).filter(Boolean))]
}

// Loads every unscheduled task plus a window around the current week,
// so the planner can page a few weeks either way.
export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [demo, setDemo] = useState(() => (DEMO ? demoTasks() : [])) // DEMO: local-only filler tasks

  const load = useCallback(async () => {
    const week = startOfWeek()
    const from = isoDate(addDays(week, -28))
    const to = isoDate(addDays(week, 90))
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`day.is.null,and(day.gte.${from},day.lte.${to})`)
      .order('created_at')
    if (error) setError(error.message)
    else setTasks(data)
  }, [])

  useEffect(() => { load() }, [load])

  // `day` may be null (goes to the To plan list). `extra` can hold course, category, due_date, etc.
  async function add(title, day, color, extra = {}) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title, day, color, user_id: user.id, ...extra })
      .select()
      .single()
    if (error) return setError(error.message)
    setTasks(t => [...t, data])
  }

  async function update(task, patch) {
    if (isDemoId(task.id)) { // DEMO
      return setDemo(d => d.map(x => (x.id === task.id ? { ...x, ...patch } : x)))
    }
    setTasks(t => t.map(x => (x.id === task.id ? { ...x, ...patch } : x)))
    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id)
    if (error) { setError(error.message); load() }
  }

  const toggle = task => update(task, { done: !task.done })
  const move = (task, day) => update(task, { day })

  async function remove(task) {
    if (isDemoId(task.id)) return setDemo(d => d.filter(x => x.id !== task.id)) // DEMO
    setTasks(t => t.filter(x => x.id !== task.id))
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) { setError(error.message); load() }
  }

  return { tasks: [...demo, ...tasks], error, add, update, toggle, move, remove } // DEMO: was `tasks`
}
