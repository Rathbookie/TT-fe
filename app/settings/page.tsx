"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Check,
  Palette,
  Shield,
  User,
} from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetchJson } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

type SettingsTab = "profile" | "notifications" | "appearance" | "security"

const TABS: Array<{ id: SettingsTab; label: string; icon: typeof User }> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
]

function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      className={`relative h-5 w-9 rounded-full transition ${
        value ? "bg-neutral-900" : "bg-neutral-200"
      }`}
    >
      <span
        className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow transition ${
          value ? "left-[19px]" : "left-[3px]"
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, refreshMe } = useAuth()

  const [tab, setTab] = useState<SettingsTab>("profile")
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [phone, setPhone] = useState("")
  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [notifAssigned, setNotifAssigned] = useState(true)
  const [notifStatus, setNotifStatus] = useState(true)
  const [notifDueReminder, setNotifDueReminder] = useState(true)
  const [notifProofs, setNotifProofs] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifMessage, setNotifMessage] = useState<string | null>(null)
  const [notifError, setNotifError] = useState<string | null>(null)
  const [compactDensity, setCompactDensity] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.tenant_slug) return
    if (pathname === "/settings") {
      router.replace(`/${user.tenant_slug}/settings`)
    }
  }, [pathname, router, user?.tenant_slug])

  useEffect(() => {
    setFirstName(user?.first_name || "")
    setLastName(user?.last_name || "")
    setEmail(user?.email || "")
    setDisplayName(user?.display_name || "")
    setJobTitle(user?.job_title || "")
    setPhone(user?.phone || "")
    setTimezone(user?.timezone || "Asia/Kolkata")
    setBio(user?.bio || "")
    setNotifAssigned(user?.notify_task_assigned ?? true)
    setNotifStatus(user?.notify_task_status_changed ?? true)
    setNotifDueReminder(user?.notify_due_reminder ?? true)
    setNotifProofs(user?.notify_proof_submitted ?? true)
  }, [
    user?.first_name,
    user?.last_name,
    user?.email,
    user?.display_name,
    user?.job_title,
    user?.phone,
    user?.timezone,
    user?.bio,
    user?.notify_task_assigned,
    user?.notify_task_status_changed,
    user?.notify_due_reminder,
    user?.notify_proof_submitted,
  ])

  const loadProfile = async () => {
    setLoadingProfile(true)
    try {
      const profile = await apiFetchJson<{
        first_name?: string
        last_name?: string
        email?: string
        display_name?: string
        job_title?: string
        phone?: string
        timezone?: string
        bio?: string
        notify_task_assigned?: boolean
        notify_task_status_changed?: boolean
        notify_due_reminder?: boolean
        notify_proof_submitted?: boolean
      }>("/api/me/")
      setFirstName(profile.first_name || "")
      setLastName(profile.last_name || "")
      setEmail(profile.email || "")
      setDisplayName(profile.display_name || "")
      setJobTitle(profile.job_title || "")
      setPhone(profile.phone || "")
      setTimezone(profile.timezone || "Asia/Kolkata")
      setBio(profile.bio || "")
      setNotifAssigned(profile.notify_task_assigned ?? true)
      setNotifStatus(profile.notify_task_status_changed ?? true)
      setNotifDueReminder(profile.notify_due_reminder ?? true)
      setNotifProofs(profile.notify_proof_submitted ?? true)
    } catch (err) {
      console.error("Failed to load profile", err)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const initials = useMemo(() => {
    const full = `${firstName} ${lastName}`.trim()
    if (!full) return "U"
    const parts = full.split(/\s+/).filter(Boolean)
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase()
  }, [firstName, lastName])

  const saveProfile = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await apiFetchJson("/api/me/", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          display_name: displayName.trim(),
          job_title: jobTitle.trim(),
          phone: phone.trim(),
          timezone: timezone.trim(),
          bio: bio.trim(),
        }),
      })
      await refreshMe()
      await loadProfile()
      setMessage("Profile updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    setPasswordSaving(true)
    setPasswordMessage(null)
    setPasswordError(null)
    try {
      await apiFetchJson("/api/me/password/", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordMessage("Password updated.")
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.")
    } finally {
      setPasswordSaving(false)
    }
  }

  const saveNotificationSettings = async () => {
    setNotifSaving(true)
    setNotifMessage(null)
    setNotifError(null)
    try {
      await apiFetchJson("/api/me/", {
        method: "PATCH",
        body: JSON.stringify({
          notify_task_assigned: notifAssigned,
          notify_task_status_changed: notifStatus,
          notify_due_reminder: notifDueReminder,
          notify_proof_submitted: notifProofs,
        }),
      })
      await refreshMe()
      setNotifMessage("Notification preferences updated.")
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : "Failed to update notification settings.")
    } finally {
      setNotifSaving(false)
    }
  }

  return (
    <WorkspaceShell
      title="Settings"
      subtitle="Manage account preferences, notifications, and security."
    >
      <div className="grid grid-cols-12 gap-4">
        <aside className="surface-card col-span-12 p-3 md:col-span-4 lg:col-span-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Personal
          </p>
          <div className="space-y-1">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs ${
                    tab === item.id
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon size={13} />
                    {item.label}
                  </span>
                  {tab === item.id ? <Check size={12} /> : null}
                </button>
              )
            })}
          </div>
        </aside>

        <section className="surface-card col-span-12 p-4 md:col-span-8 lg:col-span-9">
          {loadingProfile ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-xs text-neutral-500">
              Loading profile...
            </div>
          ) : null}

          {!loadingProfile && tab === "profile" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Profile</h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  How your name appears across tasks and comments.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-800">
                    {`${firstName} ${lastName}`.trim() || "Unnamed User"}
                  </p>
                  <p className="text-[11px] text-neutral-500">{user?.email || "—"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="text-neutral-600">First Name</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-neutral-600">Last Name</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                    />
                  </label>
                </div>

                <label className="mt-3 block space-y-1 text-xs">
                  <span className="text-neutral-600">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                </label>

                <label className="mt-3 block space-y-1 text-xs">
                  <span className="text-neutral-600">Display Name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                </label>

                <label className="mt-3 block space-y-1 text-xs">
                  <span className="text-neutral-600">Role / Title</span>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                </label>

                <label className="mt-3 block space-y-1 text-xs">
                  <span className="text-neutral-600">Phone</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                </label>

                <label className="mt-3 block space-y-1 text-xs">
                  <span className="text-neutral-600">Timezone</span>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </label>

                <label className="mt-3 block space-y-1 text-xs">
                  <span className="text-neutral-600">Bio</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2">
                {message ? <span className="text-xs text-emerald-700">{message}</span> : null}
                {error ? <span className="text-xs text-red-600">{error}</span> : null}
                <button
                  onClick={() => void saveProfile()}
                  disabled={saving}
                  className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          ) : null}

          {!loadingProfile && tab === "notifications" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Notifications</h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Choose which updates should notify you.
                </p>
              </div>
              <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span>Task assigned to me</span>
                  <Toggle value={notifAssigned} onChange={() => setNotifAssigned((v) => !v)} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Task status changed</span>
                  <Toggle value={notifStatus} onChange={() => setNotifStatus((v) => !v)} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Due date reminder (24h)</span>
                  <Toggle value={notifDueReminder} onChange={() => setNotifDueReminder((v) => !v)} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Proof submitted</span>
                  <Toggle value={notifProofs} onChange={() => setNotifProofs((v) => !v)} />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  {notifMessage ? <span className="text-xs text-emerald-700">{notifMessage}</span> : null}
                  {notifError ? <span className="text-xs text-red-600">{notifError}</span> : null}
                  <button
                    onClick={() => void saveNotificationSettings()}
                    disabled={notifSaving}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {notifSaving ? "Saving..." : "Save preferences"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!loadingProfile && tab === "appearance" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Appearance</h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Tune visual density and interaction behavior.
                </p>
              </div>
              <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span>Compact density</span>
                  <Toggle value={compactDensity} onChange={() => setCompactDensity((v) => !v)} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Reduce motion</span>
                  <Toggle value={reduceMotion} onChange={() => setReduceMotion((v) => !v)} />
                </div>
              </div>
            </div>
          ) : null}

          {!loadingProfile && tab === "security" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Security</h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Manage account-level security controls.
                </p>
              </div>
              <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span>Two-factor authentication</span>
                  <Toggle value={mfaEnabled} onChange={() => setMfaEnabled((v) => !v)} />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-400"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  {passwordMessage ? (
                    <span className="text-xs text-emerald-700">{passwordMessage}</span>
                  ) : null}
                  {passwordError ? (
                    <span className="text-xs text-red-600">{passwordError}</span>
                  ) : null}
                  <button
                    onClick={() => void changePassword()}
                    disabled={passwordSaving}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {passwordSaving ? "Updating..." : "Change password"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </WorkspaceShell>
  )
}
