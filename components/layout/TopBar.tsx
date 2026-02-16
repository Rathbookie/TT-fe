"use client"

interface Props {
  activeRole?: string | null
  roles?: string[]
  setActiveRole: (role: string) => void
  toggleDrawer: () => void
  openCreateTask: () => void
}

export default function TopBar({
  activeRole,
  roles = [],
  setActiveRole,
  toggleDrawer,
  openCreateTask,
}: Props) {

  return (
    <div className="bg-white rounded-lg border p-4 flex justify-between items-center">

      {/* LEFT SIDE — ROLE SWITCH */}
      <div className="flex items-center gap-4">

        {roles.length > 1 && (
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={activeRole ?? ""}
            onChange={(e) => setActiveRole(e.target.value)}
          >
            {roles.includes("TASK_RECEIVER") && (
              <option value="TASK_RECEIVER">
                Tasks Received
              </option>
            )}

            {roles.includes("TASK_CREATOR") && (
              <option value="TASK_CREATOR">
                Tasks Given
              </option>
            )}

            {roles.includes("ADMIN") && (
              <option value="ADMIN">
                Admin View
              </option>
            )}
          </select>
        )}

      </div>

      {/* RIGHT SIDE — ACTIONS */}
      <div className="flex gap-3 items-center">

        <button
          className="px-4 py-2 rounded-lg border text-sm"
          onClick={openCreateTask}
        >
          Add Task
        </button>

        <button
          className="px-4 py-2 rounded-lg border text-sm"
          onClick={toggleDrawer}
        >
          Drawer
        </button>

      </div>
    </div>
  )
}
