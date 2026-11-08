"use client";

import { useSyncExternalStore } from "react";

/**
 * The people currently online in each open document, keyed by document id.
 *
 * `DocPresence` already subscribes to a document's presence room, so it
 * publishes the online list here and the sidebar reads it. That way the
 * sidebar row for the open document shows its collaborators without a
 * second subscription, and closed documents cost nothing.
 */
export type OnlinePerson = { userId: string; name?: string; image?: string };

const EMPTY: OnlinePerson[] = [];
const byDoc = new Map<string, OnlinePerson[]>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Replace the online list for `docId`. Pass `null` to clear it. */
export function publishOnline(docId: string, people: OnlinePerson[] | null) {
  if (people === null || people.length === 0) {
    if (!byDoc.has(docId)) return;
    byDoc.delete(docId);
  } else {
    const current = byDoc.get(docId);
    const same =
      current?.length === people.length &&
      current.every((p, i) => p.userId === people[i].userId);
    if (same) return;
    byDoc.set(docId, people);
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The people online in `docId`, as last published by `DocPresence`. */
export function useOnlinePeople(docId: string): OnlinePerson[] {
  return useSyncExternalStore(
    subscribe,
    () => byDoc.get(docId) ?? EMPTY,
    () => EMPTY,
  );
}
