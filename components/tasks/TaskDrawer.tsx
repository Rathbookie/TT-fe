"use client"

import { useEffect, useState } from "react"
import { apiFetchJson, getAccessToken } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import TaskWorkflow from "./TaskWorkflow"
import { TaskStatus } from "@/lib/statusConfig"
import TaskAttachmentsPreview from "./TaskAttachmentsPreview"
import ReceiverProgressUpload from "./ReceiverProgressUpload"
import Badge from "@/components/ui/Badge"
import { Task } from "@/types/task"
import CreatorSubmissionView from "./CreatorSubmissionView"
import { getStatusLabel } from "@/lib/workflowDisplay"

type TaskHistoryEntry = {
  id: number
}

type TaskHistoryResponse =
  | TaskHistoryEntry[]
  | { results: TaskHistoryEntry[] }

interface Props {
  task: Task
  onClose: () => void
  onEdit: (taskId: number) => void
  onTaskUpdated?: (updatedTask: Task) => void // made optional
  updateTaskInState: (updatedTask: Task) => void
}

export default function TaskDrawer({
  task,
  onClose,
  onEdit,
  onTaskUpdated,
  updateTaskInState,
}: Props) {
  const { activeRole } = useAuth()
  console.log("Active Role:", activeRole)

  const [history, setHistory] = useState<TaskHistoryEntry[]>([])
  const [selectedStatus, setSelectedStatus] =
    useState<TaskStatus | null>(null)
  const [blockedReason, setBlockedReason] = useState("")
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  /* ----------------- */
  /* Fetch History */
  /* ----------------- */

  useEffect(() => {
    if (!task?.id) {
      setHistory([])
      return
    }

    const fetchHistory = async () => {
      try {
        const data = await apiFetchJson<TaskHistoryResponse>(
          `/api/tasks/${task.id}/history/`
        )

        if (Array.isArray(data)) {
          setHistory(data)
        } else if (Array.isArray(data?.results)) {
          setHistory(data.results)
        } else {
          setHistory([])
        }
      } catch (err) {
        console.error("History fetch error:", err)
      }
    }

    fetchHistory()
  }, [task?.id])

  /* ----------------- */
  /* Sync Workflow State */
  /* ----------------- */

  useEffect(() => {
    if (!task) return
    setSelectedStatus(null)
    setBlockedReason(task?.blocked_reason || "")
  }, [task])

  if (!task) return null
  if (!activeRole) return null

  const displayUser = (user?: Task["created_by"] | Task["assigned_to"]) => {
    if (!user) return "—"
    return user.full_name?.trim() || user.email || "—"
  }

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    !(task.stage?.is_terminal ?? task.status === "DONE")

  const formatDate = (date: string) =>
    new Date(date).toLocaleString()

  /* ----------------- */
  /* Save Status */
  /* ----------------- */

  const handleSaveStatus = async () => {
    console.log("Active Role:", activeRole)
    if (!selectedStatus) return

    if (
      selectedStatus === "BLOCKED" &&
      !blockedReason.trim()
    ) {
      alert("Blocked reason is required.")
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append("status", selectedStatus)
    formData.append("version", task.version.toString())

    if (selectedStatus === "BLOCKED") {
      formData.append("blocked_reason", blockedReason)
    }

    try {
      const token = getAccessToken()

      if (!token) {
        alert("Not authenticated")
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${task.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Active-Role": activeRole,
          },
          body: formData,
        }
      )

      if (!res.ok) {
        const text = await res.text()
        console.error("Status:", res.status)
        console.error("Response:", text)
        alert("Update failed.")
        return
      }

      const updatedTask = await res.json()

      // Safe invocation
      if (typeof onTaskUpdated === "function") {
        onTaskUpdated(updatedTask)
      }

      setSelectedStatus(null)

    } catch (err) {
      console.error("Update error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full bg-white border border-neutral-200 rounded-lg flex flex-col overflow-hidden text-xs">

      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-200">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-neutral-900 break-words whitespace-normal">
            {task.title}
          </h2>

          <div className="flex gap-1.5 mt-2 flex-wrap">
            <Badge
              variant="status"
              value={task.stage?.name || task.status}
              isTerminal={Boolean(task.stage?.is_terminal)}
            />
            <Badge variant="priority" value={task.priority ?? "P3"} />
          </div>
        </div>

        <button
          onClick={onClose}
          className="ml-3 text-neutral-500 hover:text-neutral-900 text-lg flex-shrink-0"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* WORKFLOW */}
        <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Workflow
          </p>

          <TaskWorkflow
            task={task}
            activeRole={activeRole}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            blockedReason={blockedReason}
            setBlockedReason={setBlockedReason}
            mode="compact"
          />

          {selectedStatus && (
            <button
              onClick={handleSaveStatus}
              disabled={loading}
              className="w-full mt-3 bg-black text-white rounded-lg py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Workflow"}
            </button>
          )}
        </div>

        {/* DESCRIPTION */}
        <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Description
          </p>
          <p className="text-xs text-neutral-900 whitespace-pre-wrap">
            {task.description || "—"}
          </p>
        </div>

        {/* ATTACHMENTS */}
        <TaskAttachmentsPreview
          attachments={task.attachments.filter(
            (a) => a.type === "REQUIREMENT"
          )}
        />

        {activeRole === "TASK_RECEIVER" &&
          task.status === "IN_PROGRESS" && (
            <ReceiverProgressUpload
              task={task}
              onStatusChange={(updatedTask) => {
                updateTaskInState(updatedTask)
              }}
            />
        )}

        {activeRole === "TASK_CREATOR" && (
          <CreatorSubmissionView task={task} />
        )}

        {/* EDIT BUTTON */}
        {activeRole !== "TASK_RECEIVER" && (
          <button
            onClick={() => onEdit(task.id)}
            disabled={task.status === "DONE"}
            className={`w-full py-2 rounded-lg text-xs font-medium transition ${
              (task.stage?.is_terminal ?? task.status === "DONE")
                ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-neutral-900"
            }`}
          >
            Edit Task
          </button>
        )}

        {/* METADATA */}
        <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Metadata
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-neutral-500">Assigned To</p>
              <p className="text-neutral-900 font-medium">
                {displayUser(task.assigned_to)}
              </p>
            </div>

            <div>
              <p className="text-neutral-500">
                {activeRole === "TASK_RECEIVER" ? "Assigned By" : "Created By"}
              </p>
              <p className="text-neutral-900 font-medium">
                {displayUser(task.created_by)}
              </p>
            </div>

            <div>
              <p className="text-neutral-500">Due</p>
              <p
                className={`font-medium ${
                  isOverdue ? "text-red-600" : "text-neutral-900"
                }`}
              >
                {task.due_date
                  ? formatDate(task.due_date)
                  : "—"}
              </p>
            </div>

            {task.stage?.name && (
              <div>
                <p className="text-neutral-500">Current Stage</p>
                <p className="text-neutral-900 font-medium">
                  {getStatusLabel(task.stage.name)}
                </p>
              </div>
            )}

            <div>
              <p className="text-neutral-500">Version</p>
              <p className="text-neutral-900 font-medium">
                {task.version}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
