import { defineApp } from "convex/server";
import prosemirrorSync from "@convex-dev/prosemirror-sync/convex.config";
import agent from "@convex-dev/agent/convex.config";
import presence from "@convex-dev/presence/convex.config";

// Registers the Convex components used by the app. After `npx convex dev`,
// these are reachable via the generated `components.*` object:
//   components.prosemirrorSync — collaborative document content (Phase 3)
//   components.agent           — workspace agent + threads/usage (Phase 6)
//   components.presence        — per-doc live presence facepile (Phase 8)
const app = defineApp();
app.use(prosemirrorSync);
app.use(agent);
app.use(presence);

export default app;