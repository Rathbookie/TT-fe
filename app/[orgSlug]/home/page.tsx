"use client"

/**
 * app/[orgSlug]/home/page.tsx
 *
 * The Home View — entry point for new users.
 * A full-width task list (no Division/Section/Board required).
 * Tasks created here are "inbox" tasks: board=null, division=null.
 * They can be moved to a board later from TaskFullView.
 *
 * Modular toolbar:
 *   Always visible by default: Sort, Show Closed, Filter
 *   In the "..." overflow menu (pinnable): Search, Group By, Asc/Desc, View toggle
 *   Pin state persisted to localStorage key: workos_home_toolbar_pins
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Pin,
  PinOff,
  LayoutGrid,
  Rows3,
  X,
  Inbox,
} from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import TaskTable from "@/components/tasks/TaskTable"
import TaskDrawer from "@/components/tasks/TaskDrawer"
import TaskFullView from "@/components/tasks/TaskFullView"
import PaginationFooter from "@/components/tasks/PaginationFooter"
import { apiFetchJson } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Task } from "@/types/task"

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type TaskListResponse = {
  results?: Task[]
  total_pages?: number
  current_page?: number
  count?: number
}

// Controls that live in the "..." overflow menu and can be pinned to the toolbar
type OverflowControl = "search" | "groupBy" | "sortDir" | "view"

const LS_PINS_KEY  = "workos_home_toolbar_pins"
const LS_STATE_KEY = "workos_home_view"

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }

function sortTasks(
  tasks: Task[],
  sortBy: "due" | "title" | "priority" | "status",
  dir: "asc" | "desc"
): Task[] {
  return [...tasks].sort((a, b) => {
    let r = 0
    if (sortBy === "title")
      r = a.title.localeCompare(b.title)
    else if (sortBy === "status")
      r = (a.stage?.name ?? a.status ?? "").localeCompare(b.stage?.name ?? b.status ?? "")
    else if (sortBy === "priority")
      r = (PRIORITY_ORDER[a.priority ?? "P3"] ?? 2) - (PRIORITY_ORDER[b.priority ?? "P3"] ?? 2)
    else {
      const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      r = da - db
    }
    return dir === "asc" ? r : -r
  })
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, activeRole } = useAuth()

  // ── Tasks ─────────────────────────────────────────────
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [count, setCount]             = useState(0)
  const [reloadKey, setReloadKey]     = useState(0)

  // ── Drawer / Full view ────────────────────────────────
  const [selectedTask, setSelectedTask]   = useState<Task | null>(null)
  const [fullViewTask, setFullViewTask]   = useState<Task | null>(null)
  const [isCreating, setIsCreating]       = useState(false)

  // ── Toolbar state ─────────────────────────────────────
  const [query, setQuery]               = useState("")
  const [showDone, setShowDone]         = useState(false)
  const [sortBy, setSortBy]             = useState<"due" | "title" | "priority" | "status">("due")
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("asc")
  const [groupBy, setGroupBy]           = useState<"none" | "stage" | "priority" | "assignee">("none")
  const [view, setView]                 = useState<"table" | "board">("table")
  const [stageFilter, setStageFilter]   = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [overdueOnly, setOverdueOnly]   = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // ── Pinned controls (overflow → toolbar) ──────────────
  const [pinnedControls, setPinnedControls] = useState<OverflowControl[]>([])
  const [overflowOpen, setOverflowOpen]     = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)
  const [prefsHydrated, setPrefsHydrated] = useState(false)

  const storageScope = useMemo(
    () => (user ? `${user.tenant_slug ?? "global"}:${user.id}` : null),
    [user]
  )
  const stateStorageKey = storageScope ? `${LS_STATE_KEY}:${storageScope}` : null
  const pinsStorageKey = storageScope ? `${LS_PINS_KEY}:${storageScope}` : null

  // ── Role-aware columns ────────────────────────────────
  const assignmentColumn = useMemo(
    () => (activeRole === "TASK_RECEIVER" ? "Assigned By" : "Assigned To"),
    [activeRole]
  )
  const groupByAssignmentLabel =
    activeRole === "TASK_RECEIVER" ? "Group by Assigner" : "Group by Assignee"

  // ─────────────────────────────────────────────────────
  // Persist & restore state
  // ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!stateStorageKey || !pinsStorageKey) return
    setPrefsHydrated(false)
    try {
      const raw = localStorage.getItem(stateStorageKey)
      if (raw) {
        const p = JSON.parse(raw)
        setQuery(p.query ?? "")
        setShowDone(p.showDone ?? false)
        setSortBy(p.sortBy ?? "due")
        setSortDir(p.sortDir ?? "asc")
        setGroupBy(p.groupBy ?? "none")
        setView(p.view ?? "table")
        setStageFilter(p.stageFilter ?? "ALL")
        setPriorityFilter(p.priorityFilter ?? "ALL")
        setOverdueOnly(p.overdueOnly ?? false)
      }
      const rawPins = localStorage.getItem(pinsStorageKey)
      if (rawPins) setPinnedControls(JSON.parse(rawPins))
    } catch {
      // ignore malformed values and keep defaults
    } finally {
      setPrefsHydrated(true)
    }
  }, [pinsStorageKey, stateStorageKey])

  useEffect(() => {
    if (!prefsHydrated || !stateStorageKey) return
    localStorage.setItem(stateStorageKey, JSON.stringify({
      query, showDone, sortBy, sortDir, groupBy, view,
      stageFilter, priorityFilter, overdueOnly,
    }))
  }, [prefsHydrated, stateStorageKey, query, showDone, sortBy, sortDir, groupBy, view, stageFilter, priorityFilter, overdueOnly])

  useEffect(() => {
    if (!prefsHydrated || !pinsStorageKey) return
    localStorage.setItem(pinsStorageKey, JSON.stringify(pinnedControls))
  }, [prefsHydrated, pinsStorageKey, pinnedControls])

  // ─────────────────────────────────────────────────────
  // Close overflow on outside click
  // ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node))
        setOverflowOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ─────────────────────────────────────────────────────
  // Fetch inbox tasks (no board)
  // ─────────────────────────────────────────────────────

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!activeRole) { setLoading(false); return }
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const params = new URLSearchParams({
          page:             String(currentPage),
          page_size:        "25",
          include_terminal: showDone ? "1" : "0",
          inbox:            "1",   // only tasks with board=null
        })
        const data = await apiFetchJson<TaskListResponse>(`/api/tasks/?${params}`)
        setTasks(data.results ?? [])
        setTotalPages(data.total_pages ?? 1)
        setCount(data.count ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks.")
      } finally { setLoading(false) }
    }
    void load()
  }, [activeRole, currentPage, showDone, reloadKey])

  // ─────────────────────────────────────────────────────
  // Client-side filter + sort
  // ─────────────────────────────────────────────────────

  const stageOptions = useMemo(() => {
    const s = new Set<string>()
    tasks.forEach((t) => s.add(t.stage?.name ?? t.status ?? ""))
    return ["ALL", ...Array.from(s).filter(Boolean)]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    let next = [...tasks]
    const q = query.trim().toLowerCase()
    if (q) {
      next = next.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.assigned_to?.full_name ?? "").toLowerCase().includes(q) ||
        (t.created_by?.full_name ?? "").toLowerCase().includes(q)
      )
    }
    if (stageFilter !== "ALL")
      next = next.filter((t) => (t.stage?.name ?? t.status) === stageFilter)
    if (priorityFilter !== "ALL")
      next = next.filter((t) => t.priority === priorityFilter)
    if (overdueOnly) {
      const now = new Date()
      const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      next = next.filter((t) => {
        const isTerminal = Boolean(t.stage?.is_terminal ?? t.status_detail?.is_terminal ?? false)
        if (!t.due_date || isTerminal) return false
        return new Date(t.due_date).getTime() < sod.getTime()
      })
    }
    return sortTasks(next, sortBy, sortDir)
  }, [tasks, query, stageFilter, priorityFilter, overdueOnly, sortBy, sortDir])

  const groupBuckets = useMemo(() => {
    const buckets: Record<string, Task[]> = {}
    for (const t of filteredTasks) {
      let key = "All tasks"
      if (groupBy === "stage")         key = t.stage?.name ?? t.status ?? "No Stage"
      else if (groupBy === "priority") key = t.priority ?? "None"
      else if (groupBy === "assignee") {
        key = activeRole === "TASK_RECEIVER"
          ? (t.created_by?.full_name ?? t.created_by?.email ?? "").trim() || "Unassigned"
          : (t.assigned_to?.full_name ?? t.assigned_to?.email ?? "").trim() || "Unassigned"
      }
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(t)
    }
    return buckets
  }, [filteredTasks, groupBy, activeRole])

  // ─────────────────────────────────────────────────────
  // State helpers
  // ─────────────────────────────────────────────────────

  const updateTaskInState = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask((prev) => (prev?.id === updated.id ? updated : prev))
  }, [])

  const togglePin = (ctrl: OverflowControl) => {
    setPinnedControls((prev) =>
      prev.includes(ctrl) ? prev.filter((c) => c !== ctrl) : [...prev, ctrl]
    )
  }

  const isPinned = (ctrl: OverflowControl) => pinnedControls.includes(ctrl)

  // ─────────────────────────────────────────────────────
  // Render a single overflow control (inline in toolbar or in menu)
  // ─────────────────────────────────────────────────────

  const renderControl = (ctrl: OverflowControl, inMenu = false) => {
    const cls = inMenu
      ? "w-full"
      : "shrink-0"

    switch (ctrl) {
      case "search":
        return (
          <div className={`relative ${inMenu ? "w-full" : "min-w-[160px] max-w-xs flex-1"}`}>
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-7 pr-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X size={11} />
              </button>
            )}
          </div>
        )
      case "groupBy":
        return (
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            className={`rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none ${cls}`}
          >
            <option value="none">No Grouping</option>
            <option value="stage">Group by Stage</option>
            <option value="priority">Group by Priority</option>
            <option value="assignee">{groupByAssignmentLabel}</option>
          </select>
        )
      case "sortDir":
        return (
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className={`flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-neutral-50 ${cls}`}
          >
            <ArrowUpDown size={12} />
            {sortDir === "asc" ? "Asc" : "Desc"}
          </button>
        )
      case "view":
        return (
          <div className={`flex items-center rounded-lg border border-neutral-200 bg-white ${cls}`}>
            <button
              onClick={() => setView("table")}
              className={`rounded-l-lg px-2.5 py-1.5 ${view === "table" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
              title="List view"
            >
              <Rows3 size={13} />
            </button>
            <button
              onClick={() => setView("board")}
              className={`rounded-r-lg px-2.5 py-1.5 ${view === "board" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
              title="Board view"
            >
              <LayoutGrid size={13} />
            </button>
          </div>
        )
    }
  }

  // ─────────────────────────────────────────────────────
  // Toolbar
  // ─────────────────────────────────────────────────────

  const overflowItems: OverflowControl[] = ["search", "groupBy", "sortDir", "view"]

  const hasActiveFilter =
    stageFilter !== "ALL" || priorityFilter !== "ALL" || overdueOnly
  const activeFilterCount = [stageFilter !== "ALL", priorityFilter !== "ALL", overdueOnly].filter(Boolean).length

  const toolbar = (
    <div className="surface-card flex flex-wrap items-center gap-1.5 p-2">

      {/* Pinned overflow controls */}
      {isPinned("search")  && renderControl("search")}
      {isPinned("groupBy") && renderControl("groupBy")}
      {isPinned("sortDir") && renderControl("sortDir")}
      {isPinned("view")    && renderControl("view")}

      {/* Sort — always visible */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none"
      >
        <option value="due">Sort: Due Date</option>
        <option value="title">Sort: Title</option>
        <option value="priority">Sort: Priority</option>
        <option value="status">Sort: Stage</option>
      </select>

      {/* Show Closed — always visible */}
      <button
        onClick={() => setShowDone((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
          showDone
            ? "border-slate-400 bg-slate-100 text-slate-800"
            : "border-neutral-200 bg-white text-slate-500 hover:bg-neutral-50"
        }`}
      >
        Show Closed
      </button>

      {/* Filter — always visible */}
      <button
        onClick={() => setShowFilterPanel((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
          showFilterPanel || hasActiveFilter
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "border-neutral-200 bg-white text-slate-500 hover:bg-neutral-50"
        }`}
      >
        <Filter size={12} />
        Filter
        {hasActiveFilter && (
          <span className="ml-0.5 rounded-full bg-indigo-500 px-1.5 py-px text-[10px] font-medium leading-none text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      <div className="flex-1" />

      {/* "..." overflow menu */}
      <div ref={overflowRef} className="relative">
        <button
          onClick={() => setOverflowOpen((v) => !v)}
          className={`flex items-center rounded-lg border px-2 py-1.5 text-slate-500 transition-colors ${
            overflowOpen
              ? "border-slate-300 bg-neutral-100"
              : "border-neutral-200 bg-white hover:bg-neutral-50"
          }`}
          title="More toolbar controls"
        >
          <MoreHorizontal size={14} />
        </button>

        {overflowOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-neutral-200 bg-white shadow-xl">
            <div className="border-b border-neutral-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Toolbar Controls
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Use controls here or pin them to the toolbar.
              </p>
            </div>
            <div className="p-2 space-y-1">
              {overflowItems.map((ctrl) => (
                <div key={ctrl} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-50">
                  <div className="flex-1 min-w-0">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                      {ctrl === "search"  ? "Search"
                       : ctrl === "groupBy" ? "Group By"
                       : ctrl === "sortDir" ? "Sort Direction"
                       : "View"}
                    </p>
                    {renderControl(ctrl, true)}
                  </div>
                  <button
                    onClick={() => togglePin(ctrl)}
                    className={`shrink-0 rounded-md p-1.5 transition-colors ${
                      isPinned(ctrl)
                        ? "text-indigo-600 hover:bg-indigo-50"
                        : "text-neutral-300 hover:text-neutral-500 hover:bg-neutral-100"
                    }`}
                    title={isPinned(ctrl) ? "Unpin from toolbar" : "Pin to toolbar"}
                  >
                    {isPinned(ctrl) ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────
  // Filter panel
  // ─────────────────────────────────────────────────────

  const filterPanel = showFilterPanel && (
    <div className="surface-card flex flex-wrap items-center gap-2 px-3 py-2">
      <select
        value={stageFilter}
        onChange={(e) => setStageFilter(e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none"
      >
        {stageOptions.map((s) => (
          <option key={s} value={s}>{s === "ALL" ? "All Stages" : s}</option>
        ))}
      </select>
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none"
      >
        <option value="ALL">All Priorities</option>
        <option value="P1">Critical</option>
        <option value="P2">High</option>
        <option value="P3">Normal</option>
        <option value="P4">Low</option>
      </select>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 select-none">
        <input
          type="checkbox"
          checked={overdueOnly}
          onChange={(e) => setOverdueOnly(e.target.checked)}
          className="rounded"
        />
        Overdue only
      </label>
      {hasActiveFilter && (
        <button
          onClick={() => { setStageFilter("ALL"); setPriorityFilter("ALL"); setOverdueOnly(false) }}
          className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-neutral-50"
        >
          Clear filters
        </button>
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────
  // Full view / create
  // ─────────────────────────────────────────────────────

  if (fullViewTask || isCreating) {
    return (
      <WorkspaceShell title="Home" subtitle="Inbox tasks">
        <div className="surface-card p-4 lg:p-6">
          <TaskFullView
            task={fullViewTask}
            mode={fullViewTask?.id ? "edit" : "create"}
            parentTask={null}
            initialBoardId={null}
            onClose={() => { setFullViewTask(null); setIsCreating(false) }}
            onSaved={(saved) => {
              if (fullViewTask) {
                updateTaskInState(saved)
              } else {
                setTasks((prev) => [saved, ...prev])
                setCount((c) => c + 1)
              }
              setFullViewTask(null)
              setIsCreating(false)
            }}
          />
        </div>
      </WorkspaceShell>
    )
  }

  // ─────────────────────────────────────────────────────
  // Main
  // ─────────────────────────────────────────────────────

  return (
    <WorkspaceShell
      title="Home"
      subtitle={count > 0 ? `${count} inbox task${count !== 1 ? "s" : ""}` : "Your inbox"}
      actions={
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
        >
          <Plus size={12} />
          New Task
        </button>
      }
    >
      <div className="grid grid-cols-12 gap-3">
        <section
          className={`col-span-12 space-y-2 ${
            selectedTask ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12"
          }`}
        >
          {toolbar}
          {filterPanel}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-neutral-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          ) : tasks.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center gap-4 py-24">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
                <Inbox size={24} className="text-neutral-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">No tasks yet</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Create your first task. No lists or divisions needed.
                </p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Plus size={13} />
                Create a task
              </button>
            </div>
          ) : (
            <>
              {Object.entries(groupBuckets).map(([bucket, bucketTasks]) => (
                <div key={bucket}>
                  {groupBy !== "none" && (
                    <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      {bucket}{" "}
                      <span className="font-normal">({bucketTasks.length})</span>
                    </p>
                  )}
                  <TaskTable
                    tasks={bucketTasks}
                    loading={false}
                    role={activeRole}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    count={count}
                    onPageChange={setCurrentPage}
                    onClickTask={(t: Task) => {
                      setSelectedTask(t)
                      setFullViewTask(null)
                    }}
                    onDoubleClickTask={(t: Task) => {
                      setFullViewTask(t)
                      setSelectedTask(null)
                    }}
                    assignmentColumn={assignmentColumn}
                  />
                </div>
              ))}

              {filteredTasks.length === 0 && tasks.length > 0 && (
                <div className="py-10 text-center text-xs text-neutral-400">
                  No tasks match your current filters.
                </div>
              )}

              {totalPages > 1 && (
                <PaginationFooter
                  count={count}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </section>

        {selectedTask && (
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3">
            <TaskDrawer
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onEdit={(taskId) => {
                const target = tasks.find((task) => task.id === taskId) || selectedTask
                setFullViewTask(target)
                setSelectedTask(null)
              }}
              onTaskUpdated={updateTaskInState}
              updateTaskInState={updateTaskInState}
            />
          </aside>
        )}
      </div>
    </WorkspaceShell>
  )
}
