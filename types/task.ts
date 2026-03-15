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

export type TaskProof = {
  id: number
  type: "FILE" | "TEXT" | "URL"
  file?: string | null
  file_url?: string | null
  file_name?: string | null
  text?: string | null
  url?: string | null
  label?: string | null
  submitted_at: string
  submitted_by?: UserProjection | null
}

export type TaskStatusDetail = {
  id: number
  board: number
  name: string
  color: string
  order: number
  is_terminal: boolean
  is_pausable: boolean
  is_cancelled: boolean
  is_default: boolean
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
  is_pausable?: boolean
  color?: string
}


export type Task = {
  id: number
  ref_id?: string
  title: string
  description: string

  board?: number | null
  parent?: number | null
  status: TaskStatus
  status_detail?: TaskStatusDetail | null
  workflow?: WorkflowProjection | null
  stage?: WorkflowStageProjection | null
  priority?: TaskPriority | null

  due_date?: string | null
  blocked_reason?: string | null

  assignees?: UserProjection[]
  assigned_to?: UserProjection | null
  created_by?: UserProjection

  version: number

  created_at: string
  updated_at: string

  attachments: TaskAttachment[]
  proofs?: TaskProof[]
  subtask_count?: number
}
