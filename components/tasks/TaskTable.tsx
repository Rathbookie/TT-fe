"use client"

import TaskRow from "./TaskRow"
import { Task } from "@/types/task"

interface Props {
  tasks: Task[]
  loading: boolean
  role: string | null
  assignmentColumn: string
  currentPage: number
  totalPages: number
  count: number
  onPageChange: (page: number) => void
  onClickTask: (task: Task) => void
  onDoubleClickTask: (task: Task) => void
  selectedIds?: number[]
  onToggleSelect?: (taskId: number) => void
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
  selectedIds = [],
  onToggleSelect,
}: Props) {
  const PAGE_SIZE = 20
  const start = count > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const end =
    count > 0
      ? Math.min((currentPage - 1) * PAGE_SIZE + tasks.length, count)
      : 0

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
    <div className="bg-white border border-neutral-200 rounded-lg h-full flex flex-col min-w-0 text-xs">

      {/* TABLE SCROLL AREA */}
      <div className="flex-1 overflow-auto min-w-0">
        <table className="w-full text-xs table-fixed">
          <thead className="sticky top-0 z-10 bg-neutral-50">
            <tr className="text-left text-[10px] uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
              <th className="px-3 py-2.5 w-[4%] first:rounded-tl-lg">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-4 py-2.5 w-[25%]">
                Title
              </th>
              <th className="px-4 py-2.5 w-[15%]">
                Stage
              </th>
              <th className="px-4 py-2.5 w-[12%]">
                Priority
              </th>
              <th className="px-4 py-2.5 w-[15%]">
                Due Date
              </th>
              <th className="px-4 py-2.5 w-[20%] whitespace-nowrap">
                {assignmentColumn}
              </th>
              <th className="px-4 py-2.5 w-[14%]">
                Custom Fields
              </th>
              <th className="px-4 py-2.5 w-[10%] last:rounded-tr-lg">
                Actions
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
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={() => onToggleSelect?.(task.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOOTER */}
      {totalPages > 1 && (
        <div className="border-t border-neutral-200 px-4 py-2 flex items-center justify-between text-xs text-neutral-600">
          <div>
            Showing {start}–{end} of {count} tasks
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="h-7 w-7 rounded-md border bg-white disabled:opacity-40"
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
                  className={`h-7 w-7 rounded-md border ${
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
              className="h-7 w-7 rounded-md border bg-white disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
