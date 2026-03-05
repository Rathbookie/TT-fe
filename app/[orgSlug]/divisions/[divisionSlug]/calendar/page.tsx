"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Filter } from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetchJson } from "@/lib/api"

type Props = {
  params: {
    orgSlug: string
    divisionSlug: string
  }
}

type TaskProjection = {
  id: number
  title: string
  due_date?: string | null
  assigned_to?: {
    id: number
    full_name: string
    email: string
  } | null
}

type TaskListResponse = {
  results?: TaskProjection[]
}

const toDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export default function DivisionCalendarPage({ params }: Props) {
  const { orgSlug, divisionSlug } = params

  const [tasks, setTasks] = useState<TaskProjection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<string>("ALL")
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    if (!orgSlug) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const payload = await apiFetchJson<TaskListResponse>(
          `/api/tasks/?division=${divisionSlug}&include_terminal=1&page=1&page_size=300`
        )
        setTasks((payload.results || []).filter((t) => Boolean(t.due_date)))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calendar tasks.")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [divisionSlug, orgSlug])

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>()
    tasks.forEach((task) => {
      if (task.assigned_to?.id) {
        map.set(
          String(task.assigned_to.id),
          task.assigned_to.full_name || task.assigned_to.email
        )
      }
    })
    return Array.from(map.entries())
  }, [tasks])

  const visibleTasks = useMemo(() => {
    if (selectedAssignee === "ALL") return tasks
    return tasks.filter((task) => String(task.assigned_to?.id || "") === selectedAssignee)
  }, [selectedAssignee, tasks])

  const monthGrid = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const firstDay = new Date(year, month, 1)
    const startWeekday = firstDay.getDay()
    const startDate = new Date(year, month, 1 - startWeekday)
    const cells: Date[] = []
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      cells.push(day)
    }
    return cells
  }, [monthCursor])

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, TaskProjection[]>()
    visibleTasks.forEach((task) => {
      if (!task.due_date) return
      const due = new Date(task.due_date)
      if (Number.isNaN(due.getTime())) return
      const key = toDateKey(due)
      const arr = grouped.get(key) || []
      arr.push(task)
      grouped.set(key, arr)
    })
    return grouped
  }, [visibleTasks])

  return (
    <WorkspaceShell
      title={`${divisionSlug} Calendar`}
      subtitle="Calendar view with due dates and assignee filter"
      actions={
        <Link
          href={`/${orgSlug}/divisions/${divisionSlug}`}
          className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 hover:bg-neutral-50"
        >
          Back to Dashboard
        </Link>
      }
    >
      <div className="surface-card p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            className="rounded-md border border-neutral-200 bg-white p-1 text-slate-600 hover:bg-neutral-50"
          >
            <ChevronLeft size={14} />
          </button>
          <h2 className="min-w-[180px] text-sm font-semibold text-slate-900">
            {monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button
            onClick={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            className="rounded-md border border-neutral-200 bg-white p-1 text-slate-600 hover:bg-neutral-50"
          >
            <ChevronRight size={14} />
          </button>
          <div className="ml-auto inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1">
            <Filter size={12} className="text-slate-500" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-transparent text-xs text-slate-700 outline-none"
            >
              <option value="ALL">All people</option>
              {assigneeOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading calendar...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && !error ? (
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="rounded-md bg-neutral-100 px-2 py-1 text-center text-[11px] font-medium text-slate-600"
              >
                {day}
              </div>
            ))}

            {monthGrid.map((day) => {
              const isCurrentMonth = day.getMonth() === monthCursor.getMonth()
              const key = toDateKey(day)
              const dayTasks = tasksByDay.get(key) || []
              return (
                <div
                  key={key}
                  className={`min-h-[110px] rounded-md border p-2 ${
                    isCurrentMonth ? "border-neutral-200 bg-white" : "border-neutral-100 bg-neutral-50"
                  }`}
                >
                  <p className={`mb-1 text-[11px] ${isCurrentMonth ? "text-slate-800" : "text-slate-400"}`}>
                    {day.getDate()}
                  </p>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="truncate rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700"
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 ? (
                      <p className="text-[10px] text-slate-500">+{dayTasks.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  )
}
