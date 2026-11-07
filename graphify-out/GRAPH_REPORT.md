# Graph Report - Blocks  (2026-11-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 304 nodes · 601 edges · 15 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73f62041`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14

## God Nodes (most connected - your core abstractions)
1. `convex` - 21 edges
2. `getOrgContext()` - 19 edges
3. `Button()` - 17 edges
4. `compilerOptions` - 16 edges
5. `react` - 15 edges
6. `DocumentItem()` - 13 edges
7. `compilerOptions` - 13 edges
8. `lucide-react` - 12 edges
9. `next` - 11 edges
10. `TrashView()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `DashboardLayout()` --calls--> `AppSidebar()`  [EXTRACTED]
  app/(dashboard)/layout.tsx → components/sidebar/AppSidebar.tsx
- `Home()` --calls--> `Button()`  [EXTRACTED]
  app/(dashboard)/page.tsx → components/ui/button.tsx
- `getChildren` --calls--> `getOrgContext()`  [EXTRACTED]
  convex/documents.ts → lib/auth.ts
- `get` --calls--> `getOrgContext()`  [EXTRACTED]
  convex/documents.ts → lib/auth.ts
- `listTrash` --calls--> `getOrgContext()`  [EXTRACTED]
  convex/documents.ts → lib/auth.ts

## Import Cycles
- None detected.

## Communities (15 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (33): DashboardLayout(), instant, Home(), Crumb, AppSidebar(), OPEN_SEARCH_EVENT, openSearch(), DocumentTree() (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (38): archive, create, documentValidator, get, getBreadcrumbs, getChildren, getOwnedDoc(), listFavorites (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (21): DocumentPage(), Editor, AgentChat(), Breadcrumbs(), Editor(), EditorSkeleton(), EMOJI_CHOICES, PageChrome() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (11): metadata, geistMono, geistSans, metadata, RootLayout(), convex, ConvexClientProvider(), @clerk/nextjs@^7.9.17 (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (21): dependencies, @base-ui/react@^1.9.0, @blocknote/core@^0.56.0, @blocknote/mantine@^0.56.0, @blocknote/react@^0.56.0, class-variance-authority@^0.7.1, @clerk/backend@^3.26.4, cn@^0.5.0 (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (7): DocumentItem(), DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuSeparator(), DropdownMenuSubContent(), DropdownMenuTrigger()

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (16): devDependencies, tailwindcss@^4, @tailwindcss/turbopack@^4, @types/node@^20, @types/react@^19, @types/react-dom@^19, typescript@^5, name (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (7): app, @convex-dev/agent@^0.7.9, @convex-dev/presence@^0.4.0, @convex-dev/prosemirror-sync@^0.2.7, @convex-dev/agent, @convex-dev/presence, @convex-dev/prosemirror-sync

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.2, eslint, eslint-config-next

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (6): scripts, backend, build, frontend, lint, start

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (4): ai@^7.0.157, tw-animate-css@^1.4.0, ai, tw-animate-css

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, unrs-resolver

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `convex` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11380471380471381 - nodes in this community are weakly interconnected._
- **Why does `@clerk/nextjs` connect `Community 4` to `Community 8`, `Community 2`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06734006734006734 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 0` to `Community 2`, `Community 4`, `Community 5`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11363636363636363 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._