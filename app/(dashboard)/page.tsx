"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { FilePlus2, Search } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { openSearch } from "@/components/sidebar/AppSidebar";

/**
 * Dashboard landing / empty state. Shown at the dashboard root before a
 * specific document is opened. Offers a one-click "new page" action
 * (org-scoped via `api.documents.create`) and a prompt to open search.
 */
export default function Home() {
  const router = useRouter();
  const create = useMutation(api.documents.create);
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    setCreating(true);
    try {
      const id = await create({
        parentId: null,
        type: "page",
        title: "Untitled",
      });
      router.push(`/doc/${id}`);
    } catch {
      toast.error("Couldn't Create Page");
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome To Your Workspace
        </h1>
        <p className="max-w-md text-sm text-mute-foreground">
          Create a page to start writing, or search across everything in this
          organization. Pages, folders, favorites and trash live in the sidebar.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onCreate} disabled={creating}>
          <FilePlus2 className="size-4" />
          {creating ? "Creating..." : "Create A Page"}
        </Button>
        <Button variant="outline" onClick={openSearch}>
          <Search className="size-4" />
          Search
          <kbd className="ml-1 inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>
    </div>
  );
}
