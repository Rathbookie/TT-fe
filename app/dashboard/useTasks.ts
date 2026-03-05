"use client"

import { useEffect, useState } from "react"
import { apiFetchJson } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Task } from "@/types/task"

type TaskListResponse = {
  results?: Task[]
  total_pages?: number
  current_page?: number
  count?: number
}

export function useTasks(
  includeTerminal = false,
  boardFilterId: number | null = null,
  divisionFilterSlug: string | null = null
) {
  const { activeRole } = useAuth()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [fullViewTask, setFullViewTask] = useState<Task | null>(null)

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [count, setCount] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!activeRole) {
      setLoading(false)
      setError("Select an active role to load tasks.")
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          page_size: "20",
          include_terminal: includeTerminal ? "1" : "0",
        })
        if (boardFilterId) {
          params.set("board", String(boardFilterId))
        }
        if (divisionFilterSlug) {
          params.set("division", divisionFilterSlug)
        }
        const data = await apiFetchJson<TaskListResponse>(`/api/tasks/?${params.toString()}`)

        setTasks(data.results || [])
        setTotalPages(data.total_pages ?? 1)
        setCount(data.count ?? 0)
        if ((data.total_pages ?? 1) > 0 && currentPage > (data.total_pages ?? 1)) {
          setCurrentPage(1)
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err)
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to load tasks. Please retry."
        setError(message)
        // Keep the previous page data in place on transient failures.
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [activeRole, boardFilterId, currentPage, divisionFilterSlug, includeTerminal, reloadKey])

  const toggleDrawerFromTopBar = () => {
    if (selectedTask) {
      setSelectedTask(null)
    } else if (tasks.length > 0) {
      setSelectedTask(tasks[0])
    }
  }

  const toggleDrawer = (task: Task) => {
    if (selectedTask?.id === task.id) {
      setSelectedTask(null)
    } else {
      setSelectedTask(task)
    }
  }

  const updateTaskInState = (updatedTask: Task) => {
    setTasks((prev) => {
      const existingIndex = prev.findIndex((task) => task.id === updatedTask.id)
      if (existingIndex >= 0) {
        return prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      }
      // Subtasks are managed in task detail and should not appear in top-level task list.
      if (updatedTask.parent) {
        return prev
      }
      return [updatedTask, ...prev]
    })

    setSelectedTask(prev =>
      prev?.id === updatedTask.id ? updatedTask : prev
    )
  }

  return {
    tasks,
    loading,
    error,
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
    reload: () => setReloadKey((prev) => prev + 1),
  }
}
