"use client";

import usePresence from "@convex-dev/presence/react";
import FacePile from "@convex-dev/presence/facepile";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import "@convex-dev/presence/facepile.css";

/**
 * Renders the avatars of everyone currently viewing this document. Mounted in
 * the doc header by `app/(dashboard)/doc/[id]/page.tsx`.
 *
 * Room namespacing: `roomId = `${orgId}:${docId}`` so a presence room only ever
 * contains members of one org — presence is org-scoped by construction.
 *
 * `usePresence` (default export from `@convex-dev/presence/react`) owns the
 * heartbeat loop, session lifecycle, and graceful disconnect on tab close. It
 * is wired to our auth-checked `api.presence` wrapper. `FacePile` (default
 * export from `@convex-dev/presence/facepile`) takes `presenceState` only (no
 * `maxAvatars` prop — it shows the first 5 avatars and rolls the rest into a
 * `+N` dropdown internally).
 */

export default function DocPresence({
  orgId,
  docId,
}: {
  orgId: string;
  docId: string;
}) {
  // Identify the current user for their own presence entry. `users.current`
  // returns the Clerk identity (subject) derived server-side; `undefined` while
  const me = useQuery(api.users.current);
  const userId = me?.subject;

  const roomId = `${orgId}:${docId}`;

  // Always call the hook (rules of hooks). When we don't yet have a stable
  // userId, pass an empty string so the hook stays mounted without joining the
  // room under a bogus identity; the facepile simply renders empty until the
  // user id resolves.
  const presenceState = usePresence(api.presence, roomId, userId ?? "");

  if (!userId) {
    return null;
  }

  return (
    <div className="doc-presence">
      <FacePile presenceState={presenceState ?? []} />
    </div>
  );
}
