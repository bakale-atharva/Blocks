"use client";

import type { ReactNode } from "react";
import { RedirectToSignIn, Show } from "@clerk/nextjs";

/**
 * Client-side signed-out handling for the workspace.
 *
 * The dashboard pages are Client Components that read data through Convex.
 * If the session ends while a page is open, for example after sign-out in
 * another tab, this sends the user to sign-in instead of leaving the page in
 * an error state. It reacts to client-side auth changes that the server gate
 * (`RequireAuth`) can't see.
 *
 * It only shapes the UX. Data stays protected in Convex through
 * `getOrgContext`.
 */
export default function SignedOutRedirect({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}
