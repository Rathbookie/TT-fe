"use client"

import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { Bell, Search, ChevronRight, Settings, X } from "lucide-react"
import Sidebar from "@/components/layout/Sidebar"
import { useAuth } from "@/context/AuthContext"
import { apiFetchJson } from "@/lib/api"

type Props = {
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}

type NotificationItem = {
  id: number
  kind: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  task_ref?: string | null
}

type InAppAlert = {
  id: string
  title: string
  body: string
}

export default function WorkspaceShell({
  title,
  subtitle,
  actions,
  children,
}: Props) {
  const { activeRole, user } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission>("default")
  const [notificationDebug, setNotificationDebug] = useState<string | null>(null)
  const [inAppAlerts, setInAppAlerts] = useState<InAppAlert[]>([])
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const seenNotificationIdsRef = useRef<Set<number>>(new Set())
  const hasBootstrappedNotificationsRef = useRef(false)
  const mountedAtRef = useRef(Date.now())
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  const showBrowserNotification = async (titleText: string, bodyText: string, tagText: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return false
    if (Notification.permission !== "granted") return false
    try {
      if ("serviceWorker" in navigator) {
        const reg = swRegistrationRef.current || (await navigator.serviceWorker.ready)
        swRegistrationRef.current = reg
        await reg.showNotification(titleText, {
          body: bodyText,
          tag: tagText,
        })
        setNotificationDebug("Sent via service worker.")
        return true
      }
    } catch {
      // fall back to Notification constructor below
    }
    try {
      const n = new Notification(titleText, {
        body: bodyText,
        tag: tagText,
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
      setNotificationDebug("Sent via Notification API.")
      return true
    } catch {
      setNotificationDebug("Failed to show notification in browser.")
      return false
    }
  }

  const pushBrowserNotification = async (item: NotificationItem) => {
    await showBrowserNotification(
      item.title,
      item.body || item.task_ref || "Task update",
      `taskflow-${item.id}`
    )
  }

  const pushInAppAlert = (title: string, body: string, idPrefix = "event") => {
    const alert: InAppAlert = {
      id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body,
    }
    setInAppAlerts((prev) => [alert, ...prev].slice(0, 6))
    window.setTimeout(() => {
      setInAppAlerts((prev) => prev.filter((a) => a.id !== alert.id))
    }, 8000)
  }

  const loadNotifications = async (emitWebNotifications = true) => {
    setLoadingNotifications(true)
    try {
      const data = await apiFetchJson<{ results: NotificationItem[]; unread_count: number }>(
        "/api/notifications/?limit=20"
      )
      const incoming = data.results || []
      setNotifications(incoming)
      setUnreadCount(data.unread_count || 0)

      for (const item of incoming) {
        if (!seenNotificationIdsRef.current.has(item.id)) {
          const createdAt = new Date(item.created_at).getTime()
          const isFresh = Number.isFinite(createdAt) && createdAt >= mountedAtRef.current
          if (
            hasBootstrappedNotificationsRef.current &&
            emitWebNotifications &&
            !item.is_read &&
            isFresh
          ) {
            void pushBrowserNotification(item)
            pushInAppAlert(item.title, item.body || item.task_ref || "Task update", "notif")
          }
          seenNotificationIdsRef.current.add(item.id)
        }
      }
      if (!hasBootstrappedNotificationsRef.current) {
        hasBootstrappedNotificationsRef.current = true
      }
    } catch {
      // Ignore bell failures to avoid blocking page interactions.
    } finally {
      setLoadingNotifications(false)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotifPermission(Notification.permission)
    }
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          swRegistrationRef.current = reg
        })
        .catch(() => {
          // best-effort
        })
    }
    void loadNotifications(false)
    const interval = window.setInterval(() => {
      void loadNotifications()
    }, 10000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!notificationsRef.current) return
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const markNotificationRead = async (notificationId: number) => {
    try {
      await apiFetchJson(`/api/notifications/${notificationId}/read/`, { method: "POST" })
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // best-effort
    }
  }

  const markAllRead = async () => {
    try {
      await apiFetchJson("/api/notifications/read-all/", { method: "POST" })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // best-effort
    }
  }

  const enableBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    const permission = await Notification.requestPermission()
    setBrowserNotifPermission(permission)
    if (permission === "granted") {
      await showBrowserNotification(
        "Notifications enabled",
        "You will now receive task alerts here.",
        "taskflow-enabled"
      )
    }
  }

  const testBrowserNotification = async () => {
    setNotificationDebug(null)
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationDebug("This browser does not support notifications.")
      return
    }
    let permission: NotificationPermission = Notification.permission
    if (permission === "default") {
      permission = await Notification.requestPermission()
      setBrowserNotifPermission(permission)
    }
    if (permission !== "granted") {
      setNotificationDebug("Permission is blocked. Enable notifications in browser site settings.")
      return
    }
    const shown = await showBrowserNotification(
      "Test notification",
      "Web notifications are working.",
      "taskflow-test"
    )
    if (!shown) {
      setNotificationDebug("Browser/OS blocked display. Check system notification settings.")
      pushInAppAlert(
        "Notification blocked by system",
        "Web popup was blocked. You can still track updates here.",
        "fallback"
      )
      return
    }
    pushInAppAlert(
      "Test notification",
      "If no OS popup appeared, use this in-app notification fallback.",
      "test"
    )
  }

  const relativeTime = useMemo(() => {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  }, [])

  const getTimeLabel = (isoDate: string) => {
    const created = new Date(isoDate).getTime()
    const deltaMs = created - Date.now()
    const deltaMin = Math.round(deltaMs / 60000)
    if (Math.abs(deltaMin) < 60) return relativeTime.format(deltaMin, "minute")
    const deltaHour = Math.round(deltaMin / 60)
    if (Math.abs(deltaHour) < 24) return relativeTime.format(deltaHour, "hour")
    const deltaDay = Math.round(deltaHour / 24)
    return relativeTime.format(deltaDay, "day")
  }

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
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => {
                      const nextOpen = !notificationsOpen
                      setNotificationsOpen(nextOpen)
                      if (nextOpen) void loadNotifications()
                    }}
                    className="relative rounded-md border border-neutral-200 bg-white p-1.5 text-slate-500 hover:bg-neutral-50"
                  >
                    <Bell size={12} />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {notificationsOpen ? (
                    <div className="absolute right-0 z-30 mt-1 w-80 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <p className="text-xs font-semibold text-slate-800">Notifications</p>
                        <button
                          onClick={() => void markAllRead()}
                          className="text-[11px] text-slate-600 hover:text-slate-900"
                        >
                          Mark all read
                        </button>
                      </div>
                      {browserNotifPermission !== "granted" ? (
                        <div className="mb-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
                          <p className="text-[11px] text-slate-600">
                            Enable browser notifications for instant popups.
                          </p>
                          <button
                            onClick={() => void enableBrowserNotifications()}
                            className="mt-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-neutral-100"
                          >
                            Enable
                          </button>
                          {browserNotifPermission === "denied" ? (
                            <p className="mt-1 text-[10px] text-red-600">
                              Blocked in browser. Allow notifications in site settings.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mb-2 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                          <p className="text-[11px] text-emerald-800">Browser notifications are on.</p>
                          <button
                            onClick={() => void testBrowserNotification()}
                            className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] text-emerald-800 hover:bg-emerald-100"
                          >
                            Test
                          </button>
                        </div>
                      )}
                      {notificationDebug ? (
                        <div className="mb-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-slate-600">
                          {notificationDebug}
                        </div>
                      ) : null}
                      {loadingNotifications ? (
                        <div className="px-1 py-4 text-[11px] text-slate-500">Loading...</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-1 py-4 text-[11px] text-slate-500">No notifications yet.</div>
                      ) : (
                        <div className="max-h-80 space-y-1 overflow-y-auto">
                          {notifications.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => void markNotificationRead(item.id)}
                              className={`w-full rounded-md border px-2 py-1.5 text-left ${
                                item.is_read
                                  ? "border-neutral-200 bg-white"
                                  : "border-blue-200 bg-blue-50"
                              }`}
                            >
                              <p className="text-xs font-medium text-slate-800">{item.title}</p>
                              {item.body ? <p className="mt-0.5 text-[11px] text-slate-600">{item.body}</p> : null}
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                                <span>{item.task_ref || item.kind}</span>
                                <span>{getTimeLabel(item.created_at)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
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
      {inAppAlerts.length ? (
        <div className="fixed bottom-3 right-3 z-40 w-80 space-y-2">
          {inAppAlerts.map((alert) => (
            <div key={alert.id} className="rounded-md border border-neutral-200 bg-white p-2 shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">{alert.body}</p>
                </div>
                <button
                  onClick={() => {
                    setInAppAlerts((prev) => prev.filter((a) => a.id !== alert.id))
                  }}
                  className="rounded p-0.5 text-slate-400 hover:bg-neutral-100 hover:text-slate-700"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
