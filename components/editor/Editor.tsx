"use client";

import { useEffect, useMemo, useRef } from "react";
import { useConvex } from "convex/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";

import {
  BlockNoteEditor,
  combineByGroup,
  filterSuggestionItems,
} from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useBlockNoteSync } from "@convex-dev/prosemirror-sync/blocknote";
import {
  AIExtension,
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/xl-ai/style.css";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createUploadFile, errorMessage } from "@/lib/uploadFile";

/** The ProseMirror JSON every client seeds a new document with. */
const EMPTY_DOC = { type: "doc", content: [] };

/**
 * How long the document must be idle before this client submits a snapshot.
 * Snapshots only save replaying steps, so this trades a little server work
 * for faster loads. It matches the component default, stated explicitly.
 */
const SNAPSHOT_DEBOUNCE_MS = 1000;

/**
 * Per-document collaborative BlockNote editor.
 *
 * Synced through `@convex-dev/prosemirror-sync` (org-scoped read/write enforced
 * in `convex/prosemirror.ts`). Inline AI is provided by `@blocknote/xl-ai`,
 * which talks to the shared server endpoint at `/api/ai` via the AI SDK
 * `DefaultChatTransport` — no model keys ever reach the client.
 *
 * Rendering invariants (see plan.md Phase 3 risks):
 * - `useBlockNoteSync` OWNS editor creation. We never call `useCreateBlockNote`
 *   and never pass `initialContent`; an empty doc is seeded via `sync.create`.
 * - Must be client-only with React StrictMode OFF. This file is loaded through
 *   `next/dynamic({ ssr: false })` from the doc page, never rendered on the
 *   server and never wrapped in `<StrictMode>`.
 */
export default function Editor({
  docId,
  readOnly,
}: {
  docId: Id<"documents">;
  readOnly: boolean;
}) {
  const convex = useConvex();

  // Authenticated upload flow (Convex File Storage) bound to this document.
  // The server validates type and size; its message is shown as a toast.
  const uploadFile = useMemo(() => {
    const upload = createUploadFile(convex, docId);
    return async (file: File) => {
      try {
        return await upload(file);
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't upload that file."));
        throw error;
      }
    };
  }, [convex, docId]);

  const sync = useBlockNoteSync<BlockNoteEditor>(api.prosemirror, docId, {
    snapshotDebounceMs: SNAPSHOT_DEBOUNCE_MS,
    onSyncError: (error) => {
      // Most sync errors are retried by the extension. Losing local steps is
      // the one the user must hear about.
      if (error.message.includes("could not be flushed")) {
        toast.error("Some recent edits couldn't be saved.");
      } else {
        console.warn("Document sync error", error);
      }
    },
    editorOptions: {
      uploadFile,
      dictionary: {
        ...en,
        ai: aiEn,
      },
      extensions: [
        AIExtension({
          transport: new DefaultChatTransport({
            api: "/api/ai",
          }),
        }),
      ],
    },
  });

  // Seed an empty ProseMirror doc the first time a never-edited page opens.
  // `sync` is a new object every render, so without the ref the effect could
  // call `create` again before the first seed lands. Every client seeds the
  // same EMPTY_DOC, so two clients racing on one id still converge (the
  // loser's create fails harmlessly). A trashed page is never seeded: the
  // server would reject the write.
  const seededFor = useRef<string | null>(null);
  const needsSeed = !sync.isLoading && sync.editor === null;
  const create = needsSeed ? sync.create : undefined;
  useEffect(() => {
    if (!create || readOnly || seededFor.current === docId) return;
    seededFor.current = docId;
    create(EMPTY_DOC).catch((error: unknown) => {
      console.warn("Document seed failed", error);
    });
  }, [create, readOnly, docId]);

  if (sync.isLoading) {
    return <EditorSkeleton />;
  }

  if (sync.editor === null) {
    if (readOnly) {
      return (
        <p className="px-1 py-2 text-sm text-muted-foreground">
          This page is empty.
        </p>
      );
    }
    // Loading finished but the doc is being seeded by the effect above.
    return <EditorSkeleton />;
  }

  return (
    <BlockNoteView
      editor={sync.editor}
      editable={!readOnly}
      // We supply our own toolbar + slash menu so we can splice in AI items.
      formattingToolbar={false}
      slashMenu={false}
      className="min-h-[40vh]"
    >
      {/* AI command menu (input -> thinking -> writing -> reviewing). */}
      <AIMenuController />

      {/* Formatting toolbar with the AI button appended to the defaults. */}
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            {getFormattingToolbarItems()}
            <AIToolbarButton />
          </FormattingToolbar>
        )}
      />

      {/* Slash menu merging the default React items with the AI items. */}
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            combineByGroup(
              getDefaultReactSlashMenuItems(sync.editor),
              getAISlashMenuItems(sync.editor),
            ),
            query,
          )
        }
      />
    </BlockNoteView>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1 py-2" aria-hidden>
      <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
    </div>
  );
}
