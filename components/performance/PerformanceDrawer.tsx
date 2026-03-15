"use client"

import { useEffect, useState } from "react"
import { Minus, Star, TrendingDown, TrendingUp } from "lucide-react"
import { TeamSummaryMember, UserPerformanceProfile, fetchUserProfile } from "@/lib/performance"

type Props = {
  member: TeamSummaryMember
  startDate: string
  endDate: string
  periodLabel: string
  onClose: () => void
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

function TrendIcon({ trend }: { trend: UserPerformanceProfile["score_trend"] }) {
  if (!trend) return null
  if (trend === "improving") return <TrendingUp size={13} className="text-emerald-500" />
  if (trend === "declining") return <TrendingDown size={13} className="text-red-500" />
  return <Minus size={13} className="text-neutral-400" />
}

function TimelinessBar({ profile }: { profile: UserPerformanceProfile }) {
  const total = profile.tasks_with_due_date
  if (total === 0) return <span className="text-[11px] text-neutral-400">No tasks with due date</span>

  const segments = [
    { key: "on_time", count: profile.on_time_count, color: "bg-emerald-400", label: "On time" },
    { key: "slight_delay", count: profile.slight_delay_count, color: "bg-amber-300", label: "Slight delay" },
    { key: "extended", count: profile.extended_count, color: "bg-blue-300", label: "Extended" },
    { key: "late", count: profile.late_count, color: "bg-orange-400", label: "Late" },
    { key: "overdue", count: profile.overdue_count, color: "bg-red-500", label: "Overdue" },
  ]

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full gap-px">
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100
          if (pct === 0) return null
          return <div key={seg.key} className={`${seg.color} h-full`} style={{ width: `${pct}%` }} title={`${seg.label}: ${seg.count}`} />
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.filter((s) => s.count > 0).map((seg) => (
          <div key={seg.key} className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${seg.color}`} />
            <span className="text-[11px] text-neutral-500">{seg.label}: {seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PerformanceDrawer({ member, startDate, endDate, periodLabel, onClose }: Props) {
  const [profile, setProfile] = useState<UserPerformanceProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserProfile(member.user_id, { startDate, endDate })
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [member.user_id, startDate, endDate])

  return (
    <div className="h-full w-full bg-white border border-neutral-200 rounded-lg flex flex-col overflow-hidden text-xs">
      <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-200">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-900">{member.user_name}</h2>
          <p className="mt-0.5 text-[11px] text-neutral-400 truncate">{member.user_email} · {periodLabel}</p>
        </div>
        <button onClick={onClose} className="ml-3 text-neutral-500 hover:text-neutral-900 text-lg flex-shrink-0">×</button>
      </div>

      {loading && <div className="px-6 py-12 text-center text-sm text-neutral-400">Loading profile…</div>}

      {!loading && profile && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Tasks completed</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{profile.tasks_completed}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">On-time rate</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{profile.on_time_rate !== null ? `${profile.on_time_rate}%` : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Avg quality per task</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{profile.avg_quality_score !== null ? profile.avg_quality_score.toFixed(1) : "—"}</p>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Quality score</p>
            <div className="flex items-center gap-3">
              <ScoreStars score={profile.avg_quality_score} />
              <TrendIcon trend={profile.score_trend} />
              {profile.score_trend ? <span className="text-[11px] text-neutral-500">{profile.score_trend}</span> : null}
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Timeliness ({profile.tasks_with_due_date} tasks with due date)</p>
            <TimelinessBar profile={profile} />
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Performance Notes</p>
            {profile.commented_tasks.length === 0 ? (
              <p className="text-[11px] text-neutral-400">No rating comments for this period.</p>
            ) : (
              <div className="space-y-2">
                {profile.commented_tasks.map((entry) => (
                  <div key={`comment-${entry.id}`} className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 truncate">{entry.task_title}</p>
                      <span className="text-[11px] font-semibold text-slate-700">{entry.score}/5</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">{entry.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
