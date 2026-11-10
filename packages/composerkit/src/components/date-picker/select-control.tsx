"use client";

import {
  DataButton,
  LoadingIndicator,
} from "composerkit/components/button/data-button";
import { mergeRefs } from "composerkit/components/dialog/dialog-layer";
import { cn } from "composerkit/lib/utils";
import {
  ChevronDown as LucideChevronDown,
  ChevronsUpDown as LucideChevronsUpDown,
  CircleX as LucideCircleX,
} from "lucide-react";
import { useRef } from "react";
import type {
  ComponentType,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  Ref,
  RefObject,
} from "react";

import styles from "./date-picker.module.css";

/*
 * The trigger the date picker renders: SelectControl. It is a span with role button. It opens on pointer down
 * (not the right button) and on ArrowDown, ArrowUp and Space, which dispatch a
 * pointer down; Enter does nothing. `onInteract` replaces that: a press (not
 * the right button) and those keys call it instead, and the press is
 * prevented. `loading` swaps the clear button and dropdown icon for a spinner,
 * sets aria-busy and turns the pointer and key handling off. `opticallyAlign`
 * moves the control out by its gutter at the start or end.
 */

export type SelectControlVariant = "ghost" | "outline" | "soft";

export type SelectControlSize =
  | "2xl"
  | "2xs"
  | "3xl"
  | "3xs"
  | "lg"
  | "md"
  | "sm"
  | "xl"
  | "xs";

export type DropdownIconType = "chevronDown" | "dropdown" | "none";

/** The pressed scale grows with the width. */
export const setPressableScale = (event: PointerEvent<HTMLElement>) => {
  const target = event.currentTarget;
  const { offsetWidth } = target;
  let ratio = 0.98;

  if (offsetWidth <= 80) {
    ratio = 0.95;
  } else if (offsetWidth <= 150) {
    ratio = 0.965;
  } else if (offsetWidth <= 220) {
    ratio = 0.975;
  } else if (offsetWidth > 600) {
    ratio = 0.99;
  }

  target.style.setProperty("--scale", String(ratio));
};

const ClearIcon = () => (
  <LucideCircleX
    aria-hidden="true"
    height="1em"
    width="1em"
    strokeWidth={1.5}
  />
);

const ChevronDownIcon = ({ className }: { className: string }) => (
  <LucideChevronDown
    aria-hidden="true"
    className={className}
    height="1em"
    width="1em"
    viewBox="4 7 16 10"
    strokeWidth={1.5}
  />
);

const UpDownIcon = ({ className }: { className: string }) => (
  <LucideChevronsUpDown
    aria-hidden="true"
    className={className}
    height="1em"
    width="1em"
    viewBox="5 2 14 20"
    strokeWidth={1.5}
  />
);

const DropdownIcon = ({ iconType }: { iconType: DropdownIconType }) =>
  iconType === "chevronDown" ? (
    <ChevronDownIcon
      className={cn(styles.dropdownIcon, styles.dropdownIconChevron)}
    />
  ) : (
    <UpDownIcon className={styles.dropdownIcon} />
  );

export interface SelectControlProps extends Omit<
  React.ComponentProps<"span">,
  "onClick" | "ref"
> {
  block?: boolean;
  children?: ReactNode;
  /** The label of the clear button. */
  clearLabel?: string;
  disabled?: boolean;
  disablePressable?: boolean;
  dropdownIconType?: DropdownIconType;
  invalid?: boolean;
  /** Shows a spinner in place of the indicators and ignores presses and keys. */
  loading?: boolean;
  /** Called by the trigger's press, as the `onClick` the component forwards. */
  onClick?: (event: PointerEvent<HTMLSpanElement>) => void;
  onClearClick?: () => void;
  /** Replaces the press and the open keys: they call this and nothing else. */
  onInteract?: () => void;
  /** Moves the control out by its gutter so its content lines up. */
  opticallyAlign?: "end" | "start";
  pill?: boolean;
  ref?: Ref<HTMLSpanElement>;
  selected?: boolean;
  size?: SelectControlSize;
  StartIcon?: ComponentType<{ className?: string }>;
  variant?: SelectControlVariant;
}

const flag = (on: boolean | undefined) => (on === true ? "" : undefined);

/**
 * A loading control shows only the
 * spinner and ignores presses; the clear button needs a selected value.
 */
const indicatorState = ({
  disabled,
  dropdownIconType,
  hasClear,
  loading,
  selected,
}: {
  disabled: boolean;
  dropdownIconType: DropdownIconType;
  hasClear: boolean;
  loading: boolean;
  selected: boolean;
}) => {
  const showClear = hasClear && selected && !loading && !disabled;
  const showDropdown = dropdownIconType !== "none" && !loading;

  return {
    interactive: !loading && !disabled,
    showClear,
    showDropdown,
    showIndicators: showClear || loading || showDropdown,
  };
};

interface OpenHandlersOptions {
  elementRef: RefObject<HTMLSpanElement | null>;
  onClick: SelectControlProps["onClick"];
  onInteract: SelectControlProps["onInteract"];
  onKeyDown: SelectControlProps["onKeyDown"];
  onPointerDown: SelectControlProps["onPointerDown"];
}

/**
 * The press and key handlers. A press (not the right button) calls
 * `onPointerDown` and `onClick`, or `onInteract` alone; ArrowDown, ArrowUp and
 * Space do the same through a dispatched pointer down; Enter does nothing.
 */
const useOpenHandlers = ({
  elementRef,
  onClick,
  onInteract,
  onKeyDown,
  onPointerDown,
}: OpenHandlersOptions) => {
  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button === 2) {
      return;
    }

    if (onInteract) {
      event.preventDefault();
      onInteract();
    } else {
      event.stopPropagation();
      onPointerDown?.(event);
      onClick?.(event);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
      case " ": {
        event.stopPropagation();
        event.preventDefault();

        if (onInteract) {
          onInteract();
        } else {
          elementRef.current?.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              pointerType: "mouse",
            })
          );
        }

        break;
      }

      case "Enter": {
        break;
      }

      default: {
        onKeyDown?.(event);
      }
    }
  };

  return { handleKeyDown, handlePointerDown };
};

interface IndicatorsProps {
  clearLabel: string;
  dropdownIconType: DropdownIconType;
  loading: boolean;
  /** Set when the clear button shows. */
  onClearClick: (() => void) | undefined;
  pill: boolean;
  showDropdown: boolean;
}

/** The clear button, the loading spinner and the dropdown icon. */
const Indicators = ({
  clearLabel,
  dropdownIconType,
  loading,
  onClearClick,
  pill,
  showDropdown,
}: IndicatorsProps) => (
  <div className={styles.indicatorWrapper}>
    {onClearClick === undefined ? null : (
      <DataButton
        aria-label={clearLabel}
        className={styles.clear}
        color="secondary"
        data-ck-only-child={showDropdown ? undefined : ""}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onClearClick();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onPointerEnter={setPressableScale}
        pill={pill}
        size="3xs"
        squircle={false}
        uniform
        variant={showDropdown ? "ghost" : "solid"}
      >
        <ClearIcon />
      </DataButton>
    )}
    {loading ? <LoadingIndicator className={styles.loadingIndicator} /> : null}
    {showDropdown ? <DropdownIcon iconType={dropdownIconType} /> : null}
  </div>
);

export const SelectControl = ({
  block,
  children,
  className,
  clearLabel = "Clear current value",
  disabled,
  disablePressable,
  dropdownIconType = "dropdown",
  invalid,
  loading = false,
  onClick,
  onClearClick,
  onInteract,
  onKeyDown,
  onPointerDown,
  onPointerEnter,
  opticallyAlign,
  pill = false,
  ref,
  selected = false,
  size = "md",
  StartIcon,
  variant = "outline",
  ...rest
}: SelectControlProps) => {
  const elementRef = useRef<HTMLSpanElement | null>(null);

  const { interactive, showClear, showDropdown, showIndicators } =
    indicatorState({
      disabled: disabled === true,
      dropdownIconType,
      hasClear: onClearClick !== undefined,
      loading,
      selected,
    });

  const { handleKeyDown, handlePointerDown } = useOpenHandlers({
    elementRef,
    onClick,
    onInteract,
    onKeyDown,
    onPointerDown,
  });

  return (
    <span
      aria-busy={loading ? "true" : undefined}
      aria-disabled={disabled}
      className={cn(styles.selectControl, className)}
      data-block={flag(block)}
      data-ck-disable-pressable={flag(disablePressable)}
      data-disabled={flag(disabled)}
      data-invalid={flag(invalid)}
      data-loading={flag(loading)}
      data-ck-optically-align={opticallyAlign}
      data-pill={flag(pill)}
      data-selected={selected}
      data-size={size}
      data-variant={variant}
      onKeyDown={interactive ? handleKeyDown : undefined}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerEnter={(event) => {
        if (disablePressable !== true) {
          setPressableScale(event);
        }

        onPointerEnter?.(event);
      }}
      ref={mergeRefs(elementRef, ref)}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the trigger is a span with role button because it holds the clear button, and a button cannot contain a button
      role="button"
      tabIndex={disabled === true ? -1 : 0}
      {...rest}
    >
      {StartIcon ? <StartIcon className={styles.startIcon} /> : null}
      <span className={styles.triggerText}>{children}</span>
      {showIndicators ? (
        <Indicators
          clearLabel={clearLabel}
          dropdownIconType={dropdownIconType}
          loading={loading}
          onClearClick={showClear ? onClearClick : undefined}
          pill={pill}
          showDropdown={showDropdown}
        />
      ) : null}
    </span>
  );
};
