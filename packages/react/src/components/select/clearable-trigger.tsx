"use client";

import { CloseIcon } from "@workspace/react/components/icon";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { useState } from "react";
import type { ReactNode } from "react";

import styles from "./select.module.css";

export interface ClearableSelectorTriggerProps {
  children?: ReactNode;
  clearLabel: string;
  disabled?: boolean;
  menuOpen?: boolean;
  onClear?: () => void;
  /** Hover keeps the wrapper transparent. */
  subtleHover?: boolean;
}

/**
 * The wrapper around a selector trigger. It is a
 * pill only while `onClear` exists. The clear button appears at the inline
 * start while the wrapper is hovered or the button has focus, and only when
 * the control is enabled, its menu is closed and the pointer is not pressing
 * inside the wrapper (a press on the clear button itself does not count).
 */
export const ClearableSelectorTrigger = ({
  children,
  clearLabel,
  disabled = false,
  menuOpen = false,
  onClear,
  subtleHover = false,
}: ClearableSelectorTriggerProps) => {
  const [pressed, setPressed] = useState(false);
  const available = onClear !== undefined && !disabled && !menuOpen && !pressed;

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The wrapper only tracks the pointer; the controls inside take the keys.
    <div
      className={onClear === undefined ? "contents" : styles.clearable}
      data-ck-clear-selector-available={available ? "" : undefined}
      data-ck-subtle-hover={subtleHover ? "" : undefined}
      onPointerDownCapture={(event) => {
        if (
          !(
            event.target instanceof Element &&
            event.target.closest("[data-ck-clear-selector-button]") !== null
          )
        ) {
          setPressed(true);
        }
      }}
      onPointerEnter={() => {
        setPressed(false);
      }}
      onPointerLeave={() => {
        setPressed(false);
      }}
    >
      {children}
      {onClear === undefined ? null : (
        <TooltipHint content={clearLabel} disabled={!available}>
          <button
            aria-label={clearLabel}
            className={styles.clearButton}
            data-ck-clear-selector-button
            disabled={!available}
            onClick={onClear}
            tabIndex={-1}
            type="button"
          >
            <CloseIcon aria-hidden="true" className="size-4" />
          </button>
        </TooltipHint>
      )}
    </div>
  );
};
