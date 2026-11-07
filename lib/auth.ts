import type {
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "../convex/_generated/server";

/**
 * Authenticated organization context derived entirely server-side from the
 * Clerk-issued JWT. Never trust an `orgId` passed in as a function argument —
 * always derive it here from `ctx.auth.getUserIdentity()`.
 *
 * - `orgId`   — Clerk's active-organization id (`org_id` claim). Every
 *               org-scoped Convex query/mutation must filter on this.
 * - `subject` — Clerk's stable user id (`sub` claim), used as the author.
 * - `orgRole` — Clerk's active-org role claim (`org_role`), when present.
 */
export type OrgContext = {
  orgId: string;
  subject: string;
  orgRole?: string;
};

/**
 * Any Convex execution context that exposes `ctx.auth`. Queries, mutations and
 * actions all satisfy this, so `getOrgContext` is usable from every kind of
 * Convex function.
 */
export type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * The Clerk JWT identity shape we read. The base `UserIdentity` only declares
 * the standard OIDC claims, so we widen it to include Clerk's organization
 * claims. Two shapes exist depending on how the Convex token is minted:
 *
 *  - Native Convex integration (default session token, `aud: "convex"`): the
 *    active org is packed into the compact v2 `o` claim (`o.id`/`o.rol`/`o.slg`).
 *    This is what ConvexProviderWithClerk sends when the session token already
 *    has `aud: "convex"`.
 *  - JWT-template path (`getToken({ template: "convex" })`): top-level
 *    `org_id`/`org_role`/`org_slug` claims (from the `{{org.*}}` shortcodes).
 *
 * We read whichever is present so the app works under either configuration.
 */
type ClerkIdentity = {
  subject: string;
  orgId?: string | null;
  org_role?: string | null;
  org_slug?: string | null;
  o?: { id?: string; rol?: string; slg?: string } | null;
};

/**
 * Resolve the active organization context for the caller.
 *
 * Throws `"No active organization"` when the request is unauthenticated or has
 * no active Clerk organization, so callers can rely on a non-null
 * `{ orgId, subject }` on success.
 */
export async function getOrgContext(ctx: AuthCtx): Promise<OrgContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("No active organization.");
  }

  const claims = identity as unknown as ClerkIdentity;
  const orgId = claims.orgId ?? claims.o?.id ?? undefined;
  const subject = claims.subject;

  if (!orgId || !subject) {
    throw new Error("No active organization.");
  }

  return {
    orgId,
    subject,
    orgRole: claims.org_role ?? claims.o?.rol ?? undefined,
  };
}

export const NOT_A_MEMBER = "You are no longer a member of this organization.";

/**
 * `getOrgContext` plus a cross-check against the `memberships` mirror that
 * the Clerk webhook keeps (`convex/clerkSync.ts`). Use it in sensitive
 * mutations.
 *
 * The JWT is still the authority for which org the caller is in. This check
 * closes the gap between a member being removed in Clerk and their
 * short-lived session token expiring.
 *
 * It only enforces once the org has been mirrored, meaning its
 * `organizations` row exists. Until the webhook is configured and has seen
 * the org, it falls back to the JWT alone, so a missing webhook can't lock
 * every member out.
 */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
): Promise<OrgContext> {
  const org = await getOrgContext(ctx);

  const mirroredOrg = await ctx.db
    .query("organizations")
    .withIndex("byClerkOrgId", (q) => q.eq("clerkOrgId", org.orgId))
    .unique();
  if (!mirroredOrg) {
    return org;
  }

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_org_user", (q) =>
      q.eq("clerkOrgId", org.orgId).eq("clerkUserId", org.subject),
    )
    .unique();
  if (!membership) {
    throw new Error(NOT_A_MEMBER);
  }
  return org;
}
