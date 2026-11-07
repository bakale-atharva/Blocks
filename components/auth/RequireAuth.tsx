import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

/**
 * Server-side auth gate for the workspace.
 *
 * It calls `auth.protect()`, which redirects signed-out document requests to
 * sign-in. A signed-in user with no active organization goes to
 * `/select-org`. `children` render only for a signed-in user with an org.
 *
 * Reading auth is a request-time read. With `cacheComponents` on, it has to
 * sit inside a `<Suspense>` boundary, which `app/(dashboard)/layout.tsx`
 * provides. Never move this read to the layout's top level: that would hold
 * the whole segment behind the request (Next.js guide: "Authentication with
 * Cache Components").
 */
export default async function RequireAuth({
  children,
}: {
  children: ReactNode;
}) {
  const { orgId } = await auth.protect();

  // Every workspace is a Clerk organization. Without an active one, Convex
  // has no tenant to scope data to, so send the user to pick or create one.
  if (!orgId) {
    redirect("/select-org");
  }

  return <>{children}</>;
}
