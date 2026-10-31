import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { Presence } from "@convex-dev/presence";

/**
 * Thin, auth-aware wrapper around the `@convex-dev/presence` component
 * (registered as `components.presence` in `convex.config.ts`). The client uses
 * the `usePresence` hook + `FacePile` from `@convex-dev/presence/react` and
 * `/facepile`; the hook drives these three public functions:
 *
 *  - `heartbeat({ roomId, userId, sessionId, interval })` — keepalive; we add an
 *    auth check and stamp the caller's display name/avatar onto the room user so
 *    the facepile can render real names instead of just emoji.
 *  - `list({ roomToken })` — live list of users in the room. We surface the
 *    stored `{ name, image }` data at the top level so `FacePile` (which reads
 *    `presence.name` / `presence.image`) shows them.
 *  - `disconnect({ sessionToken })` — graceful leave. Called over HTTP from
 *    `navigator.sendBeacon` on tab close, so it CANNOT be auth-checked.
 *
 * Multi-tenancy: rooms are namespaced `${orgId}:${docId}` on the client, so a
 * room only ever contains members of one org. `heartbeat` additionally verifies
 * the caller is authenticated before joining a room.
 */
export const presence = new Presence(components.presence);

/**
 * Per-user presence metadata stored in the room (surfaced by `list`). Kept tiny
 * and stable so heartbeats stay cheap.
 */
type PresenceData = {
  name?: string;
  image?: string;
};

/**
 * Keepalive heartbeat. Auth-checked: an unauthenticated request cannot join a
 * presence room. We also update the room user's display metadata (name +
 * avatar) from the Clerk identity on every heartbeat so the facepile reflects
 * the real user.
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const result = await presence.heartbeat(
      ctx,
      roomId,
      userId,
      sessionId,
      interval,
    );

    // Stamp the caller's name + avatar onto the room user so the facepile can
    // render real names/avatars. `pictureUrl` is Clerk's avatar claim.
    const data: PresenceData = {
      name: identity.name ?? identity.nickname ?? undefined,
      image: identity.pictureUrl ?? undefined,
    };
    await presence.updateRoomUser(ctx, roomId, userId, data);

    return result;
  },
});

/**
 * List presence state for everyone in the room. Returns one entry per user with
 * the stored `{ name, image }` data lifted to the top level so the `FacePile`
 * component can read `presence.name` / `presence.image` directly.
 *
 * No per-user reads here (we don't re-derive auth/identity per row) so every
 * subscriber shares the same query cache, per the component's guidance.
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
 * Graceful disconnect. Invoked from `navigator.sendBeacon` over HTTP on tab
 * close, so we cannot check auth here — the `sessionToken` is the capability.
 */
export const disconnect = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    await presence.disconnect(ctx, sessionToken);
    return null;
  },
});