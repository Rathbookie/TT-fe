"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { Task } from "@/types/task"

type Props = {
  task: Task
  onStatusChange: (updatedTask: Task) => void
}

export default function ReceiverProgressUpload({
  task,
  onStatusChange,
}: Props) {
  const [files, setFiles] = useState<File[]>([])
  const existing = task.attachments.filter(
    (a) => a.type === "SUBMISSION"
  )
  const [loading, setLoading] = useState(false)
  

  async function uploadFiles() {
    if (!files.length) return

    setLoading(true)

    let updatedTask = task

    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiFetch(
        `/api/tasks/${task.id}/attachments/`,
        {
          method: "POST",
          body: formData,
        }
      )

      if (res.ok) {
        const data = await res.json()

        updatedTask = {
          ...updatedTask,
          attachments: [...(updatedTask.attachments || []), data],
        }
      }
    }

    onStatusChange(updatedTask)

    setFiles([])
    setLoading(false)
  }

  return (
    <div className="bg-neutral-50 rounded-lg p-6 space-y-4">

      <p className="text-xs uppercase tracking-wide text-neutral-500">
        Progress Submission
      </p>

      {/* Existing Submission Files */}
      {existing.length > 0 && (
        <div className="space-y-2">
          {existing.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between border border-neutral-200 bg-white rounded-md px-3 py-2 text-sm"
            >
              <a
                href={file.file}
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                {file.original_name}
              </a>

              <button
                onClick={async () => {
                  await apiFetch(
                    `/api/tasks/${task.id}/attachments/${file.id}/`,
                    { method: "DELETE" }
                  )

                  onStatusChange({
                    ...task,
                    attachments: task.attachments.filter(
                      (a) => a.id !== file.id
                    ),
                  })
                }}
                className="text-neutral-400 hover:text-red-600 text-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Choose + Save Row */}
      <div className="flex items-center justify-between">

        <label className="text-blue-600 underline cursor-pointer text-sm">
          Choose Files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (!e.target.files) return
              setFiles(Array.from(e.target.files))
            }}
          />
        </label>

        {files.length > 0 && (
          <button
            onClick={uploadFiles}
            disabled={loading}
            className="px-4 py-1.5 text-sm bg-black text-white rounded-md hover:opacity-90 transition"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        )}
      </div>



    </div>
  )




}
