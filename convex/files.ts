import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getOrgContext } from "../lib/auth";

/**
 * Convex File Storage helpers for document covers/images.
 *
 * Every mutation/query derives `orgId` server-side via `getOrgContext(ctx)` —
 * we NEVER accept `orgId`/`userId` as an argument for authorization. `setIcon`
 * deliberately lives in `convex/documents.ts` (per the integration contract),
 * NOT here.
 */

/**
 * Load a document and assert it belongs to the caller's org. Throws if the
 * document is missing or owned by another tenant.
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
