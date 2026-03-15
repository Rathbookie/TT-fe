"use client"

import { useEffect, useMemo, useState } from "react"
import { Star } from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import PerformanceDrawer from "@/components/performance/PerformanceDrawer"
import { fetchTeamSummary, TeamSummary, TeamSummaryMember } from "@/lib/performance"

function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function ScoreStars({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[11px] text-neutral-400">No ratings yet</span>
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= Math.round(score) ? "fill-amber-400 text-amber-400" : "fill-transparent text-neutral-200"}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-neutral-700 tabular-nums">{score.toFixed(1)}</span>
    </div>
  )
}

export default function PerformancePage() {
  const today = useMemo(() => new Date(), [])
  const defaultEnd = useMemo(() => toIsoDate(today), [today])
  const defaultStart = useMemo(() => {
    const from = new Date(today)
    from.setDate(from.getDate() - 29)
    return toIsoDate(from)
  }, [today])

  const [draftStartDate, setDraftStartDate] = useState(defaultStart)
  const [draftEndDate, setDraftEndDate] = useState(defaultEnd)
  const [appliedStartDate, setAppliedStartDate] = useState(defaultStart)
  const [appliedEndDate, setAppliedEndDate] = useState(defaultEnd)

  const [summary, setSummary] = useState<TeamSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<TeamSummaryMember | null>(null)

  const periodLabel = `${appliedStartDate} to ${appliedEndDate}`

  useEffect(() => {
    fetchTeamSummary({ startDate: appliedStartDate, endDate: appliedEndDate })
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [appliedStartDate, appliedEndDate])

  const applyDateFilter = () => {
    if (!draftStartDate || !draftEndDate) return
    if (draftStartDate > draftEndDate) {
      alert("Start date cannot be after end date.")
      return
    }
    setLoading(true)
    setSummary(null)
    setSelectedMember(null)
    setAppliedStartDate(draftStartDate)
    setAppliedEndDate(draftEndDate)
  }

  return (
    <WorkspaceShell
      title="Performance"
      subtitle="Per-user profile with average quality, timeliness, and tasks completed."
      actions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draftStartDate}
            onChange={(e) => setDraftStartDate(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-400 focus:outline-none"
          />
          <input
            type="date"
            value={draftEndDate}
            onChange={(e) => setDraftEndDate(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-neutral-400 focus:outline-none"
          />
          <button
            onClick={applyDateFilter}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Apply
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-3">
        <section
          className={`col-span-12 ${
            selectedMember ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12"
          }`}
        >
          <div className="bg-white border border-neutral-200 rounded-lg h-full flex flex-col min-w-0 text-xs">
            <div className="flex-1 overflow-auto min-w-0">
              <table className="w-full text-xs table-fixed">
                <thead className="sticky top-0 z-10 bg-neutral-50">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
                    <th className="px-4 py-2.5 w-[38%] first:rounded-tl-lg">Member</th>
                    <th className="px-4 py-2.5 w-[14%]">Tasks Rated</th>
                    <th className="px-4 py-2.5 w-[22%]">Avg Quality</th>
                    <th className="px-4 py-2.5 w-[16%]">On-time Rate</th>
                    <th className="px-4 py-2.5 w-[10%] last:rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                        Loading…
                      </td>
                    </tr>
                  )}

                  {!loading && summary?.members.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                        No ratings submitted for {periodLabel} yet.
                      </td>
                    </tr>
                  )}

                  {!loading && summary?.members.map((member) => (
                    <tr
                      key={member.user_id}
                      className="group h-[44px] cursor-pointer border-b border-neutral-200 transition hover:bg-neutral-50"
                      onClick={() => setSelectedMember(member)}
                    >
                      <td className="px-4 py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-700">
                            {member.user_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-neutral-800 truncate">{member.user_name}</p>
                            <p className="text-[11px] text-neutral-400 truncate">{member.user_email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-1.5 text-xs text-neutral-700 tabular-nums">{member.tasks_rated}</td>
                      <td className="px-4 py-1.5"><ScoreStars score={member.avg_score} /></td>

                      <td className="px-4 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {member.on_time_rate !== null ? (
                            <>
                              <div className="h-1.5 w-16 rounded-full bg-neutral-100">
                                <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${member.on_time_rate}%` }} />
                              </div>
                              <span className="text-[11px] text-neutral-600 tabular-nums">{member.on_time_rate}%</span>
                            </>
                          ) : (
                            <span className="text-[11px] text-neutral-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-1.5 text-right">
                        <button className="text-[11px] text-neutral-500 hover:text-neutral-900 hover:underline">
                          View profile →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {selectedMember && (
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3">
            <PerformanceDrawer
              key={`${selectedMember.user_id}-${appliedStartDate}-${appliedEndDate}`}
              member={selectedMember}
              startDate={appliedStartDate}
              endDate={appliedEndDate}
              periodLabel={periodLabel}
              onClose={() => setSelectedMember(null)}
            />
          </aside>
        )}
      </div>
    </WorkspaceShell>
  )
}
