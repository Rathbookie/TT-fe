"use client"

import { useEffect, useState } from "react"
import { TaskProof } from "@/types/task"
import { apiFetch, apiFetchJson } from "@/lib/api"

type Props = {
  taskId?: number
  disabled?: boolean
}

const TYPES = ["FILE", "TEXT", "URL"] as const

type ProofType = (typeof TYPES)[number]

export default function TaskProofs({ taskId, disabled }: Props) {
  const [proofs, setProofs] = useState<TaskProof[]>([])
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<ProofType>("FILE")
  const [label, setLabel] = useState("")
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!taskId) return
      try {
        const data = await apiFetchJson<TaskProof[]>(`/api/tasks/${taskId}/proofs/`)
        if (!mounted) return
        setProofs(data || [])
      } catch {
        if (!mounted) return
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [taskId])

  const submitProof = async () => {
    if (!taskId || disabled) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("type", type)
      formData.append("label", label || `${type} proof`)
      if (type === "FILE") {
        if (!file) {
          alert("Select a file")
          return
        }
        formData.append("file", file)
      }
      if (type === "TEXT") {
        if (!text.trim()) {
          alert("Enter proof text")
          return
        }
        formData.append("text", text)
      }
      if (type === "URL") {
        if (!url.trim()) {
          alert("Enter proof URL")
          return
        }
        formData.append("url", url)
      }

      const res = await apiFetch(`/api/tasks/${taskId}/proofs/`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        alert(detail?.detail || "Failed to submit proof")
        return
      }
      const created = (await res.json()) as TaskProof
      setProofs((prev) => [created, ...prev])
      setLabel("")
      setText("")
      setUrl("")
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const deleteProof = async (proofId: number) => {
    if (!taskId || disabled) return
    const res = await apiFetch(`/api/tasks/${taskId}/proofs/${proofId}/`, {
      method: "DELETE",
    })
    if (!res.ok) {
      alert("Failed to delete proof")
      return
    }
    setProofs((prev) => prev.filter((item) => item.id !== proofId))
  }

  if (!taskId) {
    return <p className="text-[11px] text-slate-500">Save task first to add proofs.</p>
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ProofType)}
          disabled={disabled}
          className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
        >
          {TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Proof label"
          disabled={disabled}
          className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
        />
        {type === "FILE" && (
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={disabled}
            className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
          />
        )}
        {type === "TEXT" && (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Proof text"
            disabled={disabled}
            className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
          />
        )}
        {type === "URL" && (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            disabled={disabled}
            className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
          />
        )}
        <button
          onClick={submitProof}
          disabled={disabled || loading}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] text-slate-700"
        >
          {loading ? "Adding..." : "Add Proof"}
        </button>
      </div>
      <div className="space-y-1">
        {proofs.map((proof) => (
          <div key={proof.id} className="flex items-center justify-between rounded border border-neutral-200 p-2 text-[11px]">
            <div className="min-w-0">
              <p className="truncate text-slate-700">[{proof.type}] {proof.label || "Proof"}</p>
              {proof.type === "FILE" ? (
                <a
                  href={proof.file_url || proof.file || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-blue-700 hover:underline"
                >
                  {proof.file_name || "Open file"}
                </a>
              ) : (
                <p className="truncate text-slate-500">
                  {proof.type === "TEXT" ? proof.text : proof.url}
                </p>
              )}
            </div>
            <button
              onClick={() => void deleteProof(proof.id)}
              disabled={disabled}
              className="rounded border border-red-200 px-2 py-0.5 text-[11px] text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
        {!proofs.length && <p className="text-[11px] text-slate-500">No proofs yet.</p>}
      </div>
    </div>
  )
}
