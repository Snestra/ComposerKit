"use client";

import { Xmark16Icon } from "composerkit/components/composer/icons";
import {
  ArrowLeft16Icon,
  ArrowUp16Icon,
  MagnifyingGlass16Icon,
} from "composerkit/components/toolbar/icons";
import { Button } from "composerkit/components/ui/button";
import type {
  ButtonColor,
  ButtonRadius,
} from "composerkit/components/ui/button";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import { useEffect, useId, useRef } from "react";
import type {
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  Ref,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

/*
 * Toolbar family:
 *   ToolbarRow
 *   Toolbar
 *   BackForwardButtons
 *   FindBar,
 *   CloudSettingsToolbar
 *   ToolbarSizeControl
 *
 * Utilities resolve to this library's Electron theme tokens
 * (ui/app/globals.css): text-default is text-text, text-description is
 * text-token-description-foreground, border-default and bg-border are
 * --color-border, border-primary-outline is border-stroke-strong and
 * text-secondary is text-text-muted. `cursor-interaction` is `default` on
 * the Electron window. The toolbar spacing tokens carry the Electron theme
 * values: --ck-compose-button-spacing is 7
 * spacing steps and --ck-toolbar-button-spacing-inline is 2.
 */

/* ------------------------------------------------------------------ */
/* ToolbarRow                                                          */
/* ------------------------------------------------------------------ */

export type ToolbarRowProps = ComponentProps<"div">;

/** The toolbar row: a div merged with the caller's className. */
export const ToolbarRow = ({ className, ...props }: ToolbarRowProps) => (
  <div
    className={cn(
      "flex h-full min-w-0 items-center gap-1 px-2 text-token-description-foreground",
      className
    )}
    {...props}
  />
);

/* ------------------------------------------------------------------ */
/* Toolbar pill                                                        */
/* ------------------------------------------------------------------ */

export type ToolbarVariant = "compact" | "embedded" | "imageTools" | "playback";

export interface ToolbarProps {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  variant?: ToolbarVariant;
}

const COMPACT_CHROME =
  "gap-0.5 bg-panel-tertiary/95 shadow-md ring-1 ring-stroke-subtle backdrop-blur-sm";

const BORDERED_CHROME = "border border-border bg-panel-elevated";

/**
 * The toolbar pill. `ariaLabel` makes it
 * `role="toolbar"`, or `role="group"` for the embedded variant, which has no
 * chrome and ignores `className`.
 */
export const Toolbar = ({
  ariaLabel,
  children,
  className,
  variant = "compact",
}: ToolbarProps) => {
  if (variant === "embedded") {
    return (
      <div
        aria-label={ariaLabel}
        className="flex min-w-0 items-center"
        role={ariaLabel === undefined ? undefined : "group"}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex w-fit max-w-full items-center overflow-hidden rounded-full p-0.5 select-none",
        variant === "compact" ? COMPACT_CHROME : BORDERED_CHROME,
        variant === "imageTools" && "gap-0 shadow-md",
        variant === "playback" && "gap-2 shadow-sm",
        className
      )}
      role={ariaLabel === undefined ? undefined : "toolbar"}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Back and forward buttons                                            */
/* ------------------------------------------------------------------ */

export interface BackForwardButtonsProps {
  backLabel: string;
  canGoBack: boolean;
  canGoForward: boolean;
  color?: ButtonColor;
  forwardLabel: string;
  onBack: () => void;
  onForward: () => void;
  radius?: ButtonRadius;
}

/**
 * Back and forward: uniform toolbar
 * size icon buttons, each in a bottom tooltip showing its label. A direction
 * that is unavailable is disabled and ghost coloured.
 */
export const BackForwardButtons = ({
  backLabel,
  canGoBack,
  canGoForward,
  color = "ghost",
  forwardLabel,
  onBack,
  onForward,
  radius,
}: BackForwardButtonsProps) => (
  <>
    <TooltipHint content={backLabel} side="bottom">
      <Button
        aria-label={backLabel}
        color={canGoBack ? color : "ghost"}
        disabled={!canGoBack}
        onClick={onBack}
        radius={radius}
        size="toolbar"
        uniform
      >
        <ArrowLeft16Icon />
      </Button>
    </TooltipHint>
    <TooltipHint content={forwardLabel} side="bottom">
      <Button
        aria-label={forwardLabel}
        color={canGoForward ? color : "ghost"}
        disabled={!canGoForward}
        onClick={onForward}
        radius={radius}
        size="toolbar"
        uniform
      >
        <ArrowLeft16Icon className="-scale-x-100 transform" />
      </Button>
    </TooltipHint>
  </>
);

/* ------------------------------------------------------------------ */
/* Find keyboard helper                                                */
/* ------------------------------------------------------------------ */

export interface FindKeyboardOptions {
  enabled: boolean;
  onClose: () => void;
  onNext: () => void;
  onOpen: () => void;
  onPrevious: () => void;
  open: boolean;
}

interface FindKeyEvent {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  preventDefault: () => void;
  shiftKey: boolean;
  stopPropagation: () => void;
}

/**
 * The shared find-keyboard helper: Ctrl or Meta+F opens,
 * Ctrl or Meta+G goes to the next result (previous with Shift) while open, and
 * Escape closes while open. Alt disables it. Returns whether it handled the key.
 */
export const handleFindKeyboard = (
  event: FindKeyEvent,
  options: FindKeyboardOptions
) => {
  if (!options.enabled || event.altKey) {
    return false;
  }

  const modifier = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();
  let action: (() => void) | null = null;

  if (modifier && key === "f") {
    action = options.onOpen;
  } else if (modifier && key === "g" && options.open) {
    action = event.shiftKey ? options.onPrevious : options.onNext;
  } else if (event.key === "Escape" && options.open) {
    action = options.onClose;
  }

  if (!action) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  action();

  return true;
};

/* ------------------------------------------------------------------ */
/* FindBar                                                             */
/* ------------------------------------------------------------------ */

export type FindBarSearchTarget = "file" | "sheet";

// Message defaults from artifact-find-bar and the thread find bar
// (thread find bar and artifact viewer find).
const FIND_LABELS = {
  file: { label: "Find in file", placeholder: "Find in file…" },
  sheet: { label: "Find in sheet", placeholder: "Find in sheet…" },
} as const;

const PREVIOUS_RESULT_LABEL = "Previous result";
const NEXT_RESULT_LABEL = "Next result";
const CLOSE_FIND_LABEL = "Close find";

export interface FindBarProps {
  activeResultIndex: number;
  /** Focuses and selects the input again whenever it changes. */
  focusToken?: number | string;
  onClose: () => void;
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  onQueryChange: (query: string) => void;
  open: boolean;
  query: string;
  resultCount: number;
  searchTarget?: FindBarSearchTarget;
}

interface FindInputProps {
  id: string;
  label: string;
  onChange: (value: string) => void;
  onEnter: (shiftKey: boolean) => void;
  onEscape: () => void;
  placeholder: string;
  ref: Ref<HTMLInputElement>;
  value: string;
}

// The find bar input: Enter and Escape are ignored while an
// IME composition is active.
const FindInput = ({
  id,
  label,
  onChange,
  onEnter,
  onEscape,
  placeholder,
  ref,
  value,
}: FindInputProps) => {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const isEnterOrEscape = event.key === "Enter" || event.key === "Escape";

    // keyCode 229 marks an IME composition in browsers that omit isComposing.
    const { isComposing, keyCode } = event.nativeEvent; // oxlint-disable-line typescript/no-deprecated
    const composing = isComposing || keyCode === 229;

    if (isEnterOrEscape && composing) {
      event.stopPropagation();
    } else if (event.key === "Enter") {
      event.preventDefault();
      onEnter(event.shiftKey);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
    }
  };

  return (
    <div className="col-[1/2] row-[1] flex h-[44px] min-w-0 items-center gap-2 ps-4">
      <MagnifyingGlass16Icon className="text-text" />
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        aria-label={label}
        autoFocus
        className="h-6 min-w-0 flex-1 bg-transparent text-base leading-6 text-text outline-none placeholder:text-text-subtle"
        data-ui-search-field
        id={id}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={ref}
        type="text"
        value={value}
      />
    </div>
  );
};

const NAVIGATION_VISIBLE = "max-h-9 translate-y-0 border-t py-2 opacity-100";

const NAVIGATION_HIDDEN =
  "pointer-events-none max-h-0 -translate-y-2 border-t-0 py-0 opacity-0";

const COUNTER_VISIBLE = "max-h-9 translate-y-0 py-2 opacity-100";

const COUNTER_HIDDEN = "max-h-0 -translate-y-2 py-0 opacity-0";

// Previous and next result buttons, disabled with no matches.
const FindNavigation = ({
  isVisible,
  matches,
  onNext,
  onPrevious,
}: {
  isVisible: boolean;
  matches: number;
  onNext: () => void;
  onPrevious: () => void;
}) => (
  <div
    className={cn(
      "col-[1/4] row-[2] flex min-w-0 items-center border-border px-4 text-base leading-6 transition-[border-width,max-height,opacity,padding,translate] duration-(--motion-duration-fast) ease-out",
      isVisible ? NAVIGATION_VISIBLE : NAVIGATION_HIDDEN
    )}
  >
    <div className="flex items-center gap-3">
      <Button
        aria-label={PREVIOUS_RESULT_LABEL}
        className="h-4 w-4 p-0 text-token-description-foreground"
        color="ghost"
        disabled={matches === 0}
        onClick={onPrevious}
        size="icon"
        uniform
      >
        <ArrowUp16Icon />
      </Button>
      <Button
        aria-label={NEXT_RESULT_LABEL}
        className="h-4 w-4 p-0 text-token-description-foreground"
        color="ghost"
        disabled={matches === 0}
        onClick={onNext}
        size="icon"
        uniform
      >
        <ArrowUp16Icon className="rotate-180" />
      </Button>
    </div>
  </div>
);

// The result counter.
const FindCounter = ({
  isVisible,
  label,
}: {
  isVisible: boolean;
  label: string;
}) => (
  <span
    className={cn(
      "pointer-events-none col-[1/4] row-[2] min-w-0 px-4 text-end text-base leading-6 text-token-description-foreground transition-[max-height,opacity,padding,translate] duration-(--motion-duration-fast) ease-out",
      isVisible ? COUNTER_VISIBLE : COUNTER_HIDDEN
    )}
  >
    {label}
  </span>
);

// The close button with its divider.
const FindClose = ({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) => (
  <div className="col-[3/4] row-[1] flex h-[44px] items-center pe-4">
    <div className="ms-2 me-2 h-4 w-px bg-border" />
    <Button
      aria-label={label}
      className="-m-0.5 size-6"
      color="ghost"
      onClick={onClose}
      size="icon"
      uniform
    >
      <Xmark16Icon className="text-text" />
    </Button>
  </div>
);

/**
 * The artifact find bar. It renders only while open.
 * Opening, or a new `focusToken`, focuses the input and selects its text.
 * Escape closes and returns focus to the surrounding
 * `[data-ck-artifact-search-surface]`.
 */
export const FindBar = ({
  activeResultIndex,
  focusToken,
  onClose,
  onNavigateNext,
  onNavigatePrevious,
  onQueryChange,
  open,
  query,
  resultCount,
  searchTarget = "file",
}: FindBarProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  // A new focus request: opening, or a changed focusToken while open.
  const focusRequest = open ? String(focusToken) : null;

  useEffect(() => {
    if (focusRequest !== null) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [focusRequest]);

  if (!open) {
    return null;
  }

  const closeAndRestoreFocus = () => {
    const surface = inputRef.current?.closest<HTMLElement>(
      "[data-ck-artifact-search-surface]"
    );

    onClose();
    surface?.focus({ preventScroll: true });
  };

  const hasQuery = query.length > 0;
  const activeResult = resultCount === 0 ? 0 : activeResultIndex + 1;
  const { label, placeholder } = FIND_LABELS[searchTarget];

  return (
    // The wrapper handles the find shortcuts for every control inside it.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className={cn(
        "pointer-events-none absolute end-3 z-40 max-w-full select-none",
        searchTarget === "sheet" ? "top-3" : "top-16"
      )}
      data-testid="artifact-find-bar"
      // The component sets the role attribute on a div; the search element is not used so older engines keep the landmark.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="search"
      onKeyDown={(event) => {
        event.stopPropagation();
        handleFindKeyboard(event, {
          enabled: true,
          onClose: closeAndRestoreFocus,
          onNext: onNavigateNext,
          onOpen: focusInput,
          onPrevious: onNavigatePrevious,
          open,
        });
      }}
    >
      <div className="pointer-events-auto grid w-[340px] max-w-full grid-cols-[minmax(0,1fr)_auto_auto] overflow-hidden rounded-[20px] border-[0.5px] border-border bg-panel-secondary shadow-(--shadow-toolbar) [-webkit-app-region:no-drag]">
        <FindInput
          id={inputId}
          label={label}
          onChange={onQueryChange}
          onEnter={(previous) => {
            if (previous) {
              onNavigatePrevious();
            } else {
              onNavigateNext();
            }
          }}
          onEscape={closeAndRestoreFocus}
          placeholder={placeholder}
          ref={inputRef}
          value={query}
        />
        <FindNavigation
          isVisible={hasQuery}
          matches={resultCount}
          onNext={onNavigateNext}
          onPrevious={onNavigatePrevious}
        />
        <FindCounter
          isVisible={hasQuery}
          label={`${activeResult} / ${resultCount} results`}
        />
        <FindClose label={CLOSE_FIND_LABEL} onClose={closeAndRestoreFocus} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Toolbar search field and CloudSettingsToolbar                       */
/* ------------------------------------------------------------------ */

const CLEAR_SEARCH_LABEL = "Clear search";

export interface ToolbarSearchProps {
  autoFocus?: boolean;
  clearLabel?: string;
  inputId: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  label: string;
  onSearchQueryChange: (query: string) => void;
  placeholder?: string;
  searchQuery: string;
}

/**
 * The page search field in its `toolbar-action` variant:
 * a rounded-full bordered field as tall as a composer button, with a search
 * icon, a screen-reader label and a clear button while it has text.
 */
export const ToolbarSearch = ({
  autoFocus,
  clearLabel,
  inputId,
  inputRef,
  label,
  onSearchQueryChange,
  placeholder,
  searchQuery,
  className,
}: ToolbarSearchProps & { className?: string }) => {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const resolvedRef = inputRef ?? fallbackRef;

  return (
    <div
      className={cn(
        "flex h-(--ck-compose-button-spacing) items-center gap-2 rounded-full border border-stroke-strong bg-transparent px-3 py-0 text-sm leading-5 [-webkit-app-region:no-drag]",
        className
      )}
    >
      <span className="flex shrink-0 items-center justify-center text-text-muted">
        <MagnifyingGlass16Icon />
      </span>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <input
        autoComplete="off"
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-text outline-none select-text placeholder:text-text-subtle [&::placeholder]:select-none"
        id={inputId}
        onChange={(event) => {
          onSearchQueryChange(event.target.value);
        }}
        placeholder={placeholder}
        ref={resolvedRef}
        type="text"
        value={searchQuery}
      />
      {searchQuery.length > 0 && (
        <button
          aria-label={clearLabel ?? CLEAR_SEARCH_LABEL}
          className="flex shrink-0 cursor-default items-center justify-center text-text-muted hover:text-text"
          onClick={() => {
            resolvedRef.current?.focus();
            onSearchQueryChange("");
          }}
          type="button"
        >
          <Xmark16Icon />
        </button>
      )}
    </div>
  );
};

export type CloudSettingsToolbarLayout = "tabs" | "wrap";

export interface CloudSettingsToolbarProps {
  children?: ReactNode;
  layout?: CloudSettingsToolbarLayout;
  navigation?: ReactNode;
  search?: ToolbarSearchProps;
}

/**
 * The cloud settings toolbar. `wrap` puts the
 * navigation and a right-aligned wrapping cluster of search and actions on one
 * flex row. `tabs` is an @container grid that places navigation and the
 * cluster side by side from @2xl.
 */
export const CloudSettingsToolbar = ({
  children,
  layout = "wrap",
  navigation,
  search,
}: CloudSettingsToolbarProps) => {
  const searchField =
    search === undefined ? null : (
      <ToolbarSearch
        {...search}
        className={
          layout === "tabs"
            ? "w-full max-w-full @md:w-40 @md:justify-self-end"
            : "w-40 max-w-full"
        }
      />
    );

  const hasCluster = search !== undefined || children !== undefined;

  if (layout === "tabs") {
    return (
      <div className="@container">
        <div className="grid items-start gap-4 pb-2 @2xl:grid-cols-[auto_minmax(0,1fr)]">
          {navigation}
          {hasCluster ? (
            <div className="grid min-w-0 items-center gap-2 @md:grid-cols-[minmax(0,1fr)_auto]">
              {searchField}
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {children}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // A searchable page toolbar without an inset and with wrapping.
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
      {navigation}
      {hasCluster ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {searchField}
          {children}
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Floating size control                                               */
/* ------------------------------------------------------------------ */

export interface ToolbarSizeControlProps {
  children?: ReactNode;
  /** Portals the control into this element instead of placing it absolutely. */
  container?: Element | null;
  ref?: Ref<HTMLDivElement>;
  /** Written to the `zoom` style of the absolutely placed control. */
  zoom?: number | string;
}

/**
 * The floating size control host. Without a
 * container it sits at the start toolbar inset, 50% from the top, z-30, with
 * pointer events off and an interactive inner toolbar pill. With a container
 * it portals there and sets no position or zoom.
 */
export const ToolbarSizeControl = ({
  children,
  container,
  ref,
  zoom,
}: ToolbarSizeControlProps) => {
  const floating = container === undefined || container === null;

  const control = (
    <div
      className={cn(
        "pointer-events-none",
        floating &&
          "absolute start-(--ck-toolbar-button-spacing-inline) top-1/2 z-30 -translate-y-1/2"
      )}
      data-ck-annotation-control=""
      ref={ref}
      // The component passes `zoom` as an inline style on the floating control.
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={floating ? { zoom } : undefined}
    >
      <Toolbar className="pointer-events-auto">{children}</Toolbar>
    </div>
  );

  return floating ? control : createPortal(control, container);
};
