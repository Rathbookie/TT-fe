const BASE_URL = process.env.NEXT_PUBLIC_API_URL

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem("access", access)
  localStorage.setItem("refresh", refresh)
}

export const clearTokens = (): void => {
  localStorage.removeItem("access")
  localStorage.removeItem("refresh")
}

export const getAccessToken = () => {
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
    const activeRole =
      typeof window !== "undefined"
        ? localStorage.getItem("activeRole")
        : null

    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(activeRole && { "X-Active-Role": activeRole }),
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

export const apiFetchJson = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const res = await apiFetch(endpoint, options)

  const contentType = res.headers.get("content-type")

  if (!res.ok) {
    const text = await res.text()
    console.error("API ERROR:", res.status)
    console.error("Response body:", text)
    throw new Error("API error")
  }

  if (!contentType?.includes("application/json")) {
    const text = await res.text()
    console.error("Expected JSON but received:", text)
    throw new Error("Invalid JSON response")
  }

  return res.json()
}


export const getTasks = async () => {
  const res = await apiFetch("/api/tasks/")

  if (!res.ok) {
    throw new Error("Failed to fetch tasks")
  }

  return res.json()
}
