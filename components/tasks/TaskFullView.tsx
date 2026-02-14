"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api" // adjust path if different

interface Props {
  task: any
  onClose: () => void
  onUpdate?: (updatedTask: any) => void
}

export default function TaskFullView({ task, onClose, onUpdate }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [currentTask, setCurrentTask] = useState(task)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)

    const response = await apiFetch(`/api/tasks/${currentTask.id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        version: currentTask.version, // REQUIRED for optimistic locking
      }),
    })

    if (response.status === 409) {
      alert("Conflict detected. Task was modified by someone else.")
      setLoading(false)
      return
    }

    if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    console.error("Update failed:", response.status, errorData)
    alert(JSON.stringify(errorData))
    setLoading(false)
    return
    }

    const updatedTask = await response.json()

    // Replace entire task locally (important for version update)
    setCurrentTask(updatedTask)

    if (onUpdate) {
      onUpdate(updatedTask)
    }

    setLoading(false)
  }

  return (
    <div className="bg-neutral-100 rounded-3xl p-10 w-full h-full flex flex-col">
      <div className="flex justify-between mb-8">
        <h1 className="text-2xl font-semibold">
          Edit: {currentTask.title}
        </h1>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border"
        >
          Close
        </button>
      </div>

      <div className="space-y-6 flex-1">
        <input
          className="w-full border rounded-xl p-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border rounded-xl p-3 h-40"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex gap-4">
          <div>
            <strong>Status:</strong> {currentTask.status}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="mt-auto bg-black text-white px-6 py-3 rounded-xl"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  )
}
