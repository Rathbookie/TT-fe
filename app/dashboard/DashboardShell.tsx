"use client"

import { useAuth } from "@/context/AuthContext"
import ReceiverDashboard from "./ReceiverDashboard"
import CreatorDashboard from "./CreatorDashboard"
import AdminDashboard from "./AdminDashboard"

export default function DashboardShell() {
  const { activeRole } = useAuth()

  if (!activeRole) return null

  if (activeRole === "TASK_RECEIVER") return <ReceiverDashboard />
  if (activeRole === "TASK_CREATOR") return <CreatorDashboard />
  if (activeRole === "ADMIN") return <AdminDashboard />

  return null
}
