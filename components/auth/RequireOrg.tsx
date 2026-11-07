"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * Client-side counterpart to the org check in `RequireAuth`.
 *
 * The server check runs once per navigation. This one catches the active
 * organization going away while a page is open, for example after the user
 * leaves the org or it is deleted. In that case it sends the user to
 * `/select-org` instead of leaving every Convex query failing with
 * "No active organization".
 *
 * It only shapes the UX. Convex still enforces tenancy through
 * `getOrgContext`.
 */
export default function RequireOrg({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const router = useRouter();
  const missingOrg = isLoaded && isSignedIn && !orgId;

  useEffect(() => {
    if (missingOrg) {
      router.replace("/select-org");
    }
  }, [missingOrg, router]);

  if (missingOrg) return null;
  return <>{children}</>;
}
