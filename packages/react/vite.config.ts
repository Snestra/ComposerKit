import { defineConfig } from "vite";
import type { Plugin } from "vite";

import manifest from "./package.json" with { type: "json" };
import { isModuleFile, sourceFiles, SRC } from "./scripts/source-files.ts";

// Builds the npm package. Each TS or TSX file under src becomes its own
// module in dist at the same path, so `@workspace/react/components/ui/button` in
// the workspace is `composerkit/components/ui/button` from npm.
const entries = sourceFiles.filter(isModuleFile);

const external = [
  ...Object.keys(manifest.dependencies),
  "react",
  "react-dom",
  "next",
];

const isExternal = (id: string): boolean =>
  external.some((name) => id === name || id.startsWith(`${name}/`));

// A module that imports React, Base UI, lucide, next/navigation or next-themes
// must load on the client in React Server Components frameworks such as
// Next.js, so it starts with "use client". Plain logic ships without it, so a
// server component can call it.
const CLIENT_PACKAGES = [
  "react",
  "react-dom",
  "@base-ui/react",
  "lucide-react",
  "next/navigation",
  "next-themes",
];

const usesClientPackage = (imports: string[]): boolean =>
  imports.some((id) =>
    CLIENT_PACKAGES.some((name) => id === name || id.startsWith(`${name}/`))
  );

// Vite turns `new URL("x.svg", import.meta.url)` into an inlined data URL.
// The package keeps the call as written and ships the SVG beside the module,
// so the first plugin hides `import.meta.url` from Vite's matcher and the
// second one restores it in the output. A URL that names a TS source, such
// as the diff syntax worker, points at the emitted .js module instead.
const ASSET_URL =
  /(?<prefix>new\s+URL\s*\(\s*(?:"[^"]+"|'[^']+')\s*,\s*)import\.meta\.url/gu;

const HIDDEN_URL = "__COMPOSERKIT_META_URL__";

const SOURCE_URL =
  /(?<source>new\s+URL\s*\(\s*"[^"]+)\.tsx?"(?<separator>\s*,\s*)__COMPOSERKIT_META_URL__/gu;

const keepAssetUrls = (): Plugin[] => [
  {
    enforce: "pre",
    name: "composerkit:hide-asset-urls",
    transform: (code) =>
      code.includes("import.meta.url")
        ? code.replaceAll(ASSET_URL, `$<prefix>${HIDDEN_URL}`)
        : null,
  },
  {
    name: "composerkit:restore-asset-urls",
    renderChunk: (code) =>
      code
        .replaceAll(SOURCE_URL, `$<source>.js"$<separator>${HIDDEN_URL}`)
        .replaceAll(HIDDEN_URL, "import.meta.url"),
  },
  {
    name: "composerkit:use-client",
    renderChunk: (code, chunk) =>
      usesClientPackage(chunk.imports) && !code.startsWith('"use client"')
        ? `"use client";\n${code}`
        : null,
  },
];

export default defineConfig({
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    lib: {
      entry: Object.fromEntries(
        entries.map((file) => [file.replace(/\.tsx?$/u, ""), `${SRC}/${file}`])
      ),
      formats: ["es"],
    },
    minify: false,
    outDir: "dist",
    rolldownOptions: {
      external: isExternal,
      onLog: (level, log, defaultHandler) => {
        if (log.code !== "MODULE_LEVEL_DIRECTIVE") {
          defaultHandler(level, log);
        }
      },
      output: {
        entryFileNames: "[name].js",
        preserveModules: true,
        preserveModulesRoot: SRC,
      },
    },
  },
  plugins: keepAssetUrls(),
  resolve: {
    alias: [{ find: /^@workspace\/react\//u, replacement: `${SRC}/` }],
  },
});
