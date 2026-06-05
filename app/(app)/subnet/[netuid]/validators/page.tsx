import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSubnetScreener } from "@/lib/taoswap/subnets"
import { parseNetuid } from "@/lib/subnet/channels"
import { Card } from "@/components/ui/card"

interface PageProps {
  params: Promise<{ netuid: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { netuid } = await params
  return {
    title: `Validators · SN${netuid}`,
  }
}

const MOCK_VALIDATORS = [
  { hotkey: "5F3sa2TJAWMqDhG6j...", stake: "12,450 τ", take: "18%", rank: 1 },
  { hotkey: "5GrwvaEF5zXb26Fz9...", stake: "9,820 τ", take: "12%", rank: 2 },
  { hotkey: "5DAAnrj7VHTznn2A...", stake: "7,105 τ", take: "15%", rank: 3 },
  { hotkey: "5HGjWAeFDfFCWPsj...", stake: "5,640 τ", take: "10%", rank: 4 },
  { hotkey: "5FHneW46xGXgs5mU...", stake: "4,210 τ", take: "16%", rank: 5 },
]

export default async function SubnetValidatorsPage({ params }: PageProps) {
  const { netuid: raw } = await params
  const netuid = parseNetuid(raw)
  if (netuid == null) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const screener = await getSubnetScreener().catch(() => [])
  const subnet = screener.find((s) => s.netuid === netuid)

  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Validators
        </h1>
        <p className="text-sm text-muted-foreground">
          {subnet ? `${subnet.name} · SN${netuid}` : `SN${netuid}`} — mock data
        </p>
      </header>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Hotkey</th>
              <th className="px-4 py-3 font-medium">Stake</th>
              <th className="px-4 py-3 font-medium">Take</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_VALIDATORS.map((v) => (
              <tr
                key={v.hotkey}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  #{v.rank}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{v.hotkey}</td>
                <td className="px-4 py-3 tabular-nums">{v.stake}</td>
                <td className="px-4 py-3 tabular-nums">{v.take}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
