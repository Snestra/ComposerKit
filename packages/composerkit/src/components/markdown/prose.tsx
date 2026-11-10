"use client";

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/prefer-tag-over-role -- The scrolling table is a focusable region (role region, tabIndex 0, aria-label) while it overflows. */
/* oxlint-disable react/exhaustive-effect-dependencies, react/hook-use-state -- The effects and state follow the hook order. */

/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable anti-slop/no-unknown-parameters -- The list-item nodes are hast objects passed through the component map. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: custom properties in style objects, children props read after an element check, and regex matches checked before use. */
/* oxlint-disable eslint/no-use-before-define, eslint/complexity -- The constants and helpers are read at render time, and the renderer forwards its options. */
/* oxlint-disable eslint/no-nested-ternary -- Text decoration shares the renderer with streaming animation. */
/* oxlint-disable eslint/prefer-destructuring, react/function-component-definition -- Stylistic. */
/* oxlint-disable eslint/require-unicode-regexp -- The patterns are CommonMark, GFM and ANSI grammar kept without the u flag, which rejects the escaped punctuation classes they use. */
/* oxlint-disable react/static-components -- The link renders through the host's link provider component. */
/* oxlint-disable react/display-name -- The memo components are named by their function expressions. */
/* oxlint-disable react/no-react-children -- The renderer reads and maps text children. */
/* oxlint-disable shadcn/no-arbitrary-values -- The classes are calc values of the markdown font-size scale (--ck-prose-space) and em sizes from the stylesheet; no theme token matches them. */
/* oxlint-disable shadcn/no-restyle -- The component gives these elements their own treatment (the metadata disclosure is a plain button; prose links take the tone color). */
/* oxlint-disable typescript/consistent-return -- Effects and ref callbacks return a cleanup only when they registered something. */
/* oxlint-disable typescript/promise-function-async -- ReactNode includes promises, but these functions return content synchronously. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional flags, regex groups and empty strings by truthiness, as react-markdown and the component do. */

import { AssistantText } from "composerkit/components/markdown/assistant-text";
import {
  DeferUntilVisible,
  MarkdownProseCodeBlock,
  isSvgCodeBlock,
} from "composerkit/components/markdown/chat-code-block";
import { ChatTableExpandIcon } from "composerkit/components/markdown/chat-code-icons";
import { CopyActionButton } from "composerkit/components/markdown/copy-action-button";
import {
  serializeElement,
  writeClipboardFormats,
  writeSelectionToCopyEvent,
} from "composerkit/components/markdown/copy-serialization";
import {
  ExternalLink,
  ExternalResourcePolicyContext,
  LinkProviderContext,
} from "composerkit/components/markdown/external-link";
import type {
  ExternalLinkComponent,
  ExternalResourcePolicy,
  LinkProviderRenderOptions,
} from "composerkit/components/markdown/external-link";
import {
  collectFadeSegments,
  createFadeKeyStore,
  createFadeSegmentTimeline,
  createWordSegmenter,
  listItemFadeProps,
  renderFadeText,
} from "composerkit/components/markdown/fade";
import type {
  FadeConfig,
  FadeKeyState,
} from "composerkit/components/markdown/fade";
import {
  createRehypeKatex,
  useKatex,
} from "composerkit/components/markdown/math";
import { MermaidDiagram } from "composerkit/components/markdown/mermaid-diagram";
import {
  renderHast,
  textContent,
  useIncrementalBlocks,
} from "composerkit/components/markdown/render";
import type {
  MarkdownComponents,
  MarkdownUrlTransform,
} from "composerkit/components/markdown/render";
import { MarkdownWritingBlock } from "composerkit/components/markdown/writing-block";
import { Button } from "composerkit/components/ui/button";
import { Checkbox } from "composerkit/components/ui/checkbox";
import { Dialog } from "composerkit/components/ui/dialog";
import {
  TEXT_LINK_CLASSES,
  extractCodeBlock,
  markdownUrlTransform,
} from "composerkit/components/ui/markdown";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  ComponentProps,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";

import styles from "./prose.module.css";

/**
 * The app flavour of the prose. Every size
 * derives from `--ck-prose-font-size`; spacing is in `--ck-prose-space` units
 * (a quarter of the font size).
 */

type Direction = "auto" | "ltr" | "rtl";

/** How external links render. The default is `inline-mention`. */
export type MarkdownProseLinkAppearance =
  | "decorated"
  | "inline-mention"
  | "underlined-text";

interface ProseContextValue {
  allowWideBlocks: boolean;
  direction: Direction;
  ExternalLinkComponent?: ExternalLinkComponent;
  externalLinkAppearance: MarkdownProseLinkAppearance;
  externalResourcePolicy?: ExternalResourcePolicy;
  forceCodeBlockWordWrap: boolean;
  hideCodeBlocks: boolean;
  isStreaming: boolean;
  onAddSelectedTextToChat?: (text: string, range: Range) => void;
  renderCodeBlocksAsWritingBlocks?: boolean;
  renderCodeBlocksImmediately: boolean;
  stickyCodeBlockHeader: boolean;
  tableActions?: Pick<MarkdownProseTableProps, "getCopyContent" | "onCopy">;
}

/** The root options the element components read (direction, wide tables, hidden code). */
const ProseContext = createContext<ProseContextValue>({
  allowWideBlocks: false,
  direction: "auto",
  externalLinkAppearance: "inline-mention",
  forceCodeBlockWordWrap: false,
  hideCodeBlocks: false,
  isStreaming: false,
  renderCodeBlocksImmediately: false,
  stickyCodeBlockHeader: false,
});

export interface MarkdownProseTextStyle {
  /** Font size: the chat size by default, or the base, large and small text sizes, or inherit. */
  kind?: "assistant-message" | "base" | "inherit" | "large" | "small";
  /** `--ck-prose-link-color`, default `currentColor`. */
  linkColor?: string;
  tone?: "inherit" | "tertiary" | "user-message";
}

const FADE_IN =
  "in-data-[markdown-animated]:animate-in in-data-[markdown-animated]:fade-in-0 in-data-[markdown-animated]:fill-mode-both in-data-[markdown-animated]:[--tw-animation-duration:var(--duration,var(--motion-duration-fast))] in-data-[markdown-animated]:[--tw-ease:var(--ck-fade-curve,cubic-bezier(.4,.55,.85,.9))] in-data-[markdown-animated]:[--tw-delay:var(--fade-delay,0s)] motion-reduce:in-data-[markdown-animated]:[--tw-animation-duration:0s] motion-reduce:in-data-[markdown-animated]:[--tw-delay:0s]";

const CONTENT_FONT = "font-[family-name:var(--ui-body-font,var(--font-sans))]";

const ROOT_CLASSES = [
  // Text sizes follow the application settings. The
  // host sets --ui-message-text-size (and the code size) from its chat font
  // settings; the fallbacks are the :root definition of the stylesheet, which
  // reads the settings override and then 13px (code 12px).
  "[--ck-prose-ui-body-text-size:var(--ui-message-text-size,var(--ui-message-text-size-override,var(--ck-interface-size,13px)))] [--ck-prose-ui-caption-text-size:var(--ui-code-text-size,var(--ui-code-text-size-override,var(--ck-type-code-size,12px)))]",
  "[--ck-prose-font-size:var(--ck-prose-ui-body-text-size)] [--ck-prose-line-height:calc(var(--ck-prose-font-size)*var(--leading-relaxed,1.625))]",
  "[--ck-prose-small-font-size:max(var(--ck-prose-ui-caption-text-size),calc(var(--ck-prose-font-size)*.875))] [--ck-prose-space:calc(var(--ck-prose-font-size)/4)]",
  "[--prose-ink:currentColor] [--prose-border-strong:var(--ck-palette-border-heavy)] [--prose-border-soft:var(--ck-palette-border-light)]",
  "text-[length:var(--ck-prose-font-size)] leading-(--ck-prose-line-height) text-text wrap-anywhere",
  "data-[markdown-text-tone=inherit]:text-inherit data-[markdown-text-tone=tertiary]:text-text-subtle data-[markdown-text-tone=user-message]:text-[var(--color-text-user-message,var(--ck-palette-ink))]",
  "data-[markdown-text-style=inherit]:text-inherit data-[markdown-text-style=inherit]:[--ck-prose-font-size:1em] data-[markdown-text-style=inherit]:[--ck-prose-line-height:1lh]",
  "data-[markdown-text-style=base]:[--ck-prose-font-size:var(--text-base)] data-[markdown-text-style=large]:[--ck-prose-font-size:var(--text-lg)] data-[markdown-text-style=small]:[--ck-prose-font-size:var(--text-sm)]",
  // First and last child margins.
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  // Spacing between root-level blocks.
  "[&>p:not(:first-child)]:mt-[calc(var(--ck-prose-space)*2)]",
  "[&>p+p:not(:first-child)]:my-[calc(var(--ck-prose-space)*4)]",
  "[&>:is(h1,h2,h3)+p:not(:first-child)]:mt-0 [&>p+:is(ul,ol):not(:first-child)]:mt-0",
  "[&>:is(ul,ol)+:is(h1,h2,h3,h4,h5,h6):not(:first-child)]:mt-[calc(var(--ck-prose-space)*4)]",
  "[&:not([data-ck-markdown-text-tone=user-message])>p[data-ck-markdown-han-text]:has(+p[data-ck-markdown-han-text])]:mb-1",
  "[&[data-ck-markdown-text-tone=user-message]>p]:my-0!",
].join(" ");

const Paragraph = ({ children }: { children?: ReactNode; node?: unknown }) => {
  const { direction } = useContext(ProseContext);

  return (
    <p
      className={cn(
        CONTENT_FONT,
        "m-0 mb-(--ck-prose-space) text-[length:var(--ck-prose-font-size)] leading-(--ck-prose-line-height) [h4+&]:mt-0"
      )}
      data-ck-markdown-han-text={
        HAN.test(textContent(children)) ? "true" : undefined
      }
      dir={direction}
    >
      {children}
    </p>
  );
};

const HAN = /\p{Script=Han}/u;

const HEADING_CLASSES: Record<string, string> = {
  h1: "mt-[calc(var(--ck-prose-space)*4)] mb-[calc(var(--ck-prose-space)*2)] text-[length:calc(var(--ck-prose-font-size)*1.5)] leading-[calc(var(--ck-prose-space)*8)]",
  h2: "mt-[calc(var(--ck-prose-space)*4)] mb-(--ck-prose-space) text-[length:calc(var(--ck-prose-font-size)*1.25)] leading-[calc(var(--ck-prose-space)*7)]",
  h3: "mt-[calc(var(--ck-prose-space)*4)] mb-(--ck-prose-space) text-[length:calc(var(--ck-prose-font-size)*1.125)] leading-[calc(var(--ck-prose-space)*7)]",
  h4: "mt-[calc(var(--ck-prose-space)*4)] mb-0 text-[length:var(--ck-prose-font-size)] leading-[calc(var(--ck-prose-space)*6)]",
  h5: "m-0 text-[length:var(--ck-prose-font-size)] leading-(--ck-prose-line-height)",
  h6: "m-0 text-[length:var(--ck-prose-font-size)] leading-(--ck-prose-line-height)",
};

const makeHeading = (tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
  function Heading({ children }: { children?: ReactNode }) {
    const { direction } = useContext(ProseContext);
    const Tag = tag;

    return (
      <Tag
        className={cn(CONTENT_FONT, "font-semibold", HEADING_CLASSES[tag])}
        dir={direction}
      >
        {children}
      </Tag>
    );
  };

const HEADINGS = {
  h1: makeHeading("h1"),
  h2: makeHeading("h2"),
  h3: makeHeading("h3"),
  h4: makeHeading("h4"),
  h5: makeHeading("h5"),
  h6: makeHeading("h6"),
};

const LIST_BASE =
  "m-0 list-outside ps-(--ck-prose-line-height) font-[family-name:var(--ui-body-font,var(--font-sans))] text-[length:var(--ck-prose-font-size)] leading-(--ck-prose-line-height)";

const List = ({
  children,
  className,
  start,
  tag,
}: {
  children?: ReactNode;
  className?: string;
  node?: unknown;
  start?: number;
  tag: "ol" | "ul";
}) => {
  const { direction: dir } = useContext(ProseContext);
  const task = className?.includes("contains-task-list") ?? false;

  const allTasks = Children.toArray(children)
    .filter((child): child is ReactElement<{ className?: string }> =>
      isValidElement(child)
    )
    .every((child) => child.props.className?.includes("task-list-item"));

  const taskList = task && (tag === "ul" || allTasks);
  const Tag = tag;
  let marker = tag === "ul" ? "list-disc" : "list-decimal";

  if (taskList) {
    marker = "ps-0 list-none";
  }

  return (
    <Tag
      className={cn(
        LIST_BASE,
        marker,
        !taskList &&
          tag === "ul" &&
          "[:is(ul,ol)_&]:list-[circle] [:is(ul,ol)_:is(ul,ol)_&]:list-[square]",
        "[li>&]:my-0",
        className
      )}
      dir={dir}
      start={tag === "ol" && !taskList ? start : undefined}
    >
      {children}
    </Tag>
  );
};

const startsWithHeading = (node: unknown): boolean =>
  isHeading(firstBlock(node, false));

const endsWithHeading = (node: unknown): boolean =>
  isHeading(firstBlock(node, true));

interface HastLike {
  children?: HastLike[];
  tagName?: string;
  type?: string;
}

const firstBlock = (node: unknown, last: boolean): HastLike | undefined => {
  const children = ((node as HastLike | undefined)?.children ?? []).filter(
    (child) => child.type === "element" && child.tagName !== "input"
  );

  return last ? children.at(-1) : children[0];
};

const isHeading = (node: HastLike | undefined): boolean =>
  node?.tagName === "h1" || node?.tagName === "h2" || node?.tagName === "h3";

const ListItem = ({
  children,
  className,
  node,
  ...props
}: ComponentProps<"li"> & { node?: unknown }) => {
  const task = className?.includes("task-list-item") ?? false;
  const items = Children.toArray(children);
  const first = items[0];

  const checkbox =
    task &&
    isValidElement<{ checked?: boolean }>(first) &&
    first.type === "input"
      ? first
      : undefined;

  const content = checkbox ? items.slice(1) : items;
  const startsHeading = startsWithHeading(node) || undefined;
  const endsHeading = endsWithHeading(node) || undefined;

  return (
    <li
      {...props}
      className={cn(
        CONTENT_FONT,
        "list-item ps-[calc(var(--ck-prose-space)*1.5)] text-[length:var(--ck-prose-font-size)] leading-(--ck-prose-line-height)",
        "[&+li]:mt-0 [&>:first-child:not(h1,h2,h3)]:my-0 [&>:last-child:not(h1,h2,h3)]:mb-0",
        "[&[data-ck-ends-with-heading]>:nth-last-child(1_of_h1,h2,h3)]:mb-0 [&[data-ck-starts-with-heading]>:nth-child(1_of_h1,h2,h3)]:mt-0",
        "[&>:is(ul,ol)]:my-0 [&>p]:m-0 [&>p+p]:mt-[calc(var(--ck-prose-space)*4)]",
        "[ol>&::marker]:font-semibold [ol>&::marker]:text-(--prose-ink) [ul>&::marker]:font-semibold [ul>&::marker]:text-(--prose-ink)",
        FADE_IN,
        task &&
          "list-none ps-0 [--ck-prose-task-checkbox-margin:0] has-[>p]:grid has-[>p]:grid-cols-[auto_minmax(0,1fr)] has-[>p]:[--ck-prose-task-checkbox-margin:var(--ck-prose-space)] [&>:first-child]:mt-(--ck-prose-task-checkbox-margin) [&>:not(:first-child)]:col-start-2",
        className
      )}
      data-ck-ends-with-heading={endsHeading}
      data-ck-starts-with-heading={startsHeading}
    >
      {checkbox ? (
        <div
          className="relative me-1.5 inline-flex cursor-default align-[-0.125rem]"
          data-ck-markdown-copy="contents"
        >
          <Checkbox
            aria-label={textContent(content)}
            checked={Boolean(checkbox.props.checked)}
            className="pointer-events-none"
            disabled
          />
        </div>
      ) : null}
      {content}
    </li>
  );
};

const Blockquote = ({ children }: { children?: ReactNode; node?: unknown }) => {
  const { direction } = useContext(ProseContext);

  return (
    <blockquote
      className={cn(
        "relative m-0 mb-[calc(var(--ck-prose-space)*2)] border-0 bg-transparent! py-[calc(var(--ck-prose-space)*2)] ps-[calc(var(--ck-prose-space)*6)] leading-[calc(var(--ck-prose-space)*6)] text-(--prose-ink) not-italic",
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0 [&>p]:m-0 [&>p]:font-normal [&>p::after]:content-none [&>p::before]:content-none",
        "after:absolute after:start-0 after:top-[calc(var(--ck-prose-space)*2)] after:bottom-[calc(var(--ck-prose-space)*2)] after:w-(--ck-prose-space) after:rounded-[calc(var(--ck-prose-space)/2)] after:bg-(--prose-border-strong) after:content-['']",
        FADE_IN
      )}
      dir={direction}
    >
      {children}
    </blockquote>
  );
};

const HorizontalRule = () => (
  <hr
    className={cn(
      "clear-both my-[calc(var(--ck-prose-space)*7)] h-0 border-0 border-t border-(--prose-border-strong) [&+*]:mt-0",
      FADE_IN
    )}
  />
);

// ---- tables ----------------------------------------------------------------

const TableRow = ({ children }: { children?: ReactNode; node?: unknown }) => (
  <tr
    className={cn(
      "[&:not(:last-child)>td]:border-b [&:not(:last-child)>td]:border-(--prose-border-soft)",
      FADE_IN
    )}
  >
    {children}
  </tr>
);

const CELL_BASE =
  "max-w-[calc(var(--ck-chat-content-max-width,40rem)*18/24)] pe-[calc(var(--ck-prose-space)*6)] align-top whitespace-normal [overflow-wrap:break-word] [word-break:normal] [&[align=center]]:text-center [&[align=left]]:text-left [&[align=right]]:text-right";

const TableHeaderCell = ({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"th"> & { node?: unknown }) => (
  <th
    dir="auto"
    {...props}
    className={cn(
      CELL_BASE,
      CONTENT_FONT,
      "border-b border-(--prose-border-strong) py-[calc(var(--ck-prose-space)*2)] text-start leading-[calc(var(--ck-prose-space)*4)] font-semibold text-(--prose-ink) last:pe-[calc(var(--ck-prose-space)*10)]",
      className
    )}
  >
    {children}
  </th>
);

const NUMERIC = /^\d+$/;

const TableCell = ({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<"td"> & { node?: unknown }) => (
  <td
    dir="auto"
    {...props}
    className={cn(
      CELL_BASE,
      "py-[calc(var(--ck-prose-space)*2.5)]",
      NUMERIC.test(textContent(children)) &&
        "min-w-[calc(3ch+(var(--ck-prose-space)*6))] whitespace-nowrap",
      "in-[tbody>tr:last-child]:pb-[calc(var(--ck-prose-space)*6)]",
      className
    )}
  >
    {Children.map(children, (child, index) =>
      child === "<br>" ? <br key={index} /> : child
    )}
  </td>
);

const COLUMN_SIZES = [
  "[&_[data-ck-col-size=sm]]:min-w-[calc(var(--ck-chat-content-max-width,40rem)*4/24)] [&_[data-ck-col-size=sm]]:max-w-[calc(var(--ck-chat-content-max-width,40rem)*6/24)]",
  "[&_[data-ck-col-size=md]]:min-w-[calc(var(--ck-chat-content-max-width,40rem)*6/24)] [&_[data-ck-col-size=md]]:max-w-[calc(var(--ck-chat-content-max-width,40rem)*8/24)]",
  "[&_[data-ck-col-size=lg]]:min-w-[calc(var(--ck-chat-content-max-width,40rem)*8/24)] [&_[data-ck-col-size=lg]]:max-w-[calc(var(--ck-chat-content-max-width,40rem)*12/24)]",
  "[&_[data-ck-col-size=xl]]:min-w-[calc(var(--ck-chat-content-max-width,40rem)*14/24)] [&_[data-ck-col-size=xl]]:max-w-[calc(var(--ck-chat-content-max-width,40rem)*18/24)]",
].join(" ");

export interface MarkdownProseTableLabels {
  closePreview: string;
  copy: string;
  expand: string;
  preview: string;
  scroll: string;
}

const TABLE_LABELS: MarkdownProseTableLabels = {
  closePreview: "Close table preview",
  copy: "Copy table",
  expand: "Expand table",
  preview: "Table preview",
  scroll: "Scrollable table",
};

export interface MarkdownProseTableProps {
  allowWideBlocks?: boolean;
  children?: ReactNode;
  className?: string;
  /**
   * Replaces the copy: returns the clipboard content for the table's markdown
   * source. Without it the copy writes the source as
   * text/plain and the serialized table as text/html.
   */
  getCopyContent?: (
    markdownSource: string | undefined
  ) => Record<string, string>;
  /** The table as markdown, written as text/plain by the copy button. */
  markdownSource?: string;
  /** Runs when the copy button is pressed. */
  onCopy?: () => void;
  /** Labels of the actions and the dialog. Defaults are English strings. */
  labels?: Partial<MarkdownProseTableLabels>;
  /** Accessible label of the scroller once it scrolls. Default "Scrollable table". */
  scrollLabel?: string;
  /** Header cells stay at the top of the scroller (the sticky-header variant). */
  stickyHeader?: boolean;
}

/**
 * The table container with its x-scrolling,
 * thin-scrollbar scroller. The scroller becomes a focusable labelled region
 * once the table is wider than it.
 */
export const MarkdownProseTable = ({
  allowWideBlocks = false,
  children,
  className,
  getCopyContent,
  labels,
  markdownSource,
  onCopy,
  scrollLabel,
  stickyHeader = false,
}: MarkdownProseTableProps) => {
  const [scrollable, setScrollable] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const text = { ...TABLE_LABELS, ...labels };
  const scrollText = scrollLabel ?? text.scroll;

  // Copy writes the markdown source and the serialized table.
  const copyTable = (event: MouseEvent<HTMLButtonElement>) => {
    onCopy?.();

    if (getCopyContent) {
      return writeClipboardFormats(getCopyContent(markdownSource));
    }

    const scroller = event.currentTarget
      .closest("[data-ck-markdown-table]")
      ?.querySelector("table")?.parentElement;

    if (!scroller) {
      return false;
    }

    const serialized = serializeElement(scroller);

    return serialized === null
      ? false
      : writeClipboardFormats({
          "text/html": serialized.htmlText,
          "text/plain": markdownSource ?? "",
        });
  };

  // Left and Right scroll the table by 40px, a viewport width with Alt (on Mac).
  const scrollWithArrows = (event: KeyboardEvent<HTMLButtonElement>) => {
    const scroller = scrollerRef.current;

    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      (event.altKey && !isMacPlatform()) ||
      (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
      scroller === null ||
      scroller.scrollWidth <= scroller.clientWidth
    ) {
      return;
    }

    event.preventDefault();
    scroller.scrollBy({
      left:
        (event.key === "ArrowLeft" ? -1 : 1) *
        (event.altKey ? scroller.clientWidth : 40),
    });
  };

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Callback ref with a cleanup: the observer watches the scroller and the
  // table wrapper and recomputes `scrollWidth > clientWidth` on every change.
  const observe = useCallback((scroller: HTMLDivElement | null) => {
    scrollerRef.current = scroller;

    if (!scroller) {
      return;
    }

    const update = () => {
      setScrollable(scroller.scrollWidth > scroller.clientWidth);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);

    if (scroller.firstElementChild) {
      observer.observe(scroller.firstElementChild);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={cn(
        "group/app-widget relative mt-[calc(var(--ck-prose-space)*4)] w-full min-w-full pointer-coarse:pt-11 [@media(hover:none)]:pt-11",
        "data-[wide-block]:w-fit data-[wide-block]:max-w-(--ck-wide-content-width) data-[wide-block]:[--ck-edge-fade-size:calc(var(--ck-chat-content-margin,24px)*4)]",
        "data-[wide-block]:[--ck-wide-content-panel-max-width:var(--ck-wide-content-panel-max-width-override,calc(100cqi-var(--ck-chat-content-max-width)+(var(--ck-chat-content-margin,24px)*3)+(var(--ck-chat-wide-block-inline-shift,0px)*2)))]",
        "data-[wide-block]:[--ck-wide-content-width:max(100%,min(calc(50cqi+50%-var(--ck-toolbar-padding)-var(--ck-chat-content-margin,24px)-var(--ck-chat-wide-block-inline-shift,0px)),calc((100%+var(--ck-wide-content-panel-max-width))/2)))]",
        "[&:not([data-ck-wide-block])_[data-ck-col-size]]:min-w-auto [&:not([data-ck-wide-block])_table]:[font-variant-numeric:tabular-nums]"
      )}
      data-ck-markdown-table
      data-ck-wide-block={allowWideBlocks ? "" : undefined}
      tabIndex={-1}
    >
      <div
        aria-label={scrollable ? scrollText : undefined}
        className="[scrollbar-width:thin] overflow-x-auto in-data-[wide-block]:flex"
        data-ck-horizontal-scroll
        ref={observe}
        role={scrollable ? "region" : undefined}
        tabIndex={scrollable ? 0 : undefined}
      >
        <div className="pointer-events-auto w-fit min-w-full shrink-0">
          <table
            className={cn(
              CONTENT_FONT,
              "m-0 w-fit min-w-full table-auto border-separate border-spacing-0 text-start text-[length:var(--ck-prose-small-font-size)] leading-(--ck-prose-line-height)",
              COLUMN_SIZES,
              stickyHeader &&
                "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-panel",
              className
            )}
            dir="auto"
          >
            {children}
          </table>
        </div>
      </div>
      <div
        className="pointer-events-none absolute end-0 top-0 z-50 flex w-fit items-center gap-1 rounded-full bg-panel p-0.5 text-text-subtle opacity-0 select-none group-hover/app-widget:pointer-events-auto group-hover/app-widget:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 has-data-[state=open]:pointer-events-auto has-data-[state=open]:opacity-100 data-[visible=true]:pointer-events-auto data-[visible=true]:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
        data-block-actions
        data-ck-markdown-copy="exclude"
      >
        <CopyActionButton
          label={text.copy}
          onCopy={copyTable}
          onKeyDown={scrollWithArrows}
          variant="blockAction"
        />
        {allowWideBlocks || scrollable ? (
          <TooltipHint content={text.expand} delayOpen cloneCustomTrigger>
            <Button
              aria-expanded={expanded}
              aria-haspopup="dialog"
              aria-label={text.expand}
              color="blockAction"
              onClick={() => {
                setExpanded(true);
              }}
              radius="full"
              size="inputIcon"
            >
              <ChatTableExpandIcon className="size-4" />
            </Button>
          </TooltipHint>
        ) : null}
      </div>
      <Dialog
        aria-label={text.preview}
        className="flex h-[calc(100dvh-4rem)] w-[calc(100vw-4rem)] max-w-none flex-col bg-transparent shadow-none ring-0"
        dialogCloseLabel={text.closePreview}
        onOpenChange={setExpanded}
        open={expanded}
      >
        <div className={cn(ROOT_CLASSES, TABLE_PREVIEW)}>
          <div
            aria-label={text.scroll}
            className="flex min-h-0 min-w-0 flex-1 [scrollbar-width:thin] overflow-auto bg-inherit"
            data-ck-horizontal-scroll
            role="region"
            tabIndex={0}
          >
            <div className="flex w-fit flex-col bg-inherit max-sm:px-4">
              <table
                className={cn(
                  CONTENT_FONT,
                  "m-0 w-fit min-w-full table-auto border-separate border-spacing-0 text-start text-[length:var(--ck-prose-small-font-size)] leading-(--ck-prose-line-height)",
                  COLUMN_SIZES,
                  stickyHeader &&
                    "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-panel",
                  className
                )}
                dir="auto"
              >
                {children}
              </table>
              <div
                aria-hidden="true"
                className="pointer-events-none sticky bottom-0 h-2 w-full shrink-0 bg-inherit"
              />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none sticky end-0 top-0 h-full w-2 shrink-0 bg-inherit"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

const TABLE_PREVIEW =
  "m-auto flex max-h-full max-w-full overflow-hidden rounded-2xl border border-border bg-panel-elevated-secondary py-8 px-0 shadow-2xl min-[40rem]:max-w-[80%] min-[40rem]:px-8";

const isMacPlatform = (): boolean =>
  typeof navigator !== "undefined" &&
  (navigator.platform ?? "").startsWith("Mac");

// ---- code ------------------------------------------------------------------

const INLINE_CODE_CLASSES =
  "inline rounded-[6px] bg-[color-mix(in_srgb,var(--ck-palette-surface-button-secondary-hover)_60%,var(--ck-palette-ink)_6%)] px-1.5 py-px font-mono text-[.92em] [box-decoration-break:clone] [overflow-wrap:anywhere] [word-break:break-word] [unicode-bidi:isolate] in-data-[markdown-text-tone=inherit]:bg-panel in-data-[markdown-text-tone=inherit]:bg-[image:linear-gradient(var(--ck-palette-surface-button-secondary-hover),var(--ck-palette-surface-button-secondary-hover))] in-data-[markdown-text-tone=inherit]:text-text";

/** The inline code span, without file and mention decorations. */
export const MarkdownProseInlineCode = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(INLINE_CODE_CLASSES, className)}
    data-ck-markdown-copy="inline-code"
    dir="ltr"
  >
    {children}
  </span>
);

/** Placeholder: the code in a scrolling surface block. */
export const MarkdownProseCodeBlockPlaceholder = ({
  code,
  className,
}: {
  className?: string;
  code: string;
}) => (
  <div
    className={cn("my-[calc(var(--ck-prose-space)*5)]", className)}
    data-ck-markdown-copy="code-block"
    data-markdown-copy-text={code}
  >
    <pre
      className="overflow-x-auto rounded-[1.25rem] bg-panel bg-[image:linear-gradient(var(--ck-palette-surface-button-secondary-hover),var(--ck-palette-surface-button-secondary-hover))] p-[calc(var(--ck-prose-space)*4)] text-[length:var(--ck-prose-small-font-size)] leading-[calc(var(--ck-prose-space)*5)] text-text"
      data-ck-horizontal-scroll
    >
      <code>{code}</code>
    </pre>
  </div>
);

// ---- root ------------------------------------------------------------------

export interface MarkdownProseProps {
  allowBasicHtml?: boolean;
  /**
   * Streaming text takes `--ck-stream-duration` (.7s) for each
   * fading segment and list marker. Default false.
   */
  adaptiveStreaming?: boolean;
  allowWideBlocks?: boolean;
  /**
   * Fade in text, list items, rules, table rows, quotes and images
   * (`data-ck-markdown-animated`). Default: `isStreaming`.
   */
  animated?: boolean;
  /** Soft line breaks become `<br>`. */
  breakNewLines?: boolean;
  /** The markdown source. */
  children: string;
  className?: string;
  components?: MarkdownComponents;
  /** Text direction of the blocks. Defaults to `auto`. */
  direction?: Direction;
  /**
   * How links look. `decorated` is the dotted
   * underline without a tooltip; the other two show the URL in a tooltip. The
   * mention chip of `inline-mention` belongs to the mention family, so both
   * render the library link. Default `inline-mention`.
   */
  externalLinkAppearance?: MarkdownProseLinkAppearance;
  /** Renders each link. Default `ExternalLink`, which confirms in restricted mode. */
  ExternalLinkComponent?: ExternalLinkComponent;
  /** `restricted` asks before a link opens. Default `allow`. */
  externalResourcePolicy?: ExternalResourcePolicy;
  /** Code blocks wrap their lines and the wrap button is hidden. */
  forceCodeBlockWordWrap?: boolean;
  /**
   * Milliseconds between the starts of two fading text segments, so a chunk
   * that arrives at once fades in word by word. Default 0 (all at once).
   */
  fadeSegmentDelayMs?: number;
  /** The longest a segment waits to start, from the moment it renders. */
  fadeSegmentMaxDelayMs?: number;
  hideCodeBlocks?: boolean;
  /** The text is still arriving; turns `animated` on unless it is set. */
  isStreaming?: boolean;
  /** Replaces what the table copy button writes, or runs on its press. */
  tableActions?: Pick<MarkdownProseTableProps, "getCopyContent" | "onCopy">;
  /**
   * Gives the add to chat button of a writing block the text and a range over
   * it. It is left out while the text still
   * streams.
   */
  onAddSelectedTextToChat?: (text: string, range: Range) => void;
  /** Code fences without a language, or with `text`, `md` or `markdown`, render as writing blocks. */
  renderCodeBlocksAsWritingBlocks?: boolean;
  /**
   * Renders math, default on: `$$...$$` blocks and runs render as KaTeX
   * (single dollar signs stay text). KaTeX loads on first use, and until it has the math
   * shows as plain text. Math turns block-by-block rendering off.
   */
  renderMath?: boolean;
  /** Renders an svg code block at once instead of when it nears the viewport. */
  renderCodeBlocksImmediately?: boolean;
  /** Code block headers stay under the thread header while the block scrolls. */
  stickyCodeBlockHeader?: boolean;
  skipHtml?: boolean;
  textStyle?: MarkdownProseTextStyle;
  urlTransform?: MarkdownUrlTransform;
}

const NEWLINES = /\r\n?/g;

const ProseOrderedList = (props: {
  children?: ReactNode;
  className?: string;
  node?: unknown;
  start?: number;
}) => <List {...props} tag="ol" />;

const ProseUnorderedList = (props: {
  children?: ReactNode;
  className?: string;
  node?: unknown;
}) => <List {...props} tag="ul" />;

const WRITING_BLOCK_LANGUAGES = new Set(["text", "md", "markdown"]);

/** No language, or text, md or markdown. */
const isWritingBlockLanguage = (language: string | undefined): boolean =>
  language === undefined || WRITING_BLOCK_LANGUAGES.has(language);

/**
 * The full code block. An svg source waits for the viewport
 * behind the placeholder (unless `renderCodeBlocksImmediately`); other
 * blocks render at once and defer only their token colouring.
 */
const ProsePre = ({
  children,
  fenceOpen,
}: {
  children?: ReactNode;
  fenceOpen?: boolean;
  node?: unknown;
}) => {
  const {
    forceCodeBlockWordWrap,
    hideCodeBlocks,
    isStreaming,
    onAddSelectedTextToChat,
    renderCodeBlocksAsWritingBlocks,
    renderCodeBlocksImmediately,
    stickyCodeBlockHeader,
  } = useContext(ProseContext);

  if (hideCodeBlocks) {
    return null;
  }

  const { code, language } = extractCodeBlock(children);
  const fenceIsOpen = isStreaming && fenceOpen === true;

  if (renderCodeBlocksAsWritingBlocks && isWritingBlockLanguage(language)) {
    return (
      <DeferUntilVisible
        fallback={<MarkdownProseCodeBlockPlaceholder code={code} />}
        renderImmediately={renderCodeBlocksImmediately}
        renderVisible={() => (
          <MarkdownWritingBlock
            className="my-[calc(var(--ck-prose-space)*5)]"
            content={code}
            onAddSelectedTextToChat={
              isStreaming ? undefined : onAddSelectedTextToChat
            }
            showCopyButton={!fenceIsOpen}
          />
        )}
      />
    );
  }

  if (language === "mermaid" && !fenceIsOpen) {
    return (
      <DeferUntilVisible
        fallback={<MarkdownProseCodeBlockPlaceholder code={code} />}
        renderImmediately={renderCodeBlocksImmediately}
        renderVisible={() => <MermaidDiagram code={code} />}
      />
    );
  }

  const block = (
    <MarkdownProseCodeBlock
      className="my-[calc(var(--ck-prose-space)*5)]"
      code={code}
      forceWordWrap={forceCodeBlockWordWrap}
      isCodeFenceOpen={fenceIsOpen}
      language={language}
      stickyHeader={stickyCodeBlockHeader}
    />
  );

  return isSvgCodeBlock(code, language) ? (
    <DeferUntilVisible
      fallback={<MarkdownProseCodeBlockPlaceholder code={code} />}
      renderImmediately={renderCodeBlocksImmediately}
      renderVisible={() => block}
    />
  ) : (
    block
  );
};

const ProseStrong = ({
  children,
}: {
  children?: ReactNode;
  node?: unknown;
}) => <strong className="font-semibold">{children}</strong>;

const ProseTableContainer = ({
  children,
  markdownSource,
}: {
  children?: ReactNode;
  markdownSource?: string;
  node?: unknown;
}) => {
  const { allowWideBlocks, tableActions } = useContext(ProseContext);

  return (
    <MarkdownProseTable
      allowWideBlocks={allowWideBlocks}
      getCopyContent={tableActions?.getCopyContent}
      markdownSource={markdownSource}
      onCopy={tableActions?.onCopy}
    >
      {children}
    </MarkdownProseTable>
  );
};

const ProseTableHead = ({
  children,
}: {
  children?: ReactNode;
  node?: unknown;
}) => <thead>{children}</thead>;

const ProseTableBody = ({
  children,
}: {
  children?: ReactNode;
  node?: unknown;
}) => <tbody>{children}</tbody>;

const PROSE_LINK_TONE =
  "in-data-[markdown-text-tone=inherit]:text-(--ck-prose-link-color,inherit)";

// A dotted
// tertiary underline that turns to the info color on hover.
const DECORATED_LINK =
  "cursor-pointer text-inherit underline decoration-text-subtle decoration-dotted decoration-1 underline-offset-2 [text-decoration-skip-ink:auto] [text-underline-position:from-font] hover:text-text-notice hover:decoration-current";

const ProseLinkBody = ({
  children,
  options,
  policy,
  ...props
}: ComponentProps<"a"> & {
  href: string;
  options?: LinkProviderRenderOptions;
  policy: ExternalResourcePolicy;
}) => {
  const { ExternalLinkComponent, externalLinkAppearance } =
    useContext(ProseContext);

  const Link = ExternalLinkComponent ?? ExternalLink;

  const decorated = externalLinkAppearance === "decorated";

  const label = options?.customIcon ? (
    <span className="inline-flex items-center gap-1">
      <span data-ck-markdown-copy="exclude">{options.customIcon}</span>
      {children}
    </span>
  ) : (
    children
  );

  return (
    <Link
      {...props}
      className={cn(
        decorated ? DECORATED_LINK : TEXT_LINK_CLASSES,
        PROSE_LINK_TONE
      )}
      data-underline={decorated ? undefined : "always"}
      requiresConfirmation={policy === "restricted"}
      tooltipContent={
        options?.customTooltip ?? (decorated ? undefined : props.href)
      }
      tooltipDelayDuration={options?.tooltipDelayDuration}
    >
      {label}
    </Link>
  );
};

/**
 * Every link goes through the link provider when one
 * is set (it receives the href and a render function), and the link component
 * renders it. A restricted policy, from the prop or an ancestor, makes the
 * link ask before it opens. A decorated link is the dotted underline without a
 * tooltip; the other appearances show the URL in a tooltip. File and mention
 * resolution, app icons and website previews are host services that arrive as
 * a link provider.
 */
const ProseLink = ({
  children,
  node: _node,
  ...props
}: ComponentProps<"a"> & { node?: unknown }) => {
  const { externalResourcePolicy } = useContext(ProseContext);
  const inherited = useContext(ExternalResourcePolicyContext);
  const Provider = useContext(LinkProviderContext);
  const { href } = props;

  if (!href) {
    return children;
  }

  const policy =
    externalResourcePolicy === "restricted" || inherited === "restricted"
      ? "restricted"
      : "allow";

  const render = (options?: LinkProviderRenderOptions) => (
    <ProseLinkBody {...props} href={href} options={options} policy={policy}>
      {children}
    </ProseLinkBody>
  );

  return Provider ? <Provider href={href}>{render}</Provider> : render();
};

const IMAGE_ENTER =
  "in-data-[markdown-animated]:origin-center in-data-[markdown-animated]:animate-in in-data-[markdown-animated]:fade-in-0 in-data-[markdown-animated]:zoom-in-[.98] in-data-[markdown-animated]:fill-mode-both in-data-[markdown-animated]:[--tw-animation-duration:.18s] in-data-[markdown-animated]:[--tw-ease:ease-out] motion-reduce:in-data-[markdown-animated]:[--tw-animation-duration:0s]";

const ProseImage = ({
  alt,
  className,
  node: _node,
  ...props
}: ComponentProps<"img"> & { node?: unknown }) => (
  // The component renders the image through its media component; this is the
  // plain element with the enter animation.
  // oxlint-disable-next-line next/no-img-element
  <img {...props} alt={alt ?? ""} className={cn(IMAGE_ENTER, className)} />
);

const PROSE_COMPONENTS: MarkdownComponents = {
  ...HEADINGS,
  a: ProseLink,
  blockquote: Blockquote,
  code: MarkdownProseInlineCode,
  hr: HorizontalRule,
  img: ProseImage,
  li: ListItem,
  ol: ProseOrderedList,
  p: Paragraph,
  pre: ProsePre,
  strong: ProseStrong,
  table: ProseTableContainer,
  tbody: ProseTableBody,
  td: TableCell,
  th: TableHeaderCell,
  thead: ProseTableHead,
  tr: TableRow,
  ul: ProseUnorderedList,
};

/**
 * Markdown in the app's chat typography. Block code
 * renders the placeholder block; `hideCodeBlocks` omits it.
 */
export const MarkdownProse = memo(
  ({
    adaptiveStreaming = false,
    allowBasicHtml = false,
    allowWideBlocks = false,
    isStreaming = false,
    animated = isStreaming,
    breakNewLines = false,
    children,
    className,
    components,
    direction = "auto",
    ExternalLinkComponent: LinkComponent,
    externalLinkAppearance = "inline-mention",
    externalResourcePolicy,
    fadeSegmentDelayMs = 0,
    fadeSegmentMaxDelayMs,
    forceCodeBlockWordWrap = false,
    hideCodeBlocks = false,
    onAddSelectedTextToChat,
    renderCodeBlocksAsWritingBlocks,
    renderCodeBlocksImmediately = false,
    renderMath,
    stickyCodeBlockHeader = false,
    tableActions,
    skipHtml,
    textStyle,
    urlTransform = markdownUrlTransform,
  }: MarkdownProseProps) => {
    const mapped = useMemo<MarkdownComponents>(
      () => ({ ...PROSE_COMPONENTS, ...components }),
      [components]
    );

    const context = useMemo(
      () => ({
        ExternalLinkComponent: LinkComponent,
        allowWideBlocks,
        direction,
        externalLinkAppearance,
        externalResourcePolicy,
        forceCodeBlockWordWrap,
        hideCodeBlocks,
        isStreaming,
        onAddSelectedTextToChat,
        renderCodeBlocksAsWritingBlocks,
        renderCodeBlocksImmediately,
        stickyCodeBlockHeader,
        tableActions,
      }),
      [
        allowWideBlocks,
        direction,
        LinkComponent,
        externalLinkAppearance,
        externalResourcePolicy,
        forceCodeBlockWordWrap,
        hideCodeBlocks,
        isStreaming,
        onAddSelectedTextToChat,
        renderCodeBlocksAsWritingBlocks,
        renderCodeBlocksImmediately,
        stickyCodeBlockHeader,
        tableActions,
      ]
    );

    // Fading text numbers its segments across the whole document, so a
    // fading prose renders whole (the component re-lexes every token as well).
    const [timeline] = useState(createFadeSegmentTimeline);
    const [keyStore] = useState(createFadeKeyStore);
    const [segmenter] = useState(createWordSegmenter);
    const candidate = useRef<FadeKeyState | undefined>(undefined);

    const math = renderMath !== false;
    const katex = useKatex(math);

    const rehypePlugins = useMemo(
      () => (katex ? [createRehypeKatex(katex)] : undefined),
      [katex]
    );

    const assistantMessage = textStyle?.kind === "assistant-message";

    const config = useMemo(
      () => ({
        enabled: !animated && !math,
        parse: {
          breakNewLines,
          math: katex !== null,
          tableColumnSizes: true,
          tableMarkdownSource: true,
          taskCheckbox: "leading" as const,
        },
        render: (nodes: Parameters<typeof renderHast>[0]) =>
          renderHast(nodes, {
            allowBasicHtml,
            components: mapped,
            decorate: animated
              ? (prepared) => {
                  const state = keyStore.createCandidate();

                  const fade: FadeConfig = {
                    fadeInClassName: cn(FADE_IN, styles.fadeIn),
                    fadeSegmentDelayMs,
                    fadeSegmentMaxDelayMs,
                    listDecorationClassName: styles.fadeListDecoration ?? "",
                    segments: collectFadeSegments(prepared, segmenter, state),
                    timeline,
                  };

                  candidate.current = state;

                  return {
                    elementProps: (node) => listItemFadeProps(node, fade),
                    renderText: (node) => renderFadeText(node, fade),
                  };
                }
              : assistantMessage
                ? () => ({
                    renderText: (node) => <AssistantText text={node.value} />,
                  })
                : undefined,
            rehypePlugins,
            skipHtml,
            urlTransform,
          }),
      }),
      [
        animated,
        allowBasicHtml,
        breakNewLines,
        katex,
        math,
        rehypePlugins,
        fadeSegmentDelayMs,
        fadeSegmentMaxDelayMs,
        keyStore,
        mapped,
        segmenter,
        skipHtml,
        timeline,
        assistantMessage,
        urlTransform,
      ]
    );

    const content = useIncrementalBlocks(
      children.replaceAll(NEWLINES, "\n"),
      config
    );

    // The keys of this render become the previous ones once it is on screen.
    useLayoutEffect(() => {
      if (candidate.current) {
        keyStore.commit(candidate.current);
      }
    }, [content, keyStore]);

    // A copy event anywhere in the document, in the capture phase,
    // writes the selection inside the prose as markdown text and html.
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const root = rootRef.current;

      if (root === null) {
        return;
      }

      const listener = (event: ClipboardEvent) => {
        writeSelectionToCopyEvent(event, root);
      };

      root.ownerDocument.addEventListener("copy", listener, { capture: true });

      return () => {
        root.ownerDocument.removeEventListener("copy", listener, {
          capture: true,
        });
      };
    }, []);

    return (
      <ProseContext.Provider value={context}>
        <div
          ref={rootRef}
          className={cn(
            ROOT_CLASSES,
            adaptiveStreaming && styles.adaptiveStreaming,
            className
          )}
          data-ck-markdown-animated={animated ? "" : undefined}
          data-ck-markdown-text-style={textStyle?.kind}
          data-ck-markdown-text-tone={textStyle?.tone}
          dir={direction}
          style={
            {
              "--ck-prose-link-color": textStyle?.linkColor ?? "currentColor",
            } as CSSProperties
          }
        >
          {content.map((child, index) =>
            isValidElement(child) ? (
              child
            ) : (
              <Fragment key={`text-${index}`}>{child}</Fragment>
            )
          )}
        </div>
      </ProseContext.Provider>
    );
  }
);
