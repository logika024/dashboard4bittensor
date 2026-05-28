/** Bittensor amounts are stored in rao (1 TAO = 1e9 rao). */
export const RAO_PER_TAO = 1_000_000_000

export function raoToTao(rao: number): number {
  return rao / RAO_PER_TAO
}

/**
 * Convert alpha stake (rao) to TAO using subnet alpha price (rao per alpha rao).
 * Both stake and price are integer rao-scale values from the API.
 */
export function alphaRaoToTao(alphaRao: number, priceRao: number): number {
  return (alphaRao * priceRao) / (RAO_PER_TAO * RAO_PER_TAO)
}
