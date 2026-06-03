// Next.js stores env vars in .env.local; the default `dotenv/config` only
// reads `.env`, so we point dotenv at .env.local explicitly. Falls back to
// any already-set DATABASE_URL (e.g. on CI / Vercel build).
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });
loadEnv(); // also load plain .env if present, without overriding .env.local

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // The pooler URL (port 6543) works for runtime but transaction-mode pgbouncer
  // can hang on DDL — run schema operations against DIRECT_URL instead:
  //   npx prisma db push --url "$DIRECT_URL"
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
