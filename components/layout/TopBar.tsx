"use client"

interface Props {
  role: string
  setRole: (r: any) => void
  openFirstTask: () => void
  closeDrawer: () => void
}

export default function Topbar({
  role,
  setRole,
  openFirstTask,
  closeDrawer,
}: Props) {
  const roleLabel =
    role === "task-taker"
      ? "Tasks Received"
      : role === "task-giver"
      ? "Tasks Given"
      : "Admin View"

  return (
    <div className="bg-white rounded-2xl border p-4 flex justify-between items-center">
      <h2 className="font-semibold">{roleLabel}</h2>

      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded-lg border"
          onClick={() => {
            openFirstTask()
          }}
        >
          Drawer
        </button>

        <select
          className="border rounded-lg px-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="task-taker">Task Received</option>
          <option value="task-giver">Tasks Given</option>
          <option value="admin">Admin View</option>
        </select>
      </div>
    </div>
  )
}
