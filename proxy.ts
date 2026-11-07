import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk request proxy. Next 16 renamed the `middleware.ts` convention to
 * `proxy.ts`, and the Clerk export is still `clerkMiddleware`.
 *
 * It makes no auth decisions. Clerk deprecated path-based gating with its
 * route matcher helper, because path matching can diverge from how Next.js
 * routes a request and leave resources reachable. Each resource now protects
 * itself:
 *
 * - `app/(dashboard)/layout.tsx` gates the workspace with `<RequireAuth>`,
 *   which calls `auth.protect()` inside Suspense.
 * - Server Component pages call `auth.protect()` at the top, such as
 *   `app/(dashboard)/billing/page.tsx`.
 * - Every Convex query and mutation derives the tenant from the Clerk JWT
 *   through `getOrgContext` in `lib/auth.ts`. Convex is the source of truth
 *   for data access.
 *
 * `clerkMiddleware()` is still required so the Clerk auth state is available
 * on the server.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
