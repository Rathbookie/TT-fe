"use client"

import TopBar from "@/components/layout/TopBar"
import TaskTable from "@/components/tasks/TaskTable"
import TaskDrawer from "@/components/tasks/TaskDrawer"
import TaskFullView from "@/components/tasks/TaskFullView"
import { useEffect, useState } from "react"
import { getTasks } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

export default function DashboardPage() {
  const { roles, activeRole, setActiveRole } = useAuth()

  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [fullViewTask, setFullViewTask] = useState<any | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await getTasks()

        if (Array.isArray(data)) {
          setTasks(data)
        } else if (data.results) {
          setTasks(data.results)
        } else {
          setTasks([])
        }
      } catch (err) {
        console.error("Task fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (activeRole) {
      loadTasks()
    }
  }, [activeRole])

  const toggleDrawer = (task: any) => {
    if (selectedTask?.id === task.id) {
      setSelectedTask(null)
    } else {
      setSelectedTask(task)
    }
  }

  return (
    <>
      {/* TOP BAR */}
      <TopBar
        activeRole={activeRole}
        roles={roles}
        setActiveRole={setActiveRole}
        openFirstTask={() => {
          if (tasks.length > 0) {
            setSelectedTask(tasks[0])
          }
        }}
        closeDrawer={() => setSelectedTask(null)}
      />

      <div className="flex flex-1 gap-6 mt-6 overflow-hidden">
        {fullViewTask ? (
          <TaskFullView
            task={fullViewTask}
            onClose={() => setFullViewTask(null)}
            onUpdate={(updatedTask) => {
              setTasks(prev =>
                prev.map(t =>
                  t.id === updatedTask.id ? updatedTask : t
                )
              )

              setFullViewTask(updatedTask)

              if (selectedTask?.id === updatedTask.id) {
                setSelectedTask(updatedTask)
              }
            }}
          />
        ) : (
          <>
            <div className="flex-1">
              <TaskTable
                tasks={tasks}
                loading={loading}
                mode={activeRole}   // 👈 role-aware mode
                onClickTask={toggleDrawer}
                onDoubleClickTask={(task) => setFullViewTask(task)}
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
    </>
  )
}
