"use client";

import {
  AUTOFOCUS_ON_UNMOUNT,
  getTabbableCandidates,
  loopTabKey,
  useEscapeStack,
  useIsClient,
} from "composerkit/components/dialog/dialog-layer";
import { usePortalContainer } from "composerkit/components/platform-provider";
import {
  LayerEvent,
  noCleanup,
  useDismissableLayer,
  useLatest,
} from "composerkit/lib/dismissable-layer";
import { cn } from "composerkit/lib/utils";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

import { graceArea, isPointInPolygon } from "./hover-grace";
import type { Point } from "./hover-grace";
import { PopoverContext, usePopoverContext } from "./popover-context";
import type {
  PopoverAlign,
  PopoverSide,
  PopoverState,
} from "./popover-context";
import { usePopoverPosition } from "./popover-position";
import { TransitionGroup } from "./transition-group";

import styles from "./date-picker.module.css";

export type { PopoverAlign, PopoverSide } from "./popover-context";

/*
 * The date picker uses a vendored Radix non-modal popover. The content is not dismissed by Escape in
 * the layer (`onEscapeKeyDown` is prevented) but by the shared Escape stack. A
 * press outside is deferred until its click (the layer's
 * `deferPointerDownOutside`, here the shared `useDismissableLayer`), and a
 * press or focus outside dismisses unless it lands on the trigger. Focus
 * returns to the trigger on unmount unless the user interacted outside. The
 * shared options the date picker does not set are supported too: `showOnHover`
 * with its grace area, `shake`, `translucent`, and the content's width,
 * collision and focus options. There are no Anchor and Arrow parts.
 */

const DEFAULT_HOVER_OPEN_DELAY = 160;
const CLICK_GUARD_MS = 480;
const HOVER_BLUR_MS = 60;

export interface PopoverProps {
  children?: ReactNode;
  /** Milliseconds the pointer rests on the trigger before it opens. */
  hoverOpenDelay?: number;
  /** Called with the new state and the trigger element. */
  onOpenChange?: (open: boolean, trigger: HTMLElement | null) => void;
  /** The open state, when the caller owns it. */
  open?: boolean;
  /** Open while the pointer or focus is on the trigger. */
  showOnHover?: boolean;
}

export const Popover = ({
  children,
  hoverOpenDelay = DEFAULT_HOVER_OPEN_DELAY,
  onOpenChange,
  open: openProp,
  showOnHover = false,
}: PopoverProps) => {
  const [uncontrolled, setUncontrolled] = useState(false);
  const [shake, setShake] = useState(false);

  const [temporarilyPreventClickToClose, setTemporarilyPreventClickToClose] =
    useState(false);

  const open = openProp ?? uncontrolled;
  const hoverTimer = useRef<number | undefined>(undefined);
  const hoverOpenFocusTarget = useRef<HTMLElement | null>(null);
  const isPointerInTransitRef = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const contentId = useId();
  const latest = useLatest({ onOpenChange, open, showOnHover });

  /* After a hover open the trigger ignores a click for the click guard interval. */
  useEffect(() => {
    if (!temporarilyPreventClickToClose) {
      return noCleanup;
    }

    const timer = window.setTimeout(() => {
      setTemporarilyPreventClickToClose(false);
    }, CLICK_GUARD_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [temporarilyPreventClickToClose]);

  const setOpen = useCallback(
    (next: boolean) => {
      window.clearTimeout(hoverTimer.current);
      const { current } = latest;

      if (current.open === next) {
        return;
      }

      if (!next) {
        setShake(false);

        if (current.showOnHover) {
          hoverOpenFocusTarget.current?.focus();
        }

        hoverOpenFocusTarget.current = null;
      }

      current.onOpenChange?.(next, triggerRef.current);
      setUncontrolled(next);

      if (current.showOnHover) {
        setTemporarilyPreventClickToClose(next);
      }
    },
    [latest]
  );

  const onTriggerEnter = useCallback(() => {
    hoverTimer.current = window.setTimeout(() => {
      setOpen(true);
    }, hoverOpenDelay);
  }, [hoverOpenDelay, setOpen]);

  const onTriggerLeave = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(hoverTimer.current);
    },
    []
  );

  const state = useMemo<PopoverState>(
    () => ({
      contentId,
      contentRef,
      hoverOpenFocusTarget,
      isPointerInTransitRef,
      onTriggerEnter,
      onTriggerLeave,
      open,
      setOpen,
      setShake,
      shake,
      showOnHover,
      temporarilyPreventClickToClose,
      triggerRef,
    }),
    [
      contentId,
      onTriggerEnter,
      onTriggerLeave,
      open,
      setOpen,
      shake,
      showOnHover,
      temporarilyPreventClickToClose,
    ]
  );

  return <PopoverContext value={state}>{children}</PopoverContext>;
};

interface TriggerHandlers {
  onClick?: (event: SyntheticEvent<HTMLElement>) => void;
  onPointerDown?: (event: SyntheticEvent<HTMLElement>) => void;
}

/**
 * Right after a hover open a press on the trigger is swallowed, so
 * the click that follows the hover does not close the popover. A link is
 * never swallowed.
 */
const guardPress = (event: SyntheticEvent<HTMLElement>, prevent: boolean) => {
  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null;

  const isLink =
    event.currentTarget.nodeName.toLocaleLowerCase() === "a" ||
    (anchor !== null && event.currentTarget.contains(anchor));

  if (!isLink && prevent) {
    event.preventDefault();
    event.stopPropagation();
  }
};

interface HoverTriggerProps {
  onBlur?: () => void;
  onFocus?: () => void;
  onPointerLeave?: () => void;
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
}

/** The trigger hover and focus handlers, set only with `showOnHover`. */
const useHoverTriggerProps = (): HoverTriggerProps => {
  const {
    contentRef,
    isPointerInTransitRef,
    onTriggerEnter,
    onTriggerLeave,
    setOpen,
    showOnHover,
  } = usePopoverContext();

  const hovering = useRef(false);

  if (!showOnHover) {
    return {};
  }

  return {
    onBlur: () => {
      window.setTimeout(() => {
        if (contentRef.current?.contains(document.activeElement) !== true) {
          setOpen(false);
        }
      }, HOVER_BLUR_MS);
    },
    onFocus: () => {
      setOpen(true);
    },
    onPointerLeave: () => {
      if (hovering.current) {
        onTriggerLeave();
        hovering.current = false;
      }
    },
    onPointerMove: (event) => {
      if (
        event.pointerType !== "touch" &&
        !hovering.current &&
        !isPointerInTransitRef.current
      ) {
        onTriggerEnter();
        hovering.current = true;
      }
    },
  };
};

/**
 * The props the trigger adds to the element they wrap
 * (`asChild`): the anchor ref, the dialog semantics, the toggle, the click
 * guard after a hover open and, with `showOnHover`, the hover and focus
 * handlers. The toggle is skipped when a handler prevented the default.
 */
export const usePopoverTrigger = ({
  onClick,
  onPointerDown,
}: TriggerHandlers = {}) => {
  const {
    contentId,
    open,
    setOpen,
    temporarilyPreventClickToClose,
    triggerRef,
  } = usePopoverContext();

  const hover = useHoverTriggerProps();

  /* A callback ref, so the trigger can be any element type. */
  const setTrigger = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;

      return () => {
        triggerRef.current = null;
      };
    },
    [triggerRef]
  );

  return {
    "aria-controls": open ? contentId : undefined,
    "aria-expanded": open,
    "aria-haspopup": "dialog",
    "data-state": open ? "open" : "closed",
    ...hover,
    onClick: (event: SyntheticEvent<HTMLElement>) => {
      guardPress(event, temporarilyPreventClickToClose);
      onClick?.(event);

      if (!event.defaultPrevented) {
        setOpen(!open);
      }
    },
    onPointerDown: (event: SyntheticEvent<HTMLElement>) => {
      guardPress(event, temporarilyPreventClickToClose);
      onPointerDown?.(event);
    },
    ref: setTrigger,
  } as const;
};

/** Closes the popover. */
export const useClosePopover = () => {
  const { setOpen } = usePopoverContext();

  return useCallback(() => {
    setOpen(false);
  }, [setOpen]);
};

const COLLISION_PADDING = 20;
const DEFAULT_SIDE_OFFSET = 8;

const preventDefault = (event: LayerEvent | globalThis.KeyboardEvent) => {
  event.preventDefault();
};

export interface PopoverContentProps {
  align?: PopoverAlign;
  alignOffset?: number;
  "aria-label"?: string;
  /** Radix `avoidCollisions`: shift and flip to stay inside the window. */
  avoidCollisions?: boolean;
  /** Take focus when the content mounts (not for a hover popover). */
  autoFocus?: boolean;
  children?: ReactNode;
  className?: string;
  /** Radix `collisionPadding`, in pixels on every side. */
  collisionPadding?: number;
  dir?: "ltr" | "rtl";
  /** Radix `hideWhenDetached`: hide when the trigger scrolls out of view. */
  hideWhenDetached?: boolean;
  maxWidth?: number;
  minWidth?: number;
  /** Runs on unmount; `preventDefault` stops focus returning to the trigger. */
  onCloseAutoFocus?: (event: LayerEvent) => void;
  /** Keep the popover open when focus moves outside it. */
  preventCloseOnFocusOutside?: boolean;
  side?: PopoverSide;
  sideOffset?: number;
  /** Radix `sticky`: `always` stops the shift limiter. */
  sticky?: "always" | "partial";
  /** A blurred, translucent surface. */
  translucent?: boolean;
  width?: number;
}

/**
 * The content defaults: `alignOffset` is 0 only when
 * `align` is given as "center"; without `align` it is -5.
 */
const resolveContentProps = (props: PopoverContentProps) => ({
  align: props.align ?? "center",
  alignOffset: props.alignOffset ?? (props.align === "center" ? 0 : -5),
  autoFocus: props.autoFocus ?? true,
  avoidCollisions: props.avoidCollisions ?? true,
  collisionPadding: props.collisionPadding ?? COLLISION_PADDING,
  hideWhenDetached: props.hideWhenDetached ?? true,
  preventCloseOnFocusOutside: props.preventCloseOnFocusOutside ?? false,
  side: props.side ?? "bottom",
  sideOffset: props.sideOffset ?? DEFAULT_SIDE_OFFSET,
  sticky: props.sticky ?? "partial",
  translucent: props.translucent ?? false,
});

/**
 * Radix `PopoverContentNonModal` on the shared dismissable layer: remember an
 * outside interaction, and never dismiss for a press or focus on the trigger,
 * or for focus that follows an outside press.
 */
const useOutsideDismissal = (preventCloseOnFocusOutside: boolean) => {
  const { setOpen, triggerRef } = usePopoverContext();
  const hasInteractedOutside = useRef(false);
  const hasPointerDownOutside = useRef(false);

  const layer = useDismissableLayer({
    active: true,
    modal: false,
    onDismiss: () => {
      setOpen(false);
    },
    onEscapeKeyDown: preventDefault,
    onFocusOutside: preventCloseOnFocusOutside ? preventDefault : undefined,
    onInteractOutside: (event) => {
      const original = event.detail?.originalEvent;

      if (!event.defaultPrevented) {
        hasInteractedOutside.current = true;

        if (original?.type === "pointerdown") {
          hasPointerDownOutside.current = true;
        }
      }

      const { target } = event;

      if (
        target instanceof Node &&
        triggerRef.current?.contains(target) === true
      ) {
        event.preventDefault();
      }

      if (original?.type === "focusin" && hasPointerDownOutside.current) {
        event.preventDefault();
      }
    },
  });

  return { hasInteractedOutside, layer };
};

/** The content takes focus when it mounts. */
const useFocusOnMount = (enabled: boolean) => {
  const { contentRef } = usePopoverContext();

  useEffect(() => {
    const element = contentRef.current;

    if (element && enabled && !element.contains(document.activeElement)) {
      element.focus({ preventScroll: true });
    }
  }, [contentRef, enabled]);
};

/**
 * The focus scope's unmount focus: the content's `onCloseAutoFocus` runs in a
 * timeout after the unmount and a remount cancels it. Unless it prevents the
 * default, or the user interacted outside, focus returns to the trigger. A
 * hover popover prevents it by default.
 */
const useFocusReturn = (
  onCloseAutoFocus: ((event: LayerEvent) => void) | undefined,
  hasInteractedOutside: { current: boolean }
) => {
  const { showOnHover, triggerRef } = usePopoverContext();
  const latestClose = useLatest(onCloseAutoFocus);
  const timer = useRef<number | undefined>(undefined);

  const cancelFocusReturn = useCallback(() => {
    window.clearTimeout(timer.current);
  }, []);

  const scheduleFocusReturn = useCallback(() => {
    timer.current = window.setTimeout(() => {
      const event = new LayerEvent(AUTOFOCUS_ON_UNMOUNT);

      if (latestClose.current) {
        latestClose.current(event);
      } else if (showOnHover) {
        event.preventDefault();
      }

      if (!event.defaultPrevented && !hasInteractedOutside.current) {
        triggerRef.current?.focus();
      }
    }, 0);
  }, [hasInteractedOutside, latestClose, showOnHover, triggerRef]);

  useEffect(() => {
    cancelFocusReturn();

    return scheduleFocusReturn;
  }, [cancelFocusReturn, scheduleFocusReturn]);
};

/** Shift+Tab on the content itself moves to the last tabbable. */
const useContentKeyDown = () => {
  const { contentRef } = usePopoverContext();

  return (event: KeyboardEvent<HTMLDivElement>) => {
    const element = contentRef.current;

    if (
      element &&
      event.target === element &&
      event.key === "Tab" &&
      event.shiftKey
    ) {
      event.preventDefault();
      event.stopPropagation();
      getTabbableCandidates(element).at(-1)?.focus();

      return;
    }

    loopTabKey(event);
  };
};

const PopoverContentImpl = (props: PopoverContentProps) => {
  const options = resolveContentProps(props);

  const { contentId, contentRef, open, shake, showOnHover, triggerRef } =
    usePopoverContext();

  const {
    hidden,
    isPositioned,
    origin,
    placedAlign,
    placedSide,
    setFloating,
    x,
    y,
  } = usePopoverPosition(options, triggerRef, contentRef);

  const { hasInteractedOutside, layer } = useOutsideDismissal(
    options.preventCloseOnFocusOutside
  );

  useFocusOnMount(options.autoFocus && !showOnHover);
  useFocusReturn(props.onCloseAutoFocus, hasInteractedOutside);
  const handleKeyDown = useContentKeyDown();

  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;

      return () => {
        contentRef.current = null;
      };
    },
    [contentRef]
  );

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: every key is a `--name` custom property with a string value, which CSSProperties accepts
  const wrapperStyle = {
    "--ck-flyout-transform-origin": origin,
    "--ck-flyout-x": x,
    "--ck-flyout-y": y,
  } as CSSProperties;

  const { maxWidth, minWidth, width } = props;

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: every key is a `--name` custom property with a string value, which CSSProperties accepts
  const contentStyle = {
    "--ck-flyout-max-width":
      maxWidth === undefined ? undefined : `${maxWidth}px`,
    "--ck-flyout-min-width":
      minWidth === undefined ? undefined : `${minWidth}px`,
    "--ck-flyout-pointer-events": layer.style?.pointerEvents,
    "--ck-flyout-width": width === undefined ? undefined : `${width}px`,
  } as CSSProperties;

  return (
    <div
      className={styles.popperWrapper}
      data-hidden={hidden ? "" : undefined}
      data-positioned={isPositioned}
      dir={props.dir}
      ref={setFloating}
      style={wrapperStyle}
    >
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the layer tracks pointer and focus inside the content and loops Tab, as the Radix content does */}
      <div
        aria-label={props["aria-label"]}
        className={cn(styles.popover, props.className)}
        data-align={placedAlign}
        data-animate={shake ? "shake" : undefined}
        data-side={placedSide}
        data-state={open ? "open" : "closed"}
        data-translucent={options.translucent ? "true" : undefined}
        dir={props.dir}
        id={contentId}
        onBlurCapture={layer.handleBlurCapture}
        onFocusCapture={layer.handleFocusCapture}
        onKeyDown={handleKeyDown}
        onPointerDownCapture={layer.handlePointerDownCapture}
        ref={setContentRef}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the popover content is a div with role dialog (Radix), not a modal dialog element
        role="dialog"
        style={contentStyle}
        tabIndex={-1}
      >
        {props.children}
      </div>
    </div>
  );
};

/** The content pointer tracking: the grace area between trigger and content. */
const useHoverGraceArea = () => {
  const { contentRef, isPointerInTransitRef, setOpen, triggerRef } =
    usePopoverContext();

  const [polygon, setPolygon] = useState<Point[] | null>(null);

  const clear = useCallback(() => {
    setPolygon(null);
    isPointerInTransitRef.current = false;
  }, [isPointerInTransitRef]);

  const start = useCallback(
    (event: globalThis.PointerEvent, from: Element, to: Element) => {
      setPolygon(graceArea(event, from, to));
      isPointerInTransitRef.current = true;
    },
    [isPointerInTransitRef]
  );

  useEffect(() => clear, [clear]);

  useEffect(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;

    if (!trigger || !content) {
      return noCleanup;
    }

    const onTriggerLeave = (event: globalThis.PointerEvent) => {
      start(event, trigger, content);
    };

    const onContentLeave = (event: globalThis.PointerEvent) => {
      start(event, content, trigger);
    };

    trigger.addEventListener("pointerleave", onTriggerLeave);
    content.addEventListener("pointerleave", onContentLeave);

    return () => {
      trigger.removeEventListener("pointerleave", onTriggerLeave);
      content.removeEventListener("pointerleave", onContentLeave);
    };
  }, [contentRef, start, triggerRef]);

  useEffect(() => {
    if (!polygon) {
      return noCleanup;
    }

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const { target } = event;

      if (!(target instanceof Element)) {
        return;
      }

      const onElements =
        triggerRef.current?.contains(target) === true ||
        contentRef.current?.contains(target) === true;

      const outside = !isPointInPolygon(
        { x: event.clientX, y: event.clientY },
        polygon
      );

      if (onElements) {
        clear();
      } else if (outside || target.hasAttribute("aria-haspopup")) {
        clear();
        setOpen(false);
      }
    };

    document.addEventListener("pointermove", onPointerMove);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
    };
  }, [clear, contentRef, polygon, setOpen, triggerRef]);
};

/** The content Tab handler: Tab from the trigger moves into the content. */
const useHoverTabIntoContent = () => {
  const { contentRef, hoverOpenFocusTarget, triggerRef } = usePopoverContext();

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const content = contentRef.current;

      if (!content || event.key !== "Tab" || event.shiftKey) {
        return;
      }

      const [first] = getTabbableCandidates(content);

      if (first === undefined) {
        return;
      }

      event.preventDefault();
      const active = document.activeElement;
      const trigger = triggerRef.current;
      const [triggerFirst] = trigger ? getTabbableCandidates(trigger) : [];

      if (active instanceof HTMLElement && trigger?.contains(active) === true) {
        hoverOpenFocusTarget.current = active;
      } else {
        hoverOpenFocusTarget.current =
          triggerFirst instanceof HTMLElement ? triggerFirst : trigger;
      }

      first.focus();
      document.removeEventListener("keydown", onKeyDown);
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [contentRef, hoverOpenFocusTarget, triggerRef]);
};

/**
 * The content of a hover popover. The pointer may cross from the
 * trigger to the content (and back) through a grace area; leaving it closes
 * the popover. Tab from the trigger moves into the content.
 */
const HoverPopoverContent = (props: PopoverContentProps) => {
  useHoverGraceArea();
  useHoverTabIntoContent();

  return <PopoverContentImpl {...props} />;
};

/**
 * The content portals to the platform container or the body and
 * mounts through a TransitionGroup with a 600 ms enter and a 300 ms exit.
 */
export const PopoverContent = (props: PopoverContentProps) => {
  const { open, setOpen, showOnHover } = usePopoverContext();
  const container = usePortalContainer();
  const isClient = useIsClient();

  useEscapeStack(open, () => {
    setOpen(false);
  });

  if (!isClient) {
    return null;
  }

  let content: ReactNode = null;

  if (open) {
    content = showOnHover ? (
      <HoverPopoverContent key="popover-hover" {...props} />
    ) : (
      <PopoverContentImpl key="popover" {...props} />
    );
  }

  return createPortal(
    <TransitionGroup
      className={styles.transition}
      enterDuration={600}
      exitDuration={300}
    >
      {content}
    </TransitionGroup>,
    container ?? document.body
  );
};
