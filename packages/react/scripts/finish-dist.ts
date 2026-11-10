// Runs after vite and tsc have written dist.
//
// - tsc keeps `@workspace/react/...` and extensionless relative paths in the .d.ts
//   files. A project that installs the package resolves neither, so each one
//   becomes a relative path that ends in .js. Side-effect CSS imports leave the
//   .d.ts files, because Vite extracts that CSS into the package stylesheet.
// - src/styles is copied to dist/styles, and dist/styles/globals.css imports
//   the stylesheet Vite extracted from the CSS Modules, so one import of the
//   package stylesheet brings the component styles.
// - SVG files that modules load with new URL(..., import.meta.url) are copied
//   to the same path in dist.
//
//   node scripts/finish-dist.ts

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sourceFiles, SRC } from "./source-files.ts";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const ALIAS_PREFIX = "@workspace/react/";
const SPECIFIER = /(?<lead>\bfrom |\bimport\(|\bimport )"(?<target>[^"]+)"/gu;
const STYLE_IMPORT = /^import "[^"]+\.css";\n/gmu;
const LEADING_IMPORTS = /^(?:@import\s+[^;]+;\s*)+/u;

const filesWithExtension = (root: string, extension: string): string[] =>
  readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name))
    );

const declarationSpecifier = (
  folder: string,
  target: string
): string | null => {
  const isAlias = target.startsWith(ALIAS_PREFIX);

  if (!isAlias && !target.startsWith(".")) {
    return null;
  }

  const absolute = isAlias
    ? path.join(DIST, target.slice(ALIAS_PREFIX.length))
    : path.resolve(folder, target);

  const base = absolute.replace(/\.js$/u, "");

  const declarationPath = existsSync(`${base}.d.ts`)
    ? base
    : path.join(base, "index");

  if (!existsSync(`${declarationPath}.d.ts`)) {
    throw new Error(
      `Declaration output is missing for "${target}" in ${folder}`
    );
  }

  const relative = path.relative(folder, declarationPath);

  return `${relative.startsWith(".") ? relative : `./${relative}`}.js`;
};

for (const file of sourceFiles.filter((source) => source.endsWith(".d.ts"))) {
  mkdirSync(path.dirname(path.join(DIST, file)), { recursive: true });
  cpSync(path.join(SRC, file), path.join(DIST, file));
}

for (const file of filesWithExtension(DIST, ".d.ts")) {
  const absolute = path.join(DIST, file);
  const folder = path.dirname(absolute);

  const text = readFileSync(absolute, "utf-8")
    .replaceAll(STYLE_IMPORT, "")
    .replaceAll(SPECIFIER, (match, lead: string, target: string) => {
      const specifier = declarationSpecifier(folder, target);

      return specifier === null ? match : `${lead}"${specifier}"`;
    });

  writeFileSync(absolute, text);
}

cpSync(path.join(SRC, "styles"), path.join(DIST, "styles"), {
  recursive: true,
});

const extracted = readdirSync(DIST, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
  .map((entry) => entry.name);

if (extracted.length !== 1) {
  throw new Error(
    `The build needs exactly one output stylesheet, but produced ${extracted.length}`
  );
}

const globals = path.join(DIST, "styles", "globals.css");
const globalsText = readFileSync(globals, "utf-8");
const imports = LEADING_IMPORTS.exec(globalsText)?.[0] ?? "";

const extractedImport = `@import "${path.relative(
  path.dirname(globals),
  path.join(DIST, extracted[0] ?? "")
)}";\n`;

writeFileSync(
  globals,
  `${imports}${extractedImport}${globalsText.slice(imports.length)}`
);

for (const file of sourceFiles.filter(
  (source) => source.endsWith(".svg") || source.endsWith(".license")
)) {
  mkdirSync(path.dirname(path.join(DIST, file)), { recursive: true });
  cpSync(path.join(SRC, file), path.join(DIST, file));
}
