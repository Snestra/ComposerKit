"use client";

/* oxlint-disable typescript/consistent-return -- The effect returns a cleanup only when it starts a timer. */

import { Button } from "@workspace/react/components/ui/button";
import { ConversationView } from "@workspace/react/components/ui/conversation-view";
import type {
  ConversationAssistantAction,
  ConversationTurn,
} from "@workspace/react/components/ui/conversation-view";
import { useEffect, useState } from "react";

const CONVERSATION_ID = "019a0000-0000-7000-8000-000000000001";

const turns: ConversationTurn[] = [
  {
    assistantMessage: {
      id: "turn-1-agent",
      markdown:
        "A **closure** is a function that keeps access to the variables of the scope where it was created, even after that scope has returned.\n\n```js\nfunction counter() {\n  let count = 0;\n  return () => ++count;\n}\n\nconst next = counter();\nnext(); // 1\nnext(); // 2\n```\n\nEach call to `counter()` makes a new `count`, so two counters never share state.",
      status: "completed",
    },
    id: "turn-1",
    userMessage: {
      id: "turn-1-user",
      text: "Explain what a closure is in JavaScript.",
    },
  },
  {
    assistantMessage: {
      id: "turn-2-agent",
      markdown:
        "Use a closure when a function needs private state:\n\n1. Counters and IDs that should not be global.\n2. Event handlers that remember their element.\n3. Factories that return configured functions.",
      status: "completed",
    },
    id: "turn-2",
    userMessage: { id: "turn-2-user", text: "When would I use one?" },
  },
];

const streamedReply =
  "A closure also lets you build a function once and reuse it with the values it captured.";

const STREAM_STEP = 6;
const STREAM_TICK_MS = 60;

const ConversationViewGalleryExample = () => {
  const [streamed, setStreamed] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState("");

  useEffect(() => {
    if (streamed === null || streamed >= streamedReply.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStreamed(streamed + STREAM_STEP);
    }, STREAM_TICK_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [streamed]);

  const assistantActions: ConversationAssistantAction[] = [
    {
      id: "retry",
      label: "Try again",
      onSelect: (turn) => {
        setLastAction(`Try again on ${turn.id}`);
      },
    },
  ];

  const shownTurns: ConversationTurn[] =
    streamed === null
      ? turns
      : [
          ...turns,
          {
            assistantMessage: {
              id: "turn-3-agent",
              markdown: streamedReply.slice(0, streamed),
              status:
                streamed >= streamedReply.length ? "completed" : "streaming",
            },
            id: "turn-3",
            userMessage: { id: "turn-3-user", text: "Anything else?" },
          },
        ];

  return (
    // The desktop host's appearance: the system font and a 14px chat size on the main surface.
    <main className="flex h-dvh flex-col bg-panel font-sans text-foreground [--font-sans:var(--ck-default-sans)] [--ui-message-text-size:14px]">
      <ConversationView
        assistantActions={assistantActions}
        className="flex-1"
        conversationId={CONVERSATION_ID}
        onEditUserMessage={(turn) => {
          setLastAction(`Edit ${turn.id}`);
        }}
        turns={shownTurns}
      />
      <footer className="flex items-center gap-3 border-t px-4 py-2 text-sm">
        <Button
          color="secondary"
          disabled={streamed !== null && streamed < streamedReply.length}
          onClick={() => {
            setStreamed(0);
          }}
        >
          Stream a reply
        </Button>
        <output aria-live="polite">{lastAction}</output>
      </footer>
    </main>
  );
};

export { ConversationViewGalleryExample };
