"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { FileQuestion } from "lucide-react";

import { api } from "@/convex/_generated/api";
import Breadcrumbs from "@/components/editor/Breadcrumbs";
import PageChrome from "@/components/editor/PageChrome";
import DocPresence from "@/components/presence/DocPresence";
import AgentChat from "@/components/editor/AgentChat";
import ArchivedBanner from "@/components/editor/ArchivedBanner";
import { Button } from "@/components/ui/button";

/**
 * Per-document workspace page.
 *
 * The collaborative BlockNote editor is loaded with `next/dynamic({ ssr: false })`
 * because BlockNote must render client-only (it touches the DOM on mount) and
 * with React StrictMode OFF. This page is itself a client component so the
 * `ssr: false` dynamic import is permitted (Next 16 disallows `ssr: false`
 * dynamic imports inside Server Components) and so we can read `params` and the
 * active Clerk `orgId` on the client for `DocPresence`.
 *
 * The URL id is untrusted, so the page resolves it with `documents.lookup`,
 * which returns `null` for a malformed id, a missing document, and another
 * org's document alike. Only a resolved document mounts the editor, whose
 * sync queries would otherwise throw on an id the caller can't read.
 *
 * A trashed document renders read-only, with a Restore banner.
 */
const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-3 px-1 py-2" aria-hidden>
      <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
    </div>
  ),
});

export default function DocumentPage() {
  const params = useParams<{ id: string }>();
  const { orgId } = useAuth();
  const doc = useQuery(api.documents.lookup, { id: params.id });

  if (doc === undefined) {
    return <DocumentSkeleton />;
  }

  if (doc === null) {
    return <DocumentNotFound />;
  }

  const readOnly = doc.isArchived;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Header: breadcrumbs + presence */}
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <Breadcrumbs docId={doc._id} />
        {orgId ? <DocPresence orgId={orgId} docId={doc._id} /> : null}
      </header>

      <ArchivedBanner doc={doc} />

      {/* Scrollable document body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <PageChrome doc={doc} readOnly={readOnly} />
          <div className="mt-4">
            {/* Keyed by id so switching documents builds a fresh editor. */}
            <Editor key={doc._id} docId={doc._id} readOnly={readOnly} />
          </div>
        </div>
      </div>

      {/* Docked workspace agent (self-gates behind AI entitlement) */}
      <AgentChat />
    </div>
  );
}

function DocumentSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true">
      <div className="border-b px-4 py-3">
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-10">
        <div className="h-10 w-10 animate-pulse rounded bg-muted" />
        <div className="h-9 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * Shown for a missing document and for one in another workspace. The two are
 * deliberately indistinguishable, so this page can't confirm another
 * tenant's ids exist.
 */
function DocumentNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page doesn&apos;t exist, or it belongs to a workspace you
          aren&apos;t in. Switch workspaces from the sidebar if you expected
          to see it.
        </p>
      </div>
      <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
        Back to home
      </Button>
    </div>
  );
}
