export type UserProjection = {
  id: number
  full_name: string
  email: string
}

export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "WAITING"
  | "DONE"
  | "CANCELLED"

export type TaskPriority =
  | "P1"
  | "P2"
  | "P3"
  | "P4"

export type Task = {
  id: number
  title: string
  description: string

  status: TaskStatus
  priority?: TaskPriority | null

  due_date?: string | null
  blocked_reason?: string | null

  assigned_to?: UserProjection | null
  created_by?: UserProjection

  version: number

  created_at: string
  updated_at: string

  attachments: {
  id: number
  file: string
  original_name: string
  }[]
}
