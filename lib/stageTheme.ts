const stagePalette = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-violet-100 text-violet-700 border-violet-200",
]

export function normalizeHexColor(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) return normalized.toUpperCase()
  return null
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  return { r, g, b }
}

function hashString(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function stageTone(
  stageName: string | null | undefined,
  isTerminal = false
) {
  const name = String(stageName || "").trim()
  if (!name) return "bg-neutral-100 text-neutral-700 border-neutral-200"
  if (isTerminal) return "bg-emerald-100 text-emerald-700 border-emerald-200"
  const idx = hashString(name.toLowerCase()) % stagePalette.length
  return stagePalette[idx]
}

export function stageToneStyle(color: string | null | undefined) {
  const rgb = color ? hexToRgb(color) : null
  if (!rgb) return undefined
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
    color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  }
}

export function formatStageName(value: string | null | undefined) {
  if (!value) return "—"
  return value.replaceAll("_", " ").trim()
}
