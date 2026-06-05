export const PORTFOLIO_CHANNELS = [
  { id: "portfolio", label: "portfolio", path: "" },
  { id: "my-coldkeys", label: "my coldkeys", path: "my-coldkeys" },
  { id: "label-coldkeys", label: "label coldkeys", path: "label-coldkeys" },
] as const

export type PortfolioChannelId = (typeof PORTFOLIO_CHANNELS)[number]["id"]

export function getPortfolioChannel(pathname: string): PortfolioChannelId {
  if (!pathname.startsWith("/portfolio")) return "portfolio"

  const rest = pathname
    .slice("/portfolio".length)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
  if (!rest) return "portfolio"

  const segment = rest.split("/")[0] ?? ""
  const match = PORTFOLIO_CHANNELS.find((c) => c.path === segment)
  return match?.id ?? "portfolio"
}

export function portfolioChannelHref(channel: PortfolioChannelId): string {
  const entry = PORTFOLIO_CHANNELS.find((c) => c.id === channel)
  if (!entry || !entry.path) return "/portfolio"
  return `/portfolio/${entry.path}`
}
