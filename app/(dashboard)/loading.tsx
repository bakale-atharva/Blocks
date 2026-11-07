import { Skeleton } from "@/components/ui/skeleton";

/**
 * Suspense fallback for dashboard pages. Pages that read request data (auth,
 * params) stream in behind it, as Cache Components requires.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-3 px-8 py-8" aria-hidden>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
