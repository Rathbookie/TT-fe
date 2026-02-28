"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LayoutGrid,
  Rows3,
  Save,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import TaskDrawer from "@/components/tasks/TaskDrawer"
import TaskFullView from "@/components/tasks/TaskFullView"
import TaskTable from "@/components/tasks/TaskTable"
import { useTasks } from "@/app/dashboard/useTasks"
import { apiFetchJson } from "@/lib/api"
import { Task } from "@/types/task"
import { useAuth } from "@/context/AuthContext"

export default function TasksPage() {
  const { activeRole, user } = useAuth()
  const [showTerminal, setShowTerminal] = useState(false)
  const {
    tasks,
    loading,
    error,
    selectedTask,
    setSelectedTask,
    fullViewTask,
    setFullViewTask,
    toggleDrawer,
    updateTaskInState,
    currentPage,
    totalPages,
    count,
    setCurrentPage,
    reload,
  } = useTasks(showTerminal)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [view, setView] = useState<"table" | "board">("table")
  const [query, setQuery] = useState("")
  const [stageFilter, setStageFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [groupBy, setGroupBy] = useState<"stage" | "priority" | "assignee">("stage")
  const [sortBy, setSortBy] = useState<"due" | "title" | "priority" | "status">("due")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)
  const currentUserId = user?.id ?? null

  const assignmentColumn = useMemo(
    () => (activeRole === "TASK_RECEIVER" ? "Assigned By" : "Assigned To"),
    [activeRole]
  )

  const toggleSelection = (taskId: number) => {
    setSelectedIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    )
  }

  const openCreateTask = () => {
    setFullViewTask({
      id: 0,
      title: "",
      description: "",
      status: "NOT_STARTED",
      priority: null,
      due_date: null,
      assigned_to: null,
      version: 0,
      created_at: "",
      updated_at: "",
      attachments: [],
    })
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const timeout = window.setTimeout(() => {
      const saved = window.localStorage.getItem("workos_tasks_view")
      if (!saved) return
      try {
        const parsed = JSON.parse(saved) as {
          query: string
          stageFilter: string
          priorityFilter: string
          groupBy: "stage" | "priority" | "assignee"
          sortBy: "due" | "title" | "priority" | "status"
          sortDir?: "asc" | "desc"
          view: "table" | "board"
          showTerminal?: boolean
          overdueOnly?: boolean
          unassignedOnly?: boolean
          assignedToMeOnly?: boolean
        }
        setQuery(parsed.query || "")
        setStageFilter(parsed.stageFilter || "ALL")
        setPriorityFilter(parsed.priorityFilter || "ALL")
        setGroupBy(parsed.groupBy || "stage")
        setSortBy(parsed.sortBy || "due")
        setSortDir(parsed.sortDir || "asc")
        setView(parsed.view || "table")
        setShowTerminal(Boolean(parsed.showTerminal))
        setOverdueOnly(Boolean(parsed.overdueOnly))
        setUnassignedOnly(Boolean(parsed.unassignedOnly))
        setAssignedToMeOnly(Boolean(parsed.assignedToMeOnly))
      } catch {
        // ignore malformed local state
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  const saveView = () => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(
      "workos_tasks_view",
      JSON.stringify({
        query,
        stageFilter,
        priorityFilter,
        groupBy,
        sortBy,
        sortDir,
        view,
        showTerminal,
        overdueOnly,
        unassignedOnly,
        assignedToMeOnly,
      })
    )
  }

  const stageOptions = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach((task) => set.add(task.stage?.name || task.status))
    return ["ALL", ...Array.from(set)]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    let next = [...tasks]

    if (normalizedQuery) {
      next = next.filter((task) => {
        const assigned =
          task.assigned_to?.full_name || task.assigned_to?.email || ""
        const created =
          task.created_by?.full_name || task.created_by?.email || ""
        return (
          task.title.toLowerCase().includes(normalizedQuery) ||
          (task.description || "").toLowerCase().includes(normalizedQuery) ||
          assigned.toLowerCase().includes(normalizedQuery) ||
          created.toLowerCase().includes(normalizedQuery)
        )
      })
    }

    const effectiveStageFilter =
      stageFilter === "ALL" || stageOptions.includes(stageFilter) ? stageFilter : "ALL"

    if (effectiveStageFilter !== "ALL") {
      next = next.filter((task) => (task.stage?.name || task.status) === effectiveStageFilter)
    }

    if (priorityFilter !== "ALL") {
      next = next.filter((task) => task.priority === priorityFilter)
    }

    if (overdueOnly) {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      next = next.filter((task) => {
        if (!task.due_date) return false
        const stageName = (task.stage?.name || task.status || "").toUpperCase()
        if (task.stage?.is_terminal) return false
        if (stageName === "DONE" || stageName === "CANCELLED" || stageName === "COMPLETED") {
          return false
        }
        const due = new Date(task.due_date)
        if (Number.isNaN(due.getTime())) return false
        return due.getTime() < startOfToday.getTime()
      })
    }

    if (unassignedOnly) {
      next = next.filter((task) => !task.assigned_to?.id)
    }

    if (assignedToMeOnly && currentUserId) {
      next = next.filter((task) => task.assigned_to?.id === currentUserId)
    }

    next.sort((a, b) => {
      let result = 0
      if (sortBy === "title") result = a.title.localeCompare(b.title)
      else if (sortBy === "status") {
        result = (a.stage?.name || a.status).localeCompare(b.stage?.name || b.status)
      } else if (sortBy === "priority") {
        result = (a.priority || "").localeCompare(b.priority || "")
      } else {
        const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
        const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
        result = da - db
      }
      return sortDir === "asc" ? result : -result
    })

    return next
  }, [
    tasks,
    query,
    stageFilter,
    priorityFilter,
    sortBy,
    sortDir,
    overdueOnly,
    unassignedOnly,
    assignedToMeOnly,
    currentUserId,
    stageOptions,
  ])

  const groupBuckets = useMemo(() => {
    const buckets: Record<string, Task[]> = {}
    for (const task of filteredTasks) {
      let key = "Unassigned"
      if (groupBy === "stage") {
        key = task.stage?.name || task.status
      } else if (groupBy === "priority") {
        key = task.priority || "None"
      } else {
        key =
          (task.assigned_to?.full_name || task.assigned_to?.email || "").trim() ||
          "Unassigned"
      }
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(task)
    }
    return buckets
  }, [filteredTasks, groupBy])

  useEffect(() => {
    if (!selectedTask || showTerminal) return
    const isTerminalStage = selectedTask.stage?.is_terminal ?? false
    const isCompletedStatus =
      selectedTask.status === "DONE" || selectedTask.status === "CANCELLED"
    if (isTerminalStage || isCompletedStatus) {
      setSelectedTask(null)
    }
  }, [selectedTask, setSelectedTask, showTerminal])

  useEffect(() => {
    setCurrentPage(1)
  }, [showTerminal, setCurrentPage])

  return (
    <WorkspaceShell
      title="Task Engine"
      subtitle="List view with role-aware workflow execution and configurable grouping."
      actions={
        <button
          onClick={openCreateTask}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={12} />
          New Task
        </button>
      }
    >
      {fullViewTask ? (
        <div className="surface-card p-4 lg:p-6">
          <TaskFullView
            task={fullViewTask}
            mode={fullViewTask.id ? "edit" : "create"}
            onClose={() => setFullViewTask(null)}
            onSaved={(savedTask) => {
              updateTaskInState(savedTask)
              setFullViewTask(null)
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          <section
            className={`col-span-12 space-y-4 ${
              selectedTask ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12"
            }`}
          >
            <div className="surface-card flex flex-wrap items-center gap-1.5 p-2">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  size={12}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, description, assignee..."
                  className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-7 pr-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
                className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
              >
                <option value="stage">Group: Stage</option>
                <option value="priority">Group: Priority</option>
                <option value="assignee">Group: Assignee</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
              >
                <option value="due">Sort: Due Date</option>
                <option value="title">Sort: Title</option>
                <option value="priority">Sort: Priority</option>
                <option value="status">Sort: Stage</option>
              </select>
              <button
                onClick={() => {
                  setShowFilterMenu((prev) => !prev)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-neutral-50"
              >
                <Filter size={12} />
                Filter
              </button>
              <button
                onClick={() => {
                  setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-neutral-50"
              >
                <ArrowUpDown size={12} />
                {sortDir === "asc" ? "Asc" : "Desc"}
              </button>
              <button
                onClick={saveView}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-neutral-50"
              >
                <Save size={12} />
                Save View
              </button>
              <button
                onClick={() => setShowTerminal((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                  showTerminal
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-neutral-200 bg-white text-slate-600 hover:bg-neutral-50"
                }`}
              >
                {showTerminal ? "Hide Done" : "Show Done"}
              </button>
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
                <button
                  onClick={() => setView("table")}
                  className={`rounded-md px-2.5 py-1 text-[11px] ${
                    view === "table" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  <Rows3 size={12} className="inline-block mr-1" />
                  List
                </button>
                <button
                  onClick={() => setView("board")}
                  className={`rounded-md px-2.5 py-1 text-[11px] ${
                    view === "board" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  <LayoutGrid size={12} className="inline-block mr-1" />
                  Board
                </button>
              </div>
            </div>
            {showFilterMenu ? (
              <div className="surface-card flex flex-wrap items-center gap-2 p-2 text-xs">
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
                >
                  {stageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "ALL" ? "All Stages" : option.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
                <button
                  onClick={() => {
                    setQuery("")
                    setStageFilter("ALL")
                    setPriorityFilter("ALL")
                    setOverdueOnly(false)
                    setUnassignedOnly(false)
                    setAssignedToMeOnly(false)
                  }}
                  className="ml-auto rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-neutral-50"
                >
                  Clear
                </button>
              </div>
            ) : null}
            {error ? (
              <div className="surface-card flex items-center justify-between gap-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <span className="truncate">Task sync issue: {error}</span>
                <button
                  onClick={reload}
                  className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {view === "table" ? (
              <TaskTable
                tasks={filteredTasks}
                loading={loading}
                role={activeRole}
                assignmentColumn={assignmentColumn}
                currentPage={currentPage}
                totalPages={totalPages}
                count={count}
                onPageChange={setCurrentPage}
                onClickTask={toggleDrawer}
                onDoubleClickTask={setFullViewTask}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelection}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {Object.entries(groupBuckets).map(([bucket, bucketTasks]) => (
                  <div key={bucket} className="surface-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">
                        {bucket.replaceAll("_", " ")}
                      </h3>
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs text-slate-500">
                        {bucketTasks.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {bucketTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => toggleDrawer(task)}
                          className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50"
                        >
                          <p className="text-xs font-medium text-slate-800">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {task.stage?.name || task.status} • {task.priority || "No priority"}
                          </p>
                        </button>
                      ))}
                      {!bucketTasks.length && (
                        <div className="rounded-xl border border-neutral-200 p-3 text-xs text-slate-500">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!Object.keys(groupBuckets).length && (
                  <div className="surface-card p-5 text-sm text-slate-500">
                    No tasks for current filters.
                  </div>
                )}
              </div>
            )}
          </section>

          {selectedTask && (
            <aside className="col-span-12 lg:col-span-4 xl:col-span-3 lg:sticky lg:top-2 lg:h-[calc(100vh-1rem)]">
              <TaskDrawer
                task={selectedTask}
                updateTaskInState={updateTaskInState}
                onClose={() => setSelectedTask(null)}
                onEdit={async (taskId) => {
                  const fullTask = await apiFetchJson<Task>(`/api/tasks/${taskId}/`)
                  setSelectedTask(null)
                  setFullViewTask(fullTask)
                }}
                onTaskUpdated={(updatedTask) => {
                  updateTaskInState(updatedTask)
                  setSelectedTask(updatedTask)
                }}
              />
            </aside>
          )}
        </div>
      )}
    </WorkspaceShell>
  )
}
