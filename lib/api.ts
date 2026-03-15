const BASE_URL = process.env.NEXT_PUBLIC_API_URL

const normalizeRoleHeader = (role: string | null) => {
  if (!role) return null
  return role.trim().toUpperCase().replaceAll(" ", "_")
}

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem("access", access)
  localStorage.setItem("refresh", refresh)
}

export const clearTokens = (): void => {
  localStorage.removeItem("access")
  localStorage.removeItem("refresh")
}

const handleAuthExpired = () => {
  if (typeof window === "undefined") return
  clearTokens()
  localStorage.removeItem("activeRole")
  if (window.location.pathname !== "/login") {
    window.location.assign("/login")
  }
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
  if (!refresh) {
    handleAuthExpired()
    return null
  }

  const res = await fetch(`${BASE_URL}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    handleAuthExpired()
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
  const access = getAccessToken()

  const makeRequest = async (token: string | null) => {
    const activeRole =
      typeof window !== "undefined"
        ? localStorage.getItem("activeRole")
        : null
    const normalizedActiveRole = normalizeRoleHeader(activeRole)

    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(normalizedActiveRole && { "X-Active-Role": normalizedActiveRole }),
        ...options.headers,
      },
    })
  }

  let res = await makeRequest(access)

  if (res.status === 401) {
    const newAccess = await refreshAccessToken()
    if (!newAccess) {
      handleAuthExpired()
      return res
    }
    res = await makeRequest(newAccess)
    if (res.status === 401) {
      handleAuthExpired()
    }
  }

  return res
}

export const apiFetchJson = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const method = String(options.method || "GET").toUpperCase()
  const retryable = method === "GET" || method === "HEAD" || method === "OPTIONS"

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

  const parseThrottleMs = (retryAfterHeader: string | null, bodyText: string) => {
    if (retryAfterHeader) {
      const sec = Number.parseInt(retryAfterHeader, 10)
      if (Number.isFinite(sec) && sec > 0) return sec * 1000
    }
    const match = bodyText.match(/(\d+)\s*seconds?/i)
    if (match) {
      const sec = Number.parseInt(match[1], 10)
      if (Number.isFinite(sec) && sec > 0) return sec * 1000
    }
    return null
  }

  let res = await apiFetch(endpoint, options)
  if (retryable && res.status === 429) {
    for (let attempt = 0; attempt < 3 && res.status === 429; attempt += 1) {
      const retryAfter = res.headers.get("retry-after")
      const throttleBody = await res.text()
      const waitMs =
        parseThrottleMs(retryAfter, throttleBody) ||
        Math.min(1500 * (attempt + 1), 5000)
      await sleep(Math.min(waitMs, 30000))
      res = await apiFetch(endpoint, options)
    }
  }

  const contentType = res.headers.get("content-type")

  if (!res.ok) {
    const text = await res.text()
    if (res.status !== 429) {
      console.error("API ERROR:", res.status)
      console.error("Response body:", text)
    }
    let detail = text
    try {
      const parsed = JSON.parse(text) as { detail?: string; error?: string }
      detail = parsed.detail || parsed.error || text
    } catch {
      // keep raw text
    }
    throw new Error(`API ${res.status}: ${detail || "Request failed"}`)
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
