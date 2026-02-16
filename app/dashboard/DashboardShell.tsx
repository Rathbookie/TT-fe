"use client"

import { useAuth } from "@/context/AuthContext"
import ReceiverView from "./ReceiverView"
import CreatorView from "./CreatorView"
import AdminView from "./AdminView"

export default function DashboardShell() {
  const { activeRole } = useAuth()

  if (!activeRole) return null

  if (activeRole === "TASK_RECEIVER") return <ReceiverView />
  if (activeRole === "TASK_CREATOR") return <CreatorView />
  if (activeRole === "ADMIN") return <AdminView />

  return null
}
