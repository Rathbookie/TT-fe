"use client"

interface Props {
  activeRole?: string | null
  roles?: string[]
  setActiveRole: (role: string) => void
  openFirstTask: () => void
  closeDrawer: () => void
}

export default function TopBar({
  activeRole,
  roles = [],
  setActiveRole,
  openFirstTask,
  closeDrawer,
}: Props) {
  const roleLabel =
    activeRole === "TASK_RECEIVER"
      ? "Tasks Received"
      : activeRole === "TASK_CREATOR"
      ? "Tasks Given"
      : activeRole === "ADMIN"
      ? "Admin View"
      : ""

  return (
    <div className="bg-white rounded-2xl border p-4 flex justify-between items-center">
      <h2 className="font-semibold">{roleLabel}</h2>

      <div className="flex gap-2 items-center">
        <button
          className="px-3 py-1 rounded-lg border"
          onClick={openFirstTask}
        >
          Drawer
        </button>

        {/* Role Switcher */}
        {roles.length > 1 && (
          <select
            className="border rounded-lg px-2"
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
    </div>
  )
}
