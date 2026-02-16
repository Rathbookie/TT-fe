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
    label: "Waiting",
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
