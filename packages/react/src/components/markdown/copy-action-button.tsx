"use client";

/* oxlint-disable promise/always-return, promise/catch-or-return, promise/prefer-catch, typescript/no-invalid-void-type -- The handler may return nothing or a promise of the result, as the onCopy does. */

/* oxlint-disable typescript/consistent-return -- Effects return a cleanup only when they registered something. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional flags by truthiness. */

import {
  ChatCodeCheckIcon,
  ChatCodeCopyIcon,
} from "@workspace/react/components/markdown/chat-code-icons";
import { Button } from "@workspace/react/components/ui/button";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEventHandler, MouseEvent } from "react";

const COPIED_RESET_MS = 2000;

const VARIANT_PROPS = {
  blockAction: { color: "blockAction", radius: "full", size: "inputIcon" },
  messageAction: { color: "ghost", size: "icon" },
  toolbar: { color: "ghostActive", size: "imageToolbar", uniform: true },
} as const;

export interface CopyActionButtonProps {
  /** Accessible label and tooltip. Pressed state reads "Copied". */
  label: string;
  /**
   * Runs the copy. A promise keeps the button busy until it settles. A result
   * of `false` (or a rejection) shows no check mark.
   */
  onCopy: (
    event: MouseEvent<HTMLButtonElement>
  ) => boolean | Promise<boolean> | undefined | void;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  /**
   * `toolbar` is a ghost image-toolbar button, `blockAction` a round block action,
   * `messageAction` the 26px ghost button under a chat message.
   */
  variant: "blockAction" | "messageAction" | "toolbar";
}

/**
 * The copy button as an icon-only button: the click stops
 * propagation, ignores presses while busy or while "Copied" shows, marks the
 * button `aria-busy` while a promise runs and swaps the glyph for a check for
 * two seconds after a successful copy.
 */
export const CopyActionButton = ({
  label,
  onCopy,
  onKeyDown,
  variant,
}: CopyActionButtonProps) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    []
  );

  const settle = (ok: boolean) => {
    pending.current = false;
    setBusy(false);

    if (ok) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        setCopied(false);
      }, COPIED_RESET_MS);
    }
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (pending.current || copied) {
      return;
    }

    const result = onCopy(event);

    if (result instanceof Promise) {
      pending.current = true;
      setBusy(true);
      result.then(
        (ok) => {
          settle(ok);
        },
        () => {
          settle(false);
        }
      );
    } else {
      settle(result !== false);
    }
  };

  const ariaLabel = copied ? "Copied" : label;
  const Icon = copied ? ChatCodeCheckIcon : ChatCodeCopyIcon;

  return (
    <TooltipHint cloneCustomTrigger content={ariaLabel}>
      <Button
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        aria-label={ariaLabel}
        {...VARIANT_PROPS[variant]}
        onClick={handleClick}
        onKeyDown={onKeyDown}
      >
        <Icon className={variant === "messageAction" ? "icon-xs" : "size-4"} />
      </Button>
    </TooltipHint>
  );
};
