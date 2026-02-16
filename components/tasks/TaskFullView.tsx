"use client"

import { useState } from "react"
import { Task, TaskPriority } from "@/types/task"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { useEffect } from "react"

type Props = {
  task?: Task | null
  mode: "create" | "edit"
  onClose: () => void
  onSaved: (savedTask: any) => void
}

export default function TaskFullView({
  task,
  mode,
  onClose,
  onSaved,
}: Props) {
  console.log("TASK IN FULL VIEW:", task)
  const isCreate = mode === "create"
  const isTerminal = task?.status === "DONE"

  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [priority, setPriority] = useState<TaskPriority | "">(
    task?.priority || ""
  )

  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.slice(0, 10) : ""
  )

  const [dueTime, setDueTime] = useState(
    task?.due_date ? task.due_date.slice(11, 16) : ""
  )

  const [assignedToId, setAssignedToId] = useState<number | null>(
    task?.assigned_to?.id || null
  )

  const [userSearch, setUserSearch] = useState("")
  const [userResults, setUserResults] = useState<any[]>([])

  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const [existingAttachments, setExistingAttachments] = useState<any[]>(task?.attachments || [])

  // 🔎 User Search
  const fetchUsers = async (q: string) => {
    if (!q.trim()) {
      setUserResults([])
      return
    }

    try {
      const data = await apiFetchJson(
        `/api/users/?search=${encodeURIComponent(q)}`
      )

      setUserResults(data.results || [])
    } catch (err) {
      console.error(err)
      setUserResults([])
    }
  }

  // 💾 Save
  const handleSave = async () => {
    if (!title || !priority || !assignedToId || !dueDate) {
      alert("Please fill all required fields.")
      return
    }

    if (isTerminal) return

    setLoading(true)

    try {
      const combined = dueTime
        ? `${dueDate}T${dueTime}`
        : `${dueDate}T23:59`

      const formattedDueDate = new Date(combined).toISOString()

      const formData = new FormData()

      formData.append("title", title)
      formData.append("description", description)
      formData.append("assigned_to_id", String(assignedToId))
      formData.append("priority", priority)
      formData.append("due_date", formattedDueDate)
      if (isCreate) {
        formData.append("status", "NOT_STARTED")
      }
      if (!isCreate && task?.version !== undefined) {
        formData.append("version", String(task.version))
      }

      let savedTask

      if (isCreate) {
        const res = await apiFetch("/api/tasks/", {
          method: "POST",
          body: formData,
        })
        if (!res.ok) {
          const errData = await res.json()
          console.error("SAVE FAILED:", errData)
          return
        }
        savedTask = await res.json()
        // Upload attachments separately
        if (files.length > 0) {
          for (const file of files) {
            const uploadForm = new FormData()
            uploadForm.append("file", file)

            const uploadRes = await apiFetch(
              `/api/tasks/${savedTask.id}/attachments/`,
              {
                method: "POST",
                body: uploadForm,
              }
            )

            if (!uploadRes.ok) {
              const err = await uploadRes.json()
              console.error("ATTACHMENT UPLOAD FAILED:", err)
            }
          }
        }
      } else {
        const res = await apiFetch(`/api/tasks/${task?.id}/`, {
          method: "PATCH",
          body: formData,
        })
        if (!res.ok) {
          const errData = await res.json()
          console.error("SAVE FAILED:", errData)
          return
        }
        savedTask = await res.json()

                if (files.length > 0) {
          for (const file of files) {
            const uploadForm = new FormData()
            uploadForm.append("file", file)

            const uploadRes = await apiFetch(
              `/api/tasks/${savedTask.id}/attachments/`,
              {
                method: "POST",
                body: uploadForm,
              }
            )

            if (!uploadRes.ok) {
              const err = await uploadRes.json()
              console.error("ATTACHMENT UPLOAD FAILED:", err)
            }
          }
        }
      }

      const refreshed = await apiFetchJson(
        `/api/tasks/${savedTask.id}/`
      )

      onSaved(refreshed)
      onClose()

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="h-full flex flex-col">

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto bg-white rounded-3xl p-10 space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900">
          {isCreate ? "Create New Task" : "Edit Task"}
        </h2>
        <p className="text-neutral-500 mt-1">
          Fill in the details below to {isCreate ? "create" : "update"} a task
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Task Name *</label>
        <input
          disabled={isTerminal}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          disabled={isTerminal}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
        />
      </div>

        {/* Attachments */}
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Attachments
          </label>

          {/* Existing Attachments (Already Uploaded) */}
          {!isCreate && existingAttachments.length > 0 && (
            <div className="space-y-2">
              {existingAttachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between border border-neutral-200 rounded-md px-3 py-2 text-sm"
                >
                  <a
                    href={file.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {file.original_name}
                  </a>

                  {!isTerminal && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await apiFetch(
                          `/api/tasks/${task?.id}/attachments/${file.id}/`,
                          { method: "DELETE" }
                        )

                        if (res.ok) {
                          setExistingAttachments((prev) =>
                            prev.filter((a) => a.id !== file.id)
                          )
                        }
                      }}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending Files (Just Selected) */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border border-blue-200 bg-blue-50 rounded-md px-3 py-2 text-sm"
                >
                  <span className="text-blue-700">
                    {file.name} (Pending upload)
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    className="text-red-600 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Files */}
          {!isTerminal && (
            <label className="text-blue-600 underline cursor-pointer text-sm">
              Add files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const fileList = e.currentTarget.files
                  if (!fileList) return

                  const newFiles = Array.from(fileList)
                  setFiles((prev) => [...prev, ...newFiles])

                  // optional: reset input so same file can be selected again
                  e.currentTarget.value = ""
                }}
              />
            </label>
          )}
        </div>


      {/* Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Assign To */}
        <div className="space-y-2 relative">
          <label className="text-sm font-medium">
            Assign To *
          </label>

          <input
            disabled={isTerminal}
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value)
              fetchUsers(e.target.value)
            }}
            placeholder="Search for user"
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
          />

          {userResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-sm max-h-48 overflow-auto">
              {userResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    setAssignedToId(u.id)
                    setUserSearch(u.full_name)
                    setUserResults([])
                  }}
                  className="px-4 py-2 hover:bg-neutral-100 cursor-pointer text-sm"
                >
                  {u.full_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Priority *
          </label>
          <select
            disabled={isTerminal}
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as TaskPriority)
            }
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
          >
            <option value="">Select priority</option>
            <option value="P1">Critical</option>
            <option value="P2">High</option>
            <option value="P3">Normal</option>
            <option value="P4">Low</option>
          </select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Due Date *
          </label>
          <input
            disabled={isTerminal}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Due Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Due Time
          </label>
          <input
            disabled={isTerminal}
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-xl border border-neutral-300 text-sm"
        >
          Cancel
        </button>

        <button
          disabled={loading || isTerminal}
          onClick={handleSave}
          className={`px-6 py-2 rounded-xl text-sm text-white ${
            loading || isTerminal
              ? "bg-neutral-400"
              : "bg-black hover:bg-neutral-800"
          }`}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
  )
}
