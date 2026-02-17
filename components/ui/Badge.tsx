"use client"

type Variant = "status" | "priority"

interface Props {
  variant: Variant
  value: string
}

export default function Badge({ variant, value }: Props) {
  if (variant === "status") {
    const styles: Record<string, string> = {
      NOT_STARTED: "bg-neutral-200 text-neutral-700",
      IN_PROGRESS: "bg-blue-100 text-blue-700",
      BLOCKED: "bg-red-100 text-red-700",
      WAITING: "bg-yellow-100 text-yellow-700",
      DONE: "bg-green-100 text-green-700",
      CANCELLED: "bg-neutral-300 text-neutral-600",
    }

    return (
      <span
        className={`px-3 py-1 text-xs rounded-full ${
          styles[value] || "bg-neutral-200"
        }`}
      >
        {value.replace("_", " ")}
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
        className={`px-3 py-1 text-xs rounded-full ${styles[value]}`}
      >
        {labels[value]}
      </span>
    )
  }

  return null
}
