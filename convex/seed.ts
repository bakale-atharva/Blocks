import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Dev-only seed data for the document tree (23 documents).
 *
 * This is an `internalMutation`, so it is not callable from clients and taking
 * `orgId` as an argument does not break the multi-tenancy invariant. Run it
 * from the CLI against your Clerk organization id:
 *
 *   npx convex run seed:seed '{"orgId":"org_...","authorSubject":"user_..."}'
 *
 * It is a no-op if the org already has documents, so it is safe to re-run.
 */

type SeedNode = {
  type: "folder" | "page";
  title: string;
  icon?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  children?: SeedNode[];
};

const TREE: SeedNode[] = [
  {
    type: "page",
    title: "Welcome to Blocks",
    icon: "👋",
    isFavorite: true,
  },
  {
    type: "folder",
    title: "Engineering",
    icon: "🛠️",
    children: [
      {
        type: "page",
        title: "Architecture Overview",
        icon: "🏗️",
        isFavorite: true,
      },
      { type: "page", title: "API Conventions", icon: "📐" },
      {
        type: "folder",
        title: "RFCs",
        icon: "📝",
        children: [
          {
            type: "page",
            title: "RFC-001: Realtime Sync",
            icon: "⚡",
            isFavorite: true,
          },
          { type: "page", title: "RFC-002: Search Indexing", icon: "🔎" },
          {
            type: "page",
            title: "RFC-003: Offline Mode",
            icon: "📴",
            isArchived: true,
          },
        ],
      },
      { type: "page", title: "Onboarding Checklist", icon: "✅" },
    ],
  },
  {
    type: "folder",
    title: "Product",
    icon: "🎯",
    children: [
      {
        type: "page",
        title: "Roadmap Q4 2026",
        icon: "🗺️",
        isFavorite: true,
      },
      { type: "page", title: "User Research Notes", icon: "🧪" },
      { type: "page", title: "Feature Requests", icon: "💡" },
      {
        type: "page",
        title: "Pricing Experiments",
        icon: "💸",
        isArchived: true,
      },
    ],
  },
  {
    type: "folder",
    title: "Design",
    icon: "🎨",
    children: [
      { type: "page", title: "Design System", icon: "🧩", isFavorite: true },
      { type: "page", title: "Brand Guidelines", icon: "🖌️" },
      { type: "page", title: "Icon Library", icon: "🔣" },
    ],
  },
  {
    type: "folder",
    title: "Team",
    icon: "👥",
    children: [
      { type: "page", title: "Meeting Notes", icon: "🗓️", isFavorite: true },
      { type: "page", title: "Team Offsite 2026", icon: "🏕️" },
      { type: "page", title: "Hiring Plan", icon: "📋", isArchived: true },
    ],
  },
  { type: "page", title: "Scratchpad", icon: "✏️" },
];

async function insertTree(
  ctx: MutationCtx,
  orgId: string,
  authorSubject: string,
  nodes: SeedNode[],
  parentId: Id<"documents"> | undefined,
): Promise<number> {
  let count = 0;
  for (const node of nodes) {
    const isArchived = node.isArchived ?? false;
    const id = await ctx.db.insert("documents", {
      orgId,
      parentId,
      type: node.type,
      title: node.title,
      icon: node.icon,
      isArchived,
      archivedAt: isArchived ? Date.now() : undefined,
      isFavorite: node.isFavorite ?? false,
      authorSubject,
    });
    count += 1;
    if (node.children) {
      count += await insertTree(ctx, orgId, authorSubject, node.children, id);
    }
  }
  return count;
}

export const seed = internalMutation({
  args: {
    orgId: v.string(),
    authorSubject: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (existing) {
      console.log(`Org ${args.orgId} already has documents; skipping seed.`);
      return 0;
    }

    const inserted = await insertTree(
      ctx,
      args.orgId,
      args.authorSubject ?? "seed",
      TREE,
      undefined,
    );
    console.log(`Seeded ${inserted} documents for org ${args.orgId}.`);
    return inserted;
  },
});
