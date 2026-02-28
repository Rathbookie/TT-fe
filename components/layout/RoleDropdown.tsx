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
        return "Task Receiver"
      case "TASK_CREATOR":
        return "Task Creator"
      case "ADMIN":
        return "Admin"
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
          px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 transition text-[11px]
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

        {!collapsed && <ChevronDown size={12} />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg z-50">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => {
                setActiveRole(role)
                setOpen(false)
              }}
              className={`
                w-full text-left px-2 py-1.5 text-[11px] hover:bg-neutral-100
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
