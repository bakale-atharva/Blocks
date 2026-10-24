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
 * org's archived (soft-deleted) documents, with client-side filtering and a
 * per-row Restore action. Documents are never hard-deleted from the UI.
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

function TrashList({ onRestored }: { onRestored: () => void }) {
  const router = useRouter();
  const trashed = useQuery(api.documents.listTrash, {});
  const restore = useMutation(api.documents.restore);
  const [filter, setFilter] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!trashed) return [];
    const term = filter.trim().toLowerCase();
    if (term.length === 0) return trashed;
    return trashed.filter((doc: Doc<"documents">) =>
      (doc.title || "Untitled").toLowerCase().includes(term),
    );
  }, [trashed, filter]);

  const onRestore = React.useCallback(
    async (doc: Doc<"documents">) => {
      try {
        await restore({ id: doc._id });
        router.push(`/doc/${doc._id}`);
        onRestored();
      } catch {
        toast.error("Couldn't Restore Note");
      }
    },
    [restore, router, onRestored],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground " />
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by title..."
          className="pl-7"
        />

        <ScrollArea className="max-h-72">
          {trashed === undefined ? (
            <div className="flex flex-col gap-1.5 pr-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-4/5" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted0foreground">
              {trashed.length === 0 ? "Trash is empty" : "No matches"}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5 pr-3">
              {filtered.map((doc: Doc<"documents">) => {
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
    </div>
  );
}
