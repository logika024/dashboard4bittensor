# dashboard4bittensor

A Next.js dashboard for Bittensor — subnet screener, metagraph viewer, incentive charts, TAO/BTC price tracking, and per-user coldkey portfolio tracking with custom nicknames.

> **Heads up:** this project pins **Next.js 16**, **React 19**, and **Prisma 7** (new `prisma-client` provider). APIs and conventions differ from older docs and most training data. When in doubt, read `node_modules/next/dist/docs/` after `npm install`. See [AGENTS.md](./AGENTS.md) and [GOAL.md](./GOAL.md) for architecture rules.

---

## Stack

| Layer       | Choice                                       |
| ----------- | -------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)           |
| Language    | TypeScript 5 (strict)                        |
| UI          | shadcn/ui (radix-nova) + Tailwind v4         |
| ORM         | Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) |
| Database    | Supabase Postgres                            |
| Auth        | Supabase Auth (Google + GitHub OAuth)        |
| Forms       | React Hook Form + Zod                        |
| Tables      | TanStack Table                               |
| Charts      | Recharts 3                                   |
| Data feeds  | taoswap.org (no key) + CoinGecko             |
| Deployment  | Vercel                                       |

---

## Features

- **Subnet screener** — sortable/paginated table of all subnets with emission, price, market cap, and 24 h change. Live TAO + BTC price charts at the top with range buttons (24 h, 7 d, 1 m, etc.) in the user's local timezone.
- **Subnet detail page** (`/subnet/[netuid]`) — hyperparameters grid, metagraph table with search + sorting + pagination (validators and subnet owner highlighted), and incentive distribution chart with hover crosshair.
- **Portfolio** (`/portfolio`) — public coldkey balance tracker. 30-day history chart works keylessly (taoswap.org); the live spot-balance breakdown additionally needs `TAOAPP_API_KEY` (see below). Signed-in users can save **coldkey nicknames** that appear on the incentive chart's info bar.
- **Auth** — Google + GitHub OAuth via Supabase. Middleware-enforced protected routes.

---

## Prerequisites

- **Node.js 20+** and **npm**
- A **Supabase project** ([dashboard.supabase.com](https://supabase.com/dashboard)) — free tier is fine
- A **Google Cloud** account (for Google OAuth client)
- A **GitHub** account (for GitHub OAuth App)
- Windows users: the PowerShell snippets below assume PowerShell 5+. Bash works everywhere too.

---

## Quick start

### 1. Clone and install

```bash
git clone <repo-url> dashboard4bittensor
cd dashboard4bittensor
npm install
```

### 2. Create `.env.local`

Create a file named `.env.local` at the repo root with these keys (real values come in the next sections):

```env
# --- Supabase (auth + database) -------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Postgres connection — transaction pooler (port 6543, pgbouncer). Used at
# runtime by Prisma server actions. The connection_limit=1 hint is for
# serverless envs; harmless locally.
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Postgres direct/session pooler (port 5432). Used ONLY by `prisma db push`
# and `prisma migrate` because pgbouncer transaction mode can hang on DDL.
DIRECT_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# --- TAO.app API (OPTIONAL) -----------------------------------------------
# Only needed for the live coldkey balance lookup on /portfolio. Without it,
# the rest of the app works fine — only the "spot balance" widget on the
# portfolio page will return 503. Subnets, metagraph, charts, history, and
# nicknames all use keyless data sources (taoswap.org + CoinGecko).
# TAOAPP_API_KEY=your_tao_app_api_key
# TAOAPP_API_BASE_URL=https://api.tao.app   # rarely needed, defaults to this

# --- OAuth (NOT secrets used by app code — only stored here as reference) -
# Configure these in Supabase → Authentication → Providers. The keys below
# are optional placeholders; the app itself doesn't read them. Useful as a
# memo for which credentials belong to which app.
# Google_Client_Id=...
# Google_Client_Secret=...
# Github_Client_Id=...
# Github_Client_Secret=...
```

### Optional: TAO.app key

The `TAOAPP_API_KEY` gates exactly one feature — the **live spot-balance widget** on `/portfolio` (the card that breaks a coldkey's holdings down by subnet at the current block). The 30-day history chart on the same page uses keyless **taoswap.org** and keeps working without it.

TAO.app doesn't expose a self-serve signup; if you need this widget, ask the project owner for a key. The rest of the dashboard works fully without one, so feel free to skip this and revisit later.

> `.env*` is git-ignored. **Never commit secrets.** Never expose the Supabase `service_role` key to the browser — this project doesn't use it.

### 3. Get the Supabase values

Sign in to [supabase.com/dashboard](https://supabase.com/dashboard), create a new project (pick a strong DB password and **save it** — you'll paste it into `DATABASE_URL` / `DIRECT_URL`).

| Value                          | Where to find it                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | **Project Settings → API → Project URL**                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| **Project Settings → API → Project API keys → `anon` `public`**                   |
| `DATABASE_URL` / `DIRECT_URL`  | Top-bar **Connect** button → **ORMs** tab → select **Prisma** in the dropdown    |

The **Connect → ORMs → Prisma** view gives you both URIs ready to paste — replace `[YOUR-PASSWORD]` with the password you set when creating the project. If you lost it, reset it at **Project Settings → Database → Reset database password** (you'll see it only once).

**Why two URLs?** Supabase exposes Postgres via a connection pooler in two modes:
- **Transaction mode** (`:6543`, with `pgbouncer=true`) — short-lived statements, serverless-safe → `DATABASE_URL`
- **Session mode** (`:5432`) — full session features including DDL → `DIRECT_URL`, used only by migrations.

### 4. Configure Supabase URL allowlist

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs** (add both):
  - `http://localhost:3000/auth/callback`
  - your production URL, e.g. `https://your-app.vercel.app/auth/callback`

Without this, Supabase refuses to redirect back to the app after OAuth completes.

### 5. Enable Google OAuth

**a. Google Cloud Console** → [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

1. Create (or pick) a project, configure the **OAuth consent screen** if prompted (External, fill required fields; add your email as a test user while in "Testing" mode).
2. **Create Credentials → OAuth client ID** → Application type: **Web application**.
3. Set:
   - **Authorized JavaScript origins**: `https://YOUR_PROJECT_REF.supabase.co`
   - **Authorized redirect URIs**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     *(This is the **Supabase** URL — NOT your localhost. Supabase brokers the round-trip.)*
4. Copy the **Client ID** and **Client Secret**.

**b. Supabase dashboard** → **Authentication → Providers → Google**

- Toggle **Enable**, paste Client ID + Secret, **Save**.

### 6. Enable GitHub OAuth

**a. GitHub** → [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**

- **Homepage URL**: `http://localhost:3000` (any valid URL works)
- **Authorization callback URL**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Create the app, then **Generate a new client secret**.

**b. Supabase dashboard** → **Authentication → Providers → GitHub**

- Toggle **Enable**, paste Client ID + Secret, **Save**.

### 7. Set up the database schema

Apply the schema and generate the Prisma client:

```bash
# Apply schema to your Supabase Postgres (creates tables)
npx prisma db push --url "$DIRECT_URL"

# Generate the typed client at lib/generated/prisma/
npx prisma generate
```

PowerShell equivalent for the `--url` argument:

```powershell
npx prisma db push --url $env:DIRECT_URL
```

Tables created on first run:

| Table                 | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `coldkey_nicknames`   | Per-user (coldkey, nickname) pairs. Two unique constraints scope to `user_id` so different users can label the same coldkey independently. |

**Why `db push` and not `migrate dev`?** On Supabase's free tier the `postgres` role can't `CREATE DATABASE`, so Prisma's shadow-database step (used by `migrate dev` to verify migrations) hangs. `db push` skips the shadow DB and diffs the schema directly. For a multi-developer team that wants migration history, use `npx prisma migrate dev --create-only --url "$DIRECT_URL"` instead — the `--create-only` flag generates the SQL without applying it (and without needing a shadow DB), then commit the generated `prisma/migrations/<timestamp>_<name>/migration.sql` file and apply it with `npx prisma migrate deploy --url "$DIRECT_URL"`.

### 8. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

---

## Verifying the setup

1. [http://localhost:3000](http://localhost:3000) → redirects to `/login`.
2. Click **Continue with Google** or **Continue with GitHub** → approve consent → bounce through `/auth/callback` → land on `/dashboard`.
3. Try the **subnets screener**, click any subnet name → detail page loads.
4. Visit `/portfolio`. Add a `(coldkey, nickname)` pair. Visit a subnet detail page where that coldkey is in the metagraph → hover its dot on the incentive chart → the nickname appears above the address.
5. **Sign out** → back to `/login`. While signed in, visiting `/login` redirects to `/dashboard`. While signed out, visiting `/dashboard` redirects to `/login?next=/dashboard`.

---

## Scripts

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build
npm run start    # production server
npm run lint     # eslint
```

---

## Updating the schema

When you change `prisma/schema.prisma`:

```bash
npx prisma db push --url "$DIRECT_URL"   # apply diff to DB
npx prisma generate                       # regenerate typed client
```

> Always pass `--url "$DIRECT_URL"` to schema operations on Supabase. `db push` reads `DATABASE_URL` by default, which is the transaction pooler — DDL through pgbouncer in transaction mode can hang silently.

If you add a new model, the `@prisma/adapter-pg` adapter handles pooling transparently — no code change needed in [lib/prisma/client.ts](./lib/prisma/client.ts).

---

## Project structure

```
app/
  page.tsx                       # redirects to /dashboard or /login based on session
  layout.tsx                     # root layout, fonts, global dark theme
  globals.css                    # Tailwind v4 theme tokens
  login/                         # OAuth login UI + actions
  auth/callback/                 # OAuth code-exchange handler
  dashboard/                     # subnet screener (TAO + BTC charts + table)
  portfolio/                     # coldkey portfolio + nicknames
  subnet/[netuid]/               # subnet detail page
  api/portfolio/balance/         # taoswap spot balance
  api/portfolio/history/         # taoswap 30-day history
  api/prices/[coin]/             # CoinGecko price proxy

components/
  ui/                            # shadcn primitives (radix-nova)
  dashboard/                     # screener, metagraph, charts, hyperparams
  portfolio/                     # portfolio client + nicknames section

lib/
  supabase/                      # SSR client, browser client, middleware
  prisma/client.ts               # Prisma singleton w/ @prisma/adapter-pg
  generated/prisma/              # generated Prisma client (gitignored)
  portfolio/                     # nickname server actions + types
  taoswap/                       # taoswap.org client (no API key)
  taoapp/                        # legacy TAO.app client (server-only)
  coingecko/                     # CoinGecko price client
  utils.ts                       # cn() helper

prisma/
  schema.prisma                  # database schema

middleware.ts                    # session refresh + protected-route logic
prisma.config.ts                 # loads .env.local, points Prisma at DB
```

---

## Architecture rules

(Also see [GOAL.md](./GOAL.md) for the full version.)

- **Supabase is for auth only.** All app data goes through **Prisma on the server** (Server Components, Server Actions, Route Handlers).
- **Never import Prisma into client components.** The `prisma-client` provider in Prisma 7 is binary-less but still server-only.
- **Never expose the Supabase `service_role` key** to the browser.
- Prisma connects with a privileged role and **bypasses RLS** — authorization must be enforced **in application code** on every protected handler:
  1. Get the authenticated user via `supabase.auth.getUser()`.
  2. Validate input with **Zod**.
  3. Check ownership / workspace membership.
  4. Scope every Prisma query with `where: { userId }` (or equivalent).
- Don't write unscoped queries like `prisma.coldkeyNickname.findMany()` for protected data.

See [lib/portfolio/nicknames.ts](./lib/portfolio/nicknames.ts) for a canonical example of all four steps.

---

## Troubleshooting

| Symptom                                                                          | Cause / Fix                                                                                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Unsupported provider...` on OAuth                                               | Provider not enabled in Supabase. Complete step 5 or 6.                                                                                                |
| `redirect_uri_mismatch` (Google) or `redirect_uri not in allow list` (GitHub)    | OAuth app's authorized redirect URI doesn't match `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`. Fix step 5a / 6a.                          |
| OAuth succeeds but bounces to `/login?error=...`                                 | Target URL not in Supabase **Redirect URLs** allowlist. Fix step 4.                                                                                    |
| Env edits ignored                                                                | `.env.local` is read at process start — restart `npm run dev` after editing.                                                                          |
| `Error: The datasource.url property is required in your Prisma config file`     | Prisma 7's `dotenv` integration only reads `.env` by default. Already handled in [prisma.config.ts](./prisma.config.ts) — make sure your secrets are in `.env.local`, not `.env`. |
| `prisma migrate dev` hangs forever                                               | Supabase free tier can't create the shadow database. Use `npx prisma db push --url "$DIRECT_URL"` instead (see step 7).                                |
| `prisma db push` hangs                                                           | You're hitting the transaction pooler (`:6543`). Pass `--url "$DIRECT_URL"` explicitly so DDL goes to session mode (`:5432`).                          |
| `Module not found: '@/lib/generated/prisma/client'`                              | Client never generated. Run `npx prisma generate`.                                                                                                     |
| `Property 'accelerateUrl' is missing` TS error in `lib/prisma/client.ts`         | The `prisma-client` provider needs a driver adapter. Already wired with `@prisma/adapter-pg` — make sure `npm install` succeeded.                      |
| Login works locally but fails on Vercel                                          | Production URL not added to Supabase **Redirect URLs**, or env vars missing on Vercel.                                                                 |
| `/portfolio` shows `TAOAPP_API_KEY is not configured on the server` (503)        | Expected if you didn't set `TAOAPP_API_KEY`. Only the live spot-balance card depends on it — history + nicknames still work. See "Optional: TAO.app key" above. |

---

## Deployment (Vercel)

1. Push to GitHub, import the repo into Vercel.
2. Add all env vars from `.env.local` to the Vercel project's **Environment Variables** (same names, production values).
3. In **Supabase → Authentication → URL Configuration**:
   - Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**.
   - Set the **Site URL** to your production domain.
4. In **Google Cloud / GitHub OAuth Apps**: redirect URIs stay as `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` — that part doesn't change between local and prod (Supabase always brokers the round-trip).
5. Deploy.

The first deploy on Vercel runs `npm run build`, which runs `prisma generate` via the `postinstall` hook. The schema must already be applied to Supabase (step 7) before the build can use it.

---

## Useful reading

- [AGENTS.md](./AGENTS.md) — Next 16 / React 19 / Tailwind v4 deprecation notice
- [GOAL.md](./GOAL.md) — full architecture rules (Supabase auth-only, Prisma server-only, authz in app code)
- `node_modules/next/dist/docs/` — local copy of the relevant Next.js 16 docs
