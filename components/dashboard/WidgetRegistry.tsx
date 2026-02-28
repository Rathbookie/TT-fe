"use client"

import type { ReactElement } from "react"
import {
  AlertTriangle,
  BookMarked,
  Calculator,
  Clock3,
  Lightbulb,
  ListChecks,
  MessageSquare,
  PieChart,
  Search,
  StickyNote,
  Table2,
  Timer,
  Users,
  BriefcaseBusiness,
} from "lucide-react"
import { Task } from "@/types/task"

export type DashboardWidgetKey =
  | "featured"
  | "task_table"
  | "task_list"
  | "workload_by_status"
  | "calculation"
  | "time_reporting"
  | "portfolio"
  | "tasks_by_assignee"
  | "notes"
  | "discussion"
  | "bookmarks"
  | "overdue_tasks"
  | "search"
  | "tasks_due_soon"

export type WidgetTier = "free" | "unlimited" | "business"

export type WidgetCatalogItem = {
  key: DashboardWidgetKey
  title: string
  description: string
  tier: WidgetTier
}

export type WidgetInstance = {
  id: string
  key: DashboardWidgetKey
  title?: string
  x?: number
  y?: number
  w?: number
  h?: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  settings?: Record<string, unknown>
}

export type DashboardWidgetContext = {
  tasks: Task[]
  allTasks?: Task[]
  globalFilters?: {
    status?: string
    assignee?: string
    due_range?: "all" | "7d" | "30d"
  }
  modulesEnabled: string[]
  serverWidgetsByKey: Record<string, { value?: number | string; data?: Array<Record<string, unknown>> }>
}

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    key: "featured",
    title: "Featured",
    description: "Generate ideas and content with a custom prompt.",
    tier: "free",
  },
  {
    key: "task_table",
    title: "Task Table",
    description: "Unified task table with mode toggles (all, overdue, due soon, priority, completed).",
    tier: "free",
  },
  {
    key: "task_list",
    title: "Task List",
    description: "Create a List view using tasks from any location.",
    tier: "free",
  },
  {
    key: "workload_by_status",
    title: "Workload by Status",
    description: "Display a pie chart of status usage across locations.",
    tier: "free",
  },
  {
    key: "calculation",
    title: "Calculation",
    description: "Calculate sums, averages, and other metrics for your tasks.",
    tier: "business",
  },
  {
    key: "time_reporting",
    title: "Time Reporting",
    description: "See tasks that have time tracked.",
    tier: "unlimited",
  },
  {
    key: "portfolio",
    title: "Portfolio",
    description: "Categorize and track progress of Lists and Folders.",
    tier: "unlimited",
  },
  {
    key: "tasks_by_assignee",
    title: "Tasks by Assignee",
    description: "Display a pie chart of total tasks by assignee.",
    tier: "free",
  },
  {
    key: "notes",
    title: "Notes",
    description: "Add rich text and slash commands for dashboard context.",
    tier: "free",
  },
  {
    key: "discussion",
    title: "Discussion",
    description: "Collaborate and chat with members and guests.",
    tier: "free",
  },
  {
    key: "bookmarks",
    title: "Bookmarks",
    description: "Bookmark tasks, docs, lists, or any web URL.",
    tier: "free",
  },
  {
    key: "overdue_tasks",
    title: "Overdue Tasks",
    description: "List of overdue tasks.",
    tier: "free",
  },
  {
    key: "search",
    title: "Search",
    description: "Create a dynamic list of items in your workspace.",
    tier: "business",
  },
  {
    key: "tasks_due_soon",
    title: "Tasks Due Soon",
    description: "List tasks due in the next 14 days.",
    tier: "free",
  },
]

type WidgetProps = {
  instance: WidgetInstance
  context: DashboardWidgetContext
  onUpdate: (patch: Partial<WidgetInstance>) => void
}

export type WidgetComponent = (props: WidgetProps) => ReactElement

function badgeLabel(tier: WidgetTier) {
  if (tier === "business") return "Business"
  if (tier === "unlimited") return "Unlimited"
  return "Free"
}

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function countByStatus(tasks: Task[]) {
  const map = new Map<string, number>()
  tasks.forEach((task) => {
    const key = task.stage?.name || task.status
    map.set(key, (map.get(key) || 0) + 1)
  })
  return [...map.entries()].map(([label, count]) => ({ label, count }))
}

function countByAssignee(tasks: Task[]) {
  const map = new Map<string, number>()
  tasks.forEach((task) => {
    const key = task.assigned_to?.full_name || task.assigned_to?.email || "Unassigned"
    map.set(key, (map.get(key) || 0) + 1)
  })
  return [...map.entries()].map(([label, count]) => ({ label, count }))
}

function serverTaskRows(
  context: DashboardWidgetContext,
  key = "my_tasks"
): Array<{ title: string; due_date?: string; status?: string; priority?: string; assignee?: string }> {
  const rows = context.serverWidgetsByKey[key]?.data || []
  return rows.map((row) => ({
    title: String(row.title || "Untitled Task"),
    due_date: row.due_date ? String(row.due_date) : undefined,
    status: row.status ? String(row.status) : undefined,
    priority: row.priority ? String(row.priority) : undefined,
    assignee: row.assignee ? String(row.assignee) : undefined,
  }))
}

function renderPie(items: { label: string; count: number }[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  if (!total) {
    return <div className="rounded-md bg-neutral-50 p-2 text-[11px] text-slate-500">No data.</div>
  }
  const colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
  let offset = 0
  const slices = items.map((item, idx) => {
    const size = (item.count / total) * 100
    const slice = `${colors[idx % colors.length]} ${offset}% ${offset + size}%`
    offset += size
    return slice
  })
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-20 w-20 rounded-full border border-neutral-200"
        style={{ background: `conic-gradient(${slices.join(", ")})` }}
      />
      <div className="space-y-1 text-[11px] text-slate-600">
        {items.map((item, idx) => (
          <div key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="truncate">{item.label}</span>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function card(title: string, icon: ReactElement, body: ReactElement) {
  return (
    <article className="surface-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
        {icon}
        {title}
      </div>
      {body}
    </article>
  )
}

export const WIDGET_COMPONENTS: Record<DashboardWidgetKey, WidgetComponent> = {
  featured: ({ instance, onUpdate, context }) => {
    const prompt = String(instance.settings?.prompt || "")
    const output = String(instance.settings?.output || "")
    const taskCount = context.tasks.length
    const openCount = context.tasks.filter((task) => !(task.stage?.is_terminal ?? false)).length
    return card(
      "Featured",
      <Lightbulb size={13} className="text-amber-600" />,
      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) =>
            onUpdate({ settings: { ...instance.settings, prompt: e.target.value } })
          }
          placeholder="Type a custom prompt..."
          className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs"
          rows={3}
        />
        <button
          onClick={() =>
            onUpdate({
              settings: {
                ...instance.settings,
                output:
                  prompt.trim().length > 0
                    ? `Generated plan for "${prompt.trim()}": prioritize top ${Math.max(
                        1,
                        Math.min(3, openCount)
                      )} of ${openCount} open tasks (workspace total ${taskCount}).`
                    : "Add a prompt first.",
              },
            })
          }
          className="rounded-md bg-indigo-600 px-2 py-1 text-[11px] text-white hover:bg-indigo-700"
        >
          Generate
        </button>
        <div className="rounded-md bg-neutral-50 p-2 text-[11px] text-slate-600">{output || "No generated content yet."}</div>
      </div>
    )
  },
  task_table: ({ context, instance, onUpdate }) => {
    const sourceTasks =
      instance.settings?.use_global_filters === false
        ? context.allTasks || context.tasks
        : context.tasks
    const mode = String(instance.settings?.mode || "all")
    const statusFilter = String(instance.settings?.status || "all")
    const limit = Number(instance.settings?.limit || 8)
    const rows = sourceTasks.filter((task) => {
      const stageName = (task.stage?.name || task.status || "").toUpperCase()
      if (statusFilter !== "all" && stageName !== statusFilter.toUpperCase()) return false

      if (mode === "overdue") {
        if (!task.due_date) return false
        if (task.stage?.is_terminal || ["DONE", "COMPLETED", "CANCELLED"].includes(stageName)) {
          return false
        }
        return new Date(task.due_date) < startOfToday()
      }

      if (mode === "due_soon") {
        if (!task.due_date) return false
        if (task.stage?.is_terminal || ["DONE", "COMPLETED", "CANCELLED"].includes(stageName)) {
          return false
        }
        const today = startOfToday()
        const cutoff = new Date(today)
        cutoff.setDate(cutoff.getDate() + 14)
        const due = new Date(task.due_date)
        return due >= today && due <= cutoff
      }

      if (mode === "completed") {
        return task.stage?.is_terminal || ["DONE", "COMPLETED"].includes(stageName)
      }

      if (mode === "priority") {
        return true
      }

      if (mode === "assigned") {
        return Boolean(task.assigned_to?.id)
      }

      return true
    })

    const sorted = [...rows].sort((a, b) => {
      if (mode === "priority") return (a.priority || "").localeCompare(b.priority || "")
      const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      return da - db
    })

    return card(
      "Task Table",
      <Table2 size={13} className="text-blue-600" />,
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={mode}
            onChange={(e) => onUpdate({ settings: { ...instance.settings, mode: e.target.value } })}
            className="rounded-md border border-neutral-200 px-2 py-1 text-[11px]"
          >
            <option value="all">All Tasks</option>
            <option value="overdue">Overdue</option>
            <option value="due_soon">Due Soon</option>
            <option value="priority">By Priority</option>
            <option value="completed">Completed</option>
            <option value="assigned">Assigned</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              onUpdate({ settings: { ...instance.settings, status: e.target.value } })
            }
            className="rounded-md border border-neutral-200 px-2 py-1 text-[11px]"
          >
            <option value="all">All Stages</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="WAITING_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
          <select
            value={String(limit)}
            onChange={(e) =>
              onUpdate({
                settings: { ...instance.settings, limit: Number(e.target.value || 8) },
              })
            }
            className="rounded-md border border-neutral-200 px-2 py-1 text-[11px]"
          >
            <option value="6">6 rows</option>
            <option value="8">8 rows</option>
            <option value="12">12 rows</option>
            <option value="20">20 rows</option>
          </select>
          <label className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[11px] text-slate-600">
            <input
              type="checkbox"
              checked={instance.settings?.use_global_filters !== false}
              onChange={(e) =>
                onUpdate({
                  settings: {
                    ...instance.settings,
                    use_global_filters: e.target.checked,
                  },
                })
              }
              className="h-3 w-3"
            />
            Use Global Filters
          </label>
        </div>
        <div className="overflow-auto rounded-md border border-neutral-200">
          <table className="w-full min-w-[540px] text-[11px]">
            <thead className="bg-neutral-50 text-slate-500">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1 text-left">Stage</th>
                <th className="px-2 py-1 text-left">Priority</th>
                <th className="px-2 py-1 text-left">Due</th>
                <th className="px-2 py-1 text-left">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, limit).map((task) => (
                <tr key={task.id} className="border-t border-neutral-100">
                  <td className="px-2 py-1 text-slate-800">{task.title}</td>
                  <td className="px-2 py-1 text-slate-600">{task.stage?.name || task.status}</td>
                  <td className="px-2 py-1 text-slate-600">{task.priority || "—"}</td>
                  <td className="px-2 py-1 text-slate-600">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-2 py-1 text-slate-600">
                    {task.assigned_to?.full_name || task.assigned_to?.email || "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sorted.length ? (
          <div className="rounded-md bg-neutral-50 p-2 text-[11px] text-slate-500">
            No tasks match this mode.
          </div>
        ) : null}
      </div>
    )
  },
  task_list: ({ context }) => {
    const rows = serverTaskRows(context, "my_tasks")
    const list = rows.length
      ? rows.map((row, idx) => ({ id: `server-${idx}`, title: row.title }))
      : context.tasks.map((task) => ({ id: String(task.id), title: task.title }))
    return card(
      "Task List",
      <ListChecks size={13} className="text-blue-600" />,
      <div className="space-y-1">
        {list.slice(0, 8).map((task) => (
          <div key={task.id} className="rounded-md border border-neutral-200 p-1.5 text-[11px]">
            {task.title}
          </div>
        ))}
        {!list.length && (
          <div className="rounded-md bg-neutral-50 p-2 text-[11px] text-slate-500">No tasks available.</div>
        )}
      </div>
    )
  },
  workload_by_status: ({ context }) => {
    const serverDistribution =
      context.serverWidgetsByKey.workflow_stage_distribution?.data || []
    const items = serverDistribution.length
      ? serverDistribution.map((item) => ({
          label: String(item.status || item.name || "Stage"),
          count: Number(item.count || 0),
        }))
      : countByStatus(context.tasks)
    return card(
      "Workload by Status",
      <PieChart size={13} className="text-indigo-600" />,
      renderPie(items)
    )
  },
  calculation: ({ context, instance, onUpdate }) => {
    const mode = String(instance.settings?.mode || "total")
    const overdue = context.tasks.filter((task) => {
      if (!task.due_date) return false
      return new Date(task.due_date) < startOfToday()
    }).length
    const assignees = new Set(
      context.tasks.map((task) => task.assigned_to?.id).filter(Boolean)
    ).size
    const avgPerAssignee = assignees ? (context.tasks.length / assignees).toFixed(2) : "0"
    const value =
      mode === "overdue"
        ? overdue
        : mode === "avg_per_assignee"
        ? avgPerAssignee
        : context.tasks.length
    return card(
      "Calculation",
      <Calculator size={13} className="text-emerald-600" />,
      <div className="space-y-2">
        <select
          value={mode}
          onChange={(e) =>
            onUpdate({ settings: { ...instance.settings, mode: e.target.value } })
          }
          className="rounded-md border border-neutral-200 px-2 py-1 text-[11px]"
        >
          <option value="total">Total Tasks</option>
          <option value="overdue">Overdue Tasks</option>
          <option value="avg_per_assignee">Average Tasks / Assignee</option>
        </select>
        <div className="rounded-md bg-neutral-50 p-2 text-lg font-semibold text-slate-800">{value}</div>
      </div>
    )
  },
  time_reporting: ({ context, instance, onUpdate }) => {
    const tracked = (instance.settings?.tracked as Record<string, number>) || {}
    const trackedTasks = context.tasks.filter((task) => (tracked[String(task.id)] || 0) > 0)
    return card(
      "Time Reporting",
      <Timer size={13} className="text-orange-600" />,
      <div className="space-y-2">
        {context.tasks.slice(0, 5).map((task) => (
          <div key={task.id} className="flex items-center justify-between rounded-md border border-neutral-200 p-1.5 text-[11px]">
            <span className="truncate pr-2">{task.title}</span>
            <input
              type="number"
              min={0}
              value={tracked[String(task.id)] || 0}
              onChange={(e) =>
                onUpdate({
                  settings: {
                    ...instance.settings,
                    tracked: {
                      ...tracked,
                      [String(task.id)]: Number(e.target.value || 0),
                    },
                  },
                })
              }
              className="w-14 rounded border border-neutral-200 px-1 py-0.5 text-[11px]"
            />
          </div>
        ))}
        <div className="text-[11px] text-slate-500">
          Tracked tasks: {trackedTasks.length} • Total minutes:{" "}
          {trackedTasks.reduce((sum, task) => sum + (tracked[String(task.id)] || 0), 0)}
        </div>
      </div>
    )
  },
  portfolio: ({ context }) => {
    const workflowMap = new Map<string, { total: number; done: number }>()
    context.tasks.forEach((task) => {
      const key = task.workflow?.name || "General"
      const current = workflowMap.get(key) || { total: 0, done: 0 }
      current.total += 1
      if ((task.stage?.is_terminal ?? false) || task.status === "DONE") current.done += 1
      workflowMap.set(key, current)
    })
    const rows = [...workflowMap.entries()]
    return card(
      "Portfolio",
      <BriefcaseBusiness size={13} className="text-violet-600" />,
      <div className="space-y-2">
        {rows.map(([name, stats]) => {
          const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0
          return (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                <span>{name}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-100">
                <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
        {!rows.length && <div className="rounded-md bg-neutral-50 p-2 text-[11px] text-slate-500">No portfolio data.</div>}
      </div>
    )
  },
  tasks_by_assignee: ({ context }) => {
    const rows = serverTaskRows(context, "my_tasks")
    const source = rows.length
      ? rows.map((row, idx) => ({
          id: idx + 1,
          title: row.title,
          description: "",
          status: (row.status || "NOT_STARTED") as Task["status"],
          priority: null,
          version: 1,
          created_at: "",
          updated_at: "",
          attachments: [],
          assigned_to: row.assignee
            ? { id: idx + 1, full_name: row.assignee, email: row.assignee }
            : undefined,
        }))
      : context.tasks
    return card(
      "Tasks by Assignee",
      <Users size={13} className="text-cyan-600" />,
      renderPie(countByAssignee(source))
    )
  },
  notes: ({ instance, onUpdate }) =>
    card(
      "Notes",
      <StickyNote size={13} className="text-yellow-600" />,
      <div className="space-y-1">
        <textarea
          value={String(instance.settings?.body || "")}
          onChange={(e) =>
            onUpdate({ settings: { ...instance.settings, body: e.target.value } })
          }
          placeholder="Type notes. Use /todo, /h1, /check..."
          className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs"
          rows={6}
        />
      </div>
    ),
  discussion: ({ instance, onUpdate, context }) => {
    const messages = (instance.settings?.messages as string[]) || []
    const draft = String(instance.settings?.draft || "")
    const recent =
      context.serverWidgetsByKey.recent_activity?.data?.map((item) =>
        String(item.message || "")
      ) || []
    const timeline = [...recent, ...messages]
    return card(
      "Discussion",
      <MessageSquare size={13} className="text-blue-600" />,
      <div className="space-y-2">
        <div className="max-h-36 space-y-1 overflow-auto rounded-md border border-neutral-200 p-1.5">
          {timeline.map((message, idx) => (
            <div key={`${message}-${idx}`} className="rounded bg-neutral-50 p-1.5 text-[11px] text-slate-700">
              {message}
            </div>
          ))}
          {!timeline.length && <p className="text-[11px] text-slate-500">No messages yet.</p>}
        </div>
        <div className="flex gap-1">
          <input
            value={draft}
            onChange={(e) =>
              onUpdate({ settings: { ...instance.settings, draft: e.target.value } })
            }
            placeholder="Write a message"
            className="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-[11px]"
          />
          <button
            onClick={() => {
              if (!draft.trim()) return
              onUpdate({
                settings: {
                  ...instance.settings,
                  draft: "",
                  messages: [...messages, draft.trim()],
                },
              })
            }}
            className="rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white"
          >
            Send
          </button>
        </div>
      </div>
    )
  },
  bookmarks: ({ instance, onUpdate }) => {
    const items = (instance.settings?.items as Array<{ label: string; url: string }>) || []
    const label = String(instance.settings?.label || "")
    const url = String(instance.settings?.url || "")
    return card(
      "Bookmarks",
      <BookMarked size={13} className="text-indigo-600" />,
      <div className="space-y-2">
        <div className="space-y-1">
          {items.map((item, idx) => (
            <a
              key={`${item.url}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-neutral-200 p-1.5 text-[11px] text-blue-700 hover:bg-blue-50"
            >
              {item.label || item.url}
            </a>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <input
            value={label}
            onChange={(e) =>
              onUpdate({ settings: { ...instance.settings, label: e.target.value } })
            }
            placeholder="Label"
            className="rounded-md border border-neutral-200 px-2 py-1 text-[11px]"
          />
          <input
            value={url}
            onChange={(e) =>
              onUpdate({ settings: { ...instance.settings, url: e.target.value } })
            }
            placeholder="https://..."
            className="rounded-md border border-neutral-200 px-2 py-1 text-[11px]"
          />
        </div>
        <button
          onClick={() => {
            if (!url.trim()) return
            onUpdate({
              settings: {
                ...instance.settings,
                label: "",
                url: "",
                items: [...items, { label: label.trim(), url: url.trim() }],
              },
            })
          }}
          className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] text-slate-700"
        >
          Add Bookmark
        </button>
      </div>
    )
  },
  overdue_tasks: ({ context }) => {
    const sourceRows = serverTaskRows(context, "my_tasks")
    const overdue = (sourceRows.length ? sourceRows : context.tasks).filter((task) => {
      if (!task.due_date) return false
      if ("stage" in task && task.stage?.is_terminal) return false
      return new Date(task.due_date) < startOfToday()
    })
    const serverOverdue = Number(context.serverWidgetsByKey.tasks_overdue?.value || overdue.length)
    return card(
      "Overdue Tasks",
      <AlertTriangle size={13} className="text-red-600" />,
      <div className="space-y-1">
        <div className="rounded-md bg-red-50 p-1.5 text-[11px] text-red-700">
          Total overdue: {serverOverdue}
        </div>
        {overdue.slice(0, 8).map((task, idx) => (
          <div key={`${task.title}-${idx}`} className="rounded-md border border-red-200 bg-red-50 p-1.5 text-[11px] text-red-700">
            {task.title}
          </div>
        ))}
        {!overdue.length && <div className="rounded-md bg-neutral-50 p-2 text-[11px] text-slate-500">No overdue tasks.</div>}
      </div>
    )
  },
  search: ({ context, instance, onUpdate }) => {
    const rows = serverTaskRows(context, "my_tasks")
    const source = rows.length
      ? rows.map((row, idx) => ({
          id: idx + 1,
          title: row.title,
          description: "",
          status: (row.status || "NOT_STARTED") as Task["status"],
          priority: null,
          version: 1,
          created_at: "",
          updated_at: "",
          attachments: [],
          assigned_to: row.assignee
            ? { id: idx + 1, full_name: row.assignee, email: row.assignee }
            : undefined,
        }))
      : context.tasks
    const query = String(instance.settings?.query || "")
    const filtered = source.filter((task) => {
      const q = query.toLowerCase().trim()
      if (!q) return true
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description || "").toLowerCase().includes(q) ||
        (task.assigned_to?.full_name || "").toLowerCase().includes(q)
      )
    })
    return card(
      "Search",
      <Search size={13} className="text-slate-600" />,
      <div className="space-y-2">
        <input
          value={query}
          onChange={(e) =>
            onUpdate({ settings: { ...instance.settings, query: e.target.value } })
          }
          placeholder="Search tasks..."
          className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-[11px]"
        />
        <div className="max-h-36 space-y-1 overflow-auto">
          {filtered.slice(0, 12).map((task) => (
            <div key={task.id} className="rounded-md border border-neutral-200 p-1.5 text-[11px]">
              {task.title}
            </div>
          ))}
        </div>
      </div>
    )
  },
  tasks_due_soon: ({ context }) => {
    const sourceRows = serverTaskRows(context, "my_tasks")
    const today = startOfToday()
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() + 14)
    const dueSoon = (sourceRows.length ? sourceRows : context.tasks).filter((task) => {
      if (!task.due_date) return false
      if ("stage" in task && task.stage?.is_terminal) return false
      const due = new Date(task.due_date)
      return due >= today && due <= cutoff
    })
    return card(
      "Tasks Due Soon",
      <Clock3 size={13} className="text-amber-600" />,
      <div className="space-y-1">
        {dueSoon.slice(0, 8).map((task, idx) => (
          <div key={`${task.title}-${idx}`} className="flex items-center justify-between rounded-md border border-neutral-200 p-1.5 text-[11px]">
            <span className="truncate pr-2">{task.title}</span>
            <span className="text-slate-500">{new Date(task.due_date || "").toLocaleDateString()}</span>
          </div>
        ))}
        {!dueSoon.length && <div className="rounded-md bg-neutral-50 p-2 text-[11px] text-slate-500">No tasks due soon.</div>}
      </div>
    )
  },
}

export function resolveWidget(key: DashboardWidgetKey) {
  return WIDGET_COMPONENTS[key]
}

export function widgetTitle(key: DashboardWidgetKey) {
  return WIDGET_CATALOG.find((item) => item.key === key)?.title || key
}

export function widgetTierLabel(tier: WidgetTier) {
  return badgeLabel(tier)
}
