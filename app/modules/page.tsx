"use client"

import { useState } from "react"
import WorkspaceShell from "@/components/layout/WorkspaceShell"

const initialModules = [
  {
    key: "approvals",
    name: "Approvals",
    description: "Role-gated approvals with queue views and escalation policies.",
    enabled: true,
  },
  {
    key: "audit",
    name: "Audit Trail",
    description: "Immutable timeline for stage transitions, assignments, and critical events.",
    enabled: true,
  },
  {
    key: "time",
    name: "Time Tracking",
    description: "Track operational effort by stage, assignee, and client workstream.",
    enabled: false,
  },
  {
    key: "risk",
    name: "Risk Register",
    description: "Capture operational risks, mitigations, owners, and review cadence.",
    enabled: false,
  },
  {
    key: "docs",
    name: "Document Versioning",
    description: "Versioned requirement and submission assets with retention controls.",
    enabled: true,
  },
]

export default function ModulesPage() {
  const [modules, setModules] = useState(initialModules)

  return (
    <WorkspaceShell
      title="Module Marketplace"
      subtitle="Enable optional capability layers and expand WorkOS per tenant requirements."
    >
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <section className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article key={module.key} className="surface-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{module.name}</h2>
                <button
                  onClick={() =>
                    setModules((prev) =>
                      prev.map((item) =>
                        item.key === module.key
                          ? { ...item, enabled: !item.enabled }
                          : item
                      )
                    )
                  }
                  className={`rounded-lg px-2.5 py-1 text-xs ${
                    module.enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-100 text-slate-500"
                  }`}
                >
                  {module.enabled ? "Enabled" : "Enable"}
                </button>
              </div>
              <p className="text-sm text-slate-500">{module.description}</p>
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-slate-500">
                Screenshot Preview
              </div>
            </article>
          ))}
        </section>
      </div>
    </WorkspaceShell>
  )
}

