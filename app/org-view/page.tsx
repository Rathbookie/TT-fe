"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Trash2, UserPlus, Users } from "lucide-react"

import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { useAuth } from "@/context/AuthContext"
import { apiFetchJson } from "@/lib/api"

type OrgUser = {
  id: number
  full_name: string
  email: string
}

type OrgUsersResponse = OrgUser[] | { results?: OrgUser[] }

const extractResults = (payload: OrgUsersResponse): OrgUser[] =>
  Array.isArray(payload) ? payload : payload.results || []

export default function OrgViewPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, activeRole, roles } = useAuth()
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"ADMIN" | "TASK_CREATOR" | "TASK_RECEIVER">("TASK_RECEIVER")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createMessage, setCreateMessage] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)

  const canManageUsers = useMemo(
    () => activeRole === "ADMIN" || roles.includes("ADMIN"),
    [activeRole, roles]
  )

  const loadUsers = async (value: string) => {
    setLoading(true)
    setError(null)
    try {
      const query = value.trim()
      const endpoint = query
        ? `/api/users/?search=${encodeURIComponent(query)}`
        : "/api/users/"
      const payload = await apiFetchJson<OrgUsersResponse>(endpoint)
      setUsers(extractResults(payload))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.tenant_slug) return
    if (pathname === "/org-view") {
      router.replace(`/${user.tenant_slug}/org-view`)
    }
  }, [pathname, router, user?.tenant_slug])

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      await loadUsers(search)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  const createUser = async () => {
    setCreating(true)
    setCreateError(null)
    setCreateMessage(null)
    try {
      await apiFetchJson("/api/users/", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      })
      setFirstName("")
      setLastName("")
      setEmail("")
      setPassword("")
      setRole("TASK_RECEIVER")
      setCreateMessage("User created.")
      setShowCreate(false)
      await loadUsers(search)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user.")
    } finally {
      setCreating(false)
    }
  }

  const removeUser = async (userId: number) => {
    if (!window.confirm("Remove this user from the organisation?")) return
    setDeletingUserId(userId)
    setError(null)
    try {
      await apiFetchJson(`/api/users/${userId}/`, { method: "DELETE" })
      await loadUsers(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove user.")
    } finally {
      setDeletingUserId(null)
    }
  }

  const subtitle = useMemo(
    () =>
      search.trim()
        ? `Showing users matching "${search.trim()}".`
        : "View everyone in your organisation and their email addresses.",
    [search]
  )

  return (
    <WorkspaceShell title="Org View" subtitle={subtitle}>
      <section className="surface-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users size={16} />
            Organisation Members
          </div>
          <div className="flex w-full max-w-sm items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
            <Search size={13} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full bg-transparent text-xs text-slate-700 outline-none"
            />
          </div>
        </div>
        {canManageUsers ? (
          <div className="mb-3 rounded-lg border border-neutral-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800">Admin Actions</p>
              <button
                onClick={() => setShowCreate((value) => !value)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs text-slate-700 hover:bg-neutral-50"
              >
                <UserPlus size={12} />
                {showCreate ? "Hide Form" : "Create User"}
              </button>
            </div>
            {showCreate ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
                />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Temp password"
                  type="password"
                  className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "TASK_CREATOR" | "TASK_RECEIVER")}
                  className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
                >
                  <option value="TASK_RECEIVER">Task Receiver</option>
                  <option value="TASK_CREATOR">Task Creator</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <div className="md:col-span-5 flex items-center justify-end gap-2">
                  {createMessage ? <p className="text-xs text-emerald-700">{createMessage}</p> : null}
                  {createError ? <p className="text-xs text-red-600">{createError}</p> : null}
                  <button
                    onClick={() => void createUser()}
                    disabled={creating}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-slate-500">
            Loading users...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="grid grid-cols-12 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <div className={canManageUsers ? "col-span-5" : "col-span-6"}>Name</div>
              <div className={canManageUsers ? "col-span-5" : "col-span-6"}>Email</div>
              {canManageUsers ? <div className="col-span-2 text-right">Action</div> : null}
            </div>
            {users.length ? (
              <div className="divide-y divide-neutral-200">
                {users.map((member) => (
                  <div key={member.id} className="grid grid-cols-12 px-3 py-2 text-xs text-slate-700">
                    <div className={canManageUsers ? "col-span-5" : "col-span-6"}>
                      {member.full_name || "Unnamed User"}
                    </div>
                    <div className={canManageUsers ? "col-span-5" : "col-span-6"}>
                      {member.email || "—"}
                    </div>
                    {canManageUsers ? (
                      <div className="col-span-2 text-right">
                        {member.id !== user?.id ? (
                          <button
                            onClick={() => void removeUser(member.id)}
                            disabled={deletingUserId === member.id}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Remove user"
                          >
                            <Trash2 size={11} />
                            Remove
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">You</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-xs text-slate-500">No users found.</div>
            )}
          </div>
        ) : null}
      </section>
    </WorkspaceShell>
  )
}
