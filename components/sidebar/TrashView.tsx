"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Folder,
  RotateCcw,
  Search as SearchIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { useDebounced } from "@/lib/useDebounced";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Sidebar "Trash" entry. Renders a button row that opens a dialog listing the
 * org's archived (soft-deleted) documents, with server-side search and a
 * per-row Restore action. Restoring a document also restores everything that
 * was trashed together with it. Documents are never hard-deleted, and the UI
 * offers no "Delete forever".
 */
export default function TrashView() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-1 flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Trash2 className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Trash</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trash</DialogTitle>
            <DialogDescription>
              Restore documents you removed. Trashed items are kept, never
              permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <TrashList onRestored={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Wait this long after the last keystroke before searching the trash. */
const TRASH_SEARCH_DEBOUNCE_MS = 150;

function TrashList({ onRestored }: { onRestored: () => void }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState("");
  const term = useDebounced(filter.trim(), TRASH_SEARCH_DEBOUNCE_MS);

  // With no search term, show the most recently trashed documents. With one,
  // search the whole trash on the server (`search_title`, `isArchived: true`),
  // not just the recent page that `listTrash` returns.
  const recent = useQuery(api.documents.listTrash, term ? "skip" : {});
  const matches = useQuery(
    api.documents.search,
    term ? { query: term, archived: true } : "skip",
  );
  const docs = term ? matches : recent;
  const restore = useMutation(api.documents.restore);

  const onRestore = React.useCallback(
    async (doc: Doc<"documents">) => {
      try {
        await restore({ id: doc._id });
        toast.success(
          doc.type === "folder"
            ? "Restored, with everything trashed alongside it"
            : "Restored",
        );
        router.push(`/doc/${doc._id}`);
        onRestored();
      } catch {
        toast.error("Couldn't restore document");
      }
    },
    [restore, router, onRestored],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search the trash..."
          aria-label="Search the trash"
          className="pl-7"
        />
      </div>

      <ScrollArea className="max-h-72">
        {docs === undefined ? (
          <div className="flex flex-col gap-1.5 pr-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-4/5" />
          </div>
        ) : docs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {term ? "No matches" : "Trash is empty"}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 pr-3">
            {docs.map((doc: Doc<"documents">) => {
              const RowIcon = doc.type === "folder" ? Folder : FileText;
              return (
                <li
                  key={doc._id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  {doc.icon ? (
                    <span className="text-sm leading-none">{doc.icon}</span>
                  ) : (
                    <RowIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">
                    {doc.title || "Untitled"}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onRestore(doc)}
                  >
                    <RotateCcw className="size-3.5" />
                    Restore
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
