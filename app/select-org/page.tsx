import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OrganizationList, TaskChooseOrganization } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Choose a workspace",
};

/**
 * Workspace picker. Every Blocks workspace is a Clerk organization, so a
 * signed-in user needs an active one before the dashboard can load any data.
 *
 * Users land here in two ways:
 * - Clerk's `choose-organization` session task. `ClerkProvider` points its
 *   `taskUrls` here, and the session stays pending until an org is chosen.
 * - `RequireAuth` and `RequireOrg` redirect a signed-in user who has no
 *   active organization.
 *
 * The auth read sits inside `<Suspense>`, as Cache Components requires.
 */
// eslint-disable-next-line @clerk/next/require-auth-protection -- Protected by <SelectOrgGate>, which reads auth inside Suspense and redirects signed-out users. It can't use auth.protect(), because protect() rejects the pending session this page exists to complete.
export default function SelectOrgPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-md" />}>
        <SelectOrgGate />
      </Suspense>
    </div>
  );
}

async function SelectOrgGate() {
  // Pending sessions count as signed in here, so the choose-organization
  // task can be completed on this page.
  const { userId, orgId, sessionStatus, redirectToSignIn } = await auth({
    treatPendingAsSignedOut: false,
  });

  if (!userId) {
    return redirectToSignIn();
  }
  if (orgId) {
    redirect("/");
  }

  if (sessionStatus === "pending") {
    return <TaskChooseOrganization redirectUrlComplete="/" />;
  }

  return (
    <OrganizationList
      hidePersonal
      afterSelectOrganizationUrl="/"
      afterCreateOrganizationUrl="/"
    />
  );
}
