// Replays every recorded provider stream in the chat part gallery routes and
// fails when a replay does not finish or logs a console error.
//
//   node apps/docs/scripts/replay-chat-parts.ts
//
// BASE_URL points it at a running docs server instead of `next start`.

import { execFile, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routes = ["tool-call", "reasoning", "attachment"] as const;
const temporaryRoot = mkdtempSync(join(tmpdir(), "composerkit-replay-"));
const profile = join(temporaryRoot, "chrome-profile");
const listPath = join(temporaryRoot, "list.js");
const replayPath = join(temporaryRoot, "replay.js");
const REPLAY_TIMEOUT_MS = 30_000;

writeFileSync(
  listPath,
  `const select = document.querySelector("[data-chat-part-demo] select");
if (!select) throw new Error("no recording select on the page");
return JSON.stringify([...select.options].map((option) => option.value));
`
);

const replayScript = (recording: string) => `
const errors = [];
if (!window.__replayErrorsHooked) {
  window.__replayErrorsHooked = true;
  window.__replayErrors = [];
  const original = console.error.bind(console);
  console.error = (...args) => {
    window.__replayErrors.push(args.map(String).join(" "));
    original(...args);
  };
  window.addEventListener("error", (event) => window.__replayErrors.push(String(event.message)));
  window.addEventListener("unhandledrejection", (event) => window.__replayErrors.push(String(event.reason)));
}
window.__replayErrors.length = 0;
const select = document.querySelector("[data-chat-part-demo] select");
const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
setValue.call(select, ${JSON.stringify(recording)});
select.dispatchEvent(new Event("change", { bubbles: true }));
const demo = document.querySelector("[data-chat-part-demo]");
const deadline = Date.now() + ${REPLAY_TIMEOUT_MS};
while (Date.now() < deadline) {
  await new Promise((done) => setTimeout(done, 100));
  if (demo.dataset.replayRecording === ${JSON.stringify(recording)} && demo.dataset.replayStatus === "done") break;
}
errors.push(...window.__replayErrors);
return JSON.stringify({
  cursor: Number(demo.dataset.replayCursor),
  errors,
  recording: demo.dataset.replayRecording,
  status: demo.dataset.replayStatus,
  total: Number(demo.dataset.replayTotal),
});
`;

const delay = (milliseconds: number) =>
  new Promise((done) => setTimeout(done, milliseconds));

const waitFor = async (
  child: ChildProcess,
  check: () => Promise<void>,
  description: string
) => {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `${description} exited with ${child.exitCode ?? child.signalCode}`
      );
    }
    try {
      await check();
      return;
    } catch {
      await delay(250);
    }
  }
  throw new Error(`Timed out waiting for ${description}`);
};

const chromeCommand = async (args: string[]) => {
  const { stdout } = await execFileAsync(
    "chrome-devtools",
    ["--user-data-dir", profile, ...args],
    { maxBuffer: 32 * 1024 * 1024, timeout: REPLAY_TIMEOUT_MS * 2 }
  );
  return stdout;
};

// chrome-devtools prints a target line after the script result.
const scriptResult = (stdout: string): string =>
  stdout
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("[target:"))
    .join("\n");

const loadErrors = async (): Promise<string[]> => {
  const stdout = await chromeCommand(["console", "--type", "error"]);
  return scriptResult(stdout)
    .split("\n")
    .filter(
      (line) =>
        line.trim() !== "" && line.trim() !== "No console messages collected."
    );
};

let server: ChildProcess | undefined;
let chrome: ChildProcess | undefined;
let failures = 0;

try {
  let origin = process.env.BASE_URL?.replace(/\/$/u, "");

  if (!origin) {
    let port = 0;
    const started = spawn(
      process.execPath,
      [
        join(docsRoot, "node_modules", "next", "dist", "bin", "next"),
        "start",
        "--port",
        "0",
      ],
      { cwd: docsRoot, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } }
    );
    server = started;
    started.stdout?.on("data", (chunk) => {
      const match = /(?:127\.0\.0\.1|localhost):(\d{2,5})/u.exec(String(chunk));
      if (match && port === 0) {
        port = Number(match[1]);
      }
    });
    await waitFor(
      started,
      async () => {
        if (port === 0) {
          throw new Error("next start has not printed its port yet");
        }
        const response = await fetch(`http://127.0.0.1:${port}/gallery`);
        if (!response.ok) {
          throw new Error(`Gallery returned ${response.status}`);
        }
      },
      "next start"
    );
    origin = `http://127.0.0.1:${port}`;
  }

  const browser = spawn(
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
  chrome = browser;
  await waitFor(
    browser,
    async () => {
      await chromeCommand(["list-pages"]);
    },
    "Chrome"
  );

  for (const route of routes) {
    await chromeCommand(["navigate", `${origin}/gallery/${route}`]);
    await chromeCommand(["wait-for", "Replay a published example stream"]);
    const atLoad = await loadErrors();
    if (atLoad.length > 0) {
      failures += 1;
      console.log(`FAIL replay ${route} page-load ${atLoad[0]}`);
    }

    const recordings = JSON.parse(
      scriptResult(await chromeCommand(["run-script", listPath]))
    ) as string[];

    for (const recording of recordings) {
      writeFileSync(replayPath, replayScript(recording));
      const result = JSON.parse(
        scriptResult(await chromeCommand(["run-script", replayPath]))
      ) as {
        cursor: number;
        errors: string[];
        recording: string;
        status: string;
        total: number;
      };
      const finished =
        result.recording === recording &&
        result.status === "done" &&
        result.cursor === result.total;

      if (!finished) {
        failures += 1;
        console.log(
          `FAIL replay ${route} ${recording} stopped at ${result.cursor} of ${result.total} (${result.status})`
        );
      } else if (result.errors.length > 0) {
        failures += 1;
        console.log(`FAIL replay ${route} ${recording} ${result.errors[0]}`);
      } else {
        console.log(`PASS replay ${route} ${recording} ${result.total} events`);
      }
    }
  }
} finally {
  chrome?.kill("SIGTERM");
  server?.kill("SIGTERM");
  rmSync(temporaryRoot, { force: true, recursive: true });
}

if (failures > 0) {
  process.exitCode = 1;
}
