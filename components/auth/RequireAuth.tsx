import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

/**
 * Server-side auth gate for the workspace.
 *
 * It calls `auth.protect()`, which redirects signed-out document requests to
 * sign-in, and renders `children` only for a signed-in user.
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
  await auth.protect();

  return <>{children}</>;
}
