"use client"

import TopBar from "@/components/layout/TopBar"
import { useAuth } from "@/context/AuthContext"
import { useTasks } from "./useTasks"
import TaskDrawer from "@/components/tasks/TaskDrawer"
import TaskFullView from "@/components/tasks/TaskFullView"
import TaskTable from "@/components/tasks/TaskTable"
import { apiFetchJson } from "@/lib/api"

export default function DashboardPage() {
  const { activeRole } = useAuth()

  const {
    tasks,
    loading,
    selectedTask,
    setSelectedTask,
    fullViewTask,
    setFullViewTask,
    toggleDrawer,
    updateTaskInState,
    currentPage,
    totalPages,
    count,
    setCurrentPage,
  } = useTasks()

  if (!activeRole) return null

  const openCreateTask = () => {
    setFullViewTask({
      id: null,
      title: "",
      description: "",
      status: "NOT_STARTED",
      priority: null,
      due_date: null,
      assigned_to: null,
      version: 0,
      created_at: "",
      updated_at: "",
    })
  }

  return (
    <>
      <TopBar
        onCreateTask={openCreateTask}
        onToggleDrawer={() => {
          if (selectedTask) {
            setSelectedTask(null)
          } else if (tasks.length > 0) {
            setSelectedTask(tasks[0])
          }
        }}
      />

      <div className="flex flex-1 gap-6 mt-6 overflow-hidden">
        {fullViewTask ? (
          <div className="flex-1">
            <TaskFullView
              task={fullViewTask}
              mode={fullViewTask.id ? "edit" : "create"}
              onClose={() => setFullViewTask(null)}
              onSaved={(savedTask) => {
                updateTaskInState(savedTask)
                setFullViewTask(null)
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex-1">
              <TaskTable
                tasks={tasks}
                loading={loading}
                role={activeRole}
                assignmentColumn={
                  activeRole === "TASK_RECEIVER"
                    ? "Assigned By"
                    : "Assigned To"
                }
                currentPage={currentPage}
                totalPages={totalPages}
                count={count}
                onPageChange={setCurrentPage}
                onClickTask={toggleDrawer}
                onDoubleClickTask={setFullViewTask}
              />
            </div>

            {selectedTask && (
              <div className="w-[420px] flex-shrink-0">
                <TaskDrawer
                  task={selectedTask}
                  updateTaskInState={updateTaskInState}
                  onClose={() => setSelectedTask(null)}
                  onEdit={async (taskId) => {
                    const fullTask = await apiFetchJson(
                      `/api/tasks/${taskId}/`
                    )
                    setSelectedTask(null)
                    setFullViewTask(fullTask)
                  }}
                  onTaskUpdated={(updatedTask) => {
                    updateTaskInState(updatedTask)
                    setSelectedTask(updatedTask)
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
