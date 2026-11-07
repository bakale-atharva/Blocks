"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

/**
 * Banner across the top of a trashed document, with a Restore action.
 *
 * Restore brings back the document and everything that was trashed with it
 * (`documents.restore`). Nothing is permanently deleted, so the banner offers
 * no "Delete forever". Making a trashed document read-only is Phase 3.
 */
export default function ArchivedBanner({ docId }: { docId: string }) {
  const doc = useQuery(api.documents.get, { id: docId as Id<"documents"> });
  const restore = useMutation(api.documents.restore);
  const [restoring, setRestoring] = React.useState(false);

  if (!doc?.isArchived) return null;

  const onRestore = async () => {
    setRestoring(true);
    try {
      await restore({ id: doc._id });
      toast.success("Restored");
    } catch {
      toast.error("Couldn't restore document");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive"
    >
      <Trash2 className="size-4 shrink-0" />
      <span>This page is in the trash.</span>
      <Button
        variant="outline"
        size="xs"
        onClick={onRestore}
        disabled={restoring}
      >
        <RotateCcw className="size-3.5" />
        {restoring ? "Restoring..." : "Restore"}
      </Button>
    </div>
  );
}
