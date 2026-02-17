"use client"

import { useEffect, useState } from "react"
import { apiFetchJson } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

export function useTasks() {
  const { activeRole } = useAuth()

  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [fullViewTask, setFullViewTask] = useState<any | null>(null)

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!activeRole) return

    const load = async () => {
      setLoading(true)
      try {
        const data = await apiFetchJson(
          `/api/tasks/?page=${currentPage}`,
          {
            headers: {
              "X-Active-Role": activeRole,
            },
          }
        )

        setTasks(data.results || [])
        setTotalPages(data.total_pages ?? 1)
        setCount(data.count ?? 0)
      } catch (err) {
        console.error("Failed to fetch tasks", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [activeRole, currentPage])

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

    // ✅ expose pagination
    currentPage,
    totalPages,
    count,
    setCurrentPage,
  }
}
