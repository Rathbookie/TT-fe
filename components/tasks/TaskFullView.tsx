"use client"

import TaskWorkflow from "./TaskWorkflow"
import TaskAttachments from "./TaskAttachments"
import TaskTitleDescription from "./TaskTitleDescription"
import TaskMetaFields from "./TaskMetaFields"

import { useState } from "react"
import { Task, TaskAttachment, TaskPriority } from "@/types/task"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Role, TaskStatus } from "@/lib/statusConfig"
type Props = {
  task?: Task | null
  mode: "create" | "edit"
  onClose: () => void
  onSaved: (savedTask: Task) => void
}

export default function TaskFullView({
  task,
  mode,
  onClose,
  onSaved,
}: Props) {
  console.log("TASK IN FULL VIEW:", task)
  const isCreate = mode === "create"
  const { activeRole } = useAuth()
  const isTerminal =
    task?.stage?.is_terminal ??
    (task?.status === "DONE" || task?.status === "CANCELLED")

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

  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const [existingAttachments, setExistingAttachments] = useState<TaskAttachment[]>(task?.attachments || [])

  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null)
  const [blockedReason, setBlockedReason] = useState(
    task?.blocked_reason || ""
  )

  // -----------------------------
// DIRTY STATE DETECTION
// -----------------------------

const original = task

const hasChanges = isCreate
  ? title.trim() !== "" ||
    description.trim() !== "" ||
    priority !== "" ||
    assignedToId !== null ||
    dueDate !== "" ||
    files.length > 0
  : (
      title !== original?.title ||
      description !== original?.description ||
      priority !== original?.priority ||
      assignedToId !== original?.assigned_to?.id ||
      dueDate !== original?.due_date?.slice(0, 10) ||
      dueTime !== original?.due_date?.slice(11, 16) ||
      selectedStatus !== null ||
      files.length > 0
    )

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

      if (!isCreate) {
        formData.append(
          "status",
          selectedStatus ? selectedStatus : task!.status
        )
      }

      if (selectedStatus === "BLOCKED") {
        formData.append("blocked_reason", blockedReason)
      }

      if (!isCreate && task?.version !== undefined) {
        formData.append("version", String(task.version))
      }

      let savedTask: Task

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
        savedTask = (await res.json()) as Task
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

        console.log("VERSION SENT:", task?.version)
        console.log("SELECTED STATUS:", selectedStatus)


        const noFieldChanges =
          !selectedStatus &&
          title === task?.title &&
          description === task?.description &&
          priority === task?.priority &&
          dueDate === task?.due_date?.slice(0, 10) &&
          assignedToId === task?.assigned_to?.id &&
          dueTime === task?.due_date?.slice(11, 16)

        const attachmentsOnly =
          files.length > 0 && noFieldChanges

        if (noFieldChanges && files.length === 0) {
          savedTask = task
        } else if (attachmentsOnly) {
          savedTask = await apiFetchJson<Task>(
            `/api/tasks/${task!.id}/`
          )
        } else {
          const res = await apiFetch(`/api/tasks/${task?.id}/`, {
            method: "PATCH",
            body: formData,
          })

          if (!res.ok) {
            const errData = await res.json()
            console.error("SAVE FAILED → STATUS:", res.status)
            console.error("SAVE FAILED → BODY:", errData)
            return
          }

          savedTask = (await res.json()) as Task
        }

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
      }


      const refreshed = await apiFetchJson<Task>(
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
    <div className="h-full flex flex-col text-xs">

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto bg-white rounded-xl p-5 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {isCreate ? "Task Studio · Create Task" : "Task Studio · Edit Task"}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Fill in the execution context, workflow fields, assignment, and delivery artifacts.
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-900 text-base"
        >
          ×
        </button>
      </div>


      {/* Status + Workflow */}
      {!isCreate && task && activeRole && (
        <TaskWorkflow
          task={task}
          activeRole={activeRole as Role}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          blockedReason={blockedReason}
          setBlockedReason={setBlockedReason}
        />
      )}

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Scope
          </p>
          <TaskTitleDescription
            isTerminal={isTerminal}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
          />
        </div>

        {/* Attachments */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Attachments
          </p>
          <TaskAttachments
            taskId={task?.id}
            isCreate={isCreate}
            isTerminal={isTerminal}
            existingAttachments={existingAttachments}
            setExistingAttachments={setExistingAttachments}
            files={files}
            setFiles={setFiles}
          />
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Planning
          </p>
          <TaskMetaFields
            isTerminal={isTerminal}
            priority={priority}
            setPriority={setPriority}
            dueDate={dueDate}
            setDueDate={setDueDate}
            dueTime={dueTime}
            setDueTime={setDueTime}
            assignedToId={assignedToId}
            setAssignedToId={setAssignedToId}
          />
        </div>

      {/* Actions */}
      {hasChanges && (
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-300 text-xs"
          >
            Cancel
          </button>

          <button
            disabled={loading || isTerminal}
            onClick={handleSave}
            className={`px-4 py-1.5 rounded-lg text-xs text-white ${
              loading || isTerminal
                ? "bg-neutral-400"
                : "bg-black hover:bg-neutral-800"
            }`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  </div>
  )
}
