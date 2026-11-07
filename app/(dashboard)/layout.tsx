import { Suspense, type ReactNode } from "react";

import AppSidebar from "@/components/sidebar/AppSidebar";
import RequireAuth from "@/components/auth/RequireAuth";
import SignedOutRedirect from "@/components/auth/SignedOutRedirect";
import { Skeleton } from "@/components/ui/skeleton";

export const instant = false;

/**
 * Authenticated workspace shell.
 *
 * `RequireAuth` runs `auth.protect()` on the server inside `<Suspense>`, as
 * Cache Components requires for request-time reads. `SignedOutRedirect`
 * covers sessions that end on the client.
 */
// eslint-disable-next-line @clerk/next/require-auth-protection -- Protected by <RequireAuth>, which calls auth.protect() inside Suspense (Cache Components forbids a top-level request read here).
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <RequireAuth>
        <SignedOutRedirect>
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar />

            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </SignedOutRedirect>
      </RequireAuth>
    </Suspense>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden" aria-hidden>
      <div className="flex w-60 flex-col gap-3 border-r p-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
