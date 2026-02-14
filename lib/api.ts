const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem("access", access)
  localStorage.setItem("refresh", refresh)
}

const getAccessToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access")
}

const getRefreshToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("refresh")
}

const refreshAccessToken = async (): Promise<string | null> => {
  const refresh = getRefreshToken()
  if (!refresh) return null

  const res = await fetch(`${BASE_URL}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    localStorage.removeItem("access")
    localStorage.removeItem("refresh")
    return null
  }

  const data = await res.json()
  localStorage.setItem("access", data.access)
  return data.access
}

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  let access = getAccessToken()

  const makeRequest = async (token: string | null) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })
  }

  let res = await makeRequest(access)

  if (res.status === 401) {
    const newAccess = await refreshAccessToken()
    if (!newAccess) return res
    res = await makeRequest(newAccess)
  }

  return res
}

export const getTasks = async () => {
  const res = await apiFetch("/api/tasks/")

  if (!res.ok) {
    throw new Error("Failed to fetch tasks")
  }

  return res.json()
}
