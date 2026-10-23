"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentItem from "@/components/sidebar/DocumentItem";

/**
 * Root of the recursive document tree. Subscribes to the org's top-level
 * documents (`parentId: null`) and renders a `DocumentItem` per node, which
 * recurses into its own children on expand.
 */
export default function DocumentTree() {
  const router = useRouter();
  const roots = useQuery(api.documents.getChildren, { parentId: null });
  const create = useMutation(api.documents.create);

  const onCreateRoot = React.useCallback(async () => {
    try {
      const id = await create({
        parentId: null,
        type: "page",
        title: "Untitled",
      });
      router.push(`/doc/${id}`);
    } catch {
      toast.error("Couldn't Create Page");
    }
  }, [create, router]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-medium text-muted-foreground">
          Workspace
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="New Page"
          onClick={onCreateRoot}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col">
        {roots === undefined ? (
          <div className="flex flex-col gap-1 px-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-3/5" />
          </div>
        ) : roots.length === 0 ? (
          <button
            type="button"
            onClick={onCreateRoot}
            className="mx-1 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Create Your First Page
          </button>
        ) : (
          roots.map((doc: Doc<"documents">) => (
            <DocumentItem key={doc._id} document={doc} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
