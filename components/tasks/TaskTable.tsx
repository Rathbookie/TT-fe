"use client"

import TaskRow from "./TaskRow"

interface Props {
  tasks: any[]
  loading: boolean
  role: string | null
  assignmentColumn: string
  onClickTask: (task: any) => void
  onDoubleClickTask: (task: any) => void
}

export default function TaskTable({
  tasks,
  loading,
  role,
  assignmentColumn,
  onClickTask,
  onDoubleClickTask,
}: Props) {

  if (loading) {
    return (
      <div className="bg-neutral-100 rounded-lg p-8 h-full flex items-center justify-center text-neutral-500">
        Loading tasks…
      </div>
    )
  }

  if (!tasks.length) {
    return (
      <div className="bg-neutral-100 rounded-lg p-8 h-full flex items-center justify-center text-neutral-500">
        No tasks found.
      </div>
    )
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 h-full flex flex-col">
      <div className="overflow-auto">
        <table className="w-full text-sm table-fixed">
          <thead className="border-b border-neutral-300 text-left text-xs uppercase text-neutral-500 tracking-wide sticky top-0 bg-white">
            <tr>
              <th className="pb-3 px-6 w-[30%]">Task Name</th>
              <th className="pb-3 px-6 w-[15%]">Status</th>
              <th className="pb-3 px-6 w-[15%]">Due</th>
              <th className="pb-3 px-6 w-[20%]">{assignmentColumn}</th>
              <th className="pb-3 px-6 w-[20%]">Priority</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                role={role}
                onClick={() => onClickTask(task)}
                onDoubleClick={() => onDoubleClickTask(task)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
