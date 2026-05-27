# dashboard4bittensor

A Next.js dashboard scaffold with Supabase auth (Google + GitHub OAuth), Prisma, shadcn/ui, and Tailwind v4.

> **Heads up:** this project pins **Next.js 16** and **React 19**. APIs and conventions differ from older Next docs and most training data. When in doubt, read `node_modules/next/dist/docs/` after `npm install`. See [AGENTS.md](./AGENTS.md) and [GOAL.md](./GOAL.md) for architecture rules.

---

## Stack

| Layer       | Choice                                  |
| ----------- | --------------------------------------- |
| Framework   | Next.js 16 (App Router)                 |
| Language    | TypeScript 5                            |
| UI          | shadcn/ui (radix-nova) + Tailwind v4    |
| ORM         | Prisma 7                                |
| Database    | Supabase Postgres                       |
| Auth        | Supabase Auth (Google + GitHub OAuth)   |
| Forms       | React Hook Form + Zod                   |
| Tables      | TanStack Table                          |
| Charts      | Recharts                                |
| Deployment  | Vercel                                  |

---

## Prerequisites

- **Node.js 20+** and npm
- A **Supabase project** ([dashboard.supabase.com](https://supabase.com/dashboard))
- A **Google Cloud** account (for the Google OAuth client)
- A **GitHub** account (for a GitHub OAuth App)

---

## Quick start

### 1. Clone and install

```bash
git clone <repo-url> dashboard4bittensor
cd dashboard4bittensor
npm install
```

### 2. Create `.env.local`

Create a file named `.env.local` at the repo root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Used by Prisma — direct Postgres connection string from Supabase
# (Project Settings -> Database -> Connection string -> URI)
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Find these values in the Supabase dashboard:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Project Settings → API**
- `DATABASE_URL` → **Project Settings → Database → Connection string** (use the **Transaction pooler** URI)

> `.env*` is gitignored. **Never commit secrets.** Never expose the `service_role` key to the browser.

### 3. Configure Supabase URL allowlist

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs** (add both):
  - `http://localhost:3000/auth/callback`
  - your production URL, e.g. `https://your-app.vercel.app/auth/callback`

Without this, Supabase refuses to redirect back to your app after OAuth completes.

### 4. Enable Google OAuth

**a. Google Cloud Console** → [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

1. Create (or pick) a project, configure the **OAuth consent screen** if prompted (External, fill required fields; add your email as a test user while in "Testing" mode).
2. **Create Credentials → OAuth client ID** → Application type: **Web application**.
3. Set:
   - **Authorized JavaScript origins**: `https://YOUR_PROJECT_REF.supabase.co`
   - **Authorized redirect URIs**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     *(This is Supabase's URL — NOT your localhost. Supabase brokers the OAuth round-trip.)*
4. Copy the **Client ID** and **Client Secret**.

**b. Supabase dashboard** → **Authentication → Providers → Google**

- Toggle **Enable**, paste Client ID + Secret, **Save**.

### 5. Enable GitHub OAuth

**a. GitHub** → [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**

- **Homepage URL**: `http://localhost:3000` (any valid URL works)
- **Authorization callback URL**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Create the app, then **Generate a new client secret**.

**b. Supabase dashboard** → **Authentication → Providers → GitHub**

- Toggle **Enable**, paste Client ID + Secret, **Save**.

### 6. (Optional) Prisma

The Prisma schema is currently empty. Once you add models:

```bash
npx prisma migrate dev --name init   # create + apply migration
npx prisma generate                  # regenerate client
```

The generated client lives at `lib/generated/prisma` (gitignored).

### 7. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

---

## Verifying the auth flow

1. Go to [http://localhost:3000](http://localhost:3000) → redirects to `/login`.
2. Click **Continue with Google** or **Continue with GitHub**.
3. Approve consent at the provider → bounce through `/auth/callback` → land on `/dashboard` with a "hello protected user!" greeting and your avatar.
4. Click **Sign out** → back to `/login`.
5. While signed in, visiting `/login` redirects to `/dashboard`. While signed out, visiting `/dashboard` redirects to `/login?next=/dashboard`.

### Common errors

| Error                                                                          | Cause                                                                                                                                  |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider..."}` | The provider is not enabled in Supabase. Complete step 4 or 5.                                                                         |
| `redirect_uri_mismatch` (Google) / `redirect_uri not in allow list`            | The provider's authorized redirect URI doesn't match `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`. Fix step 4a / 5a.        |
| Redirect succeeds but bounces back to `/login?error=...`                       | The redirect target isn't in the Supabase **Redirect URLs** allowlist. Fix step 3.                                                    |
| Env changes seemingly ignored                                                  | `.env.local` is read at process start — restart `npm run dev` after editing.                                                            |

---

## Scripts

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start (production server)
npm run lint     # eslint
```

---

## Project structure

```
app/
  page.tsx                  # redirects to /dashboard or /login based on session
  layout.tsx                # root layout, fonts, global dark theme
  globals.css               # Tailwind v4 theme tokens (light + dark)
  login/
    page.tsx                # OAuth login UI
    actions.ts              # signInWithProvider + signOut server actions
  auth/callback/
    route.ts                # OAuth code-exchange handler
  dashboard/
    page.tsx                # protected page (middleware-enforced)

lib/
  supabase/
    server.ts               # server client (RSC / route handlers / actions)
    client.ts               # browser client (auth/session only)
    middleware.ts           # session refresh + protected-route logic
  utils.ts                  # cn() helper

components/ui/              # shadcn primitives (radix-nova style)
hooks/                      # shared client hooks
prisma/schema.prisma        # Prisma schema (currently empty)
middleware.ts               # entry point that calls updateSession()
```

---

## Architecture rules (also see [GOAL.md](./GOAL.md))

- **Supabase is used for auth + Postgres only.** All app data goes through **Prisma on the server** (Server Components, Server Actions, Route Handlers).
- **Never use the Supabase browser client for app data** — only for auth/session flows.
- **Never expose the `service_role` key** or Prisma to the browser.
- Prisma connects with a privileged role and may **bypass Supabase RLS** — authorization must be enforced **in application code** on every protected handler:
  1. Get the authenticated user.
  2. Validate input with **Zod**.
  3. Check ownership / workspace membership.
  4. Scope every Prisma query with `where` clauses.
- Don't write unscoped queries like `prisma.project.findMany()` for protected data.

---

## Deployment (Vercel)

1. Push to GitHub, import the repo into Vercel.
2. Add the same env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`) to the Vercel project's **Environment Variables**.
3. In **Supabase → Authentication → URL Configuration**, add `https://your-app.vercel.app/auth/callback` to the Redirect URLs and set the **Site URL** to your production domain.
4. Deploy.

---

## What's not built yet

- Real dashboard pages and navigation (sidebar primitive is already in `components/ui/sidebar.tsx`).
- Prisma data models — schema is empty.
- A `User` / `Workspace` model mirroring `auth.users` if you need foreign keys from app tables.
- Email-magic-link or password auth (intentionally — OAuth only per spec).
