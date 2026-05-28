export const RAO_PER_TAO = 1_000_000_000

export function raoToTao(rao: number | string): number {
  const n = typeof rao === "string" ? Number(rao) : rao
  return n / RAO_PER_TAO
}
