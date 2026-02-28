"use client"

import { LucideIcon } from "lucide-react"

type Props = {
  title: string
  value: string | number
  tone: string
  icon: LucideIcon
}

export default function WidgetKPI({ title, value, tone, icon: Icon }: Props) {
  return (
    <article className="surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">{title}</p>
        <Icon size={14} className={tone} />
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  )
}

