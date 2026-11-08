import type {
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "../convex/_generated/server";
import { getOrgContext } from "./auth";

/**
 * Organization billing entitlements, derived on the server from the Clerk
 * session token. The client's `<AiGate>` mirrors this for the UI only; this
 * module is the real gate.
 *
 * Plans are configured in the Clerk Dashboard (Billing → Plans, for
 * organizations). The slugs below must match the Dashboard's plan slugs.
 * Clerk has no metered billing, so the monthly AI quota per plan lives here
 * and is enforced by `convex/aiUsage.ts`.
 *
 * This file only has type-level Convex imports, so client components can
 * import `PLAN_LIMITS` and `AI_FEATURE` from it too.
 */

/** The Clerk Billing feature slug that unlocks AI on a plan. */
export const AI_FEATURE = "ai_enabled";

/**
 * Monthly AI calls allowed per organization plan slug. `free_org` is the slug
 * Clerk gives its built-in default organization plan; `free` is kept for a
 * Free plan created by hand.
 */
export const PLAN_LIMITS = {
  free_org: 0,
  free: 0,
  pro: 500,
  business: 5000,
} as const satisfies Record<string, number>;

export type PlanSlug = keyof typeof PLAN_LIMITS;

export type Entitlements = {
  orgId: string;
  /** The org's plan slug, or `null` when the token carries no org plan. */
  plan: string | null;
  /** Org-scoped feature slugs, without the `o:` prefix. */
  features: string[];
  /** True only with the AI feature *and* a plan limit above zero. */
  aiEnabled: boolean;
  /** Monthly AI call limit for the plan (0 when AI is not enabled). */
  aiMonthlyLimit: number;
};

/**
 * The Clerk billing claims we read off the Convex identity. Both live in the
 * default (v2) session token, which is the token this app sends to Convex
 * (see `ClerkIdentity` in `lib/auth.ts`). Custom JWT templates don't carry
 * them, in which case AI fails closed.
 *
 * - `pla`: `"o:pro"` with an active organization, `"u:free"` without one.
 * - `fea`: comma-separated, e.g. `"o:ai_enabled,o:other"`.
 */
type BillingClaims = {
  pla?: unknown;
  fea?: unknown;
};

const ORG_SCOPE = "o:";

/** Parse `pla` into the org plan slug. User-scoped (`u:`) plans are ignored. */
export function parseOrgPlan(pla: unknown): string | null {
  if (typeof pla !== "string" || !pla.startsWith(ORG_SCOPE)) return null;
  const slug = pla.slice(ORG_SCOPE.length).trim();
  return slug.length > 0 ? slug : null;
}

/** Parse `fea` into org feature slugs. User-scoped (`u:`) features are ignored. */
export function parseOrgFeatures(fea: unknown): string[] {
  const raw = Array.isArray(fea)
    ? fea.filter((item): item is string => typeof item === "string")
    : typeof fea === "string"
      ? fea.split(",")
      : [];
  return raw
    .map((item) => item.trim())
    .filter((item) => item.startsWith(ORG_SCOPE))
    .map((item) => item.slice(ORG_SCOPE.length))
    .filter((item) => item.length > 0);
}

/** The monthly AI limit for a plan slug. Unknown plans get 0. */
export function planLimit(plan: string | null): number {
  if (plan === null || !Object.prototype.hasOwnProperty.call(PLAN_LIMITS, plan)) {
    return 0;
  }
  return PLAN_LIMITS[plan as PlanSlug];
}

/**
 * Resolve the caller's organization entitlements.
 *
 * Throws like `getOrgContext` when there is no active organization. Never
 * takes an org id or plan from the client.
 */
export async function getEntitlements(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<Entitlements> {
  const { orgId } = await getOrgContext(ctx);
  const identity = await ctx.auth.getUserIdentity();
  const claims = (identity ?? {}) as unknown as BillingClaims;

  const plan = parseOrgPlan(claims.pla);
  const features = parseOrgFeatures(claims.fea);
  const limit = planLimit(plan);
  const aiEnabled = features.includes(AI_FEATURE) && limit > 0;

  return {
    orgId,
    plan,
    features,
    aiEnabled,
    aiMonthlyLimit: aiEnabled ? limit : 0,
  };
}
