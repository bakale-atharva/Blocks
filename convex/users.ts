import { v } from "convex/values";
import type { UserJSON } from "@clerk/backend";
import { internalMutation, query } from "./_generated/server";

// Returns the currently authenticated user's identity, derived server-side
// from the Clerk session token. Returns null when not authenticated.
export const current = query({
  args: {},
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
