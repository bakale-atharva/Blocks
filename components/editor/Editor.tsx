"use client";

import { useEffect, useMemo } from "react";
import { useConvex } from "convex/react";
import { DefaultChatTransport } from "ai";

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
import { createUploadFile } from "@/lib/uploadFile";

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
export default function Editor({ docId }: { docId: string }) {
  const convex = useConvex();

  // Authenticated upload flow (Convex File Storage) bound to the context client.
  const uploadFile = useMemo(() => createUploadFile(convex), [convex]);

  const sync = useBlockNoteSync<BlockNoteEditor>(api.prosemirror, docId, {
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

  // Seed an empty ProseMirror doc the first time we open a never-edited page.
  // `sync.create` is only present once loading has finished and no doc exists.
  useEffect(() => {
    if (!sync.isLoading && sync.editor === null) {
      void sync.create({ type: "doc", content: [] });
    }
  }, [sync]);

  if (sync.isLoading) {
    return <EditorSkeleton />;
  }

  if (sync.editor === null) {
    // Loading finished but the doc is being seeded by the effect above.
    return <EditorSkeleton />;
  }

  return (
    <BlockNoteView
      editor={sync.editor}
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
      <div className="h-7 w-2/3 animate-pulse round bg-muted" />
      <div className="h-4 w-full animate-pulse round bg-muted" />
      <div className="h-4 w-5/6 animate-pulse round bg-muted" />
      <div className="h-4 w-4/6 animate-pulse round bg-muted" />
    </div>
  );
}
