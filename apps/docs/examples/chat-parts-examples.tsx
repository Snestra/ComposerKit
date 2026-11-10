"use client";

import { AttachmentPart } from "composerkit/components/attachment/attachment";
import { ReasoningPart } from "composerkit/components/reasoning/reasoning";
import { ToolCallPart } from "composerkit/components/tool-call/tool-call";
import type { ChatPartState } from "composerkit/lib/chat-part-state";
import { replayChatStream } from "composerkit/lib/chat-stream";
import { useReducedMotion } from "composerkit/lib/reduced-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ChatPartRecording } from "./chat-parts-recordings";

type PartKind = "attachment" | "reasoning" | "tool";
type Fixture = "demo" | "empty" | "one" | "thousand" | "worst";
type ReplayStatus = "done" | "paused" | "playing";

interface ParsedRecording extends ChatPartRecording {
  lines: readonly string[];
}

interface ReplayPosition {
  cursor: number;
  recordingId: string;
  status: "paused" | "playing";
}

const REPLAY_STEP_MS = 120;
const BUTTON_CLASSES =
  "min-h-10 rounded-lg border border-border bg-panel px-3 text-sm text-text hover:bg-panel-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const LINE_BREAK = /\r?\n/u;

interface ChatPartsGalleryExampleProps {
  kind: PartKind;
  recordings: readonly ChatPartRecording[];
}

const partNames = {
  attachment: "attachment",
  reasoning: "reasoning summary",
  tool: "tool call",
} as const;

const pageTitles = {
  attachment: "Attachment parts from published example streams",
  reasoning: "Reasoning parts from published example streams",
  tool: "Tool call parts from published example streams",
} as const;

const initialRecording = {
  attachment: "vercel-clean",
  reasoning: "anthropic-clean",
  tool: "openai-clean",
} as const;

const demoParts: Record<PartKind, readonly ChatPartState[]> = {
  attachment: [
    {
      id: "attachment-pending",
      key: "attachment-pending",
      kind: "attachment",
      mediaType: "application/pdf",
      name: "Launch plan.pdf",
      size: 0,
      status: "pending",
    },
    {
      id: "attachment-streaming",
      key: "attachment-streaming",
      kind: "attachment",
      mediaType: "image/png",
      name: "Weather chart.png",
      size: 128_400,
      status: "streaming",
    },
    {
      id: "https://example.com/weather-chart.png",
      key: "attachment-done",
      kind: "attachment",
      mediaType: "image/png",
      name: "Weather chart.png",
      size: 128_400,
      status: "done",
      url: "https://example.com/weather-chart.png",
    },
    {
      id: "attachment-error",
      key: "attachment-error",
      kind: "attachment",
      mediaType: "text/csv",
      name: "Forecasts.csv",
      error: "The attachment upload failed. Try the upload again.",
      status: "error",
    },
  ],
  reasoning: [
    {
      id: "reasoning-pending",
      key: "reasoning-pending",
      kind: "reasoning",
      status: "pending",
      text: "",
    },
    {
      id: "reasoning-streaming",
      key: "reasoning-streaming",
      kind: "reasoning",
      status: "streaming",
      text: "I should check the forecast before answering.",
    },
    {
      id: "reasoning-done",
      key: "reasoning-done",
      kind: "reasoning",
      status: "done",
      text: "I checked the forecast and found that a coat is unnecessary.",
    },
    {
      id: "reasoning-error",
      key: "reasoning-error",
      kind: "reasoning",
      error: "The provider connection failed before the summary completed.",
      status: "error",
      text: "I should check the forecast",
    },
  ],
  tool: [
    {
      argumentsText: "",
      id: "call_pending",
      key: "call_pending",
      kind: "tool",
      name: "get_weather",
      outputText: "",
      status: "pending",
    },
    {
      argumentsText: '{"location":"San',
      id: "call_streaming",
      key: "call_streaming",
      kind: "tool",
      name: "get_weather",
      outputText: "",
      status: "streaming",
    },
    {
      argumentsText: '{\n  "location": "San Francisco"\n}',
      id: "call_done",
      input: { location: "San Francisco" },
      key: "call_done",
      kind: "tool",
      name: "get_weather",
      outputText: '{\n  "temperatureF": 68\n}',
      status: "done",
    },
    {
      argumentsText: '{"location":"San',
      error: "The stream ended before the tool arguments completed.",
      id: "call_error",
      key: "call_error",
      kind: "tool",
      name: "get_weather",
      outputText: "",
      status: "error",
    },
  ],
};

const worstParts: Record<PartKind, readonly ChatPartState[]> = {
  attachment: [
    {
      id: "worst-attachment-pending",
      key: "worst-attachment-pending",
      kind: "attachment",
      mediaType: "",
      name: "",
      size: 0,
      status: "pending",
    },
    {
      id: "worst-attachment-streaming",
      key: "worst-attachment-streaming",
      kind: "attachment",
      mediaType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      name: "Q3 Board Deck FINAL (revised) v12 [approved by legal].docx",
      size: 12_345_678.9,
      status: "streaming",
    },
    {
      id: "worst-attachment-done",
      key: "worst-attachment-done",
      kind: "attachment",
      mediaType: "text/plain",
      name: "王秀英の天気予報، الرياض، Đặng Thị Ngọc Hân 👩🏽‍💻.txt",
      size: Number.MAX_VALUE,
      status: "done",
      url: "https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved",
    },
    {
      id: "worst-attachment-error",
      key: "worst-attachment-error",
      kind: "attachment",
      mediaType: "image/heic",
      name: "IMG_20250914_183022_HDR_portrait_edited_edited.HEIC",
      size: Number.NaN,
      error:
        "The attachment service returned an unbounded error message that must remain readable at 320 pixels and at 200 percent zoom without hiding the failure from the reader.",
      status: "error",
    },
  ],
  reasoning: [
    {
      id: "worst-reasoning-pending",
      key: "worst-reasoning-pending",
      kind: "reasoning",
      status: "pending",
      text: "",
    },
    {
      id: "worst-reasoning-streaming",
      key: "worst-reasoning-streaming",
      kind: "reasoning",
      status: "streaming",
      text: 'Đặng Thị Ngọc Hân\nنور الهدى عبد الرحمن\n👩🏽‍💻 Priya checks an unbalanced object: {"filters":[',
    },
    {
      id: "worst-reasoning-done",
      key: "worst-reasoning-done",
      kind: "reasoning",
      status: "done",
      text: "Benachrichtigungseinstellungen remains one long German word. This summary also contains a realistic long identifier, bartholomew.fitzgerald@northwind-industries-holdings.example.com, and a number with separators, 1,284,000.9.",
    },
    {
      id: "worst-reasoning-error",
      key: "worst-reasoning-error",
      kind: "reasoning",
      error:
        "TypeError: Cannot read properties of undefined (reading 'summary')",
      status: "error",
      text: "The partial summary remains available.",
    },
  ],
  tool: [
    {
      argumentsText: "",
      id: "worst-tool-pending",
      key: "worst-tool-pending",
      kind: "tool",
      name: "",
      outputText: "",
      status: "pending",
    },
    {
      argumentsText:
        '{"query":"bartholomew.fitzgerald@northwind-industries-holdings.example.com","filters":{"include":[',
      id: "worst-tool-streaming",
      key: "worst-tool-streaming",
      kind: "tool",
      name: "retrieveCustomerFeedbackFromEnterpriseOnboardingForPlatformInfrastructure",
      outputText: "",
      status: "streaming",
    },
    {
      argumentsText:
        '{\n  "workspace": "王秀英のワークスペース",\n  "members": 1284000000000000000000\n}',
      id: "worst-tool-done",
      input: { members: 1.284e21, workspace: "王秀英のワークスペース" },
      key: "worst-tool-done",
      kind: "tool",
      name: "王秀英のワークスペースを検索",
      outputText:
        '{\n  "matches": 0,\n  "elapsedMilliseconds": 0.30000000000000004\n}',
      status: "done",
    },
    {
      argumentsText: '{"query":"<script>alert(1)</script>"}',
      error:
        "The tool failed with a long provider message that stays readable instead of overflowing its container or hiding the actual cause from the person diagnosing the failed call.",
      id: "worst-tool-error",
      key: "worst-tool-error",
      kind: "tool",
      name: "tool_with_a_name_that_has_no_natural_break_opportunities_9f8e7d6c5b4a",
      outputText: "",
      status: "error",
    },
  ],
};

const thousandAttachments: readonly ChatPartState[] = Array.from(
  { length: 1000 },
  (_, index) => ({
    id: `attachment-${index}`,
    key: `attachment-${index}`,
    kind: "attachment" as const,
    mediaType: "application/pdf",
    name: `Q3 Board Deck FINAL (revised) v${index + 1} [approved by legal].pdf`,
    size: index * 1_000_000,
    status: "done" as const,
    url: `https://example.com/reports/report-${index + 1}.pdf`,
  })
);

const parseRecording = (recording: ChatPartRecording): ParsedRecording => ({
  ...recording,
  lines: recording.source
    .split(LINE_BREAK)
    .filter((line) => line.trim() !== ""),
});

/** A recording belongs on a page when its replay shows that page's part at some point. */
const showsKind = (recording: ParsedRecording, kind: PartKind): boolean =>
  recording.lines.some((_, index) =>
    replayChatStream(recording.provider, recording.lines, index + 1).parts.some(
      (part) => part.kind === kind
    )
  );

const renderPart = (part: ChatPartState): ReactNode => {
  switch (part.kind) {
    case "attachment": {
      return <AttachmentPart key={part.key} state={part} />;
    }

    case "reasoning": {
      return <ReasoningPart key={part.key} state={part} />;
    }

    case "tool": {
      return <ToolCallPart key={part.key} state={part} />;
    }
  }
};

const fixtureParts = (
  kind: PartKind,
  fixture: Fixture
): readonly ChatPartState[] => {
  switch (fixture) {
    case "empty": {
      return [];
    }

    case "one": {
      return demoParts[kind].slice(0, 1);
    }

    case "worst": {
      return worstParts[kind];
    }

    case "thousand": {
      return thousandAttachments;
    }

    case "demo": {
      return demoParts[kind];
    }
  }
};

const replayStatusOf = (
  position: ReplayPosition,
  cursor: number,
  total: number
): ReplayStatus => {
  if (cursor >= total) {
    return "done";
  }

  return position.status;
};

const ChatPartsGalleryExample = ({
  kind,
  recordings,
}: ChatPartsGalleryExampleProps) => {
  const parsedRecordings = useMemo(
    () =>
      recordings
        .map(parseRecording)
        .filter((recording) => showsKind(recording, kind)),
    [kind, recordings]
  );
  const [position, setPosition] = useState<ReplayPosition>({
    cursor: 0,
    recordingId: initialRecording[kind],
    status: "playing",
  });
  const [fixture, setFixture] = useState<Fixture>("demo");
  const reducedMotion = useReducedMotion();
  const recording =
    parsedRecordings.find(
      (candidate) => candidate.id === position.recordingId
    ) ?? parsedRecordings[0];
  const total = recording.lines.length;
  // Reduced motion replays the whole stream at once instead of on a timer.
  const cursor =
    reducedMotion && position.status === "playing"
      ? total
      : Math.min(position.cursor, total);
  const replayStatus = replayStatusOf(position, cursor, total);

  useEffect(() => {
    if (replayStatus !== "playing") {
      return;
    }

    const timer = window.setTimeout(() => {
      setPosition((current) => ({ ...current, cursor: current.cursor + 1 }));
    }, REPLAY_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [cursor, replayStatus]);

  const state = useMemo(
    () => replayChatStream(recording.provider, recording.lines, cursor),
    [cursor, recording]
  );

  const currentParts = state.parts.filter((part) => part.kind === kind);
  const fixtures = fixtureParts(kind, fixture);
  const fixtureOptions: readonly { label: string; value: Fixture }[] = [
    { label: "Demo data", value: "demo" },
    { label: "Worst case", value: "worst" },
    { label: "Empty", value: "empty" },
    { label: "One", value: "one" },
    ...(kind === "attachment"
      ? [{ label: "1,000 rows", value: "thousand" as const }]
      : []),
  ];

  const play = (recordingId: string) => {
    setPosition({ cursor: 0, recordingId, status: "playing" });
  };

  const stepTo = (next: number) => {
    setPosition({
      cursor: Math.max(0, Math.min(total, next)),
      recordingId: recording.id,
      status: "paused",
    });
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 pb-24 text-foreground">
      <header className="flex flex-col items-start gap-3">
        <Link className="underline" href="/gallery">
          Back to gallery
        </Link>
        <h1 className="text-title-lg font-semibold">{pageTitles[kind]}</h1>
        <p className="max-w-prose text-sm leading-6 text-text-muted">
          No provider API keys are available. These demos replay JSONL
          recordings assembled from the providers&apos; published example
          payloads.
        </p>
      </header>
      <section
        aria-labelledby={`${kind}-replay-heading`}
        className="flex flex-col gap-4"
        data-chat-part-demo={kind}
        data-replay-cursor={cursor}
        data-replay-recording={recording.id}
        data-replay-status={replayStatus}
        data-replay-total={total}
      >
        <h2 id={`${kind}-replay-heading`}>Replay a published example stream</h2>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor={`${kind}-recording`}>
            Recording
          </label>
          <select
            className="min-h-10 max-w-full rounded-lg border border-border bg-panel px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            id={`${kind}-recording`}
            onChange={(event) => play(event.target.value)}
            value={recording.id}
          >
            {parsedRecordings.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </div>
        <div
          aria-label="Replay controls"
          className="flex flex-wrap gap-2"
          role="group"
        >
          <button
            className={BUTTON_CLASSES}
            onClick={() => play(recording.id)}
            type="button"
          >
            Replay from start
          </button>
          <button
            className={BUTTON_CLASSES}
            onClick={() =>
              replayStatus === "playing" ? stepTo(cursor) : play(recording.id)
            }
            type="button"
          >
            {replayStatus === "playing" ? "Pause" : "Play"}
          </button>
          <button
            className={BUTTON_CLASSES}
            onClick={() => stepTo(cursor - 1)}
            type="button"
          >
            Previous event
          </button>
          <button
            className={BUTTON_CLASSES}
            onClick={() => stepTo(cursor + 1)}
            type="button"
          >
            Next event
          </button>
        </div>
        <p className="text-sm text-text-muted">
          Event {cursor} of {total}. Replay {replayStatus}. Attempt{" "}
          {state.attempt}.
        </p>
        <div className="flex flex-col gap-3">
          {currentParts.length > 0 ? (
            currentParts.map(renderPart)
          ) : (
            <p className="rounded-xl border border-border bg-panel p-4 text-sm text-text-muted">
              No {partNames[kind]} parts appear at this point in the recording.
            </p>
          )}
        </div>
        <details className="rounded-xl border border-border bg-panel p-4">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Raw JSONL recording
          </summary>
          <pre
            className="mt-3 max-h-80 overflow-auto font-mono text-xs leading-5 wrap-anywhere whitespace-pre-wrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            tabIndex={0}
          >
            {recording.source}
          </pre>
        </details>
      </section>
      <section
        aria-labelledby={`${kind}-fixtures-heading`}
        className="flex flex-col gap-4"
      >
        <h2 id={`${kind}-fixtures-heading`}>State and worst-case fixtures</h2>
        <p className="text-sm text-text-muted">
          {fixtures.length.toLocaleString("en-US")} {partNames[kind]} states in
          this fixture.
        </p>
        <div className="flex flex-col gap-3">
          {fixtures.length > 0 ? (
            fixtures.map(renderPart)
          ) : (
            <p className="rounded-xl border border-border bg-panel p-4 text-sm text-text-muted">
              No {partNames[kind]} parts. The empty state remains readable.
            </p>
          )}
        </div>
      </section>
      <div
        aria-label="Fixture data"
        className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full border border-border bg-panel p-1 shadow-lg"
        role="group"
      >
        {fixtureOptions.map((option) => (
          <button
            aria-pressed={fixture === option.value}
            className="min-h-9 shrink-0 rounded-full px-3 text-xs whitespace-nowrap text-text hover:bg-panel-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-text aria-pressed:text-background"
            key={option.value}
            onClick={() => setFixture(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </main>
  );
};

const ToolCallGalleryExample = ({
  recordings,
}: Pick<ChatPartsGalleryExampleProps, "recordings">) => (
  <ChatPartsGalleryExample kind="tool" recordings={recordings} />
);

const ReasoningGalleryExample = ({
  recordings,
}: Pick<ChatPartsGalleryExampleProps, "recordings">) => (
  <ChatPartsGalleryExample kind="reasoning" recordings={recordings} />
);

const AttachmentGalleryExample = ({
  recordings,
}: Pick<ChatPartsGalleryExampleProps, "recordings">) => (
  <ChatPartsGalleryExample kind="attachment" recordings={recordings} />
);

export {
  AttachmentGalleryExample,
  ReasoningGalleryExample,
  ToolCallGalleryExample,
};
