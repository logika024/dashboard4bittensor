import { taoswapFetch } from "@/lib/taoswap/client"

interface TaoswapDistributionNeuron {
  coldkey: string
  ip?: string | null
  status: string
  is_validator: boolean
  type?: string | null
}

interface TaoswapMetagraphDistributionResponse {
  neurons: TaoswapDistributionNeuron[]
}

export interface MinerDistributionRow {
  key: string
  minerCount: number
}

export interface MinerDistribution {
  byColdkey: MinerDistributionRow[]
  byIp: MinerDistributionRow[]
  totalMiners: number
  minersWithKnownIp: number
}

function isMiner(n: TaoswapDistributionNeuron): boolean {
  if (n.is_validator || n.type === "validator") return false
  return n.status === "ACTIVE"
}

function aggregateCounts(
  entries: string[],
): MinerDistributionRow[] {
  const counts = new Map<string, number>()
  for (const key of entries) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([key, minerCount]) => ({ key, minerCount }))
    .sort((a, b) => b.minerCount - a.minerCount || a.key.localeCompare(b.key))
}

/**
 * Miner counts grouped by coldkey and by IP from taoswap metagraph.
 * Only active non-validator neurons are counted as miners.
 */
export async function getMinerDistribution(
  netuid: number,
): Promise<MinerDistribution> {
  const res = await taoswapFetch<TaoswapMetagraphDistributionResponse>(
    `/metagraph/${netuid}/`,
    undefined,
    { revalidate: 120 },
  )

  const miners = (res.neurons ?? []).filter(isMiner)

  const byColdkey = aggregateCounts(miners.map((n) => n.coldkey))

  const minersWithIp = miners.filter((n) => n.ip?.trim())
  const byIp = aggregateCounts(
    minersWithIp.map((n) => n.ip!.trim()),
  )

  return {
    byColdkey,
    byIp,
    totalMiners: miners.length,
    minersWithKnownIp: minersWithIp.length,
  }
}
