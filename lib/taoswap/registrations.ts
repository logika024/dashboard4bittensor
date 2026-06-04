import { taoswapFetch } from "@/lib/taoswap/client"

const REGISTRATION_CALLS = ["burned_register", "register"] as const
const EXTRINSICS_PAGE_SIZE = 50
const BLOCK_EVENT_CONCURRENCY = 8

interface TaoswapExtrinsic {
  block: number
  idx: number
  timestamp: string
  call: string
  signer: string
  success: boolean
}

interface TaoswapExtrinsicsResponse {
  results: TaoswapExtrinsic[]
  pagination?: {
    total_count?: number
    total_count_approximate?: boolean
  }
}

interface TaoswapEvent {
  extrinsic_idx: number
  section: string
  method: string
  data: string | { values?: unknown[] }
}

interface TaoswapBlockEventsResponse {
  results: TaoswapEvent[]
}

export interface NeuronRegistrationRow {
  uid: number | null
  hotkey: string | null
  coldkey: string
  block: number
  registeredAt: string | null
  extrinsicIdx: number
  call: string
}

export interface NeuronRegistrationResult {
  rows: NeuronRegistrationRow[]
  /** Sum of indexed registration extrinsics taoswap reports for this subnet. */
  totalIndexed: number | null
}

function parseEventData(
  data: TaoswapEvent["data"],
): unknown[] | null {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as { values?: unknown[] }
      return Array.isArray(parsed.values) ? parsed.values : null
    } catch {
      return null
    }
  }
  return Array.isArray(data.values) ? data.values : null
}

function parseNeuronRegistered(
  data: TaoswapEvent["data"],
  netuid: number,
): { uid: number; hotkey: string } | null {
  const values = parseEventData(data)
  if (!values || values.length < 3) return null

  const eventNetuid = Number(values[0])
  const uid = Number(values[1])
  const hotkey = String(values[2])

  if (eventNetuid !== netuid || !Number.isInteger(uid) || !hotkey) {
    return null
  }

  return { uid, hotkey }
}

async function fetchRegistrationExtrinsics(
  netuid: number,
  call: (typeof REGISTRATION_CALLS)[number],
): Promise<TaoswapExtrinsicsResponse> {
  return taoswapFetch<TaoswapExtrinsicsResponse>(
    "/extrinsics/",
    {
      netuid,
      module: "SubtensorModule",
      call,
      success: "true",
      page_size: EXTRINSICS_PAGE_SIZE,
      page: 1,
    },
    { revalidate: 120 },
  )
}

async function fetchBlockEvents(block: number): Promise<TaoswapEvent[]> {
  try {
    const res = await taoswapFetch<TaoswapBlockEventsResponse>(
      `/blocks/${block}/events/`,
      { page_size: 500 },
      { revalidate: 3600 },
    )
    return res.results ?? []
  } catch {
    return []
  }
}

async function fetchBlockEventsBatch(
  blocks: number[],
): Promise<Map<number, TaoswapEvent[]>> {
  const map = new Map<number, TaoswapEvent[]>()

  for (let i = 0; i < blocks.length; i += BLOCK_EVENT_CONCURRENCY) {
    const chunk = blocks.slice(i, i + BLOCK_EVENT_CONCURRENCY)
    const pairs = await Promise.all(
      chunk.map(async (block) => [block, await fetchBlockEvents(block)] as const),
    )
    for (const [block, events] of pairs) {
      map.set(block, events)
    }
  }

  return map
}

/**
 * Recent neuron registrations from taoswap extrinsics + NeuronRegistered events.
 * Returns the latest page of successful `burned_register` and `register` calls.
 */
export async function getNeuronRegistrations(
  netuid: number,
): Promise<NeuronRegistrationResult> {
  const responses = await Promise.all(
    REGISTRATION_CALLS.map((call) => fetchRegistrationExtrinsics(netuid, call)),
  )

  const extrinsics = responses
    .flatMap((res) => res.results ?? [])
    .filter((ext) => ext.success)
    .sort((a, b) => b.block - a.block || b.idx - a.idx)
    .slice(0, EXTRINSICS_PAGE_SIZE)

  const totalIndexed = responses.reduce(
    (sum, res) => sum + (res.pagination?.total_count ?? 0),
    0,
  )

  const uniqueBlocks = [...new Set(extrinsics.map((ext) => ext.block))]
  const eventsByBlock = await fetchBlockEventsBatch(uniqueBlocks)

  const rows: NeuronRegistrationRow[] = extrinsics.map((ext) => {
    const events = eventsByBlock.get(ext.block) ?? []
    const registered = events.find(
      (event) =>
        event.section === "SubtensorModule" &&
        event.method === "NeuronRegistered" &&
        event.extrinsic_idx === ext.idx,
    )

    const neuron = registered
      ? parseNeuronRegistered(registered.data, netuid)
      : null

    return {
      uid: neuron?.uid ?? null,
      hotkey: neuron?.hotkey ?? null,
      coldkey: ext.signer,
      block: ext.block,
      registeredAt: ext.timestamp?.trim() || null,
      extrinsicIdx: ext.idx,
      call: ext.call,
    }
  })

  return {
    rows,
    totalIndexed: totalIndexed > 0 ? totalIndexed : null,
  }
}

export function formatRegistrationTime(iso: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date)
}
