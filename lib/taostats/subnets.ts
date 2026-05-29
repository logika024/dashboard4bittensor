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
   * Price change as an already-percent value (e.g. "-0.92" === -0.92%).
   * Confirmed against taostats UI: their endpoint returns percent units
   * directly, not fractions. We normalize to fractions at the boundary
   * (divide by 100) so the formatter can multiply by 100 uniformly.
   */
  price_change_1_hour: string
  price_change_1_day: string
  price_change_1_week: string
  price_change_1_month: string
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

/**
 * Raw row from GET /api/subnet/latest/v1.
 * `projected_emission` is the chain's forward-looking emission share for
 * this subnet under current epoch rules (fraction; 0.0271 === 2.71%).
 */
interface SubnetMetadataRaw {
  netuid: number
  projected_emission: string
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
  /**
   * Emission share (fraction). Computed as MIN(spot_price, projected_emission)
   * to match taostats's "Emission" column. The chain caps each subnet's
   * actual emission at whichever is lower: market-implied (spot price) or
   * chain-projected (epoch rules). Spot above projection → use projection;
   * projection above spot → use spot. Verified by probing 8 subnets against
   * taostats's live UI.
   */
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
 * Fetches the full subnet list with price, emission, logo, and 1h/1d/1w/1m
 * change. Root subnet (netuid 0) is excluded. Three parallel API calls per
 * cache miss (revalidate 120s) — inside the free-tier 5 req/min budget.
 */
export async function getSubnetScreener(): Promise<SubnetScreenerRow[]> {
  const [pools, identity, meta] = await Promise.all([
    taostatsFetch<TaostatsList<SubnetPoolRaw>>("/api/dtao/pool/latest/v1", {
      limit: 200,
    }),
    taostatsFetch<TaostatsList<SubnetIdentityRaw>>(
      "/api/subnet/identity/v1",
      { limit: 200 },
    ),
    taostatsFetch<TaostatsList<SubnetMetadataRaw>>(
      "/api/subnet/latest/v1",
      { limit: 200 },
    ),
  ])

  const identityByNetuid = new Map<number, SubnetIdentityRaw>()
  for (const row of identity.data) identityByNetuid.set(row.netuid, row)

  const projectedByNetuid = new Map<number, number>()
  for (const row of meta.data) {
    projectedByNetuid.set(row.netuid, num(row.projected_emission))
  }

  return pools.data
    .filter((p) => p.netuid !== 0) // hide root subnet
    .map((p) => {
      const id = identityByNetuid.get(p.netuid)
      const price = num(p.price)
      const projected = projectedByNetuid.get(p.netuid) ?? price
      return {
        netuid: p.netuid,
        // Prefer pool's `name`, then identity's `subnet_name`, then a fallback.
        name: p.name?.trim() || id?.subnet_name?.trim() || `Subnet ${p.netuid}`,
        logoUrl: id?.logo_url?.trim() || null,
        price,
        marketCap: num(p.market_cap) / RAO_PER_TAO,
        emission_pct: Math.min(price, projected),
        price_1h_pct_change: num(p.price_change_1_hour) / 100,
        price_1d_pct_change: num(p.price_change_1_day) / 100,
        price_7d_pct_change: num(p.price_change_1_week) / 100,
        price_1m_pct_change: num(p.price_change_1_month) / 100,
      }
    })
}
