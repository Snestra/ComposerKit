import { readFile } from "node:fs/promises";
import path from "node:path";

import { ThemeEditorClient } from "./theme-editor-client";

const docsRoot =
  path.basename(process.cwd()) === "docs"
    ? process.cwd()
    : path.join(process.cwd(), "apps/docs");

export const ThemeEditor = async () => {
  const designMd = await readFile(
    path.join(docsRoot, "..", "..", "packages", "composerkit", "DESIGN.md"),
    "utf8"
  );
  return <ThemeEditorClient designMd={designMd} />;
};
