import { NextResponse } from "next/server"
import { z } from "zod"
import { coldkeyQuerySchema } from "@/lib/portfolio/coldkey-schema"
import { getPortfolioBalanceHistory } from "@/lib/taoswap/history"
import { TaoswapError } from "@/lib/taoswap/client"

const querySchema = coldkeyQuerySchema.extend({
  days: z.coerce.number().int().min(1).max(730).optional().default(30),
  subnets: z.string().max(512).optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    coldkey: searchParams.get("coldkey") ?? "",
    days: searchParams.get("days") ?? undefined,
    subnets: searchParams.get("subnets") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const history = await getPortfolioBalanceHistory({
      coldkey: parsed.data.coldkey,
      days: parsed.data.days,
      subnets: parsed.data.subnets,
    })
    return NextResponse.json(history)
  } catch (err) {
    if (err instanceof TaoswapError) {
      return NextResponse.json(
        { error: err.message, detail: err.body },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      )
    }
    console.error("[portfolio/history]", err)
    return NextResponse.json(
      { error: "Failed to fetch portfolio history" },
      { status: 500 },
    )
  }
}
