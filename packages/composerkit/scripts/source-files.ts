import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cruise } from "dependency-cruiser";
import type { IModule } from "dependency-cruiser";
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config";

import config, { TS_CONFIG } from "../.dependency-cruiser.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SRC = fileURLToPath(new URL("../src", import.meta.url));

const isModuleFile = (file: string): boolean =>
  /\.[jt]sx?$/u.test(file) && !file.endsWith(".d.ts");

const sourceFiles = readdirSync(SRC, {
  recursive: true,
  withFileTypes: true,
})
  .filter((entry) => entry.isFile())
  .map((entry) =>
    path
      .relative(SRC, path.join(entry.parentPath, entry.name))
      .split(path.sep)
      .join("/")
  )
  .filter(
    (file) =>
      isModuleFile(file) ||
      file.endsWith(".d.ts") ||
      file.endsWith(".css") ||
      file.endsWith(".json") ||
      file.endsWith(".svg") ||
      file.endsWith(".license") ||
      file.startsWith("styles/")
  )
  .toSorted();

/** One file under src, with paths relative to src. */
export interface SourceModule {
  /** Files under src that this file needs at build or run time. */
  files: string[];
  /** Bare specifiers this file imports, such as `@base-ui/react/menu`. */
  packages: string[];
  /** Bare specifiers that only `import type` names. */
  typePackages: string[];
}

export type ImportGraph = Map<string, SourceModule>;

export interface ImportCycle {
  files: string[];
}

// dependency-cruiser reads JS and TS imports. It does not read CSS `@import`
// or the `new URL("x", import.meta.url)` form that loads the diff worker and
// the subagent avatars, so those edges come from these two patterns.
const ASSET_URL =
  /new\s+URL\s*\(\s*["'](?<target>\.{0,2}\/?[^"']+)["']\s*,\s*import\.meta\.url/gu;

const CSS_IMPORT = /@import\s+["'](?<target>[^"']+)["']/gu;

const fromSrc = (resolved: string): string | undefined =>
  resolved.startsWith("src/") ? resolved.slice("src/".length) : undefined;

interface ExtraEdges {
  files: string[];
  packages: string[];
}

const extraEdges = (file: string): ExtraEdges => {
  const text = readFileSync(path.join(SRC, file), "utf-8");
  const pattern = file.endsWith(".css") ? CSS_IMPORT : ASSET_URL;
  const files: string[] = [];
  const packages: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const target = match.groups?.target ?? "";

    if (target.startsWith(".") || !file.endsWith(".css")) {
      files.push(
        path.posix.normalize(path.posix.join(path.posix.dirname(file), target))
      );
    } else {
      packages.push(target);
    }
  }

  return { files, packages };
};

const toSourceModule = (cruised: IModule, file: string): SourceModule => {
  const extra = extraEdges(file);
  const files = new Set(extra.files);
  const packages = new Set(extra.packages);
  const typePackages = new Set<string>();

  for (const dependency of cruised.dependencies) {
    const local = fromSrc(dependency.resolved);

    if (local !== undefined) {
      files.add(local);
    } else if (dependency.dependencyTypes.includes("type-only")) {
      typePackages.add(dependency.module);
    } else {
      packages.add(dependency.module);
    }
  }

  return {
    files: [...files].toSorted(),
    packages: [...packages].toSorted(),
    typePackages: [...typePackages]
      .filter((name) => !packages.has(name))
      .toSorted(),
  };
};

/** Cruises src with dependency-cruiser and returns every file's edges. */
export const readImportGraph = async (): Promise<{
  cycles: ImportCycle[];
  graph: ImportGraph;
}> => {
  const tsConfigFile = path.join(ROOT, TS_CONFIG);

  const result = await cruise(
    ["src"],
    {
      ...config.options,
      baseDir: ROOT,
      ruleSet: { forbidden: config.forbidden },
      tsConfig: { fileName: tsConfigFile },
      validate: true,
    },
    {},
    { tsConfig: extractTSConfig(tsConfigFile) }
  );

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- cruise returns text only for an outputType, which this call never sets.
  if (typeof result.output === "string") {
    throw new TypeError("dependency-cruiser returned text instead of a graph");
  }

  const graph: ImportGraph = new Map();

  for (const cruised of result.output.modules) {
    const file = fromSrc(cruised.source);

    if (file !== undefined) {
      const unresolved = cruised.dependencies.filter(
        (dependency) => dependency.couldNotResolve
      );

      if (unresolved.length > 0) {
        throw new Error(
          `${cruised.source} imports ${unresolved.map((dependency) => dependency.module).join(", ")}, which dependency-cruiser could not resolve`
        );
      }

      graph.set(file, toSourceModule(cruised, file));
    }
  }

  for (const file of sourceFiles) {
    if (!graph.has(file)) {
      throw new Error(`dependency-cruiser did not read ${file}`);
    }
  }

  const cycles = result.output.summary.violations.flatMap((violation) =>
    violation.cycle
      ? [
          {
            files: violation.cycle.map(
              (step) => fromSrc(step.name) ?? step.name
            ),
          },
        ]
      : []
  );

  return { cycles, graph };
};
