export type WorkflowStageType = "GENERAL" | "COMPLETED" | "PAUSED" | "CANCELLED"
export type WorkflowEntryReasonMode = "NONE" | "OPTIONAL" | "REQUIRED"

export type WorkflowStage = {
  id: number
  name: string
  order: number
  stage_type: WorkflowStageType
  entry_reason_mode: WorkflowEntryReasonMode
  is_terminal: boolean
  is_pausable?: boolean
  requires_attachments: boolean
  requires_approval?: boolean
  color?: string
}

export type WorkflowStatus = {
  id: number
  name: string
  order: number
  is_terminal: boolean
  color?: string
}

export type ProofRequirement = {
  id: number
  type: "FILE" | "TEXT" | "URL"
  label: string
  is_mandatory: boolean
}

export type TransitionRule = {
  id: number
  from_status: number
  from_status_name: string
  to_status: number
  to_status_name: string
  allowed_roles: string[]
  proof_requirements: ProofRequirement[]
}

export type WorkflowTransition = {
  id: number
  from_stage: number
  from_stage_name: string
  from_stage_color?: string
  to_stage: number
  to_stage_name: string
  to_stage_color?: string
  allowed_role: string
}

export type WorkflowDefinition = {
  id: number
  name: string
  is_default: boolean
  is_published: boolean
  published_at: string | null
  version: number
  statuses: WorkflowStatus[]
  transition_rules: TransitionRule[]
  stages: WorkflowStage[]
  transitions: WorkflowTransition[]
}
