"use client"

import { Task } from "@/types/task"
import { allowedTransitions, Role, TaskStatus } from "@/lib/statusConfig"

type Props = {
  task: Task
  activeRole: Role
  selectedStatus: TaskStatus | null
  setSelectedStatus: (status: TaskStatus) => void
  blockedReason: string
  setBlockedReason: (value: string) => void
  mode?: "full" | "compact"
}

export default function TaskWorkflow({
  task,
  activeRole,
  selectedStatus,
  setSelectedStatus,
  blockedReason,
  setBlockedReason,
  mode = "full",
}: Props) {
  const isCompact = mode === "compact"

  const isTerminal =
    task.status === "DONE" || task.status === "CANCELLED"

  const transitions =
    allowedTransitions[activeRole]?.[task.status] ?? []

  return (
    <div className={isCompact ? "space-y-3" : "space-y-4"}>
      {/* Status Display */}
      <div className="text-sm font-medium text-neutral-500">
        Status:{" "}
        {task.status === "WAITING"
          ? "Waiting Approval"
          : task.status.replace("_", " ")}
      </div>

      {/* Transition Buttons */}
      {!isTerminal && transitions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {transitions.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={() => setSelectedStatus(nextStatus)}
              className={`
                ${isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
                rounded-xl font-medium transition
                ${selectedStatus === nextStatus ? "ring-2 ring-black" : ""}
                ${
                  nextStatus === "DONE"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                    : nextStatus === "WAITING"
                    ? "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
                    : nextStatus === "IN_PROGRESS"
                    ? "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                    : nextStatus === "BLOCKED"
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : nextStatus === "CANCELLED"
                    ? "bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200"
                    : ""
                }
              `}
            >
              {nextStatus === "WAITING"
                ? "SUBMIT"
                : nextStatus === "DONE"
                ? "APPROVE"
                : nextStatus === "IN_PROGRESS"
                ? "IN PROGRESS"
                : nextStatus.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      {/* Blocked Reason */}
      {selectedStatus === "BLOCKED" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Blocked Reason *
          </label>
          <textarea
            value={blockedReason}
            onChange={(e) => setBlockedReason(e.target.value)}
            rows={isCompact ? 2 : 3}
            className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
          />
        </div>
      )}
    </div>
  )
}
