import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ChatStreamProvider } from "composerkit/lib/chat-stream";

interface ChatPartRecording {
  id: string;
  provider: ChatStreamProvider;
  source: string;
  title: string;
}

const recordingFiles = [
  ["openai-clean", "openai", "OpenAI Responses API, clean stream"],
  ["openai-partial", "openai", "OpenAI Responses API, partial tool JSON"],
  ["openai-error", "openai", "OpenAI Responses API, mid-stream error"],
  ["anthropic-clean", "anthropic", "Anthropic Messages API, clean stream"],
  [
    "anthropic-partial",
    "anthropic",
    "Anthropic Messages API, partial tool JSON",
  ],
  ["anthropic-error", "anthropic", "Anthropic Messages API, mid-stream error"],
  ["vercel-clean", "vercel", "Vercel AI SDK v5, clean stream"],
  ["vercel-partial", "vercel", "Vercel AI SDK v5, partial tool JSON"],
  ["vercel-cancelled", "vercel", "Vercel AI SDK v5, cancelled stream"],
  ["vercel-error", "vercel", "Vercel AI SDK v5, mid-stream error"],
  ["vercel-retried", "vercel", "Vercel AI SDK v5, retried stream"],
] as const;

const loadChatPartRecordings = async (): Promise<ChatPartRecording[]> =>
  Promise.all(
    recordingFiles.map(async ([id, provider, title]) => ({
      id,
      provider,
      source: await readFile(
        join(process.cwd(), "examples", "recordings", `${id}.jsonl`),
        "utf8"
      ),
      title,
    }))
  );

export { loadChatPartRecordings };
export type { ChatPartRecording };
