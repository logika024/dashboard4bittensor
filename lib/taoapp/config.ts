const DEFAULT_BASE_URL = "https://api.tao.app"

export function getTaoAppBaseUrl(): string {
  return process.env.TAOAPP_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL
}

export function getTaoAppApiKey(): string | undefined {
  const key = process.env.TAOAPP_API_KEY?.trim()
  return key || undefined
}
