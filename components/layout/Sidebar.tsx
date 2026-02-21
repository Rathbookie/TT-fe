"use client"

import { MoreVertical, Home, CheckSquare, Settings } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import clsx from "clsx"
import { useState,} from "react"
import RoleDropdown from "./RoleDropdown"

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { activeRole, setActiveRole, roles } = useAuth()

  return (
    <aside
      className={clsx(
        "transition-all duration-300 bg-neutral-100 rounded-lg p-6 flex flex-col",
        collapsed ? "w-24" : "w-72"
      )}
    >
      {/* Top */}
      <div
        className={clsx(
          "flex items-center mb-8",
          collapsed ? "justify-center" : "justify-between"
        )}
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

      <div className="mt-8 pt-6 border-t border-neutral-300">
        {activeRole && (
          <RoleDropdown
            roles={roles}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            collapsed={collapsed}
          />
        )}
      </div>


      {/* Profile */}
      <div className="mt-auto pt-8 border-t border-neutral-300">
        <div
          className={clsx(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3"
          )}
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
      className={clsx(
        "flex items-center px-4 py-3 rounded-lg cursor-pointer",
        collapsed ? "justify-center" : "gap-4",
        active ? "bg-neutral-200" : "hover:bg-neutral-200"
      )}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </div>
  )
}

function formatRole(role: string) {
  switch (role) {
    case "TASK_RECEIVER":
      return "Receiver"
    case "TASK_CREATOR":
      return "Creator"
    case "ADMIN":
      return "Admin"
    default:
      return role
  }
}
