import { formatStageName } from "@/lib/stageTheme"

export const formatWorkflowLabel = (value: string | null | undefined) => {
  return formatStageName(value)
}

export const getStatusLabel = (status: string) => {
  return formatWorkflowLabel(status)
}
