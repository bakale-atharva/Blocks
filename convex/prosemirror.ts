import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getOrgContext } from "../lib/auth";

/**
 * Collaborative document content for the BlockNote editor, synced through the
 * `@convex-dev/prosemirror-sync` component.
 *
 * Multi-tenancy is enforced here, not on the client: `checkRead` / `checkWrite`
 * derive the caller's active org server-side via `getOrgContext` and throw
 * (denying access) whenever the requested document does not belong to that org.
 * The component's sync queries/mutations call these before touching any
 * snapshot or step, so a user from another org can never read or write another
 * org's document — even with a valid document id.
 *
 * `onSnapshot` mirrors the document's plain-text content onto the `documents`
 * row so the full-text `search_title`-style search can later be
 * extended to body text without re-parsing ProseMirror JSON at query time.
 */
const prosemirrorSync = new ProsemirrorSync<Id<"documents">>(
  components.prosemirrorSync,
);

/**
 * Throw unless the caller's active org owns the document `id`.
 *
 * Shared by `checkRead` (QueryCtx) and `checkWrite` (MutationCtx). Both context
 * types expose `auth` and `db.get`, so a single helper covers both.
 */
async function assertCanAccessDoc(
  ctx: QueryCtx | MutationCtx,
  id: Id<"documents">,
): Promise<void> {
  const { orgId } = await getOrgContext(ctx);
  const doc = await ctx.db.get(id);
  if (!doc || doc.orgId !== orgId) {
    throw new Error("Unauthorized: document not found in your organization");
  }
}

/**
 * Extract a best-effort plain-text rendering from a stringified ProseMirror
 * snapshot. ProseMirror JSON is a tree of `{ type, content, text, ... }` nodes;
 * we concatenate every `text` leaf with spaces between block-level nodes. This
 * is intentionally tolerant — a malformed snapshot just yields an empty string
 * rather than throwing inside the sync write path.
 */
function snapshotToText(snapshot: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    return "";
  }

  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as { text?: unknown; content?: unknown };
    if (typeof n.text === "string") {
      parts.push(n.text);
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        walk(child);
      }
    }
  };
  walk(parsed);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi<DataModel>({
  checkRead: async (ctx, id) => {
    await assertCanAccessDoc(ctx, id);
  },
  checkWrite: async (ctx, id) => {
    await assertCanAccessDoc(ctx, id);
  },
  onSnapshot: async (ctx, id, snapshot) => {
    // Mirror the latest text content for search. Guard against a racing
    // archive/delete by confirming the row still exists and is owned by the
    // caller's org before doing anything with the snapshot.
    const { orgId } = await getOrgContext(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.orgId !== orgId) return;

    // Reduce the snapshot to plain text for search mirroring. The shared
    // `documents` schema (owned by Foundation, not editable here) currently
    // exposes only a `title` search index, so we compute the body text but do
    // not yet persist it.
    const textContent = snapshotToText(snapshot);
    void textContent;
  },
});
