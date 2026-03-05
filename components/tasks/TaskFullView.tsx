"use client"

import TaskWorkflow from "./TaskWorkflow"
import TaskAttachments from "./TaskAttachments"
import TaskProofs from "./TaskProofs"
import TaskTitleDescription from "./TaskTitleDescription"
import TaskMetaFields from "./TaskMetaFields"

import { useEffect, useState } from "react"
import { Task, TaskAttachment, TaskPriority } from "@/types/task"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Role, TaskStatus } from "@/lib/statusConfig"
type Props = {
  task?: Task | null
  parentTask?: Task | null
  initialBoardId?: number | null
  mode: "create" | "edit"
  onClose: () => void
  onSaved: (savedTask: Task) => void
}

type BoardOption = {
  id: number
  name: string
  slug: string
  statuses: Array<{
    id: number
    name: string
    is_default: boolean
    order: number
  }>
}

type WorkflowOption = {
  id: number
  name: string
  is_default: boolean
  stages?: Array<{
    id: number
    name: string
    is_terminal?: boolean
  }>
}

export default function TaskFullView({
  task,
  parentTask,
  initialBoardId: initialBoardIdProp = null,
  mode,
  onClose,
  onSaved,
}: Props) {
  console.log("TASK IN FULL VIEW:", task)
  const isCreate = mode === "create"
  const initialBoardId = task?.board ?? parentTask?.board ?? initialBoardIdProp ?? null
  const { activeRole } = useAuth()
  const isTerminal =
    task?.stage?.is_terminal ??
    (task?.status === "DONE" || task?.status === "CANCELLED")

  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [priority, setPriority] = useState<TaskPriority | "">(
    task?.priority || ""
  )

  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.slice(0, 10) : ""
  )

  const [dueTime, setDueTime] = useState(
    task?.due_date ? task.due_date.slice(11, 16) : ""
  )

  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    task?.assignees?.length
      ? task.assignees.map((user) => user.id)
      : task?.assigned_to?.id
      ? [task.assigned_to.id]
      : []
  )

  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const [existingAttachments, setExistingAttachments] = useState<TaskAttachment[]>(task?.attachments || [])

  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null)
  const [blockedReason, setBlockedReason] = useState(
    task?.blocked_reason || ""
  )
  const [boards, setBoards] = useState<BoardOption[]>([])
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(
    initialBoardId
  )
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(
    task?.workflow?.id ?? null
  )
  const [selectedStageId, setSelectedStageId] = useState<number | null>(
    task?.stage?.id ?? null
  )
  const [selectedCreateStatusId, setSelectedCreateStatusId] = useState<number | null>(
    task?.status_detail?.id ?? null
  )
  const [selectedParentTaskId] = useState<number | null>(parentTask?.id ?? null)

  // -----------------------------
// DIRTY STATE DETECTION
// -----------------------------

const original = task

const hasChanges = isCreate
  ? title.trim() !== "" ||
    description.trim() !== "" ||
    priority !== "" ||
    assigneeIds.length > 0 ||
    selectedBoardId !== null ||
    selectedWorkflowId !== null ||
    selectedParentTaskId !== null ||
    dueDate !== "" ||
    files.length > 0
  : (
      title !== original?.title ||
      description !== original?.description ||
      priority !== original?.priority ||
      JSON.stringify([...assigneeIds].sort((a, b) => a - b)) !==
        JSON.stringify([...(original?.assignees?.map((user) => user.id) || (original?.assigned_to?.id ? [original.assigned_to.id] : []))].sort((a, b) => a - b)) ||
      selectedWorkflowId !== (original?.workflow?.id ?? null) ||
      selectedStageId !== (original?.stage?.id ?? null) ||
      dueDate !== original?.due_date?.slice(0, 10) ||
      dueTime !== original?.due_date?.slice(11, 16) ||
      selectedStatus !== null ||
      files.length > 0
    )

  // 💾 Save
  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null
  const statusOptions = selectedBoard?.statuses || []

  useEffect(() => {
    if (!isCreate) return
    let mounted = true
    const loadContext = async () => {
      try {
        const [boardsPayload, workflowsPayload] = await Promise.all([
          apiFetchJson<BoardOption[] | { results?: BoardOption[] }>("/api/boards/"),
          apiFetchJson<WorkflowOption[] | { results?: WorkflowOption[] }>("/api/workflows/"),
        ])
        const boardList = Array.isArray(boardsPayload)
          ? boardsPayload
          : boardsPayload.results || []
        const workflowList = Array.isArray(workflowsPayload)
          ? workflowsPayload
          : workflowsPayload.results || []
        if (!mounted) return
        setBoards(boardList)
        setWorkflows(workflowList)

        if (!initialBoardId && boardList.length > 0) {
          const defaultBoard = boardList[0]
          setSelectedBoardId(defaultBoard.id)
          const defaultStatus =
            defaultBoard.statuses.find((s) => s.is_default) ||
            [...defaultBoard.statuses].sort((a, b) => a.order - b.order)[0]
          if (defaultStatus) setSelectedCreateStatusId(defaultStatus.id)
        }

        if (!task?.workflow?.id && workflowList.length > 0) {
          const defaultWorkflow =
            workflowList.find((workflow) => workflow.is_default) || workflowList[0]
          setSelectedWorkflowId(defaultWorkflow.id)
          const defaultStage =
            defaultWorkflow.stages?.find((stage) => !stage.is_terminal) ||
            defaultWorkflow.stages?.[0]
          setSelectedStageId(defaultStage?.id ?? null)
        }
      } catch (err) {
        console.error("Failed to load workflow context for task creation", err)
      }
    }

    void loadContext()
    return () => {
      mounted = false
    }
  }, [initialBoardId, isCreate, task?.workflow?.id])

  const handleSave = async () => {
    if (!title || !priority || assigneeIds.length === 0 || !dueDate || !selectedBoardId) {
      alert("Please fill all required fields.")
      return
    }

    if (isTerminal) return

    setLoading(true)

    try {
      const combined = dueTime
        ? `${dueDate}T${dueTime}`
        : `${dueDate}T23:59`

      const formattedDueDate = new Date(combined).toISOString()

      const formData = new FormData()

      formData.append("title", title)
      formData.append("description", description)
      assigneeIds.forEach((id) => formData.append("assignee_ids", String(id)))
      formData.append("priority", priority)
      formData.append("board", String(selectedBoardId))
      formData.append("due_date", formattedDueDate)
      if (isCreate) {
        if (selectedParentTaskId) {
          formData.append("parent", String(selectedParentTaskId))
        }
        if (selectedWorkflowId) {
          formData.append("workflow_id", String(selectedWorkflowId))
        }
        if (selectedStageId) {
          formData.append("stage_id", String(selectedStageId))
        }
        if (selectedCreateStatusId) {
          formData.append("status_id", String(selectedCreateStatusId))
        } else {
          formData.append("status", "NOT_STARTED")
        }
      }

      const stageChanged =
        !isCreate && selectedStageId && selectedStageId !== (task?.stage?.id ?? null)

      if (!isCreate) {
        if (selectedWorkflowId) {
          formData.append("workflow_id", String(selectedWorkflowId))
        }
        if (selectedStageId) {
          formData.append("stage_id", String(selectedStageId))
        }
      }

      if (!isCreate && !stageChanged) {
        formData.append(
          "status",
          selectedStatus ? selectedStatus : task!.status
        )
      }

      if (selectedStatus === "BLOCKED") {
        formData.append("blocked_reason", blockedReason)
      }

      if (!isCreate && task?.version !== undefined) {
        formData.append("version", String(task.version))
      }

      let savedTask: Task

      if (isCreate) {
        const res = await apiFetch("/api/tasks/", {
          method: "POST",
          body: formData,
        })
        if (!res.ok) {
          const errData = await res.json()
          console.error("SAVE FAILED:", errData)
          return
        }
        savedTask = (await res.json()) as Task
        // Upload attachments separately
        if (files.length > 0) {
          for (const file of files) {
            const uploadForm = new FormData()
            uploadForm.append("file", file)

            const uploadRes = await apiFetch(
              `/api/tasks/${savedTask.id}/attachments/`,
              {
                method: "POST",
                body: uploadForm,
              }
            )

            if (!uploadRes.ok) {
              const err = await uploadRes.json()
              console.error("ATTACHMENT UPLOAD FAILED:", err)
            }
          }
        }
      } else {

        console.log("VERSION SENT:", task?.version)
        console.log("SELECTED STATUS:", selectedStatus)


        const noFieldChanges =
          !selectedStatus &&
          title === task?.title &&
          description === task?.description &&
          priority === task?.priority &&
          dueDate === task?.due_date?.slice(0, 10) &&
          JSON.stringify([...assigneeIds].sort((a, b) => a - b)) ===
            JSON.stringify([...(task?.assignees?.map((user) => user.id) || (task?.assigned_to?.id ? [task.assigned_to.id] : []))].sort((a, b) => a - b)) &&
          selectedWorkflowId === (task?.workflow?.id ?? null) &&
          selectedStageId === (task?.stage?.id ?? null) &&
          dueTime === task?.due_date?.slice(11, 16)

        const attachmentsOnly =
          files.length > 0 && noFieldChanges

        if (noFieldChanges && files.length === 0) {
          savedTask = task
        } else if (attachmentsOnly) {
          savedTask = await apiFetchJson<Task>(
            `/api/tasks/${task!.id}/`
          )
        } else {
          const res = await apiFetch(`/api/tasks/${task?.id}/`, {
            method: "PATCH",
            body: formData,
          })

          if (!res.ok) {
            const errData = await res.json()
            console.error("SAVE FAILED → STATUS:", res.status)
            console.error("SAVE FAILED → BODY:", errData)
            return
          }

          savedTask = (await res.json()) as Task
        }

        // Upload attachments separately
        if (files.length > 0) {
          for (const file of files) {
            const uploadForm = new FormData()
            uploadForm.append("file", file)

            const uploadRes = await apiFetch(
              `/api/tasks/${savedTask.id}/attachments/`,
              {
                method: "POST",
                body: uploadForm,
              }
            )

            if (!uploadRes.ok) {
              const err = await uploadRes.json()
              console.error("ATTACHMENT UPLOAD FAILED:", err)
            }
          }
        }
      }


      const refreshed = await apiFetchJson<Task>(
        `/api/tasks/${savedTask.id}/`
      )

      onSaved(refreshed)
      onClose()

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="h-full flex flex-col text-xs">

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto bg-white rounded-xl p-5 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {isCreate ? "Task Studio · Create Workflow Task" : "Task Studio · Edit Task"}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Fill in the execution context, workflow fields, assignment, and delivery artifacts.
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-900 text-base"
        >
          ×
        </button>
      </div>


      {/* Status + Workflow */}
      {!isCreate && task && activeRole && (
        <TaskWorkflow
          task={task}
          activeRole={activeRole as Role}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedStageId={selectedStageId}
          setSelectedStageId={setSelectedStageId}
          blockedReason={blockedReason}
          setBlockedReason={setBlockedReason}
        />
      )}

      {isCreate && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Workflow Context
          </p>
          {selectedParentTaskId ? (
            <div className="mb-3 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              Creating subtask under: <span className="font-semibold">{parentTask?.title || `Task #${selectedParentTaskId}`}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium">Workflow</label>
              <select
                value={selectedWorkflowId ?? ""}
                onChange={(e) => {
                  const workflowId = Number(e.target.value) || null
                  setSelectedWorkflowId(workflowId)
                  const selected = workflows.find((workflow) => workflow.id === workflowId)
                  const firstStage = selected?.stages?.find((stage) => !stage.is_terminal) || selected?.stages?.[0]
                  setSelectedStageId(firstStage?.id ?? null)
                }}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
              >
                <option value="">Auto (tenant default)</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Stage</label>
              <select
                value={selectedStageId ?? ""}
                onChange={(e) => setSelectedStageId(Number(e.target.value) || null)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
                disabled={!selectedWorkflowId}
              >
                <option value="">Auto</option>
                {(workflows.find((workflow) => workflow.id === selectedWorkflowId) as (WorkflowOption & { stages?: Array<{ id: number; name: string }> }) | undefined)?.stages?.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Board *</label>
              <select
                value={selectedBoardId ?? ""}
                onChange={(e) => {
                  const boardId = Number(e.target.value)
                  setSelectedBoardId(boardId || null)
                  const board = boards.find((b) => b.id === boardId)
                  const defaultStatus =
                    board?.statuses.find((s) => s.is_default) ||
                    [...(board?.statuses || [])].sort((a, b) => a.order - b.order)[0]
                  setSelectedCreateStatusId(defaultStatus?.id ?? null)
                }}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
                disabled={Boolean(selectedParentTaskId)}
              >
                <option value="">Select board</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Initial Status</label>
              <select
                value={selectedCreateStatusId ?? ""}
                onChange={(e) => setSelectedCreateStatusId(Number(e.target.value) || null)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
                disabled={!selectedBoardId}
              >
                <option value="">Auto (board default)</option>
                {statusOptions.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-neutral-500">
            Choose any workflow you created. If not selected, tenant default workflow is used.
          </p>
        </div>
      )}

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Scope
          </p>
          <TaskTitleDescription
            isTerminal={isTerminal}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
          />
        </div>

        {/* Attachments */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Attachments
          </p>
          <TaskAttachments
            taskId={task?.id}
            isCreate={isCreate}
            isTerminal={isTerminal}
            existingAttachments={existingAttachments}
            setExistingAttachments={setExistingAttachments}
            files={files}
            setFiles={setFiles}
          />
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Proofs
          </p>
          <TaskProofs taskId={task?.id} disabled={isTerminal} />
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Planning
          </p>
          <TaskMetaFields
            isTerminal={isTerminal}
            priority={priority}
            setPriority={setPriority}
            dueDate={dueDate}
            setDueDate={setDueDate}
            dueTime={dueTime}
            setDueTime={setDueTime}
            assigneeIds={assigneeIds}
            setAssigneeIds={setAssigneeIds}
          />
        </div>

      {/* Actions */}
      {hasChanges && (
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-300 text-xs"
          >
            Cancel
          </button>

          <button
            disabled={loading || isTerminal}
            onClick={handleSave}
            className={`px-4 py-1.5 rounded-lg text-xs text-white ${
              loading || isTerminal
                ? "bg-neutral-400"
                : "bg-black hover:bg-neutral-800"
            }`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  </div>
  )
}
