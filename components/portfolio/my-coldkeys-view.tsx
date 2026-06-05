"use client"

import { useEffect, useState, useTransition } from "react"
import {
  addColdkeyLabel,
  removeColdkeyLabel,
  setColdkeyTracked,
  type ColdkeyLabelRecord,
} from "@/lib/portfolio/nicknames"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface MyColdkeysViewProps {
  initialColdkeys: ColdkeyLabelRecord[]
}

export function MyColdkeysView({ initialColdkeys }: MyColdkeysViewProps) {
  const [coldkeys, setColdkeys] = useState(initialColdkeys)
  const [newAddress, setNewAddress] = useState("")
  const [newNickname, setNewNickname] = useState("")
  const [trackOnAdd, setTrackOnAdd] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  useEffect(() => {
    setColdkeys(initialColdkeys)
  }, [initialColdkeys])

  function handleAdd() {
    const address = newAddress.trim()
    const nickname = newNickname.trim() || address.slice(0, 8)
    if (!address) return

    setError(null)
    startSaving(async () => {
      const result = await addColdkeyLabel({
        coldkey: address,
        nickname,
        isMyColdkey: true,
        tracked: trackOnAdd,
      })
      if (!result.ok) {
        setError(result.error ?? "Failed to save")
        return
      }
      if (result.data) {
        setColdkeys((prev) => [result.data!, ...prev])
        setNewAddress("")
        setNewNickname("")
        setTrackOnAdd(true)
      }
    })
  }

  function handleRemove(id: string) {
    setError(null)
    startSaving(async () => {
      const result = await removeColdkeyLabel(id)
      if (!result.ok) {
        setError(result.error ?? "Failed to remove")
        return
      }
      setColdkeys((prev) => prev.filter((c) => c.id !== id))
    })
  }

  function handleTrackedChange(id: string, tracked: boolean) {
    setError(null)
    startSaving(async () => {
      const result = await setColdkeyTracked(id, tracked)
      if (!result.ok) {
        setError(result.error ?? "Failed to update tracking")
        return
      }
      if (result.data) {
        setColdkeys((prev) =>
          prev.map((c) => (c.id === id ? result.data! : c)),
        )
      }
    })
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          My coldkeys
        </h1>
        <p className="text-sm text-muted-foreground">
          Save coldkeys you own. Enable tracking to show them on the portfolio
          channel.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add my coldkey</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Coldkey address (5...)"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              disabled={isSaving}
            />
            <Input
              placeholder="Label"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              disabled={isSaving}
            />
            <Button type="button" onClick={handleAdd} disabled={isSaving}>
              Add
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="track-on-add"
              checked={trackOnAdd}
              onCheckedChange={setTrackOnAdd}
              disabled={isSaving}
            />
            <Label htmlFor="track-on-add" className="text-sm font-normal">
              Track in portfolio
            </Label>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My coldkeys</CardTitle>
        </CardHeader>
        <CardContent>
          {coldkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No coldkeys saved yet.
            </p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {coldkeys.map((ck) => (
                <li
                  key={ck.id}
                  className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{ck.nickname}</p>
                    <p className="font-mono text-xs text-muted-foreground break-all">
                      {ck.coldkey}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`track-${ck.id}`}
                        checked={ck.tracked}
                        onCheckedChange={(checked) =>
                          handleTrackedChange(ck.id, checked)
                        }
                        disabled={isSaving}
                      />
                      <Label
                        htmlFor={`track-${ck.id}`}
                        className="text-xs font-normal whitespace-nowrap"
                      >
                        Track in portfolio
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(ck.id)}
                      disabled={isSaving}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
