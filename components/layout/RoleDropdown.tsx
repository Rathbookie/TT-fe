"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import type { Role } from "@/lib/statusConfig"

type Props = {
  roles: Role[]
  activeRole: Role
  setActiveRole: (role: Role) => void
  collapsed: boolean
}

export default function RoleDropdown({
  roles,
  activeRole,
  setActiveRole,
  collapsed,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function formatRole(role: string) {
    switch (role) {
      case "TASK_RECEIVER":
        return "Receiver Dashboard"
      case "TASK_CREATOR":
        return "Creator DashBoard"
      case "ADMIN":
        return "Admin Admin Dashboard"
      default:
        return role
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center
          ${collapsed ? "justify-center" : "justify-between"}
          px-4 py-2 rounded-lg bg-neutral-200 hover:bg-neutral-300 transition
        `}
      >
        {!collapsed && (
          <span className="font-medium">
            {formatRole(activeRole)}
          </span>
        )}

        {collapsed && (
          <span className="text-sm font-semibold">
            {activeRole[0]}
          </span>
        )}

        {!collapsed && <ChevronDown size={16} />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute mt-2 w-full bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => {
                setActiveRole(role)
                setOpen(false)
              }}
              className={`
                w-full text-left px-4 py-2 text-sm hover:bg-neutral-100
                ${activeRole === role ? "font-semibold" : ""}
              `}
            >
              {formatRole(role)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
