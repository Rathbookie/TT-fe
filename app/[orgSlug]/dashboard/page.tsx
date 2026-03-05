"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiFetchJson } from "@/lib/api"

type Props = {
  params: {
    orgSlug: string
  }
}

type DivisionItem = {
  slug: string
}

type CollectionResponse<T> = T[] | { results?: T[] }

const extractResults = <T,>(payload: CollectionResponse<T>): T[] =>
  Array.isArray(payload) ? payload : payload.results || []

export default function OrgDashboardRedirectPage({ params }: Props) {
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const payload = await apiFetchJson<CollectionResponse<DivisionItem>>(
          `/api/${params.orgSlug}/divisions/`
        )
        const divisions = extractResults(payload)
        if (!mounted) return
        if (divisions.length > 0) {
          router.replace(`/${params.orgSlug}/divisions/${divisions[0].slug}`)
          return
        }
      } catch {
        // fall through to tasks
      }
      if (mounted) {
        router.replace(`/${params.orgSlug}/tasks`)
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [params.orgSlug, router])

  return null
}
