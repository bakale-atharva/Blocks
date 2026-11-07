# Roadmap

The roadmap is tracked in the Linear project [Blocks](https://linear.app/atharva-bakale-industries/project/blocks-1de76af79ade), in the Dev / ATH team.

| Phase | Outcome | Known defects |
|---|---|---|
| 0 | Graphify map, project tracking, and a documented, published baseline | — |
| 1 | Compatible dependencies, exact BlockNote pins, passing baseline checks, hardened tenant authorization | ATH-259, ATH-260, ATH-261, ATH-262 |
| 2 | Organization switching, membership integration, recursive document navigation, search, trash and restore | — |
| 3 | Reliable collaborative editing, uploads, presence, and write protection for archived documents | — |
| 4 | Organization billing entitlements and server-side usage enforcement | — |
| 5 | Server-side inline AI through OpenRouter | ATH-263 |
| 6 | Workspace agent built on `Agent<{ orgId: string }>`, with tenant-scoped tools | ATH-264 |
| 7 | End-to-end verification, accessibility, failure handling, and production readiness | — |

## Delivery rules

- **Phase 0** is committed and pushed directly to `main`. This is an approved exception.
- **Phase 1 onward**, each phase gets a `codex/phase-N-<slug>` branch cut from the approved baseline, and one PR.
  - The PR contains the phase's changes, verification evidence, and exact manual test steps.
- **After each PR**, work stops for review.
  - A PR merges only after explicit approval.
  - The next phase starts only when directed.
- **Before each implementation**, fetch the relevant official docs through Context7.
  - Before any Next.js change, read the bundled guides in `node_modules/next/dist/docs/`.
- **The schema is fixed.** `convex/schema.ts` stays byte-for-byte unchanged; see the hash in `BASELINE.md`.
  - A feature that cannot fit the schema is a blocker to discuss, never an implicit migration.
- **Tenancy is enforced on the server.** Convex functions derive the caller's org with `getOrgContext`. They never trust an org or user id from the client.
- **Data changes need explicit approval.** This covers seeds, migrations, deployments, and production database writes.

## Checks every phase must report

```bash
pnpm lint
```

```bash
pnpm exec tsc --noEmit --incremental false
```

```bash
pnpm build
```

```bash
shasum -a 256 convex/schema.ts
```

A check that still fails must be documented with its cause, never reported as passing.
