# Billing and AI entitlements

Blocks bills organizations, not individual users, through Clerk Billing. A plan decides whether the organization can use AI and how many AI calls it gets each month.

| Plan | Slug | `ai_enabled` feature | AI calls per month |
|---|---|---|---|
| Free | `free` | No | 0 |
| Pro | `pro` | Yes | 500 |
| Business | `business` | Yes | 5,000 |

The monthly limits live in code (`PLAN_LIMITS` in `lib/entitlements.ts`), because Clerk has no metered billing. The plan slugs must match the Clerk Dashboard exactly. An unknown slug gets 0 calls.

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
2. Open **Billing → Features** and create a feature with the slug `ai_enabled`.
3. Open **Billing → Plans → Plans for Organizations** and create:
   - **Free**, slug `free`, $0. Leave it as the default plan and give it no features.
   - **Pro**, slug `pro`. Add the `ai_enabled` feature, and mark it **Publicly available**.
   - **Business**, slug `business`. Add the `ai_enabled` feature, and mark it **Publicly available**.
4. Check that **Configure → Sessions** has no custom session-token claim that overrides `pla` or `fea`.
