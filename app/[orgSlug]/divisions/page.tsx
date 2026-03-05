"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Folder, Layers, ListTodo, ArrowRight } from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetchJson } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

type Division = {
  id: number
  name: string
  slug: string
  description?: string
}

type Section = {
  id: number
}

type Board = {
  id: number
}

type CollectionResponse<T> = T[] | { results?: T[] }

const extractResults = <T,>(payload: CollectionResponse<T>): T[] =>
  Array.isArray(payload) ? payload : payload.results || []

export default function DivisionsHomePage() {
  const { user } = useAuth()
  const orgSlug = user?.tenant_slug || null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [sectionCounts, setSectionCounts] = useState<Record<number, number>>({})
  const [boardCounts, setBoardCounts] = useState<Record<number, number>>({})

  useEffect(() => {
    if (!orgSlug) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const divisionPayload = await apiFetchJson<CollectionResponse<Division>>(
          `/api/${orgSlug}/divisions/`
        )
        const divisionList = extractResults(divisionPayload)
        setDivisions(divisionList)

        const sectionPayloads = await Promise.all(
          divisionList.map((division) =>
            apiFetchJson<CollectionResponse<Section>>(
              `/api/${orgSlug}/divisions/${division.slug}/sections/`
            )
          )
        )
        const boardPayloads = await Promise.all(
          divisionList.map((division) =>
            apiFetchJson<CollectionResponse<Board>>(
              `/api/${orgSlug}/divisions/${division.slug}/boards/`
            )
          )
        )

        const nextSectionCounts: Record<number, number> = {}
        const nextBoardCounts: Record<number, number> = {}
        divisionList.forEach((division, index) => {
          nextSectionCounts[division.id] = extractResults(sectionPayloads[index]).length
          nextBoardCounts[division.id] = extractResults(boardPayloads[index]).length
        })
        setSectionCounts(nextSectionCounts)
        setBoardCounts(nextBoardCounts)
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to load divisions."
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [orgSlug])

  const title = useMemo(() => "Divisions", [])

  return (
    <WorkspaceShell
      title={title}
      subtitle="All divisions, each with its own list/task engine workspace."
    >
      <div className="surface-card p-4">
        {loading ? <p className="text-sm text-slate-500">Loading divisions...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error && divisions.length === 0 ? (
          <p className="text-sm text-slate-500">No divisions yet. Create one from the sidebar + button.</p>
        ) : null}

        {!loading && !error && divisions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {divisions.map((division) => (
              <Link
                key={division.id}
                href={`/${orgSlug}/divisions/${division.slug}`}
                className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">
                      <Folder size={14} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{division.name}</h3>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-slate-500">
                  {division.description || "Open division workspace to manage lists, tasks, and subtasks."}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Layers size={12} />
                    {sectionCounts[division.id] ?? 0} sections
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListTodo size={12} />
                    {boardCounts[division.id] ?? 0} lists
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  )
}
