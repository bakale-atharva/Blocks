import { PricingTable } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import AiUsageMeter from "@/components/billing/AiUsageMeter";

export const metadata = {
  title: "Billing",
  description: "Manage your organization's plan and AI entitlements.",
};

/**
 * Org-scoped billing page.
 *
 * Every member sees the organization's AI usage for the month. Only org
 * admins see Clerk's `<PricingTable for="organization" />`, which is where
 * the plan is changed.
 *
 * Plans are configured in the Clerk Dashboard (Billing → Plans, for
 * organizations) as Free / Pro / Business, with the `ai_enabled` feature on
 * the paid plans. The monthly AI quota per plan is `PLAN_LIMITS` in
 * `lib/entitlements.ts`, enforced in Convex by `convex/aiUsage.ts`.
 */
export default async function BillingPage() {
  // Resource-level gate (defense in depth alongside the layout's RequireAuth).
  const { has } = await auth.protect();
  const isAdmin = has({ role: "org:admin" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Paid plans unlock inline AI writing and the workspace assistant.
        </p>
      </header>

      <div className="mb-8">
        <AiUsageMeter />
      </div>

      {isAdmin ? (
        <PricingTable for="organization" />
      ) : (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Only organization admins can change the plan. Ask an admin to
          upgrade if your team needs more AI calls.
        </p>
      )}
    </div>
  );
}
