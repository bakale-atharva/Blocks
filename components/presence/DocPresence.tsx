"use client";

import usePresence from "@convex-dev/presence/react";
import FacePile from "@convex-dev/presence/facepile";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import "@convex-dev/presence/facepile.css";

/**
 * Avatars of everyone viewing this document. It's mounted in the document
 * header by `app/(dashboard)/doc/[id]/page.tsx`.
 *
 * The room is `${orgId}:${docId}`. The server (`convex/presence.ts`) is
 * authoritative: `heartbeat` rejects a room outside the caller's org, a
 * document the org doesn't own, and any user id other than the signed-in
 * user's. The ids here only name the room; they grant nothing.
 *
 * `usePresence` owns the heartbeat loop, the session lifecycle, and the
 * graceful disconnect on tab close. `FacePile` shows the first five avatars
 * and puts the rest in a `+N` dropdown.
 */
export default function DocPresence({
  orgId,
  docId,
}: {
  orgId: string;
  docId: string;
}) {
  // `users.current` returns the Clerk identity derived on the server.
  const me = useQuery(api.users.current);

  // Join the room only once the signed-in user's id is known, so no heartbeat
  // goes out under a placeholder identity, which the server would reject.
  if (!me?.subject) {
    return null;
  }

  return (
    <RoomFacePile roomId={`${orgId}:${docId}`} userId={me.subject} />
  );
}

function RoomFacePile({ roomId, userId }: { roomId: string; userId: string }) {
  const presenceState = usePresence(api.presence, roomId, userId);

  return (
    <div className="doc-presence">
      <FacePile presenceState={presenceState ?? []} />
    </div>
  );
}
