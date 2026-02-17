"use client"

import TaskRow from "./TaskRow"

interface Props {
  tasks: any[]
  loading: boolean
  role: string | null
  assignmentColumn: string
  currentPage: number
  totalPages: number
  count: number
  onPageChange: (page: number) => void
  onClickTask: (task: any) => void
  onDoubleClickTask: (task: any) => void
}

export default function TaskTable({
  tasks,
  loading,
  role,
  assignmentColumn,
  currentPage,
  totalPages,
  count,
  onPageChange,
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
    <div className="bg-white border border-neutral-200 rounded-lg h-full flex flex-col min-w-0">

      {/* TABLE SCROLL AREA */}
      <div className="flex-1 overflow-auto min-w-0">
        <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 z-10 bg-neutral-50">
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
              <th className="px-6 py-4 w-[30%] first:rounded-tl-lg">
                Task Name
              </th>
              <th className="px-6 py-4 w-[15%]">
                Status
              </th>
              <th className="px-6 py-4 w-[15%]">
                Due
              </th>
              <th className="px-6 py-4 w-[20%] whitespace-nowrap">
                {assignmentColumn}
              </th>
              <th className="px-6 py-4 w-[20%] last:rounded-tr-lg">
                Priority
              </th>
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

      {/* PAGINATION FOOTER */}
      {totalPages > 1 && (
        <div className="border-t border-neutral-200 px-6 py-2.5 flex items-center justify-between text-sm text-neutral-600">
          <div>
            Showing {(currentPage - 1) * 20 + 1}–
            {Math.min(currentPage * 20, count)} of {count} tasks
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="h-9 w-9 rounded-md border bg-white disabled:opacity-40"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1
              const active = page === currentPage

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`h-9 w-9 rounded-md border ${
                    active
                      ? "border-black bg-neutral-200"
                      : "bg-white hover:bg-neutral-100"
                  }`}
                >
                  {page}
                </button>
              )
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="h-9 w-9 rounded-md border bg-white disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
