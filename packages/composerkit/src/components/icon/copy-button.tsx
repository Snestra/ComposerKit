"use client";

import { CheckGlyph, CopyGlyph } from "composerkit/components/icon/glyphs";
import type { ButtonProps } from "composerkit/components/ui/button";
import { Button } from "composerkit/components/ui/button";
import { copyToClipboard } from "composerkit/lib/clipboard";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import styles from "./icon-swap.module.css";

/** How long the check stays before the copy icon returns. */
const COPIED_RESET_MS = 1300;

export interface CopyButtonProps extends Omit<ButtonProps, "children"> {
  children?: ReactNode;
  /** Writes the value. It defaults to the device clipboard write. */
  copy?: (value: string) => void;
  copyValue: () => string;
  CopyIcon?: typeof CopyGlyph;
}

/**
 * A button that swaps its copy icon for a check after a click. The incoming
 * icon scales from .6 to 1 over 300ms after a 150ms delay. The outgoing icon
 * scales back to .6 over 150ms. A click while the check shows does nothing.
 */
export const CopyButton = ({
  children,
  copy = copyToClipboard,
  copyValue,
  CopyIcon = CopyGlyph,
  onClick,
  ...props
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
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
    copy(copyValue());
    timer.current = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_RESET_MS);
  };

  return (
    <Button
      {...props}
      data-copied={copied ? "" : undefined}
      onClick={handleClick}
    >
      <span className={styles.swap}>
        <span
          aria-hidden
          className={styles.item}
          data-active={copied ? undefined : ""}
          data-icon="copy-icon"
        >
          <CopyIcon className="size-full" />
        </span>
        <span
          aria-hidden
          className={styles.item}
          data-active={copied ? "" : undefined}
          data-icon="copied-icon"
        >
          <CheckGlyph className="size-full" />
        </span>
      </span>
      {children}
    </Button>
  );
};
