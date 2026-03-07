"use client"

import { TaskPriority, UserProjection } from "@/types/task"
import { apiFetchJson } from "@/lib/api"
import { useEffect, useState } from "react"

type Props = {
  isTerminal: boolean
  priority: TaskPriority | ""
  setPriority: (v: TaskPriority) => void
  dueDate: string
  setDueDate: (v: string) => void
  dueTime: string
  setDueTime: (v: string) => void
  assignees: UserProjection[]
  setAssignees: (v: UserProjection[]) => void
}

export default function TaskMetaFields({
  isTerminal,
  priority,
  setPriority,
  dueDate,
  setDueDate,
  dueTime,
  setDueTime,
  assignees,
  setAssignees,
}: Props) {
  const [userSearch, setUserSearch] = useState("")
  const [userResults, setUserResults] = useState<UserProjection[]>([])

  const fetchUsers = async (q: string) => {
    if (!q.trim()) {
      setUserResults([])
      return
    }

    try {
      const data = await apiFetchJson<UserProjection[] | { results?: UserProjection[] }>(
        `/api/users/?search=${encodeURIComponent(q)}`
      )
      setUserResults(Array.isArray(data) ? data : (data.results || []))
    } catch (err) {
      console.error("User search failed:", err)
      setUserResults([])
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers(userSearch)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [userSearch])

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Assign To */}
      <div className="space-y-2 relative">
        <label className="text-xs font-medium">Assign To *</label>

        <input
          disabled={isTerminal}
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="Search for user"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
        />

        {userResults.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-sm max-h-48 overflow-auto">
            {userResults.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  if (!assignees.some((item) => item.id === u.id)) {
                    setAssignees([...assignees, u])
                  }
                  setUserSearch("")
                  setUserResults([])
                }}
                className="px-3 py-1.5 hover:bg-neutral-100 cursor-pointer text-xs"
              >
                <div className="font-medium text-neutral-800">{u.full_name || u.email}</div>
                <div className="text-[11px] text-neutral-500">{u.email}</div>
              </div>
            ))}
          </div>
        )}
        {assignees.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {assignees.map((assignee) => (
              <button
                key={assignee.id}
                onClick={() =>
                  setAssignees(assignees.filter((item) => item.id !== assignee.id))
                }
                className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-slate-600"
              >
                {(assignee.full_name || assignee.email || "Unknown User").trim()} ×
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Priority *</label>
        <select
          disabled={isTerminal}
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as TaskPriority)
          }
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
        >
          <option value="">Select priority</option>
          <option value="P1">Critical</option>
          <option value="P2">High</option>
          <option value="P3">Normal</option>
          <option value="P4">Low</option>
        </select>
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Due Date *</label>
        <input
          disabled={isTerminal}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Due Time */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Due Time</label>
        <input
          disabled={isTerminal}
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
        />
      </div>
    </div>
  )
}
