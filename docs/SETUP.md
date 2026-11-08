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

Set these on the Convex deployment, not in `.env.local`:

| Variable | Purpose |
|---|---|
| `CLERK_FRONTEND_API_URL` | The Clerk issuer domain, read by `convex/auth.config.ts` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | The signing secret of the Clerk webhook endpoint, read by `convex/http.ts` |
| `OPENROUTER_API_KEY` | The OpenRouter key for inline AI, read by `convex/inlineAi.ts`. It never leaves the server |
| `OPENROUTER_MODEL` | The OpenRouter model id for inline AI, for example an `anthropic/claude-sonnet-…` id from openrouter.ai/models. Pick a model that supports tool calling |
| `APP_ORIGINS` | Comma-separated browser origins allowed to call `/api/ai` (CORS). Defaults to `http://localhost:3000`. Add your production origin before deploying |

Without `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, `/api/ai` returns 500 `AiNotConfigured` and no quota is used.

To set them on the deployment, run:

```bash
npx convex env set CLERK_FRONTEND_API_URL <your-clerk-frontend-api-url>
```

```bash
npx convex env set CLERK_WEBHOOK_SIGNING_SECRET <your-webhook-signing-secret>
```

```bash
npx convex env set OPENROUTER_API_KEY <your-openrouter-key>
```

```bash
npx convex env set OPENROUTER_MODEL <openrouter-model-id>
```

## Inline AI

The editor's AI menu posts to the Convex HTTP action `https://<your-deployment>.convex.site/api/ai`, with the user's Convex token as a bearer token. The endpoint:

1. Returns 401 `Unauthenticated` without a signed-in user and an active organization.
2. Returns 500 `AiNotConfigured` when the OpenRouter env vars are missing.
3. Records one AI call against the organization's monthly quota. It returns 403 `AiNotEnabled` on a plan without AI, and 429 `QuotaExceeded` at the limit (see [BILLING.md](BILLING.md)).
4. Streams the model's edits back. The client shows them as suggestions to accept or reject.

The editor shows the server's message as a toast when a call is refused.

## Clerk configuration

Every workspace is a Clerk organization, so the Clerk instance needs:

1. **Organizations** enabled, with **personal accounts** turned off. Then Clerk gives new users the `choose-organization` session task, and `ClerkProvider` sends them to `/select-org`.
2. **A webhook endpoint** (Dashboard → Webhooks → Add endpoint):
   - URL: `https://<your-deployment>.convex.site/clerk-webhook`. This is the Convex site URL, not the `.convex.cloud` one.
   - Events: `user.created`, `user.updated`, `user.deleted`, `organization.created`, `organization.updated`, `organization.deleted`, `organizationMembership.created`, `organizationMembership.updated`, and `organizationMembership.deleted`.
   - Copy the endpoint's signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`, as above.

The webhook mirrors users, organizations, and memberships into the Convex tables of the same names. Until it has seen an organization, membership checks for that org fall back to the Clerk session token alone.

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

All three checks pass as of Phase 1, and lint reports zero warnings. The Phase 0 failures are recorded in `BASELINE.md`.

## Code map

`graphify-out/` is gitignored, so generate the map locally, then open `graphify-out/graph.html` in a browser. Run the same commands again after code changes:

```bash
graphify extract . --code-only --no-cluster
```

```bash
graphify cluster-only . --no-label
```
