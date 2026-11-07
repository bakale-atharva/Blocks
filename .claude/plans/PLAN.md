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
