type Props = {
  count: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function PaginationFooter({
  count,
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  const start = (currentPage - 1) * 20 + 1
  const end = Math.min(currentPage * 20, count)

  return (
    <div className="flex items-center justify-between border-t px-6 py-4 text-sm text-neutral-600">
      <div>
        Showing {start}–{end} of {count} tasks
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-9 w-9 rounded-md border bg-white disabled:opacity-40"
        >
          ‹
        </button>

        {Array.from({ length: totalPages }).map((_, i) => {
          const page = i + 1
          const active = page === currentPage

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-9 w-9 rounded-md border text-sm ${
                active
                  ? "border-black bg-neutral-200"
                  : "bg-white hover:bg-neutral-100"
              }`}
            >
              {page}
            </button>
          )
        })}

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-9 w-9 rounded-md border bg-white disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  )
}
