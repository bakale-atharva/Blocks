import { ConvexError } from "convex/values";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
} from "@blocknote/xl-ai/server";

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getOrgContext } from "../lib/auth";
import { AI_NOT_ENABLED, QUOTA_EXCEEDED } from "./aiUsage";

/**
 * Inline AI for the BlockNote editor (`POST /api/ai`, routed in `http.ts`).
 *
 * The editor's xl-ai `DefaultChatTransport` calls this endpoint directly with
 * the user's Convex token as `Authorization: Bearer …`. In order, it:
 *
 *  1. derives the org from the token (`getOrgContext`), or returns 401;
 *  2. checks the server is configured (`OPENROUTER_API_KEY`, and a `:free`
 *     model from `OPENROUTER_MODEL` or `DEFAULT_MODEL`);
 *  3. records one AI call (`aiUsage.consume`), which re-checks the plan's
 *     `ai_enabled` feature and the monthly quota: 403 or 429 when refused;
 *  4. streams the model's tool calls back as an AI SDK UI message stream.
 *
 * The OpenRouter key exists only as a Convex env var. The browser never
 * talks to OpenRouter.
 */

/**
 * The model used when `OPENROUTER_MODEL` is unset: a free NVIDIA model on
 * OpenRouter that supports tool calling with `tool_choice`, which xl-ai
 * needs (`toolChoice: "required"`).
 */
export const DEFAULT_MODEL = "nvidia/nemotron-3.5-super-vl:free";

/**
 * Only OpenRouter's free variants are allowed, so a paid model can't be
 * switched on by an env var change alone. Remove this check to allow paid
 * models.
 */
export function isFreeModel(modelId: string): boolean {
  return modelId.endsWith(":free");
}

/** Largest request body accepted, in characters. The document state rides along in it. */
const MAX_BODY_CHARS = 2_000_000;

/**
 * Origins allowed to call the endpoint from a browser, from the Convex env
 * var `APP_ORIGINS` (comma-separated). Defaults to the local dev server.
 */
function allowedOrigins(): string[] {
  const raw = process.env.APP_ORIGINS ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0);
}

/** CORS headers for a request. Unknown origins get no allow-origin header. */
function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

function jsonError(
  request: Request,
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

/** CORS preflight for `/api/ai`. */
export const preflight = httpAction(async (_ctx, request) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
});

type InlineAiBody = {
  messages: UIMessage[];
  toolDefinitions: Parameters<typeof toolDefinitionsToToolSet>[0];
};

/** Narrow the untrusted JSON body to what xl-ai sends. */
function parseBody(value: unknown): InlineAiBody | null {
  if (typeof value !== "object" || value === null) return null;
  const { messages, toolDefinitions } = value as Record<string, unknown>;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const messagesOk = messages.every(
    (message) =>
      typeof message === "object" &&
      message !== null &&
      typeof (message as { id?: unknown }).id === "string" &&
      ["user", "assistant", "system"].includes(
        (message as { role?: unknown }).role as string,
      ) &&
      Array.isArray((message as { parts?: unknown }).parts),
  );
  if (!messagesOk) return null;
  if (
    typeof toolDefinitions !== "object" ||
    toolDefinitions === null ||
    Array.isArray(toolDefinitions) ||
    Object.keys(toolDefinitions).length === 0
  ) {
    return null;
  }
  return {
    messages: messages as UIMessage[],
    toolDefinitions: toolDefinitions as InlineAiBody["toolDefinitions"],
  };
}

export const inlineAi = httpAction(async (ctx, request) => {
  // 1. Identity and org, from the bearer token only.
  try {
    await getOrgContext(ctx);
  } catch {
    return jsonError(
      request,
      401,
      "Unauthenticated",
      "Sign in and choose an organization to use AI.",
    );
  }

  // 2. Configuration. Checked before consuming quota so a misconfigured
  // deployment never burns calls.
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  if (!apiKey || !isFreeModel(modelId)) {
    console.error(
      !apiKey
        ? "OPENROUTER_API_KEY is not set"
        : `OPENROUTER_MODEL "${modelId}" is not a :free model`,
    );
    return jsonError(
      request,
      500,
      "AiNotConfigured",
      "AI isn't configured on this deployment.",
    );
  }

  // Body: size-capped and validated before anything is charged.
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return jsonError(request, 413, "TooLarge", "This request is too large.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return jsonError(request, 400, "BadRequest", "Invalid JSON body.");
  }
  const body = parseBody(raw);
  if (!body) {
    return jsonError(request, 400, "BadRequest", "Invalid AI request.");
  }

  // 3. Plan and quota. The caller's auth carries into the mutation, which
  // reads the org and plan from the same token.
  try {
    await ctx.runMutation(internal.aiUsage.consume, {});
  } catch (error) {
    if (error instanceof ConvexError) {
      const data = error.data as { code?: string; message?: string };
      if (data.code === AI_NOT_ENABLED) {
        return jsonError(request, 403, AI_NOT_ENABLED, data.message ?? "");
      }
      if (data.code === QUOTA_EXCEEDED) {
        return jsonError(request, 429, QUOTA_EXCEEDED, data.message ?? "");
      }
    }
    throw error;
  }

  // 4. Stream. The document state and tool definitions come from xl-ai on
  // the client; the tools only describe edits, which the client applies.
  const openrouter = createOpenRouter({ apiKey });
  const result = streamText({
    model: openrouter(modelId),
    system: aiDocumentFormats.html.systemPrompt,
    messages: await convertToModelMessages(
      injectDocumentStateMessages(body.messages),
    ),
    tools: toolDefinitionsToToolSet(body.toolDefinitions),
    toolChoice: "required",
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({
    headers: corsHeaders(request),
    onError: (error) => {
      console.error("Inline AI stream error", error);
      return "The AI request failed. Please try again.";
    },
  });
});
