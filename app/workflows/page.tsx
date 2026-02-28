"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { GripVertical, Plus, Save, Send, Trash2 } from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { WorkflowDefinition } from "@/types/workflow"

type WorkflowListResponse =
  | WorkflowDefinition[]
  | {
      results?: WorkflowDefinition[]
    }

const ROLE_OPTIONS = ["TASK_CREATOR", "TASK_RECEIVER", "ADMIN"]

function normalizeWorkflowForDiff(workflow: WorkflowDefinition) {
  const stages = [...workflow.stages]
    .sort((a, b) => a.order - b.order)
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      is_terminal: stage.is_terminal,
      requires_attachments: stage.requires_attachments,
      requires_approval: stage.requires_approval,
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
    stages,
    transitions,
  })
}

function hydrateTransitions(workflow: WorkflowDefinition): WorkflowDefinition {
  return {
    ...workflow,
    stages: [...workflow.stages].sort((a, b) => a.order - b.order),
    transitions: workflow.transitions.map((transition) => ({
      ...transition,
      from_stage_name:
        workflow.stages.find((stage) => stage.id === transition.from_stage)?.name ||
        transition.from_stage_name,
      to_stage_name:
        workflow.stages.find((stage) => stage.id === transition.to_stage)?.name ||
        transition.to_stage_name,
    })),
  }
}

export default function WorkflowBuilderPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [draggingStageId, setDraggingStageId] = useState<number | null>(null)
  const [baselines, setBaselines] = useState<Record<number, string>>({})

  const selectedWorkflow = useMemo(
    () => workflows.find((wf) => wf.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  )
  const selectedStage = useMemo(
    () => selectedWorkflow?.stages.find((stage) => stage.id === selectedStageId) ?? null,
    [selectedWorkflow, selectedStageId]
  )

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

  const addTransition = () => {
    if (!selectedWorkflow || selectedWorkflow.stages.length < 2) return
    const fromStage = selectedWorkflow.stages[0]
    const toStage = selectedWorkflow.stages[1]
    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      transitions: [
        ...workflow.transitions,
        {
          id: -Date.now(),
          from_stage: fromStage.id,
          from_stage_name: fromStage.name,
          to_stage: toStage.id,
          to_stage_name: toStage.name,
          allowed_role: "TASK_CREATOR",
        },
      ],
    }))
  }

  const updateTransition = (
    transitionId: number,
    patch: Partial<WorkflowDefinition["transitions"][number]>
  ) => {
    if (!selectedWorkflow) return
    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      transitions: workflow.transitions.map((transition) => {
        if (transition.id !== transitionId) return transition
        const merged = { ...transition, ...patch }
        const from = workflow.stages.find((stage) => stage.id === merged.from_stage)
        const to = workflow.stages.find((stage) => stage.id === merged.to_stage)
        return {
          ...merged,
          from_stage_name: from?.name || merged.from_stage_name,
          to_stage_name: to?.name || merged.to_stage_name,
        }
      }),
    }))
  }

  const removeTransition = (transitionId: number) => {
    patchSelectedWorkflow((workflow) => ({
      ...workflow,
      transitions: workflow.transitions.filter((t) => t.id !== transitionId),
    }))
  }

  const parseErrorDetail = async (res: Response) => {
    try {
      const body = await res.json()
      return body
    } catch {
      return null
    }
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
          stages: selectedWorkflow.stages.map((stage) => ({
            id: stage.id > 0 ? stage.id : null,
            name: stage.name,
            order: stage.order,
            is_terminal: stage.is_terminal,
            requires_attachments: stage.requires_attachments,
            requires_approval: stage.requires_approval,
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
        const detail = await parseErrorDetail(res)
        if (detail?.blocked_stages) {
          const names = detail.blocked_stages
            .map((stage: { name: string; task_count: number }) => `${stage.name} (${stage.task_count})`)
            .join(", ")
          alert(`Cannot delete stages with active tasks: ${names}`)
        } else {
          alert(detail?.detail || "Failed to save workflow draft.")
        }
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
        alert(detail?.detail || "Failed to publish workflow.")
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
        alert(detail?.detail || "Unable to create workflow.")
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
        alert(detail?.detail || "Unable to delete workflow.")
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
        <div className="grid grid-cols-12 gap-3 lg:gap-4">
          <section className="surface-card col-span-12 p-4 lg:col-span-8">
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
                <div className="flex min-w-max items-center gap-2">
                  {selectedWorkflow.stages.map((stage, idx) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-2"
                      draggable
                      onDragStart={() => setDraggingStageId(stage.id)}
                      onDragEnd={() => setDraggingStageId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggingStageId) moveStage(draggingStageId, stage.id)
                      }}
                    >
                      <div
                        onClick={() => setSelectedStageId(stage.id)}
                        className={`w-48 rounded-lg border p-3 text-left transition ${
                          selectedStageId === stage.id
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-neutral-200 bg-white text-slate-700 hover:bg-neutral-50"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <GripVertical size={11} />
                            Drag
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteStage(stage.id)
                            }}
                            className="rounded p-0.5 hover:bg-black/10"
                            title="Delete stage"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <p className="font-medium text-xs">{stage.name}</p>
                        <p className="mt-1 text-[11px] opacity-80">
                          {stage.is_terminal ? "Terminal" : "Active"} • Order {stage.order + 1}
                        </p>
                      </div>
                      {idx < selectedWorkflow.stages.length - 1 && (
                        <span className="text-slate-400">→</span>
                      )}
                    </div>
                  ))}

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
                            requires_approval: false,
                          },
                        ],
                      }))
                      setSelectedStageId(nextId)
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-slate-400 hover:bg-neutral-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="surface-card col-span-12 p-4 lg:col-span-4">
            <h2 className="section-title">Stage Configuration</h2>
            {!selectedStage || !selectedWorkflow ? (
              <p className="mt-2 text-xs text-slate-500">Select a stage to configure it.</p>
            ) : (
              <div className="mt-3 space-y-3 text-xs">
                <Field label="Stage Name">
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
                    className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </Field>

                <Field label="Is terminal?">
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
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                  >
                    {selectedStage.is_terminal ? "Yes" : "No"}
                  </button>
                </Field>

                <Field label="Requires attachments?">
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
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                  >
                    {selectedStage.requires_attachments ? "Yes" : "No"}
                  </button>
                </Field>

                <Field label="Requires approval?">
                  <button
                    onClick={() =>
                      patchSelectedWorkflow((wf) => ({
                        ...wf,
                        stages: wf.stages.map((stage) =>
                          stage.id === selectedStage.id
                            ? { ...stage, requires_approval: !stage.requires_approval }
                            : stage
                        ),
                      }))
                    }
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                  >
                    {selectedStage.requires_approval ? "Yes" : "No"}
                  </button>
                </Field>

                <Field label="Transitions">
                  <div className="space-y-2">
                    {selectedWorkflow.transitions.map((transition) => (
                      <div
                        key={transition.id}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-1 rounded-lg border border-neutral-200 p-1.5"
                      >
                        <select
                          value={transition.from_stage}
                          onChange={(e) =>
                            updateTransition(transition.id, {
                              from_stage: Number(e.target.value),
                            })
                          }
                          className="rounded border border-neutral-200 px-1.5 py-1 text-[11px]"
                        >
                          {selectedWorkflow.stages.map((stage) => (
                            <option key={`from-${stage.id}`} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={transition.to_stage}
                          onChange={(e) =>
                            updateTransition(transition.id, {
                              to_stage: Number(e.target.value),
                            })
                          }
                          className="rounded border border-neutral-200 px-1.5 py-1 text-[11px]"
                        >
                          {selectedWorkflow.stages.map((stage) => (
                            <option key={`to-${stage.id}`} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={transition.allowed_role}
                          onChange={(e) =>
                            updateTransition(transition.id, {
                              allowed_role: e.target.value,
                            })
                          }
                          className="rounded border border-neutral-200 px-1.5 py-1 text-[11px]"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeTransition(transition.id)}
                          className="rounded border border-red-200 px-2 py-1 text-[11px] text-red-600"
                        >
                          Del
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addTransition}
                      className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                    >
                      + Add Transition
                    </button>
                  </div>
                </Field>
              </div>
            )}
          </aside>
        </div>
      )}
    </WorkspaceShell>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  )
}
