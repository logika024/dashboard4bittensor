"use client"

import { useState, useTransition } from "react"
import { TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  addColdkeyLabel,
  removeColdkeyLabel,
  type ColdkeyLabelRecord,
} from "@/lib/portfolio/nicknames"

interface NicknamesSectionProps {
  initialLabels: ColdkeyLabelRecord[]
}

export function NicknamesSection({ initialLabels }: NicknamesSectionProps) {
  const [items, setItems] = useState(initialLabels)
  const [coldkey, setColdkey] = useState("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  function handleAdd() {
    setError(null)
    startSaving(async () => {
      const result = await addColdkeyLabel({
        coldkey: coldkey.trim(),
        nickname: nickname.trim(),
        isMyColdkey: false,
      })
      if (!result.ok) {
        setError(result.error ?? "Failed to save")
        return
      }
      if (result.data) {
        setItems((prev) => [result.data!, ...prev])
        setColdkey("")
        setNickname("")
      }
    })
  }

  function handleRemove(id: string) {
    setError(null)
    setPendingDelete(id)
    void removeColdkeyLabel(id).then((result) => {
      setPendingDelete(null)
      if (!result.ok) {
        setError(result.error ?? "Failed to delete")
        return
      }
      setItems((prev) => prev.filter((i) => i.id !== id))
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Label coldkeys</CardTitle>
        <p className="text-sm text-muted-foreground">
          Private notes for coldkeys you do not own. Labels appear on subnet
          pages when you hover a matching miner on the incentive chart.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Coldkey (5…)"
            value={coldkey}
            onChange={(e) => setColdkey(e.target.value)}
            className="font-mono sm:flex-[2]"
            disabled={isSaving}
          />
          <Input
            placeholder="Your note"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="sm:flex-1"
            disabled={isSaving}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
            }}
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={isSaving || !coldkey.trim() || !nickname.trim()}
            className="min-w-20"
          >
            {isSaving ? <Spinner className="size-4" /> : "Add"}
          </Button>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200"
          >
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No labels yet. Add a coldkey above to annotate it.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className="truncate font-medium text-foreground"
                    title={item.nickname}
                  >
                    {item.nickname}
                  </span>
                  <span
                    className="truncate font-mono text-xs text-muted-foreground"
                    title={item.coldkey}
                  >
                    {item.coldkey}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove label for ${item.coldkey}`}
                  disabled={pendingDelete === item.id}
                  onClick={() => handleRemove(item.id)}
                >
                  {pendingDelete === item.id ? (
                    <Spinner className="size-3" />
                  ) : (
                    <TrashIcon className="size-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
