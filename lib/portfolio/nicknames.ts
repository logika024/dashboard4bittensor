"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"

const nicknameInput = z.object({
  coldkey: z
    .string()
    .trim()
    .min(40, "Coldkey looks too short")
    .max(50, "Coldkey looks too long")
    .regex(/^5[A-Za-z0-9]+$/, "Invalid coldkey address (must start with 5)"),
  nickname: z
    .string()
    .trim()
    .min(1, "Nickname is required")
    .max(64, "Nickname is too long"),
})

export interface NicknameRecord {
  id: string
  coldkey: string
  nickname: string
}

export interface NicknameMutationResult {
  ok: boolean
  error?: string
  data?: NicknameRecord
}

/**
 * List the signed-in user's coldkey nicknames. Returns [] for anonymous
 * visitors — never throws so callers can render the portfolio page even
 * when the DB is briefly unreachable.
 */
export async function listMyNicknames(): Promise<NicknameRecord[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  try {
    const rows = await prisma.coldkeyNickname.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, coldkey: true, nickname: true },
    })
    return rows
  } catch (err) {
    console.error("[listMyNicknames]", err)
    return []
  }
}

/**
 * Return a `coldkey → nickname` map for the signed-in user. Used by the
 * subnet detail page to enrich the incentive-chart info bar.
 */
export async function getMyNicknameMap(): Promise<Record<string, string>> {
  const rows = await listMyNicknames()
  const out: Record<string, string> = {}
  for (const r of rows) out[r.coldkey] = r.nickname
  return out
}

export async function addMyNickname(
  input: unknown,
): Promise<NicknameMutationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Must be signed in" }

  const parsed = nicknameInput.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  try {
    const row = await prisma.coldkeyNickname.create({
      data: {
        userId: user.id,
        coldkey: parsed.data.coldkey,
        nickname: parsed.data.nickname,
      },
      select: { id: true, coldkey: true, nickname: true },
    })
    revalidatePath("/portfolio")
    return { ok: true, data: row }
  } catch (err) {
    // Prisma's unique-constraint error code is P2002. We have two such
    // constraints, both per-user — coldkey or nickname already used.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return {
        ok: false,
        error:
          "You already have a nickname for this coldkey, or this nickname is already taken.",
      }
    }
    console.error("[addMyNickname]", err)
    return { ok: false, error: "Failed to save nickname" }
  }
}

export async function removeMyNickname(
  id: string,
): Promise<NicknameMutationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Must be signed in" }

  try {
    // deleteMany gives us a scoped delete — only rows with both matching id
    // AND user_id are removed, so users can't delete each other's rows even
    // if they guess an id.
    const result = await prisma.coldkeyNickname.deleteMany({
      where: { id, userId: user.id },
    })
    if (result.count === 0) {
      return { ok: false, error: "Nickname not found" }
    }
    revalidatePath("/portfolio")
    return { ok: true }
  } catch (err) {
    console.error("[removeMyNickname]", err)
    return { ok: false, error: "Failed to delete" }
  }
}
