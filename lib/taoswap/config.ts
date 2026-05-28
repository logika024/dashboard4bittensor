/** Taoswap public API (see https://taoswap.org — API host is api.taoswap.org). */
const DEFAULT_BASE_URL = "https://api.taoswap.org"

export function getTaoswapBaseUrl(): string {
  return process.env.TAOSWAP_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL
}
