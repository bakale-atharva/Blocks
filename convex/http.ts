import { httpRouter } from "convex/server";
import { verifyWebhook } from "@clerk/backend/webhooks";
import type { WebhookEvent } from "@clerk/backend/webhooks";
import type { UserJSON } from "@clerk/backend";
import { httpAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Clerk webhook. It mirrors users, organizations, and memberships into the
 * Convex tables of the same names.
 *
 * Every request is verified against `CLERK_WEBHOOK_SIGNING_SECRET` (a Convex
 * env var) with Clerk's `verifyWebhook` before anything is written. A request
 * that fails verification gets a 400 and writes nothing.
 *
 * Point the Clerk Dashboard endpoint at `<CONVEX_SITE_URL>/clerk-webhook` and
 * subscribe to the `user.*`, `organization.*`, and `organizationMembership.*`
 * events.
 */
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error("CLERK_WEBHOOK_SIGNING_SECRET is not set");
      return new Response("Webhook not configured", { status: 500 });
    }

    let event: WebhookEvent;
    try {
      event = await verifyWebhook(request, { signingSecret });
    } catch {
      return new Response("Webhook verification failed", { status: 400 });
    }

    await handleEvent(ctx, event);
    return new Response(null, { status: 200 });
  }),
});

async function handleEvent(ctx: ActionCtx, event: WebhookEvent) {
  switch (event.type) {
    case "user.created":
    case "user.updated":
      await ctx.runMutation(internal.clerkSync.upsertUser, {
        externalId: event.data.id,
        name: displayName(event.data),
        email: primaryEmail(event.data),
      });
      return;
    case "user.deleted":
      if (event.data.id) {
        await ctx.runMutation(internal.clerkSync.deleteUser, {
          externalId: event.data.id,
        });
      }
      return;
    case "organization.created":
    case "organization.updated":
      await ctx.runMutation(internal.clerkSync.upsertOrganization, {
        clerkOrgId: event.data.id,
        name: event.data.name,
        slug: event.data.slug ?? undefined,
      });
      return;
    case "organization.deleted":
      if (event.data.id) {
        await ctx.runMutation(internal.clerkSync.deleteOrganization, {
          clerkOrgId: event.data.id,
        });
      }
      return;
    case "organizationMembership.created":
    case "organizationMembership.updated":
      await ctx.runMutation(internal.clerkSync.upsertMembership, {
        clerkOrgId: event.data.organization.id,
        clerkUserId: event.data.public_user_data.user_id,
        role: event.data.role,
      });
      return;
    case "organizationMembership.deleted":
      await ctx.runMutation(internal.clerkSync.deleteMembership, {
        clerkOrgId: event.data.organization.id,
        clerkUserId: event.data.public_user_data.user_id,
      });
      return;
    default:
      // Other subscribed events are acknowledged and ignored.
      return;
  }
}

function displayName(user: UserJSON): string | undefined {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.username || undefined;
}

function primaryEmail(user: UserJSON): string | undefined {
  const primary = user.email_addresses.find(
    (email) => email.id === user.primary_email_address_id,
  );
  return (primary ?? user.email_addresses[0])?.email_address;
}

export default http;
