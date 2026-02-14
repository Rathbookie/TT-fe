"use client"

interface Props {
  task: any
  onClose: () => void
}

export default function TaskDrawer({ task, onClose }: Props) {
  if (!task) return null

  return (
    <div className="bg-neutral-100 rounded-3xl p-8 h-full flex flex-col">
      <div className="flex justify-between mb-6">
        <h2 className="text-lg font-semibold">
          {task.title}
        </h2>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg border"
        >
          Close
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <strong>Status:</strong> {task.status}
        </div>

        <div>
          <strong>Description:</strong> {task.description || "—"}
        </div>

        <div>
          <strong>Priority:</strong> {task.priority || "—"}
        </div>

        <div>
          <strong>Due:</strong> {task.due_date || "—"}
        </div>
      </div>
    </div>
  )
}
