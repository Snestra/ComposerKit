// Writes registry.json from the import graph of packages/react/src, so each
// item lists exactly the files its entry files reach. Files that another item
// owns become a registryDependency on that item instead.
//
//   node scripts/prepare-registry.ts

import { writeFileSync } from "node:fs";

import manifest from "../../../packages/react/package.json" with { type: "json" };
import { readImportGraph } from "../../../packages/react/scripts/source-files.ts";
import type { ImportGraph } from "../../../packages/react/scripts/source-files.ts";
import registry from "../registry.json" with { type: "json" };

/** Items depend on each other through this namespace, so any host serves them. */
const NAMESPACE = "@composerkit";

/** The item that installs every other item. */
const ALL_ITEMS = "composerkit";

/** The theme every component needs. No module imports it. */
const STYLES = "styles";

/** Packages the consuming app already provides. */
const APP_PACKAGES = new Set(["next", "react", "react-dom", "tailwindcss"]);

interface Item {
  dependencies: string[];
  devDependencies: string[];
  files: string[];
  name: string;
  registryDependencies: string[];
}

// An item is one component folder with its components/ui file, one
// components/ui file without a folder, or one lib or hooks module.
const ITEM_OF_ENTRY: readonly RegExp[] = [
  /^components\/ui\/(?<item>[^/]+)\.tsx$/u,
  /^components\/(?<item>[^/]+)\.tsx$/u,
  /^components\/(?<item>(?!ui\/)[^/]+)\//u,
  /^(?:lib|hooks)\/(?<item>[^/]+)\.tsx?$/u,
  /^styles\/(?<item>globals)\.css$/u,
];

const itemOfEntry = (file: string): string | undefined => {
  for (const pattern of ITEM_OF_ENTRY) {
    const item = pattern.exec(file)?.groups?.item;

    if (item !== undefined) {
      return item === "globals" ? STYLES : item;
    }
  }

  return undefined;
};

/** `@base-ui/react/menu` is `@base-ui/react`, and `katex/dist/x.css` is `katex`. */
const packageName = (specifier: string): string => {
  const parts = specifier.split("/");

  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

const VERSIONS: Record<string, string> = {
  ...manifest.devDependencies,
  ...manifest.dependencies,
};

const versioned = (name: string): string => {
  const range = VERSIONS[name];

  if (range === undefined) {
    throw new Error(
      `${name} is imported but not in packages/react/package.json`
    );
  }

  return `${name}@${range}`;
};

/** Gives each file to the one item whose entry files reach it. */
const assignOwners = (graph: ImportGraph): Map<string, string> => {
  const owner = new Map<string, string>();

  for (const file of graph.keys()) {
    const item = itemOfEntry(file);

    if (item !== undefined) {
      owner.set(file, item);
    }
  }

  const entries = Map.groupBy(owner.keys(), (file) => owner.get(file) ?? "");
  const reachedBy = new Map<string, Set<string>>();

  for (const [item, files] of entries) {
    const queue = [...files];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const file = queue.pop() ?? "";
      const fileOwner = owner.get(file);

      if (!seen.has(file) && (fileOwner === undefined || fileOwner === item)) {
        seen.add(file);
        queue.push(...(graph.get(file)?.files ?? []));

        if (fileOwner === undefined) {
          reachedBy.set(file, (reachedBy.get(file) ?? new Set()).add(item));
        }
      }
    }
  }

  for (const [file, items] of reachedBy) {
    if (items.size > 1) {
      throw new Error(
        `${file} is reached by ${[...items].join(", ")}. Give it its own item.`
      );
    }

    owner.set(file, [...items][0]);
  }

  for (const file of graph.keys()) {
    if (!owner.has(file)) {
      throw new Error(`No item reaches ${file}`);
    }
  }

  return owner;
};

const buildItems = (graph: ImportGraph, owner: Map<string, string>): Item[] => {
  const byItem = Map.groupBy(owner.keys(), (file) => owner.get(file) ?? "");

  return [...byItem]
    .map(([name, files]) => {
      const modules = files.map((file) => graph.get(file));
      const items = new Set(
        modules.flatMap((module) =>
          (module?.files ?? []).map((file) => owner.get(file) ?? "")
        )
      );

      if (files.some((file) => file.startsWith("components/"))) {
        items.add(STYLES);
      }

      items.delete(name);

      const packages = new Set(
        modules.flatMap((module) => (module?.packages ?? []).map(packageName))
      );
      const typePackages = new Set(
        modules.flatMap((module) =>
          (module?.typePackages ?? [])
            .map(packageName)
            .filter((pkg) => !packages.has(pkg))
        )
      );

      return {
        dependencies: [...packages]
          .filter((pkg) => !APP_PACKAGES.has(pkg))
          .map(versioned)
          .toSorted(),
        devDependencies: [...typePackages]
          .filter((pkg) => !APP_PACKAGES.has(pkg))
          .map((pkg) => versioned(`@types/${pkg}`))
          .toSorted(),
        files: files.toSorted(),
        name,
        registryDependencies: [...items].toSorted(),
      };
    })
    .toSorted((a, b) => a.name.localeCompare(b.name));
};

/** Item groups that import each other, found with Tarjan's algorithm. */
const itemCycles = (items: Item[]): string[][] => {
  const edges = new Map(
    items.map((item) => [item.name, item.registryDependencies])
  );
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  const visit = (name: string) => {
    index.set(name, index.size);
    low.set(name, index.get(name) ?? 0);
    stack.push(name);

    for (const next of edges.get(name) ?? []) {
      if (!index.has(next)) {
        visit(next);
        low.set(name, Math.min(low.get(name) ?? 0, low.get(next) ?? 0));
      } else if (stack.includes(next)) {
        low.set(name, Math.min(low.get(name) ?? 0, index.get(next) ?? 0));
      }
    }

    if (low.get(name) === index.get(name)) {
      const group = stack.splice(stack.indexOf(name));

      if (group.length > 1) {
        cycles.push(group.toSorted());
      }
    }
  };

  for (const name of edges.keys()) {
    if (!index.has(name)) {
      visit(name);
    }
  }

  return cycles;
};

const titleOf = (name: string): string =>
  name
    .split("-")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");

const { cycles, graph } = await readImportGraph();
const items = buildItems(graph, assignOwners(graph));
const blocking = itemCycles(items);

for (const cycle of cycles) {
  console.log(`import cycle inside one item: ${cycle.files.join(" > ")}`);
}

if (blocking.length > 0) {
  throw new Error(
    `These items import each other, so they cannot be split: ${blocking.map((group) => group.join(" <> ")).join("; ")}`
  );
}

if (items.some((item) => item.name === ALL_ITEMS)) {
  throw new Error(`An item in packages/react/src is named ${ALL_ITEMS}`);
}

const fileEntry = (file: string) => ({
  path: `../../packages/react/src/${file}`,
  target: `~/src/${file}`,
  type: "registry:file",
});

const withoutEmpty = <T extends Record<string, unknown>>(record: T) =>
  Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) => !Array.isArray(value) || value.length > 0
    )
  );

const output = {
  ...registry,
  items: [
    {
      description: "Every ComposerKit component, hook, helper and style.",
      name: ALL_ITEMS,
      registryDependencies: items.map((item) => `${NAMESPACE}/${item.name}`),
      title: "ComposerKit",
      type: "registry:item",
    },
    ...items.map((item) =>
      withoutEmpty({
        dependencies: item.dependencies,
        devDependencies: item.devDependencies,
        files: item.files.map(fileEntry),
        name: item.name,
        registryDependencies: item.registryDependencies.map(
          (name) => `${NAMESPACE}/${name}`
        ),
        title: titleOf(item.name),
        type: "registry:item",
      })
    ),
  ],
};

writeFileSync(
  new URL("../registry.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`
);
