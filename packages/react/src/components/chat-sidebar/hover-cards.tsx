"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values -- The hover-card rows and dimensions are fixed by design. */

import { Button } from "@workspace/react/components/ui/button";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { useState } from "react";
import type { ReactElement } from "react";

import type { ChatSidebarProject, ChatSidebarThread } from "./chat-sidebar";
import {
  ChatBubbleIcon,
  EditProjectIcon,
  OpenPathCompactIcon,
  PinProjectIcon,
  ProjectFolderIcon,
  ThreadHostIcon,
} from "./icons";
import type { ChatSidebarProjectAction } from "./menus";
import { formatRelativeTime } from "./relative-time";

const CARD_ROW =
  "grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-1.5 rounded-md text-start";

const CARD_BUTTON =
  "cursor-(--ck-action-cursor) hover:bg-fill-primary-transparent-hover focus-visible:bg-fill-primary-transparent-hover focus-visible:outline-2 focus-visible:outline-(--ck-palette-border-focus)";

const ThreadHoverCard = ({
  children,
  location,
  onSelect,
  thread,
}: {
  children: ReactElement;
  location?: string;
  onSelect?: () => void;
  thread: ChatSidebarThread;
}) => {
  const [now, setNow] = useState(Date.now);

  return (
    <TooltipHint
      onBeforeOpen={() => {
        setNow(Date.now());

        return true;
      }}
      align="start"
      alignOffset={0}
      content={
        <div className="flex w-[min(20rem,calc(100vw-16px))] max-w-full flex-col gap-1 px-2 py-1.5 text-text">
          <div className="flex min-w-0 flex-col gap-1 pb-0.5">
            <div className="flex w-full min-w-0 items-baseline gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-1">
                <button
                  className={`-ms-1.5 line-clamp-3 min-w-0 rounded-md px-1.5 text-start text-base leading-5 font-medium break-words whitespace-normal ${CARD_BUTTON}`}
                  onClick={onSelect}
                  type="button"
                >
                  {thread.title}
                </button>
                <span className="flex h-5 shrink-0 items-center text-text-subtle">
                  <ThreadHostIcon className="size-3" />
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs leading-5 text-text-subtle">
                {thread.updatedAt === undefined
                  ? null
                  : formatRelativeTime(thread.updatedAt, now)}
                {thread.unread === true ? (
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-fill-info-solid"
                  />
                ) : null}
              </div>
            </div>
          </div>
          {location === undefined ? null : (
            <div className="flex h-5 min-w-0 items-center gap-1.5 text-sm leading-5">
              <ProjectFolderIcon className="size-4 shrink-0 text-text-subtle" />
              <span className="min-w-0 flex-1 truncate">{location}</span>
            </div>
          )}
        </div>
      }
      disablePadding
      interactive
      openDelay={180}
      side="right"
      sideOffset={2}
      variant="rich"
    >
      {children}
    </TooltipHint>
  );
};

const ProjectHoverCard = ({
  children,
  onAction,
  project,
}: {
  children: ReactElement;
  onAction?: (action: ChatSidebarProjectAction) => void;
  project: ChatSidebarProject;
}) => (
  <TooltipHint
    align="start"
    content={
      <div className="flex w-[min(22rem,calc(100vw-16px))] min-w-72 flex-col gap-1.5 px-2 py-2 text-text">
        <div className="flex min-w-0 flex-col gap-1">
          <div className={CARD_ROW}>
            <Button
              aria-label={`Change marker for ${project.name}`}
              className="h-5 w-4 p-0!"
              color="ghost"
              onClick={() => onAction?.("change-marker")}
              size="icon"
            >
              <ProjectFolderIcon className="size-4" />
            </Button>
            <div className="flex min-w-0 items-center gap-2">
              <button
                className={`min-w-0 flex-1 truncate rounded-md text-start text-base leading-6 font-medium ${CARD_BUTTON}`}
                onClick={() => onAction?.("edit")}
                type="button"
              >
                {project.name}
              </button>
              <Button
                aria-label="Pin project"
                className="size-5"
                color="ghost"
                onClick={() => onAction?.("pin")}
                size="icon"
              >
                <PinProjectIcon className="size-4" />
              </Button>
            </div>
          </div>
          <div className={CARD_ROW}>
            <ChatBubbleIcon className="size-4 text-text-subtle" />
            <span className="text-sm leading-5">
              {project.chatCount ?? project.threads.length}
              {"\u00A0"}
              {(project.chatCount ?? project.threads.length) === 1
                ? "chat"
                : "chats"}
            </span>
          </div>
        </div>
        {project.path === undefined ? null : (
          <div className="border-t border-border pt-1.5">
            <button
              aria-label={`Open ${project.path}`}
              className={`${CARD_ROW} ${CARD_BUTTON} w-full`}
              onClick={() => onAction?.("reveal")}
              type="button"
            >
              <OpenPathCompactIcon className="size-4 text-text-subtle" />
              <span className="text-sm leading-5 break-all">
                {project.path}
              </span>
            </button>
          </div>
        )}
        <div className="border-t border-border pt-1.5">
          <button
            aria-label="Edit project"
            className={`${CARD_ROW} ${CARD_BUTTON} w-full`}
            onClick={() => onAction?.("edit")}
            type="button"
          >
            <EditProjectIcon className="size-4 text-text-subtle" />
            <span className="text-sm leading-5">Edit project</span>
          </button>
        </div>
      </div>
    }
    disablePadding
    interactive
    keyboardNavigation
    openDelay={180}
    side="right"
    sideOffset={2}
    variant="rich"
  >
    {children}
  </TooltipHint>
);

export { ProjectHoverCard, ThreadHoverCard };
