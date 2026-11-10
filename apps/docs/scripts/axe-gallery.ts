import { execFile, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const galleryRoot = join(docsRoot, "app", "(gallery)", "gallery");
const outputPath = join(tmpdir(), "composerkit-axe-gallery-results.json");
// Next picks a free port when asked for port 0 and prints the real one, so a
// stale server on a fixed port can never be mistaken for this one.
const port = Number(process.env.AXE_PORT ?? 0);
const themeArgumentIndex = process.argv.indexOf("--theme-css");

if (
  themeArgumentIndex !== -1 &&
  (themeArgumentIndex !== 2 || !process.argv[themeArgumentIndex + 1])
) {
  throw new Error(
    "Usage: node apps/docs/scripts/axe-gallery.ts [--theme-css <file>]"
  );
}

if (process.argv.length > (themeArgumentIndex === -1 ? 2 : 4)) {
  throw new Error(
    "Usage: node apps/docs/scripts/axe-gallery.ts [--theme-css <file>]"
  );
}

const themeCss =
  themeArgumentIndex === -1
    ? ""
    : readFileSync(process.argv[themeArgumentIndex + 1], "utf8");
const selectedPages = (process.env.AXE_PAGES ?? "")
  .split(",")
  .map((page) => page.trim())
  .filter((page) => page !== "");
const pages = readdirSync(galleryRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter(
    (entry) => selectedPages.length === 0 || selectedPages.includes(entry.name)
  )
  .map((entry) => entry.name)
  .sort();
const modes = ["light", "dark"] as const;
const temporaryRoot = mkdtempSync(join(tmpdir(), "composerkit-axe-gallery-"));
const profile = join(temporaryRoot, "chrome-profile");
const runAxePath = join(temporaryRoot, "run-axe.js");
const applyThemePath = join(temporaryRoot, "apply-theme.js");
const axeSource = readFileSync(
  resolve(docsRoot, "node_modules", "axe-core", "axe.min.js"),
  "utf8"
);

writeFileSync(
  runAxePath,
  `${axeSource}\nconst axeResult = await axe.run(document, { runOnly: { type: "rule", values: ["color-contrast"] }, resultTypes: ["violations"] });\nfor (const violation of axeResult.violations) {
  for (const node of violation.nodes) {\n    try {\n      const element = node.target.length === 1 && typeof node.target[0] === "string" ? document.querySelector(node.target[0].replaceAll("\\\\", "")) : null;\n      if (element) {\n        node.computed = { color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor, htmlClass: document.documentElement.className };\n      }\n    } catch {\n      // A selector axe can match is not always one querySelector accepts.\n    }\n  }\n}\nreturn await axeResult;\n`
);
writeFileSync(
  applyThemePath,
  `const css = ${JSON.stringify(themeCss)};\nlet style = document.getElementById("composerkit-axe-theme");\nif (!style) { style = document.createElement("style"); style.id = "composerkit-axe-theme"; document.head.append(style); }\nstyle.textContent = css;\nif (document.readyState !== "complete") { await new Promise((done) => addEventListener("load", done, { once: true })); }\nawait Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 2000))]);\n/* Some entry animations never reach the finished state, for example while their\n subtree is hidden, so the wait needs its own end. */\nawait Promise.race([Promise.all(document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => undefined))), new Promise((done) => setTimeout(done, 3000))]);\nreturn document.documentElement.className;\n`
);

const delay = (milliseconds: number) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

const waitFor = async (
  child: ChildProcess,
  check: () => Promise<void>,
  description: string
) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `${description} exited with ${child.exitCode ?? child.signalCode}`
      );
    }
    try {
      await check();
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  throw new Error(`Timed out waiting for ${description}`, { cause: lastError });
};

const runChromeCommand = async (args: string[]) => {
  const { stdout } = await execFileAsync(
    "chrome-devtools",
    ["--user-data-dir", profile, ...args],
    { maxBuffer: 32 * 1024 * 1024, timeout: 180_000 }
  );
  return stdout;
};

let server: ChildProcess | undefined;
let chrome: ChildProcess | undefined;

try {
  const baseUrl = process.env.BASE_URL?.replace(/\/$/u, "");
  let actualPort = port;

  if (!baseUrl) {
    server = spawn(
      process.execPath,
      [
        join(docsRoot, "node_modules", "next", "dist", "bin", "next"),
        "start",
        "--port",
        String(port),
      ],
      { cwd: docsRoot, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } }
    );

    server.stdout?.on("data", (chunk) => {
      const match = /(?:127\.0\.0\.1|localhost):(\d{2,5})/u.exec(String(chunk));
      if (match && actualPort === 0) {
        actualPort = Number(match[1]);
      }
    });

    await waitFor(
      server,
      async () => {
        if (actualPort === 0) {
          throw new Error("next start has not printed its port yet");
        }
        const response = await fetch(`http://127.0.0.1:${actualPort}/gallery`);
        if (!response.ok) {
          throw new Error(`Gallery returned ${response.status}`);
        }
      },
      "next start"
    );
  }

  const origin = baseUrl ?? `http://127.0.0.1:${actualPort}`;
  chrome = spawn(
    "chrome",
    [
      "--headless",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await waitFor(
    chrome,
    async () => {
      await runChromeCommand(["list-pages"]);
    },
    "Chrome"
  );

  await runChromeCommand(["navigate", `${origin}/gallery`]);

  const results: unknown[] = [];
  let failures = 0;

  for (const page of pages) {
    for (const mode of modes) {
      const resultPath = join(temporaryRoot, `${page}-${mode}.json`);

      try {
        await runChromeCommand([
          "evaluate",
          `localStorage.setItem("composerkit-gallery-theme", ${JSON.stringify(mode)})`,
        ]);
        await runChromeCommand(["navigate", `${origin}/gallery/${page}`]);
        const rootClass = await runChromeCommand([
          "run-script",
          applyThemePath,
        ]);
        if (!rootClass.split(/\s+/u).includes(mode)) {
          throw new Error(
            `page root class "${rootClass.trim()}" lacks ${mode}`
          );
        }
        await runChromeCommand([
          "run-script",
          runAxePath,
          "--json",
          "--output",
          resultPath,
        ]);

        const result = JSON.parse(readFileSync(resultPath, "utf8")) as {
          violations?: Array<{
            nodes: Array<{ failureSummary?: string; target: string[] }>;
          }>;
        };

        if (!Array.isArray(result.violations)) {
          throw new Error("axe returned no violations array");
        }

        const violations = result.violations.flatMap((violation) =>
          violation.nodes.map((node) => ({
            message: node.failureSummary ?? "",
            target: node.target.join(" "),
          }))
        );
        results.push({ mode, page, result, violations });
        writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`);

        if (violations.length === 0) {
          console.log(`PASS axe ${mode} ${page}`);
        } else {
          failures += 1;
          console.log(
            `FAIL axe ${mode} ${page} ${violations.length} ${violations[0].target}`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures += 1;
        results.push({ error: message, mode, page });
        console.log(`FAIL axe ${mode} ${page} 1 axe-runner`);
        console.error(`${mode} ${page}: ${message}`);
      }
    }
  }

  writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`);
  console.error(`Full axe results: ${outputPath}`);
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  if (chrome && chrome.exitCode === null) {
    chrome.kill("SIGTERM");
  }
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
  }

  await Promise.all(
    [chrome, server]
      .filter((child) => child !== undefined)
      .map(
        (child) =>
          new Promise<void>((resolveChild) => {
            if (child.exitCode !== null || child.signalCode !== null) {
              resolveChild();
              return;
            }
            child.once("exit", () => resolveChild());
          })
      )
  );

  rmSync(temporaryRoot, { force: true, maxRetries: 10, recursive: true });
}
