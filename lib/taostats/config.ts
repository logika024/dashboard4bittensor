const DEFAULT_BASE_URL = "https://api.taostats.io"

export function getTaostatsBaseUrl(): string {
  return (
    process.env.TAOSTATS_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL
  )
}

export function getTaostatsApiKey(): string | undefined {
  const key = process.env.TAOSTATS_API_KEY?.trim()
  return key || undefined
}
