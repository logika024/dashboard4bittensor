const STORAGE_KEY = "portfolio-balance-row-counts"
const DEFAULT_SKELETON_ROWS = 3

type RowCountMap = Record<string, number>

function readMap(): RowCountMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return {}
    return parsed as RowCountMap
  } catch {
    return {}
  }
}

function writeMap(map: RowCountMap) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function coldkeyBalanceScope(coldkey: string): string {
  return coldkey
}

export function allBalancesScope(coldkeys: { coldkey: string }[]): string {
  return `__all__:${coldkeys
    .map((c) => c.coldkey)
    .sort()
    .join("|")}`
}

export function getStoredBalanceRowCount(scope: string): number | null {
  const count = readMap()[scope]
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
    return null
  }
  return Math.round(count)
}

export function setStoredBalanceRowCount(scope: string, count: number) {
  if (!Number.isFinite(count) || count <= 0) return
  const map = readMap()
  map[scope] = Math.round(count)
  writeMap(map)
}

/** Rows to render in the loading skeleton for a given scope and page size. */
export function skeletonRowCount(
  scope: string | undefined,
  pageSize: number,
): number {
  const stored = scope ? getStoredBalanceRowCount(scope) : null
  const total = stored ?? DEFAULT_SKELETON_ROWS
  return Math.min(Math.max(total, 1), pageSize)
}
