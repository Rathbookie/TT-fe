"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { Task } from "@/types/task"

type Props = {
  task: Task
  onUpdated: () => void
}

export default function TaskRow({ task, onUpdated }: Props) {
  const [title, setTitle] = useState(task.title)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (title === task.title) {
      setEditing(false)
      return
    }

    setSaving(true)

    const res = await apiFetch(`/api/tasks/${task.id}/`, {
      method: "PUT",
      body: JSON.stringify({
        ...task,
        title,
        version: task.version,
      }),
    })

    if (res.status === 409) {
      alert("Task updated elsewhere. Refreshing.")
      onUpdated()
    } else if (res.ok) {
      onUpdated()
    }

    setSaving(false)
    setEditing(false)
  }

  return (
    <tr className="border-b last:border-none hover:bg-neutral-50 transition">
      <td className="px-6 py-4">
        {editing ? (
          <input
            className="w-full border rounded-md px-2 py-1 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="cursor-text"
          >
            {saving ? "Saving..." : title}
          </div>
        )}
      </td>

      <td className="px-6 py-4 text-neutral-500">
        {task.status}
      </td>

      <td className="px-6 py-4 text-neutral-400">
        {task.version}
      </td>
    </tr>
  )
}
