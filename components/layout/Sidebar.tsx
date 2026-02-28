"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  SquareKanban,
  Network,
  Package,
  Star,
  Hash,
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  MoreHorizontal,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import clsx from "clsx"
import { ReactNode, useState } from "react"
import RoleDropdown from "./RoleDropdown"

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSpaces, setExpandedSpaces] = useState<string[]>(["ops"])
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["ops-execution"])
  const pathname = usePathname()
  const { activeRole, setActiveRole, roles, logout } = useAuth()

  const topItems = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={14} /> },
    { href: "/tasks", label: "Tasks", icon: <SquareKanban size={14} /> },
    { href: "/workflows", label: "Workflows", icon: <Network size={14} /> },
    { href: "/modules", label: "Modules", icon: <Package size={14} /> },
    { href: "/onboarding", label: "Templates", icon: <Star size={14} /> },
  ]

  const lists = [
    { id: "list-dashboard", href: "/dashboard", label: "Workspace Overview", count: 7, color: "bg-blue-500" },
    { id: "list-tasks", href: "/tasks", label: "Task Engine", count: 28, color: "bg-emerald-500" },
    { id: "list-workflows", href: "/workflows", label: "Workflow Builder", count: 4, color: "bg-amber-500" },
    { id: "list-modules", href: "/modules", label: "Module Marketplace", count: 6, color: "bg-violet-500" },
  ]

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces((prev) =>
      prev.includes(spaceId) ? prev.filter((id) => id !== spaceId) : [...prev, spaceId]
    )
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    )
  }

  return (
    <aside
      className={clsx(
        "surface-card sticky top-2 hidden h-[calc(100vh-1rem)] flex-col px-2 py-2 transition-all duration-300 lg:flex",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <div
        className={clsx(
          "mb-3 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
              WO
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-900">
              WorkOS
              </div>
              <div className="text-[10px] text-slate-500">
                Workspace
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md border border-neutral-200 bg-white p-1.5 text-slate-600"
        >
          {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>
      </div>

      {!collapsed && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
          <Search size={12} className="text-neutral-400" />
          <input
            className="w-full bg-transparent text-[11px] text-slate-700 outline-none"
            placeholder="Search"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {topItems.map((item) => (
          <MenuItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </div>

      {!collapsed && (
        <>
          <div className="mt-3 border-t border-neutral-200 pt-2">
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Favorites</span>
              <button className="rounded p-0.5 hover:bg-neutral-100">
                <Plus size={10} />
              </button>
            </div>
            <Link
              href="/tasks"
              className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] text-slate-700 hover:bg-neutral-100"
            >
              <Star size={11} className="text-amber-500 fill-amber-500" />
              Task Engine
            </Link>
          </div>

          <div className="mt-2 border-t border-neutral-200 pt-2">
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Spaces</span>
              <button className="rounded p-0.5 hover:bg-neutral-100">
                <Plus size={10} />
              </button>
            </div>

            <button
              onClick={() => toggleSpace("ops")}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
            >
              {expandedSpaces.includes("ops") ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <Hash size={11} className="text-indigo-500" />
              <span className="flex-1">Operations</span>
            </button>

            {expandedSpaces.includes("ops") && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                <button
                  onClick={() => toggleFolder("ops-execution")}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                >
                  {expandedFolders.includes("ops-execution") ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <Folder size={11} className="text-blue-500" />
                  <span className="flex-1">Execution</span>
                </button>
                {expandedFolders.includes("ops-execution") && (
                  <div className="ml-3 space-y-0.5">
                    {lists.map((list) => (
                      <Link
                        key={list.id}
                        href={list.href}
                        className={clsx(
                          "flex items-center gap-2 rounded-md px-2 py-1 text-[11px]",
                          pathname.startsWith(list.href)
                            ? "bg-neutral-100 text-slate-900"
                            : "text-slate-700 hover:bg-neutral-100"
                        )}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${list.color}`} />
                        <span className="flex-1 truncate">{list.label}</span>
                        <span className="text-[10px] text-slate-400">{list.count}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-3 border-t border-neutral-200 pt-2">
        {activeRole && (
          <RoleDropdown
            roles={roles}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            collapsed={collapsed}
          />
        )}
      </div>

      <div className="mt-auto border-t border-neutral-200 pt-2">
        <div
          className={clsx(
            "mb-2 flex items-center",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-[10px] font-semibold text-white">
            WO
          </div>
          {!collapsed && (
            <div>
              <div className="text-[11px] font-semibold text-slate-900">Workspace</div>
              <div className="text-[10px] text-slate-500">Enterprise plan</div>
            </div>
          )}
          {!collapsed && (
            <button className="ml-auto rounded p-1 text-slate-400 hover:bg-neutral-100">
              <MoreHorizontal size={12} />
            </button>
          )}
        </div>

        <button
          onClick={logout}
          className={clsx(
            "w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 hover:bg-neutral-50",
            collapsed && "px-0"
          )}
        >
          <span className={clsx("flex items-center", collapsed ? "justify-center" : "gap-2")}>
            <LogOut size={12} />
            {!collapsed && "Sign out"}
          </span>
        </button>
      </div>
    </aside>
  )
}

type MenuItemProps = {
  href: string
  icon: ReactNode
  label: string
  collapsed: boolean
  active?: boolean
}

function MenuItem({
  href,
  icon,
  label,
  collapsed,
  active,
}: MenuItemProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center rounded-md px-2 py-1.5 text-[11px]",
        collapsed ? "justify-center" : "gap-2",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-neutral-100 hover:text-slate-900"
      )}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </Link>
  )
}
