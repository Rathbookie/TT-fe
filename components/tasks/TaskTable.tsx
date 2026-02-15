"use client"

interface Props {
  tasks: any[]
  loading: boolean
  mode: string | null
  onClickTask: (task: any) => void
  onDoubleClickTask: (task: any) => void
}

export default function TaskTable({
  tasks,
  loading,
  mode,
  onClickTask,
  onDoubleClickTask,
}: Props) {
  if (loading) {
    return (
      <div className="bg-neutral-100 rounded-3xl p-8">
        Loading...
      </div>
    )
  }

  if (!tasks.length) {
    return (
      <div className="bg-neutral-100 rounded-3xl p-8">
        No tasks found.
      </div>
    )
  }

  return (
    <div className="bg-neutral-100 rounded-3xl p-8 h-full flex flex-col">
      <div className="mb-6 font-semibold">Tasks</div>

      <div className="flex-1 overflow-auto space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onClickTask(task)}
            onDoubleClick={() => onDoubleClickTask(task)}
            className="bg-neutral-200 p-4 rounded-xl hover:bg-neutral-300 cursor-pointer"
          >
            <div className="font-medium">{task.title}</div>

            <div className="text-sm text-neutral-600">
              {task.status}
            </div>

            {/* Role-based projection */}
            {mode === "TASK_CREATOR" && (
              <div className="text-xs text-neutral-500 mt-1">
                Assigned To: {task.assigned_to?.full_name}
              </div>
            )}

            {mode === "TASK_RECEIVER" && (
              <div className="text-xs text-neutral-500 mt-1">
                Given By: {task.created_by?.full_name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
