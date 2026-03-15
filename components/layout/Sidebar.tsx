"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  SquareKanban,
  Network,
  Package,
  Star,
  Hash,
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  MoreHorizontal,
  Settings,
  Users,
  Home,
  Gauge,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { canCreateTask } from "@/lib/roleCapabilities"
import clsx from "clsx"
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import RoleDropdown from "./RoleDropdown"
import CreateDivisionModal from "@/components/hierarchy/CreateDivisionModal"

type DivisionItem = {
  id: number
  name: string
  slug: string
}

type SectionItem = {
  id: number
  name: string
  slug: string
  division: number
}

type BoardItem = {
  id: number
  name: string
  slug: string
  division: number | null
  section: number | null
}

type TaskLite = {
  id: number
  ref_id?: string
  title: string
}

type CollectionResponse<T> = T[] | { results?: T[] }

type FloatingCreateMenu =
  | { kind: "division"; divisionId: number; x: number; y: number }
  | { kind: "board"; divisionId: number; boardId: number; x: number; y: number }

const extractResults = <T,>(payload: CollectionResponse<T>): T[] =>
  Array.isArray(payload) ? payload : payload.results || []

const HIERARCHY_CACHE_TTL_MS = 15000
let hierarchyCache:
  | {
      tenantSlug: string
      at: number
      divisions: DivisionItem[]
      sections: SectionItem[]
      boards: BoardItem[]
    }
  | null = null

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [expandedDivisions, setExpandedDivisions] = useState<number[]>([])
  const [expandedSections, setExpandedSections] = useState<number[]>([])
  const [loadingHierarchy, setLoadingHierarchy] = useState(false)
  const [showCreateDivisionModal, setShowCreateDivisionModal] = useState(false)

  const [divisions, setDivisions] = useState<DivisionItem[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [boards, setBoards] = useState<BoardItem[]>([])

  const [divisionMenuId, setDivisionMenuId] = useState<number | null>(null)
  const [floatingCreateMenu, setFloatingCreateMenu] = useState<FloatingCreateMenu | null>(null)
  const [sectionMenuId, setSectionMenuId] = useState<number | null>(null)
  const [boardMenuId, setBoardMenuId] = useState<number | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null)

  const pathname = usePathname()
  const router = useRouter()
  const { activeRole, setActiveRole, roles, logout, user } = useAuth()
  const orgBase = user?.tenant_slug ? `/${user.tenant_slug}` : ""
  const orgHref = (path: string) => `${orgBase}${path}`

  const topItems = [
    { href: orgHref("/home"), match: "/home", label: "Home", icon: <Home size={14} /> },
    ...(activeRole === "TASK_RECEIVER"
      ? []
      : [{ href: orgHref("/performance"), match: "/performance", label: "Performance", icon: <Gauge size={14} /> }]),
    { href: orgHref("/org-view"), match: "/org-view", label: "Org View", icon: <Users size={14} /> },
    { href: orgHref("/workflows"), match: "/workflows", label: "Workflows", icon: <Network size={14} /> },
    { href: orgHref("/modules"), match: "/modules", label: "Modules", icon: <Package size={14} /> },
    { href: orgHref("/settings"), match: "/settings", label: "Settings", icon: <Settings size={14} /> },
    { href: "/onboarding", match: "/onboarding", label: "Templates", icon: <Star size={14} /> },
  ]

  const sectionsByDivision = useMemo(() => {
    const grouped = new Map<number, SectionItem[]>()
    for (const section of sections) {
      const arr = grouped.get(section.division) || []
      arr.push(section)
      grouped.set(section.division, arr)
    }
    for (const arr of grouped.values()) arr.sort((a, b) => a.name.localeCompare(b.name))
    return grouped
  }, [sections])

  const boardsByDivision = useMemo(() => {
    const grouped = new Map<number, BoardItem[]>()
    for (const board of boards) {
      if (board.division && !board.section) {
        const arr = grouped.get(board.division) || []
        arr.push(board)
        grouped.set(board.division, arr)
      }
    }
    for (const arr of grouped.values()) arr.sort((a, b) => a.name.localeCompare(b.name))
    return grouped
  }, [boards])

  const boardsBySection = useMemo(() => {
    const grouped = new Map<number, BoardItem[]>()
    for (const board of boards) {
      if (board.section) {
        const arr = grouped.get(board.section) || []
        arr.push(board)
        grouped.set(board.section, arr)
      }
    }
    for (const arr of grouped.values()) arr.sort((a, b) => a.name.localeCompare(b.name))
    return grouped
  }, [boards])

  const filteredDivisions = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return divisions
    return divisions.filter((division) => {
      if (division.name.toLowerCase().includes(q)) return true
      const divisionSections = sectionsByDivision.get(division.id) || []
      if (divisionSections.some((section) => section.name.toLowerCase().includes(q))) return true
      const directBoards = boardsByDivision.get(division.id) || []
      if (directBoards.some((board) => board.name.toLowerCase().includes(q))) return true
      return divisionSections.some((section) =>
        (boardsBySection.get(section.id) || []).some((board) => board.name.toLowerCase().includes(q))
      )
    })
  }, [boardsByDivision, boardsBySection, divisions, searchText, sectionsByDivision])

  const canManageHierarchy = activeRole === "ADMIN"
  const canManageTasks = canCreateTask(activeRole)

  const ensureHierarchyPermission = () => {
    if (canManageHierarchy) return true
    setActionMessage("Switch active role to ADMIN to create or delete sections/lists.")
    setFloatingCreateMenu(null)
    setDivisionMenuId(null)
    setSectionMenuId(null)
    setBoardMenuId(null)
    return false
  }

  const ensureTaskPermission = () => {
    if (canManageTasks) return true
    setActionMessage("Switch active role to TASK_CREATOR or ADMIN to create tasks.")
    setFloatingCreateMenu(null)
    setDivisionMenuId(null)
    setSectionMenuId(null)
    setBoardMenuId(null)
    return false
  }

  const loadHierarchy = useCallback(async (force = false) => {
    if (!user?.tenant_slug) return

    if (
      !force &&
      hierarchyCache &&
      hierarchyCache.tenantSlug === user.tenant_slug &&
      Date.now() - hierarchyCache.at < HIERARCHY_CACHE_TTL_MS
    ) {
      setDivisions(hierarchyCache.divisions)
      setSections(hierarchyCache.sections)
      setBoards(hierarchyCache.boards)
      if (hierarchyCache.divisions[0]) {
        setExpandedDivisions((prev) => (prev.length ? prev : [hierarchyCache!.divisions[0].id]))
      }
      return
    }

    setLoadingHierarchy(true)
    setActionMessage(null)
    try {
      let divisionsPayload: CollectionResponse<DivisionItem>
      try {
        divisionsPayload = await apiFetchJson<CollectionResponse<DivisionItem>>(
          `/api/${user.tenant_slug}/divisions/`
        )
      } catch {
        divisionsPayload = await apiFetchJson<CollectionResponse<DivisionItem>>("/api/divisions/")
      }
      const divisionList = extractResults(divisionsPayload).sort((a, b) => a.name.localeCompare(b.name))
      setDivisions(divisionList)

      const sectionsPayload = await apiFetchJson<CollectionResponse<SectionItem>>("/api/sections/")
      const validDivisionIds = new Set(divisionList.map((d) => d.id))
      const sectionList = extractResults(sectionsPayload)
        .filter((section) => validDivisionIds.has(section.division))
        .sort((a, b) => a.name.localeCompare(b.name))
      setSections(sectionList)

      const boardsPayload = await apiFetchJson<CollectionResponse<BoardItem>>("/api/boards/")
      const validSectionIds = new Set(sectionList.map((s) => s.id))
      const allBoards = extractResults(boardsPayload).filter((board) => {
        if (board.section) return validSectionIds.has(board.section)
        return board.division ? validDivisionIds.has(board.division) : false
      })
      const uniqueBoards = Array.from(new Map(allBoards.map((board) => [board.id, board])).values())
      uniqueBoards.sort((a, b) => a.name.localeCompare(b.name))
      setBoards(uniqueBoards)
      hierarchyCache = {
        tenantSlug: user.tenant_slug,
        at: Date.now(),
        divisions: divisionList,
        sections: sectionList,
        boards: uniqueBoards,
      }

      if (divisionList[0]) {
        setExpandedDivisions((prev) => (prev.length ? prev : [divisionList[0].id]))
      }
    } catch (err) {
      console.error("Failed to load sidebar hierarchy", err)
      setActionMessage(err instanceof Error ? err.message : "Failed to load divisions.")
    } finally {
      setLoadingHierarchy(false)
    }
  }, [user?.tenant_slug])

  useEffect(() => {
    void loadHierarchy()
  }, [loadHierarchy])

  const toggleDivision = (divisionId: number) => {
    setExpandedDivisions((prev) =>
      prev.includes(divisionId) ? prev.filter((id) => id !== divisionId) : [...prev, divisionId]
    )
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    )
  }

  const getDivisionSlugById = (divisionId: number | null | undefined) =>
    divisions.find((division) => division.id === divisionId)?.slug || null

  const getSectionById = (sectionId: number | null | undefined) =>
    sections.find((section) => section.id === sectionId) || null

  const createSectionInDivision = async (divisionId: number) => {
    if (!ensureHierarchyPermission()) return
    setBusyActionKey(`division:${divisionId}:section`)
    setActionMessage(null)
    try {
      await apiFetchJson("/api/sections/", {
        method: "POST",
        body: JSON.stringify({ name: "New Section", division: divisionId }),
      })
      await loadHierarchy(true)
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to create section.")
    } finally {
      setBusyActionKey(null)
      setFloatingCreateMenu(null)
    }
  }

  const createListInDivision = async (divisionId: number) => {
    if (!ensureHierarchyPermission()) return
    setBusyActionKey(`division:${divisionId}:list`)
    setActionMessage(null)
    try {
      const board = await apiFetchJson<{ id: number }>("/api/boards/", {
        method: "POST",
        body: JSON.stringify({ name: "New List", division: divisionId }),
      })
      await loadHierarchy(true)
      const divisionSlug = getDivisionSlugById(divisionId)
      if (divisionSlug) {
        router.push(orgHref(`/divisions/${divisionSlug}/tasks?board=${board.id}`))
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to create list.")
    } finally {
      setBusyActionKey(null)
      setFloatingCreateMenu(null)
    }
  }

  const createListInSection = async (sectionId: number) => {
    if (!ensureHierarchyPermission()) return
    setBusyActionKey(`section:${sectionId}:list`)
    setActionMessage(null)
    try {
      const board = await apiFetchJson<{ id: number }>("/api/boards/", {
        method: "POST",
        body: JSON.stringify({ name: "New List", section: sectionId }),
      })
      await loadHierarchy(true)
      const section = getSectionById(sectionId)
      const divisionSlug = getDivisionSlugById(section?.division)
      if (divisionSlug) {
        router.push(orgHref(`/divisions/${divisionSlug}/tasks?board=${board.id}`))
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to create list.")
    } finally {
      setBusyActionKey(null)
      setFloatingCreateMenu(null)
    }
  }

  const createTaskInSection = async (sectionId: number) => {
    if (!ensureTaskPermission()) return
    setBusyActionKey(`section:${sectionId}:task`)
    setActionMessage(null)
    try {
      const sectionBoards = boardsBySection.get(sectionId) || []
      const boardId = sectionBoards[0]?.id || null
      const section = getSectionById(sectionId)
      const divisionSlug = getDivisionSlugById(section?.division)
      if (divisionSlug) {
        const params = new URLSearchParams()
        params.set("create", "1")
        params.set("source", "sidebar")
        params.set("ts", String(Date.now()))
        if (boardId) params.set("board", String(boardId))
        router.push(orgHref(`/divisions/${divisionSlug}/tasks?${params.toString()}`))
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to open task creator.")
    } finally {
      setBusyActionKey(null)
      setFloatingCreateMenu(null)
    }
  }

  const createTaskInBoard = async (boardId: number, divisionId: number) => {
    if (!ensureTaskPermission()) return
    setBusyActionKey(`board:${boardId}:task`)
    setActionMessage(null)
    try {
      const divisionSlug = getDivisionSlugById(divisionId)
      if (divisionSlug) {
        const params = new URLSearchParams()
        params.set("create", "1")
        params.set("source", "sidebar")
        params.set("ts", String(Date.now()))
        params.set("board", String(boardId))
        router.push(orgHref(`/divisions/${divisionSlug}/tasks?${params.toString()}`))
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to open task creator.")
    } finally {
      setBusyActionKey(null)
      setFloatingCreateMenu(null)
    }
  }

  const createTaskInDivision = async (divisionId: number) => {
    if (!ensureTaskPermission()) return
    setBusyActionKey(`division:${divisionId}:task`)
    setActionMessage(null)
    try {
      const divisionBoards = boardsByDivision.get(divisionId) || []
      const boardId = divisionBoards[0]?.id || null
      const divisionSlug = getDivisionSlugById(divisionId)
      if (divisionSlug) {
        const params = new URLSearchParams()
        params.set("create", "1")
        params.set("source", "sidebar")
        params.set("ts", String(Date.now()))
        if (boardId) params.set("board", String(boardId))
        router.push(orgHref(`/divisions/${divisionSlug}/tasks?${params.toString()}`))
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to open task creator.")
    } finally {
      setBusyActionKey(null)
      setFloatingCreateMenu(null)
    }
  }

  const deleteSection = async (sectionId: number) => {
    if (!ensureHierarchyPermission()) return
    setBusyActionKey(`section:${sectionId}:delete`)
    setActionMessage(null)
    try {
      const res = await apiFetch(`/api/sections/${sectionId}/`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await loadHierarchy(true)
      setSectionMenuId(null)
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to delete section.")
    } finally {
      setBusyActionKey(null)
    }
  }

  const renameDivision = async (divisionId: number, currentName: string) => {
    if (!ensureHierarchyPermission()) return
    const name = window.prompt("Rename division", currentName)?.trim()
    if (!name || name === currentName) return
    setBusyActionKey(`division:${divisionId}:rename`)
    setActionMessage(null)
    try {
      await apiFetchJson(`/api/divisions/${divisionId}/`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      })
      await loadHierarchy(true)
      setDivisionMenuId(null)
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to rename division.")
    } finally {
      setBusyActionKey(null)
    }
  }

  const deleteDivision = async (divisionId: number, name: string) => {
    if (!ensureHierarchyPermission()) return
    if (!window.confirm(`Delete division "${name}"?`)) return
    setBusyActionKey(`division:${divisionId}:delete`)
    setActionMessage(null)
    try {
      const res = await apiFetch(`/api/divisions/${divisionId}/`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await loadHierarchy(true)
      setDivisionMenuId(null)
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to delete division.")
    } finally {
      setBusyActionKey(null)
    }
  }

  const renameSection = async (sectionId: number, currentName: string) => {
    if (!ensureHierarchyPermission()) return
    const name = window.prompt("Rename section", currentName)?.trim()
    if (!name || name === currentName) return
    setBusyActionKey(`section:${sectionId}:rename`)
    setActionMessage(null)
    try {
      await apiFetchJson(`/api/sections/${sectionId}/`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      })
      await loadHierarchy(true)
      setSectionMenuId(null)
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to rename section.")
    } finally {
      setBusyActionKey(null)
    }
  }

  const renameBoard = async (boardId: number, currentName: string) => {
    if (!ensureHierarchyPermission()) return
    const name = window.prompt("Rename list", currentName)?.trim()
    if (!name || name === currentName) return
    setBusyActionKey(`board:${boardId}:rename`)
    setActionMessage(null)
    try {
      await apiFetchJson(`/api/boards/${boardId}/`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      })
      await loadHierarchy(true)
      setBoardMenuId(null)
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to rename list.")
    } finally {
      setBusyActionKey(null)
    }
  }

  const deleteBoard = async (boardId: number) => {
    if (!ensureHierarchyPermission()) return
    setBusyActionKey(`board:${boardId}:delete`)
    setActionMessage(null)
    try {
      const res = await apiFetch(`/api/boards/${boardId}/`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await loadHierarchy(true)
      setBoardMenuId(null)
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to delete list.")
    } finally {
      setBusyActionKey(null)
    }
  }

  const deleteTasksInBoard = async (boardId: number) => {
    if (!ensureTaskPermission()) return
    setBusyActionKey(`board:${boardId}:tasks-delete`)
    setActionMessage(null)
    try {
      const payload = await apiFetchJson<{ results?: TaskLite[] }>(
        `/api/tasks/?board=${boardId}&include_terminal=1&page_size=200`
      )
      const tasks = payload.results || []
      for (const task of tasks) {
        const res = await apiFetch(`/api/tasks/${task.id}/`, { method: "DELETE" })
        if (!res.ok) throw new Error(`Failed deleting task ${task.id}`)
      }
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to delete tasks.")
    } finally {
      setBusyActionKey(null)
      setBoardMenuId(null)
    }
  }

  const openCreateMenuAtEvent = (
    event: React.MouseEvent<HTMLButtonElement>,
    menu:
      | { kind: "division"; divisionId: number }
      | { kind: "board"; divisionId: number; boardId: number }
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setFloatingCreateMenu({
      ...menu,
      x: rect.right + 8,
      y: rect.top,
    } as FloatingCreateMenu)
  }

  useEffect(() => {
    if (!floatingCreateMenu) return
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest("[data-floating-create-menu]")) return
      if (target.closest("[data-create-trigger]")) return
      setFloatingCreateMenu(null)
    }
    document.addEventListener("mousedown", onDocPointerDown)
    return () => document.removeEventListener("mousedown", onDocPointerDown)
  }, [floatingCreateMenu])

  const getBoardHref = (board: BoardItem) => {
    const divisionId = board.division || getSectionById(board.section)?.division
    const divisionSlug = getDivisionSlugById(divisionId)
    if (!divisionSlug) return orgHref("/dashboard")
    return orgHref(`/divisions/${divisionSlug}/tasks?board=${board.id}`)
  }

  return (
    <>
      <aside
        className={clsx(
          "surface-card sticky top-2 hidden h-[calc(100vh-1rem)] flex-col px-2 py-2 transition-all duration-300 lg:flex",
          collapsed ? "w-16" : "w-72"
        )}
      >
        <div className={clsx("mb-3 flex items-center", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
                WO
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-slate-900">WorkOS</div>
                <div className="text-[10px] text-slate-500">Workspace</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md border border-neutral-200 bg-white p-1.5 text-slate-600"
          >
            {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
          </button>
        </div>

        {!collapsed && (
          <div className="mb-2 flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
            <Search size={12} className="text-neutral-400" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-transparent text-[11px] text-slate-700 outline-none"
              placeholder="Search hierarchy"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          {topItems.map((item) => (
            <MenuItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              active={pathname.startsWith(item.href) || pathname.endsWith(item.match)}
            />
          ))}
        </div>

        {!collapsed && (
          <div className="mt-3 border-t border-neutral-200 pt-2">
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>DIVISIONS</span>
              <button
                onClick={() => setShowCreateDivisionModal(true)}
                className="rounded p-0.5 hover:bg-neutral-100"
                title="New Division"
              >
                <Plus size={10} />
              </button>
            </div>
            {actionMessage ? (
              <div className="mb-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">
                {actionMessage}
              </div>
            ) : null}

            <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
              {loadingHierarchy ? (
                <div className="px-2 py-1 text-[11px] text-slate-500">Loading...</div>
              ) : (
                filteredDivisions.map((division) => {
                  const divisionOpen = expandedDivisions.includes(division.id)
                  const divisionSections = sectionsByDivision.get(division.id) || []
                  const divisionBoards = boardsByDivision.get(division.id) || []

                  return (
                    <div key={division.id} className="rounded-md">
                      <div className="relative flex items-center gap-1">
                        <button
                          onClick={() => toggleDivision(division.id)}
                          className="rounded-md px-1 py-1 text-slate-500 hover:bg-neutral-100"
                          title={divisionOpen ? "Collapse division" : "Expand division"}
                        >
                          {divisionOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                        <Link
                          href={orgHref(`/divisions/${division.slug}`)}
                          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                        >
                          <Hash size={11} className="text-indigo-500" />
                          <span className="truncate">{division.name}</span>
                        </Link>
                        <button
                          data-create-trigger
                          onClick={(event) =>
                            openCreateMenuAtEvent(event, { kind: "division", divisionId: division.id })
                          }
                          className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                          title="Add inside this Division"
                        >
                          <Plus size={10} />
                        </button>
                        <button
                          onClick={() =>
                            setDivisionMenuId((prev) => (prev === division.id ? null : division.id))
                          }
                          className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                          title="Division actions"
                        >
                          <MoreHorizontal size={10} />
                        </button>
                        {divisionMenuId === division.id ? (
                          <div className="absolute right-0 top-7 z-20 w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
                            <button
                              onClick={() => void createSectionInDivision(division.id)}
                              className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                            >
                              Add Section
                            </button>
                            <button
                              onClick={() => void createListInDivision(division.id)}
                              className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                            >
                              Add List
                            </button>
                            <button
                              onClick={() => void createTaskInDivision(division.id)}
                              className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                            >
                              Add Task
                            </button>
                            <button
                              onClick={() => void renameDivision(division.id, division.name)}
                              disabled={busyActionKey === `division:${division.id}:rename`}
                              className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100 disabled:opacity-50"
                            >
                              Rename Division
                            </button>
                            <button
                              onClick={() => void deleteDivision(division.id, division.name)}
                              disabled={busyActionKey === `division:${division.id}:delete`}
                              className="w-full rounded px-2 py-1 text-left text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Delete Division
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {divisionOpen && (
                        <div className="ml-3 mt-0.5 space-y-0.5">
                          {divisionBoards.map((board) => (
                            <div key={board.id} className="relative flex items-center">
                              <Link
                                href={getBoardHref(board)}
                                className="flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-[11px] text-slate-700 hover:bg-neutral-100"
                              >
                                <SquareKanban size={11} className="text-emerald-600" />
                                <span className="truncate">{board.name}</span>
                              </Link>
                              <button
                                data-create-trigger
                                onClick={(event) =>
                                  openCreateMenuAtEvent(event, {
                                    kind: "board",
                                    divisionId: division.id,
                                    boardId: board.id,
                                  })
                                }
                                className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                                title="Create in this list"
                              >
                                <Plus size={10} />
                              </button>
                              <button
                                onClick={() =>
                                  setBoardMenuId((prev) => (prev === board.id ? null : board.id))
                                }
                                className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                                title="List actions"
                              >
                                <MoreHorizontal size={10} />
                              </button>
                              {boardMenuId === board.id ? (
                                <div className="absolute right-0 top-7 z-20 w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
                                  <button
                                    onClick={() => void createTaskInBoard(board.id, division.id)}
                                    className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                                  >
                                    Add Task
                                  </button>
                                  <button
                                    onClick={() => void renameBoard(board.id, board.name)}
                                    disabled={busyActionKey === `board:${board.id}:rename`}
                                    className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100 disabled:opacity-50"
                                  >
                                    Rename List
                                  </button>
                                  <button
                                    onClick={() => void deleteTasksInBoard(board.id)}
                                    disabled={busyActionKey === `board:${board.id}:tasks-delete`}
                                    className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100 disabled:opacity-50"
                                  >
                                    Delete Tasks
                                  </button>
                                  <button
                                    onClick={() => void deleteBoard(board.id)}
                                    disabled={busyActionKey === `board:${board.id}:delete`}
                                    className="w-full rounded px-2 py-1 text-left text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Delete List
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ))}

                          {divisionSections.map((section) => {
                            const sectionOpen = expandedSections.includes(section.id)
                            const sectionBoards = boardsBySection.get(section.id) || []
                            return (
                              <div key={section.id}>
                                <div className="relative flex items-center gap-1">
                                  <button
                                    onClick={() => toggleSection(section.id)}
                                    className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                                  >
                                    {sectionOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    <Folder size={11} className="text-blue-500" />
                                    <span className="flex-1 truncate">{section.name}</span>
                                  </button>
                                  <button
                                    onClick={() => void createListInSection(section.id)}
                                    className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                                    title="Create list in this section"
                                  >
                                    <Plus size={10} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setSectionMenuId((prev) => (prev === section.id ? null : section.id))
                                    }
                                    className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                                    title="Section actions"
                                  >
                                    <MoreHorizontal size={10} />
                                  </button>
                                  {sectionMenuId === section.id ? (
                                    <div className="absolute right-0 top-7 z-20 w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
                                      <button
                                        onClick={() => void createListInSection(section.id)}
                                        className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                                      >
                                        Add List
                                      </button>
                                      <button
                                        onClick={() => void createTaskInSection(section.id)}
                                        className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                                      >
                                        Add Task
                                      </button>
                                      <button
                                        onClick={() => void renameSection(section.id, section.name)}
                                        disabled={busyActionKey === `section:${section.id}:rename`}
                                        className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100 disabled:opacity-50"
                                      >
                                        Rename Section
                                      </button>
                                      <button
                                        onClick={() => void deleteSection(section.id)}
                                        disabled={busyActionKey === `section:${section.id}:delete`}
                                        className="w-full rounded px-2 py-1 text-left text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                                      >
                                        Delete Section
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                                {sectionOpen && (
                                  <div className="ml-3 space-y-0.5">
                                    {sectionBoards.map((board) => (
                                      <div key={board.id} className="relative flex items-center">
                                        <Link
                                          href={getBoardHref(board)}
                                          className="flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-[11px] text-slate-700 hover:bg-neutral-100"
                                        >
                                          <SquareKanban size={11} className="text-emerald-600" />
                                          <span className="truncate">{board.name}</span>
                                        </Link>
                                        <button
                                          data-create-trigger
                                          onClick={(event) =>
                                            openCreateMenuAtEvent(event, {
                                              kind: "board",
                                              divisionId: division.id,
                                              boardId: board.id,
                                            })
                                          }
                                          className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                                          title="Create in this list"
                                        >
                                          <Plus size={10} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            setBoardMenuId((prev) => (prev === board.id ? null : board.id))
                                          }
                                          className="rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-neutral-100"
                                          title="List actions"
                                        >
                                          <MoreHorizontal size={10} />
                                        </button>
                                        {boardMenuId === board.id ? (
                                          <div className="absolute right-0 top-7 z-20 w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
                                            <button
                                              onClick={() => void createTaskInBoard(board.id, division.id)}
                                              className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100"
                                            >
                                              Add Task
                                            </button>
                                            <button
                                              onClick={() => void renameBoard(board.id, board.name)}
                                              disabled={busyActionKey === `board:${board.id}:rename`}
                                              className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100 disabled:opacity-50"
                                            >
                                              Rename List
                                            </button>
                                            <button
                                              onClick={() => void deleteTasksInBoard(board.id)}
                                              disabled={busyActionKey === `board:${board.id}:tasks-delete`}
                                              className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-neutral-100 disabled:opacity-50"
                                            >
                                              Delete Tasks
                                            </button>
                                            <button
                                              onClick={() => void deleteBoard(board.id)}
                                              disabled={busyActionKey === `board:${board.id}:delete`}
                                              className="w-full rounded px-2 py-1 text-left text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                              Delete List
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              {!loadingHierarchy && filteredDivisions.length === 0 && (
                <div className="px-2 py-1 text-[11px] text-slate-500">No hierarchy items found.</div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 border-t border-neutral-200 pt-2">
          {activeRole && (
            <RoleDropdown
              roles={roles}
              activeRole={activeRole}
              setActiveRole={setActiveRole}
              collapsed={collapsed}
            />
          )}
        </div>

        <div className="mt-auto border-t border-neutral-200 pt-2">
          <div className={clsx("mb-2 flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-[10px] font-semibold text-white">
              WO
            </div>
            {!collapsed && (
              <div>
                <div className="text-[11px] font-semibold text-slate-900">Workspace</div>
                <div className="text-[10px] text-slate-500">Enterprise plan</div>
              </div>
            )}
            {!collapsed && (
              <button className="ml-auto rounded p-1 text-slate-400 hover:bg-neutral-100">
                <MoreHorizontal size={12} />
              </button>
            )}
          </div>

          <button
            onClick={logout}
            className={clsx(
              "w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 hover:bg-neutral-50",
              collapsed && "px-0"
            )}
          >
            <span className={clsx("flex items-center", collapsed ? "justify-center" : "gap-2")}>
              <LogOut size={12} />
              {!collapsed && "Sign out"}
            </span>
          </button>
        </div>
      </aside>

      <CreateDivisionModal
        open={showCreateDivisionModal}
        onClose={() => setShowCreateDivisionModal(false)}
        onCreated={() => {
          void loadHierarchy(true)
        }}
      />
      {typeof window !== "undefined" && floatingCreateMenu
        ? createPortal(
            <div
              data-floating-create-menu
              className="fixed z-[200] w-[230px] rounded-xl border border-neutral-200 bg-white p-2 text-slate-900 shadow-2xl"
              style={{ left: floatingCreateMenu.x, top: floatingCreateMenu.y }}
            >
              <p className="px-2 pb-1 text-xs font-medium text-slate-500">Create</p>
              {floatingCreateMenu.kind === "division" ? (
                <>
                  <button
                    onClick={() => void createTaskInDivision(floatingCreateMenu.divisionId)}
                    disabled={busyActionKey === `division:${floatingCreateMenu.divisionId}:task`}
                    className="mb-1 w-full rounded-lg bg-neutral-100 px-2.5 py-2 text-left hover:bg-neutral-200"
                  >
                    <p className="text-base font-medium">Task</p>
                    <p className="text-xs text-slate-500">Create individual tasks to manage work</p>
                  </button>
                  <button
                    onClick={() => void createListInDivision(floatingCreateMenu.divisionId)}
                    disabled={busyActionKey === `division:${floatingCreateMenu.divisionId}:list`}
                    className="mb-1 w-full rounded-lg px-2.5 py-2 text-left hover:bg-neutral-100"
                  >
                    <p className="text-base font-medium">List</p>
                    <p className="text-xs text-slate-500">Track tasks, projects, people and more</p>
                  </button>
                  <button
                    onClick={() => void createSectionInDivision(floatingCreateMenu.divisionId)}
                    disabled={busyActionKey === `division:${floatingCreateMenu.divisionId}:section`}
                    className="w-full rounded-lg px-2.5 py-2 text-left hover:bg-neutral-100"
                  >
                    <p className="text-base font-medium">Section</p>
                    <p className="text-xs text-slate-500">Create a section inside this division</p>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      void createTaskInBoard(
                        floatingCreateMenu.boardId,
                        floatingCreateMenu.divisionId
                      )
                    }
                    disabled={busyActionKey === `board:${floatingCreateMenu.boardId}:task`}
                    className="mb-1 w-full rounded-lg bg-neutral-100 px-2.5 py-2 text-left hover:bg-neutral-200"
                  >
                    <p className="text-base font-medium">Task</p>
                    <p className="text-xs text-slate-500">Create task in this list</p>
                  </button>
                  <button
                    onClick={() => void deleteBoard(floatingCreateMenu.boardId)}
                    disabled={busyActionKey === `board:${floatingCreateMenu.boardId}:delete`}
                    className="w-full rounded-lg px-2.5 py-2 text-left hover:bg-neutral-100"
                  >
                    <p className="text-base font-medium text-red-600">Delete List</p>
                    <p className="text-xs text-slate-500">Remove this list</p>
                  </button>
                </>
              )}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

type MenuItemProps = {
  href: string
  icon: ReactNode
  label: string
  collapsed: boolean
  active?: boolean
}

function MenuItem({ href, icon, label, collapsed, active }: MenuItemProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center rounded-md px-2 py-1.5 text-[11px]",
        collapsed ? "justify-center" : "gap-2",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-neutral-100 hover:text-slate-900"
      )}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </Link>
  )
}
