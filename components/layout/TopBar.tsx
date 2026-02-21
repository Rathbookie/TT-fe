"use client"

import { Plus } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { canCreateTask } from "@/lib/roleCapabilities"

type Props = {
  onCreateTask?: () => void
  onToggleDrawer?: () => void
}

export default function TopBar({ onCreateTask, onToggleDrawer }: Props) {
  const { activeRole } = useAuth()

  return (
    <div className="bg-white border border-neutral-200 rounded-lg px-3 py-3">
      <div className="flex items-center justify-between">

        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">
            Dashboard
          </div>

          <input
            type="text"
            placeholder="Search tasks..."
            className="w-64 px-4 py-2 text-sm rounded-lg bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300 transition"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {canCreateTask(activeRole) && (
            <button
              onClick={onCreateTask}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:opacity-90 transition"
            >
              <Plus size={16} />
              Create Task
            </button>
          )}

          <button
            onClick={onToggleDrawer}
            className="px-4 py-2 text-sm font-medium bg-neutral-200 rounded-lg hover:bg-neutral-300 transition"
          >
            DRAWER
          </button>
        </div>
      </div>
    </div>
  )
}
