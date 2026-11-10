"use client";

import { cn } from "@workspace/react/lib/utils";
import {
  ChevronDown as LucideChevronDown,
  ChevronsUpDown as LucideChevronsUpDown,
  Plus as LucidePlus,
} from "lucide-react";
/* oxlint-disable shadcn/no-inline-styles -- Pierre sets row spans, buffer heights and the gutter utility slot position inline; the values are per-row counts, not theme values. */
/* oxlint-disable eslint/complexity -- collectEvents, buildRows and the pointer handlers are single-pass versions of Pierre's iterateOverDiff, processDiffResult and interaction manager; they share cursor state across their branches. */
/* oxlint-disable eslint/no-nested-ternary -- the conditional chains pick one value per line type and annotation side. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Pierre's expanders are `div[role=button]` and are not focusable. */
/* oxlint-disable unicorn/prefer-dom-node-dataset -- the attribute checks run on composed-path nodes that include SVG icons, which have no `dataset` on Element; the component reads them with getAttribute/hasAttribute (interaction manager). */
/*
 * The diff renderer, based on the @pierre/diffs FileDiff class, which is not a
 * dependency of this project: its DOM, row layout, separators, hunk expansion,
 * hover, selection and scroll-sync behaviour sit on top of the stylesheet in ui/components/ui/diff.module.css.
 *
 * Syntax highlighting: a pool of Prism workers (syntax-pool.ts, refractor)
 * answers with token roles, and the Developer Light/Dark themes color them
 * (syntax-theme.ts, syntax-line.tsx). Lines render in a pending state until
 * the tokens arrive, and stay in it for plain text (--diffs-light/--diffs-dark
 * are --color-text).
 */
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

import type { CodeThemeSelection } from "./code-themes";
import {
  createFileDiff,
  diffLinePair,
  hunkIndexStart,
  resolveHunkExpansion,
  resolveTrailingExpansion,
  stripLineEnding,
  unmodifiedLinesLabel,
} from "./diff-model";
import type {
  DiffFile,
  DiffHunk,
  DiffSpan,
  ExpandedHunks,
  ExpandedRange,
  FileDiffMetadata,
  LineDiffType,
} from "./diff-model";
import { LineSelectionController, renderSelection } from "./line-selection";
import type {
  SelectedLinesOptions,
  SelectionView,
  UtilityTarget,
} from "./line-selection";
import type { RoleToken } from "./syntax-highlight";
import { renderTokenLine } from "./syntax-line";
import type { SyntaxThemes } from "./syntax-theme";
import { useCodeThemes } from "./use-code-themes";
import { useDiffTokens } from "./use-diff-tokens";
import type { DiffTokens } from "./use-diff-tokens";

import styles from "../ui/diff.module.css";

export type DiffStyle = "split" | "unified";

export type DiffOverflow = "scroll" | "wrap";

export type DiffIndicators = "bars" | "classic" | "none";

export type HunkSeparators =
  | "line-info"
  | "line-info-basic"
  | "metadata"
  | "simple";

export type AnnotationSide = "additions" | "deletions";

export type LineHoverHighlight = "both" | "disabled" | "line" | "number";

export type DiffThemeType = "dark" | "light" | "system";

export type ExpandDirection = "both" | "down" | "up";

export interface DiffLineAnnotation<T = unknown> {
  lineNumber: number;
  metadata: T;
  side: AnnotationSide;
}

export interface SelectedLineRange {
  end: number;
  endSide?: AnnotationSide;
  side?: AnnotationSide;
  start: number;
}

export interface DiffLineEventProps {
  annotationSide: AnnotationSide;
  event: ReactMouseEvent | ReactPointerEvent;
  lineNumber: number;
  lineType: string;
}

export type ContextControl =
  | "data-ck-expand-all-button"
  | "data-ck-expand-both"
  | "data-ck-expand-down"
  | "data-ck-expand-up"
  | "data-ck-unmodified-lines";

/** The expander the user pressed. */
export interface ContextTarget {
  control: ContextControl;
  index: string;
  shiftKey: boolean;
}

/** The label state the app puts into the separator while context loads. */
export interface ContextMessage {
  label: string;
  retry: string;
  status: "error" | "loading";
}

const noCleanup = () => {
  // Nothing to undo when there is no split pane or host to observe.
};

const ignoreRejection = (): null => null;

const noTarget = (): UtilityTarget | null => null;

const noIndex = (): readonly [number, number] | null => null;

const ignoreTarget = () => {
  // The first render replaces the controller's callbacks.
};

const ignoreView = ignoreTarget;

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

export interface DiffViewProps<T = unknown> {
  alignCommentGutter?: boolean;
  className?: string;
  /** Code theme names for the light and dark scopes. */
  codeThemes?: CodeThemeSelection;
  collapsedContextThreshold?: number;
  /** Message and target of the expander that is loading or failed. */
  contextMessage?: ContextMessage;
  contextTarget?: ContextTarget;
  diffIndicators?: DiffIndicators;
  diffStyle?: DiffStyle;
  disableBackground?: boolean;
  disableLineNumbers?: boolean;
  enableGutterUtility?: boolean;
  enableLineSelection?: boolean;
  expandUnchanged?: boolean;
  expansionLineCount?: number;
  fileDiff: FileDiffMetadata;
  hunkSeparators?: HunkSeparators;
  lineAnnotations?: readonly DiffLineAnnotation<T>[];
  lineDiffType?: LineDiffType;
  lineHoverHighlight?: LineHoverHighlight;
  /** Loads the full files of a partial diff when an expander is pressed. */
  loadDiffFiles?: (
    fileDiff: FileDiffMetadata
  ) => Promise<{ newFile: DiffFile | null; oldFile: DiffFile | null }>;
  maxLineDiffLength?: number;
  onContextExpand?: (target: ContextTarget) => void;
  onGutterUtilityClick?: (range: SelectedLineRange) => void;
  onLineClick?: (props: DiffLineEventProps) => void;
  onLineEnter?: (props: DiffLineEventProps) => void;
  onLineLeave?: (props: DiffLineEventProps) => void;
  onLineNumberClick?: (props: DiffLineEventProps) => void;
  onLineSelected?: (range: SelectedLineRange | null) => void;
  onLineSelectionChange?: (range: SelectedLineRange | null) => void;
  onLineSelectionEnd?: (range: SelectedLineRange | null) => void;
  onLineSelectionStart?: (range: SelectedLineRange | null) => void;
  /** Called after each render with the host element (Pierre `onPostRender`). */
  onPostRender?: (host: HTMLElement) => void;
  overflow?: DiffOverflow;
  renderAnnotation?: (annotation: DiffLineAnnotation<T>) => ReactNode;
  /** Reviewer-pane separators (code-diff `useReviewLineInfoSeparators`). */
  reviewLineInfoSeparators?: boolean;
  selectedLines?: SelectedLineRange | null;
  /** Pierre `setSelectedLines(range, options)`: which column and cells the `selectedLines` highlight. */
  selectedLinesOptions?: Omit<SelectedLinesOptions, "notify">;
  /** Thin rule instead of the grey band for `simple` separators. */
  simpleLineSeparators?: boolean;
  style?: CSSProperties;
  /** Omitted: follows the nearest theme scope. `system` follows the OS. */
  themeType?: DiffThemeType;
  /** Plain text above this many lines on a side (library default 100000). */
  tokenizeMaxLength?: number;
  /** A line this long or longer is one default-colored token (library default 1000). */
  tokenizeMaxLineLength?: number;
}

/* ------------------------------------------------------------------ */
/* Row events. */
/* ------------------------------------------------------------------ */

interface LineRef {
  lineIndex: number;
  lineNumber: number;
  noEOFCR: boolean;
  splitLineIndex: number;
  unifiedLineIndex: number;
}

type EventType = "change" | "context" | "context-expanded";

interface DiffEvent {
  additionLine?: LineRef;
  collapsedAfter: number;
  collapsedBefore: number;
  deletionLine?: LineRef;
  hunk?: DiffHunk;
  hunkIndex: number;
  type: EventType;
}

const collectEvents = ({
  collapsedContextThreshold,
  diff,
  diffStyle,
  expandedHunks,
}: {
  collapsedContextThreshold: number;
  diff: FileDiffMetadata;
  diffStyle: DiffStyle;
  expandedHunks: ExpandedHunks | undefined;
}): DiffEvent[] => {
  const events: DiffEvent[] = [];
  const unified = diffStyle === "unified";
  const lastHunkIndex = diff.hunks.length - 1;

  for (const [hunkIndex, hunk] of diff.hunks.entries()) {
    const deletionIndex = hunkIndexStart(
      hunk.deletionStart,
      hunk.deletionCount
    );

    const additionIndex = hunkIndexStart(
      hunk.additionStart,
      hunk.additionCount
    );

    const expansion = resolveHunkExpansion({
      collapsedContextThreshold,
      expandedHunks,
      hunkIndex,
      isPartial: diff.isPartial,
      rangeSize: hunk.collapsedBefore,
    });

    const trailing =
      hunkIndex === lastHunkIndex
        ? resolveTrailingExpansion({
            collapsedContextThreshold,
            diff,
            expandedHunks,
          })
        : undefined;

    const trailingCollapsed = (unifiedIndex: number, splitIndex: number) => {
      if (
        trailing === undefined ||
        trailing.collapsedLines <= 0 ||
        trailing.fromStart + trailing.fromEnd > 0
      ) {
        return 0;
      }

      const isLast = unified
        ? unifiedIndex === hunk.unifiedLineStart + hunk.unifiedLineCount - 1
        : splitIndex === hunk.splitLineStart + hunk.splitLineCount - 1;

      return isLast ? trailing.collapsedLines : 0;
    };

    let gapPending = expansion.collapsedLines !== 0;

    const takeGap = () => {
      if (!gapPending) {
        return 0;
      }

      gapPending = false;

      return expansion.collapsedLines;
    };

    const expandedAt = (
      count: number,
      offset: number,
      collapsedBefore: () => number
    ) => {
      const unifiedBase = hunk.unifiedLineStart - offset;
      const splitBase = hunk.splitLineStart - offset;
      const deletionLineIndex = hunk.deletionLineIndex - offset;
      const additionLineIndex = hunk.additionLineIndex - offset;
      const deletionNumber = deletionIndex + 1 - offset;
      const additionNumber = additionIndex + 1 - offset;

      for (let step = 0; step < count; step += 1) {
        events.push({
          additionLine: {
            lineIndex: additionLineIndex + step,
            lineNumber: additionNumber + step,
            noEOFCR: false,
            splitLineIndex: splitBase + step,
            unifiedLineIndex: unifiedBase + step,
          },
          collapsedAfter: 0,
          collapsedBefore: step === 0 ? collapsedBefore() : 0,
          deletionLine: {
            lineIndex: deletionLineIndex + step,
            lineNumber: deletionNumber + step,
            noEOFCR: false,
            splitLineIndex: splitBase + step,
            unifiedLineIndex: unifiedBase + step,
          },
          hunk,
          hunkIndex,
          type: "context-expanded",
        });
      }
    };

    expandedAt(expansion.fromStart, expansion.rangeSize, () => 0);
    expandedAt(expansion.fromEnd, expansion.fromEnd, takeGap);

    let unifiedCursor = hunk.unifiedLineStart;
    let splitCursor = hunk.splitLineStart;
    let deletionCursor = hunk.deletionLineIndex;
    let additionCursor = hunk.additionLineIndex;
    let deletionNumber = deletionIndex + 1;
    let additionNumber = additionIndex + 1;
    const lastContent = hunk.hunkContent.at(-1);

    for (const part of hunk.hunkContent) {
      const isLastContent = part === lastContent;

      if (part.type === "context") {
        for (let step = 0; step < part.lines; step += 1) {
          const isLastLine = isLastContent && step === part.lines - 1;
          const unifiedIndex = unifiedCursor + step;
          const splitIndex = splitCursor + step;
          events.push({
            additionLine: {
              lineIndex: additionCursor + step,
              lineNumber: additionNumber + step,
              noEOFCR: isLastLine && hunk.noEOFCRAdditions,
              splitLineIndex: splitIndex,
              unifiedLineIndex: unifiedIndex,
            },
            collapsedAfter: trailingCollapsed(unifiedIndex, splitIndex),
            collapsedBefore: takeGap(),
            deletionLine: {
              lineIndex: deletionCursor + step,
              lineNumber: deletionNumber + step,
              noEOFCR: isLastLine && hunk.noEOFCRDeletions,
              splitLineIndex: splitIndex,
              unifiedLineIndex: unifiedIndex,
            },
            hunk,
            hunkIndex,
            type: "context",
          });
        }

        unifiedCursor += part.lines;
        splitCursor += part.lines;
        deletionCursor += part.lines;
        additionCursor += part.lines;
        deletionNumber += part.lines;
        additionNumber += part.lines;
      } else {
        const splitCount = Math.max(part.deletions, part.additions);
        const unifiedCount = part.deletions + part.additions;
        const total = unified ? unifiedCount : splitCount;

        for (let step = 0; step < total; step += 1) {
          const hasDeletion = step < part.deletions;
          const additionStep = unified ? step - part.deletions : step;

          const hasAddition = unified
            ? step >= part.deletions
            : step < part.additions;

          const splitIndex =
            splitCursor + (unified && !hasDeletion ? additionStep : step);

          const deletionUnified = hasDeletion
            ? unifiedCursor + step
            : undefined;

          const additionUnified = hasAddition
            ? unifiedCursor + part.deletions + additionStep
            : undefined;

          const lastLineOfBlock = unified
            ? step === unifiedCount - 1
            : step === splitCount - 1;

          const deletionNoEOF = unified
            ? isLastContent &&
              step === part.deletions - 1 &&
              hunk.noEOFCRDeletions
            : isLastContent && lastLineOfBlock && hunk.noEOFCRDeletions;

          const additionNoEOF =
            isLastContent && lastLineOfBlock ? hunk.noEOFCRAdditions : false;

          events.push({
            additionLine:
              hasAddition && additionUnified !== undefined
                ? {
                    lineIndex: additionCursor + additionStep,
                    lineNumber: additionNumber + additionStep,
                    noEOFCR: additionNoEOF,
                    splitLineIndex: splitIndex,
                    unifiedLineIndex: additionUnified,
                  }
                : undefined,
            collapsedAfter: trailingCollapsed(unifiedCursor + step, splitIndex),
            collapsedBefore: takeGap(),
            deletionLine:
              hasDeletion && deletionUnified !== undefined
                ? {
                    lineIndex: deletionCursor + step,
                    lineNumber: deletionNumber + step,
                    noEOFCR: deletionNoEOF,
                    splitLineIndex: splitIndex,
                    unifiedLineIndex: deletionUnified,
                  }
                : undefined,
            hunk,
            hunkIndex,
            type: "change",
          });
        }

        takeGap();
        unifiedCursor += unifiedCount;
        splitCursor += splitCount;
        deletionCursor += part.deletions;
        additionCursor += part.additions;
        deletionNumber += part.deletions;
        additionNumber += part.additions;
      }
    }

    if (trailing !== undefined) {
      const shown = trailing.fromStart + trailing.fromEnd;

      for (let step = 0; step < shown; step += 1) {
        const line = {
          splitLineIndex: splitCursor + step,
          unifiedLineIndex: unifiedCursor + step,
        };

        events.push({
          additionLine: {
            ...line,
            lineIndex: additionCursor + step,
            lineNumber: additionNumber + step,
            noEOFCR: false,
          },
          collapsedAfter: step === shown - 1 ? trailing.collapsedLines : 0,
          collapsedBefore: 0,
          deletionLine: {
            ...line,
            lineIndex: deletionCursor + step,
            lineNumber: deletionNumber + step,
            noEOFCR: false,
          },
          hunkIndex: diff.hunks.length,
          type: "context-expanded",
        });
      }
    }
  }

  return events;
};

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

type ColumnKind = "additions" | "deletions" | "unified";

interface Column {
  content: ReactNode[];
  gutter: ReactNode[];
}

interface Rows {
  additions: Column;
  deletions: Column;
  rowCount: number;
  unified: Column;
}

interface BufferState {
  side: AnnotationSide | undefined;
  size: number;
}

interface HoverState {
  annotationSide: AnnotationSide;
  column: ColumnKind;
  indexAttribute: string;
  lineNumber: number;
  lineType: string;
}

const EXPAND_ICONS = {
  both: LucideChevronsUpDown,
  plus: LucidePlus,
  single: LucideChevronDown,
} as const;

const Icon = ({ icon: Glyph }: { icon: LucideIcon }) => (
  <Glyph data-icon="" size={16} strokeWidth={1.5} />
);

const attr = (value: boolean | undefined) => (value === true ? "" : undefined);

const lineSide = (column: ColumnKind, lineType: string): AnnotationSide => {
  if (column === "deletions" || lineType === "change-deletion") {
    return "deletions";
  }

  return "additions";
};

interface BuildInput<T> {
  annotations: ReadonlyMap<string, DiffLineAnnotation<T>[]>;
  contextMessage: ContextMessage | undefined;
  contextTarget: ContextTarget | undefined;
  decorations: ReadonlyMap<string, DiffSpan[]>;
  diff: FileDiffMetadata;
  diffStyle: DiffStyle;
  enableGutterUtility: boolean;
  events: readonly DiffEvent[];
  expandable: boolean;
  expansionLineCount: number;
  hover: HoverState | null;
  hunkSeparators: HunkSeparators;
  lineHoverHighlight: LineHoverHighlight;
  partialLoader: boolean;
  renderAnnotation:
    | ((annotation: DiffLineAnnotation<T>) => ReactNode)
    | undefined;
  syntaxThemes: SyntaxThemes;
  tokens: DiffTokens | undefined;
  trailingUnknown: boolean;
  utility: UtilityTarget | null;
}

const renderLineText = (
  text: string,
  spans: readonly DiffSpan[] | undefined,
  tokens: readonly RoleToken[] | undefined,
  syntaxThemes: SyntaxThemes
): ReactNode => {
  if (text === "") {
    return "\n";
  }

  if (tokens !== undefined) {
    const highlighted = renderTokenLine(text, tokens, spans, syntaxThemes);

    if (highlighted !== undefined) {
      return highlighted;
    }
  }

  if (!spans || spans.length === 0) {
    return <span data-char="">{text}</span>;
  }

  const parts: ReactNode[] = [];
  let position = 0;

  for (const span of spans) {
    if (span.start > position) {
      parts.push(text.slice(position, span.start));
    }

    parts.push(
      <span data-diff-span="" key={`${span.start}:${span.length}`}>
        {text.slice(span.start, span.start + span.length)}
      </span>
    );
    position = span.start + span.length;
  }

  if (position < text.length) {
    parts.push(text.slice(position));
  }

  return <span data-char="">{parts}</span>;
};

const separatorKeyFor = (column: ColumnKind, index: number | string) =>
  `separator:${column}:${index}`;

const BUTTON_CONTROLS = {
  both: "data-ck-expand-both",
  down: "data-ck-expand-down",
  up: "data-ck-expand-up",
} as const satisfies Record<"both" | "down" | "up", ContextControl>;

/** One separator element, with the app's loading/error label state. */
const renderSeparator = ({
  chunked,
  content,
  contextMessage,
  contextTarget,
  expandIndex,
  isFirstHunk,
  isLastHunk,
  key,
  type,
}: {
  chunked: boolean;
  content: string | undefined;
  contextMessage: ContextMessage | undefined;
  contextTarget: ContextTarget | undefined;
  expandIndex: number | undefined;
  isFirstHunk: boolean;
  isLastHunk: boolean;
  key: string;
  type: HunkSeparators;
}) => {
  const active =
    contextMessage !== undefined &&
    contextTarget !== undefined &&
    expandIndex !== undefined &&
    contextTarget.index === String(expandIndex);

  const pendingControl = active ? contextTarget.control : undefined;
  const isLoading = active && contextMessage.status === "loading";
  const showMessage = active && pendingControl !== undefined;

  if (type === "metadata" && content !== undefined) {
    return (
      <div
        data-separator="metadata"
        data-separator-first={attr(isFirstHunk)}
        data-separator-last={attr(isLastHunk)}
        key={key}
      >
        <div data-separator-wrapper="">{content}</div>
      </div>
    );
  }

  const isLineInfo = type === "line-info" || type === "line-info-basic";

  if (!(isLineInfo && content !== undefined)) {
    return (
      <div
        data-separator="simple"
        data-separator-first={attr(isFirstHunk)}
        data-separator-last={attr(isLastHunk)}
        key={key}
      />
    );
  }

  const buttons: ("both" | "down" | "up")[] = [];

  if (expandIndex !== undefined) {
    if (chunked) {
      if (!isFirstHunk) {
        buttons.push("up");
      }

      if (!isLastHunk) {
        buttons.push("down");
      }
    } else if (!isFirstHunk && !isLastHunk) {
      buttons.push("both");
    } else {
      buttons.push(isFirstHunk ? "down" : "up");
    }
  }

  return (
    <div
      data-ck-expand-index={expandIndex}
      data-separator={type}
      data-separator-first={attr(isFirstHunk)}
      data-separator-last={attr(isLastHunk)}
      key={key}
    >
      <div
        data-separator-multi-button={attr(buttons.length > 1)}
        data-separator-wrapper=""
      >
        {buttons.map((kind) => (
          <div
            data-ck-context-pending={attr(
              isLoading && pendingControl === BUTTON_CONTROLS[kind]
            )}
            data-ck-expand-both={attr(kind === "both")}
            data-ck-expand-button=""
            data-ck-expand-down={attr(kind === "down")}
            data-ck-expand-up={attr(kind === "up")}
            key={kind}
            role="button"
          >
            <Icon
              icon={kind === "both" ? EXPAND_ICONS.both : EXPAND_ICONS.single}
            />
          </div>
        ))}
        <div data-separator-content="">
          <span
            data-ck-unmodified-lines=""
            hidden={showMessage ? true : undefined}
          >
            {content}
          </span>
          {showMessage ? (
            <span
              data-ck-context-label-pending={attr(
                isLoading && pendingControl === "data-ck-unmodified-lines"
              )}
              data-ck-context-message={contextMessage.status}
            >
              {contextMessage.label}
              {contextMessage.status === "error" ? (
                <>
                  {" "}
                  <button data-ck-context-retry="" type="button">
                    {contextMessage.retry}
                  </button>
                </>
              ) : null}
            </span>
          ) : null}
        </div>
        {chunked && expandIndex !== undefined ? (
          <div
            data-ck-expand-all-button=""
            data-ck-expand-button=""
            role="button"
          >
            Expand all
          </div>
        ) : null}
      </div>
    </div>
  );
};

const trailingRangeSize = (diff: FileDiffMetadata) => {
  const last = diff.hunks.at(-1);

  if (!last || diff.isPartial) {
    return 0;
  }

  return Math.max(
    Math.min(
      diff.additionLines.length -
        (hunkIndexStart(last.additionStart, last.additionCount) +
          last.additionCount),
      diff.deletionLines.length -
        (hunkIndexStart(last.deletionStart, last.deletionCount) +
          last.deletionCount)
    ),
    0
  );
};

const buildRows = <T,>(input: BuildInput<T>): Rows => {
  const {
    annotations,
    contextMessage,
    contextTarget,
    decorations,
    diff,
    diffStyle,
    enableGutterUtility,
    events,
    expandable,
    expansionLineCount,
    hover,
    hunkSeparators,
    lineHoverHighlight,
    partialLoader,
    renderAnnotation,
    syntaxThemes,
    tokens,
    trailingUnknown,
    utility,
  } = input;

  const unified = diffStyle === "unified";

  const rows: Rows = {
    additions: { content: [], gutter: [] },
    deletions: { content: [], gutter: [] },
    rowCount: 0,
    unified: { content: [], gutter: [] },
  };

  const buffer: BufferState = { side: undefined, size: 0 };

  let counter = 0;

  const nextKey = (prefix: string) => {
    counter += 1;

    return `${prefix}:${counter}`;
  };

  const flush = () => {
    if (unified) {
      return;
    }

    if (buffer.size <= 0 || buffer.side === undefined) {
      buffer.side = undefined;
      buffer.size = 0;

      return;
    }

    const column =
      buffer.side === "additions" ? rows.additions : rows.deletions;

    const { size } = buffer;
    column.gutter.push(
      <div
        data-ck-buffer-size={size}
        data-gutter-buffer="buffer"
        key={nextKey("gb")}
        style={{
          gridRow: `span ${size}`,
          minHeight: `calc(${size} * 1lh)`,
        }}
      />
    );
    column.content.push(
      <div
        data-ck-buffer-size={size}
        data-content-buffer=""
        key={nextKey("cb")}
        style={{
          gridRow: `span ${size}`,
          minHeight: `calc(${size} * 1lh)`,
        }}
      />
    );
    buffer.size = 0;
    buffer.side = undefined;
  };

  const pushSeparator = (
    column: ColumnKind,
    options: {
      chunked: boolean;
      content: string | undefined;
      expandIndex: number | undefined;
      isFirstHunk: boolean;
      isLastHunk: boolean;
      key: string;
      type: HunkSeparators;
    }
  ) => {
    const gutterElement = renderSeparator({
      ...options,
      contextMessage,
      contextTarget,
      key: `${options.key}:g`,
    });

    const contentElement = renderSeparator({
      ...options,
      contextMessage,
      contextTarget,
      key: `${options.key}:c`,
    });

    rows[column].gutter.push(gutterElement);
    rows[column].content.push(contentElement);

    if (column !== "additions") {
      rows.rowCount += 1;
    }
  };

  const emitSeparator = (info: {
    lines: number | null;
    hunkIndex: number;
    hunkSpecs: string | undefined;
    isFirstHunk: boolean;
    isLastHunk: boolean;
    rangeSize: number;
  }) => {
    if (info.lines !== null && info.lines <= 0) {
      return;
    }

    flush();

    const columns: ColumnKind[] = unified
      ? ["unified"]
      : ["deletions", "additions"];

    for (const column of columns) {
      const key = separatorKeyFor(column, nextKey("s"));

      if (hunkSeparators === "metadata") {
        if (info.hunkSpecs !== undefined) {
          pushSeparator(column, {
            chunked: false,
            content: info.hunkSpecs,
            expandIndex: undefined,
            isFirstHunk: info.isFirstHunk,
            isLastHunk: info.isLastHunk,
            key,
            type: "metadata",
          });
        }
      } else if (hunkSeparators === "simple") {
        if (info.hunkIndex > 0) {
          pushSeparator(column, {
            chunked: false,
            content: undefined,
            expandIndex: undefined,
            isFirstHunk: info.isFirstHunk,
            isLastHunk: false,
            key,
            type: "simple",
          });
        }
      } else {
        pushSeparator(column, {
          chunked: info.rangeSize > expansionLineCount,
          content:
            info.lines === null
              ? "More unchanged context may be available"
              : unmodifiedLinesLabel(info.lines),
          expandIndex: expandable ? info.hunkIndex : undefined,
          isFirstHunk: info.isFirstHunk,
          isLastHunk: info.isLastHunk,
          key,
          type: hunkSeparators,
        });
      }
    }
  };

  const numberCell = ({
    column,
    indexAttribute,
    lineNumber,
    lineType,
  }: {
    column: ColumnKind;
    indexAttribute: string;
    lineNumber: number;
    lineType: string;
  }) => {
    const isHovered =
      hover?.column === column &&
      hover.indexAttribute === indexAttribute &&
      (lineHoverHighlight === "both" || lineHoverHighlight === "number");

    const showsUtility =
      enableGutterUtility &&
      utility?.column === column &&
      utility.indexAttribute === indexAttribute;

    return (
      <div
        data-ck-column-number={lineNumber}
        data-hovered={attr(isHovered)}
        data-line-index={indexAttribute}
        data-line-type={lineType}
        key={`n:${column}:${indexAttribute}`}
      >
        <span data-line-number-content="">{lineNumber}</span>
        {showsUtility ? (
          <div
            data-gutter-utility-slot=""
            style={{
              bottom: 0,
              position: "absolute",
              textAlign: "center",
              top: 0,
              touchAction: "none",
              whiteSpace: "normal",
            }}
          >
            <button data-ck-utility-button="" type="button">
              <Icon icon={EXPAND_ICONS.plus} />
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const lineElement = ({
    altLine,
    column,
    indexAttribute,
    lineNumber,
    lineType,
    spans,
    text,
    tokens: lineTokens,
  }: {
    altLine: number | undefined;
    column: ColumnKind;
    indexAttribute: string;
    lineNumber: number;
    lineType: string;
    spans: readonly DiffSpan[] | undefined;
    text: string;
    tokens: readonly RoleToken[] | undefined;
  }) => {
    const isHovered =
      hover?.column === column &&
      hover.indexAttribute === indexAttribute &&
      (lineHoverHighlight === "both" || lineHoverHighlight === "line");

    return (
      <div
        data-ck-alt-line={altLine}
        data-hovered={attr(isHovered)}
        data-line={lineNumber}
        data-line-index={indexAttribute}
        data-line-type={lineType}
        key={`l:${column}:${indexAttribute}`}
      >
        {renderLineText(text, spans, lineTokens, syntaxThemes)}
      </div>
    );
  };

  const annotationRow = (
    column: ColumnKind,
    lineType: string,
    items: readonly DiffLineAnnotation<T>[],
    pairKey: string
  ) => {
    rows[column].gutter.push(
      <div
        data-ck-buffer-size={1}
        data-gutter-buffer="annotation"
        key={nextKey("ag")}
        style={{ gridRow: "span 1" }}
      />
    );
    rows[column].content.push(
      <div
        data-annotation-pair={pairKey}
        data-line-annotation=""
        data-line-type={lineType}
        key={nextKey("ac")}
      >
        <div data-ck-annotation-content="">
          {items.map((item, index) => (
            <div
              data-ck-annotation-slot=""
              key={`${item.side}:${item.lineNumber}:${index}`}
              style={{ whiteSpace: "normal" }}
            >
              {renderAnnotation?.(item)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const annotationsFor = (
    deletionNumber: number | undefined,
    additionNumber: number | undefined
  ) => {
    const deletionItems =
      deletionNumber === undefined
        ? []
        : (annotations.get(`deletions:${deletionNumber}`) ?? []);

    const additionItems =
      additionNumber === undefined
        ? []
        : (annotations.get(`additions:${additionNumber}`) ?? []);

    return { additionItems, deletionItems };
  };

  const lastHunkIndex = diff.hunks.length - 1;

  for (const event of events) {
    const { additionLine, deletionLine, hunk, hunkIndex, type } = event;

    if (!unified && type !== "change") {
      flush();
    }

    if (event.collapsedBefore > 0) {
      emitSeparator({
        hunkIndex,
        hunkSpecs: hunk?.hunkSpecs,
        isFirstHunk: hunkIndex === 0,
        isLastHunk: false,
        lines: event.collapsedBefore,
        rangeSize: Math.max(hunk?.collapsedBefore ?? 0, 0),
      });
    }

    const deletionText =
      deletionLine === undefined
        ? undefined
        : stripLineEnding(diff.deletionLines[deletionLine.lineIndex] ?? "");

    const additionText =
      additionLine === undefined
        ? undefined
        : stripLineEnding(diff.additionLines[additionLine.lineIndex] ?? "");

    const deletionSpans =
      deletionLine === undefined
        ? undefined
        : decorations.get(`d:${deletionLine.lineIndex}`);

    const additionSpans =
      additionLine === undefined
        ? undefined
        : decorations.get(`a:${additionLine.lineIndex}`);

    const splitIndex =
      additionLine?.splitLineIndex ?? deletionLine?.splitLineIndex ?? 0;

    // The side that lacks a line, which receives the buffer.
    const oneSided: AnnotationSide | undefined =
      type === "change" &&
      (additionLine === undefined) !== (deletionLine === undefined)
        ? additionLine === undefined
          ? "additions"
          : "deletions"
        : undefined;

    if (unified) {
      const unifiedIndex =
        additionLine?.unifiedLineIndex ?? deletionLine?.unifiedLineIndex ?? 0;

      const lineType =
        type === "change"
          ? additionLine === undefined
            ? "change-deletion"
            : "change-addition"
          : type;

      const indexAttribute = `${unifiedIndex},${splitIndex}`;
      const number = additionLine?.lineNumber ?? deletionLine?.lineNumber ?? 0;
      const useAddition = additionLine !== undefined;
      rows.unified.gutter.push(
        numberCell({
          column: "unified",
          indexAttribute,
          lineNumber: number,
          lineType,
        })
      );
      rows.unified.content.push(
        lineElement({
          altLine: useAddition ? deletionLine?.lineNumber : undefined,
          column: "unified",
          indexAttribute,
          lineNumber: number,
          lineType,
          spans: useAddition ? additionSpans : deletionSpans,
          text: (useAddition ? additionText : deletionText) ?? "",
          tokens: useAddition
            ? tokens?.additions[additionLine.lineIndex]
            : tokens?.deletions[deletionLine?.lineIndex ?? -1],
        })
      );

      const found = annotationsFor(
        deletionLine?.lineNumber,
        additionLine?.lineNumber
      );

      const items = [...found.deletionItems, ...found.additionItems];

      if (items.length > 0) {
        annotationRow(
          "unified",
          type === "change"
            ? additionLine === undefined
              ? "change-deletion"
              : "change-addition"
            : type,
          items,
          `u:${indexAttribute}`
        );
        rows.rowCount += 1;
      }
    } else {
      if (oneSided === undefined) {
        if (type === "change") {
          flush();
        }
      } else {
        if (buffer.side !== undefined && buffer.side !== oneSided) {
          flush();
        }

        buffer.side = oneSided;
        buffer.size += 1;
      }

      const found = annotationsFor(
        deletionLine?.lineNumber,
        additionLine?.lineNumber
      );

      const hasAnnotations =
        found.deletionItems.length > 0 || found.additionItems.length > 0;

      if (hasAnnotations && buffer.size > 0) {
        flush();
      }

      if (deletionLine !== undefined) {
        const lineType = type === "change" ? "change-deletion" : type;
        const indexAttribute = `${deletionLine.unifiedLineIndex},${splitIndex}`;
        rows.deletions.gutter.push(
          numberCell({
            column: "deletions",
            indexAttribute,
            lineNumber: deletionLine.lineNumber,
            lineType,
          })
        );
        rows.deletions.content.push(
          lineElement({
            altLine: undefined,
            column: "deletions",
            indexAttribute,
            lineNumber: deletionLine.lineNumber,
            lineType,
            spans: deletionSpans,
            text: deletionText ?? "",
            tokens: tokens?.deletions[deletionLine.lineIndex],
          })
        );
      }

      if (additionLine !== undefined) {
        const lineType = type === "change" ? "change-addition" : type;
        const indexAttribute = `${additionLine.unifiedLineIndex},${splitIndex}`;
        rows.additions.gutter.push(
          numberCell({
            column: "additions",
            indexAttribute,
            lineNumber: additionLine.lineNumber,
            lineType,
          })
        );
        rows.additions.content.push(
          lineElement({
            altLine: undefined,
            column: "additions",
            indexAttribute,
            lineNumber: additionLine.lineNumber,
            lineType,
            spans: additionSpans,
            text: additionText ?? "",
            tokens: tokens?.additions[additionLine.lineIndex],
          })
        );
      }

      if (hasAnnotations) {
        const pairKey = `s:${splitIndex}:${event.hunkIndex}`;
        annotationRow(
          "deletions",
          type === "change"
            ? deletionLine
              ? "change-deletion"
              : "context"
            : type,
          found.deletionItems,
          pairKey
        );
        annotationRow(
          "additions",
          type === "change"
            ? additionLine
              ? "change-addition"
              : "context"
            : type,
          found.additionItems,
          pairKey
        );
        rows.rowCount += 1;
      }
    }

    const isHunkLastSplit =
      !unified &&
      hunk !== undefined &&
      splitIndex === hunk.splitLineStart + hunk.splitLineCount - 1;

    const isHunkLastUnified =
      unified &&
      hunk !== undefined &&
      (additionLine?.unifiedLineIndex ??
        deletionLine?.unifiedLineIndex ??
        0) ===
        hunk.unifiedLineStart + hunk.unifiedLineCount - 1;

    const isLastLineOfLastHunk =
      hunkIndex === lastHunkIndex &&
      hunk !== undefined &&
      (unified ? isHunkLastUnified : isHunkLastSplit);

    const deletionMissing =
      (deletionLine?.noEOFCR ?? false) ||
      (isHunkLastSplit && hunk.noEOFCRDeletions);

    const additionMissing =
      (additionLine?.noEOFCR ?? false) ||
      (isHunkLastSplit && hunk.noEOFCRAdditions);

    if (additionMissing || deletionMissing) {
      if (!unified) {
        flush();
      }

      const noNewline = (column: ColumnKind, lineType: string) => {
        rows[column].content.push(
          <div
            data-ck-column-content=""
            data-line-type={lineType}
            data-ck-no-newline=""
            key={nextKey("nn")}
          >
            <span>No newline at end of file</span>
          </div>
        );
        rows[column].gutter.push(
          <div
            data-ck-buffer-size={1}
            data-gutter-buffer="metadata"
            data-line-type={lineType}
            key={nextKey("ng")}
            style={{ gridRow: "span 1", minHeight: "calc(1 * 1lh)" }}
          />
        );
      };

      const spacer = (column: ColumnKind) => {
        rows[column].gutter.push(
          <div
            data-ck-buffer-size={1}
            data-gutter-buffer="buffer"
            key={nextKey("sg")}
            style={{ gridRow: "span 1", minHeight: "calc(1 * 1lh)" }}
          />
        );
        rows[column].content.push(
          <div
            data-ck-buffer-size={1}
            data-content-buffer=""
            key={nextKey("sc")}
            style={{ gridRow: "span 1", minHeight: "calc(1 * 1lh)" }}
          />
        );
      };

      const contextual = type === "context" || type === "context-expanded";

      if (deletionMissing) {
        const lineType = contextual ? type : "change-deletion";
        noNewline(unified ? "unified" : "deletions", lineType);

        if (!(unified || additionMissing)) {
          spacer("additions");
        }
      }

      if (additionMissing) {
        const lineType = contextual ? type : "change-addition";
        noNewline(unified ? "unified" : "additions", lineType);

        if (!(unified || deletionMissing)) {
          spacer("deletions");
        }
      }

      rows.rowCount += 1;
    }

    const trailingSeparator =
      hunkSeparators !== "simple" &&
      hunkSeparators !== "metadata" &&
      (event.collapsedAfter > 0 ||
        (isLastLineOfLastHunk && trailingUnknown && partialLoader));

    if (trailingSeparator) {
      emitSeparator({
        hunkIndex: type === "context-expanded" ? hunkIndex : hunkIndex + 1,
        hunkSpecs: undefined,
        isFirstHunk: false,
        isLastHunk: true,
        lines:
          isLastLineOfLastHunk && trailingUnknown && partialLoader
            ? null
            : event.collapsedAfter,
        rangeSize: trailingRangeSize(diff),
      });
    }

    rows.rowCount += 1;
  }

  if (!unified) {
    flush();
  }

  return rows;
};

/** Word-level spans per line, keyed `d:<index>` and `a:<index>`. */
const computeDecorations = (
  diff: FileDiffMetadata,
  lineDiffType: LineDiffType,
  maxLineDiffLength: number | undefined
) => {
  const map = new Map<string, DiffSpan[]>();

  if (lineDiffType === "none") {
    return map;
  }

  for (const hunk of diff.hunks) {
    for (const part of hunk.hunkContent) {
      if (part.type !== "change") {
        continue;
      }

      const pairs = Math.min(part.deletions, part.additions);

      for (let step = 0; step < pairs; step += 1) {
        const deletionLine = diff.deletionLines[part.deletionLineIndex + step];
        const additionLine = diff.additionLines[part.additionLineIndex + step];

        if (deletionLine === undefined || additionLine === undefined) {
          continue;
        }

        const result = diffLinePair(
          deletionLine,
          additionLine,
          lineDiffType,
          maxLineDiffLength
        );

        if (result) {
          map.set(`d:${part.deletionLineIndex + step}`, result.deletions);
          map.set(`a:${part.additionLineIndex + step}`, result.additions);
        }
      }
    }
  }

  return map;
};

const CONTEXT_CONTROLS: readonly ContextControl[] = [
  "data-ck-expand-up",
  "data-ck-expand-down",
  "data-ck-expand-both",
  "data-ck-expand-all-button",
  "data-ck-unmodified-lines",
];

/** The expander under the pointer, found from the click target. */
const findContextTarget = (
  target: EventTarget | null,
  shiftKey: boolean
): ContextTarget | undefined => {
  let element: Element | null = target instanceof Element ? target : null;
  let control: ContextControl | undefined;

  while (element !== null) {
    if (control === undefined) {
      const current = element;
      control = CONTEXT_CONTROLS.find((name) => current.hasAttribute(name));
    }

    const index = element.getAttribute("data-ck-expand-index");

    if (control !== undefined && index !== null) {
      return { control, index, shiftKey };
    }

    if (element.hasAttribute("data-code")) {
      return undefined;
    }

    element = element.parentElement;
  }

  return undefined;
};

const columnOf = (element: Element): ColumnKind | undefined => {
  const code = element.closest("[data-code]");

  if (!code) {
    return undefined;
  }

  if (code.hasAttribute("data-unified")) {
    return "unified";
  }

  if (code.hasAttribute("data-deletions")) {
    return "deletions";
  }

  return code.hasAttribute("data-additions") ? "additions" : undefined;
};

const SCROLL_SYNC_RELEASE_MS = 300;

const controlDirection = (control: ContextControl): ExpandDirection => {
  if (control === "data-ck-expand-up") {
    return "up";
  }

  if (control === "data-ck-expand-down") {
    return "down";
  }

  return "both";
};

export const DiffView = <T,>({
  alignCommentGutter = false,
  className,
  collapsedContextThreshold = 1,
  codeThemes,
  contextMessage,
  contextTarget,
  diffIndicators = "bars",
  diffStyle = "split",
  disableBackground = false,
  disableLineNumbers = false,
  enableGutterUtility = false,
  enableLineSelection = false,
  expandUnchanged = false,
  expansionLineCount = 100,
  fileDiff,
  hunkSeparators = "line-info",
  lineAnnotations,
  lineDiffType = "word-alt",
  lineHoverHighlight = "disabled",
  loadDiffFiles,
  maxLineDiffLength,
  onContextExpand,
  onGutterUtilityClick,
  onLineClick,
  onLineEnter,
  onLineLeave,
  onLineNumberClick,
  onLineSelected,
  onLineSelectionChange,
  onLineSelectionEnd,
  onLineSelectionStart,
  onPostRender,
  overflow = "scroll",
  renderAnnotation,
  reviewLineInfoSeparators = false,
  selectedLines,
  selectedLinesOptions,
  simpleLineSeparators = false,
  style,
  themeType,
  tokenizeMaxLength,
  tokenizeMaxLineLength,
}: DiffViewProps<T>) => {
  const hostRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState<ReadonlyMap<number, ExpandedRange>>(
    () => new Map()
  );

  const [hydrated, setHydrated] = useState<{
    source: FileDiffMetadata;
    value: FileDiffMetadata;
  } | null>(null);

  const [hover, setHover] = useState<HoverState | null>(null);

  const preRef = useRef<HTMLPreElement>(null);

  const [selectionView, setSelectionView] = useState<SelectionView>({
    highlightSide: undefined,
    lineNumberOnly: false,
    range: null,
  });

  const [utility, setUtility] = useState<UtilityTarget | null>(null);
  const hoverRef = useRef<HoverState | null>(null);

  const pendingLoadRef = useRef<FileDiffMetadata | null>(null);

  const diff =
    hydrated !== null && hydrated.source === fileDiff
      ? hydrated.value
      : fileDiff;

  const isControlled = selectedLines !== undefined;

  const canLoad =
    diff.isPartial &&
    loadDiffFiles !== undefined &&
    (diff.type === "change" ||
      diff.type === "rename-changed" ||
      diff.type === "rename-pure");

  const expandable = !diff.isPartial || canLoad;

  const effectiveExpanded: ExpandedHunks | undefined = expandUnchanged
    ? true
    : expanded;

  const split = diffStyle === "split";

  const events = useMemo(
    () =>
      collectEvents({
        collapsedContextThreshold,
        diff,
        diffStyle,
        expandedHunks: effectiveExpanded,
      }),
    [collapsedContextThreshold, diff, diffStyle, effectiveExpanded]
  );

  const decorations = useMemo(
    () => computeDecorations(diff, lineDiffType, maxLineDiffLength),
    [diff, lineDiffType, maxLineDiffLength]
  );

  const tokens = useDiffTokens(diff, {
    tokenizeMaxLength,
    tokenizeMaxLineLength,
  });

  const syntaxThemes = useCodeThemes(codeThemes);

  const annotations = useMemo(() => {
    const map = new Map<string, DiffLineAnnotation<T>[]>();

    for (const annotation of lineAnnotations ?? []) {
      const key = `${annotation.side}:${annotation.lineNumber}`;
      map.set(key, [...(map.get(key) ?? []), annotation]);
    }

    return map;
  }, [lineAnnotations]);

  const rows = useMemo(
    () =>
      buildRows<T>({
        annotations,
        contextMessage,
        contextTarget,
        decorations,
        diff,
        diffStyle,
        enableGutterUtility,
        events,
        expandable,
        expansionLineCount,
        hover,
        hunkSeparators,
        lineHoverHighlight,
        partialLoader: canLoad,
        renderAnnotation,
        syntaxThemes,
        tokens,
        trailingUnknown: canLoad,
        utility,
      }),
    [
      annotations,
      canLoad,
      contextMessage,
      contextTarget,
      decorations,
      diff,
      diffStyle,
      enableGutterUtility,
      events,
      expandable,
      expansionLineCount,
      hover,
      hunkSeparators,
      lineHoverHighlight,
      renderAnnotation,
      syntaxThemes,
      tokens,
      utility,
    ]
  );

  /** The rendered row indexes (unified, split) of each line, by side and line number. */
  const lineIndexes = useMemo(() => {
    const map = new Map<string, readonly [number, number]>();

    for (const event of events) {
      const row =
        event.additionLine?.splitLineIndex ??
        event.deletionLine?.splitLineIndex ??
        0;

      if (event.additionLine) {
        map.set(`additions:${event.additionLine.lineNumber}`, [
          event.additionLine.unifiedLineIndex,
          row,
        ]);
      }

      if (event.deletionLine) {
        map.set(`deletions:${event.deletionLine.lineNumber}`, [
          event.deletionLine.unifiedLineIndex,
          row,
        ]);
      }
    }

    return map;
  }, [events]);

  const getLineIndex = useCallback(
    (lineNumber: number, side: AnnotationSide) =>
      lineIndexes.get(`${side}:${lineNumber}`) ?? null,
    [lineIndexes]
  );

  const selection = useMemo(
    () =>
      new LineSelectionController({
        controlledSelection: false,
        enableGutterUtility: false,
        enableLineSelection: false,
        getHovered: noTarget,
        getLineIndex: noIndex,
        onUtilityChange: ignoreTarget,
        onViewChange: ignoreView,
      }),
    []
  );

  const totalLines = Math.max(
    diff.hunks.length === 0
      ? 0
      : hunkIndexStart(
          diff.hunks.at(-1)?.additionStart ?? 0,
          diff.hunks.at(-1)?.additionCount ?? 0
        ) + (diff.hunks.at(-1)?.additionCount ?? 0),
    diff.additionLines.length,
    diff.deletionLines.length
  );

  const loadFull = useCallback(() => {
    if (
      !canLoad ||
      loadDiffFiles === undefined ||
      pendingLoadRef.current === diff
    ) {
      return;
    }

    pendingLoadRef.current = diff;
    const source = diff;

    const run = async () => {
      try {
        const { newFile, oldFile } = await loadDiffFiles(source);

        if (pendingLoadRef.current === source) {
          setHydrated({ source, value: createFileDiff(oldFile, newFile) });
        }
      } catch {
        // The tracker around loadDiffFiles reports the failure.
      }

      if (pendingLoadRef.current === source) {
        pendingLoadRef.current = null;
      }
    };

    run().catch(ignoreRejection);
  }, [canLoad, diff, loadDiffFiles]);

  const expandHunk = useCallback(
    (hunkIndex: number, direction: ExpandDirection, count: number) => {
      loadFull();
      setExpanded((previous) => {
        const next = new Map(previous);

        const range = {
          ...(next.get(hunkIndex) ?? { fromEnd: 0, fromStart: 0 }),
        };

        if (direction === "up" || direction === "both") {
          range.fromStart += count;
        }

        if (direction === "down" || direction === "both") {
          range.fromEnd += count;
        }

        next.set(hunkIndex, range);

        return next;
      });
    },
    [loadFull]
  );

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;

    // With onGutterUtilityClick, a click that comes from the
    // gutter utility is its own action (the pointer session), not a line or
    // number click.
    if (
      onGutterUtilityClick !== undefined &&
      target?.closest("[data-ck-utility-button], [data-gutter-utility-slot]")
    ) {
      return;
    }

    if (target?.closest("[data-ck-context-retry]")) {
      if (contextTarget) {
        event.stopPropagation();
        onContextExpand?.({
          ...contextTarget,
          shiftKey: contextTarget.shiftKey,
        });
        const index = Number(contextTarget.index);

        const all =
          contextTarget.control === "data-ck-expand-all-button" ||
          contextTarget.shiftKey;

        expandHunk(
          index,
          all ? "both" : controlDirection(contextTarget.control),
          all ? Number.POSITIVE_INFINITY : expansionLineCount
        );
      }

      return;
    }

    const context = findContextTarget(event.target, event.shiftKey);

    if (context) {
      onContextExpand?.(context);

      const all =
        context.control === "data-ck-expand-all-button" || event.shiftKey;

      expandHunk(
        Number(context.index),
        all ? "both" : controlDirection(context.control),
        all ? Number.POSITIVE_INFINITY : expansionLineCount
      );

      return;
    }

    const cell = target?.closest("[data-line], [data-ck-column-number]");

    if (!(cell instanceof HTMLElement)) {
      return;
    }

    const column = columnOf(cell);

    if (!column) {
      return;
    }

    const lineNumber = Number(cell.dataset.line ?? cell.dataset.ckColumnNumber);

    const lineType = cell.dataset.lineType ?? "context";

    const props: DiffLineEventProps = {
      annotationSide: lineSide(column, lineType),
      event,
      lineNumber,
      lineType,
    };

    if (cell.hasAttribute("data-ck-column-number") && onLineNumberClick) {
      onLineNumberClick(props);
    } else {
      onLineClick?.(props);
    }
  };

  const showsHover = lineHoverHighlight !== "disabled" || enableGutterUtility;

  const handlePointerOver = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Pierre `handlePointerMove`: only a mouse hovers a line.
    if (event.pointerType !== "mouse") {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const cell = target?.closest("[data-line], [data-ck-column-number]");

    const hoverEnabled =
      lineHoverHighlight !== "disabled" ||
      enableGutterUtility ||
      onLineEnter !== undefined ||
      onLineLeave !== undefined;

    if (!hoverEnabled) {
      return;
    }

    if (!(cell instanceof HTMLElement)) {
      return;
    }

    const column = columnOf(cell);
    const indexAttribute = cell.dataset.lineIndex;

    if (!column || indexAttribute === undefined) {
      return;
    }

    const hovered = hoverRef.current;

    if (
      hovered?.column === column &&
      hovered.indexAttribute === indexAttribute
    ) {
      return;
    }

    const lineType = cell.dataset.lineType ?? "context";

    const lineNumber = Number(cell.dataset.line ?? cell.dataset.ckColumnNumber);

    const next: HoverState = {
      annotationSide: lineSide(column, lineType),
      column,
      indexAttribute,
      lineNumber,
      lineType,
    };

    if (hovered) {
      onLineLeave?.({
        annotationSide: hovered.annotationSide,
        event,
        lineNumber: hovered.lineNumber,
        lineType: hovered.lineType,
      });
    }

    hoverRef.current = next;

    // The rows only change for the hover highlight and the gutter utility.
    if (showsHover) {
      setHover(next);
    }

    selection.placeUtility();
    onLineEnter?.({
      annotationSide: next.annotationSide,
      event,
      lineNumber,
      lineType,
    });
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    const hovered = hoverRef.current;

    if (hovered) {
      onLineLeave?.({
        annotationSide: hovered.annotationSide,
        event,
        lineNumber: hovered.lineNumber,
        lineType: hovered.lineType,
      });
      hoverRef.current = null;

      if (showsHover) {
        setHover(null);
      }

      selection.placeUtility();
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    selection.handlePointerDown(event.nativeEvent);
  };

  // The controller reads the latest props and the rendered <pre>.
  useLayoutEffect(() => {
    selection.setOptions({
      controlledSelection: isControlled,
      enableGutterUtility,
      enableLineSelection,
      getHovered: () => {
        const { current } = hoverRef;

        return current === null
          ? null
          : {
              column: current.column,
              indexAttribute: current.indexAttribute,
              lineNumber: current.lineNumber,
              side: current.annotationSide,
            };
      },
      getLineIndex,
      onGutterUtilityClick,
      onLineSelected,
      onLineSelectionChange,
      onLineSelectionEnd,
      onLineSelectionStart,
      onUtilityChange: (target) => {
        setUtility((previous) =>
          previous?.column === target?.column &&
          previous?.indexAttribute === target?.indexAttribute
            ? previous
            : target
        );
      },
      onViewChange: setSelectionView,
    });
  }, [
    enableGutterUtility,
    enableLineSelection,
    getLineIndex,
    isControlled,
    onGutterUtilityClick,
    onLineSelected,
    onLineSelectionChange,
    onLineSelectionEnd,
    onLineSelectionStart,
    selection,
  ]);

  useLayoutEffect(() => {
    selection.setup(preRef.current);
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the pre element and its rows are re-read whenever the rendered rows change.
  }, [rows, selection]);

  useEffect(
    () => () => {
      selection.cleanUp();
    },
    [selection]
  );

  // A `selectedLines` prop sets the rendered range.
  useLayoutEffect(() => {
    if (isControlled) {
      selection.setSelection(selectedLines, {
        ...selectedLinesOptions,
        notify: false,
      });
    }
  }, [isControlled, selection, selectedLines, selectedLinesOptions]);

  // Marks the cells of the selected rows after each render.
  useLayoutEffect(() => {
    if (preRef.current) {
      renderSelection(preRef.current, selectionView, getLineIndex);
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the cells are replaced when the rows change, so the marks are drawn again.
  }, [getLineIndex, rows, selectionView]);

  // The two split panes scroll together.
  useEffect(() => {
    const host = hostRef.current;

    if (!(host && split && overflow === "scroll")) {
      return noCleanup;
    }

    const deletions = host.querySelector<HTMLElement>("[data-deletions]");
    const additions = host.querySelector<HTMLElement>("[data-additions]");

    if (!(deletions && additions)) {
      return noCleanup;
    }

    let deletionsActive = false;
    let additionsActive = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onDeletions = () => {
      if (additionsActive) {
        return;
      }

      // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
      deletionsActive = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        deletionsActive = false;
      }, SCROLL_SYNC_RELEASE_MS);
      additions.scrollTo({ left: deletions.scrollLeft });
    };

    const onAdditions = () => {
      if (deletionsActive) {
        return;
      }

      additionsActive = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        additionsActive = false;
      }, SCROLL_SYNC_RELEASE_MS);
      deletions.scrollTo({ left: additions.scrollLeft });
    };

    deletions.addEventListener("scroll", onDeletions, { passive: true });
    additions.addEventListener("scroll", onAdditions, { passive: true });

    return () => {
      clearTimeout(timer);
      deletions.removeEventListener("scroll", onDeletions);
      additions.removeEventListener("scroll", onAdditions);
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the panes are queried from the DOM, so the effect re-attaches when the rendered columns (rows) change.
  }, [split, overflow, rows]);

  // Pierre ResizeManager: column widths for sticky annotations and separators.
  useLayoutEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return noCleanup;
    }

    const measure = () => {
      for (const code of host.querySelectorAll<HTMLElement>("[data-code]")) {
        const gutter = code.querySelector<HTMLElement>("[data-gutter]");
        const numberWidth = gutter?.offsetWidth ?? 0;
        const codeWidth = code.clientWidth;
        code.style.setProperty("--diffs-column-width", `${codeWidth}px`);
        code.style.setProperty(
          "--diffs-column-number-width",
          numberWidth === 0 ? "auto" : `${numberWidth}px`
        );
        const content = Math.max(codeWidth - numberWidth, 0);
        code.style.setProperty(
          "--diffs-column-content-width",
          content > 0 ? `${content}px` : "auto"
        );
      }

      // Annotation rows of the two split panes share one height.
      const pairs = new Map<string, HTMLElement[]>();

      for (const element of host.querySelectorAll<HTMLElement>(
        "[data-annotation-pair]"
      )) {
        element.style.removeProperty("--diffs-annotation-min-height");
        const key = element.dataset.annotationPair ?? "";
        pairs.set(key, [...(pairs.get(key) ?? []), element]);
      }

      for (const members of pairs.values()) {
        if (members.length < 2) {
          continue;
        }

        const height = Math.max(
          ...members.map((member) => member.offsetHeight)
        );

        for (const member of members) {
          member.style.setProperty(
            "--diffs-annotation-min-height",
            `${height}px`
          );
        }
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);

    return () => {
      observer.disconnect();
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the columns are queried from the DOM, so the measurement re-runs when the rendered rows change.
  }, [rows]);

  useLayoutEffect(() => {
    if (hostRef.current) {
      onPostRender?.(hostRef.current);
    }
  });

  const showCode = rows.rowCount > 0;
  const hasUnified = diffStyle === "unified";
  const showDeletions = !hasUnified && diff.type !== "new" && showCode;
  const showAdditions = !hasUnified && diff.type !== "deleted" && showCode;
  const containerSize = hunkSeparators === "line-info";

  const preStyle: CustomStyle = {
    "--diffs-min-number-column-width-default": `${String(totalLines).length}ch`,
  };

  const renderCode = (kind: ColumnKind, column: Column) => (
    <code
      data-additions={attr(kind === "additions")}
      data-code=""
      data-ck-container-size={attr(containerSize)}
      data-deletions={attr(kind === "deletions")}
      data-unified={attr(kind === "unified")}
    >
      <div data-gutter="" style={{ gridRow: `span ${rows.rowCount}` }}>
        {column.gutter}
      </div>
      <div data-content="" style={{ gridRow: `span ${rows.rowCount}` }}>
        {column.content}
      </div>
    </code>
  );

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- Pierre delegates pointer events on the host; its expanders and line cells have no keyboard handler, and the focusable controls inside (retry, gutter button, annotations) are native elements.
    <div
      className={cn(
        styles.root,
        alignCommentGutter && styles.alignCommentGutter,
        reviewLineInfoSeparators && styles.reviewLineInfo,
        simpleLineSeparators && styles.simpleLine,
        themeType === "system" && styles.system,
        // The app's scope classes set color-scheme and the light-dark toggles.
        themeType === "light" && "light",
        themeType === "dark" && "dark",
        className
      )}
      data-diffs-container=""
      role="presentation"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerOver={handlePointerOver}
      ref={hostRef}
      style={style}
    >
      <pre
        data-background={attr(!disableBackground)}
        data-diff=""
        data-diff-type={hasUnified ? "single" : "split"}
        data-ck-disable-line-numbers={attr(disableLineNumbers)}
        data-indicators={diffIndicators === "none" ? undefined : diffIndicators}
        data-interactive-line-numbers={attr(
          onLineNumberClick !== undefined || enableLineSelection
        )}
        data-interactive-lines={attr(onLineClick !== undefined)}
        data-overflow={overflow}
        ref={preRef}
        style={preStyle}
      >
        {hasUnified && showCode ? renderCode("unified", rows.unified) : null}
        {showDeletions ? renderCode("deletions", rows.deletions) : null}
        {showAdditions ? renderCode("additions", rows.additions) : null}
      </pre>
    </div>
  );
};
