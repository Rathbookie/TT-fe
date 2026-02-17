export const STATUS_CONFIG = {
  NOT_STARTED: {
    label: "Not Started",
    color: "bg-zinc-100 text-zinc-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-blue-50 text-blue-600",
  },
  BLOCKED: {
    label: "Blocked",
    color: "bg-red-50 text-red-600",
  },
  WAITING: {
    label: "Waiting Approval",
    color: "bg-amber-50 text-amber-600",
  },
  DONE: {
    label: "Done",
    color: "bg-emerald-50 text-emerald-600",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-zinc-200 text-zinc-500",
  },
} as const

// Derive status type automatically
export type TaskStatus = keyof typeof STATUS_CONFIG

// Define role type explicitly
export type Role = "TASK_RECEIVER" | "TASK_CREATOR" | "ADMIN"

// Fully typed transition map
export const allowedTransitions: Record<
  Role,
  Record<TaskStatus, TaskStatus[]>
> = {
  TASK_RECEIVER: {
    NOT_STARTED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["BLOCKED", "WAITING", "CANCELLED"],
    BLOCKED: ["IN_PROGRESS", "CANCELLED"],
    WAITING: [],
    DONE: [],
    CANCELLED: [],
  },
  TASK_CREATOR: {
    NOT_STARTED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["BLOCKED", "WAITING", "CANCELLED"],
    BLOCKED: ["IN_PROGRESS", "CANCELLED"],
    WAITING: ["DONE", "IN_PROGRESS", "CANCELLED"],
    DONE: [],
    CANCELLED: [],
  },
  ADMIN: {
    NOT_STARTED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["BLOCKED", "WAITING", "CANCELLED"],
    BLOCKED: ["IN_PROGRESS", "CANCELLED"],
    WAITING: ["DONE", "IN_PROGRESS", "CANCELLED"],
    DONE: ["IN_PROGRESS", "CANCELLED"],
    CANCELLED: [],
  },
}
