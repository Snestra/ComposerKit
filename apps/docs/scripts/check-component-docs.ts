import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  componentPages,
  docsRoot,
  loadComponentPage,
  packageImportSource,
  registrySourcePaths,
  repositoryRoot,
} from "../components/component-docs-data.ts";
import type { LoadedComponentPage } from "../components/component-docs-data.ts";
import meta from "../content/docs/components/meta.json" with { type: "json" };
import registry from "../registry.json" with { type: "json" };

const run = promisify(execFile);
const pagesRoot = path.join(docsRoot, "content/docs/components");
const componentsRoot = path.join(
  repositoryRoot,
  "packages/react/src/components"
);
const failures = new Map<string, string[]>();

const fail = (name: string, reason: string) => {
  failures.set(name, [...(failures.get(name) ?? []), reason]);
};

const typecheckSnippets = async (
  pages: LoadedComponentPage[]
): Promise<string | null> => {
  const temporaryRoot = await mkdtemp(path.join(docsRoot, ".component-docs-"));
  const examplesRoot = path.join(temporaryRoot, "examples");
  const importsRoot = path.join(temporaryRoot, "imports");
  await Promise.all([mkdir(examplesRoot), mkdir(importsRoot)]);
  const demos = new Map(
    pages.flatMap((page) => page.demos.map((demo) => [demo.path, demo]))
  );
  const files = [path.join(docsRoot, "next-env.d.ts")];

  try {
    for (const page of pages) {
      const importFile = path.join(importsRoot, `${page.name}.tsx`);
      await writeFile(importFile, packageImportSource(page));
      files.push(importFile);
    }

    const queue = [...demos.values()];
    const copied = new Set<string>();
    while (queue.length > 0) {
      const demo = queue.shift();
      if (!demo || copied.has(demo.path)) continue;
      copied.add(demo.path);
      const destination = path.join(examplesRoot, demo.name);
      await writeFile(destination, demo.source);
      files.push(destination);

      const relativeImports = demo.source.matchAll(
        /from\s+["'](\.[^"']+)["']/gu
      );
      for (const match of relativeImports) {
        const importPath = path.resolve(path.dirname(demo.path), match[1]);
        const importFile = `${importPath}.ts`;
        const source = await readFile(importFile, "utf8");
        queue.push({
          name: path.basename(importFile),
          path: importFile,
          source,
        });
      }
    }

    const configPath = path.join(temporaryRoot, "tsconfig.json");
    await writeFile(
      configPath,
      JSON.stringify({
        compilerOptions: {
          allowImportingTsExtensions: true,
          allowJs: true,
          baseUrl: docsRoot,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          jsx: "react-jsx",
          lib: ["dom", "dom.iterable", "esnext"],
          module: "esnext",
          moduleResolution: "bundler",
          noEmit: true,
          paths: {
            "@/*": ["./*"],
            "@workspace/react/*": ["../../packages/react/src/*"],
            "composerkit/*": ["../../packages/react/src/*"],
          },
          resolveJsonModule: true,
          skipLibCheck: true,
          strict: true,
          target: "ESNext",
        },
        files,
      })
    );

    try {
      await run("pnpm", ["exec", "tsc", "-p", configPath], {
        cwd: docsRoot,
        maxBuffer: 10 * 1024 * 1024,
      });
      return null;
    } catch (error) {
      if (error instanceof Error && "stdout" in error && "stderr" in error) {
        return `${String(error.stdout)}${String(error.stderr)}`;
      }
      throw error;
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
};

const componentDocSource = await readFile(
  path.join(docsRoot, "components/component-doc.tsx"),
  "utf8"
);
const requiredComponentMarkers = [
  'id="install"',
  'id="demo-code"',
  'id="props"',
  "AutoTypeTable",
  "registryCommand(registryOrigin, item)",
];
const missingMarkers = requiredComponentMarkers.filter(
  (marker) => !componentDocSource.includes(marker)
);
const loadedPages: LoadedComponentPage[] = [];
const expectedPages = new Set(meta.pages);

for (const name of Object.keys(componentPages)) {
  if (!expectedPages.has(name)) fail(name, "missing from meta.json");
}
for (const name of meta.pages) {
  if (!(name in componentPages)) {
    fail(name, "missing from the component page registry");
    continue;
  }

  try {
    const mdx = await readFile(path.join(pagesRoot, `${name}.mdx`), "utf8");
    if (!mdx.includes(`<ComponentDoc name="${name}" />`)) {
      fail(name, "missing ComponentDoc");
    }
    if (missingMarkers.length > 0) {
      fail(name, `ComponentDoc missing ${missingMarkers.join(", ")}`);
    }

    const page = await loadComponentPage(name);
    if (page.registryItems.length === 0) fail(name, "missing install command");
    if (page.demos.length === 0) fail(name, "missing demo source");
    if (page.props.length === 0) fail(name, "missing generated props table");
    loadedPages.push(page);
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

const coveredItems = new Set(loadedPages.flatMap((page) => page.registryItems));
for (const item of registry.items) {
  const hasComponent = (item.files ?? []).some((file) =>
    file.path.endsWith(".tsx")
  );
  if (hasComponent && !coveredItems.has(item.name))
    fail(item.name, "no component page");
}

const coveredSources = new Set(
  [...coveredItems].flatMap((item) => registrySourcePaths(item))
);
const componentFolders = await readdir(componentsRoot, { withFileTypes: true });
for (const folder of componentFolders) {
  if (!folder.isDirectory()) continue;
  const folderPrefix = `${path.join(componentsRoot, folder.name)}${path.sep}`;
  const folderFiles = await readdir(path.join(componentsRoot, folder.name), {
    recursive: true,
  });
  if (!folderFiles.some((file) => file.endsWith(".tsx"))) continue;
  const covered = [...coveredSources].some((source) =>
    source.startsWith(folderPrefix)
  );
  if (!covered) fail(folder.name, "no page covers this component folder");
}

const typecheckOutput = await typecheckSnippets(loadedPages);
if (typecheckOutput !== null) {
  console.error(typecheckOutput);
  for (const page of loadedPages)
    fail(page.name, "shown TypeScript failed tsc");
}

let passes = 0;
const names = new Set([...meta.pages, ...failures.keys()]);
for (const name of names) {
  const reasons = failures.get(name);
  if (reasons) {
    for (const reason of reasons) console.log(`FAIL ${name} ${reason}`);
  } else {
    passes += 1;
    console.log(`PASS ${name}`);
  }
}

if (passes < 40) {
  console.error(
    `Only ${passes} component pages passed. At least 40 are required.`
  );
  process.exitCode = 1;
}
if (failures.size > 0) process.exitCode = 1;
