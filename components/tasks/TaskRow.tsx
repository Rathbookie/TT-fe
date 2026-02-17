"use client"

import { Task } from "@/types/task"

type Props = {
  task: Task
  role: string | null
  onClick: () => void
  onDoubleClick: () => void
}

export default function TaskRow({
  task,
  role,
  onClick,
  onDoubleClick,
}: Props) {

  const assignmentValue =
    role === "TASK_RECEIVER"
      ? task.created_by?.full_name
      : task.assigned_to?.full_name

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "DONE"

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString()

  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="border-b border-neutral-200 hover:bg-neutral-50 transition cursor-pointer h-[48px]"
    >
      {/* Task Name */}
      <td className="px-6 py-2.5 font-medium text-neutral-900">
        <div className="truncate whitespace-nowrap overflow-hidden">
        {task.title}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-2.5">
        <div className="truncate whitespace-nowrap overflow-hidden">
        <StatusBadge status={task.status} />
        </div>
      </td>

      {/* Due */}
      <td className="px-6 py-2.5 text-sm">
        <span className={isOverdue ? "text-red-600 font-medium" : "text-neutral-600"}>
          {task.due_date ? formatDate(task.due_date) : "—"}
        </span>
      </td>

      {/* Assignment */}
      <td className="px-6 py-2.5 text-sm text-neutral-600">
        <div className="truncate whitespace-nowrap overflow-hidden">
        {assignmentValue || "—"}
        </div>
      </td>

      {/* Priority */}
      <td className="px-6 py-2.5">
        <div className="truncate whitespace-nowrap overflow-hidden">
        <PriorityBadge priority={task.priority || ""} />
        </div>
      </td>
    </tr>
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
      className={`px-3 py-1 text-xs rounded-full ${styles[status] || "bg-neutral-200"}`}
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

  if (!priority) return <span className="text-sm text-neutral-400">—</span>

  return (
    <span
      className={`px-3 py-1 text-xs rounded-full ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  )
}
