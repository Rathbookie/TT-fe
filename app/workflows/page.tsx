"use client"

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Plus, Save, Send, Trash2, X } from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetch, apiFetchJson } from "@/lib/api"
import {
  WorkflowDefinition,
  WorkflowEntryReasonMode,
  WorkflowStage,
  WorkflowStageType,
} from "@/types/workflow"
import { useAuth } from "@/context/AuthContext"

type WorkflowListResponse =
  | WorkflowDefinition[]
  | {
      results?: WorkflowDefinition[]
    }

type TransitionTarget = {
  stage: WorkflowStage
  roles: string[]
}

type ConnectorLine = {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

const ROLE_OPTIONS = ["TASK_CREATOR", "TASK_RECEIVER", "ADMIN"]
const DEFAULT_STAGE_COLOR = "#6B7280"
const STAGE_PRESET_COLORS = [
  "#6B7280",
  "#2563EB",
  "#0EA5E9",
  "#10B981",
  "#059669",
  "#84CC16",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#6366F1",
  "#14B8A6",
  "#A855F7",
  "#64748B",
]

const STAGE_TYPE_LABELS: Record<WorkflowStageType, string> = {
  GENERAL: "General",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
}

const ZONE_ORDER: Record<WorkflowStageType, number> = {
  GENERAL: 0,
  COMPLETED: 1,
  PAUSED: 2,
  CANCELLED: 3,
}

const formatRoleLabel = (role: string) =>
  role.replaceAll("_", " ").replace("TASK ", "Task ")

const stageTypeTone: Record<WorkflowStageType, string> = {
  GENERAL: "text-slate-700",
  COMPLETED: "text-emerald-700",
  PAUSED: "text-amber-700",
  CANCELLED: "text-red-700",
}

function sortStages(stages: WorkflowStage[]) {
  return [...stages].sort(
    (a, b) =>
      ZONE_ORDER[a.stage_type] - ZONE_ORDER[b.stage_type] ||
      a.order - b.order ||
      a.name.localeCompare(b.name)
  )
}

function toStageType(stage: WorkflowStage): WorkflowStageType {
  if (stage.stage_type) return stage.stage_type
  if (stage.is_pausable) return "PAUSED"
  if (stage.is_terminal) return "COMPLETED"
  return "GENERAL"
}

function getStageListByType(workflow: WorkflowDefinition | null, stageTypes: WorkflowStageType[]) {
  if (!workflow) return []
  return sortStages(workflow.stages).filter((stage) => stageTypes.includes(stage.stage_type))
}

function getMainFlowStages(workflow: WorkflowDefinition | null) {
  return getStageListByType(workflow, ["GENERAL", "COMPLETED"])
}

function getNextMainFlowStage(workflow: WorkflowDefinition | null, stageId: number | null) {
  if (!workflow || !stageId) return null
  const mainFlow = getMainFlowStages(workflow)
  const index = mainFlow.findIndex((stage) => stage.id === stageId)
  return index >= 0 ? mainFlow[index + 1] || null : null
}

function sanitizeStage(stage: WorkflowStage): WorkflowStage {
  const stageType = toStageType(stage)
  const entryReasonMode =
    stageType === "PAUSED"
      ? "REQUIRED"
      : stageType === "CANCELLED"
        ? stage.entry_reason_mode || "OPTIONAL"
        : "NONE"

  return {
    ...stage,
    stage_type: stageType,
    entry_reason_mode: entryReasonMode,
    is_terminal: stageType === "COMPLETED" || stageType === "CANCELLED",
    is_pausable: stageType === "PAUSED",
    requires_approval: Boolean(stage.requires_approval),
    color: stage.color || DEFAULT_STAGE_COLOR,
  }
}

function isValidTransition(workflow: WorkflowDefinition, fromStageId: number, toStageId: number) {
  const from = workflow.stages.find((stage) => stage.id === fromStageId)
  const to = workflow.stages.find((stage) => stage.id === toStageId)
  if (!from || !to) return false
  if (from.stage_type === "COMPLETED" || from.stage_type === "CANCELLED") return false
  if (from.stage_type === "PAUSED") {
    return to.stage_type === "GENERAL"
  }
  if (from.stage_type !== "GENERAL") return false
  if (to.stage_type === "PAUSED" || to.stage_type === "CANCELLED") return true
  if (to.stage_type === "GENERAL" || to.stage_type === "COMPLETED") {
    return getNextMainFlowStage(workflow, from.id)?.id === to.id
  }
  return false
}

function normalizeWorkflowStructure(workflow: WorkflowDefinition): WorkflowDefinition {
  const staged = workflow.stages.map(sanitizeStage)
  const generalStages = sortStages(staged.filter((stage) => stage.stage_type === "GENERAL")).map(
    (stage, index) => ({ ...stage, order: index })
  )
  const completedStages = sortStages(staged.filter((stage) => stage.stage_type === "COMPLETED"))
  const pausedStages = sortStages(staged.filter((stage) => stage.stage_type === "PAUSED")).map(
    (stage, index) => ({ ...stage, order: index })
  )
  const cancelledStages = sortStages(staged.filter((stage) => stage.stage_type === "CANCELLED")).map(
    (stage, index) => ({ ...stage, order: index })
  )

  let completedStage = completedStages[0]
  if (!completedStage) {
    completedStage = sanitizeStage({
      id: -Math.round(Date.now() + Math.random() * 1000),
      name: "Completed",
      order: generalStages.length,
      stage_type: "COMPLETED",
      entry_reason_mode: "NONE",
      resume_to_stage: null,
      is_terminal: true,
      is_pausable: false,
      requires_attachments: false,
      requires_approval: false,
      color: "#10B981",
    })
  } else {
    completedStage = {
      ...completedStage,
      order: generalStages.length,
      stage_type: "COMPLETED",
      entry_reason_mode: "NONE",
      resume_to_stage: null,
      is_terminal: true,
      is_pausable: false,
    }
  }

  const stages = [...generalStages, completedStage, ...pausedStages, ...cancelledStages]
  const nextWorkflow = { ...workflow, stages }

  const statuses = sortStages(stages)
    .filter((stage) => stage.stage_type !== "CANCELLED")
    .map((stage, index) => {
      const existing = workflow.statuses.find((status) => status.name === stage.name)
      return {
        id: existing?.id ?? -(Math.abs(stage.id) + index + 1),
        name: stage.name,
        order: index,
        is_terminal: stage.stage_type === "COMPLETED",
        color: stage.color || DEFAULT_STAGE_COLOR,
      }
    })

  const validStatusNames = new Set(statuses.map((status) => status.name))
  const validTransitions = workflow.transitions
    .filter((transition) => isValidTransition(nextWorkflow, transition.from_stage, transition.to_stage))
    .map((transition) => {
      const from = stages.find((stage) => stage.id === transition.from_stage)
      const to = stages.find((stage) => stage.id === transition.to_stage)
      return {
        ...transition,
        from_stage_name: from?.name || transition.from_stage_name,
        from_stage_color: from?.color || transition.from_stage_color || DEFAULT_STAGE_COLOR,
        to_stage_name: to?.name || transition.to_stage_name,
        to_stage_color: to?.color || transition.to_stage_color || DEFAULT_STAGE_COLOR,
      }
    })

  const statusByName = new Map(statuses.map((status) => [status.name, status]))
  const transitionRules = (workflow.transition_rules || [])
    .filter(
      (rule) =>
        validStatusNames.has(rule.from_status_name) && validStatusNames.has(rule.to_status_name)
    )
    .map((rule) => ({
      ...rule,
      from_status: statusByName.get(rule.from_status_name)?.id || rule.from_status,
      to_status: statusByName.get(rule.to_status_name)?.id || rule.to_status,
    }))

  return {
    ...nextWorkflow,
    statuses,
    transition_rules: transitionRules,
    transitions: validTransitions,
  }
}

function normalizeWorkflowForDiff(workflow: WorkflowDefinition) {
  return JSON.stringify({
    name: workflow.name,
    stages: sortStages(workflow.stages).map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      stage_type: stage.stage_type,
      entry_reason_mode: stage.entry_reason_mode,
      requires_attachments: stage.requires_attachments,
      requires_approval: Boolean(stage.requires_approval),
      color: stage.color || DEFAULT_STAGE_COLOR,
    })),
    transitions: [...workflow.transitions]
      .map((transition) => ({
        from_stage: transition.from_stage,
        to_stage: transition.to_stage,
        allowed_role: transition.allowed_role,
      }))
      .sort((a, b) =>
        `${a.from_stage}:${a.to_stage}:${a.allowed_role}`.localeCompare(
          `${b.from_stage}:${b.to_stage}:${b.allowed_role}`
        )
      ),
  })
}

function hydrateWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
  const hydrated = {
    ...workflow,
    stages: sortStages(workflow.stages).map((stage) => sanitizeStage(stage)),
    statuses: [...(workflow.statuses || [])].map((status) => ({
      ...status,
      color: status.color || DEFAULT_STAGE_COLOR,
    })),
    transition_rules: (workflow.transition_rules || []).map((rule) => ({
      ...rule,
      allowed_roles: rule.allowed_roles || [],
      proof_requirements: rule.proof_requirements || [],
    })),
    transitions: (workflow.transitions || []).map((transition) => ({
      ...transition,
      from_stage_color: transition.from_stage_color || DEFAULT_STAGE_COLOR,
      to_stage_color: transition.to_stage_color || DEFAULT_STAGE_COLOR,
    })),
  }
  return normalizeWorkflowStructure(hydrated)
}

function buildTransitionTargets(
  workflow: WorkflowDefinition,
  stage: WorkflowStage | null
): TransitionTarget[] {
  if (!stage) return []

  const rolesByTarget = new Map<number, string[]>()
  workflow.transitions
    .filter((transition) => transition.from_stage === stage.id)
    .forEach((transition) => {
      const current = rolesByTarget.get(transition.to_stage) || []
      if (!current.includes(transition.allowed_role)) current.push(transition.allowed_role)
      rolesByTarget.set(transition.to_stage, current)
    })

  if (stage.stage_type === "GENERAL") {
    const nextMain = getNextMainFlowStage(workflow, stage.id)
    const destinations = [
      ...(nextMain ? [nextMain] : []),
      ...getStageListByType(workflow, ["PAUSED"]),
      ...getStageListByType(workflow, ["CANCELLED"]),
    ]
    return destinations.map((destination) => ({
      stage: destination,
      roles: rolesByTarget.get(destination.id) ?? [...ROLE_OPTIONS],
    }))
  }

  if (stage.stage_type === "PAUSED") {
    return getStageListByType(workflow, ["GENERAL"]).map((destination) => ({
      stage: destination,
      roles: rolesByTarget.get(destination.id) ?? [...ROLE_OPTIONS],
    }))
  }

  return []
}

export default function WorkflowBuilderPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [draggingStageId, setDraggingStageId] = useState<number | null>(null)
  const [baselines, setBaselines] = useState<Record<number, string>>({})
  const [customStageColor, setCustomStageColor] = useState(DEFAULT_STAGE_COLOR)
  const [isCustomColorPickerOpen, setIsCustomColorPickerOpen] = useState(false)
  const [connectorLines, setConnectorLines] = useState<ConnectorLine[]>([])
  const [configPanelWidth, setConfigPanelWidth] = useState(352)
  const [showAdvancedTransitions, setShowAdvancedTransitions] = useState(false)
  const stageMapRef = useRef<HTMLDivElement | null>(null)
  const stageRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const selectedWorkflow = useMemo(
    () => workflows.find((wf) => wf.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  )
  const selectedStage = useMemo(
    () => selectedWorkflow?.stages.find((stage) => stage.id === selectedStageId) ?? null,
    [selectedWorkflow, selectedStageId]
  )

  const mainFlowStages = useMemo(() => getMainFlowStages(selectedWorkflow), [selectedWorkflow])
  const pausedStages = useMemo(
    () => getStageListByType(selectedWorkflow, ["PAUSED"]),
    [selectedWorkflow]
  )
  const cancelledStages = useMemo(
    () => getStageListByType(selectedWorkflow, ["CANCELLED"]),
    [selectedWorkflow]
  )
  const transitionTargets = useMemo(
    () => (selectedWorkflow && selectedStage ? buildTransitionTargets(selectedWorkflow, selectedStage) : []),
    [selectedWorkflow, selectedStage]
  )
  const selectedExceptionStage = selectedStage && ["PAUSED", "CANCELLED"].includes(selectedStage.stage_type)
    ? selectedStage
    : null
  const selectedExceptionIncomingSources = useMemo(() => {
    if (!selectedWorkflow || !selectedExceptionStage) return []
    const incomingStageIds = new Set(
      selectedWorkflow.transitions
        .filter((transition) => transition.to_stage === selectedExceptionStage.id)
        .map((transition) => transition.from_stage)
    )
    return sortStages(selectedWorkflow.stages).filter((stage) => incomingStageIds.has(stage.id))
  }, [selectedWorkflow, selectedExceptionStage])
  const selectedExceptionIncomingSourceIds = useMemo(
    () => new Set(selectedExceptionIncomingSources.map((stage) => stage.id)),
    [selectedExceptionIncomingSources]
  )

  const stagePaletteColors = useMemo(() => {
    const normalizedCustom = customStageColor.toUpperCase()
    if (!/^#[0-9A-F]{6}$/.test(normalizedCustom)) return STAGE_PRESET_COLORS
    return [normalizedCustom, ...STAGE_PRESET_COLORS.slice(1)]
  }, [customStageColor])

  useEffect(() => {
    setCustomStageColor(selectedStage?.color || DEFAULT_STAGE_COLOR)
    setIsCustomColorPickerOpen(false)
    setShowAdvancedTransitions(false)
  }, [selectedStage?.id, selectedStage?.color])

  useEffect(() => {
    const updateConnectorLines = () => {
      if (!stageMapRef.current || !selectedExceptionStage) {
        setConnectorLines([])
        return
      }
      const targetEl = stageRefs.current[selectedExceptionStage.id]
      if (!targetEl) {
        setConnectorLines([])
        return
      }
      const containerRect = stageMapRef.current.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()
      const nextLines = selectedExceptionIncomingSources
        .map((source) => {
          const sourceEl = stageRefs.current[source.id]
          if (!sourceEl) return null
          const sourceRect = sourceEl.getBoundingClientRect()
          return {
            fromX: sourceRect.right - containerRect.left,
            fromY: sourceRect.top + sourceRect.height / 2 - containerRect.top,
            toX: targetRect.left - containerRect.left,
            toY: targetRect.top + targetRect.height / 2 - containerRect.top,
          }
        })
        .filter((line): line is ConnectorLine => Boolean(line))
      setConnectorLines(nextLines)
    }

    updateConnectorLines()
    window.addEventListener("resize", updateConnectorLines)
    return () => window.removeEventListener("resize", updateConnectorLines)
  }, [selectedExceptionStage, selectedExceptionIncomingSources, workflows, selectedWorkflowId])

  useEffect(() => {
    if (typeof window === "undefined") return

    const clampWidth = () => {
      const maxWidth = Math.min(520, Math.max(320, window.innerWidth - 520))
      setConfigPanelWidth((current) => Math.min(maxWidth, Math.max(320, current)))
    }

    clampWidth()
    window.addEventListener("resize", clampWidth)
    return () => window.removeEventListener("resize", clampWidth)
  }, [])

  useEffect(() => {
    if (!user?.tenant_slug) return
    if (pathname === "/workflows") router.replace(`/${user.tenant_slug}/workflows`)
  }, [pathname, router, user?.tenant_slug])

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedWorkflow) return false
    return normalizeWorkflowForDiff(selectedWorkflow) !== baselines[selectedWorkflow.id]
  }, [selectedWorkflow, baselines])

  const refreshBaselines = (data: WorkflowDefinition[]) => {
    const next: Record<number, string> = {}
    data.forEach((workflow) => {
      next[workflow.id] = normalizeWorkflowForDiff(workflow)
    })
    setBaselines(next)
  }

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasUnsavedChanges])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const payload = await apiFetchJson<WorkflowListResponse>("/api/workflows/")
        const raw = Array.isArray(payload) ? payload : payload.results || []
        const data = raw.map(hydrateWorkflow)
        if (!mounted) return
        setWorkflows(data)
        refreshBaselines(data)
        const workflowFromQuery =
          typeof window !== "undefined"
            ? Number(new URLSearchParams(window.location.search).get("workflow"))
            : NaN
        const target =
          data.find((wf) => wf.id === workflowFromQuery) ||
          data.find((wf) => wf.is_default) ||
          data[0]
        if (target) {
          setSelectedWorkflowId(target.id)
          setSelectedStageId(target.stages[0]?.id ?? null)
        }
      } catch (err) {
        console.error("Workflow fetch error:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const patchSelectedWorkflow = (updater: (workflow: WorkflowDefinition) => WorkflowDefinition) => {
    if (!selectedWorkflow) return
    setWorkflows((prev) =>
      prev.map((item) =>
        item.id === selectedWorkflow.id ? hydrateWorkflow(updater(item)) : item
      )
    )
  }

  const confirmUnsaved = () =>
    !hasUnsavedChanges || window.confirm("You have unsaved workflow changes. Discard them?")

  const selectWorkflow = (workflowId: number) => {
    if (workflowId === selectedWorkflowId) return
    if (!confirmUnsaved()) return
    const workflow = workflows.find((wf) => wf.id === workflowId)
    setSelectedWorkflowId(workflowId)
    setSelectedStageId(workflow?.stages[0]?.id ?? null)
  }

  const reorderZone = (stageId: number, targetId: number, zone: WorkflowStageType[]) => {
    if (!selectedWorkflow || stageId === targetId) return
    const zoneStages = getStageListByType(selectedWorkflow, zone)
    const sourceIndex = zoneStages.findIndex((stage) => stage.id === stageId)
    const targetIndex = zoneStages.findIndex((stage) => stage.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const reordered = [...zoneStages]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    const orderMap = new Map(reordered.map((stage, index) => [stage.id, index]))
    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      stages: workflow.stages.map((stage) =>
        orderMap.has(stage.id) ? { ...stage, order: orderMap.get(stage.id)! } : stage
      ),
    }))
  }

  const deleteStage = (stageId: number) => {
    if (!selectedWorkflow) return
    const stage = selectedWorkflow.stages.find((candidate) => candidate.id === stageId)
    if (!stage) return
    if (stage.stage_type === "COMPLETED") {
      alert("The completed stage is required.")
      return
    }
    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      stages: workflow.stages.filter((candidate) => candidate.id !== stageId),
      transitions: workflow.transitions.filter(
        (transition) => transition.from_stage !== stageId && transition.to_stage !== stageId
      ),
    }))
    if (selectedStageId === stageId) {
      const fallback = selectedWorkflow.stages.find((candidate) => candidate.id !== stageId)
      setSelectedStageId(fallback?.id ?? null)
    }
  }

  const addStage = (stageType: WorkflowStageType) => {
    if (!selectedWorkflow) return
    if (stageType === "PAUSED" && pausedStages.length > 0) return
    if (stageType === "CANCELLED" && cancelledStages.length > 0) return
    const nextId = -Math.round(Date.now() + Math.random() * 1000)
    const nextStage: WorkflowStage = sanitizeStage({
      id: nextId,
      name:
        stageType === "GENERAL"
          ? `Stage ${mainFlowStages.filter((stage) => stage.stage_type === "GENERAL").length + 1}`
          : stageType === "PAUSED"
            ? "Paused"
            : "Cancelled",
      order:
        stageType === "GENERAL"
          ? mainFlowStages.filter((stage) => stage.stage_type === "GENERAL").length
          : stageType === "PAUSED"
            ? pausedStages.length
            : cancelledStages.length,
      stage_type: stageType,
      entry_reason_mode: stageType === "PAUSED" ? "REQUIRED" : stageType === "CANCELLED" ? "OPTIONAL" : "NONE",
      is_terminal: stageType === "COMPLETED" || stageType === "CANCELLED",
      is_pausable: stageType === "PAUSED",
      requires_attachments: false,
      requires_approval: false,
      color: stageType === "PAUSED" ? "#F59E0B" : stageType === "CANCELLED" ? "#EF4444" : DEFAULT_STAGE_COLOR,
    })
    patchSelectedWorkflow((workflow) => ({ ...workflow, stages: [...workflow.stages, nextStage] }))
    setSelectedStageId(nextId)
  }

  const updateTransitionRoles = (fromStageId: number, toStageId: number, roles: string[]) => {
    if (!selectedWorkflow) return
    patchSelectedWorkflow((workflow) => {
      const kept = workflow.transitions.filter(
        (transition) => !(transition.from_stage === fromStageId && transition.to_stage === toStageId)
      )
      const fromStage = workflow.stages.find((stage) => stage.id === fromStageId)
      const toStage = workflow.stages.find((stage) => stage.id === toStageId)
      const additions = roles.map((role, index) => ({
        id: -Math.round(Date.now() + Math.random() * 1000 + index),
        from_stage: fromStageId,
        from_stage_name: fromStage?.name || "From",
        from_stage_color: fromStage?.color || DEFAULT_STAGE_COLOR,
        to_stage: toStageId,
        to_stage_name: toStage?.name || "To",
        to_stage_color: toStage?.color || DEFAULT_STAGE_COLOR,
        allowed_role: role,
      }))
      return {
        ...workflow,
        transitions: [...kept, ...additions],
      }
    })
  }

  const toggleExceptionTransition = (fromStage: WorkflowStage, toStage: WorkflowStage) => {
    if (!selectedWorkflow) return
    const existingRoles = selectedWorkflow.transitions
      .filter(
        (transition) =>
          transition.from_stage === fromStage.id && transition.to_stage === toStage.id
      )
      .map((transition) => transition.allowed_role)
    const nextRoles = existingRoles.length ? [] : [...ROLE_OPTIONS]
    updateTransitionRoles(fromStage.id, toStage.id, nextRoles)
  }

  const beginPanelResize = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (typeof window === "undefined") return
    const startX = event.clientX
    const startWidth = configPanelWidth
    const layoutRect = layoutRef.current?.getBoundingClientRect()
    const minWidth = 320
    const maxWidth = layoutRect ? Math.max(minWidth, Math.min(520, layoutRect.width - 520)) : 520

    const onMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta))
      setConfigPanelWidth(nextWidth)
    }

    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const parseErrorDetail = async (res: Response) => {
    const raw = await res.text()
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return { detail: raw }
    }
  }

  const formatWorkflowError = (detail: unknown, fallback: string) => {
    if (!detail) return fallback
    if (typeof detail === "string") return detail.trim() || fallback
    if (typeof detail !== "object") return fallback
    const payload = detail as { detail?: string; blocked_stages?: Array<{ name: string; task_count: number }> }
    if (payload.blocked_stages?.length) {
      return `Cannot delete stages with active tasks: ${payload.blocked_stages
        .map((stage) => `${stage.name} (${stage.task_count})`)
        .join(", ")}`
    }
    return payload.detail || fallback
  }

  const saveDraft = async () => {
    if (!selectedWorkflow) return null
    setSaving(true)
    try {
      const res = await apiFetch(`/api/workflows/${selectedWorkflow.id}/builder/`, {
        method: "PATCH",
        body: JSON.stringify({
          version: selectedWorkflow.version,
          name: selectedWorkflow.name,
          statuses: selectedWorkflow.statuses.map((status) => ({
            id: status.id > 0 ? status.id : null,
            name: status.name,
            order: status.order,
            is_terminal: status.is_terminal,
            color: status.color || DEFAULT_STAGE_COLOR,
          })),
          transition_rules: selectedWorkflow.transition_rules.map((rule) => ({
            from_status: rule.from_status,
            from_status_name: rule.from_status_name,
            to_status: rule.to_status,
            to_status_name: rule.to_status_name,
            allowed_roles: rule.allowed_roles || [],
            proof_requirements: (rule.proof_requirements || []).map((req) => ({
              type: req.type,
              label: req.label,
              is_mandatory: req.is_mandatory,
            })),
          })),
          stages: selectedWorkflow.stages.map((stage) => ({
            id: stage.id > 0 ? stage.id : null,
            name: stage.name,
            order: stage.order,
            stage_type: stage.stage_type,
            entry_reason_mode: stage.entry_reason_mode,
            is_terminal: stage.is_terminal,
            is_pausable: Boolean(stage.is_pausable),
            requires_attachments: stage.requires_attachments,
            requires_approval: Boolean(stage.requires_approval),
            color: stage.color || DEFAULT_STAGE_COLOR,
          })),
          transitions: selectedWorkflow.transitions
            .filter((transition) => transition.from_stage > 0 && transition.to_stage > 0)
            .map((transition) => ({
              from_stage: transition.from_stage,
              to_stage: transition.to_stage,
              allowed_role: transition.allowed_role,
            })),
        }),
      })

      if (res.status === 409) {
        alert("Workflow changed elsewhere. Refresh and retry.")
        return null
      }
      if (!res.ok) {
        alert(formatWorkflowError(await parseErrorDetail(res), "Failed to save workflow draft."))
        return null
      }

      const payload = hydrateWorkflow((await res.json()) as WorkflowDefinition)
      setWorkflows((prev) => prev.map((wf) => (wf.id === payload.id ? payload : wf)))
      setBaselines((prev) => ({ ...prev, [payload.id]: normalizeWorkflowForDiff(payload) }))
      if (!payload.stages.find((stage) => stage.id === selectedStageId)) {
        setSelectedStageId(payload.stages[0]?.id ?? null)
      }
      return payload
    } catch (err) {
      console.error("Failed to save workflow:", err)
      alert("Failed to save workflow draft.")
      return null
    } finally {
      setSaving(false)
    }
  }

  const publishWorkflow = async () => {
    if (!selectedWorkflow) return
    const draft = hasUnsavedChanges ? await saveDraft() : selectedWorkflow
    if (!draft) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/workflows/${draft.id}/publish/`, {
        method: "POST",
        body: JSON.stringify({ version: draft.version }),
      })
      if (!res.ok) {
        alert(formatWorkflowError(await parseErrorDetail(res), "Failed to publish workflow."))
        return
      }
      const payload = hydrateWorkflow((await res.json()) as WorkflowDefinition)
      setWorkflows((prev) => prev.map((wf) => (wf.id === payload.id ? payload : wf)))
      setBaselines((prev) => ({ ...prev, [payload.id]: normalizeWorkflowForDiff(payload) }))
      alert("Workflow published.")
    } catch (err) {
      console.error("Publish failed:", err)
      alert("Failed to publish workflow.")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateWorkflow = async () => {
    if (!confirmUnsaved()) return
    setCreating(true)
    try {
      const res = await apiFetch("/api/workflows/", {
        method: "POST",
        body: JSON.stringify({ name: "New Workflow" }),
      })
      if (!res.ok) {
        alert(formatWorkflowError(await parseErrorDetail(res), "Unable to create workflow."))
        return
      }
      const created = hydrateWorkflow((await res.json()) as WorkflowDefinition)
      setWorkflows((prev) => [...prev, created])
      setBaselines((prev) => ({ ...prev, [created.id]: normalizeWorkflowForDiff(created) }))
      setSelectedWorkflowId(created.id)
      setSelectedStageId(created.stages[0]?.id ?? null)
    } catch (err) {
      console.error("Failed to create workflow:", err)
      alert("Unable to create workflow.")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteWorkflow = async () => {
    if (!selectedWorkflow || selectedWorkflow.is_default || deleting) return
    if (!window.confirm(`Delete workflow "${selectedWorkflow.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/workflows/${selectedWorkflow.id}/`, {
        method: "DELETE",
      })
      if (!res.ok) {
        alert(formatWorkflowError(await parseErrorDetail(res), "Unable to delete workflow."))
        return
      }
      setWorkflows((prev) => {
        const next = prev.filter((wf) => wf.id !== selectedWorkflow.id)
        const fallback = next.find((wf) => wf.is_default) || next[0] || null
        setSelectedWorkflowId(fallback?.id ?? null)
        setSelectedStageId(fallback?.stages[0]?.id ?? null)
        return next
      })
      setBaselines((prev) => {
        const next = { ...prev }
        delete next[selectedWorkflow.id]
        return next
      })
    } catch (err) {
      console.error("Delete workflow failed:", err)
      alert("Unable to delete workflow.")
    } finally {
      setDeleting(false)
    }
  }

  const renderStageCard = (stage: WorkflowStage, draggable: boolean, zone: WorkflowStageType[]) => {
    const isExceptionSelectionMode = Boolean(
      selectedExceptionStage && stage.stage_type === "GENERAL"
    )
    const isConnectedToSelectedException = selectedExceptionIncomingSourceIds.has(stage.id)

    return (
      <div
        key={stage.id}
        className="w-full max-w-[14rem]"
        draggable={draggable}
        onDragStart={() => draggable && setDraggingStageId(stage.id)}
        onDragEnd={() => setDraggingStageId(null)}
        onDragOver={(e) => draggable && e.preventDefault()}
        onDrop={() => {
          if (draggable && draggingStageId) reorderZone(draggingStageId, stage.id, zone)
        }}
      >
        <div
          ref={(node) => {
            stageRefs.current[stage.id] = node
          }}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (selectedExceptionStage && stage.stage_type === "GENERAL") {
              toggleExceptionTransition(stage, selectedExceptionStage)
              return
            }
            setSelectedStageId(stage.id)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              if (selectedExceptionStage && stage.stage_type === "GENERAL") {
                toggleExceptionTransition(stage, selectedExceptionStage)
                return
              }
              setSelectedStageId(stage.id)
            }
          }}
          className={`flex min-h-24 w-full flex-col rounded-xl border p-2.5 text-left transition ${
            selectedStageId === stage.id
              ? ""
              : isConnectedToSelectedException
                ? "border-dashed border-2 bg-white hover:bg-neutral-50"
                : "border-neutral-200 bg-white hover:bg-neutral-50"
          }`}
          style={
            selectedStageId === stage.id
              ? {
                  borderColor: stage.color || DEFAULT_STAGE_COLOR,
                  backgroundColor: `${stage.color || DEFAULT_STAGE_COLOR}14`,
                }
              : isConnectedToSelectedException
                ? {
                    borderColor:
                      selectedExceptionStage?.stage_type === "CANCELLED" ? "#EF4444" : "#F59E0B",
                  }
              : undefined
          }
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              {isExceptionSelectionMode ? "Click to link" : draggable ? "Drag" : "Fixed"}
            </span>
            <span
              className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={{
                color: stage.color || DEFAULT_STAGE_COLOR,
                borderColor: `${stage.color || DEFAULT_STAGE_COLOR}66`,
                backgroundColor: `${stage.color || DEFAULT_STAGE_COLOR}1A`,
              }}
            >
              {stage.name}
            </span>
          </div>
          {stage.stage_type !== "GENERAL" ? (
            <p className={`text-[11px] font-medium ${stageTypeTone[stage.stage_type]}`}>
              {STAGE_TYPE_LABELS[stage.stage_type]}
            </p>
          ) : null}
          {stage.requires_attachments || stage.requires_approval ? (
            <p className="mt-2 text-[11px] text-slate-600">
              {stage.requires_attachments ? "Attachment required" : "Approval required"}
            </p>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              deleteStage(stage.id)
            }}
            disabled={stage.stage_type === "COMPLETED"}
            className="mt-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            title="Remove stage"
            aria-label="Remove stage"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <WorkspaceShell
      title="Workflow Builder"
      subtitle="Configure the vertical main flow first, then map blocked and cancelled exits."
      actions={
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] text-amber-700">
              Unsaved changes
            </span>
          )}
          {selectedWorkflow?.is_published && (
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] text-emerald-700">
              Published
            </span>
          )}
          <button
            onClick={() => void handleCreateWorkflow()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Plus size={12} />
            {creating ? "Creating..." : "Add Workflow"}
          </button>
          <button
            onClick={() => void saveDraft()}
            disabled={!selectedWorkflow || saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => void publishWorkflow()}
            disabled={!selectedWorkflow || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Send size={12} />
            Publish
          </button>
          <button
            onClick={() => void handleDeleteWorkflow()}
            disabled={!selectedWorkflow || selectedWorkflow.is_default || deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={12} />
            {deleting ? "Deleting..." : "Delete Workflow"}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="surface-card p-4 text-xs text-slate-500">Loading workflows...</div>
      ) : (
        <div className="space-y-4">
          <section className="surface-card p-4">
            <div className="mb-4">
              <p className="mb-2 text-xs text-slate-500">Workflow Name</p>
              {selectedWorkflow && (
                <input
                  value={selectedWorkflow.name}
                  onChange={(e) =>
                    patchSelectedWorkflow((workflow) => ({ ...workflow, name: e.target.value }))
                  }
                  className="mb-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-300"
                />
              )}
              <div className="flex flex-wrap gap-2">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => selectWorkflow(workflow.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                      selectedWorkflowId === workflow.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-neutral-200 bg-white text-slate-600 hover:bg-neutral-50"
                    }`}
                  >
                    {workflow.name}
                    {workflow.is_default ? " (Default)" : ""}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {selectedWorkflow ? (
            <>
              <div
                ref={layoutRef}
                className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_12px_var(--config-panel-width)]"
                style={{ ["--config-panel-width" as string]: `${configPanelWidth}px` }}
              >
              <section ref={stageMapRef} className="surface-card relative overflow-hidden p-4">
                {connectorLines.length > 0 && (
                  <svg className="pointer-events-none absolute inset-0 h-full w-full">
                    {connectorLines.map((line, index) => (
                      <line
                        key={`${line.fromX}-${line.toX}-${index}`}
                        x1={line.fromX}
                        y1={line.fromY}
                        x2={line.toX}
                        y2={line.toY}
                        stroke={selectedExceptionStage?.stage_type === "CANCELLED" ? "#EF4444" : "#F59E0B"}
                        strokeWidth="2"
                        strokeDasharray="8 6"
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                )}
                <div className="relative z-10 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Configure Stages</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Build the main flow top to bottom, then connect tasks into blocked or cancelled exits.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 grid items-start gap-5 lg:grid-cols-[14rem_14rem]">
                  <div className="space-y-2 justify-self-start">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Main Flow
                    </div>
                    {mainFlowStages.map((stage, index) => (
                      <div key={stage.id} className="flex flex-col items-start gap-2.5">
                        {renderStageCard(stage, stage.stage_type !== "COMPLETED", ["GENERAL", "COMPLETED"])}
                        {index < mainFlowStages.length - 1 && (
                          <span className="pl-[6.4rem] text-slate-400">↓</span>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addStage("GENERAL")}
                      className="inline-flex min-h-24 w-full max-w-[14rem] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-xs font-medium text-slate-500 hover:bg-neutral-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Plus size={12} />
                        Add Main Stage
                      </span>
                    </button>
                  </div>

                  <div className="space-y-4 self-center justify-self-start">
                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Blocked State
                      </div>
                      {pausedStages.length ? (
                        renderStageCard(pausedStages[0], true, ["PAUSED"])
                      ) : (
                        <div className="flex min-h-24 max-w-[14rem] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-xs text-slate-500">
                          <button
                            onClick={() => addStage("PAUSED")}
                            className="rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-neutral-50"
                          >
                            + Add blocked state
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Cancelled State
                      </div>
                      {cancelledStages.length ? (
                        renderStageCard(cancelledStages[0], true, ["CANCELLED"])
                      ) : (
                        <div className="flex min-h-24 max-w-[14rem] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-xs text-slate-500">
                          <button
                            onClick={() => addStage("CANCELLED")}
                            className="rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-neutral-50"
                          >
                            + Add cancelled state
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedExceptionStage && (
                  <div
                    className={`relative z-10 mt-5 rounded-xl border px-4 py-3 text-sm ${
                      selectedExceptionStage.stage_type === "CANCELLED"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    Click the stages in the main flow that can move a task here.
                  </div>
                )}
              </section>

              <button
                type="button"
                onMouseDown={beginPanelResize}
                className="hidden h-full min-h-[28rem] w-3 cursor-col-resize rounded-full border border-neutral-200 bg-white/80 text-slate-300 transition hover:bg-neutral-50 hover:text-slate-500 xl:flex xl:items-center xl:justify-center"
                aria-label="Resize configuration panel"
                title="Drag to resize"
              >
                <span className="text-xs">⋮</span>
              </button>

              <section className="w-full overflow-hidden rounded-lg border border-neutral-200 bg-white xl:justify-self-end">
                {!selectedStage ? (
                  <div className="px-4 py-5 text-xs text-slate-500">Select a stage to configure it.</div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between border-b border-neutral-200 px-4 py-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          Configure Stage: {selectedStage.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Zone-specific rules, entry requirements, and transition permissions.
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedStageId(null)}
                        className="rounded-md border border-neutral-200 p-1 text-slate-500 hover:bg-neutral-50"
                        title="Close stage configuration"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="space-y-4 px-4 py-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-700">Stage Name</p>
                        <input
                          value={selectedStage.name}
                          onChange={(e) =>
                            patchSelectedWorkflow((workflow) => ({
                              ...workflow,
                              stages: workflow.stages.map((stage) =>
                                stage.id === selectedStage.id ? { ...stage, name: e.target.value } : stage
                              ),
                            }))
                          }
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-700">Stage Type</p>
                        <select
                          value={selectedStage.stage_type}
                          disabled={selectedStage.stage_type === "COMPLETED"}
                          onChange={(e) =>
                            patchSelectedWorkflow((workflow) => ({
                              ...workflow,
                              stages: workflow.stages.map((stage) =>
                                stage.id === selectedStage.id
                                  ? { ...stage, stage_type: e.target.value as WorkflowStageType }
                                  : stage
                              ),
                            }))
                          }
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
                        >
                          <option value="GENERAL">General</option>
                          <option value="PAUSED">Paused</option>
                          <option value="CANCELLED">Cancelled</option>
                          {selectedStage.stage_type === "COMPLETED" && (
                            <option value="COMPLETED">Completed</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Stage Color</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => setIsCustomColorPickerOpen((prev) => !prev)}
                            className={`inline-flex h-7 min-w-[96px] items-center justify-center rounded-full border px-2 text-[11px] font-medium ${
                              isCustomColorPickerOpen
                                ? "border-slate-700 bg-slate-700 text-white"
                                : "border-neutral-300 bg-white text-slate-700 hover:bg-neutral-50"
                            }`}
                          >
                            Custom
                          </button>
                          {isCustomColorPickerOpen ? (
                            <div className="absolute left-0 top-9 z-20 w-56 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[11px] font-medium text-slate-700">Custom color</p>
                                <input
                                  type="color"
                                  value={/^#[0-9A-F]{6}$/.test(customStageColor) ? customStageColor : DEFAULT_STAGE_COLOR}
                                  onChange={(e) => setCustomStageColor(e.target.value.toUpperCase())}
                                  className="h-7 w-10 cursor-pointer rounded border border-neutral-200 bg-transparent p-0.5"
                                />
                              </div>
                              <input
                                value={customStageColor}
                                onChange={(e) => setCustomStageColor(e.target.value.toUpperCase())}
                                placeholder="#3B82F6"
                                className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                              />
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setIsCustomColorPickerOpen(false)}
                                  className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-neutral-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    if (/^#[0-9A-F]{6}$/.test(customStageColor)) {
                                      patchSelectedWorkflow((workflow) => ({
                                        ...workflow,
                                        stages: workflow.stages.map((stage) =>
                                          stage.id === selectedStage.id ? { ...stage, color: customStageColor } : stage
                                        ),
                                      }))
                                      setIsCustomColorPickerOpen(false)
                                    }
                                  }}
                                  className="rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {stagePaletteColors.map((color, index) => (
                          <button
                            key={`${color}-${index}`}
                            onClick={() =>
                              patchSelectedWorkflow((workflow) => ({
                                ...workflow,
                                stages: workflow.stages.map((stage) =>
                                  stage.id === selectedStage.id ? { ...stage, color } : stage
                                ),
                              }))
                            }
                            className={`h-7 w-7 rounded-full border ${
                              (selectedStage.color || DEFAULT_STAGE_COLOR) === color
                                ? "ring-2 ring-slate-700 ring-offset-2"
                                : ""
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {selectedStage.stage_type === "CANCELLED" && (
                        <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                          <p className="text-sm font-medium text-slate-800">Entry Reason</p>
                          <select
                            value={selectedStage.entry_reason_mode}
                            onChange={(e) =>
                              patchSelectedWorkflow((workflow) => ({
                                ...workflow,
                                stages: workflow.stages.map((stage) =>
                                  stage.id === selectedStage.id
                                    ? {
                                        ...stage,
                                        entry_reason_mode: e.target.value as WorkflowEntryReasonMode,
                                      }
                                    : stage
                                ),
                              }))
                            }
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
                          >
                            <option value="NONE">No reason</option>
                            <option value="OPTIONAL">Optional reason</option>
                            <option value="REQUIRED">Required reason</option>
                          </select>
                          <p className="text-xs text-slate-500">
                            Cancelled exits are terminal and cannot be reopened through workflow transitions.
                          </p>
                        </div>
                      )}

                      {selectedStage.stage_type !== "COMPLETED" && (
                        <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-800">Require Attachments</p>
                            <button
                              onClick={() =>
                                patchSelectedWorkflow((workflow) => ({
                                  ...workflow,
                                  stages: workflow.stages.map((stage) =>
                                    stage.id === selectedStage.id
                                      ? { ...stage, requires_attachments: !stage.requires_attachments }
                                      : stage
                                  ),
                                }))
                              }
                              className={`rounded-full px-3 py-1 text-[11px] ${
                                selectedStage.requires_attachments
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {selectedStage.requires_attachments ? "On" : "Off"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500">
                            Require supporting files before the task can leave this stage.
                          </p>
                        </div>
                      )}

                      {selectedStage.stage_type !== "COMPLETED" && (
                        <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-800">Require Approval</p>
                            <button
                              onClick={() =>
                                patchSelectedWorkflow((workflow) => ({
                                  ...workflow,
                                  stages: workflow.stages.map((stage) =>
                                    stage.id === selectedStage.id
                                      ? { ...stage, requires_approval: !stage.requires_approval }
                                      : stage
                                  ),
                                }))
                              }
                              className={`rounded-full px-3 py-1 text-[11px] ${
                                selectedStage.requires_approval
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {selectedStage.requires_approval ? "On" : "Off"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500">
                            Require an approval step before the task can leave this stage.
                          </p>
                        </div>
                      )}

                      {selectedStage.stage_type === "COMPLETED" && (
                        <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                          <p className="text-sm font-medium text-slate-800">Terminal End</p>
                          <p className="text-xs text-slate-500">
                            This stage is the mandatory terminal end of the main flow.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                      <p className="text-sm font-medium text-slate-800">Outgoing Transition Roles</p>
                      {transitionTargets.length ? (() => {
                        const normalTargets = transitionTargets.filter(
                          (target) => target.stage.stage_type !== "PAUSED"
                        )
                        const pausedTargets = selectedStage.stage_type === "PAUSED"
                          ? transitionTargets
                          : transitionTargets.filter((target) => target.stage.stage_type === "PAUSED")
                        const renderTarget = (target: { stage: WorkflowStage; roles: string[] }) => (
                          <div
                            key={target.stage.id}
                            className="rounded-lg border border-neutral-200 p-3"
                          >
                            <p className="text-xs font-medium text-slate-800">
                              {selectedStage.name} → {target.stage.name}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {STAGE_TYPE_LABELS[target.stage.stage_type]}
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {ROLE_OPTIONS.map((role) => {
                                const checked = target.roles.includes(role)
                                return (
                                  <label
                                    key={role}
                                    className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-slate-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const nextRoles = e.target.checked
                                          ? Array.from(new Set([...target.roles, role]))
                                          : target.roles.filter((item) => item !== role)
                                        updateTransitionRoles(selectedStage.id, target.stage.id, nextRoles)
                                      }}
                                      className="h-3.5 w-3.5"
                                    />
                                    {formatRoleLabel(role)}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                        return (
                          <div className="space-y-3">
                            {selectedStage.stage_type === "PAUSED"
                              ? pausedTargets.map(renderTarget)
                              : normalTargets.map(renderTarget)
                            }
                            {selectedStage.stage_type !== "PAUSED" && pausedTargets.length > 0 && (
                              <div className="rounded-lg border border-neutral-200">
                                <button
                                  type="button"
                                  onClick={() => setShowAdvancedTransitions((prev) => !prev)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-slate-500 hover:bg-neutral-50 rounded-lg"
                                >
                                  <span className="font-medium text-slate-700">Advanced Configuration</span>
                                  <span className="text-[11px]">{showAdvancedTransitions ? "▲ Hide" : "▼ Show"}</span>
                                </button>
                                {showAdvancedTransitions && (
                                  <div className="space-y-3 border-t border-neutral-200 p-3">
                                    <p className="text-[11px] text-slate-500">
                                      Controls who can move tasks into paused stages from this stage.
                                    </p>
                                    {pausedTargets.map(renderTarget)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })() : (
                        <p className="text-xs text-slate-500">
                          This stage has no valid outgoing transitions in its current zone.
                        </p>
                      )}
                    </div>
                    </div>
                  </div>
                )}
              </section>
              </div>
            </>
          ) : (
            <div className="surface-card p-4 text-xs text-slate-500">
              No workflow found for this tenant.
            </div>
          )}
        </div>
      )}
    </WorkspaceShell>
  )
}