interface Props {
  tasks: any[]
  loading: boolean
  onClickTask: (id: number) => void
  onDoubleClickTask: (id: number) => void
}

export default function TaskTable({
  tasks,
  loading,
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
          </div>
        ))}
      </div>
    </div>
  )
}
