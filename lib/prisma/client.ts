import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/lib/generated/prisma/client"

/**
 * Server-only Prisma singleton. The new `prisma-client` provider in Prisma 7
 * is binary-less and requires a driver adapter — `@prisma/adapter-pg` wraps
 * node-postgres with a connection pool sized for serverless.
 *
 * Reused across dev hot reloads via globalThis to avoid exhausting Postgres
 * connections. Per GOAL.md: never import into client components.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
