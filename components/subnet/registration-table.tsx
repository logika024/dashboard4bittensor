import { Card } from "@/components/ui/card"
import {
  formatRegistrationTime,
  type NeuronRegistrationResult,
} from "@/lib/taoswap/registrations"

interface RegistrationTableProps {
  data: NeuronRegistrationResult
  loadError?: string | null
}

export function RegistrationTable({ data, loadError }: RegistrationTableProps) {
  const { rows, totalIndexed } = data
  const resolved = rows.filter((r) => r.uid != null).length

  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-4 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Registration
        </h1>
        <p className="text-sm text-muted-foreground">
          {totalIndexed != null
            ? `Showing ${rows.length} most recent of ${totalIndexed.toLocaleString()} indexed registrations (burn + PoW) · ${resolved} with UID resolved`
            : `Recent registration extrinsics from taoswap · ${resolved} with UID resolved`}
        </p>
      </header>

      {loadError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {loadError}
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">UID</th>
                <th className="px-4 py-3 font-medium">Hotkey</th>
                <th className="px-4 py-3 font-medium">Coldkey</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Block</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No registration extrinsics found for this subnet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={`${row.block}-${row.extrinsicIdx}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {row.uid ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.hotkey ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.coldkey}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {formatRegistrationTime(row.registeredAt)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {row.block}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
