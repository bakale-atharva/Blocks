# Blocks

Blocks is a multi-tenant block editor. Each Clerk organization gets its own workspace of nested documents. Documents are edited collaboratively with presence, file uploads, and trash and restore, plus organization billing and AI features that are planned.

## Stack

- **Framework:** Next.js 16 (App Router) and React 19.
- **Backend:** Convex for the database, functions, and file storage. It uses these Convex components:
  - `prosemirror-sync`
  - `presence`
  - `agent`
- **Auth:** Clerk, with Organizations enabled.
- **Editor:** BlockNote 0.56, with the `xl-ai` extension.
- **UI:** Tailwind CSS 4 and shadcn/base-ui.

## Quick start

```bash
pnpm install
```

```bash
pnpm backend
```

```bash
pnpm frontend
```

`pnpm backend` runs `convex dev`. `pnpm frontend` runs `next dev` at http://localhost:3000. The required environment variables are listed in [docs/SETUP.md](docs/SETUP.md).

## Scripts

| Script | Runs |
|---|---|
| `pnpm frontend` | `next dev` |
| `pnpm backend` | `convex dev` |
| `pnpm build` | `next build` |
| `pnpm start` | `next start` |
| `pnpm lint` | `eslint` |

To type check, run:

```bash
pnpm exec tsc --noEmit --incremental false
```

## Layout

| Path | Contents |
|---|---|
| `app/` | Routes: dashboard, documents at `doc/[id]`, billing, sign-in, and sign-up |
| `components/` | The editor, sidebar, presence, providers, and UI primitives |
| `convex/` | Schema (fixed), documents, files, presence, ProseMirror sync, and users |
| `lib/` | Org auth context (`getOrgContext`), upload helper, and utilities |
| `graphify-out/` | Code map, generated locally and gitignored. See [docs/SETUP.md](docs/SETUP.md) |
| `docs/` | Setup, baseline audit, and roadmap |

## Docs

- [docs/SETUP.md](docs/SETUP.md) covers prerequisites, environment, and running locally.
- [docs/BASELINE.md](docs/BASELINE.md) covers the Phase 0 audit, check results, and known defects.
- [docs/ROADMAP.md](docs/ROADMAP.md) covers the phases and delivery rules.

## Status

The Phase 0 baseline is published. Known failures, including the `tsc` and `build` type conflict, are documented in `docs/BASELINE.md` and tracked in the Linear project [Blocks](https://linear.app/atharva-bakale-industries/project/blocks-1de76af79ade).
