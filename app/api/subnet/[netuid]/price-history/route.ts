import { NextResponse } from "next/server"
import { parseNetuid } from "@/lib/subnet/channels"
import { TaoswapError } from "@/lib/taoswap/client"
import {
  ALPHA_CHART_RANGES,
  getSubnetPriceHistory,
  isAlphaChartRange,
  type AlphaChartRange,
} from "@/lib/taoswap/price-history"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ netuid: string }> },
) {
  const { netuid: raw } = await params
  const netuid = parseNetuid(raw)
  if (netuid == null) {
    return NextResponse.json({ error: `Invalid netuid "${raw}"` }, { status: 400 })
  }

  const rangeParam = new URL(request.url).searchParams.get("range") ?? "7d"
  if (!isAlphaChartRange(rangeParam)) {
    return NextResponse.json(
      {
        error: `Invalid range "${rangeParam}". Expected one of: ${ALPHA_CHART_RANGES.join(", ")}`,
      },
      { status: 400 },
    )
  }
  const range: AlphaChartRange = rangeParam

  try {
    const history = await getSubnetPriceHistory(netuid, range)
    return NextResponse.json(history)
  } catch (err) {
    if (err instanceof TaoswapError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      )
    }
    console.error("[api/subnet/price-history]", err)
    return NextResponse.json(
      { error: "Failed to fetch subnet price history" },
      { status: 500 },
    )
  }
}
