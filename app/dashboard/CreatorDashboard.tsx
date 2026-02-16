"use client"

import TaskTable from "@/components/tasks/TaskTable"
import TaskDrawer from "@/components/tasks/TaskDrawer"
import TaskFullView from "@/components/tasks/TaskFullView"
import { useTasks } from "./useTasks"

export default function CreatorDashboard() {
  const {
    tasks,
    loading,
    selectedTask,
    setSelectedTask,
    fullViewTask,
    setFullViewTask,
    toggleDrawer,
    updateTaskInState,
  } = useTasks()

  return (
    <div className="flex flex-col flex-1 mt-6 overflow-hidden px-6">

      <div className="flex justify-between items-center mb-6">

        <button className="px-4 py-2 border rounded-md text-sm">
          Add Task
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {fullViewTask ? (
          <TaskFullView
            task={fullViewTask}
            onClose={() => setFullViewTask(null)}
            onUpdate={(updatedTask) => {
              updateTaskInState(updatedTask)
              setFullViewTask(updatedTask)
            }}
          />
        ) : (
          <>
            <div className="flex-1">
              <TaskTable
                tasks={tasks}
                loading={loading}
                role="TASK_CREATOR"
                assignmentColumn="Assigned To"
                onClickTask={toggleDrawer}
                onDoubleClickTask={setFullViewTask}
              />
            </div>

            {selectedTask && (
              <div className="w-[420px] flex-shrink-0">
                <TaskDrawer
                  task={selectedTask}
                  onClose={() => setSelectedTask(null)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
