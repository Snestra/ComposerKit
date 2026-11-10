"use client";

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The transcript scrolls with the keyboard, so its region takes focus. */

import { CopyActionButton } from "@workspace/react/components/markdown/copy-action-button";
import { MarkdownProse } from "@workspace/react/components/markdown/prose";
import { AssistantMessageBody } from "@workspace/react/components/ui/assistant-message-body";
import { Button } from "@workspace/react/components/ui/button";
import { copyMarkdownText } from "@workspace/react/components/ui/markdown";
import { Menu, MenuItem } from "@workspace/react/components/ui/menu";
import { MessageBubble } from "@workspace/react/components/ui/message-bubble";
import { MessageTurnGap } from "@workspace/react/components/ui/message-turn-dividers";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { Ellipsis, Pencil } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";

interface ConversationUserMessage {
  id: string;
  text: string;
}

interface ConversationAssistantMessage {
  id: string;
  markdown: string;
  status: "streaming" | "completed";
}

interface ConversationTurn {
  id: string;
  userMessage: ConversationUserMessage;
  assistantMessage?: ConversationAssistantMessage;
}

interface ConversationAssistantAction {
  id: string;
  label: ReactNode;
  onSelect: (turn: ConversationTurn) => void;
}

type ConversationViewProps = Omit<ComponentProps<"section">, "children"> & {
  conversationId: string;
  turns: readonly ConversationTurn[];
  assistantActions?: readonly ConversationAssistantAction[];
  onCopyMessage?: (
    text: string,
    messageId: string
  ) => boolean | Promise<boolean>;
  onEditUserMessage?: (turn: ConversationTurn) => void;
};

type AnsweredTurn = ConversationTurn & {
  assistantMessage: ConversationAssistantMessage;
};

/** Distance from the bottom, in pixels, that still counts as following the latest turn. */
const FOLLOW_SLACK_PX = 48;

const EMPTY_ACTIONS: readonly ConversationAssistantAction[] = [];

const copyText = async (
  onCopyMessage: ConversationViewProps["onCopyMessage"],
  text: string,
  messageId: string
): Promise<boolean> => {
  if (onCopyMessage) {
    return await onCopyMessage(text, messageId);
  }

  return await copyMarkdownText(text);
};

const isAnswered = (turn: ConversationTurn): turn is AnsweredTurn =>
  turn.assistantMessage !== undefined;

const SpeakerHeading = ({
  speaker,
  children,
}: {
  speaker: "user" | "assistant";
  children: string;
}) => (
  <h4
    className="sr-only m-0 select-none"
    data-ck-conversation-role={speaker}
    tabIndex={speaker === "assistant" ? -1 : undefined}
  >
    <span>{children}</span>
  </h4>
);

interface UserMessageProps {
  turn: ConversationTurn;
  isLatestTurn: boolean;
  onCopyMessage: ConversationViewProps["onCopyMessage"];
  onEditUserMessage: ConversationViewProps["onEditUserMessage"];
}

const UserMessage = ({
  turn,
  isLatestTurn,
  onCopyMessage,
  onEditUserMessage,
}: UserMessageProps) => {
  const { userMessage } = turn;

  return (
    <div className="flex flex-col">
      <div
        className="scroll-mt-4"
        data-conversation-user-anchor
        data-turn-unit={`${turn.id}:${userMessage.id}`}
      >
        <div className="flex flex-col items-end gap-2">
          <SpeakerHeading speaker="user">You said:</SpeakerHeading>
          <div className="group/user-message flex w-full flex-col items-end gap-1">
            <MessageBubble>
              <div className="flex flex-col items-end gap-1">
                <div className="relative w-full min-w-0 text-size-chat leading-relaxed">
                  <div className="text-size-chat whitespace-pre-wrap">
                    <MarkdownProse
                      className="[&_ol]:ps-6! [&_ul]:ps-6! [&>p]:m-0! [&>p+p]:mt-5!"
                      textStyle={{ tone: "user-message" }}
                    >
                      {userMessage.text}
                    </MarkdownProse>
                  </div>
                </div>
              </div>
            </MessageBubble>
            <div className="flex flex-row-reverse items-center gap-1">
              <div className="isolate ms-1 me-1 flex items-center gap-2 opacity-0 group-focus-within/user-message:opacity-100 group-hover/user-message:opacity-100 [@media(hover:none)]:opacity-100">
                <div className="flex items-center gap-0.5">
                  <CopyActionButton
                    label="Copy message"
                    onCopy={async () =>
                      await copyText(
                        onCopyMessage,
                        userMessage.text,
                        userMessage.id
                      )
                    }
                    variant="messageAction"
                  />
                  {isLatestTurn && onEditUserMessage && (
                    <TooltipHint content="Edit message">
                      <Button
                        aria-label="Edit message"
                        color="ghost"
                        onClick={() => {
                          onEditUserMessage(turn);
                        }}
                        size="icon"
                      >
                        <Pencil aria-hidden className="icon-xs" />
                      </Button>
                    </TooltipHint>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AssistantMessageProps {
  conversationId: string;
  turn: AnsweredTurn;
  isLatestTurn: boolean;
  assistantActions: readonly ConversationAssistantAction[];
  onCopyMessage: ConversationViewProps["onCopyMessage"];
}

const AssistantMessage = ({
  conversationId,
  turn,
  isLatestTurn,
  assistantActions,
  onCopyMessage,
}: AssistantMessageProps) => {
  const { assistantMessage } = turn;
  const completed = assistantMessage.status === "completed";

  return (
    <div className="flex flex-col" data-conversation-final-assistant>
      <div
        className="group flex min-w-0 flex-col"
        data-turn-unit={`${turn.id}:${assistantMessage.id}`}
      >
        <SpeakerHeading speaker="assistant">The assistant said:</SpeakerHeading>
        <output aria-atomic aria-live="polite" className="sr-only" />
        <AssistantMessageBody
          animate
          completed={completed}
          conversationId={conversationId}
          messageId={assistantMessage.id}
        >
          {assistantMessage.markdown}
        </AssistantMessageBody>
        {completed && (
          <div className="mt-1.5 flex min-h-5 min-w-0 flex-wrap items-center justify-start gap-0.5">
            <div
              className={cn(
                "flex min-h-5 min-w-0 flex-wrap items-center gap-0.5",
                !isLatestTurn &&
                  "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
              )}
            >
              <CopyActionButton
                label="Copy"
                onCopy={async () =>
                  await copyText(
                    onCopyMessage,
                    assistantMessage.markdown,
                    assistantMessage.id
                  )
                }
                variant="messageAction"
              />
              {assistantActions.length > 0 && (
                <Menu
                  align="start"
                  triggerButton={
                    <Button aria-label="More actions" color="ghost" size="icon">
                      <Ellipsis aria-hidden className="icon-xs" />
                    </Button>
                  }
                >
                  {assistantActions.map((action) => (
                    <MenuItem
                      key={action.id}
                      onSelect={() => {
                        action.onSelect(turn);
                      }}
                    >
                      {action.label}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TurnProps extends UserMessageProps {
  conversationId: string;
  assistantActions: readonly ConversationAssistantAction[];
}

const Turn = ({
  conversationId,
  turn,
  isLatestTurn,
  assistantActions,
  onCopyMessage,
  onEditUserMessage,
}: TurnProps) => (
  <div data-ck-turn-key={turn.id}>
    <div className="flex flex-col gap-0">
      <UserMessage
        isLatestTurn={isLatestTurn}
        onCopyMessage={onCopyMessage}
        onEditUserMessage={onEditUserMessage}
        turn={turn}
      />
      {isAnswered(turn) && (
        <>
          <MessageTurnGap />
          <AssistantMessage
            assistantActions={assistantActions}
            conversationId={conversationId}
            isLatestTurn={isLatestTurn}
            onCopyMessage={onCopyMessage}
            turn={turn}
          />
        </>
      )}
    </div>
  </div>
);

/**
 * The local conversation thread: a focusable scroll region holding one block
 * per turn, a user bubble and the assistant reply below it. It follows the
 * latest turn while the reader stays at the bottom.
 */
const ConversationView = ({
  conversationId,
  turns,
  assistantActions = EMPTY_ACTIONS,
  onCopyMessage,
  onEditUserMessage,
  className,
  ...props
}: ConversationViewProps) => {
  const scrollRef = useRef<HTMLElement>(null);
  const following = useRef(true);
  const latest = turns.at(-1);

  // Runs after every render: new turns and streamed text both grow the content.
  useLayoutEffect(() => {
    const element = scrollRef.current;

    if (element && following.current) {
      element.scrollTop = element.scrollHeight;
    }
  });

  return (
    <section
      {...props}
      aria-label="Conversation"
      className={cn(
        "min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
      onScroll={(event) => {
        const element = event.currentTarget;
        following.current =
          element.scrollHeight - element.scrollTop - element.clientHeight <=
          FOLLOW_SLACK_PX;
      }}
      ref={scrollRef}
      tabIndex={0}
    >
      <div className="mx-auto flex min-h-full w-full max-w-(--ck-chat-content-max-width) flex-col px-4 [--ck-chat-content-max-width:48rem]">
        <div
          className="relative flex flex-col gap-3"
          data-ck-conversation-id={conversationId}
        >
          <div className="flex flex-col">
            {turns.map((turn) => (
              <Turn
                assistantActions={assistantActions}
                conversationId={conversationId}
                isLatestTurn={turn === latest}
                key={turn.id}
                onCopyMessage={onCopyMessage}
                onEditUserMessage={onEditUserMessage}
                turn={turn}
              />
            ))}
          </div>
        </div>
        <h4 className="sr-only">Latest response</h4>
        <output aria-live="polite" className="sr-only" />
      </div>
    </section>
  );
};

export { ConversationView };

export type {
  ConversationAssistantAction,
  ConversationAssistantMessage,
  ConversationTurn,
  ConversationUserMessage,
  ConversationViewProps,
};
