"use client"

import { useState, useEffect } from "react"
import { apiFetchJson } from "@/lib/api"
import { UserProjection } from "@/types/task"

type Props = {
  disabled?: boolean
  assignedToId: number | null
  setAssignedToId: (id: number) => void
}

export default function UserSearchSelect({
  disabled,
  assignedToId: _assignedToId,
  setAssignedToId,
}: Props) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<UserProjection[]>([])
  const [open, setOpen] = useState(false)

  const fetchUsers = async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    try {
      const data = await apiFetchJson<UserProjection[] | { results?: UserProjection[] }>(
        `/api/users/?search=${encodeURIComponent(q)}`
      )

      setResults(Array.isArray(data) ? data : (data.results || []))
      setOpen(true)
    } catch (err) {
      console.error(err)
      setResults([])
      setOpen(false)
    }
  }

  // Debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(search)
    }, 300)

    return () => clearTimeout(timeout)
  }, [search])

  return (
    <div className="space-y-2 relative">
      <label className="text-xs font-medium">
        Assign To *
      </label>

      <input
        disabled={disabled}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search for user"
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
      />

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-56 overflow-auto">
          {results.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                setAssignedToId(u.id)
                setSearch(u.full_name)
                setOpen(false)
                setResults([])
              }}
              className="px-3 py-1.5 hover:bg-neutral-100 cursor-pointer text-xs"
            >
              <div className="font-medium text-neutral-800">
                {u.full_name}
              </div>
              <div className="text-xs text-neutral-500">
                {u.email}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
