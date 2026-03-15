// lib/performance.ts

import { apiFetchJson } from "@/lib/api"
import { apiFetch } from "@/lib/api"

export type TaskRatingData = {
  id: number
  task_ref_id: string
  task_title: string
  task_due_date: string | null
  task_completed_at: string | null
  score: number
  note: string
  rated_by_name: string | null
  rated_user_name: string
  created_at: string
}

export type UserPerformanceProfile = {
  user_id: number
  user_name: string
  user_email: string
  period_label: string
  tasks_rated: number
  avg_quality_score: number | null
  score_trend: "improving" | "declining" | "stable" | null
  tasks_with_due_date: number
  on_time_count: number
  slight_delay_count: number
  late_count: number
  extended_count: number
  overdue_count: number
  on_time_rate: number | null
  tasks_completed: number
  top_rated_tasks: TaskRatingData[]
  flagged_tasks: TaskRatingData[]
  commented_tasks: TaskRatingData[]
}

export type TeamSummaryMember = {
  user_id: number
  user_name: string
  user_email: string
  tasks_rated: number
  avg_score: number
  on_time_rate: number | null
}

export type TeamSummary = {
  period: string
  members: TeamSummaryMember[]
}

export type PerformanceDateRange = {
  startDate: string
  endDate: string
}

export async function submitRating(
  taskId: number,
  score: number,
  note?: string
): Promise<TaskRatingData> {
  return apiFetchJson<TaskRatingData>(`/api/performance/tasks/${taskId}/rate/`, {
    method: "POST",
    body: JSON.stringify({ score, note: note ?? "" }),
  })
}

export async function fetchRating(taskId: number): Promise<TaskRatingData | null> {
  const res = await apiFetch(`/api/performance/tasks/${taskId}/rating/`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    const text = await res.text()
    let detail = text
    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string }
      detail = parsed.detail || parsed.error || text
    } catch {
      // keep raw text
    }
    throw new Error(`API ${res.status}: ${detail || "Request failed"}`)
  }
  return (await res.json()) as TaskRatingData
}

export async function fetchUserProfile(
  userId: number,
  range: PerformanceDateRange
): Promise<UserPerformanceProfile> {
  const params = new URLSearchParams({
    start_date: range.startDate,
    end_date: range.endDate,
  })
  return apiFetchJson<UserPerformanceProfile>(
    `/api/performance/users/${userId}/profile/?${params}`
  )
}

export async function fetchTeamSummary(
  range: PerformanceDateRange
): Promise<TeamSummary> {
  const params = new URLSearchParams({
    start_date: range.startDate,
    end_date: range.endDate,
  })
  return apiFetchJson<TeamSummary>(`/api/performance/summary/?${params}`)
}
