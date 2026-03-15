"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { fetchRating, submitRating, TaskRatingData } from "@/lib/performance"

type Props = {
  taskId: number
  isTerminal: boolean
  isCancelled?: boolean
  role: string | null
  editable?: boolean
  showCommentInput?: boolean
}

type RatingUpdatedDetail = {
  taskId: number
  rating: TaskRatingData
}

export default function TaskRating({
  taskId,
  isTerminal,
  isCancelled,
  role,
  editable = false,
  showCommentInput = false,
}: Props) {
  const [rating, setRating] = useState<TaskRatingData | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [draftScore, setDraftScore] = useState<number>(0)
  const [draftNote, setDraftNote] = useState("")
  const [saving, setSaving] = useState(false)

  const canRate = role === "ADMIN" || role === "TASK_CREATOR"
  const canView = canRate

  // Fetch if terminal and allowed to see performance details
  useEffect(() => {
    if (!isTerminal || !canView) return
    let mounted = true
    void fetchRating(taskId).then((data) => {
      if (!mounted) return
      setRating(data)
      setDraftScore(data?.score ?? 0)
      setDraftNote(data?.note ?? "")
    })
    return () => { mounted = false }
  }, [taskId, isTerminal, canView])

  useEffect(() => {
    const onRatingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<RatingUpdatedDetail>).detail
      if (!detail || detail.taskId !== taskId) return
      setRating(detail.rating)
      setDraftScore(detail.rating.score)
      setDraftNote(detail.rating.note ?? "")
    }
    window.addEventListener("task-rating-updated", onRatingUpdated as EventListener)
    return () => {
      window.removeEventListener("task-rating-updated", onRatingUpdated as EventListener)
    }
  }, [taskId])

  if (!isTerminal || isCancelled || !canView) return null

  const currentScore = editable ? draftScore : rating?.score ?? 0
  const displayScore = hovered ?? currentScore

  const handleStarClick = (score: number) => {
    if (!editable) return
    setDraftScore(score)
  }

  const handleSave = async () => {
    if (saving) return
    if (draftScore < 1 || draftScore > 5) {
      alert("Please choose a rating from 1 to 5 stars.")
      return
    }
    setSaving(true)
    try {
      const updated = await submitRating(taskId, draftScore, draftNote.trim())
      setRating(updated)
      setDraftScore(updated.score)
      setDraftNote(updated.note ?? "")
      window.dispatchEvent(
        new CustomEvent<RatingUpdatedDetail>("task-rating-updated", {
          detail: { taskId, rating: updated },
        })
      )
    } catch (err) {
      console.error("Rating failed", err)
    } finally {
      setSaving(false)
    }
  }

  const isDirty =
    editable &&
    (draftScore !== (rating?.score ?? 0) ||
      draftNote.trim() !== (rating?.note ?? "").trim())

  if (!editable) {
    return (
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            className={`transition ${
              star <= (rating?.score ?? 0)
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-neutral-300"
            }`}
          />
        ))}
        <span className="ml-1 text-[10px] text-neutral-400 tabular-nums">
          {rating?.score ? `${rating.score}/5` : "—"}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={saving}
            onMouseEnter={() => setHovered(star)}
            onClick={() => handleStarClick(star)}
            className="p-0.5 transition disabled:opacity-50"
            title={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={14}
              className={`transition ${
                star <= displayScore
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-neutral-300"
              }`}
            />
          </button>
        ))}
        <span className="ml-1 text-[11px] text-neutral-500 tabular-nums">
          {draftScore > 0 ? `${draftScore}/5` : "Choose rating"}
        </span>
      </div>

      {showCommentInput && (
        <textarea
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          rows={3}
          placeholder="Optional comment"
          className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-neutral-400">
          {rating?.created_at ? "Saved rating available" : "No rating saved yet"}
        </p>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          className="rounded-md bg-black px-3 py-1.5 text-[11px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save rating"}
        </button>
      </div>
    </div>
  )
}
