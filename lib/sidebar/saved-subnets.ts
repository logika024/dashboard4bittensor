"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"

const netuidInput = z.object({
  netuid: z.number().int().min(0),
})

export interface SavedSubnetRecord {
  id: string
  netuid: number
  sortOrder: number
}

export interface SavedSubnetMutationResult {
  ok: boolean
  error?: string
  data?: SavedSubnetRecord
}

export async function listMySavedSubnets(): Promise<SavedSubnetRecord[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  try {
    return await prisma.userSavedSubnet.findMany({
      where: { userId: user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, netuid: true, sortOrder: true },
    })
  } catch (err) {
    console.error("[listMySavedSubnets]", err)
    return []
  }
}

export async function addMySavedSubnet(
  input: unknown,
): Promise<SavedSubnetMutationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Must be signed in" }

  const parsed = netuidInput.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid subnet",
    }
  }

  try {
    const maxSort = await prisma.userSavedSubnet.aggregate({
      where: { userId: user.id },
      _max: { sortOrder: true },
    })
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1

    const row = await prisma.userSavedSubnet.create({
      data: {
        userId: user.id,
        netuid: parsed.data.netuid,
        sortOrder: nextSort,
      },
      select: { id: true, netuid: true, sortOrder: true },
    })

    revalidateAppShell()
    return { ok: true, data: row }
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { ok: false, error: "Subnet is already in your sidebar" }
    }
    console.error("[addMySavedSubnet]", err)
    return { ok: false, error: "Failed to save subnet" }
  }
}

export async function removeMySavedSubnet(
  id: string,
): Promise<SavedSubnetMutationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Must be signed in" }

  try {
    const result = await prisma.userSavedSubnet.deleteMany({
      where: { id, userId: user.id },
    })
    if (result.count === 0) {
      return { ok: false, error: "Subnet not found" }
    }
    revalidateAppShell()
    return { ok: true }
  } catch (err) {
    console.error("[removeMySavedSubnet]", err)
    return { ok: false, error: "Failed to remove subnet" }
  }
}

function revalidateAppShell() {
  revalidatePath("/", "layout")
  revalidatePath("/dashboard")
  revalidatePath("/portfolio")
}
