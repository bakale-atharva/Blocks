"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AI_FEATURE } from "@/lib/entitlements";

/**
 * Whether the active organization's plan includes AI, read from the Clerk
 * session token's `fea` claim. This only drives the UI: Convex re-checks the
 * same claims (`lib/entitlements.ts`) and enforces the quota on every call.
 *
 * Returns `false` while Clerk is loading, so locked UI never flashes open.
 */
export function useAiEnabled(): boolean {
  const { isLoaded, has } = useAuth();
  if (!isLoaded || !has) return false;
  return has({ feature: `org:${AI_FEATURE}` });
}

/**
 * Renders `children` only when the organization has AI. Otherwise renders
 * `fallback` (nothing by default).
 */
export default function AiGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useAiEnabled() ? children : fallback;
}

/** Upgrade call to action shown where AI is locked. */
export function AiUpgradeCta({ className }: { className?: string }) {
  return (
    <div
      className={
        "flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm shadow-sm " +
        (className ?? "")
      }
    >
      <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">
        AI writing and the workspace assistant are on Pro and Business.
      </span>
      <Button size="sm" nativeButton={false} render={<Link href="/billing" />}>
        Upgrade
      </Button>
    </div>
  );
}
