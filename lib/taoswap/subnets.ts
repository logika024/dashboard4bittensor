import { taoswapFetch } from "@/lib/taoswap/client"

// ---------------------------------------------------------------------------
// Raw shapes returned by taoswap's API (subset of fields we actually consume).
// ---------------------------------------------------------------------------

interface TaoswapSubnetIdentity {
  name?: string | null
  url?: string | null
  github?: string | null
  image?: string | null
  discord?: string | null
  description?: string | null
}

interface TaoswapSubnetRaw {
  id: number
  symbol: string | null
  name: string | null
  identity: TaoswapSubnetIdentity | null
  price: number
  moving_price: number
  /** Percent units (e.g. 5.49 means +5.49%). We convert to fractions at the boundary. */
  price_evolution_h_1: number
  price_evolution_h_24: number
  price_evolution_d_7: number
  price_evolution_d_30: number
  /** Market cap in TAO (already converted from rao). */
  market_cap: number
  /** Percent units (e.g. 4.40 means 4.40%). */
  emission_percent: number
  tempo: number
  blocks_since_epoch: number
  mechanism_count: number
  mechanism_emission_split: number[]
  active_miners: number
}

interface TaoswapSubnetListResponse {
  results: TaoswapSubnetRaw[]
}

interface TaoswapNeuronRaw {
  uid: number
  mechid: number
  /** Total alpha-equivalent stake in TAO units (already converted from rao). */
  stake: number
  vtrust: number
  consensus: number
  dividends: number
  incentive: number
  emission: number
  /** Daily reward in TAO. */
  daily_rewards: number
  /** Daily reward in alpha. */
  daily_rewards_alpha: number
  coldkey: string
  hotkey: string
  identity: TaoswapSubnetIdentity | null
  status: string // "ACTIVE" | "INACTIVE" | ...
  is_validator: boolean
  is_owner: boolean
}

interface TaoswapMetagraphResponse {
  subnet: TaoswapSubnetRaw
  count: number
  neurons: TaoswapNeuronRaw[]
}

interface TaoswapBlock {
  id: number
  timestamp: string
}

interface TaoswapBlocksResponse {
  results: Record<string, TaoswapBlock>
}

/**
 * Fresh chain block number. Taoswap caches per-subnet `blocks_since_epoch`
 * server-side for an unknown window (~minutes), so deriving "blocks until
 * next epoch" from there gives a stuck snapshot. The `/blocks/` endpoint
 * does update per block — we use it as the canonical "now" reference.
 */
async function getCurrentChainBlock(): Promise<number | null> {
  try {
    const res = await taoswapFetch<TaoswapBlocksResponse>(
      "/blocks/",
      { ordering: "-id", limit: 1 },
      { revalidate: 0 },
    )
    const ids = Object.keys(res.results ?? {})
      .map((k) => Number.parseInt(k, 10))
      .filter((n) => Number.isFinite(n))
    if (ids.length === 0) return null
    return Math.max(...ids)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Normalized shapes consumed by the UI. Field names mirror the previous
// taostats-backed types so call sites stay unchanged after the swap.
// ---------------------------------------------------------------------------

export interface SubnetScreenerRow {
  netuid: number
  name: string
  logoUrl: string | null
  /** Spot alpha price in TAO. */
  price: number
  /** Market cap in TAO. */
  marketCap: number
  /** Emission share as a fraction (0.0440 === 4.40%). */
  emission_pct: number
  /** Price changes as fractions (0.05 === +5%). */
  price_1h_pct_change: number
  price_1d_pct_change: number
  price_7d_pct_change: number
  price_1m_pct_change: number
}

export interface SubnetHyperparams {
  netuid: number
  maxNeurons: number
  activeKeys: number
  validators: number
  activeValidators: number
  activeMiners: number
  /** Blocks remaining at the moment the data was fetched. Decrement client-side. */
  blocksUntilNextEpoch: number
  mechEmissionSplit: string[]
  mechCount: number
  tempo: number
}

export interface MetagraphNeuron {
  uid: number
  /** SS58 address. */
  hotkey: string
  coldkey: string
  active: boolean
  validatorPermit: boolean
  /** All stake fields are in TAO units (pre-converted from rao). */
  alphaStake: number
  rootStake: number
  totalAlphaStake: number
  trust: number
  validatorTrust: number
  consensus: number
  incentive: number
  dividends: number
  /** Emission this epoch in TAO. */
  emission: number
  /** Daily reward in alpha. */
  dailyReward: number
  /** Daily reward in TAO. */
  dailyTotalRewardsAsTao: number
  rank: number
  isOwnerHotkey: boolean
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

function pickLogo(s: TaoswapSubnetRaw): string | null {
  return s.identity?.image?.trim() || null
}

function pickName(s: TaoswapSubnetRaw): string {
  return s.identity?.name?.trim() || s.name?.trim() || `Subnet ${s.id}`
}

function mapSubnet(s: TaoswapSubnetRaw): SubnetScreenerRow {
  return {
    netuid: s.id,
    name: pickName(s),
    logoUrl: pickLogo(s),
    price: s.price,
    marketCap: s.market_cap,
    // taoswap returns percent units; the UI consumes fractions.
    emission_pct: (s.emission_percent ?? 0) / 100,
    price_1h_pct_change: (s.price_evolution_h_1 ?? 0) / 100,
    price_1d_pct_change: (s.price_evolution_h_24 ?? 0) / 100,
    price_7d_pct_change: (s.price_evolution_d_7 ?? 0) / 100,
    price_1m_pct_change: (s.price_evolution_d_30 ?? 0) / 100,
  }
}

/**
 * Full subnet screener — single taoswap call. Root subnet (netuid 0) is
 * filtered out to match the dashboard's expectation.
 */
export async function getSubnetScreener(): Promise<SubnetScreenerRow[]> {
  const res = await taoswapFetch<TaoswapSubnetListResponse>(
    "/subnets/",
    undefined,
    { revalidate: 120 },
  )
  return res.results.filter((s) => s.id !== 0).map(mapSubnet)
}

function mapNeuron(n: TaoswapNeuronRaw, rank: number): MetagraphNeuron {
  return {
    uid: n.uid,
    hotkey: n.hotkey,
    coldkey: n.coldkey,
    active: n.status === "ACTIVE",
    validatorPermit: n.is_validator,
    // taoswap's `stake` is the total alpha-equivalent (alpha + root-as-alpha).
    // It doesn't split alpha vs root stake, so we mirror it to all three.
    alphaStake: n.stake,
    rootStake: 0,
    totalAlphaStake: n.stake,
    trust: 0, // taoswap exposes vtrust only; trust is not in the response
    validatorTrust: n.vtrust,
    consensus: n.consensus,
    incentive: n.incentive,
    dividends: n.dividends,
    emission: n.emission,
    dailyReward: n.daily_rewards_alpha,
    dailyTotalRewardsAsTao: n.daily_rewards,
    rank,
    isOwnerHotkey: n.is_owner,
  }
}

/**
 * Metagraph + hyperparams for one subnet — single taoswap call that returns
 * both the neuron list and the subnet's settings/metrics.
 */
export async function getSubnetDetail(netuid: number): Promise<{
  neurons: MetagraphNeuron[]
  hyperparams: SubnetHyperparams
  subnet: SubnetScreenerRow
}> {
  // Fetch metagraph + fresh chain block in parallel. Taoswap's per-subnet
  // endpoint returns a snapshot of `blocks_since_epoch` that doesn't update
  // per block (we measured 0 movement over 30s), so we ignore that field
  // and derive the live value from the chain block instead.
  const [res, currentBlock] = await Promise.all([
    taoswapFetch<TaoswapMetagraphResponse>(
      `/metagraph/${netuid}/`,
      undefined,
      { revalidate: 0 },
    ),
    getCurrentChainBlock(),
  ])

  // Compute rank from incentive desc (1 = highest). The chain's own rank field
  // bunches many neurons at 0, so we derive a unique rank here — matches what
  // the incentive chart and metagraph table expect downstream.
  const sortedByIncentive = [...res.neurons].sort(
    (a, b) => b.incentive - a.incentive,
  )
  const rankByUid = new Map<number, number>()
  sortedByIncentive.forEach((n, i) => rankByUid.set(n.uid, i + 1))

  // Preserve API order (uid asc) for the returned neurons list.
  const neurons = res.neurons.map((n) =>
    mapNeuron(n, rankByUid.get(n.uid) ?? 0),
  )

  const active = res.neurons.filter((n) => n.status === "ACTIVE")
  const validators = active.filter((n) => n.is_validator)
  const miners = active.filter((n) => !n.is_validator)

  const tempo = res.subnet.tempo ?? 360
  // Bittensor epoch boundary fires when (block + netuid + 1) % tempo == 0,
  // so blocks remaining = tempo - ((block + netuid + 1) % tempo). When the
  // fresh-block fetch fails for any reason, fall back to taoswap's (likely
  // stale) snapshot so the card never breaks.
  const blocksUntilNextEpoch =
    currentBlock != null
      ? tempo - ((currentBlock + res.subnet.id + 1) % tempo)
      : Math.max(0, tempo - (res.subnet.blocks_since_epoch ?? 0))

  const hyperparams: SubnetHyperparams = {
    netuid: res.subnet.id,
    maxNeurons: res.count,
    activeKeys: active.length,
    validators: validators.length,
    activeValidators: validators.length,
    activeMiners: res.subnet.active_miners ?? miners.length,
    blocksUntilNextEpoch,
    mechEmissionSplit: (res.subnet.mechanism_emission_split ?? []).map((v) =>
      String(v / 100),
    ),
    mechCount: res.subnet.mechanism_count ?? 1,
    tempo,
  }

  const subnet = mapSubnet(res.subnet)
  return { neurons, hyperparams, subnet }
}

/**
 * Convenience accessors — keep the previous three-function shape so call
 * sites barely change. They all hit `getSubnetDetail` once and slice the
 * result, so the underlying taoswap call is shared via Next's fetch cache.
 */
export async function getSubnetMetagraph(
  netuid: number,
): Promise<MetagraphNeuron[]> {
  const d = await getSubnetDetail(netuid)
  return d.neurons
}

export async function getSubnetHyperparams(
  netuid: number,
): Promise<SubnetHyperparams | null> {
  const d = await getSubnetDetail(netuid)
  return d.hyperparams
}
