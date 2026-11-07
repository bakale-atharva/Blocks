"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Drag and drop for the sidebar tree, on the native HTML5 drag API.
 *
 * A dragged row carries its document id under a private MIME type, so drops
 * of files or text from outside the app are ignored. The drop target calls
 * `documents.move`, and the server decides whether the move is allowed: it
 * rejects a move into the document's own subtree, into another org, or into
 * the trash, and the reason comes back as a toast.
 */
export const DOC_DRAG_TYPE = "application/x-blocks-document";

export function startDocumentDrag(
  event: React.DragEvent,
  id: Id<"documents">,
) {
  event.dataTransfer.setData(DOC_DRAG_TYPE, id);
  event.dataTransfer.effectAllowed = "move";
}

/**
 * Drop-target props for a row (`parentId` is that row's document) or for the
 * workspace root (`parentId: null`). `isOver` drives the highlight.
 */
export function useDocumentDrop(
  parentId: Id<"documents"> | null,
  onMoved?: () => void,
) {
  const move = useMutation(api.documents.move);
  const [isOver, setIsOver] = React.useState(false);

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(DOC_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setIsOver(true);
  }, []);

  const onDragLeave = React.useCallback((event: React.DragEvent) => {
    // Ignore leave events fired when moving between the target's children.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsOver(false);
  }, []);

  const onDrop = React.useCallback(
    async (event: React.DragEvent) => {
      const id = event.dataTransfer.getData(DOC_DRAG_TYPE);
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      setIsOver(false);
      if (id === parentId) return;
      try {
        await move({ id: id as Id<"documents">, parentId });
        onMoved?.();
      } catch (error) {
        toast.error(
          error instanceof ConvexError && typeof error.data === "string"
            ? error.data
            : "Couldn't move page",
        );
      }
    },
    [move, parentId, onMoved],
  );

  return { isOver, dropProps: { onDragOver, onDragLeave, onDrop } };
}
