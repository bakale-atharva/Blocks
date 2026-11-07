import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrgContext } from "../lib/auth";
import { getOrgDoc } from "../lib/docAccess";

/**
 * Convex File Storage helpers for document covers/images.
 *
 * Every mutation/query derives `orgId` server-side via `getOrgContext(ctx)` —
 * we NEVER accept `orgId`/`userId` as an argument for authorization. `setIcon`
 * deliberately lives in `convex/documents.ts` (per the integration contract),
 * NOT here.
 *
 * Tenant ownership of a document is checked by `getOrgDoc` in
 * `lib/docAccess.ts`.
 */

/**
 * Generate a short-lived upload URL the client POSTs a file to. Requires an
 * authenticated caller with an active org. Returns the upload URL string.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Authorization gate: must be a member of an active org to upload.
    await getOrgContext(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Resolve a signed, time-limited URL for a stored file. Returns `null` if the
 * file does not exist. Requires an authenticated caller with an active org.
 */
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await getOrgContext(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Set a document's cover image to an already-uploaded storage object. The
 * document must belong to the caller's active org.
 */
export const setCover = mutation({
  args: { id: v.id("documents"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    await getOrgDoc(ctx, orgId, args.id);
    await ctx.db.patch(args.id, { coverImage: args.storageId });
    return null;
  },
});
