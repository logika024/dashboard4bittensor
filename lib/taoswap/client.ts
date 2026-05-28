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
): Promise<T> {
  const url = new URL(path, `${getTaoswapBaseUrl()}/`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
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
