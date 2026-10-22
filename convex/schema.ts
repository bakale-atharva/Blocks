import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Data model for the multi-tenant ("Blocks") Notion clone.
 *
 * Multi-tenancy invariant: every org-scoped row carries an `orgId` (the Clerk
 * organization id) and is queried via an index that leads with `orgId`. Never
 * accept `orgId` as a function argument — derive it server-side from the Clerk
 * JWT via `lib/auth.ts#getOrgContext`.
 *
 * Document *content* is owned by `@convex-dev/prosemirror-sync`, not stored on
 * the `documents` row here. The `documents` table only holds tree/metadata.
 */
export default defineSchema({
  // Org-scoped document tree (folders + pages). Content lives in prosemirror-sync.
  documents: defineTable({
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
  })
    .index("by_org", ["orgId"])
    .index("by_org_parent", ["orgId", "parentId"])
    .index("by_org_favorite", ["orgId", "isFavorite"])
    .index("by_org_archived", ["orgId", "isArchived"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["orgId", "isArchived"],
    }),
});
