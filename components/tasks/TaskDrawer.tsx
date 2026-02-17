"use client"

import { useEffect, useState } from "react"
import { apiFetchJson } from "@/lib/api"

interface Props {
  task: any
  onClose: () => void
  onEdit: (taskId: number) => void
}

export default function TaskDrawer({ task, onClose, onEdit }: Props) {
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiFetchJson(
          `/api/tasks/${task.id}/history/`
        )
        if (Array.isArray(data)) {
          setHistory(data)
        } else if (Array.isArray(data.results)) {
          setHistory(data.results)
        } else {
          setHistory([])
        }
      } catch (err) {
        console.error(err)
      }
    }

    if (task?.id) fetchHistory()
  }, [task?.id])

  if (!task) return null

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "DONE"

  const formatDate = (date: string) =>
    new Date(date).toLocaleString()

  return (
    <div className="h-full w-full bg-white border border-neutral-200 rounded-lg flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-200">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-neutral-900 break-words whitespace-normal">
            {task.title}
          </h2>

          <div className="flex gap-2 mt-3 flex-wrap">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        <button
          onClick={onClose}
          className="ml-4 text-neutral-500 hover:text-neutral-900 text-xl flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* DESCRIPTION */}
        <div className="bg-neutral-50 rounded-lg p-6 space-y-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Description
          </p>

          <p className="text-sm text-neutral-900 whitespace-pre-wrap">
            {task.description || "—"}
          </p>
        </div>

        {/* METADATA */}
        <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Metadata
          </p>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-neutral-500">Assigned To</p>
              <p className="text-neutral-900 font-medium">
                {task.assigned_to?.full_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-neutral-500">Created By</p>
              <p className="text-neutral-900 font-medium">
                {task.created_by?.full_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-neutral-500">Due</p>
              <p
                className={`font-medium ${
                  isOverdue ? "text-red-600" : "text-neutral-900"
                }`}
              >
                {task.due_date ? formatDate(task.due_date) : "—"}
              </p>
            </div>

            <div>
              <p className="text-neutral-500">Version</p>
              <p className="text-neutral-900 font-medium">
                {task.version}
              </p>
            </div>
          </div>
        </div>

        {/* ATTACHMENTS */}
        <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Attachments
          </p>

          {task.attachments?.length === 0 && (
            <p className="text-sm text-neutral-400">
              No attachments
            </p>
          )}

          <div className="space-y-2">
            {task.attachments?.map((file: any) => (
              <div
                key={file.id}
                className="border border-neutral-200 rounded-md px-3 py-2"
              >
                <a
                  href={file.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline hover:text-blue-800 break-words block"
                >
                  {file.original_name}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* EDIT BUTTON */}
        <div className="bg-neutral-50 rounded-lg p-6">
          <button
            onClick={() => onEdit(task.id)}
            disabled={task.status === "DONE"}
            className={`w-full py-3 rounded-md text-sm font-medium transition ${
              task.status === "DONE"
                ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-neutral-800"
            }`}
          >
            Edit Task
          </button>
        </div>

        {/* HISTORY */}
        <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Task History
          </p>

          {history.length === 0 && (
            <p className="text-sm text-neutral-400">
              No history yet
            </p>
          )}

          <div className="space-y-5">
            {history.map((item) => (
              <div
                key={item.id}
                className="border-l border-neutral-300 pl-4 space-y-1"
              >
                <p className="text-sm font-medium text-neutral-900">
                  {item.action}
                </p>

                <p className="text-xs text-neutral-500">
                  {formatDate(item.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}


/* ----------------- */
/* Status Badge */
/* ----------------- */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NOT_STARTED: "bg-neutral-200 text-neutral-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    BLOCKED: "bg-red-100 text-red-700",
    WAITING: "bg-yellow-100 text-yellow-700",
    DONE: "bg-green-100 text-green-700",
    CANCELLED: "bg-neutral-300 text-neutral-600",
  }

  return (
    <span
      className={`px-3 py-1 text-xs rounded-full ${
        styles[status] || "bg-neutral-200"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  )
}


/* ----------------- */
/* Priority Badge */
/* ----------------- */

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    P1: "bg-red-100 text-red-700",
    P2: "bg-orange-100 text-orange-700",
    P3: "bg-blue-100 text-blue-700",
    P4: "bg-green-100 text-green-700",
  }

  const labels: Record<string, string> = {
    P1: "Critical",
    P2: "High",
    P3: "Normal",
    P4: "Low",
  }

  if (!priority) return null

  return (
    <span
      className={`px-3 py-1 text-xs rounded-full ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  )
}
