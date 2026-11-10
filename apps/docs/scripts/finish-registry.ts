// Runs after `shadcn build` has written public/r. The component imports
// `@workspace/react/...`, and a project that installs the registry item has no
// such package, so each file's content imports `@/...` instead. The pre-commit
// hook formats JSON with oxfmt, so the build formats the same way and the
// committed registry matches a fresh build.
//
//   node scripts/finish-registry.ts

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = fileURLToPath(new URL("../public/r", import.meta.url));
const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const ALIAS = /@workspace\/react\//gu;

for (const entry of readdirSync(REGISTRY, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) {
    continue;
  }

  const absolute = path.join(REGISTRY, entry.name);

  writeFileSync(
    absolute,
    `${readFileSync(absolute, "utf-8").replaceAll(ALIAS, "@/").trimEnd()}\n`
  );
}

execFileSync(path.join(REPO, "node_modules/.bin/oxfmt"), [REGISTRY], {
  cwd: REPO,
  stdio: "inherit",
});
