import { TaskStatus } from "@/lib/statusConfig"

export type UserProjection = {
  id: number
  full_name: string
  email: string
}

export type TaskPriority =
  | "P1"
  | "P2"
  | "P3"
  | "P4"

export type TaskAttachment = {
  id: number
  file: string
  original_name: string
  uploaded_by: number
  type: "REQUIREMENT" | "SUBMISSION"
}

export type WorkflowProjection = {
  id: number
  name: string
  is_default: boolean
}

export type WorkflowStageProjection = {
  id: number
  name: string
  order: number
  is_terminal: boolean
}


export type Task = {
  id: number
  title: string
  description: string

  status: TaskStatus
  workflow?: WorkflowProjection | null
  stage?: WorkflowStageProjection | null
  priority?: TaskPriority | null

  due_date?: string | null
  blocked_reason?: string | null

  assigned_to?: UserProjection | null
  created_by?: UserProjection

  version: number

  created_at: string
  updated_at: string

  attachments: TaskAttachment[]
}

