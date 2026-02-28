"use client"

import { apiFetch } from "@/lib/api"
import { TaskAttachment } from "@/types/task"

type Props = {
  taskId?: number
  isCreate: boolean
  isTerminal: boolean
  existingAttachments: TaskAttachment[]
  setExistingAttachments: React.Dispatch<
    React.SetStateAction<TaskAttachment[]>
  >
  files: File[]
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
}

export default function TaskAttachments({
  taskId,
  isCreate,
  isTerminal,
  existingAttachments,
  setExistingAttachments,
  files,
  setFiles,
}: Props) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        Attachments
      </label>

      {/* Existing Attachments */}
      {!isCreate && existingAttachments.length > 0 && (
        <div className="space-y-2">
          {existingAttachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between border border-neutral-200 rounded-md px-3 py-2 text-sm"
            >
              <a
                href={file.file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {file.original_name}
              </a>

              {!isTerminal && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!taskId) return

                    const res = await apiFetch(
                      `/api/tasks/${taskId}/attachments/${file.id}/`,
                      { method: "DELETE" }
                    )

                    if (res.ok) {
                      setExistingAttachments((prev) =>
                        prev.filter((a) => a.id !== file.id)
                      )
                    }
                  }}
                  className="text-red-600 text-xs hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between border border-blue-200 bg-blue-50 rounded-md px-3 py-2 text-sm"
            >
              <span className="text-blue-700">
                {file.name} (Pending upload)
              </span>

              <button
                type="button"
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter((_, i) => i !== index)
                  )
                }
                className="text-red-600 text-xs hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Pending Files */}
      {!isCreate && !isTerminal && files.length > 0 && taskId && (
        <button
          type="button"
          onClick={async () => {
            for (const file of files) {
              const formData = new FormData()
              formData.append("file", file)

              const res = await apiFetch(
                `/api/tasks/${taskId}/attachments/`,
                {
                  method: "POST",
                  body: formData,
                }
              )

              if (res.ok) {
                const data = (await res.json()) as TaskAttachment
                setExistingAttachments((prev) => [
                  ...prev,
                  data,
                ])
              }
            }

            setFiles([])
          }}
          className="px-3 py-1 text-sm bg-black text-white rounded-md"
        >
          Upload Files
        </button>
      )}

      {/* Add Files */}
      {!isTerminal && (
        <label className="text-blue-600 underline cursor-pointer text-sm">
          Add files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const fileList = e.currentTarget.files
              if (!fileList) return

              const newFiles = Array.from(fileList)
              setFiles((prev) => [...prev, ...newFiles])

              e.currentTarget.value = ""
            }}
          />
        </label>
      )}
    </div>
  )
}
