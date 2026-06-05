"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"

const coldkeyLabelInput = z.object({
  coldkey: z
    .string()
    .trim()
    .min(40, "Coldkey looks too short")
    .max(50, "Coldkey looks too long")
    .regex(/^5[A-Za-z0-9]+$/, "Invalid coldkey address (must start with 5)"),
  nickname: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(64, "Label is too long"),
  isMyColdkey: z.boolean(),
  tracked: z.boolean().optional(),
})

export interface ColdkeyLabelRecord {
  id: string
  coldkey: string
  nickname: string
  isMyColdkey: boolean
  tracked: boolean
}

export interface ColdkeyLabelMutationResult {
  ok: boolean
  error?: string
  data?: ColdkeyLabelRecord
}

const labelSelect = {
  id: true,
  coldkey: true,
  nickname: true,
  isMyColdkey: true,
  tracked: true,
} as const

function revalidatePortfolioPaths() {
  revalidatePath("/portfolio")
  revalidatePath("/portfolio/my-coldkeys")
  revalidatePath("/portfolio/label-coldkeys")
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function listColdkeyLabels(
  filter?: { isMyColdkey?: boolean; tracked?: boolean },
): Promise<ColdkeyLabelRecord[]> {
  const userId = await requireUserId()
  if (!userId) return []

  try {
    return await prisma.coldkeyNickname.findMany({
      where: {
        userId,
        ...(filter?.isMyColdkey === undefined
          ? {}
          : { isMyColdkey: filter.isMyColdkey }),
        ...(filter?.tracked === undefined ? {} : { tracked: filter.tracked }),
      },
      orderBy: { createdAt: "desc" },
      select: labelSelect,
    })
  } catch (err) {
    console.error("[listColdkeyLabels]", err)
    return []
  }
}

export async function listMyColdkeys(): Promise<ColdkeyLabelRecord[]> {
  return listColdkeyLabels({ isMyColdkey: true })
}

export async function listTrackedMyColdkeys(): Promise<ColdkeyLabelRecord[]> {
  return listColdkeyLabels({ isMyColdkey: true, tracked: true })
}

export async function listUntrackedMyColdkeys(): Promise<ColdkeyLabelRecord[]> {
  return listColdkeyLabels({ isMyColdkey: true, tracked: false })
}

export async function listLabeledColdkeys(): Promise<ColdkeyLabelRecord[]> {
  return listColdkeyLabels({ isMyColdkey: false })
}

/** @deprecated Use listLabeledColdkeys */
export async function listMyNicknames(): Promise<ColdkeyLabelRecord[]> {
  return listLabeledColdkeys()
}

export async function getMyNicknameMap(): Promise<Record<string, string>> {
  const rows = await listColdkeyLabels()
  const out: Record<string, string> = {}
  for (const r of rows) out[r.coldkey] = r.nickname
  return out
}

export async function addColdkeyLabel(
  input: unknown,
): Promise<ColdkeyLabelMutationResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "Must be signed in" }

  const parsed = coldkeyLabelInput.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  const { coldkey, nickname, isMyColdkey } = parsed.data
  const tracked = isMyColdkey ? (parsed.data.tracked ?? false) : false

  try {
    const existing = await prisma.coldkeyNickname.findUnique({
      where: { userId_coldkey: { userId, coldkey } },
      select: labelSelect,
    })

    if (existing && existing.isMyColdkey !== isMyColdkey) {
      return {
        ok: false,
        error: existing.isMyColdkey
          ? "This coldkey is already saved as one of yours. Remove it from My coldkeys first."
          : "This coldkey is already labeled as someone else's. Remove it from Label coldkeys first.",
      }
    }

    const row = existing
      ? await prisma.coldkeyNickname.update({
          where: { id: existing.id },
          data: { nickname, isMyColdkey, tracked },
          select: labelSelect,
        })
      : await prisma.coldkeyNickname.create({
          data: { userId, coldkey, nickname, isMyColdkey, tracked },
          select: labelSelect,
        })

    revalidatePortfolioPaths()
    return { ok: true, data: row }
  } catch (err) {
    console.error("[addColdkeyLabel]", err)
    return { ok: false, error: "Failed to save coldkey label" }
  }
}

export async function setColdkeyTracked(
  id: string,
  tracked: boolean,
): Promise<ColdkeyLabelMutationResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "Must be signed in" }

  try {
    const existing = await prisma.coldkeyNickname.findFirst({
      where: { id, userId, isMyColdkey: true },
      select: labelSelect,
    })
    if (!existing) {
      return { ok: false, error: "Coldkey not found" }
    }

    const row = await prisma.coldkeyNickname.update({
      where: { id },
      data: { tracked },
      select: labelSelect,
    })

    revalidatePortfolioPaths()
    return { ok: true, data: row }
  } catch (err) {
    console.error("[setColdkeyTracked]", err)
    return { ok: false, error: "Failed to update tracking" }
  }
}

/** @deprecated Use addColdkeyLabel with isMyColdkey: false */
export async function addMyNickname(
  input: unknown,
): Promise<ColdkeyLabelMutationResult> {
  const parsed = z
    .object({
      coldkey: z.string(),
      nickname: z.string(),
    })
    .safeParse(input)
  if (!parsed.success) {
    return addColdkeyLabel(input)
  }
  return addColdkeyLabel({ ...parsed.data, isMyColdkey: false })
}

export async function removeColdkeyLabel(
  id: string,
): Promise<ColdkeyLabelMutationResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "Must be signed in" }

  try {
    const result = await prisma.coldkeyNickname.deleteMany({
      where: { id, userId },
    })
    if (result.count === 0) {
      return { ok: false, error: "Coldkey label not found" }
    }
    revalidatePortfolioPaths()
    return { ok: true }
  } catch (err) {
    console.error("[removeColdkeyLabel]", err)
    return { ok: false, error: "Failed to delete" }
  }
}

/** @deprecated Use removeColdkeyLabel */
export async function removeMyNickname(
  id: string,
): Promise<ColdkeyLabelMutationResult> {
  return removeColdkeyLabel(id)
}

const migrateItemSchema = z.object({
  address: z.string().trim().min(40).max(50),
  nickname: z.string().trim().min(1).max(64),
})

/** One-time import from legacy browser localStorage tracked coldkeys. */
export async function migrateLocalColdkeys(
  items: unknown,
): Promise<{ ok: boolean; imported: number }> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, imported: 0 }

  if (!Array.isArray(items)) return { ok: true, imported: 0 }

  let imported = 0
  for (const raw of items) {
    const parsed = migrateItemSchema.safeParse(raw)
    if (!parsed.success) continue

    const result = await addColdkeyLabel({
      coldkey: parsed.data.address,
      nickname: parsed.data.nickname,
      isMyColdkey: true,
      tracked: true,
    })
    if (result.ok) imported++
  }

  return { ok: true, imported }
}

export type NicknameRecord = ColdkeyLabelRecord
