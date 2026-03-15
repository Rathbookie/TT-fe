"use client"

import { getStatusLabel } from "@/lib/workflowDisplay"
import { stageTone, stageToneStyle } from "@/lib/stageTheme"

type Variant = "status" | "priority"

interface Props {
  variant: Variant
  value: string
  isTerminal?: boolean
  isPausable?: boolean
  isCancelled?: boolean
  color?: string | null
}

export default function Badge({
  variant,
  value,
  isTerminal = false,
  isPausable = false,
  isCancelled = false,
  color = null,
}: Props) {
  if (variant === "status") {
    let className = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]"
    let style: ReturnType<typeof stageToneStyle> | undefined

    if (isCancelled) {
      className += " border-neutral-300 bg-neutral-100 text-neutral-500 line-through"
    } else if (isTerminal) {
      className += " border-emerald-300 bg-emerald-100 text-emerald-700"
    } else if (isPausable) {
      className += " border-amber-300 bg-amber-100 text-amber-800"
    } else {
      className += ` ${stageTone(value, false)}`
      style = stageToneStyle(color)
    }

    return (
      <span className={className} style={style}>
        {getStatusLabel(value)}
      </span>
    )
  }

  if (variant === "priority") {
    const styles: Record<string, string> = {
      P1: "bg-red-100 text-red-700",
      P2: "bg-orange-100 text-orange-700",
      P3: "bg-blue-100 text-blue-700",
      P4: "bg-green-100 text-green-700",
    }

    const labels: Record<string, string> = {
      P1: "Critical",
      P2: "High",
      P3: "Normal",
      P4: "Low",
    }

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${styles[value]}`}
      >
        {labels[value]}
      </span>
    )
  }

  return null
}
