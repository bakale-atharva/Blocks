"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/uploadFile";
import { Button } from "@/components/ui/button";

/**
 * Banner across the top of a trashed document, with a Restore action.
 *
 * A trashed document is read-only: the editor and page header are disabled,
 * and the server rejects writes to it. Restore brings back the document and
 * everything that was trashed with it (`documents.restore`). Nothing is
 * permanently deleted, so the banner offers no "Delete forever".
 */
export default function ArchivedBanner({ doc }: { doc: Doc<"documents"> }) {
  const restore = useMutation(api.documents.restore);
  const [restoring, setRestoring] = React.useState(false);

  if (!doc.isArchived) return null;

  const onRestore = async () => {
    setRestoring(true);
    try {
      await restore({ id: doc._id });
      toast.success("Restored");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't restore document"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive"
    >
      <Trash2 className="size-4 shrink-0" aria-hidden />
      <span>This page is in the trash and is read-only.</span>
      <Button
        variant="outline"
        size="xs"
        onClick={onRestore}
        disabled={restoring}
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {restoring ? "Restoring..." : "Restore to edit"}
      </Button>
    </div>
  );
}
