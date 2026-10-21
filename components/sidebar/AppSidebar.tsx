"use client";

import { Search } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import FavoritesSection from "@/components/sidebar/FavoritesSection";
import DocumentTree from "@/components/sidebar/DocumentTree";
import TrashView from "@/components/sidebar/TrashView";

/**
 * Custom event used to open the Cmd+K search palette from anywhere in the
 * dashboard (e.g. the sidebar "Search" button). `SearchCommand` listens for it.
 */
export const OPEN_SEARCH_EVENT = "blocks:open-search";

export function openSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
  }
}

/**
 * The dashboard left sidebar. Composes the search trigger, the favorites
 * section, the recursive document tree, and the trash entry. All data is
 * org-scoped and reactive via Convex `useQuery` inside the child components.
 */
export default function AppSidebar() {
  return (
    <nav
      aria-label="Workspace Navigation"
      className="flex h-full w-64 shrink-0 flex-col border-r bg-muted/30"
    >
      <div className="p-2">
        <button
          type="button"
          onClick={openSearch}
          className="flex w-full gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono  text-muted-foreground sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-1 py-3">
          <FavoritesSection />
          <DocumentTree />
        </div>
      </ScrollArea>

      <Separator />

      <div className="py-2">
        <TrashView />
      </div>
    </nav>
  );
}
