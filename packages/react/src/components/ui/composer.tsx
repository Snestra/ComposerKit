"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role, typescript/no-deprecated, shadcn/no-inline-styles -- The component renders role=status on a span, checks keyCode 229 for IME composition and passes the surface style inline. */

import { useComposerFeatureGate } from "@workspace/react/components/composer/feature-gates";
import {
  ComposerSendIcon,
  ComposerStopIcon,
  ComposerVoiceIcon,
} from "@workspace/react/components/composer/icons";
import {
  useKeyCommand,
  useKeyCommandDispatch,
} from "@workspace/react/components/composer/key-commands";
import type { ComposerMorphState } from "@workspace/react/components/composer/morph-geometry";
import { ComposerMorphIcon } from "@workspace/react/components/composer/submit-morph";
import { Button, Spinner } from "@workspace/react/components/ui/button";
import {
  CommentComposer,
  SubmitButton,
} from "@workspace/react/components/ui/card";
import { mergeRefs } from "@workspace/react/components/ui/menu";
import { bindDecorativeAnimationVisibility } from "@workspace/react/components/ui/progress";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  ComponentProps,
  ComponentType,
  CSSProperties,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  Ref,
} from "react";

import styles from "@workspace/react/components/composer/composer.module.css";

/*
 * The composer family: the inline composer, the plain-text comment composer
 * with its surface, the round submit button, the working-status shimmer, the
 * replacement context and the keyboard rules. The main rich editor is the
 * ProseMirror engine in components/composer/editor.
 */

/* ---------------------------------------------------------------- view-only flag */

/**
 * True when the workspace is view-only.
 * The inline composer then renders its content `inert` and disables submit.
 * Without a provider the flag is false, the store default.
 */
const ComposerViewOnlyContext = createContext(false);

const useComposerViewOnly = () => useContext(ComposerViewOnlyContext);

/* ---------------------------------------------------------------- replacement */

interface ComposerReplacementStore {
  add: (entry: symbol) => void;
  delete: (entry: symbol) => void;
  getSnapshot: () => boolean;
  subscribe: (listener: () => void) => () => void;
}

/**
 * The app-level set of registered replacements and its derived "any entry"
 * flag s.
 */
const createComposerReplacementStore = (): ComposerReplacementStore => {
  let entries = new Set<symbol>();
  const listeners = new Set<() => void>();
  let replaced = false;

  const publish = () => {
    const next = entries.size > 0;

    if (next === replaced) {
      return;
    }

    replaced = next;

    for (const listener of listeners) {
      listener();
    }
  };

  return {
    add: (entry) => {
      entries = new Set([...entries, entry]);
      publish();
    },
    delete: (entry) => {
      if (!entries.has(entry)) {
        return;
      }

      const next = new Set(entries);
      next.delete(entry);
      entries = next;
      publish();
    },
    getSnapshot: () => replaced,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const defaultReplacementStore = createComposerReplacementStore();

/** The scope the provider reads; the default is the app-wide store. */
const ComposerReplacementScopeContext = createContext(defaultReplacementStore);

/** `false` when a provider is inactive, the store when it is active, undefined without a provider. */
const ComposerReplacementContext = createContext<
  ComposerReplacementStore | false | undefined
>(undefined);

interface ComposerReplacementProviderProps {
  children?: ReactNode;
  isActive?: boolean;
}

/** Supplies the store when `isActive` is true, else false. */
const ComposerReplacementProvider = ({
  children,
  isActive,
}: ComposerReplacementProviderProps) => {
  const store = useContext(ComposerReplacementScopeContext);

  return (
    <ComposerReplacementContext.Provider
      value={isActive === true ? store : false}
    >
      {children}
    </ComposerReplacementContext.Provider>
  );
};

interface ComposerReplacementConsumerProps {
  children: (isReplaceable: boolean) => ReactNode;
}

/**
 * Registers a unique symbol in the store in a layout effect (when a
 * provider supplies one), removes it on unmount and calls `children` with
 * false only when a provider is inactive. Without a provider it is true.
 */
const ComposerReplacementConsumer = ({
  children,
}: ComposerReplacementConsumerProps) => {
  const store = useContext(ComposerReplacementContext);

  useLayoutEffect(() => {
    const entry = Symbol("composer-replacement");
    const registry = store === false ? undefined : store;
    registry?.add(entry);

    return () => {
      registry?.delete(entry);
    };
  }, [store]);

  return <>{children(store !== false)}</>;
};

/** True while any consumer is registered. */
const useIsComposerReplaced = (
  store: ComposerReplacementStore = defaultReplacementStore
) => useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);

/* ---------------------------------------------------------------- shortcuts */

type SubmitShortcutPreference = "cmdAlways" | "cmdIfMultiline" | "enter";

/** The submit shortcut label for a preference. */
const composerSubmitShortcut = (preference: SubmitShortcutPreference) =>
  preference === "enter" ? "CmdOrCtrl+Enter" : "CmdOrCtrl+Shift+Enter";

type FollowUpType = string;

interface StopFromEscapeState {
  canStopFromEscape: boolean;
  followUpType: FollowUpType;
  hasActiveMentionMenu: boolean;
  isResponseInProgress: boolean;
}

/** Escape may stop a local or cloud turn in progress. */
const canStopTurnFromEscape = ({
  canStopFromEscape,
  followUpType,
  hasActiveMentionMenu,
  isResponseInProgress,
}: StopFromEscapeState) =>
  (followUpType === "local" || followUpType === "cloud") &&
  isResponseInProgress &&
  canStopFromEscape &&
  !hasActiveMentionMenu;

type ComposerEscapeAction =
  | "close-reply-chain"
  | "close-template-picker"
  | "confirm-stop-turn"
  | "focus-composer"
  | "stop-dictation"
  | "stop-realtime-session"
  | "stop-turn"
  | null;

interface ComposerEscapeState extends StopFromEscapeState {
  hasActiveApprovalSurface: boolean;
  hasActiveReplyChain: boolean;
  hasActiveTemplatePicker: boolean;
  hasFocusedComposer: boolean;
  isDictating: boolean;
  isStopTurnConfirmationVisible: boolean;
  isTerminalTarget: boolean;
  realtimeSessionPhase?: string | null;
}

/** What Escape does, in priority order. */
const resolveComposerEscape = (
  state: ComposerEscapeState
): ComposerEscapeAction => {
  if (state.isDictating) {
    return "stop-dictation";
  }

  if (
    state.realtimeSessionPhase === "starting" ||
    state.realtimeSessionPhase === "active"
  ) {
    return "stop-realtime-session";
  }

  if (state.hasActiveTemplatePicker) {
    return "close-template-picker";
  }

  if (state.isTerminalTarget || state.hasActiveApprovalSurface) {
    return null;
  }

  if (state.hasActiveReplyChain && !state.hasActiveMentionMenu) {
    return "close-reply-chain";
  }

  if (canStopTurnFromEscape(state)) {
    return state.isStopTurnConfirmationVisible
      ? "stop-turn"
      : "confirm-stop-turn";
  }

  return state.hasFocusedComposer ? null : "focus-composer";
};

type SelectedMode = "default" | "plan" | null;

interface CyclePlanModeState {
  hasDefaultMode: boolean;
  hasPlanMode: boolean;
  isPlanMode: boolean;
  setSelectedMode: (mode: SelectedMode) => void;
}

/** Toggles plan mode; false when there is no plan mode. */
const cyclePlanMode = ({
  hasDefaultMode,
  hasPlanMode,
  isPlanMode,
  setSelectedMode,
}: CyclePlanModeState) => {
  if (!hasPlanMode) {
    return false;
  }

  if (!isPlanMode) {
    setSelectedMode("plan");

    return true;
  }

  setSelectedMode(hasDefaultMode ? "default" : null);

  return true;
};

interface ComposerShortcutKeyState {
  event: Pick<
    KeyboardEvent,
    | "altKey"
    | "ctrlKey"
    | "key"
    | "metaKey"
    | "preventDefault"
    | "shiftKey"
    | "stopPropagation"
  >;
  handleEscape: () => void;
  hasActiveMentionMenu: boolean;
  hasDefaultMode: boolean;
  isComposerFocused: boolean;
  isPlanMode: boolean;
  isSelectionAtStart: boolean;
  setSelectedMode: (mode: SelectedMode) => void;
}

/**
 * Backspace at the selection start in plan mode leaves
 * plan mode, and an unmodified Escape without a mention menu runs the escape
 * handler. Both stop the event; the result says whether the key was handled.
 */
const handleComposerShortcutKey = ({
  event,
  handleEscape,
  hasActiveMentionMenu,
  hasDefaultMode,
  isComposerFocused,
  isPlanMode,
  isSelectionAtStart,
  setSelectedMode,
}: ComposerShortcutKeyState) => {
  if (!isComposerFocused) {
    return false;
  }

  const unmodified =
    !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;

  if (
    event.key === "Backspace" &&
    unmodified &&
    isPlanMode &&
    isSelectionAtStart
  ) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedMode(hasDefaultMode ? "default" : null);

    return true;
  }

  if (event.key === "Escape" && unmodified && !hasActiveMentionMenu) {
    event.preventDefault();
    event.stopPropagation();
    handleEscape();

    return true;
  }

  return false;
};

/* ---------------------------------------------------------------- working shimmer */

const noCleanup = () => {
  // There is nothing to undo when the element is missing.
};

const SHIMMER_DURATION_MS = 900;
const SHIMMER_INTERVAL_MS = 4200;
const SHIMMER_START_DELAY_MS = 550;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Whether cadenced shimmers run at all. Defaults to true. */
const CadencedShimmerContext = createContext(true);

interface CadencedShimmerProps extends ComponentProps<"span"> {
  /** Whether the shimmer runs, default true. False renders a plain span. */
  active?: boolean;
}

const CadencedShimmerRunner = ({
  children,
  className,
  ref: forwardedRef,
  ...props
}: Omit<CadencedShimmerProps, "active">) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return noCleanup;
    }

    const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const root = document.documentElement;
    let activeTimer: number | undefined;
    let startTimer: number | undefined;
    let interval: number | undefined;
    let visible = false;
    let started = false;

    const clearActive = () => {
      if (activeTimer !== undefined) {
        window.clearTimeout(activeTimer);
        activeTimer = undefined;
      }
    };

    const pulse = () => {
      clearActive();
      element.classList.remove(styles.shimmerActive);
      element.classList.add(styles.shimmerActive);
      activeTimer = window.setTimeout(() => {
        element.classList.remove(styles.shimmerActive);
        activeTimer = undefined;
      }, SHIMMER_DURATION_MS);
    };

    const stop = () => {
      // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
      started = false;
      clearActive();
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
      element.classList.remove(styles.shimmerActive);
    };

    const update = () => {
      const attribute = root.dataset.ckReducedMotion;

      const reduced =
        attribute === undefined ? query?.matches : attribute === "true";

      const shouldRun = visible && !document.hidden && !reduced;

      if (shouldRun === started) {
        return;
      }

      if (!shouldRun) {
        stop();

        return;
      }

      started = true;
      startTimer = window.setTimeout(() => {
        pulse();
        interval = window.setInterval(pulse, SHIMMER_INTERVAL_MS);
      }, SHIMMER_START_DELAY_MS);
    };

    const unbind = bindDecorativeAnimationVisibility(element, (isVisible) => {
      visible = isVisible;
      update();
    });

    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributeFilter: ["data-ck-reduced-motion"],
      attributes: true,
    });
    query?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      unbind();
      observer.disconnect();
      query?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      stop();
    };
  }, []);

  return (
    <span
      {...props}
      ref={mergeRefs(ref, forwardedRef)}
      className={cn(
        "relative inline-block align-top",
        styles.shimmer,
        className
      )}
    >
      {children}
      <span aria-hidden="true" className={styles.shimmerSweep}>
        <span className={styles.shimmerHighlight}>{children}</span>
      </span>
    </span>
  );
};

/**
 * A text status with a sweep that runs for 1s every 4s (after a
 * 600ms delay) while it is on screen, the page is visible and reduced motion
 * is off. Inactive, or outside an enabled context, it is a plain span.
 */
const CadencedShimmer = ({ active = true, ...props }: CadencedShimmerProps) => {
  const enabled = useContext(CadencedShimmerContext);

  if (!(active && enabled)) {
    return <span {...props} />;
  }

  return <CadencedShimmerRunner {...props} />;
};

/* ---------------------------------------------------------------- submit button */

type ComposerIconComponent = ComponentType<{ className?: string }>;

type ComposerSubmitButtonVariant = "default" | "voiceEnd";

const SUBMIT_VARIANT_CLASSES: Record<ComposerSubmitButtonVariant, string> = {
  default:
    "bg-fill-primary-solid p-0.5 focus-visible:outline-fill-primary-solid",
  voiceEnd:
    "bg-(--ck-palette-icon-primary) p-0.5 focus-visible:outline-(--ck-palette-icon-primary)",
};

interface ComposerSubmitButtonProps {
  ariaDescribedBy?: string;
  ariaLabel?: string;
  /** Why the button is blocked; shown as a tooltip. */
  blockedReason?: ReactNode;
  /** A new number opens the tooltip; null never shows it. */
  blockedReasonOpenNonce?: number | null;
  className?: string;
  disableTooltip?: boolean;
  disabled?: boolean;
  /** `dimmed` (default) or `none`. */
  disabledAppearance?: "dimmed" | "none";
  /** The icon fills the button when it has no shortcut label or loading state. */
  fullBleedIcon?: boolean;
  Icon?: ComposerIconComponent;
  iconSource?: ComposerIconComponent;
  isLoading?: boolean;
  keyboardShortcutLabel?: ReactNode;
  onClick?: ComponentProps<"button">["onClick"];
  ref?: Ref<HTMLButtonElement>;
  /**
   * With the morph gate on, no shortcut label and the
   * send, stop or voice icon, the button draws the morphing icon.
   */
  supportsMorphing?: boolean;
  tooltipContent?: ReactNode;
  tooltipShortcut?: string;
  type?: "button" | "reset" | "submit";
  variant?: ComposerSubmitButtonVariant;
}

const SUBMIT_ICON_CLASS = "size-4 text-text-strong-solid";

/** The morph covers the send, stop and voice icons only. */
const morphStateOf = (
  Icon: ComposerIconComponent
): ComposerMorphState | null => {
  if (Icon === ComposerSendIcon) {
    return "send";
  }

  if (Icon === ComposerStopIcon) {
    return "stop";
  }

  return Icon === ComposerVoiceIcon ? "voice" : null;
};

/**
 * The round 28px send and stop button. Disabled or loading it sets
 * aria-disabled (and the native attribute unless a blocked reason is shown),
 * cancels its click and dims; a tooltip carries `tooltipContent` or the
 * `blockedReason`, which opens by default when its nonce is set.
 */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
const ComposerSubmitButton = ({
  ariaDescribedBy,
  ariaLabel,
  blockedReason,
  blockedReasonOpenNonce,
  className,
  disableTooltip = false,
  disabled = false,
  disabledAppearance = "dimmed",
  fullBleedIcon = false,
  Icon = ComposerSendIcon,
  iconSource,
  isLoading = false,
  keyboardShortcutLabel,
  onClick,
  ref,
  supportsMorphing = false,
  tooltipContent,
  tooltipShortcut,
  type = "button",
  variant = "default",
}: ComposerSubmitButtonProps) => {
  const morphGate = useComposerFeatureGate(supportsMorphing && "submitMorph");

  const hasShortcut =
    keyboardShortcutLabel !== undefined && keyboardShortcutLabel !== null;

  const fullBleed = fullBleedIcon && !isLoading && !hasShortcut;
  const iconClass = fullBleed ? "size-full" : SUBMIT_ICON_CLASS;

  const hasBlockedReason =
    blockedReason !== undefined && blockedReason !== null;

  const hasNonce =
    blockedReasonOpenNonce !== undefined && blockedReasonOpenNonce !== null;

  const forcedOpen = hasNonce && hasBlockedReason;
  const inactive = isLoading || disabled;
  const SourceIcon = iconSource ?? Icon;

  const morphState = morphGate && !hasShortcut ? morphStateOf(Icon) : null;
  let content: ReactNode;

  if (morphState !== null) {
    content = (
      <ComposerMorphIcon
        className={iconClass}
        isLoading={isLoading}
        state={morphState}
      />
    );
  } else if (isLoading) {
    content = <Spinner className={iconClass} />;
  } else if (hasShortcut) {
    content = (
      <span className="text-xs text-text-strong-solid select-none">
        {keyboardShortcutLabel}
      </span>
    );
  } else {
    content = (
      <SourceIcon
        className={cn(
          iconClass,
          iconSource ? "text-text-strong-solid" : undefined
        )}
      />
    );
  }

  const button = (
    <Button
      ref={ref}
      aria-busy={isLoading || undefined}
      aria-describedby={ariaDescribedBy}
      aria-disabled={inactive || undefined}
      aria-label={ariaLabel}
      className={cn(
        "flex size-7 shrink-0 cursor-(--ck-action-cursor,default) items-center justify-center rounded-full transition-opacity focus-visible:outline-2",
        fullBleed
          ? "bg-transparent p-0 focus-visible:outline-fill-primary-solid"
          : SUBMIT_VARIANT_CLASSES[variant],
        inactive && "cursor-default",
        inactive && disabledAppearance === "dimmed" && "opacity-50",
        !inactive && hasBlockedReason && "opacity-50",
        className
      )}
      disabled={isLoading || (disabled && !hasBlockedReason)}
      disabledAppearance="none"
      type={type}
      unstyled
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();

          return;
        }

        onClick?.(event);
      }}
    >
      {content}
    </Button>
  );

  if (
    !hasBlockedReason ||
    blockedReasonOpenNonce === null ||
    !(disabled || forcedOpen)
  ) {
    if (tooltipContent === undefined || tooltipContent === null) {
      return button;
    }

    return (
      <TooltipHint
        content={tooltipContent}
        disabled={disableTooltip}
        shortcut={tooltipShortcut}
      >
        {button}
      </TooltipHint>
    );
  }

  return (
    <TooltipHint
      key={forcedOpen ? `forced-${blockedReasonOpenNonce}` : "blocked"}
      content={blockedReason}
      defaultOpen={forcedOpen}
      tooltipBodyClassName="text-center text-pretty"
      tooltipClassName="max-w-36"
    >
      {button}
    </TooltipHint>
  );
};

/* ---------------------------------------------------------------- inline composer */

interface InlineComposerShellProps {
  children?: ReactNode;
  embedded?: boolean;
  leadingAction?: ReactNode;
  multiline?: boolean;
}

/** The pill (or rounded multiline) row that holds the input and the actions. */
const InlineComposerShell = ({
  children,
  embedded = false,
  leadingAction,
  multiline = false,
}: InlineComposerShellProps) => (
  <div
    className={cn(
      "flex max-w-full items-center gap-1.5",
      !embedded &&
        "border border-border bg-panel-elevated-secondary p-1 shadow-lg",
      !embedded &&
        (multiline ? "rounded-[calc(var(--spacing)*5.5)]" : "rounded-full"),
      (leadingAction === undefined || leadingAction === null) &&
        (embedded ? "ps-2.5" : "ps-3.5")
    )}
  >
    {leadingAction}
    {children}
  </div>
);

/** The hint line under an inline composer. */
const InlineComposerHint = ({ children }: { children?: ReactNode }) => (
  <div
    className="mt-2 font-sans text-xs leading-4 font-normal text-text-subtle not-italic select-none"
    role="status"
  >
    {children}
  </div>
);

interface InlineComposerProps {
  /** Whether cancelling is allowed, default true: Escape and the stop button call `onCancel`. */
  canCancel?: boolean;
  canSubmit?: boolean;
  children?: ReactNode;
  embedded?: boolean;
  generating?: boolean;
  hint?: ReactNode;
  label?: string;
  leadingAction?: ReactNode;
  multiline?: boolean;
  onBlurOutside?: () => void;
  onCancel: () => void;
  onSubmit: (form: HTMLFormElement) => void;
  primaryAction?: ReactNode;
  /** Replaces the localized "Working…" fallback. */
  status?: ReactNode;
  stopLabel?: string;
  submitIcon?: ComposerIconComponent;
  submitLabel?: string;
  trailingAction?: ReactNode;
  workingLabel?: string;
}

/**
 * The inline composer form. Enter in a textarea submits through the
 * form, Escape cancels, every key stays inside the form, and while it is
 * generating the input is visually hidden, a status line replaces it and the
 * submit button becomes a stop button.
 */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
const InlineComposer = ({
  canCancel = true,
  canSubmit,
  children,
  embedded = false,
  generating,
  hint,
  label,
  leadingAction,
  multiline = false,
  onBlurOutside,
  onCancel,
  onSubmit,
  primaryAction,
  status,
  stopLabel = "Stop generation",
  submitIcon,
  submitLabel,
  trailingAction,
  workingLabel = "Working…",
}: InlineComposerProps) => {
  const viewOnly = useComposerViewOnly();
  const busy = generating === true;
  const submittable = canSubmit === true;
  const formRef = useRef<HTMLFormElement>(null);
  const dispatchKey = useKeyCommandDispatch("composer.sendMessage");

  /*
   * Composer.submit: Enter (without Shift) in this form's textarea
   * submits it. The command is always registered (the submit handler checks
   * busy, view-only and canSubmit). The form offers its keys to this command
   * only and stops them, so an Enter in it never reaches an approval card.
   * Other keys, fields and buttons decline.
   */
  useKeyCommand(
    "composer.sendMessage",
    () => {
      formRef.current?.requestSubmit();
    },
    {
      keyboardHandler: (event) => {
        const form = formRef.current;

        if (
          form === null ||
          event.key !== "Enter" ||
          event.shiftKey ||
          !(event.target instanceof HTMLTextAreaElement) ||
          !form.contains(event.target)
        ) {
          return false;
        }

        form.requestSubmit();

        return true;
      },
    }
  );

  const handleBlur = (event: FocusEvent<HTMLFormElement>) => {
    if (
      !busy &&
      !event.currentTarget.contains(event.relatedTarget) &&
      onBlurOutside
    ) {
      onBlurOutside();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    event.stopPropagation();

    if (event.defaultPrevented) {
      return;
    }

    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      if (event.key === "Enter") {
        event.preventDefault();
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      if (canCancel) {
        onCancel();
      }

      return;
    }

    dispatchKey(event.nativeEvent);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!busy && submittable && !viewOnly) {
      onSubmit(event.currentTarget);
    }
  };

  const action =
    primaryAction === undefined ? (
      <ComposerSubmitButton
        key={busy ? "stop" : "submit"}
        ariaLabel={busy ? stopLabel : submitLabel}
        disabled={busy ? !canCancel : viewOnly || !submittable}
        Icon={busy ? ComposerStopIcon : ComposerSendIcon}
        iconSource={busy ? undefined : submitIcon}
        type={busy ? "button" : "submit"}
        onClick={busy ? onCancel : undefined}
      />
    ) : (
      primaryAction
    );

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the form handles key presses for its fields
    <form
      aria-busy={busy || undefined}
      aria-label={label}
      ref={formRef}
      className="pointer-events-auto w-full min-w-0 font-sans font-normal not-italic outline-none"
      data-ck-inline-composer
      tabIndex={-1}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
    >
      <InlineComposerShell
        embedded={embedded}
        leadingAction={leadingAction}
        multiline={multiline}
      >
        <div className={styles.input}>
          <div className={busy ? "sr-only" : undefined} inert={viewOnly}>
            {children}
          </div>
          {busy ? (
            <CadencedShimmer
              className="block max-w-full truncate text-sm select-none"
              role="status"
            >
              {status ?? workingLabel}
            </CadencedShimmer>
          ) : null}
        </div>
        {trailingAction}
        {action}
      </InlineComposerShell>
      {hint !== undefined && hint !== null ? (
        <InlineComposerHint>{hint}</InlineComposerHint>
      ) : null}
    </form>
  );
};

/* ---------------------------------------------------------------- comment surface */

const COMPOSER_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Segoe UI", sans-serif';

/** The surface's inline style that pins the chat font. */
// SAFETY: CSS custom properties are valid style keys at runtime; CSSProperties only lacks their names.
const composerSurfaceStyle = {
  "--ui-message-text-size": "13px",
  "--ck-compose-top-tray-background": "var(--ck-palette-surface-surface)",
  "--ck-compose-top-tray-border": "transparent",
  "--font-sans": COMPOSER_FONT_STACK,
  "--ck-interface-font": COMPOSER_FONT_STACK,
  fontFamily: COMPOSER_FONT_STACK,
} as CSSProperties;

/*
 * The `motion-reduce:transition-none` applies when
 * the host sets data-ck-reduced-motion=true, or, while the attribute is unset,
 * under (prefers-reduced-motion: reduce). Tailwind's own variant knows only
 * the media query, so both selectors are written out.
 */
const MOTION_REDUCE_NONE =
  "[:root[data-ck-reduced-motion=true]_&]:transition-none motion-reduce:[:root:not([data-ck-reduced-motion])_&]:transition-none";

/** Position-change transition. */
const composerPositionTransitionClassName = `absolute left-4 min-w-0 overflow-hidden transition-[left,width,top,bottom] duration-[140ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${MOTION_REDUCE_NONE}`;

/** The bottom tray's opacity and transform transition. */
const composerTrayTransitionClassName = `absolute inset-x-0 bottom-0 flex h-12 items-center ps-2 pe-3 origin-bottom-left transition-[opacity,transform] duration-(--duration-fast) ease-out ${MOTION_REDUCE_NONE}`;

/** The editor input class (the ProseMirror rules apply to a rich editor child). */
const composerEditorInputClassName = cn(
  "min-h-0! w-full p-0 font-[family-name:var(--font-sans,var(--body-family))]! text-base leading-normal text-text",
  "[&_.ProseMirror]:min-h-6 [&_.ProseMirror]:w-full [&_.ProseMirror]:px-0 [&_.ProseMirror]:py-0 [&_.ProseMirror]:font-sans! [&_.ProseMirror]:leading-6! [&_.ProseMirror]:text-text!",
  "[&_.ProseMirror_p]:font-sans! [&_.ProseMirror_p]:leading-6! [&_.ProseMirror_p_*]:font-sans! [&_.ProseMirror_span]:font-sans!"
);

interface ComposerSurfaceProps extends ComponentProps<"div"> {
  /** No height, width or opacity transition. */
  isRevealingPageComment?: boolean;
  /** `default` adds the background, shadow and ring. */
  surfaceVariant?: string;
}

/** The elevated rounded surface of the comment composer. */
const ComposerSurface = ({
  children,
  className,
  isRevealingPageComment = false,
  style,
  surfaceVariant = "default",
  ...props
}: ComposerSurfaceProps) => {
  const isDefault = surfaceVariant === "default";

  return (
    <div
      {...props}
      className={cn(
        styles.surface,
        `pointer-events-auto isolate rounded-[22px] ease-[cubic-bezier(0.23,1,0.32,1)] ${MOTION_REDUCE_NONE}`,
        isDefault && "bg-panel-elevated-secondary shadow-md",
        isRevealingPageComment
          ? "transition-none"
          : "transition-[height,width,opacity]",
        className
      )}
      style={{ ...composerSurfaceStyle, ...style }}
    >
      <div
        className={cn(
          styles.content,
          "overflow-hidden rounded-[inherit] bg-inherit"
        )}
      >
        {children}
      </div>
      {isDefault ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-multiply outline-1 outline-border"
        />
      ) : null}
    </div>
  );
};

/* ---------------------------------------------------------------- comment composer */

interface CommentComposerFormProps {
  ariaDescribedBy?: string;
  ariaLabel?: string;
  authorAvatar?: ReactNode;
  autoFocus?: boolean;
  cancelLabel?: ReactNode;
  compact?: boolean;
  disabled?: boolean;
  discussion?: string | null;
  embedded?: boolean;
  maxLength?: number;
  multiline?: boolean;
  name?: string;
  onCancel?: () => void;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  submitLabel?: string;
  value: string;
}

const isComposingEvent = (event: KeyboardEvent) =>
  event.nativeEvent.isComposing || event.keyCode === 229;

/**
 * The plain-text comment composer. The
 * value is trimmed before it is submitted and submit is enabled only for
 * non-empty text in an enabled control.
 */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
const CommentComposerForm = ({
  ariaDescribedBy,
  ariaLabel,
  authorAvatar,
  autoFocus = true,
  cancelLabel = "Cancel",
  compact = false,
  disabled = false,
  discussion,
  embedded = false,
  maxLength,
  multiline = true,
  name,
  onCancel,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  value,
}: CommentComposerFormProps) => {
  const trimmed = value.trim();
  const hasText = trimmed !== "";
  const canSubmit = !disabled && hasText;
  const hasDiscussion = discussion !== undefined && discussion !== null;
  const small = compact || hasDiscussion;
  const formRef = useRef<HTMLFormElement>(null);
  const dispatchKey = useKeyCommandDispatch("composer.sendMessage");

  /*
   * Composer.submit for this form: Enter (without Shift) in its field
   * submits it and the registry accepts the key, so the same Enter does not
   * reach another command such as an approval card's approve.
   */
  useKeyCommand(
    "composer.sendMessage",
    () => {
      formRef.current?.requestSubmit();
    },
    {
      keyboardHandler: (event) => {
        const form = formRef.current;

        if (
          form === null ||
          event.key !== "Enter" ||
          event.shiftKey ||
          !(event.target instanceof Node) ||
          !form.contains(event.target)
        ) {
          return false;
        }

        form.requestSubmit();

        return true;
      },
    }
  );

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (isComposingEvent(event)) {
      if (event.key === "Enter") {
        event.preventDefault();
      }
    } else if (event.key === "Escape" && onCancel && !disabled) {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    } else {
      dispatchKey(event.nativeEvent);
    }
  };

  const fieldProps = {
    "aria-describedby": ariaDescribedBy,
    "aria-label": ariaLabel,
    // The defaults autoFocus to true and passes it through.
    // oxlint-disable-next-line jsx-a11y/no-autofocus
    autoFocus,
    disabled,
    maxLength,
    name,
    onChange: (event: { currentTarget: { value: string } }) => {
      onChange(event.currentTarget.value);
    },
    onKeyDown: handleKeyDown,
    placeholder,
    value,
  };

  const baseClass = small
    ? cn(
        "min-h-0 w-full p-0 font-sans text-sm text-text",
        hasDiscussion ? "leading-5" : "leading-normal"
      )
    : composerEditorInputClassName;

  const field = multiline ? (
    <textarea
      {...fieldProps}
      className={cn(
        baseClass,
        "max-h-48 resize-none overflow-y-auto border-0 bg-transparent outline-none placeholder:text-text-subtle",
        hasDiscussion && "block",
        small && "field-sizing-content self-center"
      )}
      rows={small ? 1 : 3}
    />
  ) : (
    <input
      {...fieldProps}
      className={cn(
        baseClass,
        "h-7 border-0 bg-transparent outline-none placeholder:text-text-subtle"
      )}
    />
  );

  const showInlineSubmit = small ? hasText : !multiline && canSubmit;

  const row = hasDiscussion ? (
    <CommentComposer
      authorAvatar={authorAvatar}
      disabled={!canSubmit}
      layout={discussion === "comment" ? "card" : "inline"}
      showSubmit={hasText}
      submitLabel={submitLabel}
      submitType="submit"
    >
      {field}
    </CommentComposer>
  ) : (
    <div
      className={cn(
        "flex min-w-0 gap-2 py-2 pe-2",
        small ? "items-end ps-3" : "items-center ps-4"
      )}
    >
      {field}
      {showInlineSubmit ? (
        <SubmitButton aria-label={submitLabel} disabled={!canSubmit} />
      ) : null}
    </div>
  );

  const footer =
    multiline && !small ? (
      <div className="flex items-center justify-end gap-2 px-2 pb-2">
        {onCancel ? (
          <Button
            color="outline"
            disabled={disabled}
            size="composer"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        ) : null}
        <SubmitButton
          aria-label={submitLabel}
          disabled={!canSubmit}
          size="composer"
        />
      </div>
    ) : null;

  const form = (
    <form
      ref={formRef}
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();

        if (canSubmit) {
          onSubmit(trimmed);
        }
      }}
    >
      {row}
      {footer}
    </form>
  );

  return embedded ? form : <ComposerSurface>{form}</ComposerSurface>;
};

export {
  CadencedShimmer,
  CadencedShimmerContext,
  canStopTurnFromEscape,
  CommentComposerForm,
  ComposerReplacementConsumer,
  ComposerReplacementProvider,
  ComposerReplacementScopeContext,
  ComposerSubmitButton,
  ComposerSurface,
  ComposerViewOnlyContext,
  composerEditorInputClassName,
  composerPositionTransitionClassName,
  composerSubmitShortcut,
  composerSurfaceStyle,
  composerTrayTransitionClassName,
  createComposerReplacementStore,
  cyclePlanMode,
  handleComposerShortcutKey,
  InlineComposer,
  InlineComposerHint,
  InlineComposerShell,
  resolveComposerEscape,
  useComposerViewOnly,
  useIsComposerReplaced,
};

export type {
  CadencedShimmerProps,
  CommentComposerFormProps,
  ComposerEscapeAction,
  ComposerEscapeState,
  ComposerIconComponent,
  ComposerReplacementConsumerProps,
  ComposerReplacementProviderProps,
  ComposerReplacementStore,
  ComposerShortcutKeyState,
  ComposerSubmitButtonProps,
  ComposerSubmitButtonVariant,
  ComposerSurfaceProps,
  CyclePlanModeState,
  FollowUpType,
  InlineComposerProps,
  InlineComposerShellProps,
  SelectedMode,
  StopFromEscapeState,
  SubmitShortcutPreference,
};
