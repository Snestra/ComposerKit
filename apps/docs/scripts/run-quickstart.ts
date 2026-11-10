import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";

type Step =
  | { kind: "command"; command: string; server?: string }
  | { kind: "file"; path: string; content: string };

const fencePattern = /^```(\w+)([^\n]*)\n([\s\S]*?)^```\s*$/gm;
const titlePattern = /\btitle="([^"]+)"/;
const serverPattern = /\bserver="([^"]+)"/;

const parseSteps = (source: string): Step[] =>
  [...source.matchAll(fencePattern)].map(([, language, metadata, content]) => {
    if (language === "bash") {
      return {
        command: content.trim(),
        kind: "command",
        server: serverPattern.exec(metadata)?.[1],
      };
    }
    const path = titlePattern.exec(metadata)?.[1];
    if (!path) {
      throw new Error(`Untitled ${language} fence`);
    }
    return { content, kind: "file", path };
  });

const runCommand = async (
  step: Extract<Step, { kind: "command" }>,
  cwd: string
): Promise<void> => {
  const child = spawn("bash", ["-euo", "pipefail", "-c", step.command], {
    cwd,
    detached: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "inherit",
  });
  const exited = once(child, "exit");
  if (!step.server) {
    const [code] = await exited;
    if (code !== 0) {
      throw new Error(`Command exited ${code}`);
    }
    return;
  }

  try {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error("Development server exited before rendering the page");
      }
      let response: Response | undefined;
      try {
        response = await fetch(step.server, {
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        await setTimeout(500);
        continue;
      }
      if (!response.ok) {
        throw new Error(`Development page returned HTTP ${response.status}`);
      }
      if (!(await response.text()).includes('data-slot="composer-field"')) {
        throw new Error("Development page did not render the Composer");
      }
      process.stdout.write("PASS development page renders Composer\n");
      return;
    }
    throw new Error(
      "Development server did not become ready within 90 seconds"
    );
  } finally {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      process.kill(-child.pid, "SIGTERM");
    }
    await exited;
  }
};

let currentStep = "read tutorial";
let directory: string | undefined;
try {
  const source = await readFile(
    new URL("../content/docs/index.mdx", import.meta.url),
    "utf8"
  );
  const steps = parseSteps(source);
  const final = steps.at(-1);
  if (final?.kind !== "command" || final.command !== "npx next build") {
    throw new Error("The tutorial must end with npx next build");
  }
  directory = await mkdtemp(join(tmpdir(), "composerkit-quickstart-"));
  const app = join(directory, "composerkit-demo");
  await mkdir(app);
  process.stdout.write(`Quickstart directory: ${app}\n`);
  for (const [index, step] of steps.entries()) {
    currentStep = `${index + 1} ${step.kind === "file" ? step.path : step.command}`;
    process.stdout.write(`STEP ${currentStep}\n`);
    if (step.kind === "command") {
      await runCommand(step, app);
      continue;
    }
    const destination = resolve(app, step.path);
    const localPath = relative(app, destination);
    if (localPath.startsWith("..") || isAbsolute(localPath)) {
      throw new Error(`File path escapes the app: ${step.path}`);
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, step.content);
  }
} catch (error) {
  process.stderr.write(`FAIL ${currentStep}\n${String(error)}\n`);
  process.exitCode = 1;
} finally {
  if (directory) {
    await rm(directory, { force: true, recursive: true });
  }
}
if (!process.exitCode) {
  process.stdout.write("PASS quickstart next build\n");
}
