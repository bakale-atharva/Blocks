import { PricingTable } from "@clerk/nextjs";

export const metadata = {
  title: "Billing",
  description: "Manage your organization's plan and AI entitlements.",
};

/**
 * Org-scoped billing page. Renders Clerk's `<PricingTable />` with
 * `for="organization"` so plans/subscriptions are attached to the *active
 * organization* (B2B billing) rather than the individual user.
 *
 * Plans are configured in the Clerk Dashboard (Billing → Plans, scoped to
 * organizations) as Free / Pro / Business, with a boolean `ai_enabled` feature
 * on the paid tiers. That feature is what `<AiGate>` and `readAiEntitlement()`
 * (`lib/entitlements.ts`) gate on. The numeric AI quota per tier lives in
 * `PLAN_LIMITS` and is enforced in Convex (`aiUsage`, M7) — Clerk has no
 * metered billing.
 */
export default function BillingPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a plan for your organization. Paid plans unlock the workspace
          AI Assistant & inline AI writing tools.
        </p>
      </header>

      <PricingTable for="organization" />
    </div>
  );
}
