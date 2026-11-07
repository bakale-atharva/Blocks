# Phase 0 baseline

This file records the repository as it stood at the start of Phase 0 (2026-11-07). Phase 0 does not change product code, the schema, dependency versions, or runtime behavior. Every failure below is recorded and left in place, and each one is tracked in Linear.

Linear project: [Blocks](https://linear.app/atharva-bakale-industries/project/blocks-1de76af79ade)

## Starting point

- **Starting commit:** `73f6204166140ae5ad138a8d85dd73d090991ac2` (`feat: setup convex presence, users query, and update document page`).
- **Branch:** `main`, tracking `origin/main` at `https://github.com/bakale-atharva/Blocks`.

### Uncommitted work preserved in the baseline commit

| Status | Path | What it is |
|---|---|---|
| M | `.gitignore` | Graphify output rules and installed-skill binaries |
| M | `AGENTS.md` | Next.js and Convex agent rules |
| M | `app/(dashboard)/doc/[id]/page.tsx` | Document page wiring |
| M | `app/globals.css` | Style tweak |
| M | `components/editor/Editor.tsx` | Sync, uploads, and inline AI extension |
| M | `components/editor/PageChrome.tsx` | Title, icon, and cover chrome |
| M | `convex/_generated/api.d.ts` | Generated bindings for `prosemirror` |
| M | `convex/documents.ts` | Document queries and mutations |
| M | `convex/files.ts` | Upload URL and file storage |
| M | `package.json`, `pnpm-lock.yaml` | Added BlockNote, AI SDK, and Convex components |
| ?? | `app/(dashboard)/billing/` | Organization pricing page |
| ?? | `convex/prosemirror.ts` | Collaborative sync with org-scoped access checks |
| ?? | `convex/_generated/ai/` | Convex AI guidelines |
| ?? | `.claude/`, `skills-lock.json` | Installed Clerk, Convex, and Impeccable skills and agents. `.agents/` and `.codex/` were committed in `f02fbfa` and untracked in the next commit; they are now local only |
| ?? | `CLAUDE.md`, `.graphifyignore` | Agent instructions and Graphify exclusions |

### Excluded from version control

- **`.env.local`** (secrets) is excluded by `.env*`.
- **`.claude/settings.local.json`** is excluded by the global git ignore.
- **`.impeccable/config.local.json`** is excluded by `.git/info/exclude`.
- **`.agents/` and `.codex/`** hold local agent tooling: installed skills and Codex hooks. Reinstall them from `skills-lock.json`.
- **`/.claude/skills/*/scripts/bin/`** holds the darwin-arm64 Impeccable binary, 17.7 MB. It is machine-specific. If it is missing, the Impeccable hooks skip themselves instead of failing.
- **`graphify-out/`** is excluded entirely. Each machine regenerates the map locally.

Before committing, the staged contents were scanned for Stripe, Clerk, AWS, GitHub, OpenRouter, Anthropic, and Convex deploy-key patterns, and for private keys. The scan found none.

## Installed versions

| Tool / package | Version |
|---|---|
| Node | 24.21.0 |
| pnpm | 12.11.2 |
| TypeScript | 5.9.3 |
| next | 16.4.2 |
| react / react-dom | 19.3.0 |
| convex | 1.47.0 |
| @clerk/nextjs | 7.9.17 |
| @blocknote/core, mantine, react, xl-ai | 0.56.0, declared as caret ranges |
| ai | 7.0.157; xl-ai brings in its own ai 6.0.319 |
| @convex-dev/agent | 0.7.9 |
| @convex-dev/presence | 0.4.0 |
| @convex-dev/prosemirror-sync | 0.2.7 |
| graphify | 0.9.102 |

## Schema

`convex/schema.ts` must stay byte-for-byte unchanged in every phase.

```
SHA-256  4e4d292002bc14028cb4ca922905d5923554c651f92ee201af0f3b0c37ab6788  convex/schema.ts
```

To verify the schema, run these commands. The first should print the hash above, and the second should print nothing.

```bash
shasum -a 256 convex/schema.ts
```

```bash
git diff 73f6204 -- convex/schema.ts
```

No seeds, migrations, deployments, or database writes were run during Phase 0.

## Check results

| Command | Result | Tracked in |
|---|---|---|
| `pnpm lint` | ✅ exit 0. 0 errors, 197 warnings | ATH-262 |
| `pnpm exec tsc --noEmit --incremental false` | ❌ exit 2. 1 error | ATH-259 |
| `pnpm build` | ❌ exit 1. Compiles, then fails type checking on the same error | ATH-259 |

**Lint warnings**

- 188 are in the bundled skill scripts under `.agents/` and `.claude/`, because ESLint does not ignore those directories.
- 4 are unused eslint-disable directives in `convex/_generated/`.
- 5 are in app source:
  - `PageChrome.tsx:122`
  - `documents.ts:40`
  - `users.ts:1-3` (three warnings)

**Type error.** The error is at `components/editor/Editor.tsx(67,11)`, TS2322. The `DefaultChatTransport` from AI SDK 7 is not assignable to the `ChatTransport` type that `@blocknote/xl-ai` expects, because xl-ai is typed against AI SDK 6. The mismatch is `SharedV4ProviderMetadata` versus `SharedV3ProviderMetadata`.

## What exists today

- **Editor:** the BlockNote editor syncs collaboratively through `@convex-dev/prosemirror-sync`. Server-side `checkRead` and `checkWrite` checks are scoped to the org.
- **Uploads:** files go to Convex File Storage.
- **Navigation:** the sidebar shows a recursive document tree, favorites, search, and trash with restore.
- **Presence:** a facepile shows who is in the document, through `@convex-dev/presence`.
- **Billing:** an organization pricing page exists at `/billing`.

## Known defects

All are tracked in Linear, and none are fixed in Phase 0. This table is a historical record. ATH-259 to ATH-262 were resolved in Phase 1 on the `phase-1-compat-authz` branch, along with ATH-265, which migrates off the deprecated Clerk route matcher.

| Issue | Milestone | Defect |
|---|---|---|
| ATH-259 | Phase 1 | `tsc` and `build` fail because AI SDK 7 conflicts with xl-ai's AI SDK 6 types |
| ATH-260 | Phase 1 | BlockNote packages use caret ranges, not exact pins |
| ATH-261 | Phase 1 | Presence `heartbeat` trusts the client's `roomId` and `userId`, and `list` has no auth check |
| ATH-262 | Phase 1 | 197 lint warnings, and ESLint scans the skill templates |
| ATH-263 | Phase 5 | Inline AI posts to `/api/ai`, which does not exist |
| ATH-264 | Phase 6 | `AgentChat` is a placeholder |

## Graphify map

The map is at `graphify-out/`, which is gitignored, so regenerate it with the commands below. It was built locally from the AST, with no LLM processing and no hooks installed.

- **Size:** 304 nodes, 601 edges, 15 communities, built from 46 code files.
- **Outputs:** `graph.json`, `GRAPH_REPORT.md`, and `graph.html`, which is the interactive view. These were committed in `f02fbfa` and are now local only.
- **Path check:** every node `source_file` resolves to a file in the repo, and no absolute machine paths appear.
- **Representative nodes:**
  - `components_editor_editor_editor`, which is `Editor()`
  - `components_editor_pagechrome_pagechrome`, which is `PageChrome()`
  - `convex_files_generateuploadurl`
  - `heartbeat` in `convex/presence.ts`
  - `getOrgContext()`, the most-connected backend helper

To regenerate the map:

```bash
graphify extract . --code-only --no-cluster
```

```bash
graphify cluster-only . --no-label
```

To query it, run either of these. `explain` shows `Editor()`, its file and line, and its edges: it calls `createUploadFile()` and `EditorSkeleton()`. `query` walks outward from the editor file.

```bash
graphify explain "components_editor_editor_editor"
```

```bash
graphify query "how does the editor upload files to convex" --seed components/editor/Editor.tsx
```
