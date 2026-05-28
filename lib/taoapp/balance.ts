import { taoAppFetch } from "@/lib/taoapp/client"
import { alphaRaoToTao, raoToTao } from "@/lib/taoapp/format"
import type {
  AccountingSpotBalanceResponse,
  AccountingSpotStake,
  AlphaPriceAtBlock,
  AlphaSubnetBalance,
  ColdkeyPortfolioBalances,
} from "@/lib/taoapp/types"

async function getSubnetAlphaPrice(netuid: number): Promise<number> {
  const data = await taoAppFetch<AlphaPriceAtBlock>(
    "/api/beta/accounting/price-at-block",
    { netuid },
  )
  return data.price
}

function aggregateStakesByNetuid(
  stakes: AccountingSpotStake[],
): Map<number, { alphaRao: number; priceRao: number | null }> {
  const byNetuid = new Map<
    number,
    { alphaRao: number; priceRao: number | null }
  >()

  for (const row of stakes) {
    const existing = byNetuid.get(row.netuid)
    const alphaRao = (existing?.alphaRao ?? 0) + row.stake
    const priceRao =
      row.subnet_token_price ?? existing?.priceRao ?? null
    byNetuid.set(row.netuid, { alphaRao, priceRao })
  }

  return byNetuid
}

/**
 * Fetches coldkey balances from TAO.app (free spot-balance + price-at-block).
 *
 * - free TAO: unstaked balance from spot-balance.free
 * - alpha per subnet: summed stake per netuid from spot-balance.stake
 * - alpha in TAO: stake * subnet_token_price, or price-at-block when price is missing
 */
export async function getColdkeyPortfolioBalances(
  coldkey: string,
): Promise<ColdkeyPortfolioBalances> {
  const spot = await taoAppFetch<AccountingSpotBalanceResponse>(
    "/api/beta/accounting/spot-balance",
    { coldkey },
  )

  const byNetuid = aggregateStakesByNetuid(spot.stake)
  const alphaBySubnet: AlphaSubnetBalance[] = []

  for (const [netuid, { alphaRao, priceRao }] of byNetuid) {
    let price = priceRao
    if (price == null) {
      price = await getSubnetAlphaPrice(netuid)
    }

    const alpha = raoToTao(alphaRao)
    const alphaInTao = alphaRaoToTao(alphaRao, price)

    alphaBySubnet.push({
      netuid,
      alpha,
      alphaInTao,
    })
  }

  alphaBySubnet.sort((a, b) => a.netuid - b.netuid)

  const totalAlphaInTao = alphaBySubnet.reduce(
    (sum, row) => sum + row.alphaInTao,
    0,
  )

  return {
    coldkey,
    freeTao: raoToTao(spot.free),
    reservedTao: raoToTao(spot.reserved),
    frozenTao: raoToTao(spot.frozen),
    alphaBySubnet,
    totalAlphaInTao,
  }
}
