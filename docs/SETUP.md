# Local setup

## Prerequisites

- Node 24 or later. The baseline was recorded on 24.21.0.
- pnpm 12 or later. The baseline was recorded on 12.11.2.
- A Convex account and dev deployment.
- A Clerk application with Organizations enabled, and the Convex integration activated. `convex/auth.config.ts` expects `applicationID: "convex"`.
- Optional: Graphify 0.9.102, to regenerate the code map.

## Install

```bash
pnpm install
```

## Environment

Create `.env.local` in the repo root. It is gitignored, so never commit it. It needs these keys:

| Variable | Used by | Purpose |
|---|---|---|
| `CONVEX_DEPLOYMENT` | Convex CLI | The dev deployment. `convex dev` writes this value |
| `NEXT_PUBLIC_CONVEX_URL` | Browser | The Convex client URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Browser | The Convex HTTP actions URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser | The Clerk publishable key |
| `CLERK_SECRET_KEY` | Next.js server | The Clerk secret key |

Set this one on the Convex deployment, not in `.env.local`:

| Variable | Purpose |
|---|---|
| `CLERK_FRONTEND_API_URL` | The Clerk issuer domain, read by `convex/auth.config.ts` |

To set it on the deployment, run:

```bash
npx convex env set CLERK_FRONTEND_API_URL <your-clerk-frontend-api-url>
```

## Run

Run the backend and frontend in two terminals. The backend runs `convex dev`, which watches `convex/` and pushes functions to your dev deployment:

```bash
pnpm backend
```

The frontend runs `next dev` at http://localhost:3000:

```bash
pnpm frontend
```

Sign in, then create or select an organization. Documents are scoped to the active organization.

## Checks

```bash
pnpm lint
```

```bash
pnpm exec tsc --noEmit --incremental false
```

```bash
pnpm build
```

At the Phase 0 baseline, `tsc` and `build` fail on a known AI SDK type conflict (ATH-259). The details are in `BASELINE.md`.

## Code map

Open `graphify-out/graph.html` in a browser to explore the map. To regenerate it after code changes, run:

```bash
graphify extract . --code-only --no-cluster
```

```bash
graphify cluster-only . --no-label
```
