// Installs every registry item into its own fresh Next.js app from a local
// server of public/r, then type-checks and builds that app. Prints one line
// per item, `PASS <item>` or `FAIL <item> <step>`, and exits 1 if any fail.
// Pass item names to run only those.
//
//   node scripts/install-matrix.ts [item...]

import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import nextManifest from "next/package.json" with { type: "json" };

import registry from "../registry.json" with { type: "json" };

const run = promisify(execFile);

const DOCS = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_R = path.join(DOCS, "public/r");
const SHADCN = path.join(DOCS, "node_modules/.bin/shadcn");
const NAMESPACE = "@composerkit";
const CONCURRENCY = 4;
const LOG_TAIL = 4000;
const MODULE_FILE = /\.(?:tsx?|js)$/u;
const TS_EXTENSION = /\.tsx?$/u;

type Step = "create" | "config" | "add" | "files" | "tsc" | "build";

class StepError extends Error {
  readonly step: Step;

  constructor(step: Step, detail: string) {
    super(detail);
    this.step = step;
  }
}

interface RegistryFile {
  content: string;
  target: string;
}

interface BuiltItem {
  files?: RegistryFile[];
  registryDependencies?: string[];
}

const readItem = async (name: string): Promise<BuiltItem> =>
  JSON.parse(await readFile(path.join(PUBLIC_R, `${name}.json`), "utf-8"));

/** The item's files and the files of every item it depends on, by app path. */
const expectedFiles = async (name: string): Promise<Map<string, string>> => {
  const files = new Map<string, string>();
  const seen = new Set<string>();
  const queue = [name];

  while (queue.length > 0) {
    const next = queue.pop() ?? "";

    if (!seen.has(next)) {
      seen.add(next);
      const item = await readItem(next);

      for (const file of item.files ?? []) {
        files.set(file.target.replace(/^~\//u, ""), file.content);
      }

      for (const dependency of item.registryDependencies ?? []) {
        queue.push(dependency.slice(`${NAMESPACE}/`.length));
      }
    }
  }

  return files;
};

const listFiles = async (root: string): Promise<Map<string, string>> => {
  const entries = await readdir(path.join(root, "src"), {
    recursive: true,
    withFileTypes: true,
  });
  const files = new Map<string, string>();

  for (const entry of entries.filter((candidate) => candidate.isFile())) {
    const absolute = path.join(entry.parentPath, entry.name);
    files.set(
      path.relative(root, absolute).split(path.sep).join("/"),
      await readFile(absolute, "utf-8")
    );
  }

  return files;
};

const step = async (
  name: Step,
  command: string,
  args: string[],
  cwd: string
): Promise<void> => {
  try {
    await run(command, args, {
      cwd,
      env: { ...process.env, CI: "1" },
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const output =
      error instanceof Error && "stdout" in error && "stderr" in error
        ? `${String(error.stdout)}${String(error.stderr)}`
        : String(error);
    throw new StepError(name, output.slice(-LOG_TAIL));
  }
};

const componentsJson = (port: number) => ({
  $schema: "https://ui.shadcn.com/schema.json",
  aliases: {
    components: "@/components",
    hooks: "@/hooks",
    lib: "@/lib",
    ui: "@/components/ui",
    utils: "@/lib/utils",
  },
  iconLibrary: "lucide",
  registries: {
    [NAMESPACE]: `http://127.0.0.1:${port}/r/{name}.json`,
  },
  rsc: true,
  style: "new-york",
  tailwind: {
    baseColor: "neutral",
    config: "",
    css: "src/app/globals.css",
    cssVariables: true,
    prefix: "",
  },
  tsx: true,
});

/** A page that bundles every module the item installed, rendered on the client only. */
const writeProbePage = async (app: string, files: string[]) => {
  const modules = files
    .filter((file) => MODULE_FILE.test(file) && !file.endsWith(".d.ts"))
    .map((file) => `@/${file.slice("src/".length).replace(TS_EXTENSION, "")}`);
  const imports = modules
    .map((specifier, index) => `import * as m${index} from "${specifier}";`)
    .join("\n");
  const names = modules.map((_, index) => `m${index}`).join(", ");

  await writeFile(
    path.join(app, "src/app/item-modules.tsx"),
    `"use client";\n${imports}\n\nconst modules: Record<string, unknown>[] = [${names}];\n\nexport default function ItemModules() {\n  return <pre>{modules.map((module) => Object.keys(module).join(" ")).join("\\n")}</pre>;\n}\n`
  );
  await writeFile(
    path.join(app, "src/app/item-probe.tsx"),
    `"use client";\nimport dynamic from "next/dynamic";\n\nconst ItemModules = dynamic(() => import("./item-modules"), { ssr: false });\n\nexport default function ItemProbe() {\n  return <ItemModules />;\n}\n`
  );
  await writeFile(
    path.join(app, "src/app/page.tsx"),
    `import ItemProbe from "./item-probe";\n\nexport default function Page() {\n  return <ItemProbe />;\n}\n`
  );
};

const checkFiles = (
  before: Map<string, string>,
  after: Map<string, string>,
  expected: Map<string, string>
) => {
  const written = [...after].filter(
    ([file, content]) => before.get(file) !== content
  );
  const writtenPaths = new Set(written.map(([file]) => file));
  const missing = [...expected.keys()].filter(
    (file) => !writtenPaths.has(file)
  );
  const extra = [...writtenPaths].filter((file) => !expected.has(file));
  const changed = written
    .filter(
      ([file, content]) => expected.has(file) && expected.get(file) !== content
    )
    .map(([file]) => file);

  if (missing.length + extra.length + changed.length > 0) {
    throw new StepError(
      "files",
      `missing: ${missing.join(" ")}\nextra: ${extra.join(" ")}\nchanged: ${changed.join(" ")}`
    );
  }
};

const installItem = async (name: string, port: number, root: string) => {
  const app = path.join(root, name);
  const registryUrl = `http://127.0.0.1:${port}/r/${name}.json`;

  try {
    await step(
      "create",
      "pnpm",
      [
        "dlx",
        `create-next-app@${nextManifest.version}`,
        app,
        "--ts",
        "--tailwind",
        "--app",
        "--src-dir",
        "--import-alias",
        "@/*",
        "--use-pnpm",
        "--disable-git",
        "--empty",
        "--no-agent-feedback",
        "--yes",
      ],
      root
    );

    try {
      await writeFile(
        path.join(app, "components.json"),
        `${JSON.stringify(componentsJson(port), null, 2)}\n`
      );
    } catch (error) {
      throw new StepError("config", String(error));
    }

    const before = await listFiles(app);
    await step(
      "add",
      SHADCN,
      ["add", registryUrl, "--yes", "--overwrite"],
      app
    );
    checkFiles(before, await listFiles(app), await expectedFiles(name));
    await writeProbePage(app, [...(await expectedFiles(name)).keys()]);
    await step(
      "tsc",
      path.join(app, "node_modules/.bin/tsc"),
      ["--noEmit"],
      app
    );
    await step(
      "build",
      path.join(app, "node_modules/.bin/next"),
      ["build"],
      app
    );
    console.log(`PASS ${name}`);

    return true;
  } catch (error) {
    if (!(error instanceof StepError)) {
      throw error;
    }

    console.log(`FAIL ${name} ${error.step}`);
    console.error(`--- ${name} ${error.step}\n${error.message}`);

    return false;
  } finally {
    await rm(app, { force: true, recursive: true });
  }
};

const serveRegistry = () =>
  createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const file = path.join(PUBLIC_R, path.basename(url.pathname));
    const isFile = await stat(file).then(
      (info) => info.isFile(),
      () => false
    );

    if (!(url.pathname.startsWith("/r/") && isFile)) {
      response.writeHead(404).end();

      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    createReadStream(file).pipe(response);
  });

const requested = process.argv.slice(2);
const names = registry.items
  .map((item) => item.name)
  .filter((name) => requested.length === 0 || requested.includes(name));

const server = serveRegistry();
await new Promise<void>((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});
const { port } = server.address() as AddressInfo;
const root = await mkdtemp(path.join(os.tmpdir(), "composerkit-matrix-"));

const queue = [...names];
const results: boolean[] = [];

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const name = queue.shift() ?? "";
      results.push(await installItem(name, port, root));
    }
  })
);

server.close();
await rm(root, { force: true, recursive: true });

if (results.includes(false)) {
  process.exitCode = 1;
}
