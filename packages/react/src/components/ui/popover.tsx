"use client";

/* oxlint-disable anti-slop/no-runtime-typeof -- Refs are either callbacks or objects. */

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size as sizeMiddleware,
  useFloating,
} from "@floating-ui/react-dom";
import type { Middleware } from "@floating-ui/react-dom";
import { useFocusScope } from "@workspace/react/components/dialog/dialog-layer";
import type { FocusScope } from "@workspace/react/components/dialog/dialog-layer";
import { useDismissableLayer } from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  ReactNode,
  Ref,
  RefObject,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";

import styles from "@workspace/react/components/popover/popover.module.css";

type PopoverSide = "bottom" | "left" | "right" | "top";

type PopoverAlign = "center" | "end" | "start";

type PopoverSize =
  | "anchor"
  | "content"
  | "default"
  | "extraLarge"
  | "large"
  | "menuWide"
  | "railMenu"
  | "wide"
  | "workspace";

type PopoverVariant = "comment" | "default" | "menu";

type CustomProperties = CSSProperties & {
  [name: `--${string}`]: string | undefined;
};

const noop = () => {
  /* nothing to clean up */
};

/** Merges refs and keeps the cleanup functions callback refs may return. */
const mergeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (node: T | null) => {
    const cleanups: (() => void)[] = [];

    for (const ref of refs) {
      if (typeof ref === "function") {
        const cleanup = ref(node);

        if (typeof cleanup === "function") {
          cleanups.push(() => {
            cleanup();
          });
        } else {
          cleanups.push(() => {
            ref(null);
          });
        }
      } else if (ref) {
        ref.current = node;
        cleanups.push(() => {
          ref.current = null;
        });
      }
    }

    // A null node is React detaching a ref it has no cleanup for.
    if (node === null) {
      for (const cleanup of cleanups) {
        cleanup();
      }

      return noop;
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

// Width by size.
const sizeClasses: Record<PopoverSize, string> = {
  anchor: "w-(--radix-popover-trigger-width)",
  content: "w-fit",
  default: "w-72",
  extraLarge: "w-[408px]",
  large: "w-96",
  menuWide: "w-60",
  railMenu: "w-57",
  wide: "w-160",
  workspace: "w-65",
};

// The Electron token layer defines these once on the root; an ancestor may redefine them, so each read keeps the
// value as its fallback. --color-border resolves to --ck-palette-border there.
const surfaceClasses = {
  comment: "rounded-2xl shadow-(--shadow-lg) ring-1 ring-stroke-subtle",
  default:
    "rounded-xl shadow-(--shadow-popover-overlay,var(--shadow-lg)) ring-(--color-stroke-overlay,var(--ck-palette-border)) ring-(length:--ck-flyout-overlay-ring-width,0.5px)",
  menu: "rounded-2xl p-[var(--ck-popup-gutter,var(--spacing))] text-text shadow-(--shadow-dropdown-overlay,0_0_0_0.5px_var(--ck-palette-border),var(--shadow-xl))",
} as const;

/** Radix state attribute value for an open flag. */
const stateOf = (open: boolean) => (open ? "open" : "closed");

/** Scale the host applies to the whole UI. */
const PopoverUiScaleContext = createContext(1);

interface PopoverOverlayOwner {
  id: string;
  /** Called while the popover is open; its result is the cleanup. */
  registerOpen?: () => (() => void) | undefined;
}

/** Overlay owner a popover registers with. */
const PopoverOverlayOwnerContext = createContext<
  PopoverOverlayOwner | undefined
>(undefined);

/**
 * Ref a host shell shares with its popovers so closing one returns focus to
 * the control that held it when the popover opened.
 */
const PopoverFocusRestoreContext = createContext<
  { current: Element | null | undefined } | undefined
>(undefined);

const createFocusRestoration = (
  restore: { current: Element | null | undefined } | undefined
) => {
  let opener: HTMLElement | null = null;
  let content: HTMLElement | null = null;
  let interactedOutside = false;

  return {
    onCloseAutoFocus(event: Event) {
      if (restore === undefined || event.defaultPrevented) {
        return;
      }

      restore.current = undefined;

      if (!document.hasFocus()) {
        event.preventDefault();

        return;
      }

      const active = document.activeElement;

      if (
        active !== document.body &&
        active !== opener &&
        content?.contains(active) !== true
      ) {
        event.preventDefault();
      } else if (
        !interactedOutside &&
        opener?.isConnected === true &&
        opener !== document.body &&
        opener.closest("[inert]") === null
      ) {
        event.preventDefault();
        opener.focus({ preventScroll: true });
      }
    },
    onInteractOutside(event: Event) {
      if (!event.defaultPrevented) {
        interactedOutside = true;
      }
    },
    onOpenAutoFocus(event: Event, keep = false) {
      if (restore === undefined) {
        return;
      }

      const active = restore.current ?? document.activeElement;
      restore.current = keep ? active : undefined;
      opener = active instanceof HTMLElement ? active : null;
      content = event.target instanceof HTMLElement ? event.target : null;
      interactedOutside = false;
    },
  };
};

// When the trigger sits in a menu overlay
// surface, the popover moves out by the distance between the two edges.
const followMenuSurface = (
  start: Element | null,
  side: PopoverSide,
  setOffset: (offset: number) => void
) => {
  let element = start;

  while (element !== null && getComputedStyle(element).display === "contents") {
    const child = element.firstElementChild;
    element = child instanceof HTMLElement ? child : null;
  }

  const surface = element?.closest("[data-ck-menu-overlay-surface]") ?? null;

  if (element === null || surface === null) {
    setOffset(0);

    return noop;
  }

  const target = element;

  const measure = () => {
    const rect = target.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();

    const distance =
      side === "top" || side === "left"
        ? rect[side] - surfaceRect[side]
        : surfaceRect[side] - rect[side];

    setOffset(Math.max(0, distance));
  };

  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(target);
  observer.observe(surface);
  const view = target.ownerDocument.defaultView;
  view?.addEventListener("resize", measure);

  return () => {
    observer.disconnect();
    view?.removeEventListener("resize", measure);
  };
};

// Based on the Radix focus scope helpers.
const activeElementOf = () => {
  let element = document.activeElement;

  while (element?.shadowRoot?.activeElement) {
    element = element.shadowRoot.activeElement;
  }

  return element;
};

const containsAcrossShadow = (container: Element, node: Node | null) => {
  let current = node;

  while (current) {
    if (container.contains(current)) {
      return true;
    }

    const root = current.getRootNode();
    current = root instanceof ShadowRoot ? root.host : null;
  }

  return false;
};

const focusElement = (element: Element | null, select = false) => {
  if (element instanceof HTMLElement) {
    const before = activeElementOf();
    element.focus({ preventScroll: true });

    if (element !== before && select && element instanceof HTMLInputElement) {
      element.select();
    }
  }
};

const childrenOf = (
  element: HTMLElement,
  root: ShadowRoot | null
): Iterable<Element> => {
  if (root) {
    return root.children;
  }

  if (element instanceof HTMLSlotElement) {
    return element.assignedElements({ flatten: true });
  }

  return element.children;
};

const tabbableCandidatesOf = (container: Element) => {
  const candidates: HTMLElement[] = [];

  const visit = (element: Element) => {
    if (!(element instanceof HTMLElement) || element.hidden !== false) {
      return;
    }

    if ("inert" in element && element.inert) {
      return;
    }

    const root = element.shadowRoot;

    const hiddenInput =
      element instanceof HTMLInputElement && element.type === "hidden";

    const disabled = "disabled" in element && element.disabled === true;

    if (
      !disabled &&
      !hiddenInput &&
      element.tabIndex >= 0 &&
      root?.delegatesFocus !== true
    ) {
      candidates.push(element);
    }

    if (root && element.hasAttribute("tabindex") && element.tabIndex < 0) {
      return;
    }

    for (const child of childrenOf(element, root)) {
      visit(child);
    }
  };

  for (const child of container.children) {
    visit(child);
  }

  return candidates;
};

const isHiddenWithin = (element: Element, upTo: Element) => {
  if (getComputedStyle(element).visibility === "hidden") {
    return true;
  }

  let current: Element | null = element;

  while (current) {
    if (current === upTo) {
      return false;
    }

    if (getComputedStyle(current).display === "none") {
      return true;
    }

    const root: Node = current.getRootNode();

    const next: Element | null = current.assignedSlot ?? current.parentElement;
    current = next ?? (root instanceof ShadowRoot ? root.host : null);
  }

  return false;
};

const firstVisible = (elements: HTMLElement[], container: Element) =>
  elements.find((element) => !isHiddenWithin(element, container)) ?? null;

const tabbableEdgesOf = (container: Element) => {
  const candidates = tabbableCandidatesOf(container);

  return [
    firstVisible(candidates, container),
    firstVisible(candidates.toReversed(), container),
  ] as const;
};

// Based on the FocusScope key handler with loop on: Tab wraps
// between the first and last tabbable element inside the content.
const loopTabFocus = (
  event: KeyboardEvent,
  container: HTMLElement,
  scope: FocusScope
) => {
  if (
    scope.paused ||
    event.key !== "Tab" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }

  const active = activeElementOf();

  if (!active) {
    return;
  }

  const [first, last] = tabbableEdgesOf(container);

  if (first && last) {
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      focusElement(first, true);
    } else if (event.shiftKey && (active === first || active === container)) {
      event.preventDefault();
      focusElement(last, true);
    }
  } else if (active === container) {
    event.preventDefault();
  }
};

// Mount autofocus: the first element that takes focus, skipping links, else
// the content itself.
const focusFirstInside = (container: HTMLElement) => {
  const before = activeElementOf();

  for (const candidate of tabbableCandidatesOf(container).filter(
    (element) => element.tagName !== "A"
  )) {
    focusElement(candidate, true);

    if (activeElementOf() !== before) {
      return;
    }
  }

  if (activeElementOf() === before) {
    focusElement(container);
  }
};

// Based on the Radix Presence hook.
// The content stays mounted while a CSS animation that differs from the one it
// ran while open is playing, and leaves on animationend or animationcancel.
// Transitions and animations on descendants do not hold it.
type PresenceState = "mounted" | "unmounted" | "unmountSuspended";

type PresenceEvent = "ANIMATION_END" | "ANIMATION_OUT" | "MOUNT" | "UNMOUNT";

const presenceTransitions: Record<
  PresenceState,
  Partial<Record<PresenceEvent, PresenceState>>
> = {
  mounted: { ANIMATION_OUT: "unmountSuspended", UNMOUNT: "unmounted" },
  unmountSuspended: { ANIMATION_END: "unmounted", MOUNT: "mounted" },
  unmounted: { MOUNT: "mounted" },
};

const presenceReducer = (state: PresenceState, event: PresenceEvent) =>
  presenceTransitions[state][event] ?? state;

const animationNameOf = (computed: CSSStyleDeclaration | null) => {
  const name = computed?.animationName;

  return name === undefined || name === "" ? "none" : name;
};

const usePresence = (present: boolean) => {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const computed = useRef<CSSStyleDeclaration | null>(null);
  const wasPresent = useRef(present);
  const previousAnimation = useRef("none");
  const openedAnimation = useRef<string | undefined>(undefined);

  const [state, send] = useReducer(
    presenceReducer,
    present ? "mounted" : "unmounted"
  );

  useEffect(() => {
    if (state === "mounted") {
      previousAnimation.current =
        openedAnimation.current ?? animationNameOf(computed.current);
      openedAnimation.current = undefined;
    } else {
      previousAnimation.current = "none";
    }
  }, [state]);

  useLayoutEffect(() => {
    const was = wasPresent.current;

    if (was === present) {
      return;
    }

    const before = previousAnimation.current;
    const current = animationNameOf(computed.current);

    if (present) {
      openedAnimation.current = current;
      send("MOUNT");
    } else if (current === "none" || computed.current?.display === "none") {
      send("UNMOUNT");
    } else {
      send(was && before !== current ? "ANIMATION_OUT" : "UNMOUNT");
    }

    wasPresent.current = present;
  }, [present]);

  useLayoutEffect(() => {
    if (!node) {
      send("ANIMATION_END");

      return noop;
    }

    const view = node.ownerDocument.defaultView ?? window;
    let timeout: number | undefined;

    const onEnd = (event: AnimationEvent) => {
      const isCurrent = animationNameOf(computed.current).includes(
        CSS.escape(event.animationName)
      );

      if (event.target === node && isCurrent) {
        send("ANIMATION_END");

        if (!wasPresent.current) {
          const fill = node.style.animationFillMode;
          node.style.animationFillMode = "forwards";

          // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
          timeout = view.setTimeout(() => {
            if (node.style.animationFillMode === "forwards") {
              node.style.animationFillMode = fill;
            }
          });
        }
      }
    };

    const onStart = (event: AnimationEvent) => {
      if (event.target === node) {
        previousAnimation.current = animationNameOf(computed.current);
      }
    };

    node.addEventListener("animationstart", onStart);
    node.addEventListener("animationcancel", onEnd);
    node.addEventListener("animationend", onEnd);

    return () => {
      view.clearTimeout(timeout);
      node.removeEventListener("animationstart", onStart);
      node.removeEventListener("animationcancel", onEnd);
      node.removeEventListener("animationend", onEnd);
    };
  }, [node]);

  const ref = useCallback((element: HTMLElement | null) => {
    if (element) {
      computed.current = getComputedStyle(element);
      openedAnimation.current = animationNameOf(computed.current);
    } else {
      computed.current = null;
    }

    setNode(element);
  }, []);

  return { isPresent: state !== "unmounted", ref };
};

// Based on the react-remove-scroll event guard the modal content mounts with
// allowPinchZoom.
// Base UI already locks the page with overflow and a stable scrollbar gutter
// (wheel and keyboard scrolling stay blocked, measured), but on touch it lets
// the page behind the popover scroll. The guard cancels wheel and touchmove
// gestures that start outside the content or that could only scroll the page.
type ScrollAxis = "h" | "v";

type Gesture = TouchEvent | WheelEvent;

interface RecordedScroll {
  delta: readonly [number, number];
  name: string;
  should: boolean;
  target: EventTarget | null;
}

type Point = readonly [number, number];

/** Active guards, oldest first; only the last one acts. */
const scrollGuards: object[] = [];

const isTouchGesture = (gesture: Gesture): gesture is TouchEvent =>
  gesture.type !== "wheel";

const touchPointOf = (event: TouchEvent): Point => {
  const touch = event.changedTouches.item(0);

  return touch ? [touch.clientX, touch.clientY] : [0, 0];
};

const deltaOf = (gesture: Gesture): Point =>
  isTouchGesture(gesture)
    ? touchPointOf(gesture)
    : [gesture.deltaX, gesture.deltaY];

const overflowAllows = (
  element: Element,
  property: "overflowX" | "overflowY"
) => {
  const style = getComputedStyle(element);

  return (
    style[property] !== "hidden" &&
    !(
      style.overflowY === style.overflowX &&
      element.tagName !== "TEXTAREA" &&
      style[property] === "visible"
    )
  );
};

const scrollsAlong = (axis: ScrollAxis, element: Element) =>
  overflowAllows(element, axis === "v" ? "overflowY" : "overflowX");

const scrollMetricsOf = (axis: ScrollAxis, element: Element) =>
  axis === "v"
    ? ([element.scrollTop, element.scrollHeight, element.clientHeight] as const)
    : ([element.scrollLeft, element.scrollWidth, element.clientWidth] as const);

const hasScrollInParents = (axis: ScrollAxis, start: Element) => {
  const { body } = start.ownerDocument;
  let node: Node | null = start;

  do {
    if (node instanceof ShadowRoot) {
      node = node.host;
    }

    if (node instanceof Element && scrollsAlong(axis, node)) {
      const [, scroll, capacity] = scrollMetricsOf(axis, node);

      if (scroll > capacity) {
        return true;
      }
    }

    node = node.parentNode;
  } while (node !== null && node !== body);

  return false;
};

const parentOrHost = (node: Node) => {
  const { parentNode } = node;

  return parentNode instanceof ShadowRoot ? parentNode.host : parentNode;
};

const shouldCancelScroll = (
  axis: ScrollAxis,
  lock: Element,
  target: Element,
  delta: number
) => {
  const factor =
    axis === "h" && getComputedStyle(lock).direction === "rtl" ? -1 : 1;

  const inLock = lock.contains(target);
  const { body } = target.ownerDocument;

  // Inside the lock the walk stops once it leaves it; outside it runs to <body>.
  const keepWalking = (node: Node | null) =>
    inLock
      ? node !== null && (lock.contains(node) || lock === node)
      : node !== body;

  let node: Node | null = target;
  let available = 0;
  let availableTop = 0;

  do {
    if (node === null) {
      break;
    }

    if (node instanceof Element) {
      const [position, scroll, capacity] = scrollMetricsOf(axis, node);
      const remaining = scroll - capacity - factor * position;

      if ((position !== 0 || remaining !== 0) && scrollsAlong(axis, node)) {
        available += remaining;
        availableTop += position;
      }
    }

    node = parentOrHost(node);
  } while (keepWalking(node));

  // The component passes noOverscroll: a gesture is cancelled once less than one
  // pixel can still scroll in its direction.
  return factor * delta > 0
    ? Math.abs(available) < 1
    : Math.abs(availableTop) < 1;
};

const selectionContains = (target: Element) => {
  const anchor = getSelection()?.anchorNode;

  return anchor !== undefined && anchor !== null && anchor.contains(target);
};

const shouldPreventGesture = (
  gesture: Gesture,
  lock: Element,
  touchStart: Point,
  lockedAxis: { current: ScrollAxis | undefined }
) => {
  const touch = isTouchGesture(gesture);

  // allowPinchZoom
  if (touch ? gesture.touches.length === 2 : gesture.ctrlKey) {
    return false;
  }

  const [pointX, pointY] = deltaOf(gesture);
  const deltaX = touch ? touchStart[0] - pointX : pointX;
  const deltaY = touch ? touchStart[1] - pointY : pointY;
  const axis: ScrollAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "h" : "v";
  const { target } = gesture;

  if (!(target instanceof Element)) {
    return false;
  }

  if (
    touch &&
    axis === "h" &&
    target instanceof HTMLInputElement &&
    target.type === "range"
  ) {
    return false;
  }

  if (selectionContains(target)) {
    return false;
  }

  if (!hasScrollInParents(axis, target)) {
    return true;
  }

  if (
    lockedAxis.current === undefined &&
    touch &&
    (deltaX !== 0 || deltaY !== 0)
  ) {
    lockedAxis.current = axis;
  }

  const along = lockedAxis.current ?? axis;

  return shouldCancelScroll(
    along,
    lock,
    target,
    along === "h" ? deltaX : deltaY
  );
};

/**
 * Returns the capture handlers to put on the modal content; the guard itself
 * listens on the document while `active`.
 */
const useRemoveScrollGuard = (
  active: boolean,
  lockRef: RefObject<HTMLElement | null>
) => {
  const recorded = useRef<RecordedScroll[]>([]);
  const touchStart = useRef<Point>([0, 0]);
  const lockedAxis = useRef<ScrollAxis | undefined>(undefined);
  const identity = useRef({});

  const record = useCallback(
    (gesture: Gesture) => {
      const lock = lockRef.current;

      if (lock === null) {
        return;
      }

      const entry: RecordedScroll = {
        delta: deltaOf(gesture),
        name: gesture.type,
        should: shouldPreventGesture(
          gesture,
          lock,
          touchStart.current,
          lockedAxis
        ),
        target: gesture.target,
      };

      recorded.current.push(entry);

      setTimeout(() => {
        recorded.current = recorded.current.filter((item) => item !== entry);
      }, 1);
    },
    [lockRef]
  );

  useEffect(() => {
    if (!active) {
      return noop;
    }

    const entry = identity.current;
    scrollGuards.push(entry);

    // A gesture the content did not record started outside it: cancel it.
    const onGesture = (gesture: Gesture) => {
      if (scrollGuards.at(-1) !== entry) {
        return;
      }

      const [x, y] = deltaOf(gesture);

      const match = recorded.current.find(
        (item) =>
          item.name === gesture.type &&
          item.target === gesture.target &&
          item.delta[0] === x &&
          item.delta[1] === y
      );

      if ((match === undefined || match.should) && gesture.cancelable) {
        gesture.preventDefault();
      }
    };

    const onStart = (event: TouchEvent) => {
      touchStart.current = touchPointOf(event);
      lockedAxis.current = undefined;
    };

    const options: AddEventListenerOptions = { passive: false };
    document.addEventListener("wheel", onGesture, options);
    document.addEventListener("touchmove", onGesture, options);
    document.addEventListener("touchstart", onStart, options);

    return () => {
      scrollGuards.splice(scrollGuards.indexOf(entry), 1);
      document.removeEventListener("wheel", onGesture);
      document.removeEventListener("touchmove", onGesture);
      document.removeEventListener("touchstart", onStart);
    };
  }, [active]);

  return {
    onTouchMoveCapture: (event: ReactTouchEvent) => {
      record(event.nativeEvent);
    },
    onWheelCapture: (event: ReactWheelEvent) => {
      record(event.nativeEvent);
    },
  };
};

// Based on the Radix focus guards every popover content mounts: two invisible tab stops at the first and last position
// of <body>, shared by all open popovers and removed with the last one.
const createFocusGuard = () => {
  const guard = document.createElement("span");
  guard.dataset.radixFocusGuard = "";
  guard.tabIndex = 0;
  guard.style.outline = "none";
  guard.style.opacity = "0";
  guard.style.position = "fixed";
  guard.style.pointerEvents = "none";

  return guard;
};

let focusGuards: { end: HTMLElement; start: HTMLElement } | null = null;
let focusGuardUsers = 0;

/** Puts the guards at the edges of <body> and returns the release function. */
const acquireFocusGuards = () => {
  focusGuards ??= { end: createFocusGuard(), start: createFocusGuard() };
  const { end, start } = focusGuards;

  if (document.body.firstElementChild !== start) {
    document.body.prepend(start);
  }

  if (document.body.lastElementChild !== end) {
    document.body.append(end);
  }

  focusGuardUsers += 1;

  return () => {
    if (focusGuardUsers === 1) {
      focusGuards?.start.remove();
      focusGuards?.end.remove();
      focusGuards = null;
    }

    focusGuardUsers = Math.max(0, focusGuardUsers - 1);
  };
};

const useFocusGuards = (active: boolean) => {
  useEffect(() => (active ? acquireFocusGuards() : noop), [active]);
};

// Based on the aria-hidden package's hideOthers that modal content runs on
// mount. Every sibling on
// the path from <body> to the content gets aria-hidden="true" plus a
// data-aria-hidden marker, counted so nested modals release them in order.
const ARIA_MARKER = "data-aria-hidden";
let hiddenCounts = new WeakMap<Element, number>();
let markerCounts = new WeakMap<Element, number>();
let alreadyHidden = new WeakMap<Element, boolean>();
let activeHides = 0;

const hostOf = (node: Node | null): Element | null => {
  if (node === null) {
    return null;
  }

  return node instanceof ShadowRoot ? node.host : hostOf(node.parentNode);
};

const hideOthers = (target: Element) => {
  const parent = target.ownerDocument.body;
  const targets = [target, ...parent.querySelectorAll("[aria-live], script")];
  const hidden: Element[] = [];
  const keep = new Set<Node>();
  const stop = new Set<Node>();

  for (const item of targets) {
    if (parent.contains(item)) {
      stop.add(item);
    } else {
      const host = hostOf(item);

      if (host && parent.contains(host)) {
        stop.add(host);
      }
    }
  }

  const keepAncestors = (node: Node | null) => {
    if (node && !keep.has(node)) {
      keep.add(node);
      keepAncestors(node.parentNode);
    }
  };

  for (const item of stop) {
    keepAncestors(item);
  }

  const hideChildren = (node: Node | null) => {
    if (!(node instanceof Element) || stop.has(node)) {
      return;
    }

    for (const child of node.children) {
      if (keep.has(child)) {
        hideChildren(child);
      } else {
        const attribute = child.getAttribute("aria-hidden");
        const wasHidden = attribute !== null && attribute !== "false";
        const count = (hiddenCounts.get(child) ?? 0) + 1;
        const marked = (markerCounts.get(child) ?? 0) + 1;
        hiddenCounts.set(child, count);
        markerCounts.set(child, marked);
        hidden.push(child);

        if (count === 1 && wasHidden) {
          alreadyHidden.set(child, true);
        }

        if (marked === 1) {
          child.setAttribute(ARIA_MARKER, "true");
        }

        if (!wasHidden) {
          child.setAttribute("aria-hidden", "true");
        }
      }
    }
  };

  hideChildren(parent);
  keep.clear();
  activeHides += 1;

  return () => {
    for (const child of hidden) {
      const count = (hiddenCounts.get(child) ?? 1) - 1;
      const marked = (markerCounts.get(child) ?? 1) - 1;
      hiddenCounts.set(child, count);
      markerCounts.set(child, marked);

      if (!count) {
        if (!alreadyHidden.has(child)) {
          child.removeAttribute("aria-hidden");
        }

        alreadyHidden.delete(child);
      }

      if (!marked) {
        child.removeAttribute(ARIA_MARKER);
      }
    }

    activeHides -= 1;

    if (!activeHides) {
      hiddenCounts = new WeakMap();
      markerCounts = new WeakMap();
      alreadyHidden = new WeakMap();
    }
  };
};

type DismissEvent = CustomEvent<{ originalEvent: Event }>;

/** Returns true when the caller or the wrapper keeps the popover open. */
type DismissHandler = (details: { event: Event; reason: string }) => boolean;

interface PopoverPlacement {
  align: string;
  side: string;
}

interface PopoverContextValue {
  actionsRef: RefObject<PopoverPrimitive.Root.Actions | null>;
  addCustomAnchor: () => () => void;
  anchor: Element | null;
  dismissRef: RefObject<DismissHandler | null>;
  hasCustomAnchor: boolean;
  modal: boolean | "trap-focus";
  open: boolean;
  placement: PopoverPlacement | undefined;
  setAnchor: (element: Element | null) => void;
  setPlacement: (placement: PopoverPlacement | undefined) => void;
  setTrigger: (element: HTMLElement | null) => void;
  trigger: HTMLElement | null;
  triggerRef: RefObject<HTMLElement | null>;
}

const PopoverContext = createContext<PopoverContextValue | undefined>(
  undefined
);

const usePopoverContext = (part: string) => {
  const context = useContext(PopoverContext);

  if (context === undefined) {
    throw new Error(`Place ${part} under a Popover root`);
  }

  return context;
};

interface PopoverProps extends Omit<
  PopoverPrimitive.Root.Props,
  "defaultOpen" | "modal" | "onOpenChange" | "open"
> {
  defaultOpen?: boolean;
  modal?: boolean | "trap-focus";
  onOpenChange?: (
    open: boolean,
    details: PopoverPrimitive.Root.ChangeEventDetails
  ) => void;
  open?: boolean;
}

/**
 * Popover root. `open` makes it controlled;
 * otherwise `defaultOpen` seeds its own state. It renders no element.
 */
const Popover = ({
  children,
  defaultOpen,
  modal = false,
  onOpenChange,
  open: openProp,
  ...props
}: PopoverProps) => {
  const [ownOpen, setOwnOpen] = useState(defaultOpen ?? false);
  const open = openProp ?? ownOpen;
  const registerOpen = useContext(PopoverOverlayOwnerContext)?.registerOpen;

  useLayoutEffect(
    () => (open ? registerOpen?.() : undefined),
    [open, registerOpen]
  );

  const [anchor, setAnchor] = useState<Element | null>(null);
  const [customAnchors, setCustomAnchors] = useState(0);
  const [placement, setPlacement] = useState<PopoverPlacement | undefined>();
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<PopoverPrimitive.Root.Actions | null>(null);
  const dismissRef = useRef<DismissHandler | null>(null);

  const addCustomAnchor = useCallback(() => {
    setCustomAnchors((count) => count + 1);

    return () => {
      setCustomAnchors((count) => count - 1);
    };
  }, []);

  const handleOpenChange = (
    next: boolean,
    details: PopoverPrimitive.Root.ChangeEventDetails
  ) => {
    if (!next && dismissRef.current?.(details) === true) {
      details.cancel();

      return;
    }

    if (openProp === undefined) {
      setOwnOpen(next);
    }

    onOpenChange?.(next, details);
  };

  const context = useMemo<PopoverContextValue>(
    () => ({
      actionsRef,
      addCustomAnchor,
      anchor,
      dismissRef,
      hasCustomAnchor: customAnchors > 0,
      modal,
      open,
      placement,
      setAnchor,
      setPlacement,
      setTrigger,
      trigger,
      triggerRef,
    }),
    [addCustomAnchor, anchor, customAnchors, modal, open, placement, trigger]
  );

  return (
    <PopoverContext value={context}>
      <PopoverPrimitive.Root
        {...props}
        actionsRef={actionsRef}
        modal={modal}
        onOpenChange={handleOpenChange}
        open={open}
      >
        {children}
      </PopoverPrimitive.Root>
    </PopoverContext>
  );
};

interface PopoverAnchorProps extends ComponentProps<"div"> {
  /** Anchors to an element that lives elsewhere; no element is rendered. */
  virtualRef?: RefObject<Element | null>;
}

/** Element the content is positioned against instead of the trigger. */
const PopoverAnchor = ({ ref, virtualRef, ...props }: PopoverAnchorProps) => {
  const { addCustomAnchor, placement, setAnchor } =
    usePopoverContext("PopoverAnchor");

  useEffect(() => addCustomAnchor(), [addCustomAnchor]);

  const lastVirtual = useRef<Element | null>(null);

  // Runs after every render, so a moved virtual anchor is
  // noticed without a dependency.
  useEffect(() => {
    if (virtualRef) {
      const previous = lastVirtual.current;
      lastVirtual.current = virtualRef.current;

      if (previous !== lastVirtual.current) {
        setAnchor(lastVirtual.current);
      }
    }
  });

  const composedRef = useMemo(
    () =>
      mergeRefs<HTMLDivElement>(ref, (node) => {
        if (node) {
          setAnchor(node);
        }
      }),
    [ref, setAnchor]
  );

  if (virtualRef) {
    return null;
  }

  return (
    <div
      data-radix-popper-align={placement?.align}
      data-radix-popper-side={placement?.side}
      data-slot="popover-anchor"
      {...props}
      ref={composedRef}
    />
  );
};

// Base UI renders an invisible tab stop before and after the trigger while
// its popup is open. Tab from the trigger would enter the popup and Tab from
// the element before it would close the popup, where the component moves to the
// neighbouring page element (the content sits at the end of <body>). Tab
// skips the stops, which stay in the DOM for Base UI's own programmatic focus.
const leaveTabOrder = (trigger: HTMLElement) => {
  for (const neighbour of [
    trigger.previousElementSibling,
    trigger.nextElementSibling,
  ]) {
    if (
      neighbour instanceof HTMLElement &&
      Object.hasOwn(neighbour.dataset, "baseUiFocusGuard")
    ) {
      neighbour.tabIndex = -1;
    }
  }
};

const watchTriggerGuards = (trigger: HTMLElement) => {
  const parent = trigger.parentElement;

  if (parent === null) {
    return noop;
  }

  leaveTabOrder(trigger);

  const observer = new MutationObserver(() => {
    leaveTabOrder(trigger);
  });

  observer.observe(parent, { childList: true });

  return () => {
    observer.disconnect();
  };
};

/** Button that toggles the popover. */
const PopoverTrigger = ({ ref, ...props }: PopoverPrimitive.Trigger.Props) => {
  const { open, setTrigger, trigger, triggerRef } =
    usePopoverContext("PopoverTrigger");

  const composedRef = useMemo(
    () => mergeRefs<HTMLElement>(ref, triggerRef, setTrigger),
    [ref, setTrigger, triggerRef]
  );

  useEffect(
    () => (trigger === null ? noop : watchTriggerGuards(trigger)),
    [trigger]
  );

  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      data-state={stateOf(open)}
      {...props}
      ref={composedRef}
    />
  );
};

/** Radix `collisionPadding`: one number, or the sides to pad. */
type CollisionPadding =
  | number
  | Partial<Record<"bottom" | "left" | "right" | "top", number>>;

interface PopoverContentProps extends Omit<
  PopoverPrimitive.Popup.Props,
  "className" | "finalFocus" | "initialFocus" | "ref" | "style"
> {
  align?: PopoverAlign;
  alignOffset?: number;
  animation?: "slide-in-left";
  arrowPadding?: number;
  avoidCollisions?: boolean;
  className?: string;
  collisionBoundary?: Element | Element[];
  collisionPadding?: CollisionPadding;
  contentOverflow?: "auto" | "visible";
  disablePadding?: boolean;
  disablePortal?: boolean;
  forceMount?: boolean;
  hideWhenDetached?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onFocusOutside?: (event: DismissEvent) => void;
  onInteractOutside?: (event: DismissEvent) => void;
  onOpenAutoFocus?: (event: Event) => void;
  onPointerDownOutside?: (event: DismissEvent) => void;
  opaque?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | null;
  ref?: Ref<HTMLDivElement>;
  side?: PopoverSide;
  sideOffset?: number;
  size?: PopoverSize;
  sticky?: "always" | "partial";
  style?: CSSProperties;
  unstyled?: boolean;
  /**
   * Runs once after the first position is computed (Radix `onPlaced`).
   */
  onPlaced?: () => void;
  /**
   * "always" re-measures the anchor on every animation frame
   * `autoUpdate({ animationFrame: true })`; "optimized" (default) leaves it to
   * Base UI's scroll, resize and layout-shift observers.
   */
  updatePositionStrategy?: "always" | "optimized";
  variant?: PopoverVariant;
}

const freshFlags = () => ({
  interactedOutside: false,
  pointerInteracted: false,
  rightClicked: false,
});

interface PopoverFocusHandlers {
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onFocusOutside?: (event: DismissEvent) => void;
  onInteractOutside?: (event: DismissEvent) => void;
  onOpenAutoFocus?: (event: Event) => void;
  onPointerDownOutside?: (event: DismissEvent) => void;
}

const dismissEventOf = (type: string, originalEvent: Event) => {
  const event: DismissEvent = new CustomEvent(type, {
    cancelable: true,
    detail: { originalEvent },
  });

  (originalEvent.target ?? document).dispatchEvent(event);

  return event;
};

/**
 * Focus and dismissal order of the Radix popover content plus the wrapper's
 * own focus bookkeeping for modal and non-modal content. Radix reports three outside events; Base UI reports one reason per
 * dismissal, so each reason rebuilds the matching Radix event.
 */
const usePopoverFocus = (
  contentRef: RefObject<HTMLDivElement | null>,
  content: HTMLElement | null,
  handlers: PopoverFocusHandlers
) => {
  const { actionsRef, dismissRef, modal, open, triggerRef } =
    usePopoverContext("PopoverContent");

  const restoreContext = useContext(PopoverFocusRestoreContext);

  const restoration = useMemo(
    () => createFocusRestoration(restoreContext),
    [restoreContext]
  );

  const flags = useRef(freshFlags());

  // Set while focus is inside the content's React tree, portalled children
  // included.
  const focusInside = useRef(false);

  const latest = useRef({ handlers, restoration });

  useLayoutEffect(() => {
    latest.current = { handlers, restoration };
  });

  // The wrapper runs the caller first, then its own bookkeeping; non-modal
  // content then ignores presses on the trigger and the focus that follows a
  // press.
  const interactOutside = useCallback(
    (event: DismissEvent) => {
      latest.current.handlers.onInteractOutside?.(event);
      latest.current.restoration.onInteractOutside(event);

      if (modal === true) {
        return;
      }

      if (!event.defaultPrevented) {
        flags.current.interactedOutside = true;

        if (event.detail.originalEvent.type === "pointerdown") {
          flags.current.pointerInteracted = true;
        }
      }

      const { target } = event;

      if (
        target instanceof Node &&
        triggerRef.current?.contains(target) === true
      ) {
        event.preventDefault();
      }

      if (
        event.detail.originalEvent.type === "focusin" &&
        flags.current.pointerInteracted
      ) {
        event.preventDefault();
      }
    },
    [modal, triggerRef]
  );

  useLayoutEffect(() => {
    dismissRef.current = ({ event, reason }) => {
      if (reason === "escape-key") {
        // The shared dismissable layer owns Escape (below), and only the
        // topmost layer answers it.
        return true;
      }

      if (reason === "outside-press") {
        const outside = dismissEventOf(
          "dismissableLayer.pointerDownOutside",
          event
        );

        latest.current.handlers.onPointerDownOutside?.(outside);

        if (modal === true && event instanceof MouseEvent) {
          flags.current.rightClicked =
            event.button === 2 || (event.button === 0 && event.ctrlKey);
        }

        interactOutside(outside);

        return outside.defaultPrevented;
      }

      // Radix reports focus leaving on focusin of the element it lands on
      // (the effect below), not on the focusout Base UI reports.
      return reason === "focus-out";
    };

    return () => {
      dismissRef.current = null;
    };
  }, [dismissRef, interactOutside, modal]);

  // The content is a DismissableLayer. The layer
  // runs Escape on the document capture phase for the newest layer only: the
  // caller's handler first, then the dismissal unless it cancelled. Outside
  // presses and focus stay with the handlers above.
  useDismissableLayer({
    active: open,
    modal: false,
    onDismiss: () => {
      actionsRef.current?.close();
    },
    onEscapeKeyDown: (event) => {
      latest.current.handlers.onEscapeKeyDown?.(event);
    },
    onInteractOutside: (event) => {
      event.preventDefault();
    },
  });

  // Based on useFocusOutside: any focusin on the document while
  // focus is not inside the layer's React tree is an outside event. Modal
  // content cancels it after the caller's handler, so it never dismisses.
  useEffect(() => {
    if (!open) {
      return noop;
    }

    const onFocusIn = (event: FocusEvent) => {
      if (event.target === null || focusInside.current) {
        return;
      }

      const outside = dismissEventOf("dismissableLayer.focusOutside", event);
      latest.current.handlers.onFocusOutside?.(outside);

      if (modal === true) {
        outside.preventDefault();
      }

      interactOutside(outside);

      if (!outside.defaultPrevented) {
        actionsRef.current?.close();
      }
    };

    document.addEventListener("focusin", onFocusIn);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [actionsRef, interactOutside, modal, open]);

  // The content joins the focus scopes stack shared with the dialog and menu
  // families, so a dialog, menu or popover opened above it pauses
  // this trap until it closes. Radix removes it after the unmount autofocus,
  // in the next task.
  const { ref: scopeRef, scope } = useFocusScope();

  // Based on the FocusScope trap: focus
  // moving outside the content, by keyboard or by script, returns to the last
  // element that held it, and removing the focused element hands focus to the
  // content. A scope paused by a newer one does nothing.
  useEffect(() => {
    if (modal !== true || !open || content === null) {
      return noop;
    }

    let lastFocused: Element | null = null;

    const onFocusIn = (event: FocusEvent) => {
      if (scope.paused) {
        return;
      }

      const [target] = event.composedPath();

      if (target instanceof Node && containsAcrossShadow(content, target)) {
        lastFocused = target instanceof Element ? target : null;
      } else {
        focusElement(lastFocused, true);
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      if (scope.paused) {
        return;
      }

      const { relatedTarget } = event;

      if (relatedTarget === null) {
        return;
      }

      const [target] = event.composedPath();

      if (target instanceof Node && containsAcrossShadow(content, target)) {
        lastFocused = target instanceof Element ? target : null;
      }

      if (
        !(
          relatedTarget instanceof Node &&
          containsAcrossShadow(content, relatedTarget)
        )
      ) {
        focusElement(lastFocused, true);
      }
    };

    const observer = new MutationObserver((records) => {
      if (activeElementOf() !== document.body) {
        return;
      }

      for (const record of records) {
        if (record.removedNodes.length > 0) {
          focusElement(content);
        }
      }
    });

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    observer.observe(content, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      observer.disconnect();
    };
  }, [content, modal, open, scope]);

  // Based on the FocusScope mount autofocus: when focus is not
  // already inside the content, the wrapper records the opener, the caller may
  // cancel the move, and otherwise the first tabbable element (or the content)
  // takes focus. The content owns this whether or not Base UI would have
  // moved focus (it skips content that holds a Popover.Close).
  useEffect(() => {
    if (content === null) {
      return;
    }

    flags.current = freshFlags();

    if (containsAcrossShadow(content, activeElementOf())) {
      return;
    }

    const event = new Event("focusScope.autoFocusOnMount", {
      cancelable: true,
    });

    content.dispatchEvent(event);
    latest.current.restoration.onOpenAutoFocus(event);
    latest.current.handlers.onOpenAutoFocus?.(event);

    if (!event.defaultPrevented) {
      focusFirstInside(content);
    }
  }, [content]);

  const loopKeys = (event: KeyboardEvent) => {
    if (contentRef.current) {
      loopTabFocus(event, contentRef.current, scope);
    }
  };

  // Radix always cancels the default close focus and moves it to the trigger
  // itself, unless the caller cancelled or the user went elsewhere.
  const finalFocus = () => {
    const event = new Event("focusScope.autoFocusOnUnmount", {
      cancelable: true,
    });

    latest.current.handlers.onCloseAutoFocus?.(event);
    latest.current.restoration.onCloseAutoFocus(event);

    const skipTrigger =
      modal === true
        ? flags.current.rightClicked
        : flags.current.interactedOutside;

    flags.current = freshFlags();

    if (event.defaultPrevented || skipTrigger) {
      return false;
    }

    return triggerRef.current ?? false;
  };

  return {
    finalFocus,
    loopKeys,
    scopeRef,
    onBlurCapture: () => {
      focusInside.current = false;
    },
    onFocusCapture: () => {
      focusInside.current = true;
    },
  };
};

interface SurfaceOptions {
  animation: PopoverContentProps["animation"];
  className: string | undefined;
  contentOverflow: "auto" | "visible";
  disablePadding: boolean;
  opaque: boolean;
  size: PopoverSize;
  unstyled: boolean;
  variant: PopoverVariant;
}

const surfaceClassOf = ({
  animation,
  className,
  contentOverflow,
  disablePadding,
  opaque,
  size,
  unstyled,
  variant,
}: SurfaceOptions) => {
  const background = opaque
    ? "bg-panel-elevated-secondary"
    : "bg-panel-elevated-secondary/90";

  const base = [
    "z-50 flex origin-(--radix-popover-content-transform-origin) flex-col text-text outline-hidden",
    contentOverflow === "auto" ? "overflow-y-auto" : "overflow-visible",
  ];

  const menu = [
    "bg-panel-elevated-secondary",
    surfaceClasses.menu,
    !disablePadding && "p-2",
  ];

  const standard = [
    variant === "comment" ? surfaceClasses.comment : surfaceClasses.default,
    !disablePadding && "px-1 py-1",
    background,
  ];

  // The component puts the width with the other surface classes, so an unstyled
  // content has none.
  return cn(
    animation === "slide-in-left" && styles.slideInLeft,
    !unstyled && [
      base,
      variant === "menu" ? menu : standard,
      sizeClasses[size],
    ],
    className
  );
};

// Based on the Radix popper: floating-ui
// runs with strategy fixed and the middleware order and options on the
// element Base UI renders for the positioner. Base UI still mounts that
// element and measures it, but its own offsets, collision handling and
// tracking are switched off, so nothing it computes reaches the screen.
const inertCollisionAvoidance = {
  align: "none",
  fallbackAxisSide: "none",
  side: "none",
} as const;

interface PopperPosition {
  align: string;
  placed: boolean;
  side: string;
}

const PopperPositionContext = createContext<PopperPosition>({
  align: "center",
  placed: false,
  side: "bottom",
});

const originAlongOf = (align: string | undefined) => {
  if (align === "start") {
    return "0%";
  }

  return align === "end" ? "100%" : "50%";
};

const originOf = (
  side: string | undefined,
  along: string,
  rects: { floating: { height: number; width: number } }
) => {
  if (side === "top") {
    return `${along} ${rects.floating.height}px`;
  }

  if (side === "right") {
    return `0px ${along}`;
  }

  return side === "left"
    ? `${rects.floating.width}px ${along}`
    : `${along} 0px`;
};

// The transformOrigin middleware for content without an arrow:
// the edge facing the anchor, at 0%, 50% or 100% along it. The component hands
// the pair to the wrapper through middlewareData; writing it from the
// middleware lands it in the same pass.
const transformOrigin: Middleware = {
  fn({ elements, placement, rects }) {
    const [side, align] = placement.split("-");

    elements.floating.style.setProperty(
      "--radix-popper-transform-origin",
      originOf(side, originAlongOf(align), rects)
    );

    return {};
  },
  name: "transformOrigin",
};

interface PopperOptions {
  align: PopoverAlign;
  alignOffset: number;
  avoidCollisions: boolean;
  collisionBoundary: Element | Element[] | undefined;
  collisionPadding: CollisionPadding;
  hideWhenDetached: boolean;
  side: PopoverSide;
  sideOffset: number;
  sticky: "always" | "partial";
  updatePositionStrategy: "always" | "optimized";
}

const boundariesOf = (boundary: Element | Element[] | undefined) => {
  if (boundary === undefined) {
    return [];
  }

  return Array.isArray(boundary) ? boundary : [boundary];
};

// What Base UI puts on the positioner that floating-ui now owns.
const positionStyleKeys = new Set([
  "left",
  "opacity",
  "position",
  "top",
  "transform",
]);

/* oxlint-disable shadcn/no-inline-styles -- The component positions the wrapper with inline styles. */
const positionerStyleOf = (
  base: CSSProperties | undefined,
  floatingStyles: CSSProperties,
  placed: boolean,
  hidden: boolean
): CSSProperties => ({
  ...Object.fromEntries(
    Object.entries(base ?? {}).filter(([key]) => !positionStyleKeys.has(key))
  ),
  ...floatingStyles,
  // Held off screen until the first position is computed.
  transform: placed ? floatingStyles.transform : "translate(0, -200%)",
  ...(hidden && { pointerEvents: "none", visibility: "hidden" }),
});
/* oxlint-enable shadcn/no-inline-styles */

interface PopoverPositionedProps {
  arrowPadding: number | undefined;
  children: ReactNode;
  onPlaced: (() => void) | undefined;
  options: PopperOptions;
}

/**
 * Positioner. It lives only while the content is mounted, so a reopened
 * content starts unplaced again, like the PopperContent.
 */
const PopoverPositioned = ({
  arrowPadding,
  children,
  onPlaced,
  options,
}: PopoverPositionedProps) => {
  const { anchor, hasCustomAnchor, setPlacement, trigger } =
    usePopoverContext("PopoverContent");

  const {
    align,
    alignOffset,
    avoidCollisions,
    collisionBoundary,
    collisionPadding,
    hideWhenDetached,
    side,
    sideOffset,
    sticky,
    updatePositionStrategy,
  } = options;

  const boundaries = boundariesOf(collisionBoundary);

  const detectOverflow = {
    altBoundary: boundaries.length > 0,
    boundary: boundaries,
    padding: collisionPadding,
  };

  const [positioner, setPositioner] = useState<HTMLElement | null>(null);

  const { floatingStyles, isPositioned, middlewareData, placement } =
    useFloating({
      elements: {
        floating: positioner,
        reference: hasCustomAnchor ? anchor : trigger,
      },
      middleware: [
        offset({ alignmentAxis: alignOffset, mainAxis: sideOffset }),
        ...(avoidCollisions
          ? [
              shift({
                ...detectOverflow,
                crossAxis: false,
                limiter: sticky === "partial" ? limitShift() : undefined,
                mainAxis: true,
              }),
              flip(detectOverflow),
            ]
          : []),
        sizeMiddleware({
          ...detectOverflow,
          apply({ availableHeight, availableWidth, elements, rects }) {
            const { style } = elements.floating;
            const { height, width } = rects.reference;
            style.setProperty(
              "--radix-popper-available-width",
              `${availableWidth}px`
            );
            style.setProperty(
              "--radix-popper-available-height",
              `${availableHeight}px`
            );
            style.setProperty("--radix-popper-anchor-width", `${width}px`);
            style.setProperty("--radix-popper-anchor-height", `${height}px`);
          },
        }),
        transformOrigin,
        ...(hideWhenDetached
          ? [
              hide({
                ...detectOverflow,
                boundary: boundaries.length > 0 ? boundaries : undefined,
                strategy: "referenceHidden",
              }),
            ]
          : []),
      ],
      placement: align === "center" ? side : `${side}-${align}`,
      strategy: "fixed",
      whileElementsMounted: (...args) =>
        autoUpdate(...args, {
          animationFrame: updatePositionStrategy === "always",
        }),
    });

  const placed = isPositioned;
  const [placedSide = side, placedAlign = "center"] = placement.split("-");
  const hidden = middlewareData.hide?.referenceHidden === true;
  const latestOnPlaced = useRef(onPlaced);

  useLayoutEffect(() => {
    latestOnPlaced.current = onPlaced;
  });

  useLayoutEffect(() => {
    setPlacement({ align: placedAlign, side: placedSide });

    return () => {
      setPlacement(undefined);
    };
  }, [placedAlign, placedSide, setPlacement]);

  useLayoutEffect(() => {
    if (placed) {
      latestOnPlaced.current?.();
    }
  }, [placed]);

  const position = useMemo<PopperPosition>(
    () => ({ align: placedAlign, placed, side: placedSide }),
    [placed, placedAlign, placedSide]
  );

  return (
    <PopperPositionContext value={position}>
      <PopoverPrimitive.Positioner
        anchor={hasCustomAnchor ? (anchor ?? undefined) : undefined}
        arrowPadding={arrowPadding}
        className="z-50 min-w-max"
        collisionAvoidance={inertCollisionAvoidance}
        disableAnchorTracking
        positionMethod="fixed"
        ref={setPositioner}
        render={(renderProps) => (
          <div
            {...renderProps}
            data-anchor-hidden={hidden ? "" : undefined}
            data-align={placedAlign}
            data-radix-popper-content-wrapper=""
            data-side={placedSide}
            // oxlint-disable-next-line shadcn/no-inline-styles -- The component positions the wrapper with inline styles.
            style={positionerStyleOf(
              renderProps.style,
              floatingStyles,
              placed,
              hidden
            )}
          />
        )}
      >
        {children}
      </PopoverPrimitive.Positioner>
    </PopperPositionContext>
  );
};

/* oxlint-disable shadcn/no-inline-styles -- The component sets these variables inline on the content, after the caller's style. */
const popperVariables: CustomProperties = {
  "--radix-popover-content-available-height":
    "var(--radix-popper-available-height)",
  "--radix-popover-content-available-width":
    "var(--radix-popper-available-width)",
  "--radix-popover-content-transform-origin":
    "var(--radix-popper-transform-origin)",
  "--radix-popover-trigger-height": "var(--radix-popper-anchor-height)",
  "--radix-popover-trigger-width": "var(--radix-popper-anchor-width)",
};
/* oxlint-enable shadcn/no-inline-styles */

/* oxlint-disable shadcn/no-inline-styles -- The component sets these custom properties inline, after the caller's style, and runs no animation before the first position is computed. */
const placeStyleOf = (
  style: CSSProperties | undefined,
  placed: boolean
): CSSProperties => ({
  ...style,
  ...popperVariables,
  animation: placed ? style?.animation : "none",
});
/* oxlint-enable shadcn/no-inline-styles */

interface PlacementReporterProps extends ComponentProps<"div"> {
  open: boolean;
}

/** Renders the popup element with the Radix state attribute and the placed side and alignment. */
const PlacementReporter = ({ open, ...props }: PlacementReporterProps) => {
  const { align, placed, side } = useContext(PopperPositionContext);

  return (
    <div
      data-state={stateOf(open)}
      {...props}
      data-align={align}
      data-side={side}
      // oxlint-disable-next-line shadcn/no-inline-styles -- See placeStyleOf.
      style={placeStyleOf(props.style, placed)}
    />
  );
};

/* oxlint-disable shadcn/no-inline-styles -- The component sets zoom and the size limits inline, so a caller's className cannot override them; the caller's own style comes last. */
const popupStyleOf = ({
  hasContainer,
  scale,
  size: popoverSize,
  style,
}: {
  hasContainer: boolean;
  scale: number;
  size: PopoverSize;
  style: CSSProperties | undefined;
}): CSSProperties => ({
  maxHeight: `min(${popoverSize === "railMenu" ? "var(--ck-popup-rail-max-height), " : ""}calc(var(--radix-popover-content-available-height) / ${scale}), calc((100vh - 16px) / ${scale}))`,
  maxWidth: `min(calc(var(--radix-popover-content-available-width) / ${scale}), calc((100vw - 16px) / ${scale}))`,
  zoom: !hasContainer && scale !== 1 ? scale : undefined,
  ...style,
});
/* oxlint-enable shadcn/no-inline-styles */

const subscribeNothing = () => noop;

/** Renders `children` into `container` (document.body by default) once mounted. */
const PortalIntoContainer = ({
  children,
  container,
}: {
  children: ReactNode;
  container: HTMLElement | ShadowRoot | null | undefined;
}) => {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );

  return mounted ? createPortal(children, container ?? document.body) : null;
};

interface PopoverPortalHostProps {
  children: ReactNode;
  container: HTMLElement | ShadowRoot | null | undefined;
  disablePortal: boolean;
  forceMount: boolean | undefined;
}

/**
 * Where the content mounts: `container`, document.body, or, with
 * `disablePortal`, right where it is written.
 */
const PopoverPortalHost = ({
  children,
  container,
  disablePortal,
  forceMount,
}: PopoverPortalHostProps) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  if (disablePortal) {
    return (
      <div className="contents" ref={setHost}>
        {host && (
          <PopoverPrimitive.Portal container={host} keepMounted={forceMount}>
            {children}
          </PopoverPrimitive.Portal>
        )}
      </div>
    );
  }

  // Base UI keeps a portaled popup in tab order by placing focus guards where
  // the portal is written. Radix leaves the content at the end of its
  // container, so the portal itself is written there too and Tab follows
  // document order.
  return (
    <PortalIntoContainer container={container}>
      <PopoverPrimitive.Portal container={container} keepMounted={forceMount}>
        {children}
      </PopoverPrimitive.Portal>
    </PortalIntoContainer>
  );
};

interface ContentRuntimeOptions {
  content: HTMLElement | null;
  contentRef: RefObject<HTMLElement | null>;
  forceMount: boolean | undefined;
}

/**
 * Everything the content does around Base UI's popup: Radix Presence, the
 * focus guards and the modal page lock (aria-hidden and the scroll guard).
 */
const useContentRuntime = ({
  content,
  contentRef,
  forceMount,
}: ContentRuntimeOptions) => {
  const { actionsRef, modal, open } = usePopoverContext("PopoverContent");
  const presence = usePresence(forceMount === true || open);

  // After the portal node exists, so the end guard is the last child of <body>.
  useFocusGuards(presence.isPresent && content !== null);

  useEffect(
    () =>
      modal === true && content !== null ? hideOthers(content) : undefined,
    [content, modal]
  );

  const scrollGuard = useRemoveScrollGuard(
    modal === true && presence.isPresent,
    contentRef
  );

  // Base UI keeps its own mounted flag until it sees the exit finish, which it
  // will not once this content has left.
  useLayoutEffect(() => {
    if (!presence.isPresent) {
      actionsRef.current?.unmount();
    }
  }, [actionsRef, presence.isPresent]);

  return {
    isPresent: presence.isPresent,
    presenceRef: presence.ref,
    scrollGuard,
  };
};

/**
 * Floating panel. Portals into `portalContainer` or
 * document.body, positions against the trigger or the anchor, and keeps the
 * Radix focus and dismissal order.
 */
const PopoverContent = ({
  align = "start",
  alignOffset = 0,
  animation,
  arrowPadding,
  avoidCollisions = true,
  children,
  className,
  collisionBoundary,
  collisionPadding = 6,
  contentOverflow = "auto",
  disablePadding = false,
  disablePortal = false,
  forceMount,
  hideWhenDetached = false,
  onBlurCapture,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onFocusCapture,
  onFocusOutside,
  onInteractOutside,
  onKeyDown,
  onOpenAutoFocus,
  onPlaced,
  onPointerDownOutside,
  onTouchMoveCapture,
  onWheelCapture,
  opaque = true,
  portalContainer,
  ref,
  side = "bottom",
  sideOffset,
  size = "default",
  sticky = "partial",
  style,
  unstyled = false,
  updatePositionStrategy = "optimized",
  variant = "default",
  ...props
}: PopoverContentProps) => {
  const { open } = usePopoverContext("PopoverContent");

  const scale = useContext(PopoverUiScaleContext);
  const owner = useContext(PopoverOverlayOwnerContext);
  const [content, setContent] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [triggerOffset, setTriggerOffset] = useState(0);

  const runtime = useContentRuntime({ content, contentRef, forceMount });

  const focus = usePopoverFocus(contentRef, content, {
    onCloseAutoFocus,
    onEscapeKeyDown,
    onFocusOutside,
    onInteractOutside,
    onOpenAutoFocus,
    onPointerDownOutside,
  });

  // The offset also follows the UI scale.
  useLayoutEffect(
    () =>
      content === null || sideOffset !== undefined
        ? noop
        : followMenuSurface(
            content.ownerDocument.querySelector(
              `[aria-controls="${CSS.escape(content.id)}"]`
            ),
            side,
            setTriggerOffset
          ),
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- The component measures again when the scale changes, though the measurement does not read it.
    [content, scale, side, sideOffset]
  );

  const popupStyle = popupStyleOf({
    hasContainer: portalContainer !== undefined && portalContainer !== null,
    scale,
    size,
    style,
  });

  const popup = (
    <PopoverPrimitive.Popup
      className={surfaceClassOf({
        animation,
        className,
        contentOverflow,
        disablePadding,
        opaque,
        size,
        unstyled,
        variant,
      })}
      data-ck-overlay-owner={owner?.id}
      data-slot="popover-content"
      finalFocus={focus.finalFocus}
      // The content takes its own initial focus (usePopoverFocus), whether or
      // not it holds a Popover.Close.
      initialFocus={false}
      onBlurCapture={(event) => {
        focus.onBlurCapture();
        onBlurCapture?.(event);
      }}
      onFocusCapture={(event) => {
        focus.onFocusCapture();
        onFocusCapture?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        focus.loopKeys(event.nativeEvent);
      }}
      onTouchMoveCapture={(event) => {
        runtime.scrollGuard.onTouchMoveCapture(event);
        onTouchMoveCapture?.(event);
      }}
      onWheelCapture={(event) => {
        runtime.scrollGuard.onWheelCapture(event);
        onWheelCapture?.(event);
      }}
      ref={mergeRefs<HTMLDivElement>(
        ref,
        setContent,
        contentRef,
        runtime.presenceRef,
        focus.scopeRef
      )}
      render={(renderProps) => (
        <PlacementReporter {...renderProps} open={open} />
      )}
      // oxlint-disable-next-line shadcn/no-inline-styles
      style={popupStyle}
      {...props}
    >
      {children}
    </PopoverPrimitive.Popup>
  );

  if (!runtime.isPresent) {
    return null;
  }

  return (
    <PopoverPortalHost
      container={portalContainer}
      disablePortal={disablePortal}
      forceMount={forceMount}
    >
      <PopoverPositioned
        arrowPadding={arrowPadding}
        onPlaced={onPlaced}
        options={{
          align,
          alignOffset,
          avoidCollisions,
          collisionBoundary,
          collisionPadding,
          hideWhenDetached,
          side,
          sideOffset: sideOffset ?? 5 + triggerOffset,
          sticky,
          updatePositionStrategy,
        }}
      >
        {popup}
      </PopoverPositioned>
    </PopoverPortalHost>
  );
};

/** Heading text of a popover. */
const PopoverTitle = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("font-medium", className)}
    data-slot="popover-title"
    {...props}
  />
);

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverFocusRestoreContext,
  PopoverOverlayOwnerContext,
  PopoverTitle,
  PopoverTrigger,
  PopoverUiScaleContext,
};

export type {
  PopoverAlign,
  PopoverContentProps,
  PopoverProps,
  PopoverSide,
  PopoverSize,
  PopoverVariant,
};
