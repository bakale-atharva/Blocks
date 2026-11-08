"use client";

import { useMemo } from "react";
import { useClerk } from "@clerk/nextjs";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";

/**
 * The Convex HTTP actions origin (`*.convex.site`). Uses
 * `NEXT_PUBLIC_CONVEX_SITE_URL` when set, otherwise derives it from
 * `NEXT_PUBLIC_CONVEX_URL` (`*.convex.cloud` → `*.convex.site`).
 */
export function convexSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!cloud) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  return cloud.replace(/\.convex\.cloud\/?$/, ".convex.site");
}

/** Server error body shape from `convex/inlineAi.ts`. */
type InlineAiError = { code?: string; message?: string };

const FALLBACK_MESSAGE = "The AI request failed. Please try again.";

/**
 * Fetch wrapper for the AI transport. A refused call (401, 403, 413, 429,
 * 500) shows the server's message as a toast, then throws so the AI menu
 * leaves its loading state.
 */
async function inlineAiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if ((error as { name?: string }).name !== "AbortError") {
      toast.error("Couldn't reach the AI service.");
    }
    throw error;
  }
  if (response.ok) return response;

  let message = FALLBACK_MESSAGE;
  try {
    const body = (await response.json()) as InlineAiError;
    if (body.message) message = body.message;
  } catch {
    // Non-JSON error body: keep the fallback message.
  }
  toast.error(message);
  throw new Error(message);
}

/**
 * The xl-ai chat transport for the editor. It posts to the Convex
 * `/api/ai` HTTP action with the user's Convex token, fetched per request
 * the same way `ConvexProviderWithClerk` picks it, so the server sees the
 * same identity, org, and billing claims as every other Convex call.
 *
 * The transport object is stable for the editor's lifetime, because xl-ai
 * only reads it when it creates a chat.
 */
export function useInlineAiTransport(): DefaultChatTransport<UIMessage> {
  // The Clerk instance is a stable singleton, and `clerk.session` is read at
  // request time, so the token always belongs to the current session and org.
  const clerk = useClerk();

  return useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${convexSiteUrl()}/api/ai`,
        fetch: inlineAiFetch,
        headers: async (): Promise<Record<string, string>> => {
          const session = clerk.session;
          if (!session) return {};
          // Native Convex integration: the session token itself has
          // `aud: "convex"`. Otherwise use the "convex" JWT template.
          let token = await session.getToken();
          if (token && audienceOf(token) !== "convex") {
            token = await session.getToken({ template: "convex" });
          }
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [clerk],
  );
}

/** The `aud` claim of a JWT, read without verifying (the server verifies). */
function audienceOf(jwt: string): unknown {
  try {
    const payload = jwt.split(".")[1] ?? "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { aud?: unknown }).aud;
  } catch {
    return undefined;
  }
}
