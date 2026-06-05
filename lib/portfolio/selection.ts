/** nuqs query key for portfolio coldkey tab selection (`all` or coldkey address). */
export const PORTFOLIO_COLDKEY_QUERY = "coldkey"

export const PORTFOLIO_SELECTION_ALL = "all" as const

export type PortfolioColdkeySelection =
  | typeof PORTFOLIO_SELECTION_ALL
  | (string & {})

export function isPortfolioAllSelection(
  value: string,
): value is typeof PORTFOLIO_SELECTION_ALL {
  return value === PORTFOLIO_SELECTION_ALL
}

export function isTrackedColdkeySelection(
  value: string,
  coldkeys: { coldkey: string }[],
): boolean {
  return coldkeys.some((c) => c.coldkey === value)
}
