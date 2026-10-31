"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

/** Shape of a single breadcrumb returned by `documents.getBreadcrumbs`. */
type Crumb = {
  _id: Id<"documents">;
  title: string;
  icon?: string;
  type: "folder" | "page";
};

/**
 * Breadcrumb trail for the open document, walking the `parentId` chain to the
 * workspace root. The trail (root -> ... -> current) is produced server-side by
 * `documents.getBreadcrumbs`, which is org-scoped (derives the org from the
 * Clerk JWT) so it never leaks documents from another org.
 *
 * Each ancestor links to its own doc page; the final (current) crumb is
 * rendered as inert text.
 */
export default function Breadcrumbs({ docId }: { docId: string }) {
  const trail = useQuery(api.documents.getBreadcrumbs, {
    id: docId as Id<"documents">,
  });

  if (trail === undefined) {
    return (
      <div className="flex h-6 items-center" aria-hidden>
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (trail.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1 overflow-hidden text-sm text-muted-foreground"
    >
      {(trail as Crumb[]).map((crumb: Crumb, index: number) => {
        const isLast = index === trail.length - 1;
        const label = (
          <span className="flex min-w-0 items-center gap-1">
            {crumb.icon ? <span aria-hidden>{crumb.icon}</span> : null}
            <span className="truncate">{crumb.title || "Untitled"}</span>
          </span>
        );

        return (
          <span key={crumb._id} className="flex min-w-0 items-center gap-1">
            {index > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : null}
            {isLast ? (
              <span
                className={cn("max-w-[16rem] font-medium text-foreground")}
                aria-current="page"
              >
                {label}
              </span>
            ) : (
              <Link
                href={`/doc/${crumb._id}`}
                className="max-w-[12rem] rounded px-1 py-0.5 transition hover:bg-muted hover:text-foreground"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
