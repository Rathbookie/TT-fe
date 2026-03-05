"use client"

import { ReactNode, useState } from "react"
import { Layers, Target, Workflow, X } from "lucide-react"
import { apiFetchJson } from "@/lib/api"

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

type WorkflowTemplate = {
  id: string
  name: string
  description: string
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  { id: "starter", name: "Starter", description: "For everyday tasks" },
  { id: "marketing", name: "Marketing Teams", description: "Run effective campaigns" },
  { id: "project", name: "Project Management", description: "Plan, manage, and execute projects" },
  { id: "product", name: "Product + Engineering", description: "Streamline your product lifecycle" },
]

export default function CreateDivisionModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permission, setPermission] = useState<"FULL_EDIT" | "COMMENT_ONLY" | "VIEW_ONLY">("FULL_EDIT")
  const [isPrivate, setIsPrivate] = useState(false)
  const [templateId, setTemplateId] = useState<string>("starter")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const closeAndReset = () => {
    setStep(1)
    setName("")
    setDescription("")
    setPermission("FULL_EDIT")
    setIsPrivate(false)
    setTemplateId("starter")
    setError(null)
    setLoading(false)
    onClose()
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setLoading(true)
    setError(null)
    try {
      await apiFetchJson("/api/divisions/", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
          default_permission: permission,
          is_private: isPrivate,
        }),
      })
      onCreated?.()
      closeAndReset()
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Failed to create division."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const selectedTemplate =
    WORKFLOW_TEMPLATES.find((template) => template.id === templateId) || WORKFLOW_TEMPLATES[0]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-[680px] rounded-2xl border border-neutral-200 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <h2 className="text-3xl font-semibold leading-none tracking-tight">
              {step === 1 ? "Create a Space" : "Define your workflow"}
            </h2>
            <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-slate-500">
              {step === 1
                ? "A Space represents teams, departments, or groups, each with its own Lists, workflows, and settings."
                : "Choose a pre-configured solution or customize to your liking with advanced ClickApps, required views, and task statuses."}
            </p>
          </div>
          <button
            onClick={closeAndReset}
            className="rounded-full bg-neutral-100 p-2 text-slate-500 hover:bg-neutral-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-5 px-5 pb-4 pt-4">
            <div>
              <p className="mb-2 text-xl font-medium tracking-tight">Name</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marketing, Engineering, HR"
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-neutral-500 focus:outline-none"
              />
            </div>

            <div>
              <p className="mb-2 text-xl font-medium tracking-tight">
                Description <span className="text-slate-400">(optional)</span>
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-neutral-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xl font-semibold tracking-tight">Default permission</p>
              </div>
              <select
                value={permission}
                onChange={(e) =>
                  setPermission(e.target.value as "FULL_EDIT" | "COMMENT_ONLY" | "VIEW_ONLY")
                }
                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-slate-900"
              >
                <option value="FULL_EDIT">Full edit</option>
                <option value="COMMENT_ONLY">Comment only</option>
                <option value="VIEW_ONLY">View only</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xl font-semibold tracking-tight">Make Private</p>
                <p className="mt-1 text-sm text-slate-500">Only you and invited members have access</p>
              </div>
              <button
                onClick={() => setIsPrivate((prev) => !prev)}
                className={`relative h-8 w-14 rounded-full transition ${
                  isPrivate ? "bg-slate-700" : "bg-neutral-300"
                }`}
                aria-label="Toggle private"
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                    isPrivate ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-5 pb-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {WORKFLOW_TEMPLATES.map((template) => {
                const active = template.id === templateId
                return (
                  <button
                    key={template.id}
                    onClick={() => setTemplateId(template.id)}
                    className={`rounded-3xl border p-6 text-left transition ${
                      active
                        ? "border-slate-400 bg-slate-50"
                        : "border-neutral-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    <p className="text-xl font-semibold tracking-tight">{template.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{template.description}</p>
                  </button>
                )
              })}
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <p className="mb-3 text-xl font-semibold tracking-tight">
                Customize defaults for {selectedTemplate.name}
              </p>
              <div className="space-y-4">
                <PreferenceCard
                  icon={<Layers size={26} />}
                  title="Default views"
                  subtitle="List, Board"
                />
                <PreferenceCard
                  icon={<Target size={26} />}
                  title="Task statuses"
                  subtitle="TO DO -> IN PROGRESS -> COMPLETE"
                />
                <PreferenceCard
                  icon={<Workflow size={26} />}
                  title="ClickApps"
                  subtitle="Tags, Time Estimates, Priority, Time Tracking"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-5 py-3.5">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-slate-600 hover:bg-neutral-100"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          <div className="text-right">
            {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}
            <button
              onClick={step === 1 ? () => setStep(2) : () => void handleCreate()}
              disabled={loading || !name.trim()}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : step === 1 ? "Continue" : "Create Space"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreferenceCard({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 bg-neutral-50 text-slate-700">
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold tracking-tight">{title}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}
