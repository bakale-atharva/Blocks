import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk request proxy (Next 16 renamed the `middleware.ts` convention to
 * `proxy.ts`; the Clerk export remains `clerkMiddleware`).
 *
 * The authenticated workspace lives at the root (`/`, `/billing`, `/doc/[id]`)
 * via the `(dashboard)` route group — route groups do NOT add a URL segment,
 * so we protect everything EXCEPT the explicitly public routes (sign-in/up).
 * Unauthenticated requests to protected routes are redirected to sign-in;
 * `/api/ai` is protected too (it also re-checks auth server-side).
 */
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};