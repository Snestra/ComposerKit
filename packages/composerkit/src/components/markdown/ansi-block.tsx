/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable shadcn/no-inline-styles -- The component styles each span from its SGR codes and each line number inline. */

import { parseAnsi } from "composerkit/components/markdown/ansi";
import type { AnsiSpan } from "composerkit/components/markdown/ansi";
import { cn } from "composerkit/lib/utils";
import type { CSSProperties } from "react";

/**
 * Colors of the `.ansi-*-fg` and `.ansi-*-bg` rules. Each is
 * `!important` and takes the Electron terminal token, which resolves to the
 * app foreground colors and the red, green, yellow, blue and purple accents.
 * The stylesheet defines the 8 normal colors for both, the 8 bright colors for
 * the foreground only, and nothing for 256-color palette entries, truecolor or
 * bright backgrounds; those classes are kept on the span and stay unstyled.
 */
const FOREGROUND: Record<string, string> = {
  "ansi-black": "text-(--ck-fixed-black)!",
  "ansi-blue": "text-(--ck-palette-accent-blue)!",
  "ansi-bright-black": "text-text-muted!",
  "ansi-bright-blue": "text-(--ck-palette-accent-blue)!",
  "ansi-bright-cyan": "text-(--ck-palette-accent-blue)!",
  "ansi-bright-green": "text-[var(--color-status-success)]!",
  "ansi-bright-magenta": "text-(--ck-palette-accent-purple)!",
  "ansi-bright-red": "text-[var(--color-status-danger)]!",
  "ansi-bright-white": "text-text!",
  "ansi-bright-yellow": "text-[var(--color-status-caution)]!",
  "ansi-cyan": "text-(--ck-palette-accent-blue)!",
  "ansi-green": "text-[var(--color-status-success)]!",
  "ansi-magenta": "text-(--ck-palette-accent-purple)!",
  "ansi-red": "text-[var(--color-status-danger)]!",
  "ansi-white": "text-(--ck-fixed-white)!",
  "ansi-yellow": "text-[var(--color-status-caution)]!",
};

const BACKGROUND: Record<string, string> = {
  "ansi-black": "bg-text-subtle!",
  "ansi-blue": "bg-(--ck-palette-accent-blue)!",
  "ansi-cyan": "bg-(--ck-palette-accent-blue)!",
  "ansi-green": "bg-[var(--color-status-success)]!",
  "ansi-magenta": "bg-(--ck-palette-accent-purple)!",
  "ansi-red": "bg-[var(--color-status-danger-solid)]!",
  "ansi-white": "bg-(--ck-fixed-white)!",
  "ansi-yellow": "bg-[var(--color-status-caution)]!",
};

/** The one decoration kept per span becomes inline style. */
const decorationStyle = (span: AnsiSpan): CSSProperties | undefined => {
  if (span.decoration === null) {
    return undefined;
  }

  switch (span.decoration) {
    case "bold": {
      return { fontWeight: "bold" };
    }

    case "dim": {
      return { opacity: "0.7" };
    }

    case "italic": {
      return { fontStyle: "italic" };
    }

    case "hidden": {
      return { visibility: "hidden" };
    }

    case "underline": {
      return { textDecorationLine: "underline" };
    }

    case "strikethrough": {
      return { textDecorationLine: "line-through" };
    }

    default: {
      return undefined;
    }
  }
};

export interface AnsiBlockProps {
  /** Terminal output with ANSI escape sequences. */
  children?: string | null;
  className?: string;
}

/**
 * Terminal output in a `<code>`.
 * Backspaces and carriage-return overwrites are applied, escape sequences are
 * stripped, and SGR color and decoration codes become classes and styles.
 */
export const AnsiBlock = ({ children, className }: AnsiBlockProps) => (
  <code className={className}>
    {parseAnsi(children).map((span, index) => (
      <span
        className={cn(
          span.fg !== null && `${span.fg}-fg`,
          span.bg !== null && `${span.bg}-bg`,
          span.fg !== null && FOREGROUND[span.fg],
          span.bg !== null && BACKGROUND[span.bg]
        )}
        // oxlint-disable-next-line react/no-array-index-key -- spans are positional output of one string.
        key={index}
        style={decorationStyle(span)}
      >
        {span.content}
      </span>
    ))}
  </code>
);
