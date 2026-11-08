"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

const PLAN_NAMES: Record<string, string> = {
  free_org: "Free",
  free: "Free",
  pro: "Pro",
  business: "Business",
};

/**
 * This month's AI usage for the active organization, from `aiUsage.current`.
 * The numbers come from the server, so they match what the quota enforces.
 */
export default function AiUsageMeter() {
  const usage = useQuery(api.aiUsage.current);

  if (usage === undefined) {
    return (
      <section
        aria-busy="true"
        className="h-[88px] animate-pulse rounded-lg border bg-muted/40"
      />
    );
  }

  const planName = usage.plan ? (PLAN_NAMES[usage.plan] ?? usage.plan) : "Free";
  const resets = new Date(usage.resetsAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const percent =
    usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const atLimit = usage.limit > 0 && usage.used >= usage.limit;

  return (
    <section className="rounded-lg border p-4" aria-labelledby="ai-usage-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="ai-usage-title" className="text-sm font-medium">
          AI usage this month
        </h2>
        <span className="text-xs text-muted-foreground">{planName} plan</span>
      </div>

      {usage.aiEnabled ? (
        <>
          <div
            role="meter"
            aria-label="AI calls used this month"
            aria-valuemin={0}
            aria-valuemax={usage.limit}
            aria-valuenow={usage.used}
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className={
                "h-full rounded-full transition-[width] motion-reduce:transition-none " +
                (atLimit ? "bg-destructive" : "bg-primary")
              }
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {usage.used.toLocaleString()} of {usage.limit.toLocaleString()}{" "}
            calls used{atLimit ? " — AI is paused until the reset" : ""}.
            Resets {resets} (UTC).
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          AI isn&apos;t included in this plan. Upgrade to Pro or Business to
          unlock inline AI and the workspace assistant.
        </p>
      )}
    </section>
  );
}
