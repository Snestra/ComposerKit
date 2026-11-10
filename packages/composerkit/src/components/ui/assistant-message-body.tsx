"use client";

// Lucide artwork is covered by components/icon/lucide.license.

import { artwork } from "composerkit/components/file-preview/file-type-artwork";
import { createIcon } from "composerkit/components/icon";
import { SharedChevronRightIcon } from "composerkit/components/icon/glyphs";
import { MarkdownProse } from "composerkit/components/markdown/prose";
import { Button } from "composerkit/components/ui/button";
import { ExpandableList } from "composerkit/components/ui/summary-list";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface AssistantMessageResource {
  id: string;
  content: ReactNode;
}

interface AssistantMessageBodyProps {
  animate?: boolean;
  children: string;
  completed: boolean;
  conversationId: string;
  isPresented?: boolean;
  isReadOnly?: boolean;
  messageId: string;
  sourceMessageIds?: readonly string[];
  resources?: readonly AssistantMessageResource[];
  onOpenCloudBrowser?: () => void;
  onViewAnalysis?: () => void;
  moderationDisclaimers?: ReactNode;
  followUps?: readonly AssistantMessageResource[];
  followUpPlacement?: "inline" | "below_message" | "above_composer";
  followUpTarget?: HTMLElement | null;
}

const BrowserUseIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M10 4v4"></path><path d="M2 8h20"></path><path d="M6 4v4"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "browser-use",
});

const AnalysisIcon = createIcon(artwork["code-16"]);

const EMPTY_RESOURCES: readonly AssistantMessageResource[] = [];

const FollowUpPortal = ({
  followUps,
  followUpPlacement,
  followUpTarget,
}: Pick<
  AssistantMessageBodyProps,
  "followUps" | "followUpPlacement" | "followUpTarget"
>) => {
  if (followUpPlacement === "inline" || !followUpTarget || !followUps) {
    return null;
  }

  return createPortal(
    <div className="flex min-w-0 gap-2 overflow-x-auto overflow-y-hidden pb-4 select-none md:justify-center-safe">
      {followUps.map((followUp) => (
        <span key={followUp.id}>{followUp.content}</span>
      ))}
    </div>,
    followUpTarget
  );
};

const selectionMessageId = (
  completed: boolean,
  sourceMessageIds: readonly string[] | undefined,
  messageId: string
) =>
  completed && (sourceMessageIds?.length ?? 1) === 1
    ? (sourceMessageIds?.[0] ?? messageId)
    : undefined;

const AssistantMessageBody = ({
  animate = false,
  children,
  completed,
  conversationId,
  isPresented = true,
  isReadOnly = false,
  messageId,
  sourceMessageIds,
  resources = EMPTY_RESOURCES,
  onOpenCloudBrowser,
  onViewAnalysis,
  moderationDisclaimers,
  followUps = EMPTY_RESOURCES,
  followUpPlacement = "inline",
  followUpTarget,
}: AssistantMessageBodyProps) => {
  const selectedMessageId = selectionMessageId(
    completed,
    sourceMessageIds,
    messageId
  );

  return (
    <div
      className="group flex min-w-0 flex-col"
      data-selection-conversation-id={conversationId}
      data-selection-message-id={selectedMessageId}
    >
      <MarkdownProse
        allowWideBlocks
        animated={animate && !completed && isPresented && !isReadOnly}
        className="[&>*:last-child]:mb-0 [&>ol:first-child]:mt-0 [&>ul:first-child]:mt-0"
        fadeSegmentDelayMs={16}
        fadeSegmentMaxDelayMs={96}
        isStreaming={!completed}
        textStyle={{ kind: "assistant-message" }}
      >
        {children}
      </MarkdownProse>
      {completed && onViewAnalysis && (
        <TooltipHint content="View analysis">
          <Button
            aria-label="View analysis"
            color="secondary"
            onClick={onViewAnalysis}
            radius="full"
            size="iconCircleSm"
            uniform
          >
            <AnalysisIcon />
          </Button>
        </TooltipHint>
      )}
      {completed && resources.length > 0 && (
        <div className="mt-3 w-full max-w-120">
          <ExpandableList
            getKey={(resource) => resource.id}
            items={resources}
            renderPagination={({ isExpanded, nextRevealCount, onToggle }) => (
              <Button color="ghost" onClick={onToggle} size="default">
                {isExpanded
                  ? "Show less"
                  : `${new Intl.NumberFormat().format(nextRevealCount)} more`}
              </Button>
            )}
            visibleItemIncrement={resources.length}
            visibleItemLimit={3}
          >
            {(resource): ReactNode => resource.content}
          </ExpandableList>
        </div>
      )}
      {onOpenCloudBrowser && (
        <Button
          className="mt-2 w-fit max-w-full self-start"
          color="secondary"
          onClick={onOpenCloudBrowser}
          radius="large"
          size="conversationPill"
        >
          <BrowserUseIcon />
          <span className="flex-1 text-start">Open cloud browser</span>
          <SharedChevronRightIcon className="size-4" />
        </Button>
      )}
      {moderationDisclaimers}
      <FollowUpPortal
        followUpPlacement={followUpPlacement}
        followUpTarget={followUpTarget}
        followUps={followUps}
      />
    </div>
  );
};

export { AssistantMessageBody };

export type { AssistantMessageBodyProps, AssistantMessageResource };
