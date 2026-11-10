import { defineConfig } from "oxfmt";
import type { SortTailwindcssConfig, SortTailwindcssUserConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Ultracite types its Tailwind setting as `boolean | options`. Keep its options when present.
const isTailwindOptions = (
  value: SortTailwindcssUserConfig | undefined
): value is SortTailwindcssConfig => typeof value === "object";

const ultraciteTailwind = isTailwindOptions(ultracite.sortTailwindcss)
  ? ultracite.sortTailwindcss
  : {};

export default defineConfig({
  ...ultracite,
  // apps/docs is a Fumadocs app with its own formatting. The component gallery
  // inside it, app/(gallery) and its components, follows this repo's style.
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "apps/docs/*.{json,md,mjs,ts}",
    "apps/docs/app/(docs)/**",
    "apps/docs/components/component-preview.tsx",
    "apps/docs/components/mdx.tsx",
    "apps/docs/content/**",
    "apps/docs/lib/**",
    "packages/composerkit/src/components/diff/syntax-refractor.js",
  ],
  sortTailwindcss: {
    ...ultraciteTailwind,
    // Point the class sorter at our theme so custom tokens sort like built-in ones.
    stylesheet: "./packages/composerkit/src/styles/globals.css",
  },
});
