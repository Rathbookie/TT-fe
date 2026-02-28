"use client"

import {
  DashboardWidgetContext,
  DashboardWidgetKey,
  WIDGET_COMPONENTS,
  WidgetInstance,
  widgetTitle,
} from "./WidgetRegistry"
import { Expand, GripVertical, Maximize2, Minimize2, X } from "lucide-react"

type Props = {
  instance: WidgetInstance
  context: DashboardWidgetContext
  onUpdate: (id: string, patch: Partial<WidgetInstance>) => void
  onRemove: (id: string) => void
  editable: boolean
  onOpen: (id: string) => void
}

export default function WidgetRenderer({
  instance,
  context,
  onUpdate,
  onRemove,
  editable,
  onOpen,
}: Props) {
  const widget = WIDGET_COMPONENTS[instance.key as DashboardWidgetKey]
  if (!widget) {
    return (
      <article className="surface-card h-full p-3">
        <p className="text-xs font-medium text-slate-700">{widgetTitle(instance.key)}</p>
        <p className="mt-1 text-xs text-slate-500">Widget type `{instance.key}` is not registered.</p>
      </article>
    )
  }

  return (
    <article className="surface-card h-full p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {editable ? (
            <button
              className="widget-drag-handle cursor-grab rounded-md border border-neutral-200 bg-white p-1 text-slate-500 hover:bg-neutral-50 active:cursor-grabbing"
              title="Drag to move"
            >
              <GripVertical size={12} />
            </button>
          ) : null}
          <span className="text-[11px] font-medium text-slate-600">{widgetTitle(instance.key)}</span>
        </div>
        <div className="flex items-center gap-1">
          {editable ? (
            <>
              <button
                onClick={() => onUpdate(instance.id, { w: 3, h: 8 })}
                className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
              >
                S
              </button>
              <button
                onClick={() => onUpdate(instance.id, { w: 6, h: 9 })}
                className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
              >
                M
              </button>
              <button
                onClick={() => onUpdate(instance.id, { w: 12, h: 10 })}
                className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
              >
                L
              </button>
            </>
          ) : null}
          <button
            onClick={() => onOpen(instance.id)}
            className="rounded border border-neutral-200 bg-white p-1 text-slate-500 hover:bg-neutral-50"
            title="Open details"
          >
            <Expand size={12} />
          </button>
          {editable ? (
            <button
              onClick={() => onRemove(instance.id)}
              className="rounded border border-red-200 bg-white p-1 text-red-600 hover:bg-red-50"
              title="Remove widget"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="h-[calc(100%-24px)] overflow-auto">
        {widget({
          instance,
          context,
          onUpdate: (patch) => onUpdate(instance.id, patch),
        })}
      </div>
    </article>
  )
}

type ExpandedProps = {
  instance: WidgetInstance
  context: DashboardWidgetContext
  onUpdate: (id: string, patch: Partial<WidgetInstance>) => void
  onClose: () => void
}

export function ExpandedWidgetModal({ instance, context, onUpdate, onClose }: ExpandedProps) {
  const widget = WIDGET_COMPONENTS[instance.key as DashboardWidgetKey]
  if (!widget) return null

  const total = context.tasks.length
  const completed = context.tasks.filter(
    (task) => task.stage?.is_terminal || task.status === "DONE"
  ).length
  const overdue = context.tasks.filter((task) => {
    if (!task.due_date) return false
    if (task.stage?.is_terminal) return false
    return new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0))
  }).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3">
      <div className="grid h-[86vh] w-[96vw] grid-cols-12 grid-rows-[auto_1fr] gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white p-2 shadow-2xl">
        <div className="col-span-12 row-start-1 flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <p className="text-sm font-semibold text-slate-800">{widgetTitle(instance.key)}</p>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-200 bg-white p-1 text-slate-600 hover:bg-neutral-100"
          >
            <Minimize2 size={14} />
          </button>
        </div>
        <section className="col-span-12 row-start-2 min-h-0 overflow-auto rounded-md border border-neutral-200 p-3 xl:col-span-9">
          {widget({
            instance,
            context,
            onUpdate: (patch) => onUpdate(instance.id, patch),
          })}
        </section>
        <aside className="col-span-12 row-start-2 min-h-0 overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 xl:col-span-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-700">Widget Insights</h3>
          <div className="space-y-1 text-[11px] text-slate-600">
            <p>Total tasks: {total}</p>
            <p>Completed: {completed}</p>
            <p>Open: {Math.max(0, total - completed)}</p>
            <p>Overdue: {overdue}</p>
            <p>Grid size: {instance.w || 4} x {instance.h || 8}</p>
          </div>
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-700">Current Settings</h4>
          <pre className="rounded-md border border-neutral-200 bg-white p-2 text-[10px] text-slate-600">
            {JSON.stringify(instance.settings || {}, null, 2)}
          </pre>
          <button
            onClick={() => onUpdate(instance.id, { w: 12, h: Math.max(instance.h || 8, 10) })}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-neutral-100"
          >
            <Maximize2 size={12} />
            Expand to Full Width
          </button>
        </aside>
      </div>
    </div>
  )
}
