export const SUBNET_CHANNELS = [
  { id: "metagraph", label: "metagraph", path: "" },
  { id: "charts", label: "charts", path: "charts" },
  { id: "registration", label: "registration", path: "registration" },
  { id: "distribution", label: "distribution", path: "distribution" },
  { id: "weights", label: "weights", path: "weights" },
  { id: "validators", label: "validators", path: "validators" },
] as const

export type SubnetChannelId = (typeof SUBNET_CHANNELS)[number]["id"]

export function parseNetuid(raw: string): number | null {
  const netuid = Number.parseInt(raw, 10)
  if (!Number.isInteger(netuid) || String(netuid) !== raw || netuid < 0) {
    return null
  }
  return netuid
}

export function getSubnetChannel(
  pathname: string,
  netuid: number,
): SubnetChannelId {
  const prefix = `/subnet/${netuid}`
  if (!pathname.startsWith(prefix)) return "metagraph"

  const rest = pathname.slice(prefix.length).replace(/^\//, "")
  if (!rest) return "metagraph"

  const match = SUBNET_CHANNELS.find((c) => c.path === rest)
  return match?.id ?? "metagraph"
}

export function subnetChannelHref(netuid: number, channel: SubnetChannelId): string {
  const entry = SUBNET_CHANNELS.find((c) => c.id === channel)
  if (!entry || !entry.path) return `/subnet/${netuid}`
  return `/subnet/${netuid}/${entry.path}`
}
