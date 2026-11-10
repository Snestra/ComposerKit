"use client";

/* oxlint-disable eslint/complexity, shadcn/no-inline-styles, jsx-a11y/prefer-tag-over-role, react/jsx-no-constructed-context-values -- SplitView is one component that branches on drawer, collapsed and resizing states, sizes its panes with CSS variables and inline transition properties, and uses a div with role=separator that has a focusable child-less hit area and keyboard handler. */

import {
  DRAWER_BREAKPOINT,
  HANDLE_WIDTH,
  KEYBOARD_STEP,
  MIN_PANE_WIDTH,
  RIGHT_FADE_IN_DELAY_MS,
  boundLeftWidth,
  clampRatio,
  clampTo,
  drawerWidth,
  layoutPanes,
  maxLeftWidth,
  nonNegative,
  ratioFromPercent,
} from "composerkit/components/panes/split-math";
import { cn } from "composerkit/lib/utils";
import {
  Activity,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from "react";

/*
 * Resizable two-pane view. It writes the pane sizes as CSS variables on the container, so a drag
 * does not re-render.
 */

type SplitSide = "left" | "right";

interface SplitViewContextValue {
  collapse: (side: SplitSide) => void;
  expand: (side: SplitSide) => void;
  isLeftOpen: boolean;
  isResizing: boolean;
  isRightOpen: boolean;
  toggle: (side: SplitSide) => void;
}

const SplitViewContext = createContext<SplitViewContextValue | null>(null);

const useSplitView = () => {
  const value = useContext(SplitViewContext);

  if (value === null) {
    throw new Error("SplitView is required before calling useSplitView.");
  }

  return value;
};

interface SplitViewProps {
  className?: string;
  defaultLeftPercent?: number;
  drawerBreakpoint?: number;
  drawerMaxWidth?: number;
  drawerVisibleInset?: number;
  handleClassName?: string;
  handleWidth?: number;
  id: string;
  isLeftOpen?: boolean;
  isRightOpen?: boolean;
  left: ReactNode;
  leftClassName?: string;
  minLeftWidth?: number;
  minRightWidth?: number;
  onLeftOpenChange?: (open: boolean) => void;
  onRightOpenChange?: (open: boolean) => void;
  right?: ReactNode;
  rightClassName?: string;
}

interface WriteLayoutArgs {
  container: number;
  handleWidth: number;
  immediate?: boolean;
  left: number;
  node: HTMLElement;
  raf: RefObject<number | null>;
  right?: number;
  translate?: number;
}

const writeLayout = ({
  container,
  handleWidth,
  immediate = false,
  left,
  node,
  raf,
  right,
  translate = 0,
}: WriteLayoutArgs) => {
  const width = nonNegative(container);
  const leftWidth = clampTo(left, width);
  const rightWidth = clampTo(right ?? Math.max(0, width - leftWidth), width);
  const rightTranslate = clampTo(translate, rightWidth);

  const apply = () => {
    node.style.setProperty("--ck-split-left-width", `${leftWidth}px`);
    node.style.setProperty("--ck-split-handle-width", `${handleWidth}px`);
    node.style.setProperty("--ck-split-right-width", `${rightWidth}px`);
    node.style.setProperty("--ck-split-right-translate", `${rightTranslate}px`);
    node
      .querySelector(':scope > [role="separator"]')
      ?.setAttribute("aria-valuenow", String(leftWidth));
  };

  if (raf.current !== null) {
    cancelAnimationFrame(raf.current);
    raf.current = null;
  }

  if (immediate) {
    apply();

    return;
  }

  raf.current = requestAnimationFrame(apply);
};

const suppressTransitions = (
  elements: readonly RefObject<HTMLElement | null>[],
  raf: RefObject<number | null>
) => {
  for (const element of elements) {
    element.current?.style.setProperty("transition", "none");
  }

  if (raf.current !== null) {
    cancelAnimationFrame(raf.current);
  }

  raf.current = requestAnimationFrame(() => {
    raf.current = requestAnimationFrame(() => {
      for (const element of elements) {
        element.current?.style.removeProperty("transition");
      }

      raf.current = null;
    });
  });
};

const restoreTransitions = (
  elements: readonly RefObject<HTMLElement | null>[],
  raf: RefObject<number | null>
) => {
  if (raf.current !== null) {
    cancelAnimationFrame(raf.current);
    raf.current = null;
  }

  for (const element of elements) {
    element.current?.style.removeProperty("transition");
  }
};

const noCleanup = () => {
  // There is nothing to undo when the effect did not subscribe.
};

const measuredWidth = (known: number, node: HTMLElement | null) =>
  known > 0 ? known : (node?.getBoundingClientRect().width ?? 0);

const storageKeyFor = (id: string) => `${id}:split-left-width`;

const readStoredRatio = (key: string) => {
  try {
    const raw = window.localStorage.getItem(key);

    return raw === null ? Number.NaN : Number(JSON.parse(raw));
  } catch {
    return Number.NaN;
  }
};

const writeStoredRatio = (key: string, ratio: number) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(ratio));
  } catch {
    // Storage can be unavailable; the ratio then lasts for the session only.
  }
};

const isStoredRatio = (value: number) => Number.isFinite(value) && value <= 1;

const SplitView = ({
  className,
  defaultLeftPercent,
  drawerBreakpoint = DRAWER_BREAKPOINT,
  drawerMaxWidth,
  drawerVisibleInset = 0,
  handleClassName,
  handleWidth: handleWidthProp = HANDLE_WIDTH,
  id,
  isLeftOpen: isLeftOpenProp = true,
  isRightOpen: isRightOpenProp = true,
  left,
  leftClassName,
  minLeftWidth = MIN_PANE_WIDTH,
  minRightWidth = MIN_PANE_WIDTH,
  onLeftOpenChange,
  onRightOpenChange,
  right,
  rightClassName,
}: SplitViewProps) => {
  const hasRight = right !== null && right !== undefined;
  const rightOpen = hasRight ? isRightOpenProp : false;
  const leftOpen = !hasRight || isLeftOpenProp;
  const storageKey = storageKeyFor(id);
  const defaultRatio = ratioFromPercent(defaultLeftPercent);

  const initialRatio = useMemo(() => {
    const stored = readStoredRatio(storageKey);

    return isStoredRatio(stored) ? clampRatio(stored) : defaultRatio;
  }, [defaultRatio, storageKey]);

  const [containerWidth, setContainerWidth] = useState(0);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const layoutRaf = useRef<number | null>(null);
  const transitionRaf = useRef<number | null>(null);
  const dragOrigin = useRef<number | null>(null);
  const initialized = useRef(false);
  const lastWidth = useRef<number | null>(null);
  const lastLeftOpen = useRef<boolean | null>(null);
  const leftRatio = useRef(initialRatio);
  const rightWidth = useRef(0);

  const persistedRatio = useRef<number | null>(
    Number.isNaN(readStoredRatio(storageKey)) ? null : initialRatio
  );

  const animated = useMemo(() => [leftPaneRef, handleRef, rightPaneRef], []);

  const rightOnly = hasRight && !leftOpen && rightOpen;

  const isDrawer =
    drawerBreakpoint > 0 &&
    hasRight &&
    containerWidth > 0 &&
    containerWidth <= drawerBreakpoint &&
    !rightOnly;

  const handleWidth = isDrawer ? 0 : handleWidthProp;
  const handleActive = hasRight && !isDrawer && leftOpen && rightOpen;

  const persist = useCallback(
    (ratio: number) => {
      if (persistedRatio.current === ratio) {
        return;
      }

      writeStoredRatio(storageKey, ratio);
      persistedRatio.current = ratio;
    },
    [storageKey]
  );

  const measure = useCallback(
    () => measuredWidth(containerWidth, containerRef.current),
    [containerWidth]
  );

  const placeDrawer = useCallback(
    (container: number, open: boolean, node: HTMLElement) => {
      const width = drawerWidth(
        container,
        minRightWidth,
        drawerMaxWidth,
        drawerVisibleInset
      );

      writeLayout({
        container,
        handleWidth: 0,
        immediate: true,
        left: container,
        node,
        raf: layoutRaf,
        right: width,
        translate: open ? 0 : width,
      });
    },
    [drawerMaxWidth, drawerVisibleInset, minRightWidth]
  );

  const placeRightHidden = useCallback(
    (container: number, node: HTMLElement) => {
      const available = nonNegative(container);

      const bounded = layoutPanes(
        container,
        minLeftWidth,
        minRightWidth,
        available * clampRatio(leftRatio.current)
      );

      leftRatio.current = bounded.boundedLeftRatio;

      const width = clampTo(
        rightWidth.current > 0 ? rightWidth.current : bounded.rightWidth,
        available
      );

      rightWidth.current = width;
      writeLayout({
        container,
        handleWidth: 0,
        immediate: true,
        left: container,
        node,
        raf: layoutRaf,
        right: width,
        translate: width,
      });
    },
    [minLeftWidth, minRightWidth]
  );

  const placeBoth = useCallback(
    (container: number, node: HTMLElement, persistRatio: boolean) => {
      const bounded = layoutPanes(
        container,
        minLeftWidth,
        minRightWidth,
        nonNegative(container) * clampRatio(leftRatio.current)
      );

      rightWidth.current = bounded.rightWidth;
      leftRatio.current = bounded.boundedLeftRatio;

      if (persistRatio) {
        persist(bounded.boundedLeftRatio);
      }

      writeLayout({
        container,
        handleWidth,
        immediate: true,
        left: bounded.boundedLeftWidth,
        node,
        raf: layoutRaf,
        right: bounded.rightWidth,
      });
    },
    [handleWidth, minLeftWidth, minRightWidth, persist]
  );

  useLayoutEffect(() => {
    const node = containerRef.current;

    if (node) {
      setContainerWidth(node.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    const node = containerRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return noCleanup;
    }

    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(
    () => () => {
      for (const raf of [layoutRaf, transitionRaf]) {
        if (raf.current !== null) {
          cancelAnimationFrame(raf.current);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (containerWidth > 0 && hasRight && !leftOpen && !isRightOpenProp) {
      onLeftOpenChange?.(true);
    }
  }, [containerWidth, hasRight, isRightOpenProp, leftOpen, onLeftOpenChange]);

  useLayoutEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return noCleanup;
    }

    const width = measuredWidth(containerWidth, node);

    if (!width) {
      return noCleanup;
    }

    const widthChanged =
      lastWidth.current !== null && Math.abs(lastWidth.current - width) >= 1;

    const openChanged =
      lastLeftOpen.current !== null && lastLeftOpen.current !== leftOpen;

    if (!initialized.current || widthChanged || openChanged) {
      suppressTransitions(animated, transitionRaf);
      initialized.current = true;
    }

    lastWidth.current = width;
    lastLeftOpen.current = leftOpen;

    if (isDrawer) {
      placeDrawer(width, rightOpen, node);

      return noCleanup;
    }

    if (!hasRight) {
      writeLayout({
        container: width,
        handleWidth: 0,
        immediate: true,
        left: width,
        node,
        raf: layoutRaf,
        right: 0,
      });

      return noCleanup;
    }

    if (!rightOpen) {
      placeRightHidden(width, node);

      return noCleanup;
    }

    if (!leftOpen) {
      rightWidth.current = nonNegative(width);
      writeLayout({
        container: width,
        handleWidth,
        immediate: true,
        left: 0,
        node,
        raf: layoutRaf,
        right: nonNegative(width),
      });

      return noCleanup;
    }

    placeBoth(width, node, true);

    return () => {
      if (layoutRaf.current !== null) {
        cancelAnimationFrame(layoutRaf.current);
        layoutRaf.current = null;
      }
    };
  }, [
    animated,
    containerWidth,
    handleWidth,
    hasRight,
    isDrawer,
    leftOpen,
    placeBoth,
    placeDrawer,
    placeRightHidden,
    rightOpen,
  ]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const node = containerRef.current;
    const width = measure();

    if (isDrawer || !node || !width) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = node.getBoundingClientRect().left;

    if (!leftOpen) {
      onLeftOpenChange?.(true);
    }

    if (!rightOpen) {
      onRightOpenChange?.(true);
    }

    setIsResizing(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const node = containerRef.current;

    if (!node || !containerWidth || !rightOpen) {
      return;
    }

    let next = containerWidth * leftRatio.current;

    if (event.key === "ArrowLeft") {
      next -= KEYBOARD_STEP;
    } else if (event.key === "ArrowRight") {
      next += KEYBOARD_STEP;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = containerWidth;
    } else {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const bounded = layoutPanes(
      containerWidth,
      minLeftWidth,
      minRightWidth,
      next
    );

    leftRatio.current = bounded.boundedLeftRatio;
    rightWidth.current = bounded.rightWidth;
    writeLayout({
      container: containerWidth,
      handleWidth,
      immediate: true,
      left: bounded.boundedLeftWidth,
      node,
      raf: layoutRaf,
    });
    persist(bounded.boundedLeftRatio);
  };

  useEffect(() => {
    if (!isResizing) {
      return noCleanup;
    }

    const pointerLeft = (event: PointerEvent, node: HTMLElement) => {
      const origin = dragOrigin.current ?? node.getBoundingClientRect().left;

      dragOrigin.current = origin;

      return event.clientX - origin;
    };

    const applyDrag = (event: PointerEvent, immediate: boolean) => {
      const node = containerRef.current;
      const width = measuredWidth(containerWidth, node);

      if (!node || !width) {
        return false;
      }

      const bounded = layoutPanes(
        width,
        minLeftWidth,
        minRightWidth,
        pointerLeft(event, node)
      );

      rightWidth.current = bounded.rightWidth;
      leftRatio.current = bounded.boundedLeftRatio;
      writeLayout({
        container: width,
        handleWidth,
        immediate,
        left: bounded.boundedLeftWidth,
        node,
        raf: layoutRaf,
        right: bounded.rightWidth,
      });

      return true;
    };

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      applyDrag(event, false);
    };

    const onEnd = (event: PointerEvent) => {
      event.preventDefault();

      if (applyDrag(event, true) && leftOpen && rightOpen) {
        persist(leftRatio.current);
      }

      dragOrigin.current = null;
      setIsResizing(false);
    };

    const onBlur = () => {
      dragOrigin.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      window.removeEventListener("blur", onBlur);
      dragOrigin.current = null;
    };
  }, [
    containerWidth,
    handleWidth,
    isResizing,
    leftOpen,
    minLeftWidth,
    minRightWidth,
    persist,
    rightOpen,
  ]);

  const collapse = (side: SplitSide) => {
    if (side === "left") {
      if (!leftOpen) {
        return;
      }

      restoreTransitions(animated, transitionRaf);
      onLeftOpenChange?.(false);

      const node = containerRef.current;
      const width = measure();

      if (!node || !width) {
        return;
      }

      const available = nonNegative(width);

      rightWidth.current = available;
      writeLayout({
        container: width,
        handleWidth,
        immediate: true,
        left: 0,
        node,
        raf: layoutRaf,
        right: available,
      });

      return;
    }

    if (!rightOpen || !hasRight) {
      return;
    }

    restoreTransitions(animated, transitionRaf);
    onRightOpenChange?.(false);

    const node = containerRef.current;
    const width = measure();

    if (!node || !width) {
      return;
    }

    if (isDrawer) {
      placeDrawer(width, false, node);

      return;
    }

    placeRightHidden(width, node);
  };

  const expand = (side: SplitSide) => {
    const node = containerRef.current;
    const width = measure();

    if (!node || !width) {
      return;
    }

    if (side === "left") {
      if (leftOpen) {
        return;
      }

      restoreTransitions(animated, transitionRaf);
      onLeftOpenChange?.(true);

      const bounded = layoutPanes(
        width,
        minLeftWidth,
        minRightWidth,
        nonNegative(width) * clampRatio(leftRatio.current)
      );

      leftRatio.current = bounded.boundedLeftRatio;

      if (rightOpen) {
        persist(bounded.boundedLeftRatio);
      }

      rightWidth.current = bounded.rightWidth;
      writeLayout({
        container: width,
        handleWidth,
        immediate: true,
        left: bounded.boundedLeftWidth,
        node,
        raf: layoutRaf,
        right: bounded.rightWidth,
      });

      return;
    }

    if (rightOpen || !hasRight) {
      return;
    }

    restoreTransitions(animated, transitionRaf);
    onRightOpenChange?.(true);

    if (isDrawer) {
      placeDrawer(width, true, node);

      return;
    }

    placeBoth(width, node, leftOpen);
  };

  const toggle = (side: SplitSide) => {
    const open = side === "left" ? leftOpen : rightOpen;

    if (open) {
      collapse(side);

      return;
    }

    expand(side);
  };

  const context: SplitViewContextValue = {
    collapse,
    expand,
    isLeftOpen: leftOpen,
    isResizing,
    isRightOpen: rightOpen,
    toggle,
  };

  const handleLeft = `min(calc(100% - ${handleWidth}px), max(0px, ${
    leftOpen && rightOpen
      ? `calc(var(--ck-split-left-width, 100%) - (${handleWidth}px / 2))`
      : `calc(100% - (${handleWidth}px / 2))`
  }))`;

  const leftId = `${id}-left`;

  return (
    <SplitViewContext.Provider value={context}>
      <div
        className={cn(
          "group/split-view relative h-full w-full min-w-0 overflow-hidden",
          isResizing && "cursor-col-resize",
          className
        )}
        ref={containerRef}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 min-w-0 overflow-hidden [will-change:width]",
            !leftOpen && "pointer-events-none",
            "duration-(--motion-duration-slow) ease-basic",
            leftClassName
          )}
          id={leftId}
          ref={leftPaneRef}
          style={{
            contain: "strict",
            transitionProperty: isResizing ? "none" : "width",
            width: "var(--ck-split-left-width, 100%)",
          }}
        >
          <div className="h-full min-w-0">
            <Activity mode={leftOpen ? "visible" : "hidden"} name={leftId}>
              {left}
            </Activity>
          </div>
        </div>
        {hasRight && !isDrawer && leftOpen ? (
          <div
            aria-controls={leftId}
            aria-hidden={!handleActive}
            aria-label="Resize panels"
            aria-orientation="vertical"
            aria-valuemax={maxLeftWidth(
              containerWidth,
              minLeftWidth,
              minRightWidth
            )}
            aria-valuemin={Math.min(minLeftWidth, containerWidth)}
            aria-valuenow={boundLeftWidth(
              containerWidth * initialRatio,
              containerWidth,
              minLeftWidth,
              minRightWidth
            )}
            className={cn(
              "group absolute inset-y-0 z-20 touch-none select-none",
              "cursor-col-resize duration-(--motion-duration-slow) ease-basic [will-change:left]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              handleActive ? "opacity-100" : "pointer-events-none opacity-0",
              handleClassName
            )}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            ref={handleRef}
            role="separator"
            style={{
              left: handleLeft,
              transitionProperty: isResizing ? "none" : "left, opacity",
              width: `${handleWidth}px`,
            }}
            tabIndex={handleActive ? 0 : -1}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors duration-(--motion-duration-slow) ease-basic",
                isResizing
                  ? "bg-text/25"
                  : "group-hover:bg-text/25 group-focus-visible:bg-text/25 group-active:bg-text/25"
              )}
            />
          </div>
        ) : null}
        <div
          className={cn(
            "absolute inset-y-0 min-w-0 overflow-hidden [will-change:transform]",
            isDrawer ? "z-30 bg-panel shadow-(--shadow-split)" : "z-10",
            rightOpen ? "opacity-100" : "opacity-0",
            !rightOpen && "pointer-events-none",
            "duration-(--motion-duration-slow) ease-basic",
            rightClassName
          )}
          ref={rightPaneRef}
          style={{
            contain: "strict",
            maxWidth: "var(--ck-split-right-width, 0px)",
            minWidth: 0,
            right: 0,
            transform: "translateX(var(--ck-split-right-translate, 0px))",
            transitionProperty: isResizing
              ? "none"
              : "width, transform, opacity",
            width: "var(--ck-split-right-width, 0px)",
          }}
        >
          {hasRight ? (
            <div className="h-full min-w-0">
              <Activity
                mode={rightOpen ? "visible" : "hidden"}
                name={`${id}-right`}
              >
                <div
                  className={cn(
                    "h-full w-full min-w-0 transition-opacity duration-(--motion-duration-slow) ease-basic",
                    rightOpen ? "opacity-100" : "opacity-0"
                  )}
                  style={{
                    transitionDelay: rightOpen
                      ? `${RIGHT_FADE_IN_DELAY_MS}ms`
                      : "0ms",
                  }}
                >
                  {right}
                </div>
              </Activity>
            </div>
          ) : null}
        </div>
      </div>
    </SplitViewContext.Provider>
  );
};

export { SplitView, useSplitView };

export type { SplitSide, SplitViewProps };
