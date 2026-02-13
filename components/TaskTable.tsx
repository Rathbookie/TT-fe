"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { Task } from "@/types/task"
import TaskRow from "./TaskRow"

export default function TaskTable() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    const res = await apiFetch("/api/tasks/")

    if (res.ok) {
      const data = await res.json()

      if (Array.isArray(data)) {
        setTasks(data)
      } else if (Array.isArray(data.results)) {
        setTasks(data.results)
      } else {
        setTasks([])
      }
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="text-sm text-neutral-400">Loading...</div>
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b">
          <tr className="text-left text-neutral-500">
            <th className="px-6 py-3 font-medium">Title</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Version</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpdated={fetchTasks}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
