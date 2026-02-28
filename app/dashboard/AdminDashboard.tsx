"use client"

import { useEffect, useState } from "react"
import { apiFetchJson } from "@/lib/api"
import { Users, CheckSquare, AlertCircle, TrendingUp } from "lucide-react"

/* ---------- TYPES ---------- */

interface AdminDashboardResponse {
  kpis: {
    total_users: number
    active_tasks: number
    blocked_tasks: number
    completion_rate: number
  }
  status_overview: {
    name: string
    count: number
  }[]
  recent_activity: {
    id: number
    message: string
  }[]
  users: {
    id: number
    email: string
    role: string
    is_active: boolean
  }[]
}

type KpiData = AdminDashboardResponse["kpis"]
type User = AdminDashboardResponse["users"][number]
type StatusCount = AdminDashboardResponse["status_overview"][number]
type Activity = AdminDashboardResponse["recent_activity"][number]

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [statusData, setStatusData] = useState<StatusCount[]>([])
  const [activity, setActivity] = useState<Activity[]>([])

  async function fetchData() {
    try {
      const data = await apiFetchJson<AdminDashboardResponse>(
        "/api/admin/dashboard/"
      )
      setKpis(data.kpis)
      setUsers(data.users)
      setStatusData(data.status_overview)
      setActivity(data.recent_activity)
    } catch (err) {
      console.error("Admin dashboard fetch error", err)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchData()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  if (!kpis) return <div className="p-6">Loading...</div>

  return (
    <div className="flex-1">

      {/* MAIN OUTER CONTAINER (Same as TaskTable style) */}
      <div className="bg-white rounded-lg shadow-sm border p-8 space-y-8">

        {/* KPI SECTION */}
        <div className="flex w-full gap-6">

          {/* TOTAL USERS */}
          <div className="flex-1 bg-neutral-100 rounded-2xl px-8 py-6">
            <div className="flex justify-between items-start">
              <p className="text-base text-neutral-600">
                Total Users
              </p>
              <Users className="w-5 h-5 text-neutral-500" />
            </div>
            <h2 className="text-3xl font-semibold mt-4 text-neutral-900">
              {kpis.total_users}
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Registered users
            </p>
          </div>

          {/* ACTIVE TASKS */}
          <div className="flex-1 bg-neutral-100 rounded-2xl px-8 py-6">
            <div className="flex justify-between items-start">
              <p className="text-base text-neutral-600">
                Active Tasks
              </p>
              <CheckSquare className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-3xl font-semibold mt-4 text-neutral-900">
              {kpis.active_tasks}
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Currently in progress
            </p>
          </div>

          {/* BLOCKED TASKS */}
          <div className="flex-1 bg-neutral-100 rounded-2xl px-8 py-6">
            <div className="flex justify-between items-start">
              <p className="text-base text-neutral-600">
                Blocked Tasks
              </p>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-3xl font-semibold mt-4 text-neutral-900">
              {kpis.blocked_tasks}
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Require attention
            </p>
          </div>

          {/* COMPLETION RATE */}
          <div className="flex-1 bg-neutral-100 rounded-2xl px-8 py-6">
            <div className="flex justify-between items-start">
              <p className="text-base text-neutral-600">
                Completion Rate
              </p>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-semibold mt-4 text-neutral-900">
              {kpis.completion_rate}%
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Overall performance
            </p>
          </div>

        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-3 gap-8 items-start">

          {/* USER MANAGEMENT */}
          <div className="col-span-2 bg-gray-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">
                User Management
              </h2>
              <button className="bg-black text-white px-5 py-2 rounded-lg">
                Add User
              </button>
            </div>

            <div className="space-y-3">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex justify-between items-center bg-white rounded-lg px-5 py-3 border"
                >
                  <div>
                    <p className="font-medium">
                      {user.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.role}
                    </p>
                  </div>

                  <div
                    className={`w-3 h-3 rounded-full ${
                      user.is_active
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="col-span-1 space-y-6">

            {/* STATUS OVERVIEW */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                Task Status Overview
              </h2>

              <div className="space-y-3">
                {statusData.map(status => (
                  <div
                    key={status.name}
                    className="flex justify-between items-center bg-white rounded-lg px-4 py-2 border"
                  >
                    <span>{status.name}</span>
                    <span className="font-medium">
                      {status.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                Recent Activity
              </h2>

              <div className="space-y-3">
                {activity.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg px-4 py-2 border text-sm"
                  >
                    {item.message}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
