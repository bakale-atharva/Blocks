import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

/**
 * Mirror of Clerk users, organizations, and memberships, written only by the
 * verified Clerk webhook in `convex/http.ts`.
 *
 * These are internal mutations, so no client can call them. Deletes remove
 * mirror rows only. Documents are never touched: an org's pages outlive its
 * mirror row, and are still scoped by the `orgId` in the Clerk JWT.
 */

/** Rows removed per batch when a delete cascades over memberships. */
const MEMBERSHIP_BATCH = 256;

export const upsertUser = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { name: args.name, email: args.email });
    } else {
      await ctx.db.insert("users", args);
    }
    return null;
  },
});

export const deleteUser = internalMutation({
  args: { externalId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    // A deleted user has no memberships left.
    await deleteMembershipsWhere(ctx, { clerkUserId: args.externalId });
    return null;
  },
});

export const upsertOrganization = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("byClerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { name: args.name, slug: args.slug });
    } else {
      await ctx.db.insert("organizations", args);
    }
    return null;
  },
});

export const deleteOrganization = internalMutation({
  args: { clerkOrgId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("byClerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    // Clerk doesn't reliably send a membership event per member when an org
    // is deleted, so drop the org's membership mirror rows here.
    await deleteMembershipsWhere(ctx, { clerkOrgId: args.clerkOrgId });
    return null;
  },
});

export const upsertMembership = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_org_user", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", args.clerkUserId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
    } else {
      await ctx.db.insert("memberships", args);
    }
    return null;
  },
});

export const deleteMembership = internalMutation({
  args: { clerkOrgId: v.string(), clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_org_user", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", args.clerkUserId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

/**
 * Delete every membership mirror row for one org or one user, in bounded
 * batches. Both lookups use an index prefix (`by_org_user` leads with the org,
 * `by_user` with the user).
 */
async function deleteMembershipsWhere(
  ctx: MutationCtx,
  where: { clerkOrgId: string } | { clerkUserId: string },
) {
  for (;;) {
    const batch =
      "clerkOrgId" in where
        ? await ctx.db
            .query("memberships")
            .withIndex("by_org_user", (q) =>
              q.eq("clerkOrgId", where.clerkOrgId),
            )
            .take(MEMBERSHIP_BATCH)
        : await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("clerkUserId", where.clerkUserId))
            .take(MEMBERSHIP_BATCH);
    for (const row of batch) {
      await ctx.db.delete(row._id);
    }
    if (batch.length < MEMBERSHIP_BATCH) return;
  }
}
