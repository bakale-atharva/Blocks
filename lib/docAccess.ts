import type { MutationCtx, QueryCtx } from "../convex/_generated/server";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { ConvexError } from "convex/values";

/**
 * The one tenant-ownership check for `documents` rows.
 *
 * Callers pass the `orgId` they derived with `getOrgContext` (`lib/auth.ts`),
 * never one from the client. A missing document and a document owned by
 * another org produce the same error, so callers can't probe for other
 * tenants' ids.
 */
export const DOC_NOT_FOUND = "Document not found";

/** Load a document by typed id and assert the org owns it. */
export async function getOrgDoc(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  id: Id<"documents">,
): Promise<Doc<"documents">> {
  const doc = await ctx.db.get(id);
  if (!doc || doc.orgId !== orgId) {
    throw new Error(DOC_NOT_FOUND);
  }
  return doc;
}

export const DOC_ARCHIVED =
  "This page is in the trash. Restore it to make changes.";

/**
 * `getOrgDoc` for writes: it also rejects a trashed document. Every
 * mutation that changes a document's content or metadata goes through this,
 * so an archived document stays read-only until it's restored.
 *
 * The error is a `ConvexError`, so the client receives its message even in
 * production, where plain `Error` messages are redacted.
 */
export async function getWritableOrgDoc(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  id: Id<"documents">,
): Promise<Doc<"documents">> {
  const doc = await getOrgDoc(ctx, orgId, id);
  if (doc.isArchived) {
    throw new ConvexError(DOC_ARCHIVED);
  }
  return doc;
}

/**
 * Same check for an untrusted string id (for example a presence room id).
 * It normalizes the id against the `documents` table first, so a malformed
 * id or an id from another table is rejected instead of throwing deep in
 * `db.get`.
 */
export async function getOrgDocByRawId(
  ctx: QueryCtx | MutationCtx,
  orgId: string,
  rawId: string,
): Promise<Doc<"documents">> {
  const id = ctx.db.normalizeId("documents", rawId);
  if (!id) {
    throw new Error(DOC_NOT_FOUND);
  }
  return getOrgDoc(ctx, orgId, id);
}
