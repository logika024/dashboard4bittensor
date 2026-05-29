import { NextResponse } from "next/server"
import {
  CoinGeckoError,
  COIN_IDS,
  PRICE_RANGES,
  getPriceSummary,
  type CoinKey,
  type PriceRange,
} from "@/lib/coingecko/price"

function isCoin(value: string): value is CoinKey {
  return value in COIN_IDS
}

function isRange(value: string): value is PriceRange {
  return (PRICE_RANGES as readonly string[]).includes(value)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ coin: string }> },
) {
  const { coin } = await params
  if (!isCoin(coin)) {
    return NextResponse.json(
      { error: `Unknown coin "${coin}"` },
      { status: 400 },
    )
  }

  const range = new URL(request.url).searchParams.get("range") ?? "24h"
  if (!isRange(range)) {
    return NextResponse.json(
      { error: `Invalid range "${range}"` },
      { status: 400 },
    )
  }

  try {
    const summary = await getPriceSummary(coin, range)
    return NextResponse.json(summary)
  } catch (err) {
    if (err instanceof CoinGeckoError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      )
    }
    console.error("[api/prices]", err)
    return NextResponse.json(
      { error: "Failed to fetch price summary" },
      { status: 500 },
    )
  }
}
