"use client"

import { useState } from "react"
import { MoreVertical, Home, CheckSquare, Settings } from "lucide-react"

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`
        ${collapsed ? "w-24" : "w-72"}
        transition-all duration-300
        bg-neutral-100
        rounded-lg
        p-6
        flex flex-col
      `}
    >
      {/* Top */}
      <div
        className={`flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        } mb-8`}
      >
        {!collapsed && (
          <div className="h-10 w-32 bg-black rounded-lg" />
        )}
        <button onClick={() => setCollapsed(!collapsed)}>
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-4">
        <MenuItem
          icon={<Home size={20} />}
          label="Dashboard"
          collapsed={collapsed}
          active
        />
        <MenuItem
          icon={<CheckSquare size={20} />}
          label="Tasks"
          collapsed={collapsed}
        />
        <MenuItem
          icon={<Settings size={20} />}
          label="Settings"
          collapsed={collapsed}
        />
      </div>

      {/* Profile */}
      <div className="mt-auto pt-8 border-t border-neutral-300">
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="h-12 w-12 bg-neutral-300 rounded-full" />
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold">User</div>
              <div className="text-xs text-neutral-500">Profile</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function MenuItem({
  icon,
  label,
  collapsed,
  active,
}: any) {
  return (
    <div
      className={`
        flex items-center
        ${collapsed ? "justify-center" : "gap-4"}
        px-4 py-3 rounded-lg cursor-pointer
        ${active ? "bg-neutral-200" : "hover:bg-neutral-200"}
      `}
    >
      {icon}
      {!collapsed && (
        <span className="font-medium">{label}</span>
      )}
    </div>
  )
}
