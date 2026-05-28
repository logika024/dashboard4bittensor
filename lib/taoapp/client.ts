import { getTaoAppApiKey, getTaoAppBaseUrl } from "@/lib/taoapp/config"

export class TaoAppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message)
    this.name = "TaoAppError"
  }
}

export async function taoAppFetch<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<T> {
  const apiKey = getTaoAppApiKey()
  if (!apiKey) {
    throw new TaoAppError(
      "TAOAPP_API_KEY is not configured on the server",
      503,
    )
  }

  const url = new URL(path, `${getTaoAppBaseUrl()}/`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => undefined)
    throw new TaoAppError(
      `TAO.app API error: ${res.status} ${res.statusText}`,
      res.status,
      body,
    )
  }

  return res.json() as Promise<T>
}
