"use client"

import { ReactNode } from "react"
import { Bell, Search, ChevronRight, Settings } from "lucide-react"
import Sidebar from "@/components/layout/Sidebar"
import { useAuth } from "@/context/AuthContext"

type Props = {
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}

export default function WorkspaceShell({
  title,
  subtitle,
  actions,
  children,
}: Props) {
  const { activeRole, user } = useAuth()

  return (
    <div className="min-h-screen bg-white p-1">
      <div className="mx-auto flex w-full max-w-[1800px] gap-2">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-2">
          <header className="surface-card px-3 py-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Workspace</span>
                  <ChevronRight size={11} />
                  <span>Operations</span>
                  <ChevronRight size={11} />
                  <span className="truncate text-slate-700">{title}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">{subtitle}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="hidden items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 lg:flex">
                  <Search size={12} className="text-slate-400" />
                  <input
                    className="w-44 bg-transparent text-[11px] text-slate-700 outline-none"
                    placeholder="Search"
                  />
                </div>
                <button className="rounded-md border border-neutral-200 bg-white p-1.5 text-slate-500 hover:bg-neutral-50">
                  <Bell size={12} />
                </button>
                <button className="rounded-md border border-neutral-200 bg-white p-1.5 text-slate-500 hover:bg-neutral-50">
                  <Settings size={12} />
                </button>
                <div className="hidden rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-600 lg:block">
                  {activeRole || "No role"}
                </div>
                <div className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-slate-700">
                  {user?.first_name || "User"}
                </div>
                {actions}
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  )
}
