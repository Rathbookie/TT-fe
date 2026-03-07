"use client"

import { useEffect, useMemo, useState } from "react"
import { Task } from "@/types/task"
import { Role, TaskStatus } from "@/lib/statusConfig"
import {
  formatWorkflowLabel,
  getStatusLabel,
} from "@/lib/workflowDisplay"
import { apiFetchJson } from "@/lib/api"
import { stageTone, stageToneStyle } from "@/lib/stageTheme"
import { WorkflowDefinition } from "@/types/workflow"

type Props = {
  task: Task
  activeRole: Role
  selectedStatus: TaskStatus | null
  setSelectedStatus: (status: TaskStatus) => void
  selectedStageId?: number | null
  setSelectedStageId?: (stageId: number | null) => void
  blockedReason: string
  setBlockedReason: (value: string) => void
  mode?: "full" | "compact"
}

export default function TaskWorkflow({
  task,
  activeRole,
  selectedStatus,
  setSelectedStatus,
  selectedStageId,
  setSelectedStageId,
  blockedReason,
  setBlockedReason,
  mode = "full",
}: Props) {
  const isCompact = mode === "compact"
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null)
  const isTerminal =
    task.stage?.is_terminal ??
    task.status_detail?.is_terminal ??
    false

  useEffect(() => {
    let mounted = true
    const workflowId = task.workflow?.id

    const load = async () => {
      if (!workflowId) {
        if (mounted) setWorkflow(null)
        return
      }
      try {
        const payload = await apiFetchJson<WorkflowDefinition[] | { results?: WorkflowDefinition[] }>(
          "/api/workflows/"
        )
        const list = Array.isArray(payload) ? payload : payload.results || []
        if (!mounted) return
        setWorkflow(list.find((wf) => wf.id === workflowId) || null)
      } catch {
        if (mounted) setWorkflow(null)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [task.workflow?.id])

  const transitions = useMemo(() => {
    if (!workflow || !task.stage?.id) return []
    return workflow.transitions
      .filter(
        (transition) =>
          transition.from_stage === task.stage?.id &&
          transition.allowed_role === activeRole
      )
      .map((transition) => ({
        ...transition,
        statusValue: transition.to_stage_name,
      }))
  }, [workflow, task.stage?.id, activeRole])

  return (
    <div className={isCompact ? "space-y-3" : "space-y-4"}>
      {/* Status Display */}
      <div className="text-xs font-medium text-neutral-500">
        Status: {task.stage?.name ? formatWorkflowLabel(task.stage.name) : getStatusLabel(task.status)}
      </div>

      {task.workflow?.name && (
        <div className="text-xs text-neutral-500">
          Workflow: {task.workflow.name}
        </div>
      )}

      {task.stage?.name && (
        <div className="text-xs text-neutral-500">
          Stage Order: {task.stage.order + 1}
        </div>
      )}

      {/* Transition Buttons */}
      {!isTerminal && transitions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {transitions.map((transition) => (
            <button
              key={transition.id}
              onClick={() => {
                if (setSelectedStageId) {
                  setSelectedStageId(transition.to_stage)
                }
                setSelectedStatus(transition.statusValue)
              }}
              className={`
                ${isCompact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"}
                rounded-lg border font-medium transition hover:opacity-90
                ${(selectedStageId === transition.to_stage || selectedStatus === transition.statusValue) ? "ring-2 ring-black/20" : ""}
                ${stageTone(transition.to_stage_name, false)}
              `}
              style={stageToneStyle(transition.to_stage_color)}
            >
              {getStatusLabel(transition.to_stage_name)}
            </button>
          ))}
        </div>
      )}

      {/* Blocked Reason */}
      {selectedStatus === "BLOCKED" && (
        <div className="space-y-2">
          <label className="text-xs font-medium">
            Blocked Reason *
          </label>
          <textarea
            value={blockedReason}
            onChange={(e) => setBlockedReason(e.target.value)}
            rows={isCompact ? 2 : 3}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
          />
        </div>
      )}
    </div>
  )
}
