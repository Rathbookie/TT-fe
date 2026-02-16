"use client"

import { useEffect, useState } from "react"
import { getTasks } from "@/lib/api"

export function useTasks() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [fullViewTask, setFullViewTask] = useState<any | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getTasks()
        setTasks(Array.isArray(data) ? data : data.results || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleDrawerFromTopBar = () => {
    if (selectedTask) {
      setSelectedTask(null)
    } else if (tasks.length > 0) {
      setSelectedTask(tasks[0])
    }
  }

  const toggleDrawer = (task: any) => {
    if (selectedTask?.id === task.id) {
      setSelectedTask(null)
    } else {
      setSelectedTask(task)
    }
  }

  const updateTaskInState = (updatedTask: any) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      )
    )
  }

  return {
    tasks,
    loading,
    selectedTask,
    setSelectedTask,
    fullViewTask,
    setFullViewTask,
    toggleDrawer,
    toggleDrawerFromTopBar,
    updateTaskInState,
  }
}
