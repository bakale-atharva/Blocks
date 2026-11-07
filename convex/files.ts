import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getOrgContext } from "../lib/auth";
import { getWritableOrgDoc } from "../lib/docAccess";

/**
 * Convex File Storage for page covers and editor uploads.
 *
 * Every function derives `orgId` server-side with `getOrgContext(ctx)`. None
 * takes an org or user id from the client.
 *
 * Upload flow, for both covers and editor blocks:
 *
 *   1. `generateUploadUrl({ id })`: the caller's org must own the document,
 *      and the document must not be in the trash.
 *   2. The client POSTs the bytes to that URL and gets a `storageId`.
 *   3. `setCover` or `attachFile` validates the stored blob's MIME type and
 *      size from the `_storage` system table. A blob that fails is deleted
 *      and the call throws, so rejected uploads don't linger in storage.
 *
 * The MIME type is the `Content-Type` the client sent with the upload, and
 * it's also the type Convex serves the file with. Checking it bounds what we
 * serve; it isn't content sniffing. SVG is excluded because it can carry
 * script.
 *
 * Cover URLs are resolved only through `getCoverUrl`, which checks that the
 * document belongs to the caller's org, so another org gets `null`. Editor
 * block files are embedded by URL in the document content, which is itself
 * only readable by the owning org (`convex/prosemirror.ts#checkRead`).
 */

const MB = 1024 * 1024;

/** Image types accepted for covers and image blocks. */
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

/** Other file types the editor's file, video, and audio blocks accept. */
const MEDIA_TYPES = new Set([
  "application/pdf",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);

export const MAX_IMAGE_BYTES = 5 * MB;
export const MAX_MEDIA_BYTES = 25 * MB;

type UploadKind = "cover" | "block";

/**
 * Check a stored blob against the rules for `kind`. On failure, delete the
 * blob and throw a `ConvexError` with a message the UI can show.
 */
async function validateUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  kind: UploadKind,
): Promise<void> {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta) {
    throw new ConvexError("Upload not found. Try again.");
  }

  const type = (meta.contentType ?? "").toLowerCase();
  const isImage = IMAGE_TYPES.has(type);
  const isMedia = MEDIA_TYPES.has(type);

  let problem: string | null = null;
  if (kind === "cover" && !isImage) {
    problem = "Covers must be a PNG, JPEG, GIF, WebP, or AVIF image.";
  } else if (kind === "block" && !isImage && !isMedia) {
    problem = "That file type isn't supported.";
  } else if (isImage && meta.size > MAX_IMAGE_BYTES) {
    problem = `Images must be ${MAX_IMAGE_BYTES / MB} MB or smaller.`;
  } else if (meta.size > MAX_MEDIA_BYTES) {
    problem = `Files must be ${MAX_MEDIA_BYTES / MB} MB or smaller.`;
  }

  if (problem) {
    await ctx.storage.delete(storageId);
    throw new ConvexError(problem);
  }
}

/**
 * Generate a short-lived upload URL for a file that will belong to document
 * `id`. The caller's org must own the document, and it must not be trashed.
 */
export const generateUploadUrl = mutation({
  args: { id: v.id("documents") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    await getWritableOrgDoc(ctx, orgId, args.id);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * The cover image URL for document `id`, or `null` when it has no cover or
 * isn't in the caller's org. This is the only way the app resolves a cover.
 */
export const getCoverUrl = query({
  args: { id: v.id("documents") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.orgId !== orgId || !doc.coverImage) return null;
    return await ctx.storage.getUrl(doc.coverImage);
  },
});

/**
 * Validate an editor upload for document `id` and return its URL for the
 * block. Rejected files are deleted.
 */
export const attachFile = mutation({
  args: { id: v.id("documents"), storageId: v.id("_storage") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    await getWritableOrgDoc(ctx, orgId, args.id);
    await validateUpload(ctx, args.storageId, "block");
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError("Upload not found. Try again.");
    }
    return url;
  },
});

/**
 * Set or replace a document's cover with an uploaded image. The previous
 * cover's blob is deleted, since a cover belongs to exactly one document.
 */
export const setCover = mutation({
  args: { id: v.id("documents"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    const doc = await getWritableOrgDoc(ctx, orgId, args.id);
    await validateUpload(ctx, args.storageId, "cover");

    const previous = doc.coverImage;
    await ctx.db.patch(args.id, { coverImage: args.storageId });
    if (previous && previous !== args.storageId) {
      await ctx.storage.delete(previous);
    }
    return null;
  },
});

/** Remove a document's cover and delete its blob. */
export const removeCover = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await getOrgContext(ctx);
    const doc = await getWritableOrgDoc(ctx, orgId, args.id);
    if (!doc.coverImage) return null;

    await ctx.db.patch(args.id, { coverImage: undefined });
    await ctx.storage.delete(doc.coverImage);
    return null;
  },
});
