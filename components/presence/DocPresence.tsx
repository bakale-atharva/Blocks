"use client";

import { useEffect, useMemo, useState } from "react";
import usePresence from "@convex-dev/presence/react";
import FacePile from "@convex-dev/presence/facepile";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { publishOnline } from "@/lib/presenceStore";
import "@convex-dev/presence/facepile.css";

/**
 * After this long with no pointer, keyboard, scroll, or focus activity, the
 * viewer leaves the room and shows as offline to everyone else. The presence
 * hook already pauses heartbeats while the tab is hidden; this covers a
 * visible tab nobody is using.
 */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "focus",
] as const;

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
 * graceful disconnect on unmount and tab close. Going idle unmounts the room,
 * which disconnects; any activity rejoins it.
 *
 * Collaborator cursors aren't shown: prosemirror-sync syncs steps only and
 * has no awareness channel, so the facepile is the presence UI.
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
  const idle = useIdle(IDLE_TIMEOUT_MS);

  // Join the room only once the signed-in user's id is known, so no heartbeat
  // goes out under a placeholder identity, which the server would reject.
  if (!me?.subject) {
    return null;
  }

  if (idle) {
    return (
      <span className="text-xs text-muted-foreground" role="status">
        Away
      </span>
    );
  }

  return (
    <RoomFacePile
      roomId={`${orgId}:${docId}`}
      docId={docId}
      userId={me.subject}
    />
  );
}

function RoomFacePile({
  roomId,
  docId,
  userId,
}: {
  roomId: string;
  docId: string;
  userId: string;
}) {
  const presenceState = usePresence(api.presence, roomId, userId);

  // Only people who are online right now. The component also returns
  // recently disconnected users, which would make the pile look busier than
  // the document is.
  const online = useMemo(
    () => (presenceState ?? []).filter((p) => p.online),
    [presenceState],
  );

  // Share the list with the sidebar row for this document.
  useEffect(() => {
    publishOnline(
      docId,
      online.map(({ userId, name, image }) => ({ userId, name, image })),
    );
  }, [docId, online]);
  useEffect(() => () => publishOnline(docId, null), [docId]);

  return (
    <div className="doc-presence">
      <FacePile presenceState={online} />
    </div>
  );
}

/** `true` once there's been no user activity for `timeoutMs`. */
function useIdle(timeoutMs: number): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), timeoutMs);
    const onActivity = () => {
      window.clearTimeout(timer);
      setIdle(false);
      timer = window.setTimeout(() => setIdle(true), timeoutMs);
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [timeoutMs]);

  return idle;
}
