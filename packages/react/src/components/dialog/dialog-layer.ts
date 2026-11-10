"use client";

/*
 * Behaviour the dialog gets from a Radix-style layer stack: FocusScope, the
 * Escape stack and the helpers around them, based on Radix UI. The
 * DismissableLayer itself lives in lib/dismissable-layer, which tooltips share.
 */

import { noCleanup, useLatest } from "@workspace/react/lib/dismissable-layer";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  Ref,
  RefCallback,
  RefObject,
} from "react";

/* ----------------------------------------------------------------- refs --- */

/** True for `null` and `undefined`, the two values the component tests with `== null`. */
const isNil = <T>(value: T): value is T & (null | undefined) =>
  value === null || value === undefined;

type RefCleanup = (() => void) | undefined;

const setRef = <T>(ref: Ref<T> | undefined, value: T | null): RefCleanup => {
  if (isNil(ref)) {
    return undefined;
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- A ref is a callback or an object.
  if (typeof ref === "function") {
    const cleanup = ref(value);

    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- A callback ref returns a cleanup function or nothing.
    return typeof cleanup === "function" ? cleanup : undefined;
  }

  // oxlint-disable-next-line react/refs -- This is the merged ref callback: it writes the element into each object ref it was given.
  ref.current = value;

  return undefined;
};

/**
 * Merges refs into one callback ref. A callback ref may return a cleanup
 * function (React 19); the merged ref then returns one that calls each
 * cleanup, and resets the refs that returned none, as React does.
 */
const mergeRefs =
  <T>(...refs: readonly (Ref<T> | undefined)[]): RefCallback<T> =>
  (value: T | null) => {
    const cleanups = refs.map((ref) => setRef(ref, value));

    return () => {
      for (const [index, ref] of refs.entries()) {
        const cleanup = cleanups[index];

        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The cleanup is a function or nothing.
        if (typeof cleanup === "function") {
          cleanup();
        } else {
          setRef(ref, null);
        }
      }
    };
  };

/** The event type names Radix uses for focus scopes. */
const AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
const AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";

/* ------------------------------------------------------------- tabbable --- */

type FocusableElement = HTMLElement | SVGElement;

/** The focused element, looking through open shadow roots. */
const deepActiveElement = (): Element | null => {
  let active = document.activeElement;

  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
};

/** The element hosting the shadow root that holds `node`, if any. */
const shadowHost = (node: Node): Element | null => {
  const root = node.getRootNode();

  return root instanceof ShadowRoot ? root.host : null;
};

/** Whether `node` is inside `container`, crossing shadow roots. */
const containsDeep = (container: Node, node: Node | null): boolean => {
  let current = node;

  while (current) {
    if (container.contains(current)) {
      return true;
    }

    current = shadowHost(current);
  }

  return false;
};

/** Visibility fallback for browsers without `checkVisibility`. */
const isHidden = (node: FocusableElement, upTo: HTMLElement) => {
  if (getComputedStyle(node).visibility === "hidden") {
    return true;
  }

  let current: Element | null = node;

  while (current) {
    if (current === upTo) {
      return false;
    }

    if (getComputedStyle(current).display === "none") {
      return true;
    }

    current =
      current.assignedSlot ?? current.parentElement ?? shadowHost(current);
  }

  return false;
};

/**
 * The tabbable candidates in tree order. The walk skips hidden
 * and inert subtrees, enters open shadow roots (a host that delegates focus
 * is not itself a candidate, and one with a negative `tabindex` is not
 * entered) and follows the assigned nodes of a slot.
 */
const getTabbableCandidates = (container: HTMLElement): FocusableElement[] => {
  const nodes: FocusableElement[] = [];

  const visit = (element: Element) => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      return;
    }

    if (
      element instanceof HTMLElement &&
      (element.hidden !== false || element.inert)
    ) {
      return;
    }

    const { shadowRoot } = element;

    const isHiddenInput =
      element instanceof HTMLInputElement && element.type === "hidden";

    const isDisabled = "disabled" in element && Boolean(element.disabled);

    if (
      !isDisabled &&
      !isHiddenInput &&
      element.tabIndex >= 0 &&
      shadowRoot?.delegatesFocus !== true
    ) {
      nodes.push(element);
    }

    if (
      shadowRoot &&
      element.hasAttribute("tabindex") &&
      element.tabIndex < 0
    ) {
      return;
    }

    let children: Iterable<Element> = element.children;

    if (shadowRoot) {
      ({ children } = shadowRoot);
    } else if (element instanceof HTMLSlotElement) {
      children = element.assignedElements({ flatten: true });
    }

    for (const child of children) {
      visit(child);
    }
  };

  for (const child of container.children) {
    visit(child);
  }

  return nodes;
};

/** The first candidate that is visible. */
const findVisible = (
  elements: readonly FocusableElement[],
  container: HTMLElement
) => {
  const containerIsVisible =
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The component checks that the browser has checkVisibility before using it.
    typeof container.checkVisibility === "function" &&
    container.checkVisibility({ checkVisibilityCSS: true });

  return elements.find((element) =>
    containerIsVisible
      ? element.checkVisibility({ checkVisibilityCSS: true })
      : !isHidden(element, container)
  );
};

const getTabbableEdges = (container: HTMLElement) => {
  const candidates = getTabbableCandidates(container);

  return [
    findVisible(candidates, container),
    findVisible(candidates.toReversed(), container),
  ] as const;
};

/** Radix `focus`: focuses without scrolling, and selects an input's text when asked. */
const focusElement = (
  element: FocusableElement | null | undefined,
  options?: { select?: boolean }
) => {
  if (isNil(element)) {
    return;
  }

  const previous = deepActiveElement();
  element.focus({ preventScroll: true });

  if (
    options?.select === true &&
    element !== previous &&
    element instanceof HTMLInputElement
  ) {
    element.select();
  }
};

/** Radix `focusFirst` over candidates, links removed as `removeLinks` does. */
const focusFirstCandidate = (container: HTMLElement) => {
  const candidates = getTabbableCandidates(container).filter(
    (element) => element.tagName !== "A"
  );

  const previous = deepActiveElement();

  for (const candidate of candidates) {
    focusElement(candidate, { select: true });

    if (deepActiveElement() !== previous) {
      return;
    }
  }
};

/**
 * The Tab loop of the Radix FocusScope with `loop` on: Tab on the last
 * tabbable focuses the first and Shift+Tab on the first tabbable, or on the
 * scope itself, focuses the last.
 */
const loopTabKey = (event: ReactKeyboardEvent<HTMLElement>) => {
  const isTab =
    event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;

  const focused = deepActiveElement();

  if (!isTab || !focused) {
    return;
  }

  const container = event.currentTarget;
  const [first, last] = getTabbableEdges(container);

  if (!(first && last)) {
    if (focused === container) {
      event.preventDefault();
    }

    return;
  }

  if (!event.shiftKey && focused === last) {
    event.preventDefault();
    focusElement(first, { select: true });
  } else if (event.shiftKey && (focused === first || focused === container)) {
    event.preventDefault();
    focusElement(last, { select: true });
  }
};

/* ------------------------------------------------------------- Escape stack --- */

interface EscapeEntry {
  callback: RefObject<() => void>;
  id: symbol;
}

let escapeStack: EscapeEntry[] = [];
let escapeListening = false;

const onEscapeKey = (event: KeyboardEvent) => {
  if (event.key !== "Escape") {
    return;
  }

  const [top] = escapeStack;

  if (top !== undefined) {
    event.preventDefault();
    top.callback.current();
  }
};

const syncEscapeListener = () => {
  if (escapeStack.length > 0 && !escapeListening) {
    document.body.addEventListener("keydown", onEscapeKey);
    escapeListening = true;
  } else if (escapeStack.length === 0 && escapeListening) {
    document.body.removeEventListener("keydown", onEscapeKey);
    escapeListening = false;
  }
};

/**
 * One body keydown listener runs the
 * callback of the most recently opened registrant on Escape and prevents the
 * default.
 */
const useEscapeStack = (active: boolean, onEscape: () => void) => {
  const latest = useLatest(onEscape);

  useEffect(() => {
    if (!active) {
      return noCleanup;
    }

    const entry: EscapeEntry = { callback: latest, id: Symbol("escape") };
    escapeStack.unshift(entry);
    syncEscapeListener();

    return () => {
      escapeStack = escapeStack.filter((item) => item.id !== entry.id);
      syncEscapeListener();
    };
  }, [active, latest]);
};

/* ------------------------------------------------------------ focus scopes --- */

/**
 * The focus scopes stack, shared by every
 * family whose content mounts a FocusScope: dialog, modal, menu, submenu and
 * popover. The newest scope is active and every older one is paused, so a
 * dialog or menu opened above a modal popover holds focus alone and the
 * popover's trap resumes when it closes.
 */
const focusScopes: FocusScope[] = [];

/** A Radix FocusScope on the shared stack: paused while a newer one is on top. */
interface FocusScope {
  paused: boolean;
}

interface FocusScopeOwner {
  ref: RefCallback<Element>;
  scope: FocusScope;
}

const addFocusScope = (scope: FocusScope) => {
  const [top] = focusScopes;

  if (top !== undefined && top !== scope) {
    top.paused = true;
  }

  const index = focusScopes.indexOf(scope);

  if (index !== -1) {
    focusScopes.splice(index, 1);
  }

  focusScopes.unshift(scope);
};

const removeFocusScope = (scope: FocusScope) => {
  const index = focusScopes.indexOf(scope);

  if (index !== -1) {
    focusScopes.splice(index, 1);
  }

  const [top] = focusScopes;

  if (top !== undefined) {
    top.paused = false;
  }
};

/** Pending removal timers, set when a scope's content leaves. */
const pendingRemovals = new WeakMap<FocusScope, number>();

/** The content mounted: join the stack, or cancel the removal a re-attach interrupted. */
const joinFocusScope = (scope: FocusScope) => {
  const pending = pendingRemovals.get(scope);

  if (pending === undefined) {
    addFocusScope(scope);

    return;
  }

  window.clearTimeout(pending);
  pendingRemovals.delete(scope);
};

/** The content left: Radix removes the scope in the next task. */
const leaveFocusScope = (scope: FocusScope) => {
  pendingRemovals.set(
    scope,
    window.setTimeout(() => {
      pendingRemovals.delete(scope);
      removeFocusScope(scope);
    }, 0)
  );
};

/**
 * Registers the content element it receives with the shared focus scopes
 * stack. The scope joins in the commit that attaches the
 * element, before any effect moves focus into it, and leaves in the next task
 * after the element is gone, as Radix removes it after the unmount autofocus.
 * Re-attaching in the same task (a merged ref that changes identity) keeps the
 * scope where it is.
 */
const useFocusScope = (): FocusScopeOwner => {
  const scope = useMemo<FocusScope>(() => ({ paused: false }), []);

  const ref = useCallback(
    (element: Element | null) => {
      if (!element) {
        return noCleanup;
      }

      joinFocusScope(scope);

      return () => {
        leaveFocusScope(scope);
      };
    },
    [scope]
  );

  return { ref, scope };
};

/* ------------------------------------------------------------ small hooks --- */

/** A media query, false on the server. */
const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);

      return () => {
        list.removeEventListener("change", listener);
      };
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
};

/** True after the first client render. */
const useIsClient = (): boolean =>
  useSyncExternalStore(
    () => () => {
      // The value never changes after hydration.
    },
    () => true,
    () => false
  );

/**
 * Runs the callback after two animation frames, or
 * after a timeout when the page is hidden. Returns the cancel function.
 */
const afterFrames = (task: () => void, frames = 2): (() => void) => {
  if (
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The component checks that the browser has requestAnimationFrame before using it.
    typeof window.requestAnimationFrame !== "function" ||
    document.visibilityState === "hidden"
  ) {
    const timer = setTimeout(task, 0);

    return () => {
      clearTimeout(timer);
    };
  }

  let remaining = frames;
  let handle = 0;

  const step = () => {
    remaining -= 1;

    if (remaining === 0) {
      task();
    } else {
      handle = window.requestAnimationFrame(step);
    }
  };

  handle = window.requestAnimationFrame(step);

  return () => {
    window.cancelAnimationFrame(handle);
  };
};

export {
  AUTOFOCUS_ON_MOUNT,
  AUTOFOCUS_ON_UNMOUNT,
  afterFrames,
  focusElement,
  focusFirstCandidate,
  getTabbableCandidates,
  isNil,
  loopTabKey,
  mergeRefs,
  containsDeep,
  deepActiveElement,
  useEscapeStack,
  useFocusScope,
  useIsClient,
  useMediaQuery,
};

export type { FocusScope };
