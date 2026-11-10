"use client";

/* oxlint-disable eslint/eqeqeq, eslint/no-eq-null -- The component tests `!= null` for ids, actions and the content option; each test stays as written. */
/* oxlint-disable typescript/consistent-return, typescript/strict-void-return, typescript/promise-function-async -- Ref callbacks and layout effects return a cleanup only when they registered something, and the toast slot returns the caller's node. */
/* oxlint-disable eslint/complexity -- The toast factory keeps one branch per case. */
/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters -- Refs are callbacks or objects and the analytics payload is an opaque option. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- closest returns the toast li that Sonner renders and the window/node casts follow floating-ui. */

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ComponentProps, ReactNode, Ref } from "react";

import { ToastContent } from "./alert";
import { sonnerToast } from "./sonner";
import type { ToastPosition } from "./sonner";
import type { ToastAction, ToastLevel, ToastVariant } from "./types";

import styles from "./toast.module.css";

/* Toast management and positioning over registered content anchors. */

/** Seconds a toast stays when `duration` is not given. */
const DEFAULT_TOAST_DURATION_SECONDS = 4.5;
const MS_PER_SECOND = 1000;
const REMOVE_RECYCLE_FRAMES = 2;
const SPACING_ROWS = 4;
const OVERFLOW_PATTERN = /auto|scroll|overlay|hidden|clip/u;

export type ToastManagerPosition = "top-center-content" | ToastPosition;

export interface ToastRenderContext {
  close: () => void;
  level: ToastLevel;
}

export interface ToastOptions {
  actionPlacement?: "inline";
  /** Custom toasts: renders this instead of the Alert. */
  content?: (context: ToastRenderContext) => ReactNode;
  description?: ReactNode;
  /** Seconds; 0 keeps the toast until it is closed. */
  duration?: number;
  errorAnalytics?: unknown;
  /** false hides the close button and makes the toast non-dismissible. */
  hasCloseButton?: boolean;
  /** An existing id closes the earlier toast with that id. */
  id?: string;
  leading?: ReactNode;
  /** Custom toasts: the level passed to `content` (default info). */
  level?: ToastLevel;
  onRemove?: () => void;
  onUserDismiss?: () => void;
  position?: ToastManagerPosition;
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
  testId?: string;
  variant?: ToastVariant;
}

export interface ToastHandle {
  close: () => void;
}

export interface ToastManager {
  closeAll: () => void;
  custom: (options: ToastOptions) => ToastHandle;
  danger: (title: ReactNode, options?: ToastOptions) => ToastHandle;
  info: (title: ReactNode, options?: ToastOptions) => ToastHandle;
  registerViewport: () => () => void;
  success: (title: ReactNode, options?: ToastOptions) => ToastHandle;
  warning: (title: ReactNode, options?: ToastOptions) => ToastHandle;
}

/* Merges refs; callback refs may return a cleanup function. */
export const mergeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (value: T | null) => {
    if (value === null) {
      for (const ref of refs) {
        if (typeof ref === "function") {
          ref(null);
        } else if (ref) {
          ref.current = null;
        }
      }

      return;
    }

    const cleanups: (() => void)[] = [];

    for (const ref of refs) {
      if (typeof ref === "function") {
        const cleanup = ref(value);
        cleanups.push(
          typeof cleanup === "function"
            ? cleanup
            : () => {
                ref(null);
              }
        );
      } else if (ref) {
        ref.current = value;
        cleanups.push(() => {
          ref.current = null;
        });
      }
    }

    if (cleanups.length > 0) {
      return () => {
        for (const cleanup of cleanups) {
          cleanup();
        }
      };
    }
  };

/* The registry of content anchors; the last one wins. */
let anchors: readonly HTMLElement[] = [];
const anchorListeners = new Set<() => void>();

const setAnchors = (
  update: (current: readonly HTMLElement[]) => HTMLElement[]
) => {
  anchors = update(anchors);

  for (const listener of anchorListeners) {
    listener();
  }
};

const subscribeAnchors = (listener: () => void) => {
  anchorListeners.add(listener);

  return () => {
    anchorListeners.delete(listener);
  };
};

const readAnchors = () => anchors;
const readNoAnchors = (): readonly HTMLElement[] => [];

const registerAnchor = (element: HTMLDivElement | null) => {
  if (element === null) {
    return;
  }

  setAnchors((current) => [...current, element]);

  return () => {
    setAnchors((current) => current.filter((entry) => entry !== element));
  };
};

/** A div that registers itself as the column that `top-center-content` toasts centre over. */
export const ToastContentAnchor = ({
  ref,
  ...props
}: ComponentProps<"div">) => (
  <div {...props} ref={mergeRefs(ref, registerAnchor)} />
);

type ScrollTarget = Element | VisualViewport | Window;

const LAST_TRAVERSABLE = /^(?:html|body|#document)$/u;

const nodeName = (node: Node) => (node.nodeName || "").toLowerCase();

const viewOf = (node: Node | Window): Window =>
  (node as Node).ownerDocument?.defaultView ?? window;

/* An element that can scroll or clip its content. */
const isOverflowElement = (element: Element) => {
  const { overflow, overflowX, overflowY, display } =
    viewOf(element).getComputedStyle(element);

  return (
    OVERFLOW_PATTERN.test(`${overflow}${overflowY}${overflowX}`) &&
    display !== "inline" &&
    display !== "contents"
  );
};

/* The parent node, through slots and shadow roots. */
const parentNodeOf = (node: Node): Node => {
  if (nodeName(node) === "html") {
    return node;
  }

  const slotted = (node as Element).assignedSlot;
  const host = node instanceof ShadowRoot ? node.host : null;

  const parent =
    slotted ?? node.parentNode ?? host ?? viewOf(node).document.documentElement;

  return parent instanceof ShadowRoot ? parent.host : parent;
};

/* The nearest scrolling ancestor, or the body. */
const nearestOverflowAncestor = (node: Node): HTMLElement => {
  const parent = parentNodeOf(node);

  if (LAST_TRAVERSABLE.test(nodeName(parent))) {
    return (node.ownerDocument ?? (node as Document)).body;
  }

  if (parent instanceof HTMLElement && isOverflowElement(parent)) {
    return parent;
  }

  return nearestOverflowAncestor(parent);
};

/* The frame element of an embedded window. */
const frameOf = (view: Window) =>
  view.parent !== null && Object.getPrototypeOf(view.parent) !== null
    ? view.frameElement
    : null;

/* The scrolling ancestors, then the window, its visual viewport and the frames. */
const overflowAncestors = (
  node: Element,
  list: ScrollTarget[] = [],
  traverseIframes = true
): ScrollTarget[] => {
  const nearest = nearestOverflowAncestor(node);
  const isBody = nearest === node.ownerDocument?.body;
  const view = viewOf(nearest);

  if (isBody) {
    const frame = frameOf(view);

    return [
      ...list,
      view,
      ...(view.visualViewport ? [view.visualViewport] : []),
      ...(isOverflowElement(nearest) ? [nearest] : []),
      ...(frame !== null && traverseIframes ? overflowAncestors(frame) : []),
    ];
  }

  return [...list, nearest, ...overflowAncestors(nearest, [], traverseIframes)];
};

const sameRect = (left: DOMRect, right: DOMRect) =>
  left.x === right.x &&
  left.y === right.y &&
  left.width === right.width &&
  left.height === right.height;

/* Calls onMove when the element moves in the layout. */
const observeMove = (
  element: Element,
  onMove: () => void,
  skipOnResize: boolean
) => {
  let observer: IntersectionObserver | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const root = element.ownerDocument.documentElement;

  const cleanup = () => {
    clearTimeout(timeoutId);
    observer?.disconnect();
    observer = null;
  };

  const refresh = (skip = false, threshold = 1) => {
    cleanup();
    const rect = element.getBoundingClientRect();
    const { left, top, width, height } = rect;

    if (!skip) {
      onMove();
    }

    if (!width || !height) {
      return;
    }

    const insetTop = Math.floor(top);
    const insetRight = Math.floor(root.clientWidth - (left + width));
    const insetBottom = Math.floor(root.clientHeight - (top + height));
    const insetLeft = Math.floor(left);

    const options = {
      rootMargin: `${-insetTop}px ${-insetRight}px ${-insetBottom}px ${-insetLeft}px`,
      threshold: Math.max(0, Math.min(1, threshold)) || 1,
    };

    let firstUpdate = true;

    const handle = (entries: IntersectionObserverEntry[]) => {
      const ratio = entries[0]?.intersectionRatio ?? 0;

      if (!sameRect(rect, element.getBoundingClientRect())) {
        refresh();

        return;
      }

      if (ratio !== threshold) {
        if (!firstUpdate) {
          refresh();

          return;
        }

        if (ratio) {
          refresh(false, ratio);
        } else {
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 1000);
        }
      }

      firstUpdate = false;
    };

    try {
      observer = new IntersectionObserver(handle, {
        ...options,
        root: element.ownerDocument,
      });
    } catch {
      observer = new IntersectionObserver(handle, options);
    }

    observer.observe(element);
  };

  const onResize = () => {
    refresh(skipOnResize);
  };

  const view = element.ownerDocument.defaultView ?? window;
  view.addEventListener("resize", onResize);
  refresh(true);

  return () => {
    view.removeEventListener("resize", onResize);
    cleanup();
  };
};

/* Floating-ui autoUpdate for a reference element (no floating element). */
const autoUpdate = (reference: Element, update: () => void) => {
  const targets = overflowAncestors(reference);

  for (const target of targets) {
    target.addEventListener("scroll", update);
    target.addEventListener("resize", update);
  }

  const stopMove =
    typeof IntersectionObserver === "function"
      ? observeMove(reference, update, true)
      : null;

  const resizeObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          update();
        })
      : null;

  resizeObserver?.observe(reference);
  update();

  return () => {
    for (const target of targets) {
      target.removeEventListener("scroll", update);
      target.removeEventListener("resize", update);
    }

    stopMove?.();
    resizeObserver?.disconnect();
  };
};

/** Centres the toast over the last registered content anchor. */
const ToastContentCentered = ({ children }: { children: ReactNode }) => {
  const registered = useSyncExternalStore(
    subscribeAnchors,
    readAnchors,
    readNoAnchors
  );

  const anchor = registered.at(-1);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const toast = ref.current?.closest<HTMLElement>("[data-sonner-toast]");

    if (!toast || !anchor) {
      return;
    }

    const stop = autoUpdate(anchor, () => {
      const { left, width } = anchor.getBoundingClientRect();
      toast.style.setProperty(
        "--toast-body-offset-x",
        `${left + width / 2 - window.innerWidth / 2}px`
      );
      toast.style.setProperty(
        "--toast-body-max-width",
        `calc(${width}px - var(--spacing) * ${SPACING_ROWS})`
      );
    });

    return () => {
      stop();
      toast.style.removeProperty("--toast-body-offset-x");
      toast.style.removeProperty("--toast-body-max-width");
    };
  }, [anchor]);

  return (
    <div className="contents" ref={ref}>
      {children}
    </div>
  );
};

/** Renders the toast content and reports mount and unmount to the manager. */
const ManagedToast = ({
  content,
  isRemoved,
  onMount,
}: {
  content: ReactNode;
  isRemoved: () => boolean;
  onMount: () => () => void;
}) => {
  useLayoutEffect(onMount, [onMount]);

  return isRemoved() ? null : content;
};

let toastSequence = 1;

interface ToastManagerConfig {
  /** Called for every danger toast with its `errorAnalytics` option. */
  onDanger?: (analytics: unknown) => void;
  /** Id prefix and the Toaster id the toasts belong to. */
  scopeId: string;
  /** Close button label passed to the Alert; the default is "Close". */
  closeLabel?: string;
}

/** The toast manager of one provider. */
export const createToastManager = ({
  closeLabel,
  onDanger,
  scopeId,
}: ToastManagerConfig): ToastManager => {
  let viewportRegistered = false;
  const pending = new Map<string, () => void>();
  const closers = new Map<string, () => void>();
  const sequences = new Map<string, number>();
  const idsByCustomId = new Map<string, string>();
  const recycledIds: string[] = [];

  const show = (
    title: ReactNode,
    options: ToastOptions | undefined,
    level: ToastLevel
  ): ToastHandle => {
    if (level === "danger") {
      try {
        onDanger?.(options?.errorAnalytics);
      } catch {
        // The analytics callback must not stop the toast.
      }
    }

    const sequence = toastSequence;
    toastSequence += 1;
    const id = recycledIds.pop() ?? `${scopeId}-toast-${sequence}`;
    sequences.set(id, sequence);
    let shownInSonner = false;
    let removed = false;
    let cleanedUp = false;
    let closeRequested = false;
    let mounted = false;
    let recycling = false;

    const recycle = () => {
      if (!cleanedUp || mounted || recycling) {
        return;
      }

      recycling = true;
      let frames = REMOVE_RECYCLE_FRAMES;

      const step = () => {
        frames -= 1;

        if (frames > 0) {
          requestAnimationFrame(step);

          return;
        }

        if (mounted) {
          recycling = false;
        } else {
          recycledIds.push(id);
        }
      };

      requestAnimationFrame(step);
    };

    const finish = () => {
      if (removed) {
        return;
      }

      removed = true;

      if (closers.size === 1) {
        const active = document.activeElement;

        if (
          active instanceof HTMLElement &&
          active.closest("[data-sonner-toaster]") !== null
        ) {
          active.blur();
        }
      }

      pending.delete(id);
      closers.delete(id);
      sequences.delete(id);

      if (options?.id != null && idsByCustomId.get(options.id) === id) {
        idsByCustomId.delete(options.id);
      }

      try {
        options?.onRemove?.();
      } catch {
        // A failing onRemove must not stop the removal.
      }
    };

    const cleanup = () => {
      finish();

      if (!cleanedUp) {
        cleanedUp = true;
        recycle();
      }
    };

    const close = () => {
      if (removed || sequences.get(id) !== sequence) {
        return;
      }

      closeRequested = true;

      if (shownInSonner) {
        sonnerToast.dismiss(id);
        finish();
      } else {
        cleanup();
      }
    };

    const previous =
      options?.id == null ? undefined : idsByCustomId.get(options.id);

    if (previous != null) {
      closers.get(previous)?.();
    }

    if (options?.id != null) {
      idsByCustomId.set(options.id, id);
    }

    closers.set(id, close);

    const onUserDismiss = () => {
      if (
        !removed &&
        !closeRequested &&
        options != null &&
        "content" in options
      ) {
        try {
          options.onUserDismiss?.();
        } catch {
          // A failing onUserDismiss must not stop the dismissal.
        }
      }

      cleanup();
    };

    const onMount = () => {
      mounted = true;
      const seconds = options?.duration ?? DEFAULT_TOAST_DURATION_SECONDS;

      const timer =
        level === "success" &&
        options?.duration !== 0 &&
        Number.isFinite(seconds) &&
        options?.primaryAction == null &&
        options?.secondaryAction == null &&
        !(options != null && "content" in options)
          ? setTimeout(close, seconds * MS_PER_SECOND)
          : undefined;

      return () => {
        clearTimeout(timer);
        mounted = false;
        queueMicrotask(() => {
          if (!mounted) {
            cleanup();
            recycle();
          }
        });
      };
    };

    const body =
      options != null && "content" in options && options.content ? (
        <div className="max-w-full min-w-0" data-testid={options.testId}>
          {options.content({ close, level })}
        </div>
      ) : (
        <ToastContent
          actionPlacement={options?.actionPlacement}
          closeLabel={closeLabel}
          description={options?.description}
          leading={options?.leading}
          level={level}
          onClose={options?.hasCloseButton === false ? undefined : close}
          primaryAction={options?.primaryAction}
          secondaryAction={options?.secondaryAction}
          testId={options?.testId}
          title={title}
          variant={options?.variant}
        />
      );

    const position = options?.position ?? "top-center";
    const centered = position === "top-center-content";

    const showInSonner = () => {
      shownInSonner = true;
      sonnerToast.custom(
        () => (
          <ManagedToast
            content={
              centered ? (
                <ToastContentCentered>{body}</ToastContentCentered>
              ) : (
                body
              )
            }
            isRemoved={() => removed}
            onMount={onMount}
          />
        ),
        {
          className: centered ? styles.contentCentered : undefined,
          dismissible: options?.hasCloseButton ?? true,
          duration:
            options?.duration === 0
              ? Number.POSITIVE_INFINITY
              : (options?.duration ?? DEFAULT_TOAST_DURATION_SECONDS) *
                MS_PER_SECOND,
          id,
          onAutoClose: cleanup,
          onDismiss: onUserDismiss,
          position: centered ? "top-center" : position,
          toasterId: scopeId,
          unstyled: true,
        }
      );
    };

    if (!removed) {
      pending.set(id, showInSonner);

      if (viewportRegistered) {
        showInSonner();
      }
    }

    return { close };
  };

  return {
    closeAll() {
      // CloseAll copies the closers first: an onRemove that creates
      // another toast must not get that new toast closed by this call.
      const snapshot = [...closers.values()];

      for (const close of snapshot) {
        close();
      }
    },
    custom(options) {
      return show(null, options, options.level ?? "info");
    },
    danger(title, options) {
      return show(title, options, "danger");
    },
    info(title, options) {
      return show(title, options, "info");
    },
    registerViewport() {
      viewportRegistered = true;

      for (const showPending of pending.values()) {
        showPending();
      }

      return () => {
        viewportRegistered = false;
      };
    },
    success(title, options) {
      return show(title, options, "success");
    },
    warning(title, options) {
      return show(title, options, "warning");
    },
  };
};
