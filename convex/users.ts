import { v } from "convex/values";
import { query } from "./_generated/server";

// Returns the currently authenticated user's identity, derived server-side
// from the Clerk session token. Returns null when not authenticated.
export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      subject: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return {
      name: identity.name,
      email: identity.email,
      subject: identity.subject,
    };
  },
});
