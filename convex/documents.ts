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
const documentValidator = v.object({
  _id: v.id("documents"),
  _creationTime: v.number(),
  orgId: v.string(),
  parentId: v.optional(v.id("documents")),
  type: v.union(v.literal("folder"), v.literal("page")),
  title: v.string(),
  icon: v.optional(v.string()),
  coverImage: v.optional(v.id("_storage")),
  isArchived: v.boolean(),
  archivedAt: v.optional(v.number()),
  isFavorite: v.boolean(),
  authorSubject: v.string(),
});

/** Maximum results returned by search / list-style queries. */
const SEARCH_LIMIT = 20;
const LIST_LIMIT = 200;
const TRASH_LIMIT = 100;
const FAVORITES_LIMIT = 100;

/**
 * Upper bound on documents touched by a single recursive archive/restore so
 * we stay comfortably within Convex transaction limits. A workspace tree with
 * more descendants than this would need a scheduled continuation; for the
 * sizes this app targets the bound is never hit in practice.
 */
const RECURSIVE_LIMIT = 2000;
const RECURSIVE_BATCH = 256;

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

/**
 * Direct children of `parentId` (or root docs when `parentId` is null) for the
 * active org. Archived docs are excluded. Used by the recursive sidebar tree.
 */
export const getChildren = query({
  args: { parentId: v.union(v.id("documents"), v.null()) },
  returns: v.array(documentValidator),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    // `parentId` is stored as `v.optional`, so root docs match `undefined`.
    const parentId = args.parentId ?? undefined;
    const children = await ctx.db
      .query("documents")
      .withIndex("by_org_parent", (q) =>
        q.eq("orgId", orgId).eq("parentId", parentId),
      )
      .take(LIST_LIMIT);
    // Exclude archived from the tree view (no dedicated composite index, so we
    // post-filter the already-bounded child set in memory).
    return children.filter((doc) => !doc.isArchived);
  },
});

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

/**
 * Soft-delete a document AND all of its descendants (recursive). We NEVER hard
 * delete — every touched doc gets `isArchived: true` + `archivedAt`. The walk
 * is bounded (`RECURSIVE_LIMIT`) and reads children in bounded batches via the
 * `by_org_parent` index.
 *
 * Already-archived descendants keep their original `archivedAt` so an
 * unrelated earlier deletion is preserved on restore.
 */
export const archive = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    const root = await getOwnedDoc(ctx, orgId, args.id);

    const now = Date.now();
    let processed = 0;

    // BFS over the subtree. The frontier holds doc ids whose children we still
    // need to enqueue.
    const frontier: Id<"documents">[] = [root._id];

    while (frontier.length > 0) {
      if (processed >= RECURSIVE_LIMIT) {
        throw new Error("Subtree too large to archive in a single transaction");
      }
      const current = frontier.shift()!;
      const doc = await ctx.db.get(current);
      // Skip if it vanished or somehow crossed tenants (defensive).
      if (!doc || doc.orgId !== orgId) continue;

      if (!doc.isArchived) {
        await ctx.db.patch(current, { isArchived: true, archivedAt: now });
      }
      processed++;

      // Enqueue children (both archived and not, so the whole subtree is
      // consistently marked) in bounded batches.
      const children = await ctx.db
        .query("documents")
        .withIndex("by_org_parent", (q) =>
          q.eq("orgId", orgId).eq("parentId", current),
        )
        .take(RECURSIVE_BATCH);
      for (const child of children) {
        frontier.push(child._id);
      }
    }
    return null;
  },
});

/**
 * Restore a single archived document back into the tree. Reverses `archive`
 * for the target doc (clears `isArchived`/`archivedAt`). Descendants stay
 * archived unless individually restored, matching Notion's per-item restore.
 *
 * If the parent of the restored doc is itself still archived, the doc is
 * re-parented to root so it is reachable in the tree (avoids dangling under an
 * archived ancestor).
 */
export const restore = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    const doc = await getOwnedDoc(ctx, orgId, args.id);

    let parentId = doc.parentId;
    if (parentId !== undefined) {
      const parent = await ctx.db.get(parentId);
      if (!parent || parent.orgId !== orgId || parent.isArchived) {
        // Parent is gone or still in the trash — surface at root instead.
        parentId = undefined;
      }
    }

    await ctx.db.patch(args.id, {
      isArchived: false,
      archivedAt: undefined,
      parentId,
    });
    return null;
  },
});

/** All archived (trashed) documents for the active org. Bounded. */
export const listTrash = query({
  args: {},
  returns: v.array(documentValidator),
  handler: async (ctx) => {
    const { orgId } = await getOrgContext(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_org_archived", (q) =>
        q.eq("orgId", orgId).eq("isArchived", true),
      )
      .order("desc")
      .take(TRASH_LIMIT);

    return docs;
  },
});

/** Rename a document. */
export const rename = mutation({
  args: { id: v.id("documents"), title: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    await getOwnedDoc(ctx, orgId, args.id);
    await ctx.db.patch(args.id, { title: args.title });
    return null;
  },
});

/** Toggle a document's favorite flag. */
export const toggleFavorite = mutation({
  args: { id: v.id("documents") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    const doc = await getOwnedDoc(ctx, orgId, args.id);
    const next = !doc.isFavorite;
    await ctx.db.patch(args.id, { isFavorite: next });
    return next;
  },
});

/** Favorited, non-archived documents for the active org. Bounded. */
export const listFavorites = query({
  args: {},
  returns: v.array(documentValidator),
  handler: async (ctx) => {
    const { orgId } = await getOrgContext(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_org_favorite", (q) =>
        q.eq("orgId", orgId).eq("isFavorite", true),
      )
      .take(FAVORITES_LIMIT);
    return docs.filter((doc) => !doc.isArchived);
    // Favorited docs that were trashed should not show in the Favorites list
    return docs.filter((doc) => !doc.isArchived);
  },
});
