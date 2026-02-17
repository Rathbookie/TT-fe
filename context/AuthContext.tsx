"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { setTokens, getAccessToken, clearTokens } from "@/lib/api"
import { Role } from "@/lib/statusConfig"

type AuthContextType = {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  user: any
  roles: Role[]
  activeRole: Role | null
  setActiveRole: (role: Role) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [activeRole, setActiveRoleState] = useState<Role | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
  setHydrated(true)
  }, [])

  // Fetch user + roles
  const fetchMe = async () => {
    const token = getAccessToken()
    if (!token) {
      setIsAuthenticated(false)
      return
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/me/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!res.ok) {
      setIsAuthenticated(false)
      return
    }

    const data = await res.json()

    setUser(data)
    setRoles(data.roles as Role[])
    setIsAuthenticated(true)

    let savedRole = localStorage.getItem("activeRole") as Role | null

    const apiRoles = data.roles as Role[]
    setRoles(apiRoles)

    if (!savedRole || !apiRoles.includes(savedRole)) {
      savedRole = apiRoles[0] ?? null
    }

    if (savedRole) {
      setActiveRoleState(savedRole)
      localStorage.setItem("activeRole", savedRole)
    }
  }

  useEffect(() => {
    fetchMe()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/token/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim(), password }),
      }
    )

    if (!res.ok) throw new Error("Invalid credentials")

    const data = await res.json()
    console.log("ROLES FROM API:", data.roles)

    setTokens(data.access, data.refresh)
    await fetchMe()
  }

  const logout = () => {
    clearTokens()
    localStorage.removeItem("activeRole")
    setIsAuthenticated(false)
    setUser(null)
    setRoles([])
    setActiveRoleState(null)
  }

  const setActiveRole = (role: Role) => {
    setActiveRoleState(role)
    localStorage.setItem("activeRole", role)
  }

  if (!hydrated) return null

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        isAuthenticated,
        user,
        roles,
        activeRole,
        setActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("AuthContext not found")
  return ctx
}
