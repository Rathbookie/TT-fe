"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import TaskTable from "@/components/TaskTable"

export default function Dashboard() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <TopBar />

        <div className="flex-1 p-8">
          <TaskTable />
        </div>
      </div>
    </div>
  )
}
