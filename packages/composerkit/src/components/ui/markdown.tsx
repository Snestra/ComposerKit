"use client";

/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable anti-slop/no-runtime-typeof -- A value may be a string or a list, or a value or a function, as in the components. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: custom properties in style objects, children props read after an element check, and regex matches checked before use. */
/* oxlint-disable eslint/no-use-before-define -- The constants and helpers are read at render time, after the module has loaded. */
/* oxlint-disable eslint/prefer-named-capture-group -- The grammars are written with positional groups, as the reference parsers do. */
/* oxlint-disable eslint/require-unicode-regexp -- The patterns are CommonMark, GFM and ANSI grammar kept without the u flag, which rejects the escaped punctuation classes they use. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A link without a destination is a span with role button, as the component renders it. */
/* oxlint-disable react/display-name -- The memo components are named by their function expressions. */
/* oxlint-disable react/no-react-children -- The renderer reads and maps text children. */
/* oxlint-disable react/static-components -- The link renders through the platform link component. */
/* oxlint-disable shadcn/no-unknown-classes -- Prism token class names and the react-syntax-highlighter line number class are kept as styling hooks. */
/* oxlint-disable typescript/no-deprecated -- The clipboard falls back to the copy command where the async clipboard API is missing. */
/* oxlint-disable typescript/prefer-nullish-coalescing, typescript/strict-boolean-expressions -- Branches test optional flags, regex groups and empty strings by truthiness, as react-markdown and the component do. */
/* oxlint-disable typescript/promise-function-async -- ReactNode includes promises, but these functions return content synchronously. */
/* oxlint-disable unicorn/prefer-dom-node-remove -- Stylistic; the clipboard fallback keeps the removeChild call. */
/* oxlint-disable unicorn/prefer-export-from -- Stylistic; the module also uses the imported names. */

import { highlightLines } from "composerkit/components/markdown/highlight-view";
import {
  MarkdownCheckIcon,
  MarkdownCopyIcon,
} from "composerkit/components/markdown/icons";
import {
  createRehypeKatex,
  useKatex,
} from "composerkit/components/markdown/math";
import type {
  FootnoteOptions,
  HastElement,
} from "composerkit/components/markdown/parse";
import {
  renderHast,
  textContent,
  useIncrementalBlocks,
  markdownUrlTransform,
} from "composerkit/components/markdown/render";
import type {
  MarkdownComponents,
  MarkdownUrlTransform,
  RehypePluggable,
  RenderOptions,
} from "composerkit/components/markdown/render";
import { TransitionItem } from "composerkit/components/markdown/transition";
import { useLinkComponent } from "composerkit/components/platform-provider";
import { Button } from "composerkit/components/ui/button";
import type { ButtonProps } from "composerkit/components/ui/button";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import type { TooltipHintProps } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import {
  Children,
  Fragment,
  isValidElement,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  ComponentType,
  ElementType,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";

export { markdownUrlTransform } from "composerkit/components/markdown/render";

// ---- clipboard ------------------------------------------------------------

/**
 * `navigator.clipboard.writeText`, then a hidden fixed textarea
 * and `document.execCommand("copy")` when the clipboard API is missing or
 * rejects.
 */
export const copyMarkdownText = async (value: string): Promise<boolean> => {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value);

      return true;
    } catch {
      // Falls through to the textarea path.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const previousFocus = document.activeElement;
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.append(area);
  area.focus();
  area.select();
  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(area);

  if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
    previousFocus.focus();
  }

  return copied;
};

// ---- copy button ------------------------------------------------------------

const COPIED_RESET_MS = 1400;

type IconComponent = ComponentType<ComponentProps<"svg">>;

export interface CopyButtonProps extends Omit<
  ButtonProps,
  "children" | "onClick"
> {
  /** Static content, or a function of the copied state, after the icon. */
  children?: ReactNode | ((state: { copied: boolean }) => ReactNode);
  CopyIcon?: IconComponent;
  /** The text to copy, or a function that returns it at click time. */
  copyValue: string | (() => string);
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Wraps the button in a tooltip with this content. */
  tooltip?: ReactNode;
  tooltipProps?: Omit<TooltipHintProps, "children" | "content">;
}

/**
 * A click copies, swaps the copy icon for a check for 1300ms and
 * ignores further clicks while it shows. The icon swap is a keyed transition:
 * the new icon scales .6 to 1 over 300ms after a 150ms delay and the old one
 * scales back over 150ms.
 */
export const CopyButton = ({
  children,
  CopyIcon = MarkdownCopyIcon,
  copyValue,
  onClick,
  tooltip,
  tooltipProps,
  ...props
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current !== undefined) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (copied) {
      return;
    }

    setCopied(true);
    onClick?.(event);
    void copyMarkdownText(
      typeof copyValue === "function" ? copyValue() : copyValue
    );
    timer.current = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_RESET_MS);
  };

  const button = (
    <Button {...props} onClick={handleClick}>
      <TransitionItem
        className="size-[1.125rem]"
        enter={{ delay: 150, duration: 300, scale: 1 }}
        exit={{ duration: 150, scale: 0.6 }}
        forceCompositeLayer
        initial={{ scale: 0.6 }}
      >
        {copied ? (
          <MarkdownCheckIcon className="size-[1.125rem]" key="copied-icon" />
        ) : (
          <CopyIcon className="size-[1.125rem]" key="copy-icon" />
        )}
      </TransitionItem>
      {typeof children === "function" ? children({ copied }) : children}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <TooltipHint {...tooltipProps} cloneCustomTrigger content={tooltip}>
      {button}
    </TooltipHint>
  );
};

// ---- link -------------------------------------------------------------------

const HTTP_URL = /^https?:\/\//;

export const TEXT_LINK_CLASSES = [
  "inline-flex cursor-pointer items-center gap-0.5 rounded-sm text-current [font-weight:inherit] wrap-anywhere",
  "transition-[opacity,color,box-shadow,text-decoration-color] duration-(--motion-duration-fast) ease-[ease]",
  "[@media(hover:hover)_and_(pointer:fine)]:hover:text-[color-mix(in_oklab,currentcolor_80%,transparent)]",
  "[@media(hover:hover)_and_(pointer:fine)]:in-[.text-secondary]:hover:text-text",
  "[@media(hover:hover)_and_(pointer:fine)]:in-[.text-tertiary]:hover:text-text-muted",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid",
  "data-[underline=always]:underline data-[underline=always]:decoration-[color-mix(in_oklab,currentcolor_70%,transparent)] data-[underline=always]:underline-offset-[.1em]",
  "[@media(hover:hover)_and_(pointer:fine)]:data-[underline=hover]:hover:underline [@media(hover:hover)_and_(pointer:fine)]:data-[underline=hover]:hover:decoration-[color-mix(in_oklab,currentcolor_70%,transparent)] [@media(hover:hover)_and_(pointer:fine)]:data-[underline=hover]:hover:underline-offset-[.1em]",
  "data-primary:text-[var(--color-status-info)]",
  "[@media(hover:hover)_and_(pointer:fine)]:data-primary:hover:text-[var(--color-status-info-strong)]",
].join(" ");

export interface TextLinkProps extends Omit<
  ComponentProps<"a">,
  "href" | "target"
> {
  /** The element or component that renders the link. */
  as?: ElementType;
  forceExternal?: boolean;
  href?: string;
  /** Link color from `--ck-link-ink`; turns the underline off by default. */
  primary?: boolean;
  /** Router destination for the platform link component. */
  to?: string;
  /** `true` underlines always, `"hover"` on hover only. Default `!primary`. */
  underline?: boolean | "hover";
}

/**
 * Http(s) destinations open in a new tab with
 * `rel="noopener noreferrer"`; others go through the platform link component;
 * without a destination it renders `<span role="button">`.
 */
export const TextLink = ({
  as,
  children,
  className,
  forceExternal,
  href,
  primary = false,
  to,
  underline = !primary,
  ...props
}: TextLinkProps) => {
  const external = forceExternal ?? HTTP_URL.test(href ?? to ?? "");
  const PlatformLink = useLinkComponent();
  const Component: ElementType = as || (external ? "a" : PlatformLink);

  const common = {
    ...props,
    className: cn(TEXT_LINK_CLASSES, className),
    "data-primary": primary ? "" : undefined,
    "data-underline": getUnderline(underline),
  };

  if (!(href || to)) {
    return (
      <span {...common} role="button">
        {children}
      </span>
    );
  }

  const destination = external
    ? { href: href ?? to, rel: "noopener noreferrer", target: "_blank" }
    : { href, to };

  return (
    <Component {...destination} {...common}>
      {children}
    </Component>
  );
};

function getUnderline(underline: boolean | "hover"): string | undefined {
  if (underline === false) {
    return undefined;
  }

  return underline === "hover" ? "hover" : "always";
}

// ---- code block -------------------------------------------------------------

const TOKEN_CLASSES: Record<string, string> = {
  "attr-name": "text-(--syntax4)",
  "attr-value": "text-(--syntax3)",
  builtin: "text-(--syntax1)",
  cdata: "text-[color-mix(in_oklab,var(--ck-palette-ink)_70%,transparent)]",
  char: "text-(--syntax3)",
  "class-name": "text-(--syntax1)",
  comment: "text-[color-mix(in_oklab,var(--ck-palette-ink)_70%,transparent)]",
  boolean: "text-(--syntax5)",
  console: "text-text",
  constant: "text-(--syntax2)",
  deleted: "text-(--syntax2)",
  doctype: "text-[color-mix(in_oklab,var(--ck-palette-ink)_70%,transparent)]",
  entity: "text-(--syntax4)",
  function: "text-(--syntax1)",
  id: "text-(--syntax4)",
  important: "text-(--syntax5)",
  inserted: "text-(--syntax3)",
  keyword: "text-(--syntax2)",
  number: "text-(--syntax5)",
  operator: "text-[color-mix(in_oklab,var(--ck-palette-ink)_60%,transparent)]",
  prolog: "text-[color-mix(in_oklab,var(--ck-palette-ink)_70%,transparent)]",
  property: "text-(--syntax4)",
  punctuation:
    "text-[color-mix(in_oklab,var(--ck-palette-ink)_60%,transparent)]",
  regex: "text-(--syntax3)",
  selector: "text-(--syntax4)",
  string: "text-(--syntax3)",
  symbol: "text-(--syntax2)",
  tag: "text-(--syntax4)",
  type: "text-(--syntax4)",
  unit: "text-(--syntax4)",
  url: "text-(--syntax5)",
  variable: "text-(--syntax4)",
};

/**
 * A Prism token's class list is `token`, its type, then its aliases. The
 * stylesheet colours by class, so the last class that has a colour wins.
 */
export const tokenClassName = (classes: readonly string[]): string => {
  const colour = classes.findLast((name) => name in TOKEN_CLASSES);

  return cn(classes, colour === undefined ? undefined : TOKEN_CLASSES[colour]);
};

export interface CodeBlockProps extends ComponentProps<"div"> {
  className?: string;
}

/** The bordered block that holds the code and the copy button. */
export const CodeBlock = ({
  children,
  className,
  ...props
}: CodeBlockProps) => (
  <div
    className={cn(
      "relative rounded-md border border-border bg-(--ck-code-fill) [--ck-code-fill:var(--color-code-surface)]",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export interface CodeBlockCodeProps {
  children?: string;
  className?: string;
  codeTagProps?: ComponentProps<"code">;
  /** The Prism language name; unregistered names (default `text`) stay plain. */
  language?: string;
  showLineNumbers?: boolean;
}

/** Highlighted code in a `dir="ltr"` pre. */
export const CodeBlockCode = memo(
  ({
    children = "",
    className,
    codeTagProps,
    language = "text",
    showLineNumbers = false,
  }: CodeBlockCodeProps) => {
    const content = useMemo(
      () => highlightLines(children, language, showLineNumbers, tokenClassName),
      [children, language, showLineNumbers]
    );

    return (
      <pre
        className={cn(
          "m-0 block overflow-auto bg-transparent pt-3.5 pr-10 pb-3.5 pl-4 text-[.875em] leading-[1.5em] font-normal text-text",
          "[--syntax1:var(--color-syntax-1)] [--syntax2:var(--color-syntax-2)] [--syntax3:var(--color-syntax-3)] [--syntax4:var(--color-syntax-4)] [--syntax5:var(--color-syntax-5)]",
          "[&_.react-syntax-highlighter-line-number]:text-text-muted",
          className
        )}
        dir="ltr"
      >
        <code
          {...codeTagProps}
          className={cn(`language-${language}`, codeTagProps?.className)}
        >
          {content}
        </code>
      </pre>
    );
  }
);

export interface CodeBlockCopyButtonProps {
  className?: string;
  copyValue: string | (() => string);
  disabled?: boolean;
  loading?: boolean;
}

/** Ghost secondary uniform md button pinned top right. */
export const CodeBlockCopyButton = ({
  className,
  copyValue,
  disabled,
  loading,
}: CodeBlockCopyButtonProps) => (
  <div
    className={cn(
      "absolute top-0 right-0 rounded-[inherit] bg-(--ck-code-fill) pt-2.5 pr-2.5",
      className
    )}
  >
    <CopyButton
      className="size-8 rounded-md p-0 text-[1.125rem] hover:text-text"
      color="ghost"
      copyValue={copyValue}
      disabled={disabled}
      loading={loading}
      size="iconMd"
      uniform
    />
  </div>
);

export interface CodeBlockWithCopyProps {
  children: string;
  className?: string;
  language?: string;
}

/** Code and copy button in a block. */
export const CodeBlockWithCopy = memo(
  ({ children, className, language }: CodeBlockWithCopyProps) => (
    <CodeBlock className={className}>
      <CodeBlockCode language={language}>{children}</CodeBlockCode>
      <CodeBlockCopyButton copyValue={children} />
    </CodeBlock>
  )
);

// ---- inline code and fenced code extraction ---------------------------------

export const InlineCode = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <code
    className={cn(
      "rounded-[.25rem] bg-[light-dark(color-mix(in_oklab,var(--ck-palette-ink)_4%,transparent),color-mix(in_oklab,var(--ck-palette-ink)_10%,transparent))] px-[.3rem] py-px text-[.875em] font-medium text-inherit shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ck-palette-ink)_8%,transparent)]",
      className
    )}
    dir="ltr"
  >
    {children}
  </code>
);

const LANGUAGE_CLASS = /language-(.*)$/;
const TRAILING_NEWLINE = /\n$/g;

/** The code and language of a fenced block's `<code>` child. */
export const extractCodeBlock = (
  node: ReactNode
): { code: string; language: string } => {
  const element = Children.toArray(node).find((child) =>
    isValidElement(child)
  ) as ReactElement<{ children?: unknown; className?: unknown }> | undefined;

  if (!element) {
    return { code: "", language: "text" };
  }

  const { children, className } = element.props;

  // Fading replies wrap the code text in segment elements, so read the text through them.
  return {
    code: textContent(children as ReactNode).replaceAll(TRAILING_NEWLINE, ""),
    language:
      typeof className === "string"
        ? (LANGUAGE_CLASS.exec(className)?.[1] ?? "text")
        : "text",
  };
};

const MarkdownPre = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const { code, language } = extractCodeBlock(children);

  return (
    <CodeBlockWithCopy className={className} language={language}>
      {code}
    </CodeBlockWithCopy>
  );
};

/** The fenced block without the copy button. */
const MarkdownPreWithoutCopy = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const { code, language } = extractCodeBlock(children);

  return (
    <CodeBlock className={className}>
      <CodeBlockCode language={language}>{code}</CodeBlockCode>
    </CodeBlock>
  );
};

const MarkdownLink = ({
  children,
  node: _node,
  ...props
}: ComponentProps<"a"> & { node?: unknown }) => (
  <TextLink as="a" {...props}>
    {children}
  </TextLink>
);

const BR_TOKEN = "<br>";

const MarkdownCell = ({
  children,
  node: _node,
  ...props
}: ComponentProps<"td"> & { node?: unknown }) => (
  <td {...props}>
    {Children.map(children, (child, index) =>
      child === BR_TOKEN ? <br key={index} /> : child
    )}
  </td>
);

const DEFAULT_COMPONENTS: MarkdownComponents = {
  a: MarkdownLink,
  code: InlineCode,
  pre: MarkdownPre,
  td: MarkdownCell,
};

const COMPONENTS_WITHOUT_COPY: MarkdownComponents = {
  pre: MarkdownPreWithoutCopy,
};

// ---- root and Markdown ------------------------------------------------------

const CONTENT_CLASSES = [
  "wrap-anywhere [&_:first-child]:mt-0 [&_:last-child]:mb-0",
  "[&_h1]:mb-2 [&_h1]:text-[1.75em] [&_h1]:leading-[1.24] [&_h1]:font-semibold [&_h1]:tracking-[-.035rem]",
  "[&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-[1.5em] [&_h2]:leading-[1.24] [&_h2]:font-semibold",
  "[&_h3]:mt-[1.125rem] [&_h3]:mb-[.625rem] [&_h3]:text-[1.25em] [&_h3]:leading-[1.3] [&_h3]:font-semibold",
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-[1em] [&_h4]:leading-[1.5] [&_h4]:font-semibold",
  "[&_h5]:text-[1em] [&_h5]:leading-[1.5] [&_h5]:font-semibold",
  "[&_h6]:text-[1em] [&_h6]:leading-[1.5]",
  "[&_:is(ul,ol)]:[margin:.5em_0_1em]",
  "[&_:is(ul,ol)>li>:first-child]:my-0",
  "[&_:is(ul,ol)>li_:is(ul,ol)]:mt-[.25em]!",
  "[&_ul]:list-disc [&_ul]:ps-[1.625em]",
  "[&_ul>li]:[margin:.5em_0] [&_ul>li]:ps-[.375em]",
  "[&_ul>li::marker]:text-[1em] [&_ul>li::marker]:font-medium [&_ul>li::marker]:text-text-muted",
  "[&_ol]:list-decimal [&_ol]:ps-[1.625em]",
  "[&_ol>li]:[margin:.5em_0] [&_ol>li]:ps-[.375em]",
  "[&_ol>li::marker]:text-[1em] [&_ol>li::marker]:font-medium [&_ol>li::marker]:text-text-muted",
  "[&_.contains-task-list]:ps-[.25em]",
  "[&_.contains-task-list>li]:flex [&_.contains-task-list>li]:list-none [&_.contains-task-list>li]:items-baseline [&_.contains-task-list>li]:gap-2 [&_.contains-task-list>li]:ps-0",
  "[&_.contains-task-list_input[type=checkbox]]:m-0 [&_.contains-task-list_input[type=checkbox]]:h-auto [&_.contains-task-list_input[type=checkbox]]:w-auto [&_.contains-task-list_input[type=checkbox]]:flex-none [&_.contains-task-list_input[type=checkbox]]:appearance-auto [&_.contains-task-list_input[type=checkbox]]:rounded-[initial] [&_.contains-task-list_input[type=checkbox]]:border-[initial] [&_.contains-task-list_input[type=checkbox]]:bg-[initial]",
  "[&_li]:min-h-[1.5em] [&_li]:[margin:.5em_0]",
  "[&_p]:[margin:1em_0]",
  "[&_strong]:font-semibold [&_em]:italic",
  "[&_blockquote]:relative [&_blockquote]:pt-[.25em] [&_blockquote]:pb-1 [&_blockquote]:ps-6 [&_blockquote]:font-normal",
  "[&_blockquote::before]:absolute [&_blockquote::before]:inset-y-0 [&_blockquote::before]:start-0 [&_blockquote::before]:block [&_blockquote::before]:w-1 [&_blockquote::before]:rounded-[var(--radius-2xs)] [&_blockquote::before]:bg-[light-dark(color-mix(in_oklab,var(--ck-palette-ink)_15%,transparent),color-mix(in_oklab,var(--ck-palette-ink)_20%,transparent))] [&_blockquote::before]:content-['']",
  "[&_blockquote_p]:[margin:.5em_0_0] [&_blockquote_p:first-child]:mt-0",
  "[&_hr]:my-[2em] [&_hr]:border-t [&_hr]:border-[color-mix(in_oklab,var(--ck-palette-ink)_10%,transparent)]",
  "[&_table]:my-[2em] [&_table]:w-full [&_table]:table-auto [&_table]:border-separate [&_table]:border-0 [&_table]:text-[.875em] [&_table]:leading-[1.7]",
  "[&_th]:border-0 [&_th]:border-b [&_th]:border-stroke-strong [&_th]:px-2 [&_th]:py-2 [&_th]:text-start [&_th]:leading-5 [&_th:first-child]:ps-0 [&_th:last-child]:pe-0",
  "[&_td]:border-0 [&_td]:border-b [&_td]:border-border [&_td]:px-2 [&_td]:py-2.5 [&_td:first-child]:ps-0 [&_td:last-child]:pe-0",
  "[&_tbody_tr:last-child_td]:border-b-0",
].join(" ");

export interface MarkdownContentProps extends ComponentProps<"div"> {
  /** Skips the content styles. */
  unstyled?: boolean;
}

/** The styled root around rendered markdown. */
export const MarkdownContent = ({
  children,
  className,
  unstyled = false,
  ...props
}: MarkdownContentProps) => (
  <div className={cn(!unstyled && CONTENT_CLASSES, className)} {...props}>
    {children}
  </div>
);

export interface MarkdownDirective {
  directiveName: string;
  render: ElementType;
}

export interface MarkdownProps {
  allowedElements?: readonly string[];
  allowElement?: RenderOptions["allowElement"];
  /** Soft line breaks become `<br>` (remark-breaks). Default false. */
  breakNewLines?: boolean;
  /** The markdown source. */
  children: string;
  className?: string;
  components?: MarkdownComponents;
  /** Fenced code blocks show a copy button. Default true. */
  copyableCodeBlocks?: boolean;
  /** Container, leaf and text directives rendered by name (remark-directive). */
  directives?: readonly MarkdownDirective[];
  dir?: "auto" | "ltr" | "rtl";
  disallowedElements?: readonly string[];
  /** GFM tables, task lists and strikethrough. Default true. */
  gfm?: boolean;
  /** Re-render only the changed blocks while text streams in. Default on. */
  incremental?: boolean;
  /**
   * Loads KaTeX on first use and renders `$$...$$` blocks
   * and runs as math (remark-math with `singleDollarTextMath` off, then
   * rehype-katex). Until KaTeX has loaded the math shows as plain text. The
   * flag also turns block-by-block rendering off.
   */
  includeMath?: boolean;
  /**
   * Unified plugins that transform the hast tree. They
   * run in order on the document (or on each block when `incremental` is
   * `true`), before `allowElement`, the element lists and `urlTransform`. A
   * plugin gets a minimal processor (`this.data`) and file, not a full
   * unified instance, and must be synchronous.
   *
   * The `remarkPlugins` is not offered. Remark plugins transform an
   * mdast tree, and the parser here builds hast directly, so there is no mdast
   * to hand them. Running them needs the `unified`, `remark-parse` and
   * `remark-rehype` packages.
   */
  rehypePlugins?: readonly RehypePluggable[];
  /**
   * Only the footnote options are honoured
   * (`footnoteLabel`, `footnoteLabelTagName`, `footnoteLabelProperties`,
   * `footnoteBackLabel`, `footnoteBackContent`, `clobberPrefix`). `handlers`,
   * `passThrough` and `unknownHandler` act on mdast nodes, which do not exist
   * here. `allowDangerousHtml` is forced on.
   */
  remarkRehypeOptions?: FootnoteOptions;
  skipHtml?: boolean;
  /** Drops the content styles. */
  unstyled?: boolean;
  unwrapDisallowed?: boolean;
  urlTransform?: MarkdownUrlTransform;
}

const NEWLINES = /\r\n?/g;

/**
 * Renders GFM markdown with the first-party chrome:
 * styled prose, fenced code blocks with a copy button, links through
 * `TextLink` and inline code. Streaming text renders block by block, and a
 * document with reference definitions, footnotes or a BOM renders whole.
 */
export const Markdown = memo(
  ({
    allowedElements,
    allowElement,
    breakNewLines = false,
    children,
    className,
    components,
    copyableCodeBlocks = true,
    directives,
    dir,
    disallowedElements,
    gfm = true,
    incremental,
    includeMath = false,
    rehypePlugins,
    remarkRehypeOptions,
    skipHtml,
    unstyled = false,
    unwrapDisallowed,
    urlTransform = markdownUrlTransform,
  }: MarkdownProps) => {
    const katex = useKatex(includeMath);

    const plugins = useMemo<readonly RehypePluggable[] | undefined>(() => {
      if (!katex) {
        return rehypePlugins;
      }

      return [createRehypeKatex(katex), ...(rehypePlugins ?? [])];
    }, [katex, rehypePlugins]);

    const directiveNames = useMemo(
      () => directives?.map((directive) => directive.directiveName) ?? [],
      [directives]
    );

    const mapped = useMemo<MarkdownComponents>(
      () => ({
        ...DEFAULT_COMPONENTS,
        ...(copyableCodeBlocks ? null : COMPONENTS_WITHOUT_COPY),
        ...components,
        ...Object.fromEntries(
          directives?.map((directive) => [
            directive.directiveName,
            directive.render,
          ]) ?? []
        ),
      }),
      [components, copyableCodeBlocks, directives]
    );

    // Block-by-block rendering is off with directives,
    // allowElement, math or remarkRehypeOptions, and with plugins unless
    // `incremental` is true.
    const enabled =
      incremental !== false &&
      (!rehypePlugins?.length || incremental === true) &&
      !includeMath &&
      directiveNames.length === 0 &&
      !remarkRehypeOptions &&
      !allowElement;

    const config = useMemo(
      () => ({
        enabled,
        parse: {
          breakNewLines,
          directives: directiveNames,
          footnotes: remarkRehypeOptions,
          gfm,
          math: katex !== null,
        },
        render: (nodes: Parameters<typeof renderHast>[0]) =>
          renderHast(nodes, {
            allowElement,
            allowedElements,
            components: mapped,
            disallowedElements,
            rehypePlugins: plugins,
            skipHtml,
            unwrapDisallowed,
            urlTransform,
          }),
      }),
      [
        enabled,
        breakNewLines,
        directiveNames,
        gfm,
        remarkRehypeOptions,
        allowElement,
        allowedElements,
        mapped,
        disallowedElements,
        katex,
        plugins,
        skipHtml,
        unwrapDisallowed,
        urlTransform,
      ]
    );

    const content = useIncrementalBlocks(
      children.replaceAll(NEWLINES, "\n"),
      config
    );

    return (
      <MarkdownContent className={className} dir={dir} unstyled={unstyled}>
        {content.map((child, index) =>
          isValidElement(child) ? (
            child
          ) : (
            <Fragment key={`text-${index}`}>{child}</Fragment>
          )
        )}
      </MarkdownContent>
    );
  }
);

export type { HastElement, MarkdownComponents, MarkdownUrlTransform };
