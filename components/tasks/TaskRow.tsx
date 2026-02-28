"use client"

import { Task } from "@/types/task"
import { getStatusLabel } from "@/lib/workflowDisplay"
import { ChevronRight, PenSquare } from "lucide-react"
import { stageTone } from "@/lib/stageTheme"

type Props = {
  task: Task
  role: string | null
  onClick: () => void
  onDoubleClick: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
}

export default function TaskRow({
  task,
  role,
  onClick,
  onDoubleClick,
  isSelected = false,
  onToggleSelect,
}: Props) {
  const displayUser = (user?: Task["created_by"] | Task["assigned_to"]) => {
    if (!user) return "—"
    return user.full_name?.trim() || user.email || "—"
  }

  const assignmentValue =
    role === "TASK_RECEIVER"
      ? displayUser(task.created_by)
      : displayUser(task.assigned_to)

  const isOverdue =
    (() => {
      if (!task.due_date) return false
      const stageName = (task.stage?.name || task.status || "").toUpperCase()
      if (task.stage?.is_terminal) return false
      if (stageName === "DONE" || stageName === "CANCELLED" || stageName === "COMPLETED") {
        return false
      }

      const due = new Date(task.due_date)
      if (Number.isNaN(due.getTime())) return false

      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return due.getTime() < startOfToday.getTime()
    })()

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString()

  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="group h-[44px] cursor-pointer border-b border-neutral-200 transition hover:bg-neutral-50"
    >
      <td className="px-3 py-1.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-neutral-300"
        />
      </td>

      <td className="px-4 py-1.5 text-xs font-medium text-neutral-900">
        <div className="truncate whitespace-nowrap overflow-hidden">
        {task.title}
        </div>
      </td>

      <td className="px-4 py-1.5">
        <div className="truncate whitespace-nowrap overflow-hidden">
        <StatusBadge status={task.stage?.name || task.status} isTerminal={Boolean(task.stage?.is_terminal)} />
        </div>
      </td>

      <td className="px-4 py-1.5">
        <div className="truncate whitespace-nowrap overflow-hidden">
          <PriorityBadge priority={task.priority || ""} />
        </div>
      </td>

      <td className="px-4 py-1.5 text-xs">
        <span className={isOverdue ? "text-red-600 font-medium" : "text-neutral-600"}>
          {task.due_date ? formatDate(task.due_date) : "—"}
        </span>
      </td>

      <td className="px-4 py-1.5 text-xs text-neutral-600">
        <div className="truncate whitespace-nowrap overflow-hidden">
        {assignmentValue}
        </div>
      </td>

      <td className="px-4 py-1.5">
        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
          No custom field
        </span>
      </td>

      <td className="px-4 py-1.5">
        <div className="truncate whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="rounded-md border border-neutral-200 bg-white p-1 text-slate-500 hover:bg-neutral-100"
              title="Quick edit stage"
            >
              <PenSquare size={12} />
            </button>
            <ChevronRight size={12} className="text-slate-400" />
          </div>
        </div>
      </td>
    </tr>
  )
}

/* ----------------- */
/* Status Badge */
/* ----------------- */

function StatusBadge({ status, isTerminal }: { status: string; isTerminal: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${stageTone(
        status,
        isTerminal
      )}`}
    >
      {getStatusLabel(status)}
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

  if (!priority) return <span className="text-xs text-neutral-400">—</span>

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  )
}
