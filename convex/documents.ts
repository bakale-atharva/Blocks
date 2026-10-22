import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getOrgContext } from "../lib/auth";

/**
 * Org-scoped document tree + Notion polish (search / favorites / trash).
 *
 * Multi-tenancy invariant: every function derives `orgId` server-side via
 * `getOrgContext(ctx)`. We NEVER accept `orgId` (or any user identifier) as a
 * function argument for authorization. All reads use `withIndex` (never
 * `.filter`) and are bounded (`.take()` / `.paginate()`, never unbounded
 * `.collect()`). Documents are soft-deleted only — we never `ctx.db.delete` a
 * document.
 *
 * Note: document *content* is owned by `@convex-dev/prosemirror-sync`; this
 * table only holds tree/metadata.
 */

// ---------------------------------------------------------------------------
// Shared validators / constants
// ---------------------------------------------------------------------------

/**
 * Load a document and assert it belongs to the caller's org. Throws if the
 * document does not exist or belongs to a different org (so we never leak the
 * existence of another tenant's data).
 */
async function getOwnedDoc(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  id: Id<"documents">,
): Promise<Doc<"documents">> {
  const doc = await ctx.db.get(id);
  if (!doc || doc.orgId !== orgId) {
    throw new Error("Document not found");
  }
  return doc;
}

/** Create a folder or page under `parentId` (root when null/omitted). */
export const create = mutation({
  args: {
    parentId: v.optional(v.union(v.id("documents"), v.null())),
    type: v.union(v.literal("folder"), v.literal("page")),
    title: v.string(),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const { orgId, subject } = await getOrgContext(ctx);

    // Validate the parent (if any) belongs to this org before linking.
    const parentId = args.parentId ?? undefined;
    if (parentId !== undefined) {
      await getOwnedDoc(ctx, orgId, parentId);
    }

    const id = await ctx.db.insert("documents", {
      orgId,
      parentId,
      type: args.type,
      title: args.title,
      isArchived: false,
      isFavorite: false,
      authorSubject: subject,
    });
    return id;
  },
});
