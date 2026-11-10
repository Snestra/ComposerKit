"use client";

import { ResourceRow } from "composerkit/components/list/rows";
import { AssistantMessageBody } from "composerkit/components/ui/assistant-message-body";
import { CollapsibleUserMessage } from "composerkit/components/ui/collapsible-user-message";
import { MessageBubble } from "composerkit/components/ui/message-bubble";
import {
  CitationBibliography,
  CitationPill,
  ClinicalCitation,
} from "composerkit/components/ui/message-citation";
import type { CitationSource } from "composerkit/components/ui/message-citation";
import {
  CollapsedTurnDisclosure,
  MessageTurnGap,
  TimestampSeparator,
  WorkedFor,
  WorkedForDivider,
} from "composerkit/components/ui/message-turn-dividers";
import type { WorkStatus } from "composerkit/components/ui/message-turn-dividers";
import { RequestActionChip } from "composerkit/components/ui/request-action-chip";
import { StreamingText } from "composerkit/components/ui/streaming-text";
import Link from "next/link";
import { useState } from "react";

const sources: CitationSource[] = [
  {
    authors: "Example",
    dateDisplay: "2026",
    displayLabel: "Example",
    number: 1,
    sourceKey: "1",
    sourceName: "Example",
    title: "A sample message.",
    url: "#citation",
  },
  {
    displayLabel: "Example",
    number: 2,
    sourceKey: "2",
    sourceName: "Example",
    title: "A sample reply.",
  },
];

const resources = ["1", "2", "3", "4"].map((id) => ({
  content: <ResourceRow title={`Example ${id}`} />,
  id,
}));

const longText = Array.from({ length: 30 }, () => "A sample message.").join(
  "\n"
);

const veryLongText = "A sample message. ".repeat(700);

const streamingText = "A sample message. ".repeat(20);

const now = Date.UTC(2026, 10, 3, 12);

const statuses: WorkStatus[] = [
  "loading",
  "unknown",
  "paused",
  "working",
  "worked",
  "stopped",
];

const MessageTurnGalleryExample = () => {
  const [expanded, setExpanded] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [analysis, setAnalysis] = useState(false);
  const [browser, setBrowser] = useState(false);

  const [followUpTarget, setFollowUpTarget] = useState<HTMLDivElement | null>(
    null
  );

  const [composerTarget, setComposerTarget] = useState<HTMLDivElement | null>(
    null
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
      <header className="flex items-center gap-4">
        <Link className="underline" href="/gallery">
          Back to gallery
        </Link>
        <h1 className="text-title-lg font-semibold">Message Turn</h1>
      </header>
      <section
        className="flex flex-col items-start gap-4"
        aria-label="Bubble variants"
      >
        <h2>Bubble variants</h2>
        <MessageBubble>A sample message.</MessageBubble>
        <MessageBubble alignment="start">A sample message.</MessageBubble>
        <MessageBubble isAeonFormatted>A sample message.</MessageBubble>
        <MessageBubble isFromOtherUser>A sample message.</MessageBubble>
        <MessageBubble accentColor="#e02e2a">A sample message.</MessageBubble>
        <MessageBubble isTemporaryChat>A sample message.</MessageBubble>
        <MessageBubble hasPrompt={false}>A sample message.</MessageBubble>
      </section>
      <section aria-label="Long user message">
        <h2>Long user message</h2>
        <MessageBubble>
          <CollapsibleUserMessage text={longText} textTone="user-message">
            <div className="whitespace-pre-wrap">
              {longText}
              <a href="#citation">Example</a>
            </div>
          </CollapsibleUserMessage>
        </MessageBubble>
        <MessageBubble>
          <CollapsibleUserMessage
            collapseIndicator="fade"
            collapsedLineCount={3}
            text={longText}
          >
            <div className="whitespace-pre-wrap">{longText}</div>
          </CollapsibleUserMessage>
        </MessageBubble>
        <MessageBubble>
          <CollapsibleUserMessage collapsedLineCount={3} text={veryLongText}>
            {(text) => <span>{text}</span>}
          </CollapsibleUserMessage>
        </MessageBubble>
      </section>
      <section aria-label="Timestamps and spacing">
        <h2>Timestamps and spacing</h2>
        {[0, 1, 4, 20, 400].map((days) => (
          <TimestampSeparator
            key={days}
            nowMs={now}
            sentAtMs={now - days * 86_400_000}
          />
        ))}
        <TimestampSeparator compact nowMs={now} sentAtMs={now} />
        <TimestampSeparator nowMs={now} sentAtMs={Number.NaN} />
        <MessageTurnGap />
        <MessageTurnGap grouped />
      </section>
      <section aria-label="Activity">
        <h2>Activity</h2>
        {statuses.map((status) => (
          <div key={status}>
            <WorkedFor
              completedAtMs={now}
              startedAtMs={now - 65_000}
              status={status}
            />
          </div>
        ))}
        <WorkedForDivider
          status="worked"
          startedAtMs={now - 65_000}
          completedAtMs={now}
        />
        <CollapsedTurnDisclosure
          collapsedMessageCount={4}
          deniedActionCount={1}
          expanded={false}
        />
        <CollapsedTurnDisclosure workedDurationMs={65_000} expanded={false} />
        <CollapsedTurnDisclosure
          deniedActionCount={2}
          expanded={expanded}
          onClick={() => {
            setExpanded((value) => !value);
          }}
        >
          Worked for 1m 5s
        </CollapsedTurnDisclosure>
        {expanded && <p>A sample reply.</p>}
      </section>
      <section aria-label="Streaming">
        <h2>Streaming</h2>
        <button
          onClick={() => {
            setStreamComplete(false);
            setAnimate((value) => !value);
          }}
          type="button"
        >
          {animate ? "Stop" : "Start"}
        </button>
        <div data-stream-complete={streamComplete}>
          <StreamingText
            animate={animate}
            key={String(animate)}
            onComplete={() => {
              setStreamComplete(true);
            }}
          >
            {streamingText}
          </StreamingText>
        </div>
      </section>
      <section aria-label="Assistant message">
        <h2>Assistant message</h2>
        <AssistantMessageBody
          completed
          conversationId="example"
          followUpPlacement="below_message"
          followUpTarget={followUpTarget}
          followUps={[
            {
              content: (
                <RequestActionChip radius="messageBubble">
                  Example
                </RequestActionChip>
              ),
              id: "example",
            },
          ]}
          messageId="example"
          onOpenCloudBrowser={() => {
            setBrowser((value) => !value);
          }}
          onViewAnalysis={() => {
            setAnalysis((value) => !value);
          }}
          resources={resources}
        >
          A sample reply.
        </AssistantMessageBody>
        <div ref={setFollowUpTarget} />
        <AssistantMessageBody
          completed
          conversationId="example"
          messageId="above-composer"
          followUpPlacement="above_composer"
          followUpTarget={composerTarget}
          followUps={[
            {
              content: (
                <RequestActionChip radius="messageBubble">
                  Example
                </RequestActionChip>
              ),
              id: "above",
            },
          ]}
        >
          A sample reply.
        </AssistantMessageBody>
        <div ref={setComposerTarget} />
        {analysis && <p>View analysis</p>}
        {browser && <p>Open cloud browser</p>}
        <AssistantMessageBody
          completed
          conversationId="example"
          messageId="bidi"
        >
          Hello שלום
        </AssistantMessageBody>
        <AssistantMessageBody
          animate
          completed={false}
          conversationId="example"
          isReadOnly
          messageId="read-only"
        >
          A sample reply.
        </AssistantMessageBody>
        <AssistantMessageBody
          animate
          completed={false}
          conversationId="example"
          isPresented={false}
          messageId="not-presented"
        >
          A sample reply.
        </AssistantMessageBody>
        <AssistantMessageBody
          animate
          completed={false}
          conversationId="example"
          messageId="streaming"
        >
          {streamingText}
        </AssistantMessageBody>
      </section>
      <section id="citation" aria-label="Citations">
        <h2>Citations</h2>
        <ClinicalCitation sources={sources} />
        <CitationBibliography sources={sources} />
        <div>
          <CitationPill label="Example" />
          <CitationPill isActive label="Example" supportingCountLabel="+1" />
          <CitationPill
            label="Example"
            supportingCountLabel="+1"
            variant="file"
          />
          <CitationPill disabled label="Example" />
          <CitationPill href="#citation" label="Example" />
          <RequestActionChip radius="messageBubble" transcript>
            Example
          </RequestActionChip>
        </div>
      </section>
    </main>
  );
};

export { MessageTurnGalleryExample };
