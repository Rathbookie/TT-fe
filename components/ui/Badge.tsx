"use client"

import { getStatusLabel } from "@/lib/workflowDisplay"
import { stageTone } from "@/lib/stageTheme"

type Variant = "status" | "priority"

interface Props {
  variant: Variant
  value: string
  isTerminal?: boolean
}

export default function Badge({ variant, value, isTerminal = false }: Props) {
  if (variant === "status") {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${stageTone(value, isTerminal)}`}
      >
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
