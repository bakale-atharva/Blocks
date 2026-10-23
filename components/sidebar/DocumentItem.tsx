"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * A single node in the recursive document tree.
 *
 * Renders its own row (icon + title + actions) and, when expanded, lazily
 * subscribes to its children via `api.documents.getChildren` and renders a
 * nested `DocumentItem` per child. Indentation grows with `depth`.
 */
export default function DocumentItem({
  document,
  depth = 0,
}: {
  document: Doc<"documents">;
  depth?: number;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const isActive = params?.id === document._id;

  const [expanded, setExpanded] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(document.title);

  // Only subscribe to children once the node has been expanded at least once.
  const children = useQuery(
    api.documents.getChildren,
    expanded ? { parentId: document._id } : "skip",
  );

  const create = useMutation(api.documents.create);
  const rename = useMutation(api.documents.rename);
  const archive = useMutation(api.documents.archive);
  const toggleFavorite = useMutation(api.documents.toggleFavorite);

  const indentPadding = depth * 12 + 8;

  const onSelect = React.useCallback(() => {
    router.push(`/doc/${document._id}`);
  }, [router, document._id]);

  const onToggle = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const onCreateChild = React.useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      try {
        const childId = await create({
          parentId: document._id,
          type: "page",
          title: "Untitled",
        });
        setExpanded(true);
        router.push(`/doc/${childId}`);
      } catch {
        toast.error("Couldn't create page");
      }
    },
    [create, document._id, router],
  );

  const startRename = React.useCallback(() => {
    setDraftTitle(document.title);
    setIsRenaming(true);
  }, [document.title]);

  const commitRename = React.useCallback(async () => {
    setIsRenaming(false);
    const next = draftTitle.trim();
    if (next.length === 0 || next === document.title) {
      setDraftTitle(document.title);
      return;
    }
    try {
      await rename({ id: document._id, title: next });
    } catch {
      toast.error("Couldn't Rename");
      setDraftTitle(document.title);
    }
  }, [draftTitle, document._id, document.title, rename]);

  const onArchive = React.useCallback(async () => {
    try {
      await archive({ id: document._id });
      toast.success("Moved to trash");
      if (isActive) {
        router.push("/");
      }
    } catch {
      toast.error("Couldn't move to trash");
    }
  }, [archive, document._id, isActive, router]);

  const onToggleFavorite = React.useCallback(async () => {
    try {
      await toggleFavorite({ id: document._id });
    } catch {
      toast.error("Couldn't update favorite");
    }
  }, [toggleFavorite, document._id]);

  const RowIcon = document.type === "folder" ? Folder : FileText;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={isRenaming ? undefined : onSelect}
        onKeyDown={(event) => {
          if (isRenaming) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        style={{ paddingLeft: indentPadding }}
        className={cn(
          "group/item flex h-7 items-center gap-1 rounded-md pr-1 text-sm text-muted-foreground transition-colors, hover:bg-muted hover:text-foreground",
          isActive && "bg-muted text-foreground",
        )}
      >
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={onToggle}
          className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/10"
        >
          {document.icon ? (
            <span className="text-sm leading-none">{document.icon}</span>
          ) : expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>

        {!document.icon && (
          <RowIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}

        {isRenaming ? (
          <Input
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitRename();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setDraftTitle(document.title);
                setIsRenaming(false);
              }
            }}
            className="h-6 px-1 py-0 text-sm"
          />
        ) : (
          <span className="flex-1 truncate">
            {document.title || "Untitled"}
          </span>
        )}

        {!isRenaming && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Document Actions"
                    onClick={(event) => event.stopPropagation()}
                  />
                }
              >
                <MoreHorizontal className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuItem onClick={onToggleFavorite}>
                  <Star
                    className={cn(
                      "size-3.5",
                      document.isFavorite && "fill-current text-amber-500",
                    )}
                  />
                  {document.isFavorite
                    ? "Remove from favorites"
                    : "Add to favorites"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={startRename}>
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onArchive}>
                  <Trash2 className="size-3.5" />
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Add a page inside"
              onClick={onCreateChild}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {expanded && (
        <div>
          {children === undefined ? (
            <div
              className="flex h-7 items-center gap-2"
              style={{ paddingLeft: indentPadding + 20 }}
            >
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : children.length === 0 ? (
            <p
              className="py-1 text-xs text-muted-foreground/70"
              style={{ paddingLeft: indentPadding + 20 }}
            >
              No Pages Inside
            </p>
          ) : (
            children.map((child: Doc<"documents">) => (
              <DocumentItem
                key={child._id}
                document={child}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
