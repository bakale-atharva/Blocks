"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Folder, Star } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sidebar "Favorites" section: lists the org's starred documents and lets the
 * user navigate to or un-star each one. Hidden entirely when there are no
 * favorites so it doesn't clutter the sidebar.
 */
export default function FavoritesSection() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const favorites = useQuery(api.documents.listFavorites, {});
  const toggleFavorite = useMutation(api.documents.toggleFavorite);

  // Loading State
  if (favorites === undefined) {
    return (
      <div className="flex flex-col gap-1 px-2">
        <span className="text-xs font-medium text-muted-foreground">
          Favorites
        </span>
        <Skeleton className="h-6 w-4/5" />
      </div>
    );
  }

  // Nothing Favorited - render nothing.
  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="px-2 text-xs font-medium text-muted-foreground">
        Favorites
      </span>
      <div className="flex flex-col">
        {favorites.map((doc: Doc<"documents">) => {
          const isActive = params?.id === doc._id;
          const RowIcon = doc.type === "folder" ? Folder : FileText;
          return (
            <div
              key={doc._id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/doc/${doc._id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/doc/${doc._id}`);
                }
              }}
              className={cn(
                "group/fav flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-muted text-foreground",
              )}
            >
              {doc.icon ? (
                <span className="text-sm leading-none">{doc.icon}</span>
              ) : (
                <RowIcon className="size-3.5 shrink-0" />
              )}
              <span className="flex-1 truncate">{doc.title || "Untitled"}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remove From Favorites"
                className="opacity-0 transition-opacity group-hover/fav:opacity-100 group-focus-within/fav:opacity-100"
                onClick={async (event) => {
                  event.stopPropagation();
                  try {
                    await toggleFavorite({ id: doc._id });
                  } catch {
                    toast.error("Couldn't Update Favorite");
                  }
                }}
              >
                <Star className="size-3.5 fill-current text-amber-500" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
