import type { Role } from "./statusConfig"

export function canCreateTask(role: Role | null): boolean {
  return role === "TASK_CREATOR" || role === "ADMIN"
}

export function canApproveTask(role: Role | null): boolean {
  return role === "TASK_CREATOR" || role === "ADMIN"
}

export function isAdmin(role: Role | null): boolean {
  return role === "ADMIN"
}
