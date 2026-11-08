"use client";

import AiGate, { AiUpgradeCta } from "@/components/billing/AiGate";

/**
 * Docked workspace agent. The chat itself arrives in Phase 6 (ATH-264).
 *
 * It self-gates behind the AI entitlement: orgs without AI see an upgrade
 * call to action in its place. The gate is UI-only; the server enforces the
 * plan and quota (`convex/aiUsage.ts`).
 */
export default function AgentChat() {
  return (
    <AiGate
      fallback={
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
          <AiUpgradeCta className="pointer-events-auto max-w-full" />
        </div>
      }
    >
      {null}
    </AiGate>
  );
}
