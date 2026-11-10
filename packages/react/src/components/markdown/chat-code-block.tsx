"use client";

/* oxlint-disable anti-slop/require-readable-spacing, eslint/complexity, eslint/no-nested-ternary, eslint/require-await, eslint/require-unicode-regexp -- The block follows the component branch for branch. */
/* oxlint-disable shadcn/no-restyle, shadcn/no-unknown-classes, typescript/promise-function-async, typescript/return-await -- The component styles these elements itself; the copy handler returns the clipboard promise. */

/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables are typed by their string keys. */
/* oxlint-disable anti-slop/no-runtime-typeof -- A value may be a string or a function, as in the components. */
/* oxlint-disable shadcn/no-arbitrary-values -- The classes are the calc values and surfaces; no theme token matches them. */
/* oxlint-disable typescript/consistent-return -- Effects return a cleanup only when they registered something. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional flags by truthiness. */

import {
  ChatCodeIcon,
  ChatCodeWrapOffIcon,
  ChatCodeWrapOnIcon,
} from "@workspace/react/components/markdown/chat-code-icons";
import { CopyActionButton } from "@workspace/react/components/markdown/copy-action-button";
import { highlightLines } from "@workspace/react/components/markdown/highlight-view";
import { Button } from "@workspace/react/components/ui/button";
import { copyMarkdownText } from "@workspace/react/components/ui/markdown";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

/**
 * The full code block of the chat prose: the block, the visibility swap, the
 * chrome, the action bar, the code and its deferral, the copy button, the
 * language labels and the svg test, with their surfaces.
 */

// ---- language labels -------------------------------------------

const LANGUAGES: readonly (readonly [value: string, label: string | null])[] = [
  ["arduino", "Arduino"],
  ["bash", "Bash"],
  ["c", "C"],
  ["cpp", "C++"],
  ["csharp", "C#"],
  ["css", "CSS"],
  ["diff", "Diff"],
  ["go", "Go"],
  ["graphql", "GraphQL"],
  ["ini", "INI"],
  ["java", "Java"],
  ["javascript", "JavaScript"],
  ["json", "JSON"],
  ["kotlin", "Kotlin"],
  ["latex", "LaTeX"],
  ["less", "Less"],
  ["lua", "Lua"],
  ["makefile", "Makefile"],
  ["markdown", "Markdown"],
  ["mermaid", "Mermaid"],
  ["objectivec", "Objective-C"],
  ["perl", "Perl"],
  ["php", "PHP"],
  ["php-template", "PHP template"],
  ["plaintext", null],
  ["python", "Python"],
  ["python-repl", "Python REPL"],
  ["r", "R"],
  ["ruby", "Ruby"],
  ["rust", "Rust"],
  ["scss", "SCSS"],
  ["shell", "Shell"],
  ["sql", "SQL"],
  ["swift", "Swift"],
  ["typescript", "TypeScript"],
  ["vbnet", "Visual Basic .NET"],
  ["wasm", "WebAssembly"],
  ["xml", "XML"],
  ["yaml", "YAML"],
];

const LANGUAGE_ALIASES: Record<string, string> = {
  "c#": "csharp",
  "c++": "cpp",
  cs: "csharp",
  gql: "graphql",
  html: "xml",
  js: "javascript",
  jsx: "javascript",
  math: "latex",
  md: "markdown",
  objc: "objectivec",
  patch: "diff",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  tex: "latex",
  text: "plaintext",
  ts: "typescript",
  tsx: "typescript",
  vb: "vbnet",
  yml: "yaml",
  zsh: "bash",
};

const LABELS = new Map(LANGUAGES);

const PLAIN_TEXT_LABEL = "Plain text";

/** The display label of a fence language, or undefined when it is not a known language. */
export const codeLanguageLabel = (language: string): string | undefined => {
  const key = language.trim().toLowerCase();
  const value = LABELS.has(key) ? key : LANGUAGE_ALIASES[key];

  if (value === undefined || !LABELS.has(value)) {
    return;
  }

  return LABELS.get(value) ?? PLAIN_TEXT_LABEL;
};

/** An svg source (the fence language `svg`, or xml and html that start with `<svg`). */
export const isSvgCodeBlock = (code: string, language?: string): boolean =>
  language === "svg" ||
  ((language === "xml" || language === "html") && /^\s*<svg/.test(code));

// Visibility.

/**
 * False until the element is within 600px of the viewport, then
 * true for good. Without `deferred` it is true at once. Without
 * IntersectionObserver it turns true on the next tick.
 */
export const useVisibleOnce = (
  ref: RefObject<Element | null>,
  deferred: boolean
): boolean => {
  const [seen, setSeen] = useState(false);
  const visible = !deferred || seen;

  useEffect(() => {
    if (visible) {
      return;
    }

    const element = ref.current;

    if (element === null) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => {
        setSeen(true);
      }, 0);

      return () => {
        clearTimeout(timer);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "640px 0px" }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, visible]);

  return visible;
};

export interface DeferUntilVisibleProps {
  /** Shown until the block is near the viewport. */
  fallback: ReactNode;
  /** Renders the block at once. */
  renderImmediately?: boolean;
  renderVisible: () => ReactNode;
}

/** The fallback sits in a div until it is near the viewport, then the block replaces it. */
export const DeferUntilVisible = ({
  fallback,
  renderImmediately = false,
  renderVisible,
}: DeferUntilVisibleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisibleOnce(ref, !renderImmediately);

  return visible ? renderVisible() : <div ref={ref}>{fallback}</div>;
};

// The code block.

export interface MarkdownProseCodeBlockProps {
  /** The code, without the trailing newline. */
  code: string;
  className?: string;
  /** Label of the copy button. Default "Copy code". */
  copyLabel?: string;
  /** Word wrap is on and cannot be turned off. */
  forceWordWrap?: boolean;
  /** The fence is still open while the text streams: no copy button, title may be empty. */
  isCodeFenceOpen?: boolean;
  /** The fence info string. */
  language?: string;
  /** The header stays under the thread header while the block scrolls. */
  stickyHeader?: boolean;
  /** Labels of the word wrap button. Defaults "Enable word wrap" and "Disable word wrap". */
  wrapLabels?: { disable: string; enable: string };
}

const DEFAULT_WRAP_LABELS = {
  disable: "Disable word wrap",
  enable: "Enable word wrap",
};

const SURFACE =
  "[corner-shape:superellipse(1.1)] bg-panel bg-[image:linear-gradient(var(--ck-palette-surface-button-secondary-hover),var(--ck-palette-surface-button-secondary-hover))]";

const STICKY_BAR =
  "sticky top-[calc(-1px-var(--ck-chat-sticky-header-top,0px))] z-10 bg-panel bg-[image:linear-gradient(var(--ck-palette-surface-button-secondary-hover),var(--ck-palette-surface-button-secondary-hover))]";

/** Prism token types mapped to the highlight.js colours. */
const SYNTAX_CLASSES: Record<string, string> = {
  "attr-name": "text-syntax-attribute",
  boolean: "text-syntax-literal",
  builtin: "text-syntax-literal",
  "class-name": "text-syntax-variable",
  comment: "text-syntax-comment italic",
  constant: "text-syntax-literal",
  function: "text-syntax-variable",
  keyword: "text-syntax-keyword",
  number: "text-syntax-literal",
  operator: "text-syntax-keyword",
  regex: "text-syntax-string",
  string: "text-syntax-string",
  "template-string": "text-syntax-string",
};

/** The last class with a colour wins, as Prism lists the type before its aliases. */
const syntaxClassName = (classes: readonly string[]): string => {
  const colour = classes.findLast((name) => name in SYNTAX_CLASSES);

  return cn(classes, colour === undefined ? undefined : SYNTAX_CLASSES[colour]);
};

const CODE_CLASSES =
  "block font-mono text-[length:var(--ui-code-text-size,12px)] leading-[max(1.5em,calc(var(--spacing)*5))]";

/**
 * A normal block. The action bar holds the language title (with the code
 * glyph), the word wrap toggle and the copy button; the code sits under it in a scrolling, focusable container. Token colouring is
 * deferred until the block is near the viewport. Refractor tokenizes it and the tokens
 * take the highlight.js colours.
 */
export const MarkdownProseCodeBlock = ({
  className,
  code,
  copyLabel = "Copy code",
  forceWordWrap = false,
  isCodeFenceOpen = false,
  language,
  stickyHeader = false,
  wrapLabels = DEFAULT_WRAP_LABELS,
}: MarkdownProseCodeBlockProps) => {
  const [userWrap, setUserWrap] = useState(false);
  const sourceRef = useRef<HTMLDivElement>(null);
  const enhanced = useVisibleOnce(sourceRef, true);
  const svg = isSvgCodeBlock(code, language);
  const wrapMode = svg ? "off" : forceWordWrap ? "always" : "user-controlled";
  const wrapped =
    wrapMode === "always" || (wrapMode === "user-controlled" && userWrap);
  const known =
    language === undefined ? undefined : codeLanguageLabel(language);
  const title = known ?? language ?? (isCodeFenceOpen ? "" : undefined);
  const wrapLabel = wrapped ? wrapLabels.disable : wrapLabels.enable;
  const content = useMemo(
    () =>
      enhanced && !svg && language !== undefined
        ? highlightLines(code, language, false, syntaxClassName)
        : code,
    [code, enhanced, language, svg]
  );

  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-clip rounded-3xl border border-stroke-subtle text-text contain-inline-size",
        SURFACE,
        className
      )}
      data-code-block
      data-enhanced={enhanced ? "" : undefined}
      data-ck-markdown-copy="code-block"
    >
      <div
        className={cn(
          "flex min-h-12 items-center gap-2 py-1.5 ps-4 pe-1.5 font-sans text-sm font-medium text-text select-none md:ps-5 print:hidden",
          stickyHeader && STICKY_BAR
        )}
        contentEditable={false}
        data-ck-markdown-copy="exclude"
      >
        {title === undefined ? null : (
          <ChatCodeIcon className="size-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1 truncate">{title}</div>
        <div className="ms-auto flex max-w-full min-w-0 items-center">
          <div
            className="flex flex-wrap items-center justify-end gap-px"
            data-code-block-controls
            role="presentation"
          >
            {wrapMode === "user-controlled" ? (
              <TooltipHint cloneCustomTrigger content={wrapLabel}>
                <Button
                  aria-label={wrapLabel}
                  aria-pressed={wrapped}
                  className={wrapped ? "hover:text-text" : undefined}
                  color="ghostActive"
                  onClick={() => {
                    setUserWrap((value) => !value);
                  }}
                  size="imageToolbar"
                  uniform
                >
                  {wrapped ? (
                    <ChatCodeWrapOnIcon className="size-3.5" />
                  ) : (
                    <ChatCodeWrapOffIcon className="size-3.5" />
                  )}
                </Button>
              </TooltipHint>
            ) : null}
            {isCodeFenceOpen ? null : (
              <CopyActionButton
                label={copyLabel}
                onCopy={async () => copyMarkdownText(code)}
                variant="toolbar"
              />
            )}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "overflow-auto px-4 pt-0 pb-3 text-[length:var(--ui-message-text-size,13px)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-5",
          wrapped ? "wrap-anywhere whitespace-pre-wrap" : "whitespace-pre"
        )}
        data-code-block-source
        dir="ltr"
        ref={sourceRef}
      >
        <pre className="whitespace-[inherit] m-0 border-0 bg-transparent p-0">
          <code
            className={cn(
              CODE_CLASSES,
              wrapped ? "whitespace-pre-wrap!" : "whitespace-pre!"
            )}
          >
            {content}
          </code>
        </pre>
      </div>
    </div>
  );
};
