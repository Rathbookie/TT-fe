"use client"

import { Task } from "@/types/task"

type Props = {
  task: Task
}

export default function CreatorSubmissionView({ task }: Props) {
  const submissions = task.attachments.filter(
    (a) => a.type === "SUBMISSION"
  )

  if (submissions.length === 0) return null

  return (
    <div className="bg-neutral-50 rounded-lg p-6 space-y-4">

      <p className="text-xs uppercase tracking-wide text-neutral-500">
        Progress Submission
      </p>

      <div className="space-y-2">
        {submissions.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between border border-neutral-200 bg-white rounded-md px-3 py-2 text-sm"
          >
            <a
              href={file.file}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {file.original_name}
            </a>
          </div>
        ))}
      </div>

    </div>
  )
}
