import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import clerkNext from "@clerk/eslint-plugin/next";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Flags server resources (pages, layouts, route handlers, Server Functions)
    // that lack an auth check. This replaces the deprecated createRouteMatcher
    // gate in proxy.ts. The rule is experimental, so the plugin is pinned.
    plugins: { "@clerk/next": clerkNext },
    rules: {
      "@clerk/next/require-auth-protection": [
        "error",
        {
          protected: ["app/**"],
          public: ["app/sign-in/**", "app/sign-up/**"],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated code and local agent tooling (not app source):
    "convex/_generated/**",
    "graphify-out/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
  ]),
]);

export default eslintConfig;
