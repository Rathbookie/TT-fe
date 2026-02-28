export type WorkflowStage = {
  id: number
  name: string
  order: number
  is_terminal: boolean
  requires_attachments: boolean
  requires_approval: boolean
}

export type WorkflowTransition = {
  id: number
  from_stage: number
  from_stage_name: string
  to_stage: number
  to_stage_name: string
  allowed_role: string
}

export type WorkflowDefinition = {
  id: number
  name: string
  is_default: boolean
  is_published: boolean
  published_at: string | null
  version: number
  stages: WorkflowStage[]
  transitions: WorkflowTransition[]
}
