# Phase 0 — Project setup and committed baseline

## Summary

Preserve the existing application, generate its Graphify map, establish the Linear roadmap, and commit and push the baseline to `main`. Stop after Phase 0 with verification results and testing instructions.

Three Luna subagents completed the scan. Current findings:

- Editor, recursive navigation, trash/restore, collaboration wiring, presence, and organization pricing UI already exist.
- Inline AI points to a missing endpoint; workspace agent chat is a placeholder.
- TypeScript currently fails because AI SDK 7 conflicts with xl-ai’s AI SDK 6 transport types.
- Lint passes with nine warnings.
- BlockNote packages use caret ranges; presence authorization needs hardening.
- The seeded schema has no uncommitted changes.

Phase 0 records these issues without repairing product code.

## Setup and baseline

1. **Document the starting state**
   - Record the current commit, dirty-file inventory, installed versions, schema SHA-256, and check results.
   - Preserve existing changes, including the billing route, synchronization module, installed Clerk skills, and lockfiles.
   - Inspect staged contents for credentials and unintended generated files before committing.
   - Do not run seeds, migrations, deployments, or database writes.

2. **Generate the Graphify map**
   - Use installed Graphify `0.9.102`; current CLI behavior was checked against local help and Context7 documentation.
   - Add Graphify exclusions for dependencies, build output, secrets, generated Convex bindings, installed skill templates, and its own output.
   - Run `graphify extract . --code-only --no-cluster`, then `graphify cluster-only . --no-label`.
   - Commit `graphify-out/graph.json`, `GRAPH_REPORT.md`, and the interactive `graph.html`; ignore caches and machine-specific runtime files.
   - Confirm nonempty nodes and edges, representative frontend/backend symbols, valid source paths, and a working graph query. Record counts and regeneration commands.
   - Use local AST extraction without external LLM processing or installing hooks.

3. **Create Linear tracking**
   - Create **Blocks** in the existing **Dev / ATH** team, checking again for duplicates first.
   - Link the GitHub repository and add the constraints, phase workflow, milestones, and acceptance criteria.
   - Create detailed Phase 0 issues for baseline audit, Graphify, documentation, and commit/push.
   - Add the discovered defects to the appropriate future milestones; keep future phases unstarted.
   - Add project-specific setup instructions, the baseline report, and roadmap under `docs/`, and replace the starter README with actual project commands.

4. **Commit and publish**
   - Recheck that `convex/schema.ts` is byte-for-byte unchanged.
   - Commit the reviewed existing work and Phase 0 setup on `main`.
   - Fetch and verify the remote permits a normal fast-forward push. Do not force-push or overwrite divergent work.
   - Push to `origin/main`, record the resulting SHA in Linear, and confirm a clean working tree.
   - Phase 0 has no feature branch or PR, matching the approved direct-push exception.

## Linear roadmap and delivery rules

| Phase | Intended outcome |
|---|---|
| 0 | Graphify map, project tracking, documented and published baseline |
| 1 | Dependency compatibility, exact BlockNote pins, passing baseline checks, tenant authorization hardening |
| 2 | Organization switching, membership integration, recursive document navigation, search, trash/restore |
| 3 | Collaborative editor reliability, uploads, presence, and archived-document write protection |
| 4 | Organization billing entitlements and server-side usage enforcement |
| 5 | Server-side inline AI through OpenRouter |
| 6 | Workspace agent with `Agent<{ orgId: string }>` and tenant-scoped tools |
| 7 | End-to-end verification, accessibility, failure handling, and production readiness |

For Phase 1 onward, use `codex/phase-N-<slug>` branches from the approved baseline. Each phase gets a PR containing its changes, verification evidence, and exact manual test steps. Stop for review; merge only after explicit approval and obtain direction before starting the next phase.

Fetch relevant official documentation through Context7 before each implementation, and read bundled Next.js guides before Next.js changes. Preserve the seeded schema throughout; any feature that cannot fit it becomes a blocker to discuss, not an implicit migration.

## Verification and handoff

Phase 0 completion requires:

- **Schema:** unchanged hash and an empty schema diff against the original baseline.
- **Graph:** open `graphify-out/graph.html`, inspect editor and backend nodes, and run a documented query using a verified node.
- **Linear:** open the Blocks project and verify milestones, Phase 0 results, and linked defect issues.
- **Git:** `git status --short` is empty; local `HEAD` matches the published `origin/main`.
- **Checks:** record `pnpm lint`, `pnpm exec tsc --noEmit --incremental false`, and `pnpm build` outcomes. Existing failures remain explicitly documented rather than treated as passing.

The handoff will include the commit link, Linear link, map location, exact commands and expected results, and known failures. No application APIs, schema, dependency versions, or runtime behavior change in Phase 0.


---

<!-- Appended 2026-11-07: approved full build plan (Phases 1 to 7) -->

# Blocks: full build plan (Phases 1 to 7)

## Context

Blocks is a multi-tenant B2B Notion clone. A Clerk Organization is a workspace and a tenant. It runs on Next.js 16 (App Router), React 19, Convex, BlockNote, Clerk and Clerk Billing, `@convex-dev/agent`, `@convex-dev/presence`, shadcn/ui, and the AI SDK through OpenRouter.

**Phase 0 is done.** The baseline is on `main` and the tree is clean. Linear has the "Blocks" project with milestones Phase 0 to 7, and ATH-255 to ATH-258 are Done. The Graphify map is at `graphify-out/` (304 nodes).

### What exists (from the Graphify map)

- **Routes:**
  - `app/(dashboard)/layout.tsx`, which renders `AppSidebar`.
  - `page.tsx`, the home page with "Create a page".
  - `doc/[id]/page.tsx`, a client page with breadcrumbs, `DocPresence`, `PageChrome`, a dynamic `Editor`, and a placeholder `AgentChat`.
  - `billing/page.tsx`, which shows `<PricingTable for="organization">`.
  - `sign-in` and `sign-up`.
- **Convex:**
  - `documents.ts`: create, get, getChildren, getBreadcrumbs, rename, setIcon, toggleFavorite, listFavorites, archive (recursive BFS), restore (single document only), and listTrash.
  - `files.ts`: generateUploadUrl, getFileUrl, setCover.
  - `prosemirror.ts`: sync with `assertCanAccessDoc`.
  - `presence.ts`, `users.ts#current`, and `seed.ts` (an internal mutation).
  - Every org-scoped function goes through `getOrgContext()` (`lib/auth.ts:59`), which reads `orgId`/`o.id` from the Clerk JWT.
- **Gaps:**
  - There is no Clerk webhook (`convex/http.ts`). The `users`, `organizations`, and `memberships` tables are empty.
  - There is no org switcher and no search query, even though the `search_title` index and the ⌘K event exist.
  - There is no move or reparent operation.
  - `lib/entitlements.ts` is referenced in comments but missing.
  - `/api/ai` does not exist (ATH-263).
  - `AgentChat` is a stub (ATH-264).
  - `proxy.ts` uses the deprecated `createRouteMatcher`.

### Decisions already made

- Align everything on **AI SDK 6**. xl-ai 0.57 depends on `ai ^6`, and `@convex-dev/agent@0.6.4` is the newest version that peers on `ai ^6`.
- Pin all four BlockNote packages to exactly **0.57.0**.
- Remove the deprecated Clerk route matcher in favor of resource-based auth.

### Fixed constraints (all phases)

- `convex/schema.ts` stays byte-identical, with SHA-256 `4e4d2920…6788`.
  - Agent threads and messages live in the agent component's own tables.
  - Document content lives in prosemirror-sync's tables.
  - So no schema change is needed anywhere.
- Every query and mutation derives `orgId` through `getOrgContext`. None ever takes an org or user id from the client.
- Documents are soft-deleted only. Nothing ever calls `ctx.db.delete` on documents.
- No LLM call ever runs on the client. The OpenRouter key exists only as a Convex env var, `OPENROUTER_API_KEY`.
- No seeds, migrations, or deploys run without your approval.

## Workflow (every phase)

1. Branch `phase-N-<slug>` from the latest `main`. Update `docs/ROADMAP.md` from `codex/…` to this naming.
2. Move that milestone's Linear issues to In Progress, creating new ones as needed.
3. Before coding:
   - Fetch the current docs for every library touched, through Context7, for the exact pinned version.
   - Read `node_modules/next/dist/docs/` for Next.js APIs.
   - Read `convex/_generated/ai/guidelines.md` for Convex.
4. Navigate the code with Graphify (`graphify explain` / `query`). Run `graphify update .` at the end.
5. Run the gates: `pnpm lint` with zero warnings, `pnpm exec tsc --noEmit --incremental false`, `pnpm build`, and the schema hash.
6. Commit, push, and open a PR with the evidence and manual test steps. Then **stop**: summarize and give the test steps. I merge only after you approve, and the next phase starts only when you say so.

---

## Phase 1: Compatibility and authorization (`phase-1-compat-authz`)

Issues: ATH-259, ATH-260, ATH-261, ATH-262, and a new one, "Migrate off createRouteMatcher".

- **Dependencies** (exact pins):
  - `@blocknote/{core,react,mantine,xl-ai}@0.57.0`, `ai@6.0.324`, `@convex-dev/agent@0.6.4`, and `@openrouter/ai-sdk-provider@2.9.1`.
  - Add a pnpm override so the whole tree resolves to a single `ai@6.0.324`.
  - With that, `Editor.tsx:66` (`DefaultChatTransport`) type-checks, which fixes `tsc` and `build`.
- **Clerk**:
  - `proxy.ts` becomes a bare `clerkMiddleware()`, keeping the existing matcher.
  - Add `components/auth/RequireAuth.tsx`, an async server component that calls `await auth.protect()`. The `(dashboard)/layout.tsx` renders it inside `<Suspense>`, because `cacheComponents: true` is on.
  - Add `app/(dashboard)/loading.tsx`.
  - Add `components/auth/SignedOutRedirect.tsx`, which uses `<Show when="signed-out"><RedirectToSignIn/></Show>`.
  - Add `@clerk/eslint-plugin`, pinned exactly, with the rule `@clerk/next/require-auth-protection`. Protected: `app/(dashboard)/**`. Public: sign-in and sign-up.
- **Presence**:
  - `heartbeat` derives `{ orgId, subject }`. It uses `subject` as the user id, rejects a `roomId` whose org part is not the caller's org, and checks that the document belongs to the org.
  - Extract one shared helper, `lib/docAccess.ts#getOrgDoc`, from the duplicate `getOwnedDoc` and `assertCanAccessDoc`.
  - `list` requires an org identity. `disconnect` is unchanged, because the session token is the capability.
- **Lint**:
  - Ignore `.agents`, `.claude`, `.codex`, `graphify-out`, and `convex/_generated`.
  - Fix the warnings at `PageChrome.tsx:122`, `documents.ts:40`, and `users.ts:1-3`.
- **Test**:
  - All gates are green.
  - `pnpm why ai` shows one 6.x version.
  - Signed out, `/`, `/doc/x`, and `/billing` redirect to sign-in.
  - Two tabs sync and both show in the facepile.
  - A forged cross-org `heartbeat` is rejected.

## Phase 2: Organizations and navigation (`phase-2-orgs-navigation`)

- **Workspace switching**:
  - Add `<OrganizationSwitcher hidePersonal>` and `<UserButton>` to the sidebar header.
  - Signed-in users with no active org go to `/select-org`, which shows `<TaskChooseOrganization>` or `<OrganizationList hidePersonal>`. The Clerk session task "choose-organization" is enabled.
  - Switching orgs resets the Convex client queries, because the JWT changes.
- **Clerk webhook to Convex**:
  - Add `convex/http.ts` with route `POST /clerk-webhook`, verified with Svix through `verifyWebhook` (check the docs).
  - Upsert and delete `users`, `organizations`, and `memberships` through internal mutations in `convex/clerkSync.ts`.
  - Set the env var `CLERK_WEBHOOK_SIGNING_SECRET`.
  - This mirrors membership. Deleting an org or user deletes the mirror rows only; documents are never touched.
- **Membership check**: `getOrgContext` stays JWT-based, because the JWT is authoritative. Add an optional `requireMember(ctx)` that cross-checks the `memberships` mirror for sensitive mutations.
- **Recursive tree**:
  - Add `documents.move`, which reparents a document and rejects a move into its own subtree or across orgs.
  - Add drag and drop in `DocumentTree` and `DocumentItem` (test with dnd-kit or native DnD).
  - Folders versus pages: only folders and pages can hold children. Keep the existing semantics.
- **Search**: add a `documents.search` query on the `search_title` index, filtered by `orgId` with `isArchived: false`. Build a ⌘K command palette with shadcn `Command` that listens for `OPEN_SEARCH_EVENT`.
- **Trash**:
  - `restore` restores the subtree that was archived in the same operation, matched on `archivedAt`. That is possible because archive preserves earlier timestamps.
  - Add trash search and an "Archived" banner on the document page, with Restore.
  - There is still no hard delete. "Delete forever" is not offered.
- **Test**:
  - Create two orgs and switch between them. Each tree is isolated.
  - Webhook rows appear in the Convex dashboard.
  - Move a page under a folder. Moving a folder into its own child is rejected.
  - ⌘K finds pages and skips trashed ones.
  - Archiving a folder trashes the subtree, and restoring it restores the subtree.

## Phase 3: Collaborative editor reliability (`phase-3-editor`)

- **Archived documents are read-only**:
  - `prosemirror.ts` `checkWrite` rejects writes when `isArchived`.
  - `rename`, `setIcon`, and `setCover` reject archived documents.
  - The editor renders `editable={false}` with a banner.
- **Sync robustness**:
  - Seed the empty document once, guarding against a double `create` race in `Editor.tsx`.
  - Add a server-side `snapshotDebounceMs` and periodic snapshots per the prosemirror-sync docs.
  - Handle the not-found and access-denied states.
- **Title sync**: have the title live in the `documents` row, with an inline title editor in `PageChrome`, debounced.
- **Uploads**:
  - `generateUploadUrl` stays org-checked.
  - Validate MIME type and size in `files.ts`.
  - Serve images through `getFileUrl` only for documents in the caller's org.
  - Remove and replace the cover.
- **Presence polish**: add a facepile on the sidebar items currently open, show collaborator cursors (through BlockNote's collaboration cursor support, if prosemirror-sync supports it; otherwise only the facepile), and add idle timeout.
- **Test**:
  - Two browsers edit concurrently without loss.
  - A trashed document is read-only.
  - Uploading an oversized or wrong-type file is rejected.
  - The cover image is hidden from a different org, which gets null.

## Phase 4: Billing entitlements (`phase-4-billing`)

- **Plans in Clerk Billing**: these are B2B plans for organizations.
  - Free: no AI.
  - Pro: has `ai_enabled`, with 500 AI calls a month.
  - Business: has `ai_enabled`, with 5,000 calls a month.
  - I'll give you the exact Dashboard steps. I don't change Clerk config myself.
- **Server entitlement check**:
  - Add `lib/entitlements.ts#getEntitlements(ctx)`. It reads the plan and features from the Clerk session-token claims (`pla`/`fea`). Verify the claim names in the docs. If they aren't in the Convex JWT, fall back to a Convex action that calls the Clerk Backend API and caches the result.
  - Keep `PLAN_LIMITS` in code.
- **Quota**:
  - Add `convex/aiUsage.ts#consume` (internal). It does an atomic check-and-increment on `aiUsage` by `orgId` and `period` ("YYYY-MM") and throws `QuotaExceeded`.
  - Add the query `aiUsage.current` for the UI.
- **UI**:
  - Add an `<AiGate>` client component built on `has({ feature: "ai_enabled" })` from `useAuth`. This only affects the UI; the server is the real gate.
  - Add a usage meter on `/billing`, and an upgrade CTA where AI is locked.
  - Restrict `/billing` to org admins, through `auth.protect({ role: "org:admin" })`, for the manage action.
- **Billing webhooks** (optional): handle `subscription.*` events in `convex/http.ts` to invalidate the cached plan.
- **Test**: a Free org sees AI locked, and the server rejects it too. Upgrade a test org to Pro, and AI unlocks. Force the counter to the limit, and the next call is rejected.

## Phase 5: Inline AI through OpenRouter (`phase-5-inline-ai`)

Fixes ATH-263.

- **Endpoint**:
  - Add a Convex HTTP action, `POST /api/ai` in `convex/http.ts`. It is streaming, with CORS for the app origin.
  - It authenticates with the Clerk token sent by a custom `fetch` on the xl-ai `DefaultChatTransport`, using `headers: async () => ({ Authorization: Bearer <convex token> })`, and points at `NEXT_PUBLIC_CONVEX_SITE_URL`.
  - In order, it calls `getOrgContext`, then `getEntitlements`, then `aiUsage.consume`. Then it runs `streamText` with `createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })` and the xl-ai server helpers (the document-state injection and tool definitions from `@blocknote/xl-ai/server`; check the docs). It returns `toUIMessageStreamResponse()`.
  - Fallback if Convex HTTP streaming or CORS doesn't work with xl-ai: a Next Route Handler at `app/api/ai/route.ts` that does `await auth.protect()` and calls a Convex action through `fetchAction` with the user's token. The key still stays server-side.
- **Model**: an env var `OPENROUTER_MODEL`, for example `anthropic/claude-sonnet-...`. It is configurable and not hard-coded.
- **Editor**: render the AI menu and toolbar button only inside `<AiGate>`. Show errors (quota, entitlement) as toasts.
- **Test**:
  - Select text, then AI, then "Improve writing". The stream arrives, and you can accept or reject it.
  - A Free org gets a 403.
  - In the network tab, no OpenRouter key and no request to openrouter.ai come from the browser.
  - The usage counter increments.

## Phase 6: Workspace agent (`phase-6-agent`)

Fixes ATH-264.

- **Agent**: `convex/agent.ts` defines `new Agent<{ orgId: string }>(components.agent, { name: "Blocks Assistant", languageModel: openrouter(OPENROUTER_MODEL), instructions, tools })`, with the API checked against the agent 0.6.4 docs.
- **Tools**: every tool is built with `createTool`, and each reads `ctx.orgId`. None takes `orgId` as an argument.
  - `searchDocuments`: title search, plus content search through prosemirror snapshot text.
  - `readDocument`: returns the snapshot as markdown or plain text, reusing `snapshotToText` in `prosemirror.ts`.
  - `listChildren`.
  - `createPage`: takes a title, a parent, and initial content written through the prosemirror-sync server-side create.
  - `appendToDocument`: uses a server-side transform, if prosemirror-sync supports it.
  - `archiveDocument`: a soft delete only.
- **Threads**:
  - Add `convex/agentChat.ts`. The `createThread`, `sendMessage`, `listThreads`, and `listMessages` functions are each org-scoped: threads are keyed with `userId: subject`, and their metadata or title carries `orgId`. Every read re-checks that a thread belongs to the caller's org and user.
  - `sendMessage` is a mutation that saves the message and schedules an internal action, which streams with `saveStreamDeltas`.
  - Quota goes through `aiUsage.consume`.
- **UI**:
  - `AgentChat.tsx` becomes a docked side panel, built from shadcn `Sheet`, `ScrollArea`, and `Textarea`.
  - It uses `useThreadMessages` and `useUIMessages` with streaming, plus a thread list, all inside `<AiGate>`.
  - Tool results render as document links.
- **Test**:
  - Ask "Summarize my Roadmap page" and get a cited answer.
  - Ask it to "Create a page called X under Projects", and the page appears in the sidebar in real time.
  - In org B, the agent cannot see org A's documents, and that is tested with forged IDs.
  - Free orgs are blocked.

## Phase 7: Production readiness (`phase-7-hardening`)

- **Tests**:
  - Add `convex-test` and Vitest suites for tenancy. For every public function, check that a cross-org caller is refused and that no hard delete exists.
  - Cover presence, quota, and the agent tool scoping.
  - Add Playwright end-to-end tests with `@clerk/testing`: sign in, create an org, write, collaborate, trash and restore, and the AI gating.
- **Accessibility**: an impeccable audit of keyboard navigation in the tree and ⌘K, focus management, ARIA on the tree items, contrast, and reduced motion.
- **Failure handling**: error boundaries (`error.tsx`, `not-found.tsx`), offline and reconnect states, toast messages for Convex errors, and rate limiting on AI (`@convex-dev/rate-limiter`, if you approve it).
- **Ops**:
  - Add an env var checklist.
  - Add a `convex deploy` and Vercel guide in `docs/DEPLOY.md`.
  - Run a security review with the `convex-authz` and `convex-reviewer` audits.
  - Run a final Graphify rebuild, and update the README.
- **Test**: the full test suite is green, Lighthouse accessibility is at least 95, and a run through the manual checklist.

## Verification gates (every PR)

```
pnpm lint                                   # 0 errors, 0 warnings
pnpm exec tsc --noEmit --incremental false  # exit 0
pnpm build                                  # exit 0
shasum -a 256 convex/schema.ts              # 4e4d292002bc14028cb4ca922905d5923554c651f92ee201af0f3b0c37ab6788
pnpm why ai                                 # single 6.x (from Phase 1 on)
```

Each PR also lists its phase's manual test steps, as above.
