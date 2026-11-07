import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { Presence } from "@convex-dev/presence";
import { getOrgContext } from "../lib/auth";
import { getOrgDocByRawId } from "../lib/docAccess";

/**
 * Tenant-scoped wrapper around the `@convex-dev/presence` component
 * (registered as `components.presence` in `convex.config.ts`).
 *
 * The client's `usePresence` hook (`components/presence/DocPresence.tsx`)
 * drives three public functions:
 *
 * - `heartbeat`: the keepalive. The server is authoritative here. The caller's
 *   org and user come from the Clerk JWT, and the client's `roomId` and
 *   `userId` are only checked against them, never trusted. A room is
 *   `${orgId}:${docId}`, and the caller must belong to that org and the
 *   document must belong to it too.
 * - `list`: the live members of a room. It requires a signed-in org member.
 *   The `roomToken` is issued only by an authorized `heartbeat`, so it acts as
 *   the room capability.
 * - `disconnect`: a graceful leave, sent through `navigator.sendBeacon` over
 *   HTTP, so it can't carry auth. The `sessionToken` is the capability, as
 *   the component's docs say.
 */
export const presence = new Presence(components.presence);

/** Display data stored per room user and surfaced by `list`. */
type PresenceData = {
  name?: string;
  image?: string;
};

/**
 * Validate a client-supplied room id against the caller's tenant and return
 * the document id. It throws on any mismatch.
 */
async function authorizeRoom(
  ctx: Parameters<typeof getOrgDocByRawId>[0],
  orgId: string,
  roomId: string,
): Promise<void> {
  const separator = roomId.indexOf(":");
  if (separator <= 0) {
    throw new Error("Invalid presence room");
  }
  const roomOrgId = roomId.slice(0, separator);
  const docId = roomId.slice(separator + 1);

  if (roomOrgId !== orgId) {
    // Same message as a missing document, so the response can't be used to
    // probe for other tenants.
    throw new Error("Invalid presence room");
  }

  // Throws "Document not found" unless the caller's org owns the document.
  await getOrgDocByRawId(ctx, orgId, docId);
}

/**
 * Keepalive heartbeat. It joins or refreshes the caller in a document room,
 * and stamps their display name and avatar from the Clerk identity.
 */
export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    const { orgId, subject } = await getOrgContext(ctx);

    // The presence identity is always the authenticated Clerk user. The hook
    // sends the caller's own id, so a mismatch is an impersonation attempt.
    if (userId !== subject) {
      throw new Error("Presence user does not match the signed-in user");
    }

    await authorizeRoom(ctx, orgId, roomId);

    const result = await presence.heartbeat(
      ctx,
      roomId,
      subject,
      sessionId,
      interval,
    );

    const identity = await ctx.auth.getUserIdentity();
    const data: PresenceData = {
      name: identity?.name ?? identity?.nickname ?? undefined,
      image: identity?.pictureUrl ?? undefined,
    };
    await presence.updateRoomUser(ctx, roomId, subject, data);

    return result;
  },
});

/**
 * Everyone in a room, with the stored `{ name, image }` data lifted to the top
 * level so `FacePile` can read `presence.name` and `presence.image`.
 *
 * The auth check reads only the identity, with no per-user database reads.
 * The component recommends no per-user reads so that subscribers share one
 * query cache. Reading auth still keys the cache per identity, which is a
 * deliberate trade-off: rooms are document-sized, and an unauthenticated
 * caller holding a leaked room token gets nothing.
 */
export const list = query({
  args: { roomToken: v.string() },
  returns: v.array(
    v.object({
      userId: v.string(),
      online: v.boolean(),
      lastDisconnected: v.number(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      data: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, { roomToken }) => {
    await getOrgContext(ctx);

    const entries = await presence.list(ctx, roomToken);
    return entries.map((entry) => {
      const data = (entry.data ?? {}) as PresenceData;
      return {
        userId: entry.userId,
        online: entry.online,
        lastDisconnected: entry.lastDisconnected,
        name: data.name,
        image: data.image,
        data: entry.data,
      };
    });
  },
});

/**
 * Graceful disconnect. It's sent through `navigator.sendBeacon` over HTTP on
 * tab close, so it can't be auth-checked. The `sessionToken` is the
 * capability.
 */
export const disconnect = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    await presence.disconnect(ctx, sessionToken);
    return null;
  },
});
