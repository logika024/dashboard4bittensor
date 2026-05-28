import { getTaostatsApiKey, getTaostatsBaseUrl } from "@/lib/taostats/config"

export class TaostatsError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message)
    this.name = "TaostatsError"
  }
}

/**
 * Auth scheme (verified by probe): the raw key goes in `Authorization` —
 * no `Bearer` prefix, no `X-API-Key` header.
 */
export async function taostatsFetch<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<T> {
  const apiKey = getTaostatsApiKey()
  if (!apiKey) {
    throw new TaostatsError(
      "TAOSTATS_API_KEY is not configured on the server",
      503,
    )
  }

  const url = new URL(path, `${getTaostatsBaseUrl()}/`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
  }

  // Free tier is 5 req/min, so cache aggressively. 120s = at most 2 cache
  // refreshes per minute for the whole app, leaving headroom for ad-hoc work.
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: apiKey,
    },
    next: { revalidate: 120 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => undefined)
    throw new TaostatsError(
      `taostats API error: ${res.status} ${res.statusText}`,
      res.status,
      body,
    )
  }

  return res.json() as Promise<T>
}

export interface TaostatsPagination {
  current_page: number
  per_page: number
  total_items: number
  total_pages: number
  next_page: number | null
  prev_page: number | null
}

export interface TaostatsList<T> {
  pagination: TaostatsPagination
  data: T[]
}
