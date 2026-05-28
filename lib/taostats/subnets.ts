import { taostatsFetch, type TaostatsList } from "@/lib/taostats/client"

/**
 * Raw row from GET /api/dtao/pool/latest/v1.
 * Numeric values come back as strings — taostats uses string-encoded numbers
 * for chain-scale precision. Parse with parseFloat at the boundary.
 */
interface SubnetPoolRaw {
  netuid: number
  name: string | null
  symbol: string | null
  price: string
  /** Market cap in rao (1 TAO = 1e9 rao). */
  market_cap: string
  /**
   * Price change as a fraction (e.g. "-0.0092" === -0.92%). Verified by probe
   * against the taostats dashboard rendering.
   */
  price_change_1_hour: string
  price_change_1_day: string
  price_change_1_week: string
  price_change_1_month: string
}

/**
 * Raw row from GET /api/subnet/latest/v1.
 * `projected_emission` is the daily emission share as a fraction
 * (e.g. "0.0679" === 6.79%).
 */
interface SubnetMetadataRaw {
  netuid: number
  projected_emission: string
}

/**
 * Raw row from GET /api/subnet/identity/v1.
 * Subnet owners self-publish identity; many fields may be null.
 */
interface SubnetIdentityRaw {
  netuid: number
  subnet_name: string | null
  logo_url: string | null
}

/** Normalized row consumed by the dashboard table. */
export interface SubnetScreenerRow {
  netuid: number
  name: string
  /** Subnet logo URL (may be null when the owner hasn't set one). */
  logoUrl: string | null
  /** Spot alpha price in TAO. */
  price: number
  /** Market cap in TAO (already converted from rao). */
  marketCap: number
  /** Daily emission share (fraction; 0.0679 === 6.79%). */
  emission_pct: number
  price_1h_pct_change: number
  price_1d_pct_change: number
  price_7d_pct_change: number
  price_1m_pct_change: number
}

const RAO_PER_TAO = 1_000_000_000

function num(value: string | null | undefined): number {
  if (value == null) return 0
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Fetches the full subnet list (currently ~129) with price, emission, logo,
 * and 1h/1d/1w/1m change. Three parallel API calls per cache miss
 * (revalidate 120s) — well inside the free-tier 5 req/min budget.
 */
export async function getSubnetScreener(): Promise<SubnetScreenerRow[]> {
  const [pools, meta, identity] = await Promise.all([
    taostatsFetch<TaostatsList<SubnetPoolRaw>>("/api/dtao/pool/latest/v1", {
      limit: 200,
    }),
    taostatsFetch<TaostatsList<SubnetMetadataRaw>>("/api/subnet/latest/v1", {
      limit: 200,
    }),
    taostatsFetch<TaostatsList<SubnetIdentityRaw>>(
      "/api/subnet/identity/v1",
      { limit: 200 },
    ),
  ])

  const emissionByNetuid = new Map<number, number>()
  for (const row of meta.data) {
    emissionByNetuid.set(row.netuid, num(row.projected_emission))
  }

  const identityByNetuid = new Map<number, SubnetIdentityRaw>()
  for (const row of identity.data) {
    identityByNetuid.set(row.netuid, row)
  }

  return pools.data.map((p) => {
    const id = identityByNetuid.get(p.netuid)
    return {
      netuid: p.netuid,
      // Prefer pool's `name`, then identity's `subnet_name`, then a fallback.
      name: p.name?.trim() || id?.subnet_name?.trim() || `Subnet ${p.netuid}`,
      logoUrl: id?.logo_url?.trim() || null,
      price: num(p.price),
      marketCap: num(p.market_cap) / RAO_PER_TAO,
      emission_pct: emissionByNetuid.get(p.netuid) ?? 0,
      price_1h_pct_change: num(p.price_change_1_hour),
      price_1d_pct_change: num(p.price_change_1_day),
      price_7d_pct_change: num(p.price_change_1_week),
      price_1m_pct_change: num(p.price_change_1_month),
    }
  })
}
