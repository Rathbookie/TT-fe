"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { setTokens, getAccessToken, clearTokens } from "@/lib/api"
import { Role } from "@/lib/statusConfig"

type AuthUser = {
  id: number
  email: string
  first_name: string
  last_name: string
  roles: Role[]
}

type AuthContextType = {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  user: AuthUser | null
  roles: Role[]
  activeRole: Role | null
  setActiveRole: (role: Role) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const normalizeRole = (role: string): Role | null => {
  const normalized = role.trim().toUpperCase().replaceAll(" ", "_")
  if (
    normalized === "ADMIN" ||
    normalized === "TASK_CREATOR" ||
    normalized === "TASK_RECEIVER"
  ) {
    return normalized
  }
  return null
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [activeRole, setActiveRoleState] = useState<Role | null>(null)

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

    const data = (await res.json()) as AuthUser

    const normalizedRoles = data.roles
      .map((role) => normalizeRole(String(role)))
      .filter((role): role is Role => role !== null)

    setUser({
      ...data,
      roles: normalizedRoles,
    })
    setRoles(normalizedRoles)
    setIsAuthenticated(true)

    let savedRoleRaw = localStorage.getItem("activeRole")
    let savedRole = savedRoleRaw ? normalizeRole(savedRoleRaw) : null

    const apiRoles = normalizedRoles
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
    const timeout = window.setTimeout(() => {
      void fetchMe()
    }, 0)
    return () => window.clearTimeout(timeout)
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
    const normalized = normalizeRole(role) || role
    setActiveRoleState(normalized)
    localStorage.setItem("activeRole", normalized)
  }

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
