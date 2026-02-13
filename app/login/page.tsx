"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"

export default function Page() {
  const { login } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await login(email, password)
      router.push("/")
    } catch {
      setError("Invalid credentials")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border p-8">
        <h1 className="mb-6 text-lg font-medium">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-300"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-sm text-neutral-500">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 py-2 text-sm text-white hover:bg-neutral-800 transition"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
