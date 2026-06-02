import { getTaoswapBaseUrl } from "@/lib/taoswap/config"

export class TaoswapError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message)
    this.name = "TaoswapError"
  }
}

export async function taoswapFetch<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
  options?: { revalidate?: number },
): Promise<T> {
  const url = new URL(path, `${getTaoswapBaseUrl()}/`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
  }

  // revalidate=0 → `cache: "no-store"`, used for endpoints with values that
  // tick every block (e.g. metagraph's `blocks_since_epoch`). Without this,
  // refreshing the page within the 120s cache window would replay the same
  // stale snapshot and the live countdown would jump back to its start.
  const cacheOpts =
    options?.revalidate === 0
      ? { cache: "no-store" as const }
      : { next: { revalidate: options?.revalidate ?? 300 } }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    ...cacheOpts,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => undefined)
    throw new TaoswapError(
      `Taoswap API error: ${res.status} ${res.statusText}`,
      res.status,
      body,
    )
  }

  return res.json() as Promise<T>
}
