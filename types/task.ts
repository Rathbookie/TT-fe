export type Task = {
  id: number
  title: string
  description: string
  status: "todo" | "in_progress" | "done"
  assigned_to: number | null
  version: number
  created_at: string
  updated_at: string
}
