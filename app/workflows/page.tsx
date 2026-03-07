"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { GripVertical, Plus, Save, Send, Trash2, X } from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { WorkflowDefinition } from "@/types/workflow"
import { useAuth } from "@/context/AuthContext"

type WorkflowListResponse =
  | WorkflowDefinition[]
  | {
      results?: WorkflowDefinition[]
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

type TransitionGroup = {
  key: string
  from_stage: number
  to_stage: number
  allowed_roles: string[]
}

const formatRoleLabel = (role: string) =>
  role.replaceAll("_", " ").replace("TASK ", "Task ")

function normalizeWorkflowForDiff(workflow: WorkflowDefinition) {
  const stages = [...workflow.stages]
    .sort((a, b) => a.order - b.order)
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      is_terminal: stage.is_terminal,
      requires_attachments: stage.requires_attachments,
      color: stage.color || DEFAULT_STAGE_COLOR,
    }))

  const transitions = [...workflow.transitions]
    .map((transition) => ({
      from_stage: transition.from_stage,
      to_stage: transition.to_stage,
      allowed_role: transition.allowed_role,
    }))
    .sort((a, b) =>
      `${a.from_stage}:${a.to_stage}:${a.allowed_role}`.localeCompare(
        `${b.from_stage}:${b.to_stage}:${b.allowed_role}`
      )
    )

  return JSON.stringify({
    name: workflow.name,
    statuses: [...(workflow.statuses || [])]
      .sort((a, b) => a.order - b.order)
      .map((status) => ({
        id: status.id,
        name: status.name,
        order: status.order,
        is_terminal: status.is_terminal,
        color: status.color || DEFAULT_STAGE_COLOR,
      })),
    transition_rules: [...(workflow.transition_rules || [])]
      .map((rule) => ({
        from_status: rule.from_status,
        to_status: rule.to_status,
        allowed_roles: [...(rule.allowed_roles || [])].sort(),
        proof_requirements: [...(rule.proof_requirements || [])]
          .map((req) => ({
            type: req.type,
            label: req.label,
            is_mandatory: req.is_mandatory,
          }))
          .sort((a, b) => `${a.type}:${a.label}`.localeCompare(`${b.type}:${b.label}`)),
      }))
      .sort((a, b) =>
        `${a.from_status}:${a.to_status}:${a.allowed_roles.join(",")}`.localeCompare(
          `${b.from_status}:${b.to_status}:${b.allowed_roles.join(",")}`
        )
      ),
    stages,
    transitions,
  })
}

function hydrateTransitions(workflow: WorkflowDefinition): WorkflowDefinition {
  const statuses = [...(workflow.statuses || [])].sort((a, b) => a.order - b.order)
  const transitionRules = (workflow.transition_rules || []).map((rule) => {
    const from = statuses.find((status) => status.id === rule.from_status)
    const to = statuses.find((status) => status.id === rule.to_status)
    return {
      ...rule,
      from_status_name: from?.name || rule.from_status_name,
      to_status_name: to?.name || rule.to_status_name,
      allowed_roles: rule.allowed_roles || [],
      proof_requirements: rule.proof_requirements || [],
    }
  })
  return {
    ...workflow,
    statuses: statuses.map((status) => ({
      ...status,
      color: status.color || DEFAULT_STAGE_COLOR,
    })),
    transition_rules: transitionRules,
    stages: [...workflow.stages]
      .sort((a, b) => a.order - b.order)
      .map((stage) => ({
        ...stage,
        color: stage.color || DEFAULT_STAGE_COLOR,
      })),
    transitions: workflow.transitions.map((transition) => ({
      ...transition,
      from_stage_name:
        workflow.stages.find((stage) => stage.id === transition.from_stage)?.name ||
        transition.from_stage_name,
      from_stage_color:
        workflow.stages.find((stage) => stage.id === transition.from_stage)?.color ||
        transition.from_stage_color ||
        DEFAULT_STAGE_COLOR,
      to_stage_name:
        workflow.stages.find((stage) => stage.id === transition.to_stage)?.name ||
        transition.to_stage_name,
      to_stage_color:
        workflow.stages.find((stage) => stage.id === transition.to_stage)?.color ||
        transition.to_stage_color ||
        DEFAULT_STAGE_COLOR,
    })),
  }
}

export default function WorkflowBuilderPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
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

  const selectedWorkflow = useMemo(
    () => workflows.find((wf) => wf.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  )
  const selectedStage = useMemo(
    () => selectedWorkflow?.stages.find((stage) => stage.id === selectedStageId) ?? null,
    [selectedWorkflow, selectedStageId]
  )
  const selectedStageIndex = useMemo(
    () =>
      selectedWorkflow?.stages.findIndex((stage) => stage.id === selectedStageId) ?? -1,
    [selectedWorkflow, selectedStageId]
  )
  const nextStage = useMemo(
    () =>
      selectedWorkflow && selectedStageIndex >= 0
        ? selectedWorkflow.stages[selectedStageIndex + 1] || null
        : null,
    [selectedWorkflow, selectedStageIndex]
  )
  const stagePaletteColors = useMemo(() => {
    const normalizedCustom = customStageColor.toUpperCase()
    if (!/^#[0-9A-F]{6}$/.test(normalizedCustom)) {
      return STAGE_PRESET_COLORS
    }
    return [normalizedCustom, ...STAGE_PRESET_COLORS.slice(1)]
  }, [customStageColor])

  useEffect(() => {
    setCustomStageColor(selectedStage?.color || DEFAULT_STAGE_COLOR)
    setIsCustomColorPickerOpen(false)
  }, [selectedStage?.id, selectedStage?.color])

  const applySelectedStageColor = (color: string) => {
    if (!selectedStage) return
    if (!/^#[0-9A-F]{6}$/.test(color)) return
    patchSelectedWorkflow((wf) => ({
      ...wf,
      stages: wf.stages.map((stage) =>
        stage.id === selectedStage.id ? { ...stage, color } : stage
      ),
      statuses: (wf.statuses || []).map((status) =>
        status.name === selectedStage.name ? { ...status, color } : status
      ),
    }))
  }

  useEffect(() => {
    if (!user?.tenant_slug) return
    if (pathname === "/workflows") {
      router.replace(`/${user.tenant_slug}/workflows`)
    }
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
        const data = raw.map(hydrateTransitions)
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
        item.id === selectedWorkflow.id ? hydrateTransitions(updater(item)) : item
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

  const moveStage = (sourceId: number, targetId: number) => {
    if (!selectedWorkflow || sourceId === targetId) return
    const stages = [...selectedWorkflow.stages]
    const sourceIndex = stages.findIndex((stage) => stage.id === sourceId)
    const targetIndex = stages.findIndex((stage) => stage.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const [moved] = stages.splice(sourceIndex, 1)
    stages.splice(targetIndex, 0, moved)
    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      stages: stages.map((stage, index) => ({ ...stage, order: index })),
    }))
  }

  const deleteStage = (stageId: number) => {
    if (!selectedWorkflow) return
    if (selectedWorkflow.stages.length <= 1) {
      alert("Workflow must have at least one stage.")
      return
    }
    patchSelectedWorkflow((workflow) => {
      const nextStages = workflow.stages
        .filter((stage) => stage.id !== stageId)
        .map((stage, idx) => ({ ...stage, order: idx }))
      const nextTransitions = workflow.transitions.filter(
        (transition) =>
          transition.from_stage !== stageId && transition.to_stage !== stageId
      )
      return {
        ...workflow,
        stages: nextStages,
        transitions: nextTransitions,
      }
    })

    if (selectedStageId === stageId) {
      const fallback = selectedWorkflow.stages.find((stage) => stage.id !== stageId)
      setSelectedStageId(fallback?.id ?? null)
    }
  }

  const transitionGroups = useMemo<TransitionGroup[]>(() => {
    if (!selectedWorkflow) return []
    const map = new Map<string, TransitionGroup>()
    selectedWorkflow.transitions.forEach((transition) => {
      const key = `${transition.from_stage}->${transition.to_stage}`
      const current =
        map.get(key) ||
        {
          key,
          from_stage: transition.from_stage,
          to_stage: transition.to_stage,
          allowed_roles: [],
        }
      if (!current.allowed_roles.includes(transition.allowed_role)) {
        current.allowed_roles.push(transition.allowed_role)
      }
      map.set(key, current)
    })
    return [...map.values()].sort((a, b) =>
      `${a.from_stage}:${a.to_stage}`.localeCompare(`${b.from_stage}:${b.to_stage}`)
    )
  }, [selectedWorkflow])

  const selectedTransitionGroup = useMemo(() => {
    if (!selectedStage || !nextStage) return null
    return (
      transitionGroups.find(
        (group) =>
          group.from_stage === selectedStage.id && group.to_stage === nextStage.id
      ) || null
    )
  }, [selectedStage, nextStage, transitionGroups])

  const updateTransitionGroup = (
    groupKey: string,
    patch: Partial<Omit<TransitionGroup, "key">>
  ) => {
    if (!selectedWorkflow) return
    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      transitions: (() => {
        const existingGroups = new Map<string, TransitionGroup>()
        workflow.transitions.forEach((transition) => {
          const key = `${transition.from_stage}->${transition.to_stage}`
          const current =
            existingGroups.get(key) ||
            {
              key,
              from_stage: transition.from_stage,
              to_stage: transition.to_stage,
              allowed_roles: [],
            }
          if (!current.allowed_roles.includes(transition.allowed_role)) {
            current.allowed_roles.push(transition.allowed_role)
          }
          existingGroups.set(key, current)
        })

        const currentGroup = existingGroups.get(groupKey)
        if (!currentGroup) return workflow.transitions

        existingGroups.delete(groupKey)
        const nextGroup: TransitionGroup = {
          ...currentGroup,
          ...patch,
        }

        const nextKey = `${nextGroup.from_stage}->${nextGroup.to_stage}`
        const mergeTarget = existingGroups.get(nextKey)
        if (mergeTarget) {
          mergeTarget.allowed_roles = Array.from(
            new Set([...(mergeTarget.allowed_roles || []), ...(nextGroup.allowed_roles || [])])
          )
          existingGroups.set(nextKey, mergeTarget)
        } else {
          existingGroups.set(nextKey, {
            ...nextGroup,
            key: nextKey,
            allowed_roles: Array.from(new Set(nextGroup.allowed_roles || [])),
          })
        }

        const expanded: WorkflowDefinition["transitions"] = []
        existingGroups.forEach((group) => {
          const from = workflow.stages.find((stage) => stage.id === group.from_stage)
          const to = workflow.stages.find((stage) => stage.id === group.to_stage)
          const roles = group.allowed_roles.length ? group.allowed_roles : ["TASK_CREATOR"]
          roles.forEach((role, idx) => {
            expanded.push({
              id: -Date.now() - idx - Math.round(Math.random() * 1000),
              from_stage: group.from_stage,
              from_stage_name: from?.name || "From",
              to_stage: group.to_stage,
              to_stage_name: to?.name || "To",
              allowed_role: role,
            })
          })
        })
        return expanded
      })(),
    }))
  }

  const updateSelectedStageRole = (role: string, enabled: boolean) => {
    if (!selectedWorkflow || !selectedStage || !nextStage) return
    const currentRoles = selectedTransitionGroup?.allowed_roles || []
    const nextRoles = enabled
      ? Array.from(new Set([...currentRoles, role]))
      : currentRoles.filter((item) => item !== role)

    if (selectedTransitionGroup) {
      updateTransitionGroup(selectedTransitionGroup.key, { allowed_roles: nextRoles })
      return
    }

    if (!enabled) return

    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      transitions: [
        ...workflow.transitions,
        {
          id: -Date.now(),
          from_stage: selectedStage.id,
          from_stage_name: selectedStage.name,
          from_stage_color: selectedStage.color || DEFAULT_STAGE_COLOR,
          to_stage: nextStage.id,
          to_stage_name: nextStage.name,
          to_stage_color: nextStage.color || DEFAULT_STAGE_COLOR,
          allowed_role: role,
        },
      ],
    }))
  }

  const parseErrorDetail = async (res: Response) => {
    const raw = await res.text()
    if (!raw) return null
    try {
      const body = JSON.parse(raw)
      return body
    } catch {
      return { detail: raw }
    }
  }

  const formatWorkflowError = (detail: unknown, fallback: string) => {
    if (!detail) return fallback
    if (typeof detail === "string") {
      const text = detail.trim()
      if (text.includes("uniq_stage_name_per_workflow")) {
        return "Stage names must be unique within a workflow."
      }
      if (text.includes("uniq_status_name_per_workflow")) {
        return "Status names must be unique within a workflow."
      }
      if (text.includes("uniq_stage_order_per_workflow")) {
        return "Stage order conflict detected. Please retry saving."
      }
      const isHtml = /<\/?[a-z][\s\S]*>/i.test(text)
      if (isHtml) {
        const titleMatch = text.match(/<title>(.*?)<\/title>/i)
        const title = titleMatch?.[1]?.trim()
        if (title && title.toLowerCase() !== "server error (500)") {
          return `Workflow save failed: ${title}`
        }
        return "Workflow save failed due to a server error. Please retry. If it keeps failing, check backend logs."
      }
      return text
    }
    if (typeof detail !== "object") return fallback

    const payload = detail as {
      detail?: string
      blocked_stages?: Array<{ name: string; task_count: number }>
      [key: string]: unknown
    }

    if (payload.blocked_stages?.length) {
      const names = payload.blocked_stages
        .map((stage) => `${stage.name} (${stage.task_count})`)
        .join(", ")
      return `Cannot delete stages with active tasks: ${names}`
    }

    if (payload.detail && String(payload.detail).trim()) {
      return String(payload.detail)
    }

    const firstError = Object.values(payload).find((value) => {
      if (typeof value === "string" && value.trim()) return true
      if (Array.isArray(value) && value.length) return true
      return false
    })
    if (Array.isArray(firstError)) return String(firstError[0] || fallback)
    if (typeof firstError === "string") return firstError
    return fallback
  }

  const saveDraft = async () => {
    if (!selectedWorkflow) return null
    setSaving(true)
    try {
      const transitionPayload = Array.from(
        new Map(
          selectedWorkflow.transitions
            .filter((transition) => transition.from_stage > 0 && transition.to_stage > 0)
            .map((transition) => [
              `${transition.from_stage}:${transition.to_stage}:${transition.allowed_role}`,
              {
                from_stage: transition.from_stage,
                to_stage: transition.to_stage,
                allowed_role: transition.allowed_role,
              },
            ])
        ).values()
      )

      const res = await apiFetch(`/api/workflows/${selectedWorkflow.id}/builder/`, {
        method: "PATCH",
        body: JSON.stringify({
          version: selectedWorkflow.version,
          name: selectedWorkflow.name,
          statuses: (selectedWorkflow.statuses || []).map((status) => ({
            id: status.id > 0 ? status.id : null,
            name: status.name,
            order: status.order,
            is_terminal: status.is_terminal,
            color: status.color || DEFAULT_STAGE_COLOR,
          })),
          transition_rules: (selectedWorkflow.transition_rules || [])
            .map((rule) => ({
              from_status: rule.from_status,
              from_status_name: rule.from_status_name,
              to_status: rule.to_status,
              to_status_name: rule.to_status_name,
              allowed_roles: (rule.allowed_roles || []).filter(Boolean),
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
            is_terminal: stage.is_terminal,
            requires_attachments: stage.requires_attachments,
            color: stage.color || DEFAULT_STAGE_COLOR,
          })),
          transitions: transitionPayload,
        }),
      })

      if (res.status === 409) {
        alert("Workflow changed elsewhere. Refresh and retry.")
        return null
      }

      if (!res.ok) {
        const detail = await parseErrorDetail(res)
        alert(formatWorkflowError(detail, "Failed to save workflow draft."))
        return null
      }

      const payload = hydrateTransitions((await res.json()) as WorkflowDefinition)
      setWorkflows((prev) => prev.map((wf) => (wf.id === payload.id ? payload : wf)))
      setBaselines((prev) => ({ ...prev, [payload.id]: normalizeWorkflowForDiff(payload) }))
      setSelectedWorkflowId(payload.id)
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
        body: JSON.stringify({
          version: draft.version,
        }),
      })

      if (res.status === 409) {
        alert("Workflow changed elsewhere. Refresh and retry publish.")
        return
      }

      if (!res.ok) {
        const detail = await parseErrorDetail(res)
        alert(formatWorkflowError(detail, "Failed to publish workflow."))
        return
      }

      const payload = hydrateTransitions((await res.json()) as WorkflowDefinition)
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
        const detail = await parseErrorDetail(res)
        alert(formatWorkflowError(detail, "Unable to create workflow."))
        return
      }
      const created = (await res.json()) as WorkflowDefinition
      const hydrated = hydrateTransitions(created)
      setWorkflows((prev) => [...prev, hydrated])
      setBaselines((prev) => ({
        ...prev,
        [hydrated.id]: normalizeWorkflowForDiff(hydrated),
      }))
      setSelectedWorkflowId(hydrated.id)
      setSelectedStageId(hydrated.stages[0]?.id ?? null)
    } catch (err) {
      console.error("Failed to create workflow:", err)
      alert("Unable to create workflow.")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteWorkflow = async () => {
    if (!selectedWorkflow || selectedWorkflow.is_default || deleting) return
    const confirmed = window.confirm(
      `Delete workflow "${selectedWorkflow.name}"? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await apiFetch(`/api/workflows/${selectedWorkflow.id}/`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const detail = await parseErrorDetail(res)
        alert(formatWorkflowError(detail, "Unable to delete workflow."))
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

  return (
    <WorkspaceShell
      title="Workflow Builder"
      subtitle="Tenant workflow editor with draft, publish, transition routing, and stage controls."
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={12} />
            {creating ? "Creating..." : "Add Workflow"}
          </button>
          <button
            onClick={() => void saveDraft()}
            disabled={!selectedWorkflow || saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => void publishWorkflow()}
            disabled={!selectedWorkflow || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={12} />
            Publish
          </button>
          <button
            onClick={() => void handleDeleteWorkflow()}
            disabled={!selectedWorkflow || selectedWorkflow.is_default || deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                    patchSelectedWorkflow((wf) => ({ ...wf, name: e.target.value }))
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

            {!selectedWorkflow ? (
              <div className="rounded-lg border border-neutral-200 p-3 text-xs text-slate-500">
                No workflow found for this tenant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-3">
                  {selectedWorkflow.stages.map((stage, idx) => {
                    const next = selectedWorkflow.stages[idx + 1]
                    const group = next
                      ? transitionGroups.find(
                          (item) =>
                            item.from_stage === stage.id && item.to_stage === next.id
                        )
                      : null
                    const roleSummary = group?.allowed_roles?.length
                      ? group.allowed_roles.map(formatRoleLabel).join(", ")
                      : "No roles"

                    return (
                      <div
                        key={stage.id}
                        className="flex items-center gap-3"
                        draggable
                        onDragStart={() => setDraggingStageId(stage.id)}
                        onDragEnd={() => setDraggingStageId(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggingStageId) moveStage(draggingStageId, stage.id)
                        }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedStageId(stage.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setSelectedStageId(stage.id)
                            }
                          }}
                          className={`h-44 w-60 rounded-xl border p-3 text-left transition ${
                            selectedStageId === stage.id
                              ? ""
                              : "border-neutral-200 bg-white hover:bg-neutral-50"
                          }`}
                          style={
                            selectedStageId === stage.id
                              ? {
                                  borderColor: stage.color || DEFAULT_STAGE_COLOR,
                                  backgroundColor: `${stage.color || DEFAULT_STAGE_COLOR}14`,
                                }
                              : undefined
                          }
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                              <GripVertical size={11} />
                              Drag
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
                          <p className="line-clamp-2 min-h-[32px] text-[11px] text-slate-600">
                            Roles: {roleSummary}
                          </p>
                          <p className="mt-1 min-h-[16px] text-[11px] text-slate-600">
                            {stage.requires_attachments
                              ? "Attachment required"
                              : "No requirements"}
                          </p>
                          <p
                            className={`mt-1 min-h-[16px] text-[11px] font-medium ${
                              stage.is_terminal ? "text-emerald-700" : "text-transparent"
                            }`}
                          >
                            Terminal stage
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteStage(stage.id)
                            }}
                            className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                            title="Remove stage"
                            aria-label="Remove stage"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        {idx < selectedWorkflow.stages.length - 1 && (
                          <span className="text-slate-400">→</span>
                        )}
                      </div>
                    )
                  })}

                  <button
                    onClick={() => {
                      if (!selectedWorkflow) return
                      const nextId = -Date.now()
                      patchSelectedWorkflow((wf) => ({
                        ...wf,
                        stages: [
                          ...wf.stages,
                          {
                            id: nextId,
                            name: `Stage ${wf.stages.length + 1}`,
                            order: wf.stages.length,
                            is_terminal: false,
                            requires_attachments: false,
                            color: DEFAULT_STAGE_COLOR,
                          },
                        ],
                      }))
                      setSelectedStageId(nextId)
                    }}
                    className="flex h-[152px] w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-slate-500 hover:bg-neutral-50"
                    title="Add Stage"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="surface-card p-4">
            {!selectedStage || !selectedWorkflow ? (
              <p className="text-xs text-slate-500">Select a stage to configure it.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Configure Stage: {selectedStage.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Set permissions, colors, and movement requirements for this stage.
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

                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Stage Name</p>
                    <input
                      value={selectedStage.name}
                      onChange={(e) =>
                        patchSelectedWorkflow((wf) => ({
                          ...wf,
                          stages: wf.stages.map((stage) =>
                            stage.id === selectedStage.id
                              ? { ...stage, name: e.target.value }
                              : stage
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
                    />
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
                          title="Choose custom color"
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
                                title="Pick custom color"
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
                                  applySelectedStageColor(customStageColor)
                                  setIsCustomColorPickerOpen(false)
                                }}
                                disabled={!/^#[0-9A-F]{6}$/.test(customStageColor)}
                                className="rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white disabled:opacity-50"
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
                          onClick={() => applySelectedStageColor(color)}
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
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">Terminal Stage</p>
                      <button
                        onClick={() =>
                          patchSelectedWorkflow((wf) => ({
                            ...wf,
                            stages: wf.stages.map((stage) =>
                              stage.id === selectedStage.id
                                ? { ...stage, is_terminal: !stage.is_terminal }
                                : stage
                            ),
                          }))
                        }
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          selectedStage.is_terminal
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {selectedStage.is_terminal ? "On" : "Off"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Mark this stage as final. Terminal tasks do not move forward.
                    </p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">Require Attachments</p>
                      <button
                        onClick={() =>
                          patchSelectedWorkflow((wf) => ({
                            ...wf,
                            stages: wf.stages.map((stage) =>
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
                      Tasks must include required files before moving out of this stage.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                  <p className="text-sm font-medium text-slate-800">Allowed Roles for Next Transition</p>
                  {nextStage ? (
                    <>
                      <p className="text-xs text-slate-500">
                        Controls who can move tasks from <strong>{selectedStage.name}</strong> to <strong>{nextStage.name}</strong>.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ROLE_OPTIONS.map((role) => {
                          const checked = (selectedTransitionGroup?.allowed_roles || []).includes(role)
                          return (
                            <label
                              key={role}
                              className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-xs text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => updateSelectedStageRole(role, e.target.checked)}
                                className="h-3.5 w-3.5"
                              />
                              {formatRoleLabel(role)}
                            </label>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      This is the last stage. No outgoing transition.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </WorkspaceShell>
  )
}
