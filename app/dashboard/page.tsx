"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetchJson } from "@/lib/api"
import WidgetRenderer, { ExpandedWidgetModal } from "@/components/dashboard/WidgetRenderer"
import { WIDGET_CATALOG, WidgetInstance, widgetTierLabel } from "@/components/dashboard/WidgetRegistry"
import { Task } from "@/types/task"
import { useAuth } from "@/context/AuthContext"
import { Plus, RefreshCw, Settings2 } from "lucide-react"
import GridLayout, { Layout, WidthProvider } from "react-grid-layout"

const AutoWidthGridLayout = WidthProvider(GridLayout)

type DashboardWidgetsResponse = {
  widgets: Array<{ key: string; title: string; value?: number; data?: Array<Record<string, unknown>> }>
  modules_enabled: string[]
}

type TaskListResponse = {
  results?: Task[]
}

type DashboardConfigResponse = {
  dashboard: {
    id: number
    name: string
    visibility: "PRIVATE" | "INTERNAL" | "PUBLIC"
    is_default: boolean
    can_edit: boolean
    global_filters?: {
      status?: string
      assignee?: string
      due_range?: "all" | "7d" | "30d"
    }
    widgets?: WidgetInstance[]
    auto_refresh_seconds?: number
  }
}

const LEGACY_WIDGET_KEY_MAP: Record<string, WidgetInstance["key"]> = {
  tasks_overdue: "overdue_tasks",
  active_tasks: "task_list",
  completion_rate: "calculation",
  workflow_stage_distribution: "workload_by_status",
  my_tasks: "task_list",
  recent_activity: "discussion",
  approval_queue: "discussion",
}

const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: "w-featured", key: "featured", x: 0, y: 0, w: 12, h: 9, minW: 4, minH: 6, settings: { prompt: "", output: "" } },
  { id: "w-task-table", key: "task_table", x: 0, y: 9, w: 12, h: 11, minW: 6, minH: 8, settings: { mode: "all", limit: 12 } },
  { id: "w-workload", key: "workload_by_status", x: 0, y: 20, w: 6, h: 9, minW: 4, minH: 6, settings: {} },
  { id: "w-due-soon", key: "tasks_due_soon", x: 6, y: 20, w: 6, h: 9, minW: 4, minH: 6, settings: {} },
]
const LOCAL_DASHBOARD_KEY = "workos_dashboard_unsynced_v1"

function makeWidgetId(key: string) {
  return `w-${key}-${Date.now()}-${Math.round(Math.random() * 10000)}`
}

function normalizedWidgets(items: WidgetInstance[]) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const mappedKey = LEGACY_WIDGET_KEY_MAP[item.key] || item.key
    const fallbackX = (index % 3) * 4
    const fallbackY = Math.floor(index / 3) * 8
    return {
      ...item,
      key: mappedKey,
      x: Number.isFinite(item.x) ? item.x : fallbackX,
      y: Number.isFinite(item.y) ? item.y : fallbackY,
      w: Number.isFinite(item.w) ? item.w : 4,
      h: Number.isFinite(item.h) ? item.h : 8,
      minW: Number.isFinite(item.minW) ? item.minW : 3,
      minH: Number.isFinite(item.minH) ? item.minH : 6,
      maxW: Number.isFinite(item.maxW) ? item.maxW : 12,
      maxH: Number.isFinite(item.maxH) ? item.maxH : 24,
      settings: item.settings || {},
    }
  })
}

export default function DashboardPage() {
  const { activeRole } = useAuth()
  const isAdminRole = activeRole === "ADMIN"

  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [widgets, setWidgets] = useState<WidgetInstance[]>(DEFAULT_LAYOUT)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [enabledModules, setEnabledModules] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [assigneeFilter, setAssigneeFilter] = useState("ALL")
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all")
  const [dashboardId, setDashboardId] = useState<number | null>(null)
  const [dashboardName, setDashboardName] = useState("Dashboard")
  const [dashboardVisibility, setDashboardVisibility] = useState<"PRIVATE" | "INTERNAL" | "PUBLIC">("INTERNAL")
  const [dashboardCanEdit, setDashboardCanEdit] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const effectiveCanEdit = dashboardCanEdit || Boolean(activeRole)

  const [serverWidgetsByKey, setServerWidgetsByKey] = useState<
    Record<string, { value?: number | string; data?: Array<Record<string, unknown>> }>
  >({})

  const gridLayout = useMemo<Layout[]>(
    () =>
      widgets.map((widget) => ({
        i: widget.id,
        x: widget.x || 0,
        y: widget.y || 0,
        w: widget.w || 4,
        h: widget.h || 8,
        minW: widget.minW || 3,
        minH: widget.minH || 6,
        maxW: widget.maxW || 12,
        maxH: widget.maxH || 24,
      })),
    [widgets]
  )

  const persistDashboard = useCallback(async (opts?: { allowCreate?: boolean; silent?: boolean }) => {
    const allowCreate = opts?.allowCreate === true
    const silent = opts?.silent === true
    if (!effectiveCanEdit || !activeRole) return false
    if (!dashboardId && !allowCreate) return true
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        LOCAL_DASHBOARD_KEY,
        JSON.stringify({
          dashboardId,
          widgets,
          name: dashboardName,
          visibility: dashboardVisibility,
          global_filters: {
            status: statusFilter,
            assignee: assigneeFilter,
            due_range: dateFilter,
          },
        })
      )
    }
    if (!silent) {
      setSaveState("saving")
      setSaveError(null)
    }
    try {
      let targetDashboardId = dashboardId
      if (!targetDashboardId && allowCreate) {
        const created = await apiFetchJson<{
          id: number
          name: string
          visibility: "PRIVATE" | "INTERNAL" | "PUBLIC"
          can_edit: boolean
        }>("/api/dashboard/config/", {
          method: "POST",
          body: JSON.stringify({
            name: dashboardName,
            visibility: dashboardVisibility,
            widgets,
          }),
        })
        targetDashboardId = created.id
        setDashboardId(created.id)
        setDashboardCanEdit(Boolean(created.can_edit) || isAdminRole)
      }
      if (!targetDashboardId) return false

      await apiFetchJson("/api/dashboard/config/", {
        method: "PATCH",
        body: JSON.stringify({
          dashboard_id: targetDashboardId,
          name: dashboardName,
          visibility: dashboardVisibility,
          auto_refresh_seconds: autoRefresh ? 30 : 0,
          global_filters: {
            status: statusFilter,
            assignee: assigneeFilter,
            due_range: dateFilter,
          },
          widgets,
        }),
      })
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LOCAL_DASHBOARD_KEY)
      }
      if (!silent) {
        setSaveState("saved")
      }
      return true
    } catch (err) {
      console.error("Dashboard save failed:", err)
      if (!silent) {
        setSaveError(err instanceof Error ? err.message : "Unknown save error")
        setSaveState("error")
      }
      return false
    }
  }, [
    dashboardId,
    effectiveCanEdit,
    activeRole,
    widgets,
    dashboardName,
    dashboardVisibility,
    statusFilter,
    assigneeFilter,
    dateFilter,
    autoRefresh,
    isAdminRole,
  ])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [taskResult, dashboardResult, configResult] = await Promise.allSettled([
        apiFetchJson<TaskListResponse>("/api/tasks/?page=1&page_size=200&include_terminal=1"),
        apiFetchJson<DashboardWidgetsResponse>("/api/dashboard/widgets/"),
        apiFetchJson<DashboardConfigResponse>("/api/dashboard/config/"),
      ])

      if (taskResult.status === "fulfilled") {
        setTasks(taskResult.value.results || [])
      } else {
        console.error("Task widget source fetch failed:", taskResult.reason)
      }

      if (dashboardResult.status === "fulfilled") {
        setEnabledModules(dashboardResult.value.modules_enabled || [])
        setServerWidgetsByKey(
          (dashboardResult.value.widgets || []).reduce((acc, widget) => {
            acc[widget.key] = {
              value: widget.value,
              data: widget.data,
            }
            return acc
          }, {} as Record<string, { value?: number | string; data?: Array<Record<string, unknown>> }>)
        )
      } else {
        console.error("Dashboard widget payload fetch failed:", dashboardResult.reason)
      }

      if (configResult.status === "fulfilled") {
        const dash = configResult.value.dashboard
        setDashboardId(dash.id)
        setDashboardName(dash.name || "Dashboard")
        setDashboardVisibility(dash.visibility || "INTERNAL")
        setDashboardCanEdit(Boolean(dash.can_edit) || isAdminRole)
        const serverWidgets = normalizedWidgets(
          dash.widgets && dash.widgets.length ? dash.widgets : DEFAULT_LAYOUT
        )
        let resolvedWidgets = serverWidgets
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(LOCAL_DASHBOARD_KEY)
          if (raw) {
            try {
              const local = JSON.parse(raw) as {
                dashboardId: number
                widgets: WidgetInstance[]
                name: string
                visibility: "PRIVATE" | "INTERNAL" | "PUBLIC"
                global_filters: {
                  status: string
                  assignee: string
                  due_range: "all" | "7d" | "30d"
                }
              }
              if (local.dashboardId === dash.id && Array.isArray(local.widgets)) {
                resolvedWidgets = normalizedWidgets(local.widgets)
                setDashboardName(local.name || dash.name || "Dashboard")
                setDashboardVisibility(local.visibility || dash.visibility || "INTERNAL")
                setStatusFilter(local.global_filters?.status || "ALL")
                setAssigneeFilter(local.global_filters?.assignee || "ALL")
                setDateFilter(local.global_filters?.due_range || "all")
              }
            } catch {
              // ignore malformed local backup
            }
          }
        }
        setWidgets(resolvedWidgets)
        const filters = dash.global_filters || {}
        setStatusFilter(filters.status || "ALL")
        setAssigneeFilter(filters.assignee || "ALL")
        setDateFilter(filters.due_range || "all")
        setAutoRefresh((dash.auto_refresh_seconds || 30) > 0)
      } else {
        console.error("Dashboard config fetch failed:", configResult.reason)
        setDashboardCanEdit(isAdminRole)
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(LOCAL_DASHBOARD_KEY)
          if (raw) {
            try {
              const local = JSON.parse(raw) as { widgets?: WidgetInstance[] }
              if (Array.isArray(local.widgets) && local.widgets.length) {
                setWidgets(normalizedWidgets(local.widgets))
              } else {
                setWidgets(DEFAULT_LAYOUT)
              }
            } catch {
              setWidgets(DEFAULT_LAYOUT)
            }
          } else {
            setWidgets(DEFAULT_LAYOUT)
          }
        } else {
          setWidgets(DEFAULT_LAYOUT)
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [isAdminRole])

  useEffect(() => {
    if (activeRole) void load()
  }, [activeRole, load])

  useEffect(() => {
    if (!activeRole || !autoRefresh) return
    const timer = window.setInterval(() => {
      void load()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [activeRole, autoRefresh, load])

  useEffect(() => {
    if (loading) return
    if (!dashboardId || !effectiveCanEdit || !activeRole) return
    const timer = window.setTimeout(async () => {
      await persistDashboard({ allowCreate: false, silent: true })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [
    loading,
    persistDashboard,
    dashboardId,
    effectiveCanEdit,
    activeRole,
  ])

  const activeCatalog = useMemo(
    () =>
      WIDGET_CATALOG.filter((item) => {
        if (item.key === "time_reporting") return enabledModules.includes("time-tracking") || true
        if (item.key === "portfolio") return enabledModules.includes("portfolio") || true
        return true
      }),
    [enabledModules]
  )

  const addWidget = (key: WidgetInstance["key"]) => {
    if (!effectiveCanEdit) return
    setWidgets((prev) => [
      ...prev,
      {
        id: makeWidgetId(key),
        key,
        x: 0,
        y: Number.MAX_SAFE_INTEGER,
        w: 6,
        h: 9,
        minW: 3,
        minH: 6,
        settings: {},
      },
    ])
    setShowCatalog(false)
  }

  const updateWidget = (id: string, patch: Partial<WidgetInstance>) => {
    if (!effectiveCanEdit && editing) return
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === id
          ? {
              ...widget,
              ...patch,
              settings: {
                ...(widget.settings || {}),
                ...(patch.settings || {}),
              },
            }
          : widget
      )
    )
  }

  const removeWidget = (id: string) => {
    if (!effectiveCanEdit) return
    setWidgets((prev) => prev.filter((widget) => widget.id !== id))
  }

  const onLayoutChange = (nextLayout: Layout[]) => {
    if (!effectiveCanEdit || !editing) return
    setWidgets((prev) =>
      prev.map((widget) => {
        const next = nextLayout.find((item) => item.i === widget.id)
        if (!next) return widget
        return {
          ...widget,
          x: next.x,
          y: next.y,
          w: next.w,
          h: next.h,
        }
      })
    )
  }

  const filteredTasks = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now)
    if (dateFilter === "7d") cutoff.setDate(now.getDate() + 7)
    if (dateFilter === "30d") cutoff.setDate(now.getDate() + 30)
    return tasks.filter((task) => {
      const status = (task.stage?.name || task.status || "").toUpperCase()
      if (statusFilter !== "ALL" && status !== statusFilter) return false
      const assignee = task.assigned_to?.id ? String(task.assigned_to.id) : "UNASSIGNED"
      if (assigneeFilter !== "ALL" && assignee !== assigneeFilter) return false
      if (dateFilter !== "all") {
        if (!task.due_date) return false
        const due = new Date(task.due_date)
        if (Number.isNaN(due.getTime())) return false
        if (due > cutoff) return false
      }
      return true
    })
  }, [tasks, statusFilter, assigneeFilter, dateFilter])

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>()
    tasks.forEach((task) => {
      if (task.assigned_to?.id) {
        map.set(String(task.assigned_to.id), task.assigned_to.full_name || task.assigned_to.email)
      }
    })
    return Array.from(map.entries())
  }, [tasks])

  const expandedWidget = expandedId ? widgets.find((widget) => widget.id === expandedId) || null : null

  return (
    <WorkspaceShell
      title={dashboardName}
      subtitle="Grid dashboard engine with persisted x/y/w/h layout and collision-safe drag/resize."
      actions={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-neutral-50"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${
              autoRefresh
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-neutral-200 bg-white text-slate-600"
            }`}
            disabled={!effectiveCanEdit}
          >
            Auto-refresh: {autoRefresh ? "On" : "Off"}
          </button>
          <button
            onClick={() => setEditing((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${
              editing ? "bg-indigo-600 text-white" : "border border-neutral-200 bg-white text-slate-600 hover:bg-neutral-50"
            } ${!effectiveCanEdit ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={!effectiveCanEdit}
          >
            <Settings2 size={12} />
            {editing ? "Done" : "Edit"}
          </button>
          <button
            onClick={() => void persistDashboard({ allowCreate: true, silent: false })}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${
              saveState === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-neutral-200 bg-white text-slate-600 hover:bg-neutral-50"
            } ${!effectiveCanEdit ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={!effectiveCanEdit}
          >
            Save Layout
          </button>
          <button
            onClick={() => setShowCatalog((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white ${
              effectiveCanEdit ? "bg-indigo-600 hover:bg-indigo-700" : "cursor-not-allowed bg-slate-400"
            }`}
            disabled={!effectiveCanEdit}
          >
            <Plus size={12} />
            Add Widget
          </button>
        </div>
      }
    >
      <section className="surface-card flex flex-wrap items-center gap-2 p-2">
        <input
          value={dashboardName}
          onChange={(e) => setDashboardName(e.target.value)}
          disabled={!effectiveCanEdit}
          className="min-w-[180px] rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-700 disabled:cursor-not-allowed disabled:bg-neutral-100"
        />
        <select
          value={dashboardVisibility}
          onChange={(e) => setDashboardVisibility(e.target.value as "PRIVATE" | "INTERNAL" | "PUBLIC")}
          disabled={!effectiveCanEdit}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:bg-neutral-100"
        >
          <option value="PRIVATE">Private</option>
          <option value="INTERNAL">Shared Internal</option>
          <option value="PUBLIC">Public Link</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px]"
        >
          <option value="ALL">Status: All</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="WAITING_REVIEW">Review</option>
          <option value="DONE">Done</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px]"
        >
          <option value="ALL">Assignee: All</option>
          <option value="UNASSIGNED">Unassigned</option>
          {assigneeOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as "all" | "7d" | "30d")}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px]"
        >
          <option value="all">Due: Any</option>
          <option value="7d">Due in 7 days</option>
          <option value="30d">Due in 30 days</option>
        </select>
        <span className="ml-auto text-[11px] text-slate-500">
          {filteredTasks.length} tasks in scope • {saveState === "saving" ? "Saving..." : saveState === "error" ? "Save failed" : "Saved"}
        </span>
        {saveError ? <span className="text-[11px] text-red-600 truncate max-w-[320px]">{saveError}</span> : null}
      </section>

      {showCatalog ? (
        <section className="surface-card p-3">
          <h2 className="mb-2 text-xs font-semibold text-slate-800">Widget Catalog</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {activeCatalog.map((item) => (
              <button
                key={item.key}
                onClick={() => addWidget(item.key)}
                className="rounded-md border border-neutral-200 bg-white p-2 text-left hover:bg-neutral-50"
                disabled={!effectiveCanEdit}
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-800">{item.title}</p>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {widgetTierLabel(item.tier)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{item.description}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="surface-card p-4 text-xs text-slate-500">Loading dashboard...</div>
      ) : (
        <div className="surface-card p-2">
          <AutoWidthGridLayout
            className="dashboard-grid-layout"
            cols={12}
            rowHeight={26}
            margin={[8, 8]}
            containerPadding={[0, 0]}
            layout={gridLayout}
            compactType="vertical"
            preventCollision={false}
            isDraggable={editing && effectiveCanEdit}
            isResizable={editing && effectiveCanEdit}
            draggableHandle=".widget-drag-handle"
            draggableCancel="input,textarea,select,a"
            onLayoutChange={onLayoutChange}
          >
            {widgets.map((widget) => (
              <div key={widget.id}>
                <WidgetRenderer
                  instance={widget}
                  context={{
                    tasks: filteredTasks,
                    allTasks: tasks,
                    globalFilters: {
                      status: statusFilter,
                      assignee: assigneeFilter,
                      due_range: dateFilter,
                    },
                    modulesEnabled: enabledModules,
                    serverWidgetsByKey,
                  }}
                  onUpdate={updateWidget}
                  onRemove={removeWidget}
                  editable={editing && effectiveCanEdit}
                  onOpen={setExpandedId}
                />
              </div>
            ))}
          </AutoWidthGridLayout>
        </div>
      )}

      {expandedWidget ? (
        <ExpandedWidgetModal
          instance={expandedWidget}
          context={{
            tasks: filteredTasks,
            allTasks: tasks,
            globalFilters: {
              status: statusFilter,
              assignee: assigneeFilter,
              due_range: dateFilter,
            },
            modulesEnabled: enabledModules,
            serverWidgetsByKey,
          }}
          onUpdate={updateWidget}
          onClose={() => setExpandedId(null)}
        />
      ) : null}
    </WorkspaceShell>
  )
}
