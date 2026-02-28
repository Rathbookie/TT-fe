import { formatStageName } from "@/lib/stageTheme"
import { KNOWN_STATUS_VALUES } from "@/lib/statusConfig"

export const formatWorkflowLabel = (value: string | null | undefined) => {
  return formatStageName(value)
}

export const getStatusLabel = (status: string) => {
  if (KNOWN_STATUS_VALUES.includes(status as (typeof KNOWN_STATUS_VALUES)[number])) {
    return formatWorkflowLabel(status)
  }
  return formatWorkflowLabel(status)
}

export function stageNameToStatusValue(stageName: string) {
  const normalized = stageName.trim().toUpperCase().replaceAll(" ", "_")
  if (KNOWN_STATUS_VALUES.includes(normalized as (typeof KNOWN_STATUS_VALUES)[number])) {
    return normalized
  }
  return null
}
