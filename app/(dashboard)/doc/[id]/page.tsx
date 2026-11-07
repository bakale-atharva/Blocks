"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";

import Breadcrumbs from "@/components/editor/Breadcrumbs";
import PageChrome from "@/components/editor/PageChrome";
import DocPresence from "@/components/presence/DocPresence";
import AgentChat from "@/components/editor/AgentChat";

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
 * Layout: breadcrumb trail + live presence facepile across the top, page chrome
 * (icon/cover), then the editor. The docked workspace agent (`AgentChat`) is
 * mounted once per doc view and gates itself behind the AI entitlement.
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
  const docId = params.id;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Header: breadcrumbs + presence */}
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <Breadcrumbs docId={docId} />
        {orgId ? <DocPresence orgId={orgId} docId={docId} /> : null}
      </header>

      {/* Scrollable document body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <PageChrome docId={docId} />
          <div className="mt-4">
            <Editor docId={docId} />
          </div>
        </div>
      </div>

      {/* Docked workspace agent (self-gates behind AI entitlement) */}
      <AgentChat />
    </div>
  );
}
