"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"
import { apiFetchJson } from "@/lib/api"

type Preset = {
  id: number
  slug: string
  title: string
  description: string
  stages: { id: number; name: string; order: number }[]
  widgets: { id: number; name: string; order: number }[]
}

type AppliedWorkflow = {
  id: number
}

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<number | null>(null)
  const [presets, setPresets] = useState<Preset[]>([])

  useEffect(() => {
    let mounted = true
    const loadPresets = async () => {
      setLoading(true)
      try {
        const data = await apiFetchJson<Preset[]>("/api/workflow-presets/")
        if (mounted) setPresets(data)
      } catch (err) {
        console.error("Failed to load presets:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void loadPresets()
    return () => {
      mounted = false
    }
  }, [])

  const presetsWithBlank = useMemo(
    () => [
      ...presets,
      {
        id: -1,
        slug: "blank",
        title: "Blank Workspace",
        description:
          "Start from a clean slate and compose your own workflow logic, dashboard widgets, and modules.",
        stages: [
          { id: -101, name: "Stage 1", order: 0 },
          { id: -102, name: "Stage 2", order: 1 },
          { id: -103, name: "Stage 3", order: 2 },
        ],
        widgets: [
          { id: -201, name: "Custom KPI", order: 0 },
          { id: -202, name: "Task Queue", order: 1 },
          { id: -203, name: "Activity Feed", order: 2 },
        ],
      },
    ],
    [presets]
  )

  const handleStartWithTemplate = async (preset: Preset) => {
    if (preset.slug === "blank") {
      router.push("/workflows")
      return
    }

    setApplyingId(preset.id)
    try {
      const created = await apiFetchJson<AppliedWorkflow>(
        `/api/workflow-presets/${preset.id}/apply/`,
        { method: "POST" }
      )
      router.push(`/workflows?workflow=${created.id}`)
    } catch (err) {
      console.error("Failed to apply preset:", err)
      alert("Unable to apply template. You may need ADMIN role.")
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <WorkspaceShell
      title="Choose How You Want to Start"
      subtitle="Initialize WorkOS with an industry preset or start from a fully custom configuration."
    >
      {loading ? (
        <div className="surface-card p-5 text-sm text-slate-500">Loading templates...</div>
      ) : (
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <section className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {presetsWithBlank.map((preset) => (
            <article key={preset.slug} className="surface-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">{preset.title}</h2>
                <Sparkles size={16} className="text-slate-400" />
              </div>
              <p className="mt-2 text-sm text-slate-500">{preset.description}</p>

              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Workflow Stages
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {preset.stages.map((stage) => (
                      <span
                        key={stage.id}
                        className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {stage.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Dashboard Widgets
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preset.widgets.map((widget) => (
                      <span
                        key={widget.id}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs text-slate-600"
                      >
                        {widget.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => void handleStartWithTemplate(preset)}
                disabled={applyingId === preset.id}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                {applyingId === preset.id ? "Applying..." : "Start With This Template"}
                <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </section>

        <aside className="col-span-12">
          <div className="surface-card flex flex-col justify-between gap-3 p-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Need full control?
              </h3>
              <p className="text-sm text-slate-500">
                Build workflow stages, transition permissions, and modular dashboards from scratch.
              </p>
            </div>
            <Link
              href="/workflows"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-neutral-50"
            >
              Build Custom From Scratch
              <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
      )}
    </WorkspaceShell>
  )
}
