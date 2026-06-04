import { withSubtensorApi } from "@/lib/subtensor/client"
import { taoswapFetch } from "@/lib/taoswap/client"

const WEIGHT_SCALE = 65535
const SECONDS_PER_BLOCK = 12

export interface WeightsMinerSlot {
  uid: number
  hotkey: string
  coldkey: string
  active: boolean
}

export interface WeightsValidatorRow {
  uid: number
  hotkey: string
  coldkey: string
  name: string | null
  stake: number
  /** Sparse normalized weights (0–1) keyed by miner UID. */
  weights: Array<{ minerUid: number; weight: number }>
}

export interface SubnetWeightsHyperparams {
  weightsRateLimit: number
  weightsVersion: number
  minAllowedWeights: number
  maxWeightsLimit: number
  activityCutoff: number
  blocksUntilNextEpoch: number
  tempo: number
  kappa: number
  commitRevealEnabled: boolean
  commitRevealInterval: number
  bondsMovingAvg: number
}

export interface SubnetWeightsData {
  netuid: number
  maxUids: number
  validators: WeightsValidatorRow[]
  miners: WeightsMinerSlot[]
  hyperparams: SubnetWeightsHyperparams
  /** Registered owner neuron UID, or null if owner hotkey is not on the metagraph. */
  ownerUid: number | null
  /** Taoswap incentive burn in percent units (e.g. 86.17 === 86.17%). */
  incentiveBurn: number | null
}

interface HexIdentity {
  name?: string
  url?: string
  githubRepo?: string
  image?: string
  discord?: string
  description?: string
  additional?: string
}

interface MetagraphJson {
  netuid: number
  maxUids: number
  numUids: number
  tempo: number
  blocksSinceLastStep: number
  kappa: number
  minAllowedWeights: number
  maxWeightsLimit: number
  weightsVersion: number
  weightsRateLimit: number
  activityCutoff: number
  commitRevealWeightsEnabled: boolean
  commitRevealPeriod: number
  bondsMovingAvg: number
  ownerHotkey: string
  ownerColdkey: string
  hotkeys: string[]
  coldkeys: string[]
  identities: (HexIdentity | null)[]
  active: boolean[]
  validatorPermit: boolean[]
  totalStake: (number | string)[]
}

interface NeuronJson {
  weights: [number, number][]
}

function decodeHexField(value: string | undefined | null): string | null {
  if (!value || value === "0x" || value === "0x0") return null
  const hex = value.startsWith("0x") ? value.slice(2) : value
  if (!hex) return null
  try {
    return Buffer.from(hex, "hex").toString("utf8").trim() || null
  } catch {
    return null
  }
}

function normalizeWeight(raw: number): number {
  return raw / WEIGHT_SCALE
}

function normalizeKappa(raw: number): number {
  return raw / WEIGHT_SCALE
}

function normalizeBondsAvg(raw: number): number {
  return raw / 1_000_000
}

/**
 * Validator→miner weight matrix from Finney chain state.
 *
 * Taoswap's metagraph endpoint does not expose per-validator weight vectors,
 * so we read them via the subtensor runtime API (`neuronInfo_getNeuron`).
 */
interface TaoswapSubnetBurn {
  emission_miner_burn?: number | null
}

/** Drop owner UID from each validator row and renormalize remaining weights to sum to 1. */
export function applyExcludeOwnerWeights(
  validators: WeightsValidatorRow[],
  ownerUid: number,
): WeightsValidatorRow[] {
  return validators.map((v) => {
    const remaining = v.weights.filter((w) => w.minerUid !== ownerUid)
    const total = remaining.reduce((sum, w) => sum + w.weight, 0)
    if (total <= 0) return { ...v, weights: [] }
    return {
      ...v,
      weights: remaining.map((w) => ({
        minerUid: w.minerUid,
        weight: w.weight / total,
      })),
    }
  })
}

export async function getSubnetWeights(
  netuid: number,
): Promise<SubnetWeightsData> {
  const chainDataPromise = withSubtensorApi(async (api) => {
    const subnetInfo = api.call.subnetInfoRuntimeApi
    const neuronInfo = api.call.neuronInfoRuntimeApi

    const [metagraphRaw, hyperparamsRaw] = await Promise.all([
      subnetInfo.getMetagraph(netuid),
      subnetInfo.getSubnetHyperparamsV2(netuid),
    ])

    const mg = metagraphRaw.toJSON() as unknown as MetagraphJson
    const hp = hyperparamsRaw.toJSON() as Record<string, unknown>

    const validatorIndices: number[] = []
    for (let i = 0; i < mg.hotkeys.length; i++) {
      if (mg.validatorPermit[i]) validatorIndices.push(i)
    }

    validatorIndices.sort(
      (a, b) =>
        Number(mg.totalStake[b] ?? 0) - Number(mg.totalStake[a] ?? 0),
    )

    const neuronResults = await Promise.all(
      validatorIndices.map((uid) => neuronInfo.getNeuron(netuid, uid)),
    )

    const validators: WeightsValidatorRow[] = validatorIndices.map(
      (uid, idx) => {
        const neuron = neuronResults[idx]!.toJSON() as unknown as NeuronJson
        const identity = mg.identities[uid]
        const name =
          decodeHexField(identity?.name) ??
          decodeHexField(identity?.description)?.slice(0, 40) ??
          null

        return {
          uid,
          hotkey: mg.hotkeys[uid]!,
          coldkey: mg.coldkeys[uid]!,
          name,
          stake: Number(mg.totalStake[uid] ?? 0),
          weights: (neuron.weights ?? []).map(([minerUid, raw]) => ({
            minerUid,
            weight: normalizeWeight(raw),
          })),
        }
      },
    )

    const miners: WeightsMinerSlot[] = mg.hotkeys.map((hotkey, uid) => ({
      uid,
      hotkey,
      coldkey: mg.coldkeys[uid]!,
      active: mg.active[uid] ?? false,
    }))

    const tempo = Number(mg.tempo ?? hp.tempo ?? 360)
    const blocksSinceLastStep = Number(mg.blocksSinceLastStep ?? 0)

    const hyperparams: SubnetWeightsHyperparams = {
      weightsRateLimit: Number(hp.weightsRateLimit ?? mg.weightsRateLimit ?? 0),
      weightsVersion: Number(hp.weightsVersion ?? mg.weightsVersion ?? 0),
      minAllowedWeights: Number(
        hp.minAllowedWeights ?? mg.minAllowedWeights ?? 0,
      ),
      maxWeightsLimit: Number(hp.maxWeightsLimit ?? mg.maxWeightsLimit ?? 0),
      activityCutoff: Number(hp.activityCutoff ?? mg.activityCutoff ?? 0),
      blocksUntilNextEpoch: Math.max(0, tempo - blocksSinceLastStep),
      tempo,
      kappa: normalizeKappa(Number(hp.kappa ?? mg.kappa ?? 0)),
      commitRevealEnabled: Boolean(
        hp.commitRevealWeightsEnabled ?? mg.commitRevealWeightsEnabled,
      ),
      commitRevealInterval: Number(
        hp.commitRevealPeriod ?? mg.commitRevealPeriod ?? 0,
      ),
      bondsMovingAvg: normalizeBondsAvg(
        Number(hp.bondsMovingAvg ?? mg.bondsMovingAvg ?? 0),
      ),
    }

    const ownerHotkey = mg.ownerHotkey
    const ownerIndex = ownerHotkey ? mg.hotkeys.indexOf(ownerHotkey) : -1
    const ownerUid = ownerIndex >= 0 ? ownerIndex : null

    return {
      netuid,
      maxUids: Number(mg.maxUids ?? mg.numUids ?? mg.hotkeys.length),
      validators,
      miners,
      hyperparams,
      ownerUid,
      incentiveBurn: null,
    }
  })

  const burnPromise = taoswapFetch<TaoswapSubnetBurn>(`/subnets/${netuid}/`, undefined, {
    revalidate: 120,
  }).catch(() => null)

  const [chainData, burnRes] = await Promise.all([chainDataPromise, burnPromise])

  return {
    ...chainData,
    incentiveBurn: burnRes?.emission_miner_burn ?? null,
  }
}

export function formatBlockDuration(blocks: number): string {
  const totalSeconds = blocks * SECONDS_PER_BLOCK
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}h, ${m}m, ${s}s`
  if (m > 0) return `${m}m, ${s}s`
  return `${s}s`
}
