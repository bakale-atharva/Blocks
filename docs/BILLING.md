# Billing and AI entitlements

Blocks bills organizations, not individual users, through Clerk Billing. A plan decides whether the organization can use AI and how many AI calls it gets each month.

| Plan | Slug | `ai_enabled` feature | AI calls per month |
|---|---|---|---|
| Free | `free_org` | No | 0 |
| Pro | `pro` | Yes | 500 |
| Business | `business` | Yes | 5,000 |

The monthly limits live in code (`PLAN_LIMITS` in `lib/entitlements.ts`), because Clerk has no metered billing. The plan slugs must match the Clerk Dashboard exactly. An unknown slug gets 0 calls.

## Plans

Each plan below lists the name, slug, and description to enter in the Clerk Dashboard. These descriptions appear in `<PricingTable>`. Prices are set in the Dashboard and are not fixed by the code.

### Free

- **Name:** Free
- **Slug:** `free_org`. This is the slug Clerk gives its built-in default organization plan. `PLAN_LIMITS` also accepts `free`.
- **Features:** none
- **Description:** "Collaborative pages for your team. Unlimited pages, real-time editing, and presence. AI isn't included."

The default plan for every organization. Members get the full editor: nested pages and folders, real-time collaboration, uploads, search, and trash and restore. AI controls are hidden, and the server rejects AI calls with `AiNotEnabled`.

### Pro

- **Name:** Pro
- **Slug:** `pro`
- **Features:** `ai_enabled`
- **Description:** "Everything in Free, plus AI. Inline AI writing and the workspace assistant, with 500 AI calls a month."

For small teams starting with AI. Everything in Free, plus inline AI in the editor and the workspace assistant. The organization shares 500 AI calls each calendar month (UTC). At the limit, AI pauses with `QuotaExceeded` until the next month.

### Business

- **Name:** Business
- **Slug:** `business`
- **Features:** `ai_enabled`
- **Description:** "Everything in Pro, with 5,000 AI calls a month for teams that rely on AI every day."

For teams that use AI heavily. It has the same AI features as Pro, with ten times the monthly quota: 5,000 AI calls shared across the organization.

## Features

| Name | Slug | Plans | Description |
|---|---|---|---|
| AI Access | `ai_enabled` | Pro, Business | Unlocks inline AI writing in the editor and the workspace assistant. Usage counts against the plan's monthly AI quota. |

`ai_enabled` is the only feature the code checks:

- The server checks it through `fea` in `getEntitlements`.
- The UI checks it through `has({ feature: "org:ai_enabled" })` in `<AiGate>`.

The quota is not a Clerk feature. It comes from the plan slug, through `PLAN_LIMITS`.

### What counts as one AI call

Each request that reaches the model counts as one call:

- one inline AI command in the editor (Phase 5)
- one message to the workspace assistant (Phase 6)

A call the server rejects for entitlement or quota reasons is not counted.

## How enforcement works

- **The server is the gate.** `getEntitlements(ctx)` in `lib/entitlements.ts` reads two claims from the Clerk session token that Convex receives:
  - `pla`, for example `o:pro`.
  - `fea`, for example `o:ai_enabled`.

  Only organization-scoped (`o:`) values count. AI is on only when the feature is present *and* the plan's limit is above 0. Missing claims mean no AI.
- **The quota is atomic.** `consumeAiCall` in `convex/aiUsage.ts` (internal mutation `aiUsage.consume`) runs one transaction. It reads the `aiUsage` row for `(orgId, "YYYY-MM")` in UTC, checks the limit, then increments the count. It throws a `ConvexError` whose `data.code` is either:
  - `AiNotEnabled`, when the plan has no AI.
  - `QuotaExceeded`, when the month's limit is used up.

  Phase 5's `/api/ai` and Phase 6's agent call it before every model call.
- **The UI only mirrors this.** `<AiGate>` and `useAiEnabled()` in `components/billing/AiGate.tsx` use Clerk's `has({ feature: "org:ai_enabled" })` to hide AI controls and show an upgrade call to action. `/billing` shows the usage meter (`aiUsage.current`) to every member. Only org admins see the pricing table.
- **Plan changes take effect when the token refreshes.** The claims update when Clerk refreshes the session token, which happens within about a minute. No webhook or cache is needed, so the optional `subscription.*` webhook was left out.

The billing claims exist only in Clerk's default session token. They aren't in custom JWT templates. This app sends the default token to Convex (see `ClerkIdentity` in `lib/auth.ts`). If it ever switches to a JWT template, AI turns off for everyone until entitlements are fetched another way.

## Clerk Dashboard setup (done by hand)

1. Open **Billing → Settings** and enable Billing. In development, use Clerk's test payment gateway.
2. Open **Billing → Features** and create the **AI Access** feature (slug `ai_enabled`), using the description from [Features](#features).
3. Open **Billing → Plans → Plans for Organizations** and create each plan with the name, slug, and description from [Plans](#plans):
   - **Free**: edit Clerk's built-in default plan (slug `free_org`, $0). Keep it as the default and give it no features.
   - **Pro**, slug `pro`. Add the `ai_enabled` feature, and mark it **Publicly available**.
   - **Business**, slug `business`. Add the `ai_enabled` feature, and mark it **Publicly available**.
4. Check that **Configure → Sessions** has no custom session-token claim that overrides `pla` or `fea`.
