"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-arbitrary-values -- The sidebar styles its rows itself with the host row tokens (--ck-row-height-row, --ck-row-padding-x, --ck-row-padding-y), which no Button variant or theme token carries. */

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The sidebar rows and lists are divs with button, list and listitem roles. */

import { MarqueeText } from "@workspace/react/components/list/marquee-text";
import {
  SelectableListRow,
  usePressable,
} from "@workspace/react/components/list/selectable-row";
import { Button } from "@workspace/react/components/ui/button";
import { MenuContextMenu } from "@workspace/react/components/ui/menu";
import { cn } from "@workspace/react/lib/utils";
import { createContext, use, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ProjectHoverCard, ThreadHoverCard } from "./hover-cards";
import {
  ArchiveIcon,
  ComposeIcon,
  DisclosureChevronIcon,
  EllipsisIcon,
  PinIcon,
  PlusIcon,
  ProjectFolderIcon,
  SearchIcon,
  UnpinIcon,
} from "./icons";
import {
  ChatOptionsMenu,
  PinnedOptionsMenu,
  ProjectOptionsMenu,
  projectMenuItems,
  threadMenuItems,
} from "./menus";
import type {
  ChatSidebarOrganize,
  ChatSidebarProjectAction,
  ChatSidebarSort,
  ChatSidebarThreadAction,
} from "./menus";
import { ReorderItem, reorderIds, SidebarReorder } from "./reorder";

/*
 * The chat sidebar: the mode and search header, the New chat row, and the Pinned,
 * Projects and Recents sections over the nav list. Utility names follow the
 * host stylesheet: text-default is text-text here, text-tertiary is
 * text-text-subtle, primary-transparent-hover is
 * background-primary-transparent-hover and cursor-interaction is
 * cursor-(--ck-action-cursor). The row height is --ck-row-height-row,
 * which resolves to 32px inside the sidebar, and the row paddings
 * are --ck-row-padding-x (2 steps) and --ck-row-padding-y (1.5 steps in the
 * Electron window).
 */

const ROW_HEIGHT = "h-[var(--ck-row-height-row,32px)]";

// The component puts a 1px spacer after every project and recent list item
// except the last; pinned items have none.
const LIST_ITEM_SPACER =
  "after:block after:h-px after:content-[''] last:after:hidden";

const EMPTY_THREADS: ChatSidebarThread[] = [];

const EMPTY_PROJECTS: ChatSidebarProject[] = [];

const SECTION_ACTIONS_REVEAL =
  "pointer-events-none opacity-0 group-focus-within/nav-section-title:pointer-events-auto group-focus-within/nav-section-title:opacity-100 group-hover/nav-section-title:pointer-events-auto group-hover/nav-section-title:opacity-100 has-[[data-popup-open]]:pointer-events-auto has-[[data-popup-open]]:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

interface ChatSidebarThread {
  id: string;
  title: string;
  projectId?: string;
  workingDirectory?: string;
  /**
   * Shows the unread dot (and "Unread" to assistive technology), and turns the
   * context menu's "Mark as unread" into "Mark as read".
   */
  unread?: boolean;
  /** Last activity, epoch milliseconds. The hover card prints its age. */
  updatedAt?: number;
}

interface ChatSidebarProject {
  id: string;
  name: string;
  path?: string;
  /** Includes pinned chats that are not repeated in the project list. */
  chatCount?: number;
  threads: ChatSidebarThread[];
}

/** What every row reads from the sidebar that renders it. */
type ChatSidebarThreadGroup =
  | { kind: "pinned" | "recents" }
  | { kind: "project"; projectId: string };

interface SidebarRowContextValue {
  reorderChats?: boolean;
  reorderPinned?: boolean;
  reorderProjects?: boolean;
  onArchiveThread?: (threadId: string) => void;
  onMoveThreadToProject?: (threadId: string, projectId: string | null) => void;
  onNewChat?: (projectId?: string) => void;
  onPinThread?: (threadId: string, pinned: boolean) => void;
  onProjectAction?: (
    projectId: string,
    action: ChatSidebarProjectAction
  ) => void;
  onSelectThread?: (threadId: string) => void;
  onThreadAction?: (threadId: string, action: ChatSidebarThreadAction) => void;
  pinnedThreadIds: ReadonlySet<string>;
  projects: readonly ChatSidebarProject[];
  selectedThreadId?: string | null;
}

const NO_PINNED: ReadonlySet<string> = new Set();

const SidebarRowContext = createContext<SidebarRowContextValue>({
  pinnedThreadIds: NO_PINNED,
  projects: [],
});

interface ConversationRowProps {
  /**
   * Wraps the row in a `group`, as the component does for project and recent
   * chats (its reorder wrapper). Pinned chats are not wrapped.
   */
  grouped?: boolean;
  /** Reserves the 16px leading slot that lines the title up under a project name. */
  indented?: boolean;
  /** The project the row is listed under, for the context menu's Project submenu. */
  projectId?: string;
  thread: ChatSidebarThread;
}

/**
 * The unread status in a row's trailing rail: a 28px spacer and an 8px accent
 * dot, both hidden while the row is hovered or focused so the actions show
 * instead. The text "Unread" describes the row to assistive technology.
 */
const UnreadIndicator = ({ id }: { id: string }) => (
  <>
    <span className="sr-only" id={id}>
      Unread
    </span>
    <div className="w-7 shrink-0 group-hover:hidden group-focus-visible:hidden group-has-[:focus-visible]:hidden" />
    <div className="absolute end-0 top-0 z-10 flex h-full min-w-[56px] shrink-0 items-center justify-end gap-2 pe-2 group-hover:hidden group-focus-visible:hidden group-has-[:focus-visible]:hidden">
      <span className="flex h-5 min-w-5 items-center justify-center">
        <span className="relative flex size-5 shrink-0 items-center justify-center">
          <span className="relative size-2 rounded-full bg-fill-info-solid" />
        </span>
      </span>
    </div>
  </>
);

/**
 * One chat in a nav list: the pressable row with the marquee title and the
 * trailing rail (pin or unpin, archive) that appears on hover or focus.
 * Enter and Space select the focused row; right-click, the ContextMenu key or
 * Shift+F10 opens its menu.
 */
const ConversationRow = ({
  grouped = false,
  indented = false,
  projectId,
  thread,
}: ConversationRowProps) => {
  const sidebar = use(SidebarRowContext);
  const pinned = sidebar.pinnedThreadIds.has(thread.id);
  const selected = thread.id === sidebar.selectedThreadId;
  const onArchive = sidebar.onArchiveThread;
  const onPin = sidebar.onPinThread;
  const onSelect = sidebar.onSelectThread;

  const currentProject = sidebar.projects.find(
    (project) => project.id === (projectId ?? thread.projectId)
  );

  const items = threadMenuItems({
    currentProject,
    onAction: (action) => {
      if (action === "pin" || action === "unpin") {
        onPin?.(thread.id, action === "pin");
      } else if (action === "archive") {
        onArchive?.(thread.id);
      } else {
        sidebar.onThreadAction?.(thread.id, action);
      }
    },
    onMoveToProject: (target) => {
      sidebar.onMoveThreadToProject?.(thread.id, target);
    },
    pinned,
    projects: sidebar.projects,
    unread: thread.unread ?? false,
  });

  const unreadId = useId();
  const unread = thread.unread ?? false;

  const row = (
    <SelectableListRow
      ariaDescribedBy={unread ? unreadId : undefined}
      ariaLabel={thread.title}
      className={cn(
        ROW_HEIGHT,
        "rounded-[11px] py-0 focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--ck-palette-border-focus) focus-visible:outline-solid",
        selected && "bg-fill-primary-transparent-hover"
      )}
      density="row"
      isSelected={selected}
      onSelect={() => {
        onSelect?.(thread.id);
      }}
      showDivider={false}
      surface="plain"
    >
      <div className="flex h-full w-full items-center text-sm leading-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {indented ? (
            <div className="flex w-4 shrink-0 items-center justify-center" />
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-base leading-5 text-text">
            <MarqueeText
              animateOnGroupHover
              className="min-w-0 flex-1 select-none"
              scrollMode="stop-at-end"
            >
              <span dir="auto">{thread.title}</span>
            </MarqueeText>
          </div>
        </div>
        {unread ? <UnreadIndicator id={unreadId} /> : null}
        <div className="pointer-events-none absolute inset-y-0 end-0 z-10 me-0.5 flex w-[56px] items-center justify-end gap-2 pe-1.5 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
          <Button
            aria-label={pinned ? "Unpin chat" : "Pin chat"}
            className="size-5"
            color="ghost"
            focusRing="inset"
            onClick={(event) => {
              event.stopPropagation();
              onPin?.(thread.id, !pinned);
            }}
            size="icon"
            type="button"
            uniform
          >
            {pinned ? (
              <UnpinIcon className="size-4" />
            ) : (
              <PinIcon className="size-4" />
            )}
          </Button>
          <Button
            aria-label="Archive chat"
            className="size-5"
            color="ghost"
            focusRing="inset"
            onClick={(event) => {
              event.stopPropagation();
              onArchive?.(thread.id);
            }}
            size="icon"
            type="button"
            uniform
          >
            <ArchiveIcon className="size-4" />
          </Button>
        </div>
      </div>
    </SelectableListRow>
  );

  // The component wraps the row in its menu trigger, a `display: contents` span.
  const menuRow = (
    <MenuContextMenu items={items}>
      <span className="contents">
        <ThreadHoverCard
          location={
            currentProject?.name ??
            thread.workingDirectory?.split("/").findLast((part) => part !== "")
          }
          onSelect={() => onSelect?.(thread.id)}
          thread={thread}
        >
          {row}
        </ThreadHoverCard>
      </span>
    </MenuContextMenu>
  );

  const reorderable = pinned ? sidebar.reorderPinned : sidebar.reorderChats;
  const group = projectId === undefined ? "recents" : `project:${projectId}`;

  const content =
    reorderable === true ? (
      <ReorderItem
        group={pinned ? "pinned" : group}
        id={thread.id}
        label={thread.title}
      >
        {menuRow}
      </ReorderItem>
    ) : (
      menuRow
    );

  return (
    <div className={grouped ? LIST_ITEM_SPACER : undefined} role="listitem">
      {grouped ? <div role="group">{content}</div> : content}
    </div>
  );
};

interface SidebarSectionProps {
  actions?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  title: string;
}

/**
 * A nav section: the tertiary title with its disclosure chevron and the
 * hover-revealed actions, over a nav list. Collapsing unmounts the list.
 */
const SidebarSection = ({
  actions,
  children,
  defaultOpen = true,
  title,
}: SidebarSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="group/nav-section relative px-[var(--ck-row-padding-x,calc(var(--spacing)*2))]">
      <div className="group/nav-section flex flex-col">
        <div className="group/nav-section-title flex min-h-[var(--ck-row-height-row,32px)] items-center justify-between gap-2 ps-2 pe-1.5">
          <div className="min-w-0 flex-1 text-base font-medium text-text-subtle">
            <div className="flex min-w-0 flex-1">
              <button
                aria-expanded={open}
                className="group/section-toggle -ms-1 flex min-w-0 flex-1 cursor-(--ck-action-cursor) items-center gap-1 rounded-md py-0.5 ps-1 pe-1 text-start focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring focus-visible:outline-solid"
                onClick={() => {
                  setOpen((current) => !current);
                }}
                type="button"
              >
                <span className="min-w-0 truncate">{title}</span>
                <DisclosureChevronIcon
                  className={cn(
                    "size-3.5 shrink-0 transition-transform group-hover/nav-section:opacity-100 group-hover/section-toggle:opacity-100 group-focus-visible/section-toggle:opacity-100",
                    open ? "rotate-0 opacity-0" : "-rotate-90 opacity-100"
                  )}
                />
              </button>
            </div>
          </div>
          {actions === undefined || actions === null ? null : (
            <div className="flex shrink-0 items-center gap-1">
              <div className={cn("shrink-0", SECTION_ACTIONS_REVEAL)}>
                <div className="flex items-center gap-1">{actions}</div>
              </div>
            </div>
          )}
        </div>
        {open ? (
          <div>
            <div className="overflow-hidden">
              <div className="group/nav-list flex flex-col gap-px pt-1">
                <div className="flex flex-col" role="list">
                  {children}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

interface ProjectListProps {
  defaultExpanded?: boolean;
  project: ChatSidebarProject;
}

/**
 * One project group: the folder header row, which expands and collapses its
 * chats, with the hover actions for the project and a new chat in it.
 */
const ProjectList = ({ defaultExpanded = true, project }: ProjectListProps) => {
  const sidebar = use(SidebarRowContext);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const items = projectMenuItems((action) => {
    sidebar.onProjectAction?.(project.id, action);
  });

  const pressable = usePressable({
    onSelect: () => {
      setExpanded((current) => !current);
    },
  });

  return (
    <div className={LIST_ITEM_SPACER} role="listitem">
      <div
        aria-label={project.name}
        className="group/cwd relative flex flex-col"
        role="listitem"
      >
        <MenuContextMenu items={items}>
          <span
            className="contents"
            data-ck-reorder-group={
              sidebar.reorderProjects === true ? "projects" : undefined
            }
            data-ck-reorder-id={
              sidebar.reorderProjects === true ? project.id : undefined
            }
            data-ck-reorder-label={project.name}
          >
            <ProjectHoverCard
              onAction={(action) =>
                sidebar.onProjectAction?.(project.id, action)
              }
              project={project}
            >
              <div
                {...pressable}
                aria-expanded={expanded}
                aria-label={project.name}
                className={cn(
                  "group/folder-row group relative flex items-center justify-between overflow-hidden rounded-xl text-sm text-text hover:bg-fill-primary-transparent-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--ck-palette-border-focus) focus-visible:outline-solid",
                  ROW_HEIGHT
                )}
              >
                <div className="flex min-w-0 flex-1 items-center">
                  <div className="flex shrink-0 items-center ps-1 pe-1">
                    <span
                      className={cn(
                        "relative -mx-[2px] flex w-[var(--ck-row-height-row,32px)] shrink-0 items-center justify-center",
                        ROW_HEIGHT
                      )}
                    >
                      <span className="flex size-full items-center justify-center">
                        <ProjectFolderIcon className="size-4 shrink-0" />
                      </span>
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pe-0 text-start text-base whitespace-nowrap text-text">
                    <span className="flex min-w-0 flex-1 items-center gap-0.5">
                      <MarqueeText
                        animateOnGroupHover
                        className="select-none"
                        scrollMode="stop-at-end"
                      >
                        {project.name}
                      </MarqueeText>
                    </span>
                  </div>
                </div>
                <div className="pointer-events-none flex max-w-[50%] min-w-0 items-center gap-2 pe-2 opacity-0 group-hover/folder-row:pointer-events-auto group-hover/folder-row:opacity-100 group-focus-visible/folder-row:pointer-events-auto group-focus-visible/folder-row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
                  {/* The actions button opens the same items as an in-page menu. */}
                  <MenuContextMenu
                    contentWidth="xs"
                    disableNative
                    items={items}
                    trigger="click"
                  >
                    <Button
                      aria-label={`Project actions for ${project.name}`}
                      className="size-5"
                      color="ghost"
                      focusRing="inset"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      size="icon"
                      type="button"
                      uniform
                    >
                      <EllipsisIcon className="size-4" />
                    </Button>
                  </MenuContextMenu>
                  <Button
                    aria-label={`Start new chat in ${project.name}`}
                    className="size-5"
                    color="ghost"
                    focusRing="inset"
                    onClick={(event) => {
                      event.stopPropagation();
                      sidebar.onNewChat?.(project.id);
                    }}
                    size="icon"
                    type="button"
                    uniform
                  >
                    <ComposeIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </ProjectHoverCard>
          </span>
        </MenuContextMenu>
        {expanded ? (
          <div className="overflow-hidden">
            <div className="pt-px pb-2">
              <div
                aria-label={`Scheduled tasks in ${project.name}`}
                className="flex flex-col"
                role="list"
              >
                {project.threads.map((thread) => (
                  <ConversationRow
                    grouped
                    indented
                    key={thread.id}
                    projectId={project.id}
                    thread={thread}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

interface ChatSidebarProps {
  footer?: ReactNode;
  /** Projects shown before Show more. The component passes 5. */
  maxVisibleProjects?: number;
  /** The mode wordmark text in the header. */
  modeLabel?: string;
  /** How chats inside projects and Recents are sorted (Sort chats by). */
  chatSort?: ChatSidebarSort;
  /** By project, or all chats in one list (Organize sidebar). */
  organize?: ChatSidebarOrganize;
  onAddProject?: () => void;
  onArchiveThread?: (threadId: string) => void;
  onChatSortChange?: (sort: ChatSidebarSort) => void;
  /** Moves a chat into a project, or out of its project when `projectId` is null. */
  onMoveThreadToProject?: (threadId: string, projectId: string | null) => void;
  onNewChat?: (projectId?: string) => void;
  onOrganizeChange?: (organize: ChatSidebarOrganize) => void;
  onPinThread?: (threadId: string, pinned: boolean) => void;
  onPinnedSortChange?: (sort: ChatSidebarSort) => void;
  onProjectAction?: (
    projectId: string,
    action: ChatSidebarProjectAction
  ) => void;
  onReorderProjects?: (projectIds: string[]) => void;
  onReorderThreads?: (
    group: ChatSidebarThreadGroup,
    threadIds: string[]
  ) => void;
  onSearch?: () => void;
  /**
   * Selecting a chat leaves focus on the row, including its keyboard outline.
   */
  onSelectThread?: (threadId: string) => void;
  onShowProjectsChange?: (show: boolean) => void;
  onSwitchMode?: () => void;
  /** Menu actions without a dedicated callback (rename, fork, copy, delete...). */
  onThreadAction?: (threadId: string, action: ChatSidebarThreadAction) => void;
  pinnedSort?: ChatSidebarSort;
  pinnedThreads?: ChatSidebarThread[];
  projects?: ChatSidebarProject[];
  recentThreads?: ChatSidebarThread[];
  selectedThreadId?: string | null;
  /** Whether the Projects section is shown (Chat sidebar options, Show). */
  showProjects?: boolean;
}

type SidebarOptionsInput = Pick<
  ChatSidebarProps,
  | "chatSort"
  | "onChatSortChange"
  | "onOrganizeChange"
  | "onPinnedSortChange"
  | "onShowProjectsChange"
  | "organize"
  | "pinnedSort"
  | "showProjects"
>;

/**
 * The options menus' values, controlled when the caller passes them. The
 * uncontrolled defaults are pinned chats in manual order,
 * other chats by last update, organized by project, with Projects shown.
 */
const useSidebarOptions = ({
  chatSort,
  onChatSortChange,
  onOrganizeChange,
  onPinnedSortChange,
  onShowProjectsChange,
  organize,
  pinnedSort,
  showProjects,
}: SidebarOptionsInput) => {
  const [ownPinnedSort, setOwnPinnedSort] = useState<ChatSidebarSort>("manual");
  const [ownChatSort, setOwnChatSort] = useState<ChatSidebarSort>("updated");

  const [ownOrganize, setOwnOrganize] =
    useState<ChatSidebarOrganize>("project");

  const [ownShowProjects, setOwnShowProjects] = useState(true);
  const currentOrganize = organize ?? ownOrganize;
  const currentShowProjects = showProjects ?? ownShowProjects;

  return {
    handlePinnedSortChange: (sort: ChatSidebarSort) => {
      setOwnPinnedSort(sort);
      onPinnedSortChange?.(sort);
    },
    handleShowProjectsChange: (show: boolean) => {
      setOwnShowProjects(show);
      onShowProjectsChange?.(show);
    },
    list: {
      chatSort: chatSort ?? ownChatSort,
      onChatSortChange: (sort: ChatSidebarSort) => {
        setOwnChatSort(sort);
        onChatSortChange?.(sort);
      },
      onOrganizeChange: (next: ChatSidebarOrganize) => {
        setOwnOrganize(next);
        onOrganizeChange?.(next);
      },
      organize: currentOrganize,
    },
    pinnedSort: pinnedSort ?? ownPinnedSort,
    projectsShown: currentShowProjects && currentOrganize === "project",
    showProjects: currentShowProjects,
  };
};

const sortThreads = (threads: ChatSidebarThread[], sort: ChatSidebarSort) =>
  sort === "manual"
    ? threads
    : threads.toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

/**
 * The chat history navigation: header, New chat, then the Pinned, Projects
 * and Recents sections in one scroll region. Data arrives through props;
 * pinning and archiving report the intent and the caller updates the lists.
 */
const ChatSidebar = ({
  chatSort,
  footer,
  maxVisibleProjects = 5,
  modeLabel = "Code",
  onAddProject,
  onArchiveThread,
  onChatSortChange,
  onMoveThreadToProject,
  onNewChat,
  onOrganizeChange,
  onPinThread,
  onPinnedSortChange,
  onProjectAction,
  onReorderProjects,
  onReorderThreads,
  onSearch,
  onSelectThread,
  onShowProjectsChange,
  onSwitchMode,
  onThreadAction,
  organize,
  pinnedSort,
  pinnedThreads = EMPTY_THREADS,
  projects = EMPTY_PROJECTS,
  recentThreads = EMPTY_THREADS,
  selectedThreadId,
  showProjects,
}: ChatSidebarProps) => {
  const [allProjectsShown, setAllProjectsShown] = useState(false);

  const options = useSidebarOptions({
    chatSort,
    onChatSortChange,
    onOrganizeChange,
    onPinnedSortChange,
    onShowProjectsChange,
    organize,
    pinnedSort,
    showProjects,
  });

  const sortedPinned = sortThreads(pinnedThreads, options.pinnedSort);
  const sortedRecents = sortThreads(recentThreads, options.list.chatSort);

  const sortedProjects = projects.map((project) => ({
    ...project,
    threads: sortThreads(project.threads, options.list.chatSort),
  }));

  const visibleProjects = allProjectsShown
    ? sortedProjects
    : sortedProjects.slice(0, maxVisibleProjects);

  const handleReorder = (group: string, from: string, to: string) => {
    if (group === "projects") {
      onReorderProjects?.(reorderIds(projects, from, to));

      return;
    }

    if (group === "pinned" || group === "recents") {
      onReorderThreads?.(
        { kind: group },
        reorderIds(group === "pinned" ? pinnedThreads : recentThreads, from, to)
      );

      return;
    }

    const projectId = group.slice("project:".length);
    const project = projects.find((item) => item.id === projectId);

    if (project !== undefined) {
      onReorderThreads?.(
        { kind: "project", projectId },
        reorderIds(project.threads, from, to)
      );
    }
  };

  const rowContext = useMemo<SidebarRowContextValue>(
    () => ({
      onArchiveThread,
      onMoveThreadToProject,
      onNewChat,
      onPinThread,
      onProjectAction,
      onSelectThread,
      onThreadAction,
      pinnedThreadIds: new Set(pinnedThreads.map((thread) => thread.id)),
      projects,
      reorderChats:
        options.list.chatSort === "manual" && onReorderThreads !== undefined,
      reorderPinned:
        options.pinnedSort === "manual" && onReorderThreads !== undefined,
      reorderProjects: onReorderProjects !== undefined,
      selectedThreadId,
    }),
    [
      options.list.chatSort,
      options.pinnedSort,
      onReorderProjects,
      onReorderThreads,
      onArchiveThread,
      onMoveThreadToProject,
      onNewChat,
      onPinThread,
      onProjectAction,
      onSelectThread,
      onThreadAction,
      pinnedThreads,
      projects,
      selectedThreadId,
    ]
  );

  return (
    <SidebarRowContext value={rowContext}>
      <SidebarReorder onReorder={handleReorder}>
        <nav
          aria-label="Chat history"
          className="relative flex min-h-0 flex-1 flex-col"
        >
          <div className="relative z-10 -mb-px flex shrink-0 flex-col px-[var(--ck-row-padding-x,calc(var(--spacing)*2))] pb-px">
            <div className="ms-2 flex h-8 items-center pe-1">
              <button
                aria-expanded={false}
                aria-label={`Switch mode, current mode: ${modeLabel}`}
                className="-ms-1.5 min-w-max cursor-(--ck-action-cursor) rounded-xl px-1.5 outline-hidden focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring focus-visible:outline-solid"
                onClick={onSwitchMode}
                type="button"
              >
                <span className="flex items-center gap-1">
                  <span className="text-sm font-semibold">{modeLabel}</span>
                  <DisclosureChevronIcon className="size-3.5 text-text-subtle" />
                </span>
              </button>
              <div className="ms-auto flex items-center gap-1">
                <Button
                  aria-label="Search"
                  className="size-7 text-text-subtle"
                  color="ghost"
                  focusRing="inset"
                  onClick={onSearch}
                  size="icon"
                  type="button"
                  uniform
                >
                  <SearchIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="group/nav-list flex flex-col gap-px empty:hidden">
              <button
                aria-label="New chat"
                className={cn(
                  "group relative flex w-full shrink-0 cursor-(--ck-action-cursor) items-center gap-2 overflow-hidden rounded-xl px-[var(--ck-row-padding-x,calc(var(--spacing)*2))] py-[var(--ck-row-padding-y,calc(var(--spacing)*1))] text-start text-sm text-text hover:bg-fill-primary-transparent-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring focus-visible:outline-solid",
                  ROW_HEIGHT
                )}
                onClick={() => {
                  onNewChat?.();
                }}
                type="button"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 text-base">
                  <span className="flex w-4 shrink-0 items-center justify-center">
                    <ComposeIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">New chat</span>
                </span>
              </button>
            </div>
          </div>
          {/* pt-5 is the 4px top padding plus the 16px gap after its empty leading slot. */}
          <div
            data-sidebar-scroll
            className="relative isolate flex min-h-0 flex-1 scroll-pb-2 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] flex-col gap-4 overflow-x-hidden overflow-y-auto pt-5 pb-[var(--ck-row-padding-x,calc(var(--spacing)*2))] hover:[scrollbar-color:var(--color-stroke-strong)_transparent]"
          >
            {pinnedThreads.length > 0 ? (
              <SidebarSection
                actions={
                  <PinnedOptionsMenu
                    onChange={options.handlePinnedSortChange}
                    value={options.pinnedSort}
                  />
                }
                title="Pinned"
              >
                {sortedPinned.map((thread) => (
                  <ConversationRow key={thread.id} thread={thread} />
                ))}
              </SidebarSection>
            ) : null}
            {options.projectsShown ? (
              <SidebarSection
                actions={
                  <>
                    <ProjectOptionsMenu {...options.list} />
                    <Button
                      aria-label="Add new project"
                      className="size-6 text-text-subtle"
                      color="ghost"
                      focusRing="inset"
                      onClick={onAddProject}
                      size="icon"
                      type="button"
                      uniform
                    >
                      {/* The component leaves this icon exposed as an unnamed image. */}
                      <PlusIcon
                        aria-hidden={false}
                        className="size-4"
                        role="img"
                      />
                    </Button>
                  </>
                }
                title="Projects"
              >
                {projects.length === 0 ? (
                  <div className="px-[var(--ck-row-padding-x,calc(var(--spacing)*2))] py-2 text-base text-text-subtle">
                    No projects
                  </div>
                ) : (
                  <>
                    {visibleProjects.map((project) => (
                      <ProjectList key={project.id} project={project} />
                    ))}
                    {allProjectsShown ||
                    projects.length <= maxVisibleProjects ? null : (
                      <div className="flex gap-1 py-1" role="listitem">
                        <Button
                          className="h-6 text-base font-normal text-text-subtle"
                          color="ghost"
                          onClick={() => {
                            setAllProjectsShown(true);
                          }}
                          size="compact"
                          type="button"
                        >
                          Show more
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </SidebarSection>
            ) : null}
            <SidebarSection
              actions={
                <>
                  <ChatOptionsMenu
                    {...options.list}
                    onShowProjectsChange={options.handleShowProjectsChange}
                    showProjects={options.showProjects}
                  />
                  <Button
                    aria-label="New chat"
                    className="size-6 text-text-subtle"
                    color="ghost"
                    focusRing="inset"
                    onClick={() => {
                      onNewChat?.();
                    }}
                    size="icon"
                    type="button"
                    uniform
                  >
                    <ComposeIcon className="size-4" />
                  </Button>
                </>
              }
              title="Recents"
            >
              {recentThreads.length === 0 ? (
                <div className="px-[var(--ck-row-padding-x,calc(var(--spacing)*2))] py-2 text-base text-text-subtle">
                  No chats
                </div>
              ) : (
                sortedRecents.map((thread) => (
                  <ConversationRow grouped key={thread.id} thread={thread} />
                ))
              )}
            </SidebarSection>
          </div>
        </nav>
        {footer === undefined || footer === null ? null : (
          <div className="relative shrink-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-border" />
            <div className="flex h-bar items-center gap-2 px-[var(--ck-row-padding-x,calc(var(--spacing)*2))]">
              {footer}
            </div>
          </div>
        )}
      </SidebarReorder>
    </SidebarRowContext>
  );
};

export { ChatSidebar, ConversationRow, ProjectList, SidebarSection };

export type {
  ChatSidebarProject,
  ChatSidebarProps,
  ChatSidebarThread,
  ChatSidebarThreadGroup,
  ConversationRowProps,
  ProjectListProps,
  SidebarSectionProps,
};
