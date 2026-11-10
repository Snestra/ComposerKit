"use client";

// Lucide artwork is covered by components/icon/lucide.license.

/* oxlint-disable anti-slop/no-runtime-typeof -- Base UI accepts state callbacks and ref callbacks. */
/* oxlint-disable complexity -- The controller, the popup and the key handler keep one branch per case. */
import { Tooltip as Primitive } from "@base-ui/react/tooltip";
import { useRender } from "@base-ui/react/use-render";
import { createIcon } from "@workspace/react/components/icon";
import { usePortalContainer } from "@workspace/react/components/platform-provider";
import { Kbd } from "@workspace/react/components/ui/keyboard-shortcut";
import { useDismissableLayer } from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

/** The app wrapper's provider defaults: 180ms, then 280ms. */
const DEFAULT_OPEN_DELAY = 180;
const DEFAULT_SKIP_DELAY = 280;

/** `delayOpen` raises the hover delay to this value. */
const DELAYED_OPEN_DELAY = 240;

/** `preventUnintentionalClickToClose` swallows the press for this long. */
const CLICK_GUARD_MS = 380;

/** The hit-test recheck after the pointer leaves for the content. */
const HANDOFF_RECHECK_MS = 90;

/** Padding of the handoff triangle's far edge. */
const HANDOFF_PADDING = 9;
const DEFAULT_SIDE_OFFSET = 3;
const POINTER_SIDE_OFFSET = 11;
const COLLISION_PADDING = 9;

/** Arrow clearance for the coachmark. */
const COACHMARK_ARROW_PADDING = 15;

/** Window event that closes every tooltip. */
const DISMISS_EVENT = "ui:dismiss-tooltips";

/** The skip-delay key a tooltip uses when it names none. */
const DEFAULT_SKIP_DELAY_KEY = "default";

const OVERFLOW_TARGET = "[data-ck-tooltip-overflow-target]";
const VISIBILITY_TARGET = "[data-ck-tooltip-visibility-target]";

/** The Radix tooltip's own target attribute. */
const ENABLEMENT_TARGET = "[data-ck-tooltip-enablement-target]";

const FOCUSABLE =
  "a[href], button, input, select, textarea, [tabindex], [contenteditable]";

const EDITABLE =
  '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]';

const focusRank = (element: HTMLElement) =>
  element.tabIndex > 0 ? element.tabIndex : Number.MAX_SAFE_INTEGER;

const isFocusable = (element: HTMLElement) => {
  const skipsTabOrder =
    element.tabIndex < 0 &&
    (element.hasAttribute("tabindex") || !element.matches(EDITABLE));

  if (
    skipsTabOrder ||
    element.matches(":disabled") ||
    element.closest("[inert], [hidden]") !== null ||
    getComputedStyle(element).visibility === "hidden"
  ) {
    return false;
  }

  for (
    let node: HTMLElement | null = element;
    node !== null;
    node = node.parentElement
  ) {
    if (getComputedStyle(node).display === "none") {
      return false;
    }
  }

  return true;
};

/** Tabbable elements in tab order. */
const focusableWithin = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(isFocusable)
    .toSorted((a, b) => focusRank(a) - focusRank(b));

const contains = (parent: EventTarget | null, node: EventTarget | null) =>
  parent instanceof Element && node instanceof Node && parent.contains(node);

/**
 * Sets one ref and returns how to undo it: a callback ref's own cleanup when
 * it returns one, else a call with `null`.
 */
const assignRef = <T,>(
  ref: Ref<T> | undefined,
  value: T | null
): (() => void) | undefined => {
  if (typeof ref === "function") {
    const cleanup = ref(value);

    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      } else {
        ref(null);
      }
    };
  }

  if (ref === null || ref === undefined) {
    return undefined;
  }

  ref.current = value;

  return () => {
    ref.current = null;
  };
};

/** Merges refs into one callback ref whose cleanup runs each ref's cleanup. */
const mergeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (value: T | null) => {
    const cleanups = refs.map((ref) => assignRef(ref, value));

    return () => {
      for (const cleanup of cleanups) {
        cleanup?.();
      }
    };
  };

const noop = (): void => undefined;

const joinIds = (...ids: (string | undefined)[]) => {
  const joined = ids.filter((id) => id !== undefined && id !== "").join(" ");

  return joined === "" ? undefined : joined;
};

type TooltipSide = "top" | "bottom" | "left" | "right";

const OPPOSITE_SIDE: Record<TooltipSide, TooltipSide> = {
  bottom: "top",
  left: "right",
  right: "left",
  top: "bottom",
};

const isTooltipSide = (value: string | undefined): value is TooltipSide =>
  value === "top" ||
  value === "bottom" ||
  value === "left" ||
  value === "right";

interface Point {
  x: number;
  y: number;
}

interface Triangle {
  endA: Point;
  endB: Point;
  start: Point;
}

const isEmptyRect = (rect: DOMRect) => rect.width <= 0 || rect.height <= 0;

/**
 * The triangle from the pointer to the destination's near edge, padded by 8px
 * on both ends. `destinationSide` is where the destination
 * lies relative to the source.
 */
const handoffTriangle = ({
  destinationRect,
  destinationSide,
  pointer,
  sourceRect,
}: {
  destinationRect: DOMRect;
  destinationSide: TooltipSide;
  pointer: Point;
  sourceRect: DOMRect | undefined;
}): Triangle | null => {
  if (
    isEmptyRect(destinationRect) ||
    (sourceRect !== undefined && isEmptyRect(sourceRect))
  ) {
    return null;
  }

  if (destinationSide === "left" || destinationSide === "right") {
    const x =
      destinationSide === "right"
        ? destinationRect.left
        : destinationRect.right;

    return {
      endA: { x, y: destinationRect.top - HANDOFF_PADDING },
      endB: { x, y: destinationRect.bottom + HANDOFF_PADDING },
      start: pointer,
    };
  }

  const y =
    destinationSide === "bottom" ? destinationRect.top : destinationRect.bottom;

  return {
    endA: { x: destinationRect.left - HANDOFF_PADDING, y },
    endB: { x: destinationRect.right + HANDOFF_PADDING, y },
    start: pointer,
  };
};

/** Signed area of the triangle `point`, `a`, `b`. */
const cross = (point: Point, a: Point, b: Point) =>
  (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y);

/** Whether `point` is inside, or on an edge of, the triangle. */
const isInsideTriangle = (point: Point, triangle: Triangle) => {
  const first = cross(point, triangle.start, triangle.endA);
  const second = cross(point, triangle.endA, triangle.endB);
  const third = cross(point, triangle.endB, triangle.start);

  return !(
    (first < 0 || second < 0 || third < 0) &&
    (first > 0 || second > 0 || third > 0)
  );
};

/**
 * Watches the pointer on its way to `destinationElement`.
 * Returns a cleanup, or `null` when either element has no size.
 */
const trackPointerTriangle = ({
  destinationElement,
  destinationSide,
  onEnterDestination,
  onMoveInsideTriangle,
  onMoveOutsideTriangle,
  pointer,
  sourceElement,
}: {
  destinationElement: HTMLElement;
  destinationSide: TooltipSide;
  onEnterDestination: () => void;
  onMoveInsideTriangle: (point: Point) => void;
  onMoveOutsideTriangle: () => void;
  pointer: Point;
  sourceElement: HTMLElement | null;
}) => {
  if (
    isEmptyRect(destinationElement.getBoundingClientRect()) ||
    (sourceElement !== null &&
      isEmptyRect(sourceElement.getBoundingClientRect()))
  ) {
    return null;
  }

  const doc = destinationElement.ownerDocument;

  const handleMove = (event: PointerEvent) => {
    const path = event.composedPath();

    if (
      path.includes(destinationElement) ||
      (sourceElement !== null && path.includes(sourceElement))
    ) {
      onEnterDestination();

      return;
    }

    const point = { x: event.clientX, y: event.clientY };

    const triangle = handoffTriangle({
      destinationRect: destinationElement.getBoundingClientRect(),
      destinationSide,
      pointer,
      sourceRect: sourceElement?.getBoundingClientRect(),
    });

    if (triangle !== null && isInsideTriangle(point, triangle)) {
      onMoveInsideTriangle(point);
    } else {
      onMoveOutsideTriangle();
    }
  };

  doc.addEventListener("pointermove", handleMove, true);

  return () => {
    doc.removeEventListener("pointermove", handleMove, true);
  };
};

/** Which gate the tooltip needs to open: always, an overflowing trigger, or a hidden target. */
type TooltipOpenWhen =
  | "always"
  | "trigger-overflows"
  | "visibility-target-hidden";

/** The Radix tooltip's `enabledWhen`. */
type TooltipEnabledWhen = "default" | "overflow" | "target-hidden";

type TooltipVariant =
  | "tooltip"
  | "coachmark"
  | "rich"
  | "fileCitation"
  | "entityPreview"
  | "floating-navigation-rail"
  | "unstyled";

/** Finds tooltip overflow and visibility targets. */
const isOpenConditionMet = (
  trigger: HTMLElement | null,
  openWhen: TooltipOpenWhen
) => {
  if (openWhen === "always") {
    return true;
  }

  if (openWhen === "trigger-overflows") {
    const target = trigger?.querySelector(OVERFLOW_TARGET) ?? trigger;

    return (
      target !== null &&
      target !== undefined &&
      (target.scrollWidth > target.clientWidth ||
        target.scrollHeight > target.clientHeight)
    );
  }

  const target = trigger?.querySelector(VISIBILITY_TARGET);

  return (
    target !== null &&
    target !== undefined &&
    getComputedStyle(target).display === "none"
  );
};

/** The Radix tooltip's `enabledWhen`. */
const isEnabled = (
  trigger: HTMLElement | null,
  enabledWhen: TooltipEnabledWhen
) => {
  if (enabledWhen === "default") {
    return true;
  }

  if (trigger === null) {
    return false;
  }

  const target = trigger.querySelector(ENABLEMENT_TARGET);

  if (enabledWhen === "target-hidden") {
    return (
      target !== null &&
      trigger.ownerDocument.defaultView?.getComputedStyle(target).display ===
        "none"
    );
  }

  const measured = target ?? trigger;

  return (
    measured.scrollWidth > measured.clientWidth ||
    measured.scrollHeight > measured.clientHeight
  );
};

/** The parts of a pointer event the handlers read (a React or a native event). */
interface PointerLike {
  clientX: number;
  clientY: number;
  pointerType: string;
  target: EventTarget | null;
}

interface FocusLike {
  currentTarget: EventTarget | null;
  defaultPrevented: boolean;
  relatedTarget: EventTarget | null;
  target: EventTarget | null;
}

interface KeyLike {
  altKey: boolean;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  key: string;
  metaKey: boolean;
  preventDefault: () => void;
  shiftKey: boolean;
  stopPropagation: () => void;
  target: EventTarget | null;
}

interface PressLike {
  defaultPrevented: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
  target: EventTarget | null;
}

interface RegisteredTooltip {
  close: () => void;
  variant: TooltipVariant;
}

interface RegisteredDismissal {
  closeOnWindowBlur: boolean;
  dismiss: () => void;
}

/** What `TooltipProvider` offers each tooltip. */
interface TooltipRegistry {
  activateTooltip: (
    id: string,
    skipKey: string,
    variant: TooltipVariant,
    close: () => void
  ) => void;
  clearHoverHandoffLock: (id: string) => void;
  deactivateTooltip: (id: string) => void;
  /** Dismisses every tooltip, as the window event does. */
  dismissAll: () => void;
  getOpenDelay: (skipKey: string, delay: number) => number;
  isHoverOpenBlocked: (id: string) => boolean;
  registerOpenTooltip: (
    id: string,
    variant: TooltipVariant,
    close: () => void
  ) => () => void;
  registerTooltipDismissHandler: (
    id: string,
    dismiss: () => void,
    closeOnWindowBlur: boolean
  ) => () => void;
  setHoverHandoffLockTooltipId: (id: string) => void;
  setSkipDelay: (delay: number) => void;
  /** The provider closes everything when the window loses focus. */
  windowBlur: () => void;
}

/**
 * The provider's registry: which tooltip is active, the
 * skip-delay window for the key of the last one, the open tooltips, the
 * dismiss handlers and the hover handoff lock.
 */
const createRegistry = (
  initialSkipDelay: number
): TooltipRegistry & { mount: () => void; unmount: () => void } => {
  let skipDelayMs = initialSkipDelay;
  let activeId: string | null = null;
  let skipKey: string | null = null;
  let lockId: string | null = null;
  let mounted = true;
  let skipping = false;
  let timer: number | null = null;
  const openTooltips = new Map<string, RegisteredTooltip>();
  const dismissals = new Map<string, RegisteredDismissal>();

  const clearTimer = () => {
    if (timer !== null && typeof window !== "undefined") {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const endSkipWindow = () => {
    skipKey = null;
    skipping = false;
  };

  const deactivateTooltip = (id: string) => {
    openTooltips.delete(id);

    if (activeId !== id) {
      return;
    }

    activeId = null;
    lockId = null;
    clearTimer();

    const skipDelay = skipDelayMs;

    if (!mounted || skipDelay === 0 || typeof window === "undefined") {
      endSkipWindow();
    } else {
      timer = window.setTimeout(() => {
        timer = null;
        endSkipWindow();
      }, skipDelay);
    }
  };

  return {
    activateTooltip: (id, key, variant, close) => {
      for (const [otherId, other] of openTooltips) {
        if (
          otherId === id ||
          (other.variant !== "tooltip" && variant === "tooltip")
        ) {
          continue;
        }

        other.close();
      }

      activeId = id;

      if (lockId !== id) {
        lockId = null;
      }

      openTooltips.set(id, { close, variant });
      clearTimer();
      skipKey = key;
      skipping = true;
    },
    clearHoverHandoffLock: (id) => {
      if (lockId === id) {
        lockId = null;
      }
    },
    deactivateTooltip,
    dismissAll: () => {
      const handlers = [...dismissals.values()];

      openTooltips.clear();
      activeId = null;
      skipKey = null;
      lockId = null;
      skipping = false;
      clearTimer();

      for (const { dismiss } of handlers) {
        dismiss();
      }
    },
    getOpenDelay: (key, delay) => (skipping && skipKey === key ? 0 : delay),
    isHoverOpenBlocked: (id) => lockId !== null && lockId !== id,
    mount: () => {
      mounted = true;
    },
    registerOpenTooltip: (id, variant, close) => {
      openTooltips.set(id, { close, variant });

      return () => {
        openTooltips.delete(id);
      };
    },
    registerTooltipDismissHandler: (id, dismiss, closeOnWindowBlur) => {
      dismissals.set(id, { closeOnWindowBlur, dismiss });

      return () => {
        dismissals.delete(id);
      };
    },
    setHoverHandoffLockTooltipId: (id) => {
      lockId = id;
    },
    setSkipDelay: (delay) => {
      skipDelayMs = delay;
    },
    unmount: () => {
      mounted = false;
      clearTimer();
      openTooltips.clear();
      dismissals.clear();
    },
    windowBlur: () => {
      for (const { closeOnWindowBlur, dismiss } of dismissals.values()) {
        if (closeOnWindowBlur) {
          dismiss();
        }
      }

      skipKey = null;
      lockId = null;
      skipping = false;
      clearTimer();
    },
  };
};

interface ProviderValue extends TooltipRegistry {
  portalContainer: HTMLElement | undefined;
}

const ProviderContext = createContext<ProviderValue | null>(null);

/** The provider's `delayDuration` for tooltips that name none. */
const DelayContext = createContext<number | null>(null);

function useTooltipDelay(fallback: number) {
  return useContext(DelayContext) ?? fallback;
}

/** The tooltip a trigger group is rendered for, set by the app's overlays. */
const OverlayOwnerContext = createContext<{ id: string } | undefined>(
  undefined
);

/** The page zoom the popup compensates for. */
const ZoomContext = createContext(1);

/** The default `side` of every popup below (the Radix `DefaultsProvider`). */
const DefaultSideContext = createContext<TooltipSide | undefined>(undefined);

/** Closes every tooltip in every provider. */
const dismissTooltips = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }
};

interface TooltipProviderProps {
  children?: ReactNode;
  /** Hover delay of tooltips that name none. Default 180ms. */
  delayDuration?: number;
  /** Portal container of tooltips that name none. */
  portalContainer?: HTMLElement;
  /** How long after a close the next tooltip with the same `skipDelayKey` opens at once. Default 280ms. */
  skipDelayDuration?: number;
}

function TooltipProvider({
  children,
  delayDuration = DEFAULT_OPEN_DELAY,
  portalContainer,
  skipDelayDuration = DEFAULT_SKIP_DELAY,
}: TooltipProviderProps) {
  const registry = useMemo(() => createRegistry(DEFAULT_SKIP_DELAY), []);

  useLayoutEffect(() => {
    registry.setSkipDelay(skipDelayDuration);
  }, [registry, skipDelayDuration]);

  const value = useMemo(
    () => ({ ...registry, portalContainer }),
    [portalContainer, registry]
  );

  useEffect(() => {
    registry.mount();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !(
          event.target instanceof Element &&
          event.target.closest("[data-ck-tooltip-keyboard-navigation]")
        )
      ) {
        // After the whole dispatch, not in a microtask: a microtask runs between
        // two listeners of this Escape and would remove the tooltip's layer
        // before the menu below it asks whether it is the newest.
        setTimeout(registry.dismissAll, 0);
      }
    };

    window.addEventListener(DISMISS_EVENT, registry.dismissAll);
    window.addEventListener("blur", registry.windowBlur);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      registry.unmount();
      window.removeEventListener(DISMISS_EVENT, registry.dismissAll);
      window.removeEventListener("blur", registry.windowBlur);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [registry]);

  return (
    <DelayContext.Provider value={delayDuration}>
      <ProviderContext.Provider value={value}>
        {children}
      </ProviderContext.Provider>
    </DelayContext.Provider>
  );
}

/** Supplies the default `side` of the popups below it (the Radix `DefaultsProvider`). */
function TooltipDefaultsProvider({
  children,
  side,
}: {
  children?: ReactNode;
  side?: TooltipSide;
}) {
  const inherited = useContext(DefaultSideContext);

  return (
    <DefaultSideContext.Provider value={side ?? inherited}>
      {children}
    </DefaultSideContext.Provider>
  );
}

/** Supplies the page zoom. Popups portalled to the body compensate with CSS `zoom`. */
function TooltipZoomProvider({
  children,
  zoom,
}: {
  children?: ReactNode;
  zoom: number;
}) {
  return <ZoomContext.Provider value={zoom}>{children}</ZoomContext.Provider>;
}

/** Marks the popups below it with `data-ck-overlay-owner`. */
function TooltipOverlayOwnerProvider({
  children,
  id,
}: {
  children?: ReactNode;
  id: string;
}) {
  const value = useMemo(() => ({ id }), [id]);

  return (
    <OverlayOwnerContext.Provider value={value}>
      {children}
    </OverlayOwnerContext.Provider>
  );
}

type OpenChangeHandler = (open: boolean) => void;

/** Everything the app wrapper's controller reads, with its defaults. */
interface TooltipOptions {
  /** Label of the built-in close button; it also makes the tooltip interactive with keyboard navigation. */
  closeButtonLabel?: string;
  /** Closes the tooltip when a press or focus lands outside the trigger and popup. */
  closeOnInteractOutside?: boolean;
  /** The pointer leaving the trigger (or the popup) closes the tooltip. Default on. */
  closeOnPointerLeave?: boolean;
  /** Blur of the trigger (or of the popup) closes the tooltip. Default on. */
  closeOnTriggerBlur?: boolean;
  /**
   * A press on the trigger closes the tooltip. The default is on for an
   * uncontrolled, non-interactive `tooltip` variant and off otherwise.
   */
  closeOnTriggerClick?: boolean;
  /** The provider closes the tooltip when the window loses focus. Default on. */
  closeOnWindowBlur?: boolean;
  defaultOpen?: boolean;
  /** Hover delay in milliseconds. Defaults to the provider's, then 200. */
  delayDuration?: number;
  /** Raises the hover delay to 240ms. */
  delayOpen?: boolean;
  /** Makes the popup `role="dialog"` with this label, and the trigger a dialog opener. */
  dialogLabel?: string;
  /** Pointer movement over the trigger never opens the tooltip. */
  disableHoverOpen?: boolean;
  /** The Radix tooltip's gate: opens only when the trigger overflows or its target is hidden. */
  enabledWhen?: TooltipEnabledWhen;
  /** Anchors the popup to the pointer (`"desktop"` on the desktop app). Ignored when interactive. */
  followPointer?: boolean | "desktop";
  /** Changes the hover delay from the pointer event. Return `undefined` to keep it. */
  getDelayDuration?: (event: PointerLike, delay: number) => number | undefined;
  /** Keeps the popup open while the pointer moves onto it. Default: selectable or a close button. */
  interactive?: boolean;
  /** Tab moves between the trigger and the popup. Default: with a close button. */
  keyboardNavigation?: boolean;
  /** Return `false` to stop the tooltip from opening. */
  onBeforeOpen?: () => boolean | undefined;
  onOpenChange?: OpenChangeHandler;
  /** Controls the tooltip from outside. */
  open?: boolean;
  /** A press on the trigger opens the tooltip at once instead of closing it. */
  openOnClick?: boolean;
  /** Focus anywhere inside the trigger opens it, not only focus on the trigger itself. */
  openOnFocusWithin?: boolean;
  openWhen?: TooltipOpenWhen;
  /** Anchors the popup to this element instead of the trigger. */
  positioningElement?: HTMLElement | null;
  /** Ignores the press that follows opening for 380ms. */
  preventUnintentionalClickToClose?: boolean;
  /** Text in the popup can be selected, which keeps it interactive. */
  selectable?: boolean;
  /** Tooltips with the same key open at once while one with that key was just open. */
  skipDelayKey?: string;
  /** The popup's id. */
  tooltipId?: string;
  /** An existing element to attach the trigger listeners to; the trigger renders no element. */
  triggerElement?: HTMLElement | null;
  /** While the trigger opens another popup, the tooltip stays closed. */
  triggerPopupOpen?: boolean;
  variant?: TooltipVariant;
}

/** The props a caller puts on a trigger, which the tooltip's handlers compose with. */
type TriggerUserProps = HTMLAttributes<HTMLElement>;

/** The tooltip's props for a trigger. */
type TriggerProps = HTMLAttributes<HTMLElement> & {
  "data-state": "closed" | "delayed-open";
};

/** The handlers and state the parts read. */
interface TooltipContextValue {
  /** Bumped when the pointer anchor moves, so the popup repositions. */
  anchorVersion: number;
  close: () => void;
  closeButtonLabel: string | undefined;
  dialogLabel: string | undefined;
  followPointer: boolean;
  /** A press on the trigger is handled (it closes or opens the tooltip). */
  handlesClick: boolean;
  id: string;
  interactive: boolean;
  /** `data-ck-tooltip-keyboard-navigation` is set. */
  keyboardNavigation: boolean;
  open: boolean;
  pointerRef: RefObject<DOMRect | null>;
  popupHandlers: {
    onBlur: ((event: FocusLike) => void) | undefined;
    onKeyDown: ((event: KeyLike) => void) | undefined;
    onPointerEnter: (() => void) | undefined;
    onPointerLeave: ((event: PointerLike) => void) | undefined;
  };
  popupRef: RefObject<HTMLElement | null>;
  setPopup: (element: HTMLElement | null) => () => void;
  setTrigger: (element: HTMLElement | null) => () => void;
  positioningElement: HTMLElement | null | undefined;
  selectable: boolean;
  /** Merges the caller's trigger props with the tooltip's. */
  triggerProps: (user: TriggerUserProps) => TriggerProps;
  triggerElement: HTMLElement | null | undefined;
  triggerRef: RefObject<HTMLElement | null>;
  variant: TooltipVariant;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

const useTooltipContext = () => {
  const context = useContext(TooltipContext);

  if (context === null) {
    throw new Error("Place tooltip parts under a Tooltip root.");
  }

  return context;
};

const isFocusVisible = (element: EventTarget | null) => {
  try {
    return element instanceof Element && element.matches(":focus-visible");
  } catch {
    return false;
  }
};

/**
 * The app wrapper's controller: open state, the hover
 * delay and skip window, the focus, press and pointer handlers, the pointer
 * handoff to an interactive popup, and the keyboard navigation between them.
 */
const useTooltipController = ({
  closeButtonLabel,
  closeOnInteractOutside = false,
  closeOnPointerLeave = true,
  closeOnTriggerBlur = true,
  closeOnTriggerClick,
  closeOnWindowBlur = true,
  defaultOpen,
  delayDuration: delayDurationProp,
  delayOpen,
  dialogLabel,
  disableHoverOpen = false,
  enabledWhen = "default",
  followPointer = false,
  getDelayDuration,
  interactive: interactiveProp,
  keyboardNavigation: keyboardNavigationProp,
  onBeforeOpen,
  onOpenChange,
  open,
  openOnClick = false,
  openOnFocusWithin = false,
  openWhen = "always",
  positioningElement,
  preventUnintentionalClickToClose = false,
  selectable = false,
  skipDelayKey = DEFAULT_SKIP_DELAY_KEY,
  tooltipId,
  triggerElement,
  triggerPopupOpen = false,
  variant = "tooltip",
}: TooltipOptions): TooltipContextValue => {
  const provider = useContext(ProviderContext);
  const providerDelay = useContext(DelayContext);
  const generatedId = useId();
  const id = tooltipId ?? generatedId;

  const delayDuration =
    delayDurationProp ?? providerDelay ?? DEFAULT_OPEN_DELAY;

  const [internalOpen, setInternalOpen] = useState(defaultOpen === true);
  const [anchorVersion, setAnchorVersion] = useState(0);
  const controlled = open !== undefined;

  const interactive =
    interactiveProp ?? (selectable || closeButtonLabel !== undefined);

  const keyboardNavigation =
    keyboardNavigationProp ?? closeButtonLabel !== undefined;

  const defaultClosesOnClick =
    variant === "tooltip" && !interactive && !controlled;

  const closesOnTriggerClick = closeOnTriggerClick ?? defaultClosesOnClick;

  const followsPointer =
    (followPointer === true || followPointer === "desktop") &&
    !interactive &&
    variant === "tooltip";

  const forcedClosed =
    triggerPopupOpen && defaultClosesOnClick && closesOnTriggerClick;

  if (forcedClosed && internalOpen) {
    setInternalOpen(false);
  }

  const visible = !forcedClosed && (open ?? internalOpen);
  const triggerRef = useRef<HTMLElement | null>(triggerElement ?? null);
  const popupRef = useRef<HTMLElement | null>(null);
  const pointerRef = useRef<DOMRect | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const recheckTimerRef = useRef<number | null>(null);
  const clickClosedRef = useRef(false);
  const stopTrackingRef = useRef<(() => void) | null>(null);
  const openRef = useRef(visible);
  const openedAtRef = useRef(0);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearRecheck = useCallback(() => {
    if (recheckTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(recheckTimerRef.current);
      recheckTimerRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    stopTrackingRef.current?.();
    stopTrackingRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clearHoverTimer();
    clearRecheck();
    stopTracking();

    const wasOpen = openRef.current || (controlled && visible);

    openRef.current = false;
    provider?.deactivateTooltip(id);

    if (wasOpen) {
      if (!controlled) {
        setInternalOpen(false);
      }

      onOpenChange?.(false);
    }
  }, [
    clearHoverTimer,
    clearRecheck,
    controlled,
    id,
    onOpenChange,
    provider,
    stopTracking,
    visible,
  ]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (openRef.current === next && !(controlled && visible !== next)) {
        return;
      }

      if (
        next &&
        (!isEnabled(triggerRef.current, enabledWhen) ||
          onBeforeOpen?.() === false)
      ) {
        return;
      }

      openRef.current = next;

      if (next) {
        openedAtRef.current = performance.now();
        provider?.activateTooltip(id, skipDelayKey, variant, dismiss);
      } else {
        provider?.clearHoverHandoffLock(id);
        provider?.deactivateTooltip(id);
      }

      if (!controlled) {
        setInternalOpen(next);
      }

      onOpenChange?.(next);
    },
    [
      controlled,
      dismiss,
      enabledWhen,
      id,
      onBeforeOpen,
      onOpenChange,
      provider,
      skipDelayKey,
      variant,
      visible,
    ]
  );

  useLayoutEffect(() => {
    openRef.current = visible;
    clearHoverTimer();

    if (!visible) {
      clearRecheck();
      stopTracking();
      provider?.clearHoverHandoffLock(id);
      provider?.deactivateTooltip(id);
    }
  }, [clearHoverTimer, clearRecheck, id, provider, stopTracking, visible]);

  // Turning the hover open off drops a pending hover delay.
  useEffect(() => {
    if (disableHoverOpen) {
      clearHoverTimer();
    }
  }, [clearHoverTimer, disableHoverOpen]);

  useEffect(
    () => () => {
      clearHoverTimer();
      clearRecheck();
      stopTracking();
      provider?.clearHoverHandoffLock(id);
      provider?.deactivateTooltip(id);
    },
    [clearHoverTimer, clearRecheck, id, provider, stopTracking]
  );

  useEffect(
    () =>
      provider?.registerTooltipDismissHandler(id, dismiss, closeOnWindowBlur),
    [closeOnWindowBlur, dismiss, id, provider]
  );

  // The tooltip content is a DismissableLayer: a
  // visible tooltip above a menu or dialog keeps Escape to itself and closes.
  useDismissableLayer({
    active: visible,
    modal: false,
    onDismiss: dismiss,
    onInteractOutside: (event) => {
      event.preventDefault();
    },
  });

  useEffect(() => {
    const unregister = visible
      ? provider?.registerOpenTooltip(id, variant, dismiss)
      : undefined;

    return unregister;
  }, [dismiss, id, provider, variant, visible]);

  useLayoutEffect(() => {
    if (!followsPointer) {
      pointerRef.current = null;
    }
  }, [followsPointer]);

  const setTrigger = useCallback((element: HTMLElement | null) => {
    triggerRef.current = element;

    return () => {
      triggerRef.current = null;
    };
  }, []);

  const setPopup = useCallback((element: HTMLElement | null) => {
    popupRef.current = element;

    return () => {
      popupRef.current = null;
    };
  }, []);

  const requestReposition = () => {
    setAnchorVersion((version) => version + 1);
  };

  const clearPointerAnchor = () => {
    if (pointerRef.current !== null) {
      pointerRef.current = null;
      requestReposition();
    }
  };

  /** Open now, or after `delay` once the gate still holds. */
  const attemptOpen = (delay: number) => {
    clearRecheck();
    stopTracking();

    if (forcedClosed || visible || openRef.current) {
      return;
    }

    if (hoverTimerRef.current !== null) {
      if (delay !== 0) {
        return;
      }

      clearHoverTimer();
    }

    if (!isOpenConditionMet(triggerRef.current, openWhen)) {
      return;
    }

    if (delay === 0 || typeof window === "undefined") {
      setOpen(true);
    } else {
      hoverTimerRef.current = window.setTimeout(() => {
        hoverTimerRef.current = null;

        if (isOpenConditionMet(triggerRef.current, openWhen)) {
          setOpen(true);
        }
      }, delay);
    }
  };

  const close = useCallback(() => {
    clearHoverTimer();
    clearRecheck();
    stopTracking();
    setOpen(false);
  }, [clearHoverTimer, clearRecheck, setOpen, stopTracking]);

  useEffect(() => {
    const doc = triggerRef.current?.ownerDocument;

    if (!(visible && closeOnInteractOutside) || doc === undefined) {
      return noop;
    }

    const closeWhenOutside = (event: Event) => {
      if (
        !(
          contains(triggerRef.current, event.target) ||
          contains(popupRef.current, event.target)
        )
      ) {
        close();
      }
    };

    for (const type of ["pointerdown", "click", "focusin"] as const) {
      doc.addEventListener(type, closeWhenOutside, true);
    }

    return () => {
      for (const type of ["pointerdown", "click", "focusin"] as const) {
        doc.removeEventListener(type, closeWhenOutside, true);
      }
    };
  }, [close, closeOnInteractOutside, visible]);

  /** The pointer reached the trigger or the popup. */
  const settle = () => {
    provider?.clearHoverHandoffLock(id);
    clearRecheck();
    stopTracking();
  };

  /** Close unless focus or a text selection is inside the popup. */
  const closeUnlessHeld = () => {
    const popup = popupRef.current;

    if (
      keyboardNavigation &&
      interactive &&
      popup?.contains(popup.ownerDocument.activeElement) === true
    ) {
      return;
    }

    const selection = selectable ? popup?.ownerDocument.getSelection() : null;

    const selectionInside =
      selection !== null &&
      selection !== undefined &&
      !selection.isCollapsed &&
      (popup?.contains(selection.anchorNode) === true ||
        popup?.contains(selection.focusNode) === true);

    if (!selectionInside) {
      close();
    }
  };

  /** Runs a hit test after the pointer stops moving. */
  const scheduleRecheck = (point: Point) => {
    clearRecheck();
    recheckTimerRef.current = window.setTimeout(() => {
      recheckTimerRef.current = null;

      const trigger = triggerRef.current;
      const popup = popupRef.current;
      const hit = trigger?.ownerDocument.elementFromPoint(point.x, point.y);

      if (contains(trigger, hit ?? null) || contains(popup, hit ?? null)) {
        if (stopTrackingRef.current === null) {
          settle();
        } else {
          provider?.clearHoverHandoffLock(id);
        }
      } else {
        closeUnlessHeld();
      }
    }, HANDOFF_RECHECK_MS);
  };

  /** The pointer left the trigger (`content`) or the popup (`reference`). */
  const leave = (
    event: { clientX: number; clientY: number },
    direction: "content" | "reference" = "content"
  ) => {
    clearHoverTimer();
    clearRecheck();
    stopTracking();

    const pointer = { x: event.clientX, y: event.clientY };
    const trigger = triggerRef.current;
    const popup = popupRef.current;

    if (popup === null || trigger === null) {
      scheduleRecheck(pointer);

      return;
    }

    const toTrigger = direction === "reference";
    const placed = popup.dataset.side;
    const side = isTooltipSide(placed) ? placed : "top";

    const stop = trackPointerTriangle({
      destinationElement: toTrigger ? trigger : popup,
      destinationSide: toTrigger ? OPPOSITE_SIDE[side] : side,
      onEnterDestination: settle,
      onMoveInsideTriangle: scheduleRecheck,
      onMoveOutsideTriangle: closeUnlessHeld,
      pointer,
      sourceElement: toTrigger ? popup : trigger,
    });

    if (stop !== null) {
      provider?.setHoverHandoffLockTooltipId(id);
      stopTrackingRef.current = stop;
    }

    scheduleRecheck(pointer);
  };

  /** A pointer entering or moving over the trigger. */
  const handlePointerOpen = (event: PointerLike) => {
    if (
      disableHoverOpen ||
      !contains(triggerRef.current, event.target) ||
      (closesOnTriggerClick && clickClosedRef.current) ||
      event.pointerType === "touch" ||
      provider?.isHoverOpenBlocked(id) === true
    ) {
      return;
    }

    if (followsPointer) {
      if (event.pointerType === "mouse") {
        pointerRef.current = new DOMRect(event.clientX, event.clientY);
        requestReposition();
      } else {
        clearPointerAnchor();
      }
    }

    provider?.clearHoverHandoffLock(id);

    let delay = delayDuration;

    if (delayOpen === true) {
      delay = DELAYED_OPEN_DELAY;
    }

    delay = provider?.getOpenDelay(skipDelayKey, delay) ?? delay;
    delay = getDelayDuration?.(event, delay) ?? delay;
    attemptOpen(delay);
  };

  /** Escape, and Tab between the trigger and an interactive popup. */
  const handleKeyDown = (event: KeyLike) => {
    if (!keyboardNavigation) {
      if (event.key === "Escape") {
        close();
      }

      return;
    }

    if (event.defaultPrevented) {
      return;
    }

    const popup = popupRef.current;
    const trigger = triggerRef.current;

    const focusTarget =
      trigger === null || trigger.tabIndex >= 0
        ? trigger
        : (focusableWithin(trigger)[0] ?? null);

    const inPopup = contains(popup, event.target);

    if (event.key === "Escape") {
      if (
        interactive &&
        inPopup &&
        contains(popup, popup?.ownerDocument.activeElement ?? null)
      ) {
        event.preventDefault();
        event.stopPropagation();
        focusTarget?.focus({ preventScroll: true });
      }

      close();

      return;
    }

    if (
      event.key !== "Tab" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !interactive ||
      !visible ||
      popup === null ||
      trigger === null
    ) {
      return;
    }

    const items = focusableWithin(popup);
    let next: HTMLElement | undefined;

    if (!(inPopup || event.shiftKey)) {
      [next] = items;
    } else if (inPopup && event.shiftKey && event.target === items[0]) {
      next = focusTarget ?? undefined;
    } else if (inPopup && !event.shiftKey && event.target === items.at(-1)) {
      const outside = focusableWithin(trigger.ownerDocument.body).filter(
        (element) => !popup.contains(element)
      );

      const index = focusTarget === null ? -1 : outside.indexOf(focusTarget);

      next = index === -1 ? undefined : outside[index + 1];

      if (next !== undefined && closeOnTriggerBlur) {
        close();
      }
    }

    if (next !== undefined) {
      event.preventDefault();
      next.focus({ preventScroll: true });
    }
  };

  const triggerHandlers = {
    onBlur: (event: FocusLike) => {
      if (
        closeOnTriggerBlur &&
        !(interactive && contains(popupRef.current, event.relatedTarget))
      ) {
        close();
      }
    },
    onClick: (event: PressLike) => {
      if (openOnClick && !event.defaultPrevented) {
        attemptOpen(0);
      } else if (
        closesOnTriggerClick &&
        contains(triggerRef.current, event.target)
      ) {
        clickClosedRef.current = true;
        close();
      }
    },
    onContextMenu: () => {
      clearHoverTimer();
      close();
    },
    onFocus: (event: FocusLike) => {
      let target = event.currentTarget;

      if (closesOnTriggerClick) {
        target = triggerRef.current;
      }

      if (openOnFocusWithin && event.target instanceof HTMLElement) {
        ({ target } = event);
      }

      if (closesOnTriggerClick && event.defaultPrevented) {
        clickClosedRef.current = true;
        close();
      } else if (
        !event.defaultPrevented &&
        (!closesOnTriggerClick || contains(triggerRef.current, event.target)) &&
        isFocusVisible(target)
      ) {
        clickClosedRef.current = false;
        clearPointerAnchor();
        attemptOpen(0);
      }
    },
    onKeyDown: handleKeyDown,
    onPointerEnter: (event: PointerLike) => {
      if (contains(triggerRef.current, event.target)) {
        clickClosedRef.current = false;

        if (interactive && visible) {
          settle();
        }
      }

      handlePointerOpen(event);
    },
    onPointerLeave: (event: PointerLike) => {
      clearHoverTimer();

      if (!closeOnPointerLeave) {
        return;
      }

      if (interactive) {
        leave(event);
      } else {
        close();
        clearPointerAnchor();
      }
    },
    onPointerMove: handlePointerOpen,
  };

  const latestHandlers = useEffectEvent(() => triggerHandlers);

  useEffect(() => {
    if (!(keyboardNavigation && interactive && visible)) {
      return noop;
    }

    const closeFromPopup = (event: KeyboardEvent) => {
      if (event.key === "Escape" && contains(popupRef.current, event.target)) {
        latestHandlers().onKeyDown(event);
      }
    };

    window.addEventListener("keydown", closeFromPopup, true);

    return () => {
      window.removeEventListener("keydown", closeFromPopup, true);
    };
  }, [interactive, keyboardNavigation, visible]);

  useEffect(() => {
    if (triggerElement === null || triggerElement === undefined) {
      return noop;
    }

    triggerRef.current = triggerElement;

    const controller = new AbortController();
    const { signal } = controller;

    triggerElement.addEventListener(
      "click",
      (event) => {
        latestHandlers().onClick(event);
      },
      { signal }
    );
    triggerElement.addEventListener(
      "focusout",
      (event) => {
        latestHandlers().onBlur(event);
      },
      { signal }
    );
    triggerElement.addEventListener(
      "focusin",
      (event) => {
        latestHandlers().onFocus(event);
      },
      { signal }
    );
    triggerElement.addEventListener(
      "contextmenu",
      () => {
        latestHandlers().onContextMenu();
      },
      { signal }
    );
    triggerElement.addEventListener(
      "keydown",
      (event) => {
        latestHandlers().onKeyDown(event);
      },
      { signal }
    );
    triggerElement.addEventListener(
      "pointerover",
      (event) => {
        if (!contains(triggerElement, event.relatedTarget)) {
          latestHandlers().onPointerEnter(event);
        }
      },
      { signal }
    );
    triggerElement.addEventListener(
      "pointerout",
      (event) => {
        if (!contains(triggerElement, event.relatedTarget)) {
          latestHandlers().onPointerLeave(event);
        }
      },
      { signal }
    );
    triggerElement.addEventListener(
      "pointermove",
      (event) => {
        latestHandlers().onPointerMove(event);
      },
      { signal }
    );

    return () => {
      controller.abort();
      clearHoverTimer();
      clearRecheck();
      stopTracking();
      provider?.clearHoverHandoffLock(id);
    };
  }, [
    clearHoverTimer,
    clearRecheck,
    id,
    provider,
    stopTracking,
    triggerElement,
  ]);

  const isPressGuarded = () =>
    preventUnintentionalClickToClose &&
    visible &&
    performance.now() - openedAtRef.current < CLICK_GUARD_MS;

  /** Swallows a press inside the guard window; returns whether it did. */
  const swallowGuardedPress = (event: PressLike) => {
    const guarded = isPressGuarded();

    if (guarded) {
      event.preventDefault();
      event.stopPropagation();
    }

    return guarded;
  };

  const triggerProps = (user: TriggerUserProps): TriggerProps => {
    const dialog = dialogLabel !== undefined;
    const composesClick = closesOnTriggerClick || openOnClick;

    const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
      const swallowed = swallowGuardedPress(event);

      user.onClick?.(event);

      if (!swallowed) {
        triggerHandlers.onClick(event);
      }
    };

    return {
      ...user,
      "aria-controls": dialog && visible ? id : undefined,
      "aria-describedby": dialog
        ? user["aria-describedby"]
        : joinIds(user["aria-describedby"], visible ? id : undefined),
      "aria-expanded": dialog ? visible : undefined,
      "aria-haspopup": dialog ? "dialog" : undefined,
      "data-state": visible ? "delayed-open" : "closed",
      onBlur: (event: ReactFocusEvent<HTMLElement>) => {
        user.onBlur?.(event);
        triggerHandlers.onBlur(event);
      },
      onClick:
        composesClick || preventUnintentionalClickToClose
          ? handleClick
          : user.onClick,
      onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
        user.onContextMenu?.(event);
        triggerHandlers.onContextMenu();
      },
      onFocus: (event: ReactFocusEvent<HTMLElement>) => {
        user.onFocus?.(event);
        triggerHandlers.onFocus(event);
      },
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        user.onKeyDown?.(event);
        triggerHandlers.onKeyDown(event);
      },
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        swallowGuardedPress(event);
        user.onPointerDown?.(event);
      },
      onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
        user.onPointerEnter?.(event);
        triggerHandlers.onPointerEnter(event);
      },
      onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => {
        user.onPointerLeave?.(event);
        triggerHandlers.onPointerLeave(event);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        user.onPointerMove?.(event);
        triggerHandlers.onPointerMove(event);
      },
    };
  };

  return {
    anchorVersion,
    close,
    closeButtonLabel,
    dialogLabel,
    followPointer: followsPointer,
    handlesClick: closesOnTriggerClick || openOnClick,
    id,
    interactive,
    keyboardNavigation: keyboardNavigation && interactive,
    open: visible,
    pointerRef,
    popupHandlers: {
      onBlur:
        interactive && closeOnTriggerBlur
          ? (event) => {
              if (
                !(
                  contains(event.currentTarget ?? null, event.relatedTarget) ||
                  contains(triggerRef.current, event.relatedTarget)
                )
              ) {
                close();
              }
            }
          : undefined,
      onKeyDown: interactive ? handleKeyDown : undefined,
      onPointerEnter: interactive ? settle : undefined,
      onPointerLeave:
        interactive && closeOnPointerLeave
          ? (event) => {
              leave(event, "reference");
            }
          : undefined,
    },
    popupRef,
    positioningElement: positioningElement ?? triggerElement,
    selectable,
    setPopup,
    setTrigger,
    triggerElement,
    triggerProps,
    triggerRef,
    variant,
  };
};

interface TooltipProps extends TooltipOptions {
  children?: ReactNode;
}

const cancelBaseUiChange = (
  _open: boolean,
  details: { cancel: () => void }
) => {
  details.cancel();
};

/**
 * Groups a trigger and its popup. The open state and every interaction come
 * from the app wrapper's controller; Base UI only places and mounts the popup.
 */
function Tooltip({ children, ...options }: TooltipProps) {
  const context = useTooltipController(options);

  return (
    <TooltipContext.Provider value={context}>
      <Primitive.Root
        disableHoverablePopup={!context.interactive}
        open={context.open}
        onOpenChange={cancelBaseUiChange}
      >
        {children}
      </Primitive.Root>
    </TooltipContext.Provider>
  );
}

type TooltipTriggerProps = Omit<ComponentProps<"button">, "children"> & {
  children?: ReactNode;
  render?: ReactElement;
};

/** The trigger: renders a button, or the element given as `render`, with the tooltip's handlers. */
function TooltipTrigger({
  ref: forwardedRef,
  render,
  ...props
}: TooltipTriggerProps) {
  const tooltip = useTooltipContext();

  const { setTrigger } = tooltip;

  const triggerProps = tooltip.triggerProps(props);

  return useRender({
    defaultTagName: "button",
    props:
      render === undefined
        ? { ...triggerProps, type: "button" }
        : { ...triggerProps },
    ref: [forwardedRef ?? null, setTrigger],
    render,
  });
}

const composeHandlers =
  <E,>(
    first: ((event: E) => void) | undefined,
    second: ((event: E) => void) | undefined
  ) =>
  (event: E) => {
    first?.(event);
    second?.(event);
  };

type CloneableTrigger = TriggerUserProps & { ref?: Ref<HTMLElement> };

/** Puts the tooltip's props on the trigger element itself. */
const cloneTrigger = (
  element: ReactElement<CloneableTrigger>,
  tooltipProps: TriggerProps,
  composeClick: boolean,
  ref: Ref<HTMLElement>
) => {
  const own = element.props;

  const onClick = composeClick
    ? composeHandlers(own.onClick, tooltipProps.onClick)
    : (tooltipProps.onClick ?? own.onClick);

  // The component clones the trigger so its own props and the tooltip's compose.
  // oxlint-disable-next-line react/no-clone-element
  return cloneElement(element, {
    ...tooltipProps,
    "aria-controls": tooltipProps["aria-controls"] ?? own["aria-controls"],
    "aria-expanded": tooltipProps["aria-expanded"] ?? own["aria-expanded"],
    "aria-haspopup": tooltipProps["aria-haspopup"] ?? own["aria-haspopup"],
    "aria-describedby": joinIds(
      own["aria-describedby"],
      tooltipProps["aria-describedby"]
    ),
    className: cn(own.className, tooltipProps.className),
    onBlur: composeHandlers(own.onBlur, tooltipProps.onBlur),
    onClick,
    onContextMenu: composeHandlers(
      own.onContextMenu,
      tooltipProps.onContextMenu
    ),
    onFocus: composeHandlers(own.onFocus, tooltipProps.onFocus),
    onKeyDown: composeHandlers(own.onKeyDown, tooltipProps.onKeyDown),
    onPointerDown: composeHandlers(
      own.onPointerDown,
      tooltipProps.onPointerDown
    ),
    onPointerEnter: composeHandlers(
      own.onPointerEnter,
      tooltipProps.onPointerEnter
    ),
    onPointerLeave: composeHandlers(
      own.onPointerLeave,
      tooltipProps.onPointerLeave
    ),
    onPointerMove: composeHandlers(
      own.onPointerMove,
      tooltipProps.onPointerMove
    ),
    ref,
    style: { ...tooltipProps.style, ...own.style },
  });
};

const isHtmlElement = (element: Element | null): element is HTMLElement => {
  const view = element?.ownerDocument.defaultView;

  return view === undefined || view === null
    ? element instanceof HTMLElement
    : element instanceof view.HTMLElement;
};

const isButtonElement = (element: Element | null) => {
  const view = element?.ownerDocument.defaultView;

  return view === undefined || view === null
    ? element instanceof HTMLButtonElement
    : element instanceof view.HTMLButtonElement;
};

/**
 * Dotted underline for a text trigger. Render it
 * as the trigger: `<TooltipTrigger render={<TooltipTriggerDecorator />}>`.
 */
function TooltipTriggerDecorator({
  children,
  className,
  focusable = true,
  unstyled = false,
  ...props
}: ComponentProps<"span"> & {
  focusable?: boolean;
  unstyled?: boolean;
}) {
  return (
    <span
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The decorator makes its text trigger focusable (`tabIndex: 0`).
      tabIndex={focusable ? 0 : undefined}
      {...props}
      className={cn(
        !unstyled &&
          "inline-flex cursor-pointer underline decoration-transparent decoration-dotted transition-[text-decoration] duration-200 ease-(--ck-curve-exit) focus:outline-0 data-[state*=open]:decoration-text-subtle data-[state*=open]:ease-(--ck-curve-enter)",
        className
      )}
    >
      {typeof children === "string" ? <span>{children}</span> : children}
    </span>
  );
}

type TooltipColor =
  | "default"
  | "surface"
  | "inverse"
  | "classicLight"
  | "accent";

type TooltipGutterSize = "sm" | "md" | "lg";

/** The arrow of a coachmark is a rotated square or a curved tab. */
type TooltipCoachmarkArrow = "default" | "curved";

/** Every variant: width, height and clip come from the placement. */
const POPUP_BASE =
  "max-h-[min(var(--radix-tooltip-content-available-height),calc(100vh-16px))] w-fit text-sm break-words whitespace-normal [--radix-tooltip-content-available-height:var(--available-height)] [--radix-tooltip-content-available-width:var(--available-width)] [--radix-tooltip-trigger-width:var(--anchor-width)]";

const TOOLTIP_SURFACES = {
  accent:
    "rounded-2xl border border-current/5 bg-(color:--tooltip-bg) text-(color:--ck-tooltip-ink) leading-4.5 [font-weight:var(--font-weight-body)] tracking-[-0.14px] shadow-(--shadow-xl)",
  classicLight:
    "rounded-full border border-black/10 bg-white text-center text-[14px] leading-[18px] font-semibold tracking-[-0.14px] text-black shadow-(--shadow-xl)",
  default:
    "rounded-2xl border border-current/5 bg-(color:--tooltip-bg) text-center text-(color:--ck-tooltip-ink) leading-4.5 [font-weight:var(--font-weight-body)] tracking-[-0.14px] shadow-(--shadow-xl)",
  inverse:
    "rounded-2xl border border-text bg-fill-primary-solid text-text-strong-solid",
  surface:
    "rounded-md bg-panel-elevated-secondary text-text-muted shadow-[0_0_0_0.5px_var(--border),var(--shadow-xl)] ring-[0.5px] ring-border",
} as const satisfies Record<TooltipColor, string>;

/**
 * The tooltip palette:
 * light is the primary-solid pair, dark is the elevated surface with the
 * normal text. `light-dark` resolves it against the nearest theme scope.
 */
const TOOLTIP_PALETTE =
  "[--tooltip-bg:light-dark(var(--ck-palette-ink),var(--theme-background-control-opaque))] [--ck-tooltip-ink:light-dark(var(--theme-background-control-opaque),var(--ck-palette-ink))] [--tooltip-info:color-mix(in_srgb,var(--ck-tooltip-ink)_70%,var(--ck-palette-label-accent))]";

/** Text tokens inside the default tooltip follow the tooltip text color. */
const TOOLTIP_TEXT_THEME =
  "[--ck-palette-label-accent:var(--tooltip-info)] [--ck-palette-ink-secondary:color-mix(in_oklab,var(--ck-tooltip-ink)_90%,transparent)] [--ck-palette-ink-tertiary:color-mix(in_oklab,var(--ck-tooltip-ink)_80%,transparent)] [--ck-palette-ink:var(--ck-tooltip-ink)]";

const RICH_SURFACE =
  "m-px flex flex-col bg-panel-elevated-secondary text-text shadow-[0_0_0_0.5px_var(--border),var(--shadow-xl)] ring-[0.5px] ring-border";

const FILE_CITATION_SURFACE =
  "flex flex-col overflow-hidden rounded-[12px] border border-border bg-[var(--ck-palette-surface-surface)] tracking-normal text-text shadow-(--shadow-xl) [--ck-palette-ink-secondary:light-dark(var(--color-light-app-text-foreground-secondary),var(--color-dark-app-text-foreground-secondary))] [--ck-palette-ink-tertiary:light-dark(var(--color-light-app-text-foreground-tertiary),var(--color-dark-app-text-foreground-tertiary))] [--ck-palette-ink:light-dark(var(--color-light-ink),var(--color-dark-ink))] [--border:var(--ck-palette-border)] [--ring:var(--ck-palette-border-heavy)] [--text-base:16px] [--text-sm:14px]";

/** Coachmark colors use the blue or info theme roles. */
const COACHMARK_SURFACES = {
  accent:
    "relative flex flex-col rounded-2xl bg-(color:--coachmark-bg) text-white shadow-lg [--coachmark-bg:var(--color-status-info-solid)]",
  default:
    "relative flex flex-col rounded-2xl bg-(color:--coachmark-bg) text-white shadow-lg [--coachmark-bg:var(--color-status-info-solid)]",
  surface:
    "relative flex flex-col rounded-2xl bg-panel-elevated-secondary text-text shadow-lg [--coachmark-bg:var(--theme-background-control-opaque)]",
} as const;

const tooltipPadding = (color: TooltipColor, gutterSize: TooltipGutterSize) => {
  if (color === "surface" || color === "inverse") {
    return "px-2 py-1.5";
  }

  if (color === "default") {
    return {
      lg: "px-4 py-2",
      md: "px-3 py-1.25",
      sm: "px-2 py-1",
    }[gutterSize];
  }

  return "px-3 py-1.25";
};

const coachmarkSurface = (color: TooltipColor) => {
  if (color === "accent") {
    return COACHMARK_SURFACES.accent;
  }

  return color === "surface"
    ? COACHMARK_SURFACES.surface
    : COACHMARK_SURFACES.default;
};

const popupClasses = ({
  color,
  disablePadding,
  gutterSize,
  scrollable,
  variant,
}: {
  color: TooltipColor;
  disablePadding: boolean;
  gutterSize: TooltipGutterSize;
  scrollable: boolean;
  variant: TooltipVariant;
}) => {
  const surfaces = {
    coachmark: coachmarkSurface(color),
    entityPreview: cn(RICH_SURFACE, "rounded-3xl"),
    fileCitation: FILE_CITATION_SURFACE,
    "floating-navigation-rail": "flex flex-col",
    rich: cn(RICH_SURFACE, "rounded-xl"),
    tooltip: cn(
      TOOLTIP_SURFACES[color],
      TOOLTIP_PALETTE,
      !scrollable && "min-h-min",
      !disablePadding && tooltipPadding(color, gutterSize)
    ),
    unstyled: "m-px flex flex-col",
  } as const satisfies Record<TooltipVariant, string>;

  return cn(POPUP_BASE, surfaces[variant], scrollable && "overflow-y-auto");
};

const defaultMaxWidth = (variant: TooltipVariant) =>
  `min(${variant === "fileCitation" ? "352px" : "20rem"}, var(--radix-tooltip-content-available-width), calc(100vw - 16px))`;

/**
 * A number is a width in pixels capped by the available width;
 * a string is any CSS `max-width`, passed through.
 */
const resolveMaxWidth = (
  maxWidth: number | string | undefined,
  variant: TooltipVariant
) => {
  if (typeof maxWidth === "number") {
    return `min(${maxWidth}px, var(--radix-tooltip-content-available-width))`;
  }

  return maxWidth ?? defaultMaxWidth(variant);
};

/** The shortcut chip: the `tooltip` Kbd variant on the default colour, else `default`. */
function TooltipShortcut({
  color,
  children,
}: {
  children: ReactNode;
  color: TooltipColor;
}) {
  return (
    <Kbd
      keysLabel={children}
      variant={color === "default" ? "tooltip" : "default"}
    />
  );
}

const CloseGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-16",
});

function TooltipCloseButton({ label }: { label: string }) {
  const tooltip = useTooltipContext();

  return (
    <button
      aria-label={label}
      className="relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm before:absolute before:-inset-1 focus-visible:outline-2 focus-visible:outline-current"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        tooltip.triggerRef.current?.focus({ preventScroll: true });
        tooltip.close();
      }}
    >
      <CloseGlyph />
    </button>
  );
}

const SCALE_MOTION =
  "origin-(--transform-origin) transition-[background-color] duration-150 [--tw-animation-duration:240ms] [--tw-ease:var(--ck-curve-enter)] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fill-mode-forwards data-closed:fade-out-0 data-closed:zoom-out-[0.98]";

/** The curved arrow's outline, drawn for the `top` side. */
const CURVED_ARROW_PATH =
  "M0 0C4.2 0 6.6 1.3 8.2 4.5C9.6 7.8 9.2 10.8 11.2 12.5C12.4 13.5 13.8 13.5 15.1 12.2C19.4 7.5 25.6 2.6 32.1 0.8C33.8 0.3 34.8 0 36 0H0Z";

const CURVED_ARROW_TRANSFORMS = {
  bottom: "translate(0 14) scale(1 -1)",
  left: "matrix(0 -1 1 0 0 36)",
  right: "matrix(0 1 -1 0 14 0)",
  top: undefined,
} as const satisfies Record<TooltipSide, string | undefined>;

const placedSide = (side: string): TooltipSide => {
  if (side === "left" || side === "inline-start") {
    return "left";
  }

  if (side === "right" || side === "inline-end") {
    return "right";
  }

  return side === "bottom" ? "bottom" : "top";
};

const isVertical = (side: TooltipSide) => side === "left" || side === "right";

/** The arrow sits on the popup edge facing the trigger, `--arrow-offset` out. */
const ARROW_EDGE = {
  bottom: "top-(--arrow-offset)",
  left: "right-(--arrow-offset)",
  right: "left-(--arrow-offset)",
  top: "bottom-(--arrow-offset)",
} as const satisfies Record<TooltipSide, string>;

/** The arrow's square side, and the size of the curved tab. */
const ARROW_SQUARE = 11;
const CURVED_ARROW_SHORT = 14;
const CURVED_ARROW_LONG = 36;

/**
 * The coachmark's arrow: a rotated square or a curved tab on the
 * edge facing the trigger, `scale` times its size under a page zoom.
 */
function CoachmarkArrow({
  color,
  curved,
  scale,
}: {
  color: TooltipColor;
  curved: boolean;
  scale: number;
}) {
  const surface = color === "surface";

  return (
    <Primitive.Arrow
      className={cn(
        "pointer-events-none absolute h-(--arrow-height) w-(--arrow-width)",
        !curved &&
          cn(
            "rotate-45 rounded-2xs",
            surface
              ? "bg-panel-elevated-secondary"
              : "bg-(color:--coachmark-bg)"
          )
      )}
      render={(props, state) => {
        const side = placedSide(state.side);
        const vertical = isVertical(side);
        let width = ARROW_SQUARE;
        let height = ARROW_SQUARE;

        if (curved) {
          width = vertical ? CURVED_ARROW_SHORT : CURVED_ARROW_LONG;
          height = vertical ? CURVED_ARROW_LONG : CURVED_ARROW_SHORT;
        }

        const arrowStyle: CustomStyle = {
          ...props.style,
          "--arrow-height": `${height * scale}px`,
          "--arrow-offset": `${-(curved ? CURVED_ARROW_SHORT : ARROW_SQUARE / 2) * scale}px`,
          "--arrow-width": `${width * scale}px`,
        };

        return (
          <div
            {...props}
            className={cn(props.className, ARROW_EDGE[side])}
            style={arrowStyle}
          >
            {curved ? (
              <svg
                aria-hidden="true"
                className={vertical ? undefined : "rtl:-scale-x-100"}
                fill={
                  surface
                    ? "var(--theme-background-control-opaque)"
                    : "var(--coachmark-bg)"
                }
                height="100%"
                viewBox={vertical ? "0 0 14 36" : "0 0 36 14"}
                width="100%"
              >
                <path
                  d={CURVED_ARROW_PATH}
                  transform={CURVED_ARROW_TRANSFORMS[side]}
                />
              </svg>
            ) : null}
          </div>
        );
      }}
    />
  );
}

interface TooltipPopupPresentation extends Pick<
  Primitive.Positioner.Props,
  "align" | "collisionPadding"
> {
  /** Shift along the edge, in pixels. */
  alignOffset?: number;
  /** Class of the content inside the popup. */
  bodyClassName?: string;
  /** The coachmark's arrow: a rotated square or a curved tab. */
  coachmarkArrow?: TooltipCoachmarkArrow;
  color?: TooltipColor;
  container?: Primitive.Portal.Props["container"];
  /** Drops the padding of the `tooltip` variant. */
  disablePadding?: boolean;
  /** Whether a flipped placement may also change alignment. */
  flipAlignment?: boolean;
  /** Keeps the closed popup in the document, hidden. */
  forceMount?: boolean;
  gutterSize?: TooltipGutterSize;
  /** Hides the popup while its trigger is scrolled out of view (the Radix variant). */
  hideWhenDetached?: boolean;
  /**
   * A number is a width in pixels capped by the available width (Radix); a
   * string is any CSS `max-width`. Default `min(20rem, ...)`, or 352px for a file citation.
   */
  maxWidth?: number | string;
  /** `"scale"` is the Radix variant's `scale-in`/`scale-out`. The app wrapper has none. */
  motion?: "none" | "scale";
  /** Divides the available size by the page zoom, as the rich and file-citation variants do. */
  scaleAvailableSizeWithZoom?: boolean;
  /** Scrolls the content when it is taller than the available height. */
  scrollable?: boolean;
  shortcut?: string;
  /** Default `top`, or `bottom` when the trigger has `--ck-tooltip-side: bottom`. */
  side?: TooltipSide;
  sideOffset?: number;
}

interface TooltipPopupProps
  extends
    Omit<Primitive.Popup.Props, "children" | "color" | "style">,
    TooltipPopupPresentation {
  children?: ReactNode;
}

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const unsubscribeNothing = (): void => undefined;

/** The value is read from the DOM on each render, so there is nothing to subscribe to. */
const subscribeNothing = () => unsubscribeNothing;

/** Reads `--ck-tooltip-side` from the trigger, as the component does while positioned. */
const useThemeSide = (
  triggerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  open: boolean
): "top" | "bottom" =>
  useSyncExternalStore(
    subscribeNothing,
    () => {
      const trigger = triggerRef.current;

      if (!(enabled && open && trigger)) {
        return "top";
      }

      const value = getComputedStyle(trigger)
        .getPropertyValue("--ck-tooltip-side")
        .trim();

      return value === "bottom" ? "bottom" : "top";
    },
    () => "top"
  );

function TooltipPopupBody({
  bodyClassName,
  children,
  color,
  disablePadding,
  shortcut,
}: Pick<TooltipPopupProps, "bodyClassName" | "children" | "shortcut"> & {
  color: TooltipColor;
  disablePadding: boolean;
}) {
  const { closeButtonLabel, variant } = useTooltipContext();
  const isTooltip = variant === "tooltip";

  return (
    <div
      className={cn(
        "flex gap-2",
        isTooltip ? "items-center" : "min-h-0 flex-1 items-stretch",
        isTooltip && color === "default" && TOOLTIP_TEXT_THEME
      )}
    >
      <div
        className={cn(
          "min-w-0",
          isTooltip ? "text-balance" : "flex min-h-0 w-full",
          variant === "coachmark" && "overflow-y-auto",
          variant === "coachmark" && !disablePadding && "px-4 py-3",
          closeButtonLabel !== undefined && "flex items-start gap-2",
          bodyClassName
        )}
      >
        {children}
        {closeButtonLabel === undefined ? null : (
          <TooltipCloseButton label={closeButtonLabel} />
        )}
      </div>
      {shortcut === undefined ? null : (
        <TooltipShortcut
          color={isTooltip && color === "default" ? "default" : "surface"}
        >
          {shortcut}
        </TooltipShortcut>
      )}
    </div>
  );
}

/** The empty rectangle the anchor reports before it has a trigger. */
const EMPTY_RECT = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
};

/** The pointer, else the positioning element, else the trigger. */
const createVirtualAnchor = (
  pointerRef: RefObject<DOMRect | null>,
  triggerRef: RefObject<HTMLElement | null>,
  reference: HTMLElement | null | undefined
) => ({
  contextElement: reference ?? triggerRef.current ?? undefined,
  getBoundingClientRect: () =>
    pointerRef.current ??
    reference?.getBoundingClientRect() ??
    triggerRef.current?.getBoundingClientRect() ??
    EMPTY_RECT,
});

function TooltipPopup({
  align,
  alignOffset,
  bodyClassName,
  children,
  className,
  coachmarkArrow,
  collisionPadding = COLLISION_PADDING,
  color = "default",
  container,
  disablePadding = false,
  flipAlignment,
  forceMount,
  gutterSize = "md",
  hideWhenDetached,
  maxWidth,
  motion,
  ref: forwardedRef,
  scaleAvailableSizeWithZoom = false,
  scrollable = false,
  shortcut,
  side,
  sideOffset,
  ...props
}: TooltipPopupProps) {
  const tooltip = useTooltipContext();
  const provider = useContext(ProviderContext);
  const platformContainer = usePortalContainer();
  const zoom = useContext(ZoomContext);
  const owner = useContext(OverlayOwnerContext);
  const defaultSide = useContext(DefaultSideContext);
  const { variant } = tooltip;
  const portalContainer = container ?? provider?.portalContainer;

  // Without a container, a page zoom is compensated on the popup itself.
  const zoomed =
    (portalContainer === null || portalContainer === undefined) && zoom !== 1;

  const appliedZoom = zoomed ? zoom : 1;
  const coachmarkScale = variant === "coachmark" ? appliedZoom : 1;

  const sizeScale =
    scaleAvailableSizeWithZoom ||
    variant === "rich" ||
    variant === "fileCitation"
      ? appliedZoom
      : coachmarkScale;

  const themeSide = useThemeSide(
    tooltip.triggerRef,
    side === undefined &&
      defaultSide === undefined &&
      variant === "tooltip" &&
      (color === "default" || color === "classicLight"),
    tooltip.open
  );

  const { setPopup } = tooltip;

  const setRef = useMemo(
    () => mergeRefs(forwardedRef, setPopup),
    [forwardedRef, setPopup]
  );

  const reference = tooltip.positioningElement;

  const virtualAnchor = createVirtualAnchor(
    tooltip.pointerRef,
    tooltip.triggerRef,
    reference
  );

  let anchor: Element | typeof virtualAnchor = virtualAnchor;

  if (!tooltip.followPointer && reference) {
    anchor = reference;
  }

  const tallContent = variant === "rich" || variant === "fileCitation";
  const arrowScale = coachmarkScale;

  const arrow =
    variant === "coachmark" ? (
      <CoachmarkArrow
        color={color}
        curved={coachmarkArrow === "curved"}
        scale={arrowScale}
      />
    ) : null;

  const { interactive } = tooltip;

  const {
    onBlur: handlePopupBlur,
    onKeyDown: handlePopupKeyDown,
    onPointerEnter: handlePopupPointerEnter,
    onPointerLeave: handlePopupPointerLeave,
  } = tooltip.popupHandlers;

  const popupStyle: CustomStyle = {
    "--radix-tooltip-content-available-height": `max(0px, calc(var(--available-height) / ${sizeScale}))`,
    "--radix-tooltip-content-available-width": `max(0px, calc(var(--available-width) / ${sizeScale}))`,
    "--tooltip-max-width": resolveMaxWidth(maxWidth, variant),
    "--tooltip-zoom": String(zoom),
  };

  return (
    <Primitive.Portal
      container={portalContainer ?? platformContainer ?? undefined}
      keepMounted={forceMount}
    >
      <Primitive.Positioner
        align={align}
        alignOffset={(alignOffset ?? 0) * coachmarkScale}
        anchor={anchor}
        arrowPadding={
          variant === "coachmark"
            ? COACHMARK_ARROW_PADDING * coachmarkScale
            : undefined
        }
        className={cn(
          variant === "floating-navigation-rail" ? "z-20" : "z-50",
          hideWhenDetached === true && "data-anchor-hidden:invisible",
          !interactive && "pointer-events-none"
        )}
        collisionAvoidance={{
          align: flipAlignment === false ? "none" : "flip",
          fallbackAxisSide: tallContent ? "end" : "none",
          side: "flip",
        }}
        collisionPadding={collisionPadding}
        data-ck-overlay-owner={zoomed ? owner?.id : undefined}
        side={side ?? defaultSide ?? themeSide}
        sideOffset={() => {
          const base =
            sideOffset ??
            (tooltip.followPointer && tooltip.pointerRef.current !== null
              ? POINTER_SIDE_OFFSET
              : DEFAULT_SIDE_OFFSET);

          return base * coachmarkScale;
        }}
      >
        <Primitive.Popup
          {...props}
          ref={setRef}
          aria-hidden={tooltip.open ? undefined : true}
          aria-label={tooltip.dialogLabel}
          className={(state) =>
            cn(
              popupClasses({
                color,
                disablePadding,
                gutterSize,
                scrollable,
                variant,
              }),
              "max-w-(--tooltip-max-width)",
              zoomed && "[zoom:var(--tooltip-zoom)]",
              tooltip.selectable ? "select-text" : "select-none",
              tooltip.open && interactive
                ? "pointer-events-auto"
                : "pointer-events-none",
              motion === "scale" && SCALE_MOTION,
              typeof className === "function" ? className(state) : className
            )
          }
          data-ck-overlay-owner={owner?.id}
          data-ck-tooltip-keyboard-navigation={
            tooltip.keyboardNavigation ? "" : undefined
          }
          id={tooltip.id}
          role={tooltip.dialogLabel === undefined ? "tooltip" : "dialog"}
          style={popupStyle}
          onBlur={handlePopupBlur}
          onKeyDown={handlePopupKeyDown}
          onPointerEnter={handlePopupPointerEnter}
          onPointerLeave={handlePopupPointerLeave}
        >
          <TooltipPopupBody
            bodyClassName={bodyClassName}
            color={color}
            disablePadding={disablePadding}
            shortcut={shortcut}
          >
            {children}
          </TooltipPopupBody>
          {zoomed ? null : arrow}
        </Primitive.Popup>
        {zoomed ? arrow : null}
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}

/** `ReactNode` without promises, so the hint can return its children as they are. */
type HintChildren = Exclude<ReactNode, Promise<unknown>>;

interface TooltipHintProps
  extends
    TooltipOptions,
    Omit<TooltipPopupPresentation, "bodyClassName">,
    Omit<
      ComponentProps<"span">,
      "children" | "color" | "content" | "defaultValue" | "ref"
    > {
  /** The trigger element, or text. */
  children?: HintChildren;
  /** Clones a component trigger instead of wrapping it in a `display: contents` span. */
  cloneCustomTrigger?: boolean;
  /** The popup content. `null` or `undefined`, or `disabled`, renders only the trigger. */
  content?: ReactNode;
  disabled?: boolean;
  /** Controls the tooltip from outside: `true` shows it, `false` hides it. */
  forceOpen?: boolean;
  /** Alias of `delayDuration`. */
  openDelay?: number;
  ref?: Ref<HTMLElement>;
  /** The Radix tooltip's `requiresFocus`: hovering never opens it, only keyboard focus does. */
  requiresFocus?: boolean;
  /** Class of the content inside the popup. */
  tooltipBodyClassName?: string;
  /** Class of the popup; `className` is the trigger's. */
  tooltipClassName?: string;
  /** Renders a `<button>` around the children instead of using them as the trigger. */
  triggerAsChild?: boolean;
  /** Receives the trigger element when it is a button. */
  triggerRef?: Ref<HTMLElement>;
}

/** The `triggerRef` only ever holds a button. */
const buttonOnlyRef =
  (ref: Ref<HTMLElement> | undefined) => (element: HTMLElement | null) =>
    ref !== undefined && (element === null || isButtonElement(element))
      ? assignRef(ref, element)
      : undefined;

/** The trigger markup the app wrapper builds around its children. */
function HintTrigger({
  children,
  className,
  cloneCustomTrigger,
  forwardedRef,
  triggerAsChild,
  triggerRef,
  user,
}: {
  children: HintChildren;
  className: string | undefined;
  cloneCustomTrigger: boolean;
  forwardedRef: Ref<HTMLElement> | undefined;
  triggerAsChild: boolean;
  triggerRef: Ref<HTMLElement> | undefined;
  user: TriggerUserProps;
}) {
  const tooltip = useTooltipContext();
  const { setTrigger } = tooltip;

  const childRef = isValidElement<{ ref?: Ref<HTMLElement> }>(children)
    ? children.props.ref
    : undefined;

  const plainRef = useMemo(
    () => mergeRefs(forwardedRef, setTrigger),
    [forwardedRef, setTrigger]
  );

  const buttonRef = useMemo(
    () => mergeRefs(forwardedRef, setTrigger, buttonOnlyRef(triggerRef)),
    [forwardedRef, setTrigger, triggerRef]
  );

  const cloneRef = useMemo(
    () =>
      mergeRefs(forwardedRef, setTrigger, childRef, buttonOnlyRef(triggerRef)),
    [childRef, forwardedRef, setTrigger, triggerRef]
  );

  // A wrapped component's trigger is the wrapper's first element.
  const wrapperRef = useCallback(
    (element: HTMLSpanElement | null) => {
      const first = element?.firstElementChild ?? null;

      return plainRef(isHtmlElement(first) ? first : element);
    },
    [plainRef]
  );

  if (tooltip.triggerElement !== null && tooltip.triggerElement !== undefined) {
    return children;
  }

  const props = tooltip.triggerProps({ ...user, className });

  if (!triggerAsChild) {
    return (
      <button {...props} ref={buttonRef} type="button">
        {children}
      </button>
    );
  }

  if (!isValidElement<TriggerUserProps>(children)) {
    return (
      <span {...props} ref={plainRef}>
        {children}
      </span>
    );
  }

  if (typeof children.type !== "string" && !cloneCustomTrigger) {
    return (
      <span {...props} ref={wrapperRef} className={cn("contents", className)}>
        {children}
      </span>
    );
  }

  return cloneTrigger(children, props, tooltip.handlesClick, cloneRef);
}

/**
 * The app wrapper: wraps a trigger element with its tooltip. Missing
 * content (`null` or `undefined`) or `disabled` renders just the trigger.
 */
function TooltipHint({
  align,
  alignOffset,
  children,
  className,
  cloneCustomTrigger = false,
  closeButtonLabel,
  closeOnInteractOutside,
  closeOnPointerLeave,
  closeOnTriggerBlur,
  closeOnTriggerClick,
  closeOnWindowBlur,
  coachmarkArrow,
  collisionPadding,
  color,
  container,
  content,
  defaultOpen,
  delayDuration,
  delayOpen,
  dialogLabel,
  disableHoverOpen = false,
  disabled = false,
  disablePadding,
  enabledWhen,
  flipAlignment,
  followPointer,
  forceMount,
  forceOpen,
  getDelayDuration,
  gutterSize,
  hideWhenDetached,
  interactive,
  keyboardNavigation,
  maxWidth,
  motion,
  onBeforeOpen,
  onOpenChange,
  open,
  openDelay,
  openOnClick,
  openOnFocusWithin,
  openWhen,
  positioningElement,
  preventUnintentionalClickToClose,
  ref,
  requiresFocus = false,
  scaleAvailableSizeWithZoom,
  scrollable,
  selectable,
  shortcut,
  side,
  sideOffset,
  skipDelayKey,
  tooltipBodyClassName,
  tooltipClassName,
  tooltipId,
  triggerAsChild = true,
  triggerElement,
  triggerPopupOpen,
  triggerRef,
  variant,
  ...user
}: TooltipHintProps) {
  if (disabled || content === undefined || content === null) {
    return children;
  }

  return (
    <Tooltip
      closeButtonLabel={closeButtonLabel}
      closeOnInteractOutside={closeOnInteractOutside}
      closeOnPointerLeave={closeOnPointerLeave}
      closeOnTriggerBlur={closeOnTriggerBlur}
      closeOnTriggerClick={closeOnTriggerClick}
      closeOnWindowBlur={closeOnWindowBlur}
      defaultOpen={defaultOpen}
      delayDuration={delayDuration ?? openDelay}
      delayOpen={delayOpen}
      dialogLabel={dialogLabel}
      disableHoverOpen={disableHoverOpen || requiresFocus}
      enabledWhen={enabledWhen}
      followPointer={followPointer}
      getDelayDuration={getDelayDuration}
      interactive={interactive}
      keyboardNavigation={keyboardNavigation}
      open={forceOpen ?? open}
      openOnClick={openOnClick}
      openOnFocusWithin={openOnFocusWithin}
      openWhen={openWhen}
      positioningElement={positioningElement}
      preventUnintentionalClickToClose={preventUnintentionalClickToClose}
      selectable={selectable}
      skipDelayKey={skipDelayKey}
      tooltipId={tooltipId}
      triggerElement={triggerElement}
      triggerPopupOpen={triggerPopupOpen}
      variant={variant}
      onBeforeOpen={onBeforeOpen}
      onOpenChange={onOpenChange}
    >
      <HintTrigger
        className={className}
        cloneCustomTrigger={cloneCustomTrigger}
        forwardedRef={ref}
        triggerAsChild={triggerAsChild}
        triggerRef={triggerRef}
        user={user}
      >
        {children}
      </HintTrigger>
      <TooltipPopup
        align={align}
        alignOffset={alignOffset}
        bodyClassName={tooltipBodyClassName}
        className={tooltipClassName}
        coachmarkArrow={coachmarkArrow}
        collisionPadding={collisionPadding}
        color={color}
        container={container}
        disablePadding={disablePadding}
        flipAlignment={flipAlignment}
        forceMount={forceMount}
        gutterSize={gutterSize}
        hideWhenDetached={hideWhenDetached}
        maxWidth={maxWidth}
        motion={motion}
        scaleAvailableSizeWithZoom={scaleAvailableSizeWithZoom}
        scrollable={scrollable}
        shortcut={shortcut}
        side={side}
        sideOffset={sideOffset}
      >
        {content}
      </TooltipPopup>
    </Tooltip>
  );
}

export {
  dismissTooltips,
  Tooltip,
  TooltipDefaultsProvider,
  TooltipHint,
  TooltipOverlayOwnerProvider,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
  TooltipTriggerDecorator,
  TooltipZoomProvider,
  useTooltipDelay,
};

export type {
  TooltipCoachmarkArrow,
  TooltipColor,
  TooltipEnabledWhen,
  TooltipHintProps,
  TooltipOpenWhen,
  TooltipOptions,
  TooltipPopupProps,
  TooltipProps,
  TooltipProviderProps,
  TooltipTriggerProps,
  TooltipVariant,
};
