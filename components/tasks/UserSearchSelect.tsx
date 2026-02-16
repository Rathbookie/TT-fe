"use client"

import { useState, useEffect } from "react"
import { apiFetchJson } from "@/lib/api"

type Props = {
  disabled?: boolean
  assignedToId: number | null
  setAssignedToId: (id: number) => void
}

export default function UserSearchSelect({
  disabled,
  assignedToId,
  setAssignedToId,
}: Props) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  const fetchUsers = async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    try {
        const data = await apiFetchJson<any[]>(
        `/api/users/?search=${encodeURIComponent(q)}`
        )

      setResults(data || [])
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
      <label className="text-sm font-medium">
        Assign To *
      </label>

      <input
        disabled={disabled}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search for user"
        className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
      />

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-56 overflow-auto">
          {results.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                setAssignedToId(u.id)
                setSearch(u.full_name)
                setOpen(false)
                setResults([])
              }}
              className="px-4 py-2 hover:bg-neutral-100 cursor-pointer text-sm"
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
