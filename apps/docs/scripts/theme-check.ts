import { execFile, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { toDesignMd, toDtcg, toThemeCss } from "../lib/theme/export.ts";
import {
  buildTheme,
  defaultSeeds,
  parseDesignColors,
} from "../lib/theme/model.ts";
import { presets } from "../lib/theme/presets.ts";

const execFileAsync = promisify(execFile);
const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(docsRoot, "..", "..");
const designPath = join(repoRoot, "packages", "react", "DESIGN.md");
const outputRoot = join(tmpdir(), "composerkit-theme-check");
const sourceDesignMd = readFileSync(designPath, "utf8");
const source = parseDesignColors(sourceDesignMd);
const defaults = defaultSeeds(source);
let failures = 0;

const report = (passed: boolean, line: string) => {
  if (!passed) {
    failures += 1;
  }
  console.log(`${passed ? "PASS" : "FAIL"} ${line}`);
};

const run = async (command: string, args: string[]) => {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
    });
    return { ok: true, stdout };
  } catch (error) {
    const { stdout = "" } = error as { stdout?: string };
    return { ok: false, stdout };
  }
};

const defaultExport = toDesignMd(sourceDesignMd, buildTheme(source, defaults));
report(defaultExport === sourceDesignMd, "roundtrip default");

const themeFiles: Array<{ id: string; css: string }> = [];

for (const preset of presets) {
  const theme = buildTheme(source, { ...defaults, ...preset.seeds });
  const directory = join(outputRoot, preset.id);
  mkdirSync(directory, { recursive: true });
  const designFile = join(directory, "DESIGN.md");
  const tokensFile = join(directory, "tokens.json");
  const cssFile = join(directory, "theme.css");
  const dtcg = toDtcg(theme, preset.label);
  writeFileSync(designFile, toDesignMd(sourceDesignMd, theme, preset.label));
  writeFileSync(tokensFile, `${JSON.stringify(dtcg, null, 2)}\n`);
  writeFileSync(cssFile, toThemeCss(theme));
  themeFiles.push({ css: cssFile, id: preset.id });

  const broken = theme.pairs.filter((pair) => !pair.ok);
  report(
    broken.length === 0,
    `limits ${preset.id}${broken.map((pair) => ` ${pair.text}/${pair.background}`).join("")}`
  );

  const lint = await run("pnpm", [
    "--silent",
    "--filter",
    "composerkit",
    "lint:design",
    designFile,
  ]);
  const reason = lint.stdout
    .split("\n")
    .find(
      (line) => line.startsWith("error") || line.includes("contrast-ratio")
    );
  report(
    lint.ok,
    lint.ok ? `lint:design ${preset.id}` : `lint:design ${preset.id} ${reason}`
  );

  // The design.md CLI's own DTCG export of the written DESIGN.md must carry
  // the same colors as the editor's DTCG file.
  const cli = await run("pnpm", [
    "--silent",
    "--filter",
    "composerkit",
    "exec",
    "design.md",
    "export",
    designFile,
    "--format",
    "dtcg",
  ]);
  const cliColors = cli.ok
    ? (
        JSON.parse(cli.stdout) as {
          color: Record<
            string,
            { $value?: { components: number[]; hex: string } }
          >;
        }
      ).color
    : {};
  const mismatched = theme.tokens
    .map((token) => token.name)
    .filter((name) => {
      const ours = dtcg.color[name];
      const theirs = cliColors[name]?.$value;
      if (typeof ours === "string" || !theirs) {
        return true;
      }
      const alpha = ours.$value.alpha === undefined ? "" : theirs.hex.slice(7);
      return (
        JSON.stringify(ours.$value.components) !==
          JSON.stringify(theirs.components) ||
        `${ours.$value.hex}${alpha}` !== theirs.hex
      );
    });
  report(
    cli.ok && mismatched.length === 0,
    `dtcg ${preset.id}${mismatched
      .slice(0, 3)
      .map((name) => ` ${name}`)
      .join("")}`
  );
}

const axeLine = /^(PASS|FAIL) axe (light|dark) (\S+)(.*)$/u;

for (const { css, id } of themeFiles) {
  const child = spawn(
    process.execPath,
    [join(docsRoot, "scripts", "axe-gallery.ts"), "--theme-css", css],
    { cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] }
  );
  let lines = 0;
  let pageFailures = 0;
  for await (const line of createInterface({ input: child.stdout })) {
    const match = axeLine.exec(line);
    if (match) {
      const [, status, mode, page, rest] = match;
      const count = rest.trim().split(" ")[0] ?? "";
      lines += 1;
      pageFailures += status === "PASS" ? 0 : 1;
      report(
        status === "PASS",
        status === "PASS"
          ? `axe ${mode} ${id} ${page}`
          : `axe ${mode} ${id} ${page} ${count}`
      );
    } else {
      console.log(line);
    }
  }
  const code = await new Promise<number | null>((done) => {
    if (child.exitCode !== null) {
      done(child.exitCode);
      return;
    }
    child.once("exit", done);
  });
  if (lines === 0 || (code !== 0 && pageFailures === 0)) {
    report(false, `axe ${id} runner exited ${code} after ${lines} pages`);
  }
}

console.error(`Theme files: ${outputRoot}`);
process.exitCode = failures === 0 ? 0 : 1;
