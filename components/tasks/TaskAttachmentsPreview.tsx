"use client"

type Attachment = {
  id: number
  file: string
  original_name: string
}

interface Props {
  attachments: Attachment[]
}

export default function TaskAttachmentsPreview({
  attachments,
}: Props) {
  return (
    <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        Attachments
      </p>

      {attachments.length === 0 && (
        <p className="text-sm text-neutral-400">
          No attachments
        </p>
      )}

      <div className="space-y-2">
        {attachments.map((file) => (
          <div
            key={file.id}
            className="border border-neutral-200 rounded-md px-3 py-2"
          >
            <a
              href={file.file}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 underline hover:text-blue-800 break-words block"
            >
              {file.original_name}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
