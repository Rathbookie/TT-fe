let accessToken: string | null = null
let refreshToken: string | null = null

export const setTokens = (access: string, refresh: string): void => {
  accessToken = access
  refreshToken = refresh
}

const refreshAccessToken = async (): Promise<void> => {
  if (!refreshToken) throw new Error("No refresh token")

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/token/refresh/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    }
  )

  if (!res.ok) {
    accessToken = null
    refreshToken = null
    throw new Error("Refresh failed")
  }

  const data = await res.json()
  accessToken = data.access
}

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers,
      },
    }
  )

  if (res.status === 401) {
    await refreshAccessToken()
    return apiFetch(endpoint, options)
  }

  return res
}
