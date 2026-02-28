"use client"

type Props = {
  isTerminal: boolean
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
}

export default function TaskTitleDescription({
  isTerminal,
  title,
  setTitle,
  description,
  setDescription,
}: Props) {
  return (
    <>
      {/* Title */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Task Name *</label>
        <input
          disabled={isTerminal}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Description</label>
        <textarea
          disabled={isTerminal}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black"
        />
      </div>
    </>
  )
}
