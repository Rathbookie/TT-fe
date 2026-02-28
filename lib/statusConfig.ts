export const KNOWN_STATUS_VALUES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING_REVIEW",
  "DONE",
  "CANCELLED",
] as const

export type TaskStatus = string

export type Role = "TASK_RECEIVER" | "TASK_CREATOR" | "ADMIN"
