"use client";

/* oxlint-disable shadcn/no-inline-styles -- The header and container use inline backgrounds and custom properties; skeleton bars have individual widths and delays. */
/* oxlint-disable eslint/complexity -- DiffFileHeader and CodeDiff are single functions, each of which branches on its ~45 props. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- the component renders div role="button" and div role="status". */
/* oxlint-disable eslint/no-nested-ternary -- the glyph and label choices for the action buttons follow one if-chain each. */

/*
 * Diff family: the chrome around the diff renderer (file header, actions,
 * states, expansion status). The renderer itself, based on @pierre/diffs, is
 * in ui/components/diff/diff-view.tsx.
 *
 * Utility names follow the host stylesheet: text-default is
 * --color-text (text-text here), text-secondary and text-tertiary are
 * --ck-palette-ink-secondary/-tertiary, border-default is --color-border,
 * border-subtle is --color-stroke-subtle, icon-2xs is --icon-detail-size
 * (calc(var(--spacing) * 4)) and text-size-chat is --ui-message-text-size
 * (var(--ui-message-text-size-override, var(--ck-interface-size, 13px))).
 * cursor-interaction is --ck-action-cursor, `default` on the Electron window.
 */

import {
  DiffContextMenu,
  copyText,
} from "@workspace/react/components/diff/code-diff-context-menu";
import type {
  DiffContextMenuProps,
  DiffOpenTargets,
} from "@workspace/react/components/diff/code-diff-context-menu";
import {
  createFileDiff,
  exceedsInlineReviewLimit,
} from "@workspace/react/components/diff/diff-model";
import type {
  CodeDiffData,
  DiffFile,
  FileDiffMetadata,
} from "@workspace/react/components/diff/diff-model";
import { DiffView } from "@workspace/react/components/diff/diff-view";
import type {
  ContextMessage,
  ContextTarget,
  DiffLineAnnotation,
  DiffViewProps,
} from "@workspace/react/components/diff/diff-view";
import { DiffErrorBoundary } from "@workspace/react/components/diff/error-boundary";
import { DiffFileIcon } from "@workspace/react/components/diff/file-type-icon";
import { createSeededRandom } from "@workspace/react/components/diff/seeded-random";
import { useDiffContextLoader } from "@workspace/react/components/diff/use-diff-context-loader";
import { useToggleAllDiffs } from "@workspace/react/components/diff/use-toggle-all-diffs";
import { Button } from "@workspace/react/components/ui/button";
import {
  Menu,
  MenuItem,
  MenuSeparator,
} from "@workspace/react/components/ui/menu";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { useReducedMotion } from "@workspace/react/lib/reduced-motion";
import { cn } from "@workspace/react/lib/utils";
import {
  ChevronRight,
  ExternalLink,
  File as FileIcon,
  Minus,
  MoreHorizontal,
  Plus,
  Undo2,
  WrapText,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

import styles from "./diff.module.css";

export { DiffView } from "@workspace/react/components/diff/diff-view";

export {
  CODE_THEME_NAMES,
  DEFAULT_CODE_THEME_SELECTION,
} from "@workspace/react/components/diff/code-themes";

export type {
  CodeThemeName,
  CodeThemeSelection,
} from "@workspace/react/components/diff/code-themes";

export {
  DiffFileIcon,
  fileIconColor,
  resolveFileIcon,
} from "@workspace/react/components/diff/file-type-icon";

export {
  DIFF_CONTEXT_MENU_MESSAGES,
  DiffContextMenu,
  buildDiffContextMenuItems,
  persistsPreferredTarget,
  primaryOpenTarget,
  visibleOpenTargets,
} from "@workspace/react/components/diff/code-diff-context-menu";

export type {
  DiffContextMenuItemsOptions,
  DiffContextMenuProps,
  DiffOpenTarget,
  DiffOpenTargets,
} from "@workspace/react/components/diff/code-diff-context-menu";

export type {
  AnnotationSide,
  ContextMessage,
  ContextTarget,
  DiffLineAnnotation,
  DiffLineEventProps,
  DiffViewProps,
  LineHoverHighlight,
  SelectedLineRange,
} from "@workspace/react/components/diff/diff-view";

export {
  createFileDiff,
  getDiffPreviewStats,
  parseUnifiedPatch,
  toCodeDiffData,
} from "@workspace/react/components/diff/diff-model";

export type {
  CodeDiffData,
  DiffFile,
  FileDiffMetadata,
} from "@workspace/react/components/diff/diff-model";

type CustomStyle = CSSProperties & Record<`--${string}`, string | undefined>;

const noCleanup = () => {
  // Nothing to undo when the element is missing or is not observed.
};

const isPresent = <V,>(value: V | null | undefined): value is V =>
  value !== null && value !== undefined;

const TEXT_SIZE_CHAT =
  "text-[length:var(--ui-message-text-size-override,var(--ck-interface-size,13px))]";

const ICON_2XS = "size-4";

// text-danger and text-chart-green in the Electron theme (see banner.tsx).
const TEXT_DANGER = "!text-[var(--color-status-danger)]";
const TEXT_CHART_GREEN = "!text-[var(--color-status-success)]";
const TEXT_GIT_ADDED = "text-(--ck-palette-decoration-added)";
const TEXT_GIT_DELETED = "text-(--ck-palette-decoration-deleted)";

/* ------------------------------------------------------------------ */
/* Strings (message ids)                                 */
/* ------------------------------------------------------------------ */

export const DIFF_MESSAGES = {
  binaryFile: "Binary file not shown",
  collapseFile: "Collapse file",
  contextInlineError: "Couldn’t load unchanged lines.",
  contextInlineRetry: "Retry",
  contextLoadFailed:
    "Couldn’t load unchanged lines. Click the expander to try again.",
  contextLoading: "Loading unchanged lines…",
  copyPath: "Copy path",
  deleteFile: "Delete file",
  disableWordWrap: "Disable word wrap",
  enableWordWrap: "Enable word wrap",
  expandFile: "Expand file",
  fileActions: "File actions",
  fileRenamedWithoutChanges: "File renamed without changes",
  fullContentLoadFailed: "Full file content failed to load",
  inlineAccept: "Accept",
  inlineEdit: "Edit",
  inlineReject: "Reject",
  inlineTooLarge: "Change is too large to preview",
  loadFailedAfterRetrying: "Diff failed to load after retrying",
  loadingDiff: "Loading diff",
  noContent: "No content",
  openFile: "Open file",
  openInEditor: "Open in editor",
  renderFailed: "Diff failed to render",
  retry: "Retry",
  tooLarge: "This file is too large to display here.",
  toggleFileDiff: "Toggle file diff",
} as const;

export type DiffMessages = typeof DIFF_MESSAGES;

/* ------------------------------------------------------------------ */
/* Stat counts                                                   */
/* ------------------------------------------------------------------ */

export type DiffStatsVariant = "agent-activity" | "color" | "monochrome";

export interface DiffStatsProps {
  className?: string;
  linesAdded: number;
  linesRemoved: number;
  variant?: DiffStatsVariant;
}

export const DiffStats = ({
  className,
  linesAdded,
  linesRemoved,
  variant = "color",
}: DiffStatsProps) => {
  const format = new Intl.NumberFormat();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 leading-none tracking-tight tabular-nums [font-variant-numeric:tabular-nums]",
        className
      )}
      data-ck-thread-skip
    >
      <span
        className={cn(
          "flex shrink-0 items-center",
          variant === "monochrome" && "text-text-subtle",
          variant === "color" && TEXT_GIT_ADDED,
          variant === "agent-activity" &&
            "[@media(hover:hover)]:group-[:hover:not(:has([data-ck-agent-activity-file-link]:hover))]/activity-header:text-(--ck-palette-decoration-added)"
        )}
      >
        +{format.format(linesAdded)}
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center",
          variant === "monochrome" && "text-text-subtle",
          variant === "color" && TEXT_GIT_DELETED,
          variant === "agent-activity" &&
            "[@media(hover:hover)]:group-[:hover:not(:has([data-ck-agent-activity-file-link]:hover))]/activity-header:text-(--ck-palette-decoration-deleted)"
        )}
      >
        -{format.format(linesRemoved)}
      </span>
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Action buttons. */
/* ------------------------------------------------------------------ */

export type DiffAction = "revert" | "stage" | "unstage";

export type DiffActionScope = "file" | "hunk" | "section";

const ACTION_LABELS: Record<DiffActionScope, Record<DiffAction, string>> = {
  file: {
    revert: "Revert file",
    stage: "Stage file",
    unstage: "Unstage file",
  },
  hunk: { revert: "Revert", stage: "Stage", unstage: "Unstage" },
  section: {
    revert: "Revert all",
    stage: "Stage all",
    unstage: "Unstage all",
  },
};

export interface DiffActionButtonProps {
  action: DiffAction;
  className?: string;
  color?: "ghost" | "ghostTertiary";
  disabled?: boolean;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  scope: DiffActionScope;
  size?: "composerSm" | "iconMd";
}

export const DiffActionButton = ({
  action,
  className,
  color = "ghost",
  disabled = false,
  onClick,
  scope,
  size = "composerSm",
}: DiffActionButtonProps) => {
  const label = ACTION_LABELS[scope][action];
  let Glyph = Undo2;

  if (action === "stage") {
    Glyph = Plus;
  } else if (action === "unstage") {
    Glyph = Minus;
  }

  return (
    <TooltipHint content={label}>
      <Button
        aria-label={label}
        className={className}
        color={color}
        disabled={disabled}
        onClick={onClick}
        size={size}
        uniform
      >
        <Glyph className={ICON_2XS} />
      </Button>
    </TooltipHint>
  );
};

export type DiffActionsVariant = "staged" | "unstaged";

export interface DiffFileActionsProps {
  disabled?: boolean;
  onFileAction?: (action: DiffAction) => void;
  useMutedButtonStyle?: boolean;
  variant?: DiffActionsVariant;
}

export const DiffFileActions = ({
  disabled,
  onFileAction,
  useMutedButtonStyle = false,
  variant,
}: DiffFileActionsProps) => {
  const toggleAction: DiffAction = variant === "staged" ? "unstage" : "stage";
  const color = useMutedButtonStyle ? "ghostTertiary" : "ghost";
  const size = useMutedButtonStyle ? "iconMd" : undefined;

  return (
    <div
      className={cn(
        "flex items-center",
        useMutedButtonStyle &&
          variant === "unstaged" &&
          "gap-0.5 opacity-0 group-hover/diff-header:opacity-100 group-has-[:focus-visible]/diff-header:opacity-100",
        !useMutedButtonStyle && "opacity-0 group-hover/file-diff:opacity-100"
      )}
    >
      <DiffActionButton
        action="revert"
        color={color}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onFileAction?.("revert");
        }}
        scope="file"
        size={size}
      />
      <DiffActionButton
        action={toggleAction}
        color={color}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onFileAction?.(toggleAction);
        }}
        scope="file"
        size={size}
      />
    </div>
  );
};

export interface DiffHunkActionEvent {
  action: DiffAction;
  hunkIndex: number;
  path: string;
  scope: "hunk";
}

export interface DiffHunkActionsProps {
  hunkIndex: number;
  onHunkAction?: (event: DiffHunkActionEvent) => void;
  path: string;
  variant?: DiffActionsVariant;
}

export const DiffHunkActions = ({
  hunkIndex,
  onHunkAction,
  path,
  variant,
}: DiffHunkActionsProps) => {
  const toggleAction: DiffAction = variant === "staged" ? "unstage" : "stage";

  return (
    <div className="pointer-events-none absolute -top-8.5 right-0.5 z-20 flex items-center gap-1 rounded-full bg-panel-secondary/90 px-0.5 py-0.5 opacity-0 shadow-sm ring-1 ring-border/60 transition-opacity group-hover/file-diff:pointer-events-auto group-hover/file-diff:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
      <DiffActionButton
        action="revert"
        onClick={(event) => {
          event.stopPropagation();
          onHunkAction?.({ action: "revert", hunkIndex, path, scope: "hunk" });
        }}
        scope="hunk"
      />
      <DiffActionButton
        action={toggleAction}
        onClick={(event) => {
          event.stopPropagation();
          onHunkAction?.({
            action: toggleAction,
            hunkIndex,
            path,
            scope: "hunk",
          });
        }}
        scope="hunk"
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* States. */
/* ------------------------------------------------------------------ */

interface CenteredMessageProps {
  align?: "center" | "start";
  children?: ReactNode;
  className?: string;
}

const CenteredMessage = ({
  align = "center",
  children,
  className,
}: CenteredMessageProps) => (
  <div
    className={cn(
      "flex items-center px-4 text-sm text-text-muted",
      align === "center"
        ? "justify-center text-center"
        : "justify-start text-start",
      className
    )}
  >
    {children}
  </div>
);

export type DiffNoticeKind = "binary" | "empty" | "rename-without-changes";

export const DiffNotice = ({
  kind,
  messages = DIFF_MESSAGES,
}: {
  kind: DiffNoticeKind;
  messages?: Pick<
    DiffMessages,
    "binaryFile" | "fileRenamedWithoutChanges" | "noContent"
  >;
}) => {
  let text: string = messages.noContent;

  if (kind === "binary") {
    text = messages.binaryFile;
  } else if (kind === "rename-without-changes") {
    text = messages.fileRenamedWithoutChanges;
  }

  return (
    <CenteredMessage className="h-full bg-panel-tertiary py-4 empty:hidden">
      {text}
    </CenteredMessage>
  );
};

export interface DiffTooLargeNoticeProps {
  canOpenFile?: boolean;
  messages?: Pick<DiffMessages, "openInEditor" | "tooLarge">;
  onOpenInEditor?: () => void;
}

export const DiffTooLargeNotice = ({
  canOpenFile = false,
  messages = DIFF_MESSAGES,
  onOpenInEditor,
}: DiffTooLargeNoticeProps) => (
  <div
    className={cn(
      "flex items-center gap-2 bg-panel-tertiary px-3 py-2 text-(color:--ck-palette-ink-tertiary)",
      TEXT_SIZE_CHAT
    )}
  >
    <span className="min-w-0 flex-1 truncate">{messages.tooLarge}</span>
    {canOpenFile ? (
      <Button
        className="shrink-0 px-1.5"
        color="ghost"
        onClick={onOpenInEditor}
        size="toolbar"
      >
        {messages.openInEditor}
      </Button>
    ) : null}
  </div>
);

export const DiffLoadFailed = ({
  messages = DIFF_MESSAGES,
  onRetry,
}: {
  messages?: Pick<DiffMessages, "loadFailedAfterRetrying" | "retry">;
  onRetry?: () => void;
}) => (
  <CenteredMessage className="gap-2 bg-panel py-4">
    {messages.loadFailedAfterRetrying}
    {onRetry ? (
      <Button
        className="shrink-0 text-text"
        color="outline"
        onClick={onRetry}
        size="default"
      >
        {messages.retry}
      </Button>
    ) : null}
  </CenteredMessage>
);

export const DiffFullContentFailed = ({
  messages = DIFF_MESSAGES,
  onRetry,
}: {
  messages?: Pick<DiffMessages, "fullContentLoadFailed" | "retry">;
  onRetry?: () => void;
}) => (
  <div className="flex items-center gap-2 bg-panel px-3 py-2 text-sm">
    <span className="text-text-muted">{messages.fullContentLoadFailed}</span>
    <Button
      className="shrink-0"
      color="outline"
      onClick={onRetry}
      size="default"
    >
      {messages.retry}
    </Button>
  </div>
);

export const DiffRenderFailed = ({
  messages = DIFF_MESSAGES,
}: {
  messages?: Pick<DiffMessages, "renderFailed">;
}) => (
  <div className="flex items-center bg-panel px-3 py-4 text-sm text-text-muted">
    {messages.renderFailed}
  </div>
);

const clampPercent = (value: number) => Math.max(1, Math.min(100, value));
const SHIMMER_STAGGER_MS = 120;

const shimmerStyle = (index: number, width: number): CustomStyle => ({
  "--ck-results-sweep-delay": `${-index * SHIMMER_STAGGER_MS}ms`,
  width: `${clampPercent(width)}%`,
});

// Seeded shimmer bars.
const ShimmerLines = ({
  lines,
  maxWidth,
  minWidth,
  seed,
}: {
  lines: number;
  maxWidth: number;
  minWidth: number;
  seed: string;
}) => {
  const reduced = useReducedMotion();

  const widths = useMemo(() => {
    const low = clampPercent(Math.min(minWidth, maxWidth));
    const high = clampPercent(Math.max(minWidth, maxWidth));
    const random = createSeededRandom(`${seed}:${lines}:${low}:${high}`);

    return Array.from(
      { length: Math.max(0, lines) },
      () => low + random() * (high - low)
    );
  }, [lines, maxWidth, minWidth, seed]);

  return (
    <div className="flex w-full flex-col items-start gap-2">
      {widths.map((width, index) => (
        <div
          aria-hidden
          className={styles.shimmer}
          data-ck-reduced-motion={reduced ? true : undefined}
          data-size="md"
          key={`${seed}:${width}`}
          style={shimmerStyle(index, width)}
        />
      ))}
    </div>
  );
};

const MIN_LOADING_LINES = 3;
const MAX_LOADING_LINES = 24;

export const DiffLoading = ({
  additions,
  deletions,
  messages = DIFF_MESSAGES,
  name,
}: {
  additions: number;
  deletions: number;
  messages?: Pick<DiffMessages, "loadingDiff">;
  name: string;
}) => (
  <div className="bg-panel px-3 pt-2 pb-3 text-sm">
    <div aria-live="polite" className="w-full" role="status">
      <span className="sr-only">{messages.loadingDiff}</span>
      <ShimmerLines
        lines={Math.min(
          MAX_LOADING_LINES,
          Math.max(MIN_LOADING_LINES, additions + deletions + 6)
        )}
        maxWidth={96}
        minWidth={42}
        seed={`diff-loading-${name}-${additions}-${deletions}`}
      />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* File header. */
/* ------------------------------------------------------------------ */

const PATH_ARROW = " -> ";

export interface DiffHeaderOpenAction {
  ariaLabel?: string;
  onClick: (line?: number) => void;
  tooltip?: string;
}

export interface DiffPathPart {
  fileName: string;
  path: string;
}

export type DiffHeaderVariant = "default" | "full-review";

const stop = (event: ReactMouseEvent) => {
  event.stopPropagation();
};

export interface DiffFileActionsMenuProps {
  messages?: Pick<
    DiffMessages,
    | "collapseFile"
    | "copyPath"
    | "deleteFile"
    | "expandFile"
    | "fileActions"
    | "openInEditor"
  >;
  onCopyPath?: () => void;
  onDeleteFile?: () => void;
  onOpen?: () => void;
  onToggle: () => void;
  open: boolean;
  openLabel?: ReactNode;
}

export const DiffFileActionsMenu = ({
  messages = DIFF_MESSAGES,
  onCopyPath,
  onDeleteFile,
  onOpen,
  onToggle,
  open,
  openLabel,
}: DiffFileActionsMenuProps) => (
  <div className="shrink-0" onClick={stop} role="presentation">
    <Menu
      align="end"
      contentWidth="menu"
      triggerButton={
        <Button
          aria-label={messages.fileActions}
          color="ghostTertiary"
          size="iconCircleSm"
        >
          <MoreHorizontal className={ICON_2XS} />
        </Button>
      }
    >
      {onCopyPath ? (
        <MenuItem
          onSelect={() => {
            onCopyPath();
          }}
        >
          {messages.copyPath}
        </MenuItem>
      ) : null}
      {onOpen ? (
        <MenuItem
          onSelect={() => {
            onOpen();
          }}
        >
          {openLabel ?? messages.openInEditor}
        </MenuItem>
      ) : null}
      <MenuItem
        onSelect={() => {
          onToggle();
        }}
      >
        {open ? messages.collapseFile : messages.expandFile}
      </MenuItem>
      {onDeleteFile ? (
        <>
          <MenuSeparator />
          <MenuItem
            onSelect={() => {
              onDeleteFile();
            }}
            tone="destructive"
          >
            {messages.deleteFile}
          </MenuItem>
        </>
      ) : null}
    </Menu>
  </div>
);

export interface DiffOpenButtonProps {
  headerOpenAction?: DiffHeaderOpenAction;
  messages?: Pick<DiffMessages, "openFile" | "openInEditor">;
  onOpenInEditor: () => void;
  useMutedButtonStyle?: boolean;
}

export const DiffOpenButton = ({
  headerOpenAction,
  messages = DIFF_MESSAGES,
  onOpenInEditor,
  useMutedButtonStyle = false,
}: DiffOpenButtonProps) => {
  const label = headerOpenAction?.ariaLabel ?? messages.openFile;
  const tooltip = messages.openInEditor;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center",
        headerOpenAction === undefined &&
          "opacity-0 transition-opacity duration-200 group-hover/file-diff:opacity-100"
      )}
      onClick={stop}
      role="presentation"
    >
      <TooltipHint content={headerOpenAction?.tooltip ?? tooltip}>
        <Button
          aria-label={label}
          color={useMutedButtonStyle ? "ghostTertiary" : "ghost"}
          onClick={() => {
            (headerOpenAction?.onClick ?? onOpenInEditor)();
          }}
          size={useMutedButtonStyle ? "iconCircleSm" : "toolbar"}
          uniform
        >
          <ExternalLink className={ICON_2XS} />
        </Button>
      </TooltipHint>
      {headerOpenAction !== undefined && !useMutedButtonStyle ? (
        <TooltipHint content={tooltip}>
          <Button
            aria-label={tooltip}
            color="ghost"
            onClick={onOpenInEditor}
            size="toolbar"
            uniform
          >
            <FileIcon className={ICON_2XS} />
          </Button>
        </TooltipHint>
      ) : null}
    </div>
  );
};

export interface DiffFileHeaderProps {
  diff: CodeDiffData;
  displayFileName: string;
  displayPath: string;
  displayPathParts: readonly DiffPathPart[];
  fileActionsDisabled?: boolean;
  headerEndContent?: ReactNode;
  headerOpenAction?: DiffHeaderOpenAction;
  headerVariant?: DiffHeaderVariant;
  hunkActionsVariant?: DiffActionsVariant;
  isLoading?: boolean;
  messages?: DiffMessages;
  onCopyPath?: () => void;
  onDeleteFile?: () => void;
  onFileAction?: (action: DiffAction) => void;
  onFileNameClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onFileToggle: (event?: ReactMouseEvent<HTMLElement>) => void;
  onHeaderEndContentClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onOpenInEditor: () => void;
  open: boolean;
  showDiffStats?: boolean;
  showFileActions?: boolean;
  showOpenInButton?: boolean;
  stickyHeader?: boolean;
  toggleAriaLabel: string;
  workspaceRelativePath: string | undefined;
}

export const DiffFileHeader = ({
  diff,
  displayFileName,
  displayPath,
  displayPathParts,
  fileActionsDisabled,
  headerEndContent,
  headerOpenAction,
  headerVariant = "default",
  hunkActionsVariant,
  isLoading = false,
  messages = DIFF_MESSAGES,
  onCopyPath,
  onDeleteFile,
  onFileAction,
  onFileNameClick,
  onFileToggle,
  onHeaderEndContentClick,
  onOpenInEditor,
  open,
  showDiffStats = true,
  showFileActions,
  showOpenInButton,
  stickyHeader,
  toggleAriaLabel,
  workspaceRelativePath,
}: DiffFileHeaderProps) => {
  const full = headerVariant === "full-review";

  const toggleButton = (
    <Button
      aria-label={toggleAriaLabel}
      className={cn(
        "bg-transparent",
        full ? "text-text-subtle hover:text-text" : "text-text"
      )}
      color={full ? "ghostMuted" : "ghost"}
      data-ck-app-action-review-file-expanded={String(open)}
      data-ck-app-action-review-file-toggle=""
      onClick={(event) => {
        event.stopPropagation();
        onFileToggle(event);
      }}
      size={full ? "iconMd" : "toolbar"}
      uniform
    >
      <ChevronRight
        className={cn(
          "transition-transform duration-(--motion-duration-fast) ease-[ease] motion-reduce:transition-none",
          ICON_2XS,
          open ? "rotate-90" : "rotate-0"
        )}
      />
    </Button>
  );

  const pathIsMissing =
    workspaceRelativePath === undefined ||
    workspaceRelativePath === "" ||
    workspaceRelativePath === "/dev/null";

  const nameButton = (
    <button
      aria-expanded={full ? open : undefined}
      aria-label={full ? toggleAriaLabel : undefined}
      className={cn(
        "min-w-0 cursor-(--ck-action-cursor) truncate text-start text-text select-text [direction:rtl]",
        !full && "pe-[6px]"
      )}
      data-ck-app-action-review-file-expanded={full ? String(open) : undefined}
      data-ck-app-action-review-file-toggle={full ? "" : undefined}
      disabled={pathIsMissing}
      onClick={onFileNameClick}
      type="button"
    >
      <span className="min-w-0 truncate text-text [direction:ltr] [unicode-bidi:plaintext] @xs/diff-header:hidden">
        {displayFileName}
      </span>
      {full ? (
        <span className="hidden min-w-0 truncate text-text-subtle [direction:ltr] [unicode-bidi:plaintext] @xs/diff-header:inline">
          {displayPathParts.map((part, index) => (
            <span key={`${part.path}:${index}`}>
              {index > 0 ? (
                <span className="text-text">{PATH_ARROW}</span>
              ) : null}
              <span>
                {part.path.slice(
                  0,
                  Math.max(0, part.path.length - part.fileName.length)
                )}
              </span>
              <span className="text-text">{part.fileName}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className="hidden min-w-0 truncate [direction:ltr] [unicode-bidi:plaintext] @xs/diff-header:inline">
          {displayPath}
        </span>
      )}
    </button>
  );

  return (
    <div
      className={cn(
        "cursor-(--ck-action-cursor) select-none focus-visible:outline-none",
        stickyHeader === true &&
          "sticky top-[var(--ck-overlay-header-height,0px)] z-10"
      )}
      onClick={onFileToggle}
      role="presentation"
      style={{ backgroundColor: "var(--ui-diff-background)" }}
    >
      <div
        style={
          full
            ? undefined
            : { backgroundColor: "var(--ui-diff-heading-background)" }
        }
      >
        <div
          className={cn(
            "group/diff-header @container/diff-header relative flex items-center gap-2",
            TEXT_SIZE_CHAT,
            full
              ? cn(
                  "border-b border-border py-2 ps-3 pe-2",
                  isLoading ? "mb-2" : "mb-px"
                )
              : "px-[var(--ui-diff-heading-inset-inline,1rem)] py-[var(--ui-diff-heading-inset-block,0.25rem)] hover:bg-fill-primary-transparent-hover/30"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center text-text",
              TEXT_SIZE_CHAT,
              full ? "gap-0.5" : "gap-2"
            )}
          >
            <div
              className={cn("flex min-w-0 items-center", full && "gap-2 ps-1")}
            >
              {full ? <DiffFileIcon path={displayPath} /> : null}
              <TooltipHint
                content={<span className="font-mono">{displayPath}</span>}
                disabled={full}
                enabledWhen="overflow"
                openDelay={200}
              >
                {nameButton}
              </TooltipHint>
              {full ? (
                <ChevronRight
                  className={cn(
                    "text-text-subtle opacity-0 group-hover/diff-header:opacity-100",
                    ICON_2XS,
                    open && "rotate-90"
                  )}
                />
              ) : null}
            </div>
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-1">
            {showDiffStats ? (
              <span
                className={cn(
                  "flex shrink-0 items-center",
                  full ? "ms-1 me-1" : isPresent(headerEndContent) && "me-2"
                )}
                key={displayPath}
              >
                <DiffStats
                  linesAdded={diff.additions}
                  linesRemoved={diff.deletions}
                />
              </span>
            ) : null}
            {showFileActions === true ? (
              <DiffFileActions
                disabled={fileActionsDisabled}
                onFileAction={onFileAction}
                useMutedButtonStyle={full}
                variant={hunkActionsVariant}
              />
            ) : null}
            {isPresent(headerEndContent) ? (
              <span
                className={full ? "flex items-center" : "contents"}
                onClick={onHeaderEndContentClick}
                role="presentation"
              >
                {headerEndContent}
              </span>
            ) : null}
            {showOpenInButton === true &&
            (!full || headerOpenAction !== undefined) ? (
              <DiffOpenButton
                headerOpenAction={headerOpenAction}
                messages={messages}
                onOpenInEditor={onOpenInEditor}
                useMutedButtonStyle={full}
              />
            ) : null}
            {full ? (
              <DiffFileActionsMenu
                messages={messages}
                onCopyPath={onCopyPath}
                onDeleteFile={onDeleteFile}
                onOpen={showOpenInButton === true ? onOpenInEditor : undefined}
                onToggle={() => {
                  onFileToggle();
                }}
                open={open}
              />
            ) : null}
            {full ? null : toggleButton}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* CodeDiff. */
/* ------------------------------------------------------------------ */

export type DiffViewType = "auto" | "split" | "unified";

/** Auto uses split when the container is 800px wide and both sides changed. */
const resolveViewType = (
  viewType: DiffViewType,
  diff: CodeDiffData,
  wide: boolean
) => {
  if (viewType !== "auto") {
    return viewType;
  }

  return wide && diff.additions > 0 && diff.deletions > 0 ? "split" : "unified";
};

const AUTO_SPLIT_MIN_WIDTH = 800;
const WORD_DIFF_MAX_CHANGED_LINES = 2000;
const TOO_LARGE_CHANGED_LINES = 15_000;
const TOO_LARGE_CHANGED_BYTES = 3_145_728;
const TOO_LARGE_LINE_BYTES = 1_048_576;

/** The surface behind the diff. */
const resolveSurface = (background: boolean, diffSurface: "diff" | "main") => {
  if (!background) {
    return "var(--ck-palette-surface-surface-under)";
  }

  return diffSurface === "diff"
    ? "var(--color-diff-surface)"
    : "var(--ck-palette-surface-surface)";
};

/** Too many changed lines or bytes to render in the panel. */
export const isDiffTooLarge = (diff: CodeDiffData) => {
  if (diff.additions + diff.deletions > TOO_LARGE_CHANGED_LINES) {
    return true;
  }

  let bytes = 0;
  let longest = 0;
  const { metadata } = diff;

  for (const hunk of metadata.hunks) {
    for (const part of hunk.hunkContent) {
      if (part.type === "change") {
        for (let step = 0; step < part.deletions; step += 1) {
          const length =
            metadata.deletionLines[part.deletionLineIndex + step]?.length ?? 0;

          bytes += length;
          longest = Math.max(longest, length);
        }

        for (let step = 0; step < part.additions; step += 1) {
          const length =
            metadata.additionLines[part.additionLineIndex + step]?.length ?? 0;

          bytes += length;
          longest = Math.max(longest, length);
        }
      }
    }
  }

  return bytes > TOO_LARGE_CHANGED_BYTES || longest > TOO_LARGE_LINE_BYTES;
};

const basename = (path: string) => path.split("/").pop() ?? path;

const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/]|\\\\)/u;

/** The line number of the first line or number cell on the event path. */
const lineOfPath = (path: readonly EventTarget[]) => {
  for (const node of path) {
    if (node instanceof HTMLElement) {
      const attribute = node.dataset.line ?? node.dataset.ckColumnNumber;

      if (attribute !== null && Number.isFinite(Number(attribute))) {
        return Math.trunc(Number(attribute));
      }
    }
  }

  return null;
};

interface HunkActionsMetadata {
  hunkIndex: number;
  kind: "hunk-actions";
}

const isHunkActions = (metadata: unknown): metadata is HunkActionsMetadata =>
  typeof metadata === "object" &&
  metadata !== null &&
  "kind" in metadata &&
  metadata.kind === "hunk-actions" &&
  "hunkIndex" in metadata &&
  typeof metadata.hunkIndex === "number";

const isCallerAnnotation = <T,>(
  annotation: DiffLineAnnotation<T | HunkActionsMetadata>
): annotation is DiffLineAnnotation<T> => !isHunkActions(annotation.metadata);

export interface CodeDiffProps<T = unknown> {
  /** The tinted app surface behind the diff. */
  background?: boolean;
  containerClassName?: string;
  diff: CodeDiffData;
  diffSurface?: "diff" | "main";
  /** Always use the in-page context menu, even when `window.electronBridge` exists. */
  disableNativeContextMenu?: boolean;
  diffViewClassName?: string;
  diffViewWrap?: boolean;
  /** Overrides the path shown in the header. */
  displayPathOverride?: string;
  expandScope?: string;
  fileActionsDisabled?: boolean;
  headerEndContent?: ReactNode;
  headerEndContentOpenOnClick?: boolean;
  headerOpenAction?: DiffHeaderOpenAction;
  headerVariant?: DiffHeaderVariant;
  hunkActionsVariant?: DiffActionsVariant;
  /** Items placed before the diff's own in the context menu (language-service items). */
  getAdditionalContextMenuItems?: DiffContextMenuProps["getAdditionalItems"];
  /** The file's GitHub URL for the context menu's "Open in GitHub", or null. */
  githubFileLookup?: () => Promise<string | null>;
  hunkSeparators?: DiffViewProps["hunkSeparators"];
  isLoading?: boolean;
  lineAnnotations?: DiffViewProps<T>["lineAnnotations"];
  /** Loads the full files when an expander of a partial diff is pressed. */
  loadDiffFiles?: DiffViewProps<T>["loadDiffFiles"];
  /** The icon of the context menu's "New tab" item. */
  loadNewTabIcon?: DiffContextMenuProps["loadNewTabIcon"];
  /** Loads the apps the file opens in, on demand when the context menu opens. */
  loadOpenTargets?: () => Promise<DiffOpenTargets | null>;
  messages?: DiffMessages;
  onCopyPath?: (path: string) => void;
  onDeleteFile?: () => void;
  onDirectFileToggle?: (open: boolean) => void;
  onHunkAction?: (
    event:
      | DiffHunkActionEvent
      | { action: DiffAction; path: string; scope: "file" }
  ) => void;
  onLoadRetry?: () => void;
  onOpenChange: (open: boolean) => void;
  /** Opens the context menu's GitHub URL (the component opens a link). */
  onOpenGitHub?: (href: string) => void;
  onOpenInEditor?: (line?: number) => void;
  /** The context menu's "New tab" item; `headerOpenAction` is used when it is given. */
  onOpenInNewTab?: (line: number) => void;
  /** The context menu opens the file in an app, at the line under the pointer. */
  onOpenInTarget?: (request: {
    appPath: string | undefined;
    line: number;
    openPath: string;
    persistPreferred: boolean;
    target: string;
  }) => void;
  onPostRender?: DiffViewProps<T>["onPostRender"];
  open: boolean;
  /** The apps list's preferred target for this file, over the one the service names. */
  preferredTargetOverride?: string;
  /** Called by the context menu's "Request changes" with the line the pointer was last over. */
  onRequestChanges?: (
    line: { lineNumber: number; side: "additions" | "deletions" } | null
  ) => void;
  /** The context menu's "Toggle line wrap"; without it the diff toggles its own wrapping. */
  onToggleWrap?: () => void;
  /** Shows the full-file load failure notice with Retry (`fullContentLoadFailed`). */
  fullContentLoadFailed?: boolean;
  onFullContentRetry?: () => void;
  renderAnnotation?: DiffViewProps<T>["renderAnnotation"];
  roundedCorners?: boolean;
  /** The file can be opened in an editor (the component derives it from the workspace path). */
  canOpenFile?: boolean;
  codeThemes?: DiffViewProps["codeThemes"];
  showHeaderDiffStats?: boolean;
  showFileActions?: boolean;
  showHunkActions?: boolean;
  showLoadError?: boolean;
  stickyHeader?: boolean;
  toggleAriaLabel?: string;
  viewType?: DiffViewType;
  /** Path relative to the workspace; opening is disabled without one. */
  workspaceRelativePath?: string;
}

export const CodeDiff = <T,>({
  background = true,
  canOpenFile = false,
  codeThemes,
  containerClassName,
  diff,
  diffSurface = "main",
  diffViewClassName,
  diffViewWrap = false,
  disableNativeContextMenu = false,
  displayPathOverride,
  expandScope,
  fileActionsDisabled = false,
  fullContentLoadFailed = false,
  getAdditionalContextMenuItems,
  githubFileLookup,
  headerEndContent,
  headerEndContentOpenOnClick,
  headerOpenAction,
  headerVariant = "default",
  hunkActionsVariant = "unstaged",
  hunkSeparators,
  isLoading = false,
  lineAnnotations,
  loadDiffFiles,
  loadNewTabIcon,
  loadOpenTargets,
  messages = DIFF_MESSAGES,
  onCopyPath,
  onDeleteFile,
  onDirectFileToggle,
  onFullContentRetry,
  onHunkAction,
  onLoadRetry,
  onOpenChange,
  onOpenGitHub,
  onOpenInEditor,
  onOpenInNewTab,
  onOpenInTarget,
  onPostRender,
  onRequestChanges,
  onToggleWrap,
  open,
  preferredTargetOverride,
  renderAnnotation,
  roundedCorners = true,
  showFileActions,
  showHeaderDiffStats = true,
  showHunkActions = false,
  showLoadError = false,
  stickyHeader,
  toggleAriaLabel,
  viewType = "auto",
  workspaceRelativePath,
}: CodeDiffProps<T>) => {
  const full = headerVariant === "full-review";
  const [wide, setWide] = useState(false);

  const [wrapState, setWrapState] = useState({
    source: diffViewWrap,
    value: diffViewWrap,
  });

  const contextLineRef = useRef<number | null>(null);

  const hoveredLineRef = useRef<{
    lineNumber: number;
    side: "additions" | "deletions";
  } | null>(null);

  // The prop sets the wrapping, the menu toggles it.
  if (wrapState.source !== diffViewWrap) {
    setWrapState({ source: diffViewWrap, value: diffViewWrap });
  }

  const wrap = wrapState.value;

  const [contextTarget, setContextTarget] = useState<
    ContextTarget | undefined
  >();

  const { status, track } = useDiffContextLoader(loadDiffFiles);
  const toggleAll = useToggleAllDiffs(onOpenChange, expandScope);

  const observeWidth = useCallback(
    (element: HTMLDivElement | null) => {
      if (element === null || viewType !== "auto") {
        return noCleanup;
      }

      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? element.clientWidth;
        setWide(width >= AUTO_SPLIT_MIN_WIDTH);
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    },
    [viewType]
  );

  const { name } = diff.metadata;
  const fileName = name && name !== "/dev/null" ? name : "";
  const displayPath = displayPathOverride ?? fileName;

  const previousName =
    (diff.metadata.type === "rename-pure" ||
      diff.metadata.type === "rename-changed") &&
    diff.metadata.prevName !== undefined
      ? diff.metadata.prevName
      : null;

  const previousFileName =
    previousName === null ? null : basename(previousName);

  const shownFileName = basename(displayPathOverride ?? displayPath);

  const headerPath =
    previousName === null
      ? displayPath
      : `${previousName}${PATH_ARROW}${displayPath}`;

  const headerFileName =
    previousFileName === null
      ? shownFileName
      : `${previousFileName}${PATH_ARROW}${shownFileName}`;

  const pathParts: DiffPathPart[] =
    previousName === null || previousFileName === null
      ? [{ fileName: shownFileName, path: displayPath }]
      : [
          { fileName: previousFileName, path: previousName },
          { fileName: shownFileName, path: displayPath },
        ];

  const openPath =
    workspaceRelativePath ?? (canOpenFile ? displayPath : undefined);

  const isDeletion = diff.metadata.type === "deleted";

  const firstLine = isDeletion
    ? (diff.firstDeletionLine ?? 1)
    : (diff.firstAdditionLine ?? 1);

  const handleToggle = (event?: ReactMouseEvent<HTMLElement>) => {
    const next = !open;

    if (event?.altKey === true) {
      toggleAll(next);
    } else {
      onOpenChange(next);
      onDirectFileToggle?.(next);
    }
  };

  const handleFileName = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation();
    handleToggle(event);
  };

  const handleEndContentClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation();

    if (headerEndContentOpenOnClick !== undefined) {
      onOpenChange(headerEndContentOpenOnClick);

      if (headerEndContentOpenOnClick !== open) {
        onDirectFileToggle?.(headerEndContentOpenOnClick);
      }
    }
  };

  const surface = resolveSurface(background, diffSurface);

  const containerStyle: CustomStyle = {
    "--ui-diff-background": `var(--ui-diff-background-override, ${surface})`,
    backgroundColor: background ? "var(--ui-diff-background)" : undefined,
  };

  const tooLarge = isDiffTooLarge(diff);
  const hasNoChanges = diff.additions === 0 && diff.deletions === 0;

  const renameWithoutChanges =
    hasNoChanges && diff.metadata.type === "rename-pure";

  const lineDiffType =
    diff.additions + diff.deletions > WORD_DIFF_MAX_CHANGED_LINES
      ? "none"
      : "word-alt";

  const contextMessage: ContextMessage | undefined =
    status === "idle"
      ? undefined
      : {
          label:
            status === "loading"
              ? messages.contextLoading
              : messages.contextInlineError,
          retry: messages.contextInlineRetry,
          status,
        };

  const hunkAnnotations = useMemo<
    DiffLineAnnotation<HunkActionsMetadata>[]
  >(() => {
    if (
      !showHunkActions ||
      diff.metadata.type === "new" ||
      diff.metadata.type === "deleted"
    ) {
      return [];
    }

    return diff.metadata.hunks.flatMap((hunk, hunkIndex) => {
      let additions = hunk.additionStart;
      let deletions = hunk.deletionStart;

      let last: { lineNumber: number; side: "additions" | "deletions" } | null =
        null;

      for (const part of hunk.hunkContent) {
        if (part.type === "context") {
          additions += part.lines;
          deletions += part.lines;
        } else {
          if (part.additions > 0) {
            last = {
              lineNumber: additions + part.additions - 1,
              side: "additions",
            };
          } else if (part.deletions > 0) {
            last = {
              lineNumber: deletions + part.deletions - 1,
              side: "deletions",
            };
          }

          additions += part.additions;
          deletions += part.deletions;
        }
      }

      return last
        ? [{ ...last, metadata: { hunkIndex, kind: "hunk-actions" } }]
        : [];
    });
  }, [diff.metadata, showHunkActions]);

  const annotations = useMemo<DiffLineAnnotation<T | HunkActionsMetadata>[]>(
    () => [...hunkAnnotations, ...(lineAnnotations ?? [])],
    [hunkAnnotations, lineAnnotations]
  );

  const renderAnyAnnotation = useCallback(
    // oxlint-disable-next-line typescript/promise-function-async -- returns ReactNode, whose type includes promises; the renderer calls it synchronously.
    (annotation: DiffLineAnnotation<T | HunkActionsMetadata>) => {
      if (isHunkActions(annotation.metadata)) {
        return (
          <DiffHunkActions
            hunkIndex={annotation.metadata.hunkIndex}
            onHunkAction={onHunkAction}
            path={diff.metadata.name}
            variant={hunkActionsVariant}
          />
        );
      }

      return isCallerAnnotation<T>(annotation)
        ? (renderAnnotation?.(annotation) ?? null)
        : null;
    },
    [diff.metadata.name, hunkActionsVariant, onHunkAction, renderAnnotation]
  );

  const resolvedViewType = resolveViewType(viewType, diff, wide);

  const failedBoundaryKey = JSON.stringify([
    diff.metadata.name,
    diff.metadata.isPartial,
    diff.metadata.hunks.map((hunk) => [
      hunk.additionStart,
      hunk.additionCount,
      hunk.additionLineIndex,
      hunk.deletionStart,
      hunk.deletionCount,
      hunk.deletionLineIndex,
    ]),
    diff.metadata.additionLines,
    diff.metadata.deletionLines,
  ]);

  let body: ReactNode;

  if (isLoading) {
    body = (
      <DiffLoading
        additions={diff.additions}
        deletions={diff.deletions}
        messages={messages}
        name={diff.metadata.name}
      />
    );
  } else if (showLoadError) {
    body = <DiffLoadFailed messages={messages} onRetry={onLoadRetry} />;
  } else if (tooLarge) {
    body = (
      <DiffTooLargeNotice
        canOpenFile={openPath !== undefined}
        messages={messages}
        onOpenInEditor={() => onOpenInEditor?.(firstLine)}
      />
    );
  } else if (diff.isBinary === true) {
    body = <DiffNotice kind="binary" messages={messages} />;
  } else if (renameWithoutChanges) {
    body = <DiffNotice kind="rename-without-changes" messages={messages} />;
  } else if (hasNoChanges) {
    body = <DiffNotice kind="empty" messages={messages} />;
  } else {
    body = (
      <>
        {status === "idle" ? null : (
          <span
            className="sr-only"
            role={status === "error" ? "alert" : "status"}
          >
            {status === "error"
              ? messages.contextLoadFailed
              : contextMessage?.label}
          </span>
        )}
        {fullContentLoadFailed ? (
          <DiffFullContentFailed
            messages={messages}
            onRetry={onFullContentRetry}
          />
        ) : null}
        <DiffErrorBoundary
          fallback={<DiffRenderFailed messages={messages} />}
          resetKey={failedBoundaryKey}
        >
          <DiffView<T | HunkActionsMetadata>
            className={cn(
              "relative overflow-clip [contain:content]",
              diffViewClassName
            )}
            codeThemes={codeThemes}
            contextMessage={contextMessage}
            contextTarget={contextTarget}
            diffStyle={resolvedViewType}
            expansionLineCount={20}
            fileDiff={diff.metadata}
            hunkSeparators={hunkSeparators ?? "simple"}
            lineAnnotations={annotations}
            lineDiffType={lineDiffType}
            loadDiffFiles={loadDiffFiles === undefined ? undefined : track}
            onContextExpand={setContextTarget}
            onLineEnter={(props) => {
              hoveredLineRef.current = {
                lineNumber: props.lineNumber,
                side: props.annotationSide,
              };
            }}
            onLineLeave={() => {
              hoveredLineRef.current = null;
            }}
            onPostRender={onPostRender}
            overflow={wrap ? "wrap" : "scroll"}
            renderAnnotation={renderAnyAnnotation}
            reviewLineInfoSeparators={full}
          />
        </DiffErrorBoundary>
      </>
    );
  }

  // The context menu opens for the file at `openPath`, at the line under the pointer.
  const canOpenPath = openPath !== undefined && openPath !== "/dev/null";
  const relativePath = displayPathOverride ?? fileName;

  const canCopyRelativePath =
    relativePath !== "" && !ABSOLUTE_PATH.test(relativePath);

  const canOpenInTab =
    canOpenPath &&
    !isDeletion &&
    (headerOpenAction !== undefined || onOpenInNewTab !== undefined);

  const rootContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    contextLineRef.current = lineOfPath(event.nativeEvent.composedPath());
  };

  const root = (
    <div
      className={cn(
        styles.surfaceVars,
        "group/file-diff flex flex-col overflow-clip",
        roundedCorners && (full ? "rounded-b-lg" : "rounded-lg"),
        full && open && "pb-0.5",
        containerClassName
      )}
      onContextMenu={rootContextMenu}
      style={containerStyle}
    >
      <DiffFileHeader
        diff={diff}
        displayFileName={headerFileName}
        displayPath={headerPath}
        displayPathParts={pathParts}
        fileActionsDisabled={fileActionsDisabled}
        headerEndContent={headerEndContent}
        headerOpenAction={headerOpenAction}
        headerVariant={headerVariant}
        hunkActionsVariant={hunkActionsVariant}
        isLoading={isLoading}
        messages={messages}
        onCopyPath={
          canCopyRelativePath
            ? () => {
                copyText(relativePath);
              }
            : undefined
        }
        onDeleteFile={onDeleteFile}
        onFileAction={(action) =>
          onHunkAction?.({ action, path: diff.metadata.name, scope: "file" })
        }
        onFileNameClick={handleFileName}
        onFileToggle={handleToggle}
        onHeaderEndContentClick={handleEndContentClick}
        onOpenInEditor={() => onOpenInEditor?.(firstLine)}
        open={open}
        showDiffStats={showHeaderDiffStats}
        showFileActions={showFileActions ?? showHunkActions}
        showOpenInButton={openPath !== undefined && !isDeletion}
        stickyHeader={stickyHeader}
        toggleAriaLabel={
          toggleAriaLabel ?? (full ? headerPath : messages.toggleFileDiff)
        }
        workspaceRelativePath={openPath}
      />
      {open ? (
        <div className="relative overflow-hidden" ref={observeWidth}>
          {body}
        </div>
      ) : null}
    </div>
  );

  return (
    <DiffContextMenu
      canOpenFile={canOpenPath}
      disableNative={disableNativeContextMenu}
      getAdditionalItems={getAdditionalContextMenuItems}
      getOpenInNewTab={
        canOpenInTab
          ? () => {
              const line = contextLineRef.current;

              return () => {
                contextLineRef.current = null;

                if (headerOpenAction === undefined) {
                  onOpenInNewTab?.(line ?? firstLine);
                } else {
                  headerOpenAction.onClick(line ?? undefined);
                }
              };
            }
          : undefined
      }
      githubFileLookup={
        isDeletion || openPath === undefined ? undefined : githubFileLookup
      }
      handleOpenInTarget={(target, persistPreferred, appPath) => {
        if (openPath === undefined) {
          return;
        }

        const line = contextLineRef.current ?? firstLine;

        contextLineRef.current = null;
        onOpenInTarget?.({
          appPath,
          line,
          openPath,
          persistPreferred,
          target,
        });
      }}
      loadNewTabIcon={loadNewTabIcon}
      loadOpenTargets={loadOpenTargets}
      onCopyPath={() => {
        if (canOpenPath) {
          if (onCopyPath) {
            onCopyPath(openPath);
          } else {
            copyText(openPath);
          }
        }
      }}
      onCopyRelativePath={
        canCopyRelativePath
          ? () => {
              copyText(relativePath);
            }
          : undefined
      }
      onOpenGitHub={
        onOpenGitHub ??
        ((href) => {
          window.open(href, "_blank", "noopener,noreferrer");
        })
      }
      onRequestChanges={() => {
        onRequestChanges?.(hoveredLineRef.current);
      }}
      onToggleWrap={() => {
        if (onToggleWrap) {
          onToggleWrap();
        } else {
          setWrapState((current) => ({ ...current, value: !current.value }));
        }
      }}
      preferredTargetOverride={preferredTargetOverride}
    >
      {root}
    </DiffContextMenu>
  );
};

/* ------------------------------------------------------------------ */
/* Inline file diff review (O, k, A)                                   */
/* ------------------------------------------------------------------ */

export type InlineReviewAction = "accept" | "edit" | "reject";

export interface InlineFileDiffReviewActionsProps {
  canAccept: boolean;
  canEdit: boolean;
  messages?: DiffMessages;
  onAction: (action: InlineReviewAction) => void;
  onToggleWrap?: () => void;
  wrapLines?: boolean;
}

export const InlineFileDiffReviewActions = ({
  canAccept,
  canEdit,
  messages = DIFF_MESSAGES,
  onAction,
  onToggleWrap,
  wrapLines,
}: InlineFileDiffReviewActionsProps) => {
  const wrapLabel =
    wrapLines === true ? messages.disableWordWrap : messages.enableWordWrap;

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 font-sans">
      {onToggleWrap === undefined ? null : (
        <TooltipHint content={wrapLabel}>
          <Button
            aria-label={wrapLabel}
            color="outline"
            onClick={onToggleWrap}
            size="toolbar"
            uniform
          >
            <WrapText aria-hidden={false} className={ICON_2XS} />
          </Button>
        </TooltipHint>
      )}
      <Button
        color="outline"
        disabled={!canEdit}
        onClick={() => {
          onAction("edit");
        }}
        size="toolbar"
      >
        {messages.inlineEdit}
      </Button>
      <Button
        className={TEXT_DANGER}
        color="outline"
        onClick={() => {
          onAction("reject");
        }}
        size="toolbar"
      >
        {messages.inlineReject}
      </Button>
      <Button
        className={TEXT_CHART_GREEN}
        color="outline"
        disabled={!canAccept}
        onClick={() => {
          onAction("accept");
        }}
        size="toolbar"
      >
        {messages.inlineAccept}
      </Button>
    </div>
  );
};

export interface InlineFileDiffReviewProps {
  canAccept?: boolean;
  canEdit?: boolean;
  compact?: boolean;
  messages?: DiffMessages;
  newFile: DiffFile;
  oldFile: DiffFile;
  onAction: (action: InlineReviewAction) => void;
  onViewportReady?: (viewport: HTMLElement) => void;
  onWrapLinesChange?: (wrap: boolean) => void;
  wrapLines?: boolean;
}

const InlineReviewBody = ({
  canAccept,
  canEdit,
  messages,
  newFile,
  oldFile,
  onAction,
  onViewportReady,
  onWrapLinesChange,
  wrapLines,
}: Required<Pick<InlineFileDiffReviewProps, "canAccept" | "messages">> &
  Omit<InlineFileDiffReviewProps, "canAccept" | "compact" | "messages">) => {
  const [internalWrap, setInternalWrap] = useState(false);
  const wrap = wrapLines ?? internalWrap;
  const called = useRef(false);

  const fileDiff = useMemo(
    () => createFileDiff(oldFile, newFile),
    [newFile, oldFile]
  );

  const handlePostRender = useCallback(
    (host: HTMLElement) => {
      if (called.current || host.querySelector("[data-diff]") === null) {
        return;
      }

      const viewport = host.closest<HTMLElement>(
        "[data-ck-inline-file-diff-review-viewport]"
      );

      if (viewport !== null) {
        called.current = true;
        onViewportReady?.(viewport);
      }
    },
    [onViewportReady]
  );

  return (
    <div
      className={cn(
        styles.surfaceVars,
        "relative flex h-full min-h-0 flex-col"
      )}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto pe-4 pt-4 pb-4"
        data-ck-inline-file-diff-review-viewport=""
      >
        <DiffView
          className="relative overflow-clip [contain:content] [--diffs-min-number-column-width:1ch] [--ui-diff-background:var(--ck-palette-surface-surface)]"
          diffStyle="unified"
          expandUnchanged
          fileDiff={fileDiff}
          hunkSeparators="simple"
          onPostRender={handlePostRender}
          overflow={wrap ? "wrap" : "scroll"}
        />
      </div>
      <div className="flex shrink-0 justify-end border-t border-border bg-panel px-4 py-2">
        <InlineFileDiffReviewActions
          canAccept={canAccept}
          canEdit={canEdit ?? false}
          messages={messages}
          onAction={onAction}
          onToggleWrap={() => {
            setInternalWrap(!wrap);
            onWrapLinesChange?.(!wrap);
          }}
          wrapLines={wrap}
        />
      </div>
    </div>
  );
};

export const InlineFileDiffReview = ({
  canAccept = true,
  canEdit,
  compact,
  messages = DIFF_MESSAGES,
  newFile,
  oldFile,
  onAction,
  onViewportReady,
  onWrapLinesChange,
  wrapLines,
}: InlineFileDiffReviewProps) => {
  if (
    exceedsInlineReviewLimit(oldFile.contents) ||
    exceedsInlineReviewLimit(newFile.contents)
  ) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-sm text-(color:--ck-palette-ink-tertiary)">
        {messages.inlineTooLarge}
        <InlineFileDiffReviewActions
          canAccept={canAccept}
          canEdit={canEdit ?? false}
          messages={messages}
          onAction={onAction}
        />
      </div>
    );
  }

  if (compact === true) {
    return (
      <div
        className={cn(
          styles.surfaceVars,
          "max-h-80 overflow-y-auto rounded-lg border border-border bg-panel"
        )}
      >
        <div className="divide-y divide-stroke-subtle font-mono [font-size:var(--diffs-font-size,var(--ck-type-code-size,12px))] [line-height:var(--diffs-line-height,calc(var(--diffs-font-size,12px)*1.8))]">
          <del className="block bg-[var(--color-diff-deleted)] px-3 py-2 break-words whitespace-pre-wrap no-underline">
            {oldFile.contents}
          </del>
          <ins className="block bg-[var(--color-diff-added)] px-3 py-2 break-words whitespace-pre-wrap no-underline">
            {newFile.contents}
          </ins>
        </div>
        <div className="sticky bottom-0 z-10 flex justify-end border-t border-border bg-panel px-3 py-2">
          <InlineFileDiffReviewActions
            canAccept={canAccept}
            canEdit={canEdit ?? false}
            messages={messages}
            onAction={onAction}
          />
        </div>
      </div>
    );
  }

  return (
    <InlineReviewBody
      canAccept={canAccept}
      canEdit={canEdit}
      messages={messages}
      newFile={newFile}
      oldFile={oldFile}
      onAction={onAction}
      onViewportReady={onViewportReady}
      onWrapLinesChange={onWrapLinesChange}
      wrapLines={wrapLines}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Hover preview (h, DiffPreviewContent)                               */
/* ------------------------------------------------------------------ */

const PREVIEW_OPEN_DELAY_MS = 800;

const PREVIEW_MAX_WIDTH =
  "clamp(0px, calc(var(--radix-tooltip-trigger-width) - 64px), var(--radix-tooltip-content-available-width))";

const PREVIEW_POPUP_CLASS =
  "group/diff-preview pointer-events-none flex h-[min(420px,var(--radix-tooltip-content-available-height,420px),calc(100vh-16px))] flex-col justify-end overflow-visible data-[side]:w-[clamp(0px,calc(var(--radix-tooltip-trigger-width,0px)-64px),var(--radix-tooltip-content-available-width,100vw))] data-[side=bottom]:justify-start";

export interface DiffPreviewContentProps {
  diff: Pick<CodeDiffData, "metadata">;
  displayPath: string;
  linesAdded: number;
  linesRemoved: number;
  onOpen?: (
    event: ReactMouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => void;
}

export const DiffPreviewContent = ({
  diff,
  displayPath,
  linesAdded,
  linesRemoved,
  onOpen,
}: DiffPreviewContentProps) => {
  const [rendered, setRendered] = useState(false);

  const surface = (
    <>
      <div
        className={cn(
          "flex h-9 w-full shrink-0 items-center gap-2 border-b border-border bg-panel-elevated-secondary px-4 py-[var(--ck-change-row-padding,0.25rem)] text-start",
          TEXT_SIZE_CHAT
        )}
      >
        <span className="min-w-0 flex-1 truncate text-text">{displayPath}</span>
        <DiffStats linesAdded={linesAdded} linesRemoved={linesRemoved} />
      </div>
      <div
        className="max-h-96 min-h-0 flex-1 overflow-y-auto [contain:layout_paint]"
        data-testid="diff-preview-scroll"
      >
        <DiffView
          className="relative overflow-clip [contain:content]"
          diffStyle="unified"
          fileDiff={diff.metadata}
          hunkSeparators="simple"
          onPostRender={() => {
            setRendered(true);
          }}
          simpleLineSeparators
        />
      </div>
    </>
  );

  const className = cn(
    styles.surfaceVars,
    "pointer-events-auto flex max-h-full w-full flex-col self-end overflow-hidden rounded-lg border border-border bg-panel-elevated-secondary shadow-xl group-data-[side=bottom]/diff-preview:self-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
    !rendered && "invisible",
    onOpen !== undefined && "cursor-(--ck-action-cursor)"
  );

  if (onOpen === undefined) {
    return <div className={className}>{surface}</div>;
  }

  return (
    <div
      className={className}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(event);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {surface}
    </div>
  );
};

export interface DiffPreviewTooltipProps {
  children: Exclude<ReactNode, Promise<unknown>>;
  diff: Pick<CodeDiffData, "metadata">;
  disabled?: boolean;
  displayPath: string;
  linesAdded: number;
  linesRemoved: number;
  onOpen?: (
    event: ReactMouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => void;
}

/** Interactive top-side tooltip: opens after 800ms, the preview mounts on the first pointer enter. */
export const DiffPreviewTooltip = ({
  children,
  diff,
  disabled = false,
  displayPath,
  linesAdded,
  linesRemoved,
  onOpen,
}: DiffPreviewTooltipProps) => {
  const [entered, setEntered] = useState(false);

  return (
    <TooltipHint
      align="center"
      closeOnTriggerBlur={false}
      content={
        // Mounted on the first pointer enter (the component loads the content
        // chunk then); the element itself is always present so the tooltip
        // and its pointer handler exist before that.
        <div className="contents">
          {entered ? (
            <DiffPreviewContent
              diff={diff}
              displayPath={displayPath}
              linesAdded={linesAdded}
              linesRemoved={linesRemoved}
              onOpen={onOpen}
            />
          ) : null}
        </div>
      }
      delayDuration={PREVIEW_OPEN_DELAY_MS}
      disabled={disabled}
      interactive
      key={disabled ? "disabled" : "enabled"}
      maxWidth={PREVIEW_MAX_WIDTH}
      onPointerEnter={() => {
        setEntered(true);
      }}
      side="top"
      sideOffset={0}
      skipDelayKey="diff-preview"
      tooltipBodyClassName="h-full"
      tooltipClassName={PREVIEW_POPUP_CLASS}
      variant="unstyled"
    >
      {children}
    </TooltipHint>
  );
};

/* ------------------------------------------------------------------ */
/* Page code-block preview              */
/* ------------------------------------------------------------------ */

export interface DiffPagePreviewProps {
  files: readonly FileDiffMetadata[];
  mount?: (element: HTMLDivElement | null) => void;
  wordWrap?: boolean;
}

export const DiffPagePreview = ({
  files,
  mount,
  wordWrap = false,
}: DiffPagePreviewProps) => (
  <div
    className={cn(styles.surfaceVars, "flex min-w-0 flex-col gap-4")}
    data-ck-page-code-block-preview=""
    ref={mount}
  >
    {files.map((file) => (
      <div className="flex min-w-0 flex-col gap-2" key={file.name}>
        <div
          className="truncate px-4 font-mono text-xs text-text-muted"
          title={file.name}
        >
          {file.name}
        </div>
        <DiffView
          diffStyle="unified"
          fileDiff={file}
          hunkSeparators="simple"
          overflow={wordWrap ? "wrap" : "scroll"}
        />
      </div>
    ))}
  </div>
);
