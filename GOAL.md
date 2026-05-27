# AGENT.md

## Project Goal

Build a modern SaaS-style dashboard using:

- Next.js App Router
- TypeScript
- Prisma ORM
- Supabase Postgres
- Supabase Auth with Google and GitHub OAuth
- shadcn/ui
- Tailwind CSS
- Cursor as the AI-powered IDE

The dashboard should be clean, scalable, secure, and easy to extend.

---

## Core Stack

Use this stack unless explicitly told otherwise:

- Framework: Next.js
- Language: TypeScript
- UI: shadcn/ui + Tailwind CSS
- ORM: Prisma
- Database: Supabase Postgres
- Auth: Supabase Auth
- OAuth providers: Google, GitHub
- Forms: React Hook Form + Zod
- Tables: TanStack Table
- Charts: Recharts
- Deployment: Vercel
- Database hosting: Supabase

---

## Important Architecture Decision

We are using Supabase mainly for:

1. Postgres database
2. Authentication
3. OAuth provider handling
4. Optional storage later

We are NOT relying on Supabase client-side database access.

All application database reads/writes should go through:

- Server Components
- Server Actions
- Route Handlers
- Prisma Client

Do not query protected application tables directly from the browser using the Supabase client.

---

## Supabase RLS and Prisma Policy

Prisma does not “overwrite” Supabase RLS policies.

Instead, Prisma connects directly to Postgres using the database connection string. If Prisma connects using a privileged role such as `postgres`, `service_role`, or a role with `bypassrls`, then RLS can be bypassed.

Because of that, authorization must be enforced in the application layer.

For this project:

- Use Prisma on the server only.
- Never expose Prisma to the browser.
- Never expose the Supabase service role key to the browser.
- Do not use Supabase browser client for app data tables.
- Use Supabase browser client only for auth/session flows.
- Enforce ownership and workspace membership checks in server code.
- Prefer disabling Supabase Data API/PostgREST for app tables if Prisma is the only data access method.

---

## Security Rules

Every protected server action or route handler must:

1. Get the current authenticated user.
2. Validate input with Zod.
3. Check ownership or workspace membership.
4. Query with Prisma using scoped `where` clauses.
5. Return only data the user is allowed to access.

Never write queries like this for protected data:

```ts
await prisma.project.findMany()