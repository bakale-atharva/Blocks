import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { getEntitlements } from "../lib/entitlements";

/**
 * Monthly AI quota per organization.
 *
 * One `aiUsage` row per `(orgId, period)`, where `period` is the UTC month
 * as "YYYY-MM". A new month simply starts a new row, so nothing has to reset.
 *
 * The org and plan always come from the caller's Clerk token
 * (`getEntitlements`). Nothing here takes an org id as an argument.
 */

export const AI_NOT_ENABLED = "AiNotEnabled";
export const QUOTA_EXCEEDED = "QuotaExceeded";

/** The UTC month a timestamp falls in, as "YYYY-MM". */
export function periodOf(now: number): string {
  const date = new Date(now);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

/** The first instant of the next UTC month, when the quota resets. */
export function nextPeriodStart(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

const consumeResult = v.object({
  period: v.string(),
  used: v.number(),
  limit: v.number(),
  remaining: v.number(),
});

/**
 * Check and record one AI call for the caller's organization.
 *
 * A Convex mutation is one serializable transaction, so the read, the limit
 * check, and the write can't interleave with another call. Two concurrent
 * calls on the same row conflict and one is retried against the new count.
 *
 * Throws a `ConvexError` whose `data.code` is `AiNotEnabled` when the plan
 * has no AI, or `QuotaExceeded` when the month's limit is used up.
 *
 * Exported as a helper so mutations that need it inline (the Phase 6 agent's
 * `sendMessage`) share the exact same logic.
 */
export async function consumeAiCall(ctx: MutationCtx) {
  const ent = await getEntitlements(ctx);
  if (!ent.aiEnabled) {
    throw new ConvexError({
      code: AI_NOT_ENABLED,
      message: "AI isn't included in your organization's plan.",
    });
  }

  const period = periodOf(Date.now());
  const row = await ctx.db
    .query("aiUsage")
    .withIndex("by_org_period", (q) =>
      q.eq("orgId", ent.orgId).eq("period", period),
    )
    .unique();
  const used = row?.count ?? 0;

  if (used >= ent.aiMonthlyLimit) {
    throw new ConvexError({
      code: QUOTA_EXCEEDED,
      message: `Your organization has used all ${ent.aiMonthlyLimit} AI calls for this month.`,
      limit: ent.aiMonthlyLimit,
      used,
    });
  }

  if (row) {
    await ctx.db.patch(row._id, { count: used + 1 });
  } else {
    await ctx.db.insert("aiUsage", { orgId: ent.orgId, period, count: 1 });
  }

  return {
    period,
    used: used + 1,
    limit: ent.aiMonthlyLimit,
    remaining: ent.aiMonthlyLimit - used - 1,
  };
}

/**
 * Internal entry point for actions and HTTP actions (Phase 5 `/api/ai`).
 * The caller's auth carries through `ctx.runMutation`, so the org and plan
 * are still read from their token.
 */
export const consume = internalMutation({
  args: {},
  returns: consumeResult,
  handler: async (ctx) => consumeAiCall(ctx),
});

/**
 * The active organization's plan and AI usage for the current month, for the
 * billing usage meter.
 */
export const current = query({
  args: {},
  returns: v.object({
    plan: v.union(v.string(), v.null()),
    aiEnabled: v.boolean(),
    period: v.string(),
    used: v.number(),
    limit: v.number(),
    resetsAt: v.number(),
  }),
  handler: async (ctx) => {
    const ent = await getEntitlements(ctx);
    const now = Date.now();
    const period = periodOf(now);
    const row = await ctx.db
      .query("aiUsage")
      .withIndex("by_org_period", (q) =>
        q.eq("orgId", ent.orgId).eq("period", period),
      )
      .unique();

    return {
      plan: ent.plan,
      aiEnabled: ent.aiEnabled,
      period,
      used: row?.count ?? 0,
      limit: ent.aiMonthlyLimit,
      resetsAt: nextPeriodStart(now),
    };
  },
});
