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

// ---------------------------------------------------------------------------
// Subnet detail page: per-netuid hyperparams + metagraph
// ---------------------------------------------------------------------------

/** Subset of fields we surface in the "Settings & Metrics" grid. */
export interface SubnetHyperparams {
  netuid: number
  // Settings & Metrics (visible in taostats UI)
  maxNeurons: number
  activeKeys: number
  validators: number
  activeValidators: number
  activeMiners: number
  activeDual: number
  maxValidators: number
  blocksUntilNextEpoch: number
  /** Mech-emission split fractions, e.g. ["0", "1"]. */
  mechEmissionSplit: string[]
  mechCount: number
  // Extras worth showing alongside the screenshot's set
  tempo: number
  immunityPeriod: number
  registrationAllowed: boolean
  weightsVersion: string
}

interface SubnetHyperparamsRaw {
  netuid: number
  max_neurons: number
  active_keys: number
  validators: number
  active_validators: number
  active_miners: number
  active_dual: number
  max_validators: number
  blocks_until_next_epoch: number
  mech_emission_split: string[]
  mech_count: number
  tempo: number
  immunity_period: number
  registration_allowed: boolean
  weights_version: string
}

export async function getSubnetHyperparams(
  netuid: number,
): Promise<SubnetHyperparams | null> {
  const res = await taostatsFetch<TaostatsList<SubnetHyperparamsRaw>>(
    "/api/subnet/latest/v1",
    { netuid, limit: 1 },
  )
  const row = res.data[0]
  if (!row) return null
  return {
    netuid: row.netuid,
    maxNeurons: row.max_neurons,
    activeKeys: row.active_keys,
    validators: row.validators,
    activeValidators: row.active_validators,
    activeMiners: row.active_miners,
    activeDual: row.active_dual,
    maxValidators: row.max_validators,
    blocksUntilNextEpoch: row.blocks_until_next_epoch,
    mechEmissionSplit: row.mech_emission_split,
    mechCount: row.mech_count,
    tempo: row.tempo,
    immunityPeriod: row.immunity_period,
    registrationAllowed: row.registration_allowed,
    weightsVersion: row.weights_version,
  }
}

/**
 * Normalized metagraph row. Numeric chain values stay as strings — many are
 * 18+ digits and would lose precision through JS Number. UI parses with
 * parseFloat where display precision is enough; rao→TAO at the boundary
 * uses Number too (safe up to ~9e15 = 9 petarao).
 */
export interface MetagraphNeuron {
  uid: number
  hotkey: { ss58: string; hex: string }
  coldkey: { ss58: string; hex: string }
  active: boolean
  validatorPermit: boolean
  /** Subnet-local alpha stake, in rao (α units). */
  alphaStake: string
  /** Root subnet TAO stake delegated to this hotkey, in rao (τ units). */
  rootStake: string
  /** Sum of alpha + root-stake-as-alpha, in rao (α units). */
  totalAlphaStake: string
  trust: string
  validatorTrust: string
  consensus: string
  incentive: string
  dividends: string
  /** Emission this epoch, in rao. */
  emission: string
  /** Daily total reward in alpha (rao). */
  dailyReward: string
  /** Daily total reward converted to TAO (rao). */
  dailyTotalRewardsAsTao: string
  rank: number
  isImmunityPeriod: boolean
  isChildKey: boolean
  isOwnerHotkey: boolean
}

interface MetagraphNeuronRaw {
  uid: number
  hotkey: { ss58: string; hex: string }
  coldkey: { ss58: string; hex: string }
  active: boolean
  validator_permit: boolean
  stake: string
  alpha_stake: string | null
  root_stake: string | null
  total_alpha_stake: string | null
  trust: string
  validator_trust: string
  consensus: string
  incentive: string
  dividends: string
  emission: string
  daily_reward: string | null
  daily_total_rewards_as_tao: string | null
  rank: number
  is_immunity_period: boolean
  is_child_key: boolean
  is_owner_hotkey: boolean
}

/**
 * Full metagraph for a subnet — up to 256 neurons in one call (taostats
 * `limit` max is 1024). We paginate client-side at 15/page from the cached
 * 120s result, so flipping pages is instant and free.
 */
export async function getSubnetMetagraph(
  netuid: number,
): Promise<MetagraphNeuron[]> {
  const res = await taostatsFetch<TaostatsList<MetagraphNeuronRaw>>(
    "/api/metagraph/latest/v1",
    { netuid, limit: 1024, order: "uid_asc" },
  )
  return res.data.map((r) => ({
    uid: r.uid,
    hotkey: r.hotkey,
    coldkey: r.coldkey,
    active: r.active,
    validatorPermit: r.validator_permit,
    alphaStake: r.alpha_stake ?? "0",
    rootStake: r.root_stake ?? "0",
    totalAlphaStake: r.total_alpha_stake ?? "0",
    trust: r.trust,
    validatorTrust: r.validator_trust,
    consensus: r.consensus,
    incentive: r.incentive,
    dividends: r.dividends,
    emission: r.emission,
    dailyReward: r.daily_reward ?? "0",
    dailyTotalRewardsAsTao: r.daily_total_rewards_as_tao ?? "0",
    rank: r.rank,
    isImmunityPeriod: r.is_immunity_period,
    isChildKey: r.is_child_key,
    isOwnerHotkey: r.is_owner_hotkey,
  }))
}
