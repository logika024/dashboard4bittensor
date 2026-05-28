import { NextResponse } from "next/server"
import { z } from "zod"
import { coldkeyQuerySchema } from "@/lib/portfolio/coldkey-schema"
import { getColdkeyPortfolioBalances } from "@/lib/taoapp/balance"
import { TaoAppError } from "@/lib/taoapp/client"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = coldkeyQuerySchema.safeParse({
    coldkey: searchParams.get("coldkey") ?? "",
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid coldkey", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const balances = await getColdkeyPortfolioBalances(parsed.data.coldkey)
    return NextResponse.json(balances)
  } catch (err) {
    if (err instanceof TaoAppError) {
      return NextResponse.json(
        { error: err.message, detail: err.body },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      )
    }
    console.error("[portfolio/balance]", err)
    return NextResponse.json(
      { error: "Failed to fetch portfolio balances" },
      { status: 500 },
    )
  }
}
