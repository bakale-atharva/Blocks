"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FileText, Folder } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useDebounced } from "@/lib/useDebounced";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { OPEN_SEARCH_EVENT } from "@/components/sidebar/AppSidebar";

/** Wait this long after the last keystroke before querying. */
const SEARCH_DEBOUNCE_MS = 150;

/**
 * ⌘K / Ctrl+K search palette. Mounted once by the dashboard layout.
 *
 * It opens on the keyboard shortcut or on `OPEN_SEARCH_EVENT` (the sidebar and
 * home page Search buttons). Results come from `documents.search`, which runs
 * on the server against the caller's org and skips trashed documents, so the
 * palette never filters anything itself. cmdk's own filtering is off for that
 * reason: the server already ranked the results.
 */
export default function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const term = useDebounced(input.trim(), SEARCH_DEBOUNCE_MS);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  const results = useQuery(
    api.documents.search,
    open && term.length > 0 ? { query: term } : "skip",
  );

  const onOpenChange = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setInput("");
  }, []);

  const onSelect = React.useCallback(
    (id: string) => {
      onOpenChange(false);
      router.push(`/doc/${id}`);
    },
    [onOpenChange, router],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search pages"
      description="Search pages and folders in this workspace by title."
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={input}
          onValueChange={setInput}
          placeholder="Search pages..."
        />
        <CommandList>
          {term.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Type to search this workspace.
            </p>
          ) : results === undefined ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </p>
          ) : (
            <>
              <CommandEmpty>No pages match “{term}”.</CommandEmpty>
              {results.length > 0 && (
                <CommandGroup heading="Pages">
                  {results.map((doc) => {
                    const RowIcon = doc.type === "folder" ? Folder : FileText;
                    return (
                      <CommandItem
                        key={doc._id}
                        value={doc._id}
                        onSelect={() => onSelect(doc._id)}
                      >
                        {doc.icon ? (
                          <span className="text-sm leading-none">
                            {doc.icon}
                          </span>
                        ) : (
                          <RowIcon className="text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {doc.title || "Untitled"}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
