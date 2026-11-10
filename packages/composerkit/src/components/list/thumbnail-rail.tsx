"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-arbitrary-values -- The component styles plain <button> elements itself; they are the library Button in `unstyled` mode and take the measured sizes, radii and token expressions through className, which no Button variant or theme token carries. */

/* oxlint-disable shadcn/no-inline-styles -- The slide offset and the spring easing are computed per render from the side and the spring duration. */

import { Sidebar16Icon } from "composerkit/components/list/icons";
import { Button } from "composerkit/components/ui/button";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { useReducedMotion } from "composerkit/lib/reduced-motion";
import { cn } from "composerkit/lib/utils";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FocusEvent, ReactNode } from "react";

import styles from "./thumbnail-rail.module.css";

// An effect that has nothing to undo returns this instead of nothing.
const noCleanup = () => {
  // Nothing to undo.
};

/*
 * The paged thumbnail rail, its slide panel and the hover handoff.
 *
 * The panel surface is the floating surface variant `viewer`: `rounded-2xl`, `bg-fill-viewer-control`,
 * `backdrop-blur-xl` and the Electron `elevation-prominent`, which is
 * `--shadow-sidebar-panel`: the .5px border stroke plus two soft
 * shadows. border-strong is --ck-palette-border-heavy.
 */

const HOVER_DELAY_MS = 140;

const RAIL_ELEVATION = "shadow-(--shadow-sidebar-panel)";

const VIEWER_SURFACE_BACKGROUND =
  "bg-[light-dark(var(--ck-palette-surface-elevated-primary),var(--theme-background-control-opaque))]";

/* ------------------------------------------------------------------ */
/* Hover handoff. */
/* ------------------------------------------------------------------ */

const containsPointer = (
  event: PointerEvent | MouseEvent,
  element: Element
) => {
  const rect = element.getBoundingClientRect();

  return (
    event.clientX >= rect.left &&
    event.clientX < rect.right &&
    event.clientY >= rect.top &&
    event.clientY < rect.bottom
  );
};

/**
 * Opens the rail 140ms after the mouse rests on the region with no button
 * down, and closes it when the pointer leaves the region (open) or the trigger
 * (closed). Presses cancel a pending open; a pointer that leaves the document
 * closes it.
 */
const observeRailHover = ({
  onEnter,
  onLeave,
  open,
  region,
  trigger,
}: {
  onEnter: () => void;
  onLeave: () => void;
  open: boolean;
  region: HTMLElement;
  trigger: HTMLElement;
}) => {
  const doc = region.ownerDocument;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const schedule = () => {
    if (open || timer !== undefined) {
      return;
    }

    timer = setTimeout(() => {
      timer = undefined;
      onEnter();
    }, HOVER_DELAY_MS);
  };

  const leave = () => {
    cancel();

    if (open) {
      onLeave();
    }
  };

  const handleMouseEnter = (event: MouseEvent) => {
    if (event.buttons === 0) {
      schedule();
    }
  };

  const handleMouseLeave = (event: MouseEvent) => {
    if (!containsPointer(event, open ? region : trigger)) {
      leave();
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.buttons !== 0) {
      cancel();

      return;
    }

    const { target } = event;

    if (target instanceof Node && region.contains(target)) {
      return;
    }

    if (
      !open &&
      !(target instanceof Element && target.closest('[role="separator"]'))
    ) {
      cancel();
    } else if (containsPointer(event, open ? region : trigger)) {
      schedule();
    } else {
      leave();
    }
  };

  const handlePointerOut = (event: PointerEvent) => {
    if (event.relatedTarget === null || event.relatedTarget === undefined) {
      leave();
    }
  };

  region.addEventListener("mouseenter", handleMouseEnter);
  region.addEventListener("mouseleave", handleMouseLeave);
  doc.addEventListener("pointerdown", cancel, true);
  doc.addEventListener("pointermove", handlePointerMove, true);
  doc.addEventListener("pointerout", handlePointerOut, true);

  return () => {
    cancel();
    region.removeEventListener("mouseenter", handleMouseEnter);
    region.removeEventListener("mouseleave", handleMouseLeave);
    doc.removeEventListener("pointerdown", cancel, true);
    doc.removeEventListener("pointermove", handlePointerMove, true);
    doc.removeEventListener("pointerout", handlePointerOut, true);
  };
};

/* ------------------------------------------------------------------ */
/* Slide panel. */
/* ------------------------------------------------------------------ */

// The panel animates with the app spring `{ type: "spring", duration: .15,
// bounce: 0 }`. Motion resolves a spring from its duration
// by solving e^(-wd)(wd + 1) = .001 for the undamped frequency w (critical
// damping, bounce 0); the position is 1 - (1 + wt)e^(-wt). The same curve is
// written as a CSS linear easing over the same duration.
const SPRING_DURATION_SECONDS = 0.15;

const SPRING_SAFE_MIN = 0.001;

const SPRING_STEPS = 24;

const springFrequency = (duration: number) => {
  let frequency = 5 / duration;

  for (let iteration = 0; iteration < 16; iteration += 1) {
    const decay = Math.exp(-frequency * duration);
    const value = -SPRING_SAFE_MIN + decay * (frequency * duration + 1);
    const slope = -frequency * duration * duration * decay;

    if (slope === 0) {
      break;
    }

    frequency -= value / slope;
  }

  return frequency;
};

const springEasing = (duration: number) => {
  const frequency = springFrequency(duration);

  const points = Array.from({ length: SPRING_STEPS + 1 }, (_, index) => {
    if (index === SPRING_STEPS) {
      return "1";
    }

    const time = (index / SPRING_STEPS) * duration;

    return (1 - (1 + frequency * time) * Math.exp(-frequency * time)).toFixed(
      4
    );
  });

  return `linear(${points.join(", ")})`;
};

const SPRING_EASING = springEasing(SPRING_DURATION_SECONDS);

// The height animation of the open panel: 320ms on the app curve
// `Jan = [.65, 0, .35, 1]`.
const HEIGHT_DURATION_MS = 320;

const HEIGHT_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

const imageIsPending = (image: HTMLImageElement) => !image.complete;

// A computed height such as "123.5px"; Number would give NaN for the unit.
const computedHeight = (element: HTMLElement) =>
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- The value carries a "px" unit that Number rejects.
  Number.parseFloat(getComputedStyle(element).height);

/**
 * The height animation measures the panel's
 * first child whenever the panel resizes, its content changes (children,
 * text, `src`), an image loads or fails, or the page becomes visible, and
 * animates the child's height from the previous measurement to the new one.
 * It waits for pending images, lets a running animation finish and measures
 * again, and restores the inline height on cleanup.
 */
const observePanelHeight = (
  panel: HTMLElement,
  content: HTMLElement,
  reducedMotion: boolean
) => {
  const inlineHeight = content.style.height;
  let measuredHeight = 0;
  let animation: Animation | undefined;
  let frame = 0;
  let measureAgain = false;

  const measure = () => {
    if (document.hidden) {
      return;
    }

    if (animation?.playState === "running") {
      measureAgain = true;

      return;
    }

    if ([...content.querySelectorAll("img")].some(imageIsPending)) {
      return;
    }

    const from = measuredHeight === 0 ? 0 : computedHeight(content);

    content.style.height = inlineHeight;
    const to = computedHeight(content);
    content.style.height = `${to || measuredHeight}px`;

    if (to && to !== measuredHeight) {
      measuredHeight = to;

      if (!reducedMotion) {
        animation = content.animate(
          [{ height: `${from}px` }, { height: `${to}px` }],
          { duration: HEIGHT_DURATION_MS, easing: HEIGHT_EASING }
        );
        animation.onfinish = () => {
          animation = undefined;

          if (measureAgain) {
            measureAgain = false;
            measure();
          }
        };
      }
    }
  };

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  };

  const resizeObserver = new ResizeObserver(schedule);

  resizeObserver.observe(panel);

  const mutationObserver = new MutationObserver(schedule);

  mutationObserver.observe(content, {
    attributeFilter: ["src"],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  content.addEventListener("load", schedule, true);
  content.addEventListener("error", schedule, true);

  const onVisibilityChange = () => {
    if (document.hidden) {
      animation?.cancel();
      cancelAnimationFrame(frame);
    } else {
      measure();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  measure();

  return () => {
    mutationObserver.disconnect();
    resizeObserver.disconnect();
    content.removeEventListener("load", schedule, true);
    content.removeEventListener("error", schedule, true);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    cancelAnimationFrame(frame);

    if (animation) {
      animation.onfinish = null;
      animation.cancel();
    }

    content.style.height = inlineHeight;
  };
};

interface ThumbnailPanelProps {
  /** Animates the first child's height while the panel is open. */
  animateHeight?: boolean;
  children?: ReactNode;
  open: boolean;
  side: "left" | "right";
}

/**
 * An absolute inset-0 layer. Closed it is translated 100% to its side and
 * `display: none` once the slide ends; it is `aria-hidden` and `inert` while
 * closed. Reduced motion makes the slide instant. A panel that mounts open or
 * closed does not animate (the component passes `initial={false}` semantics:
 * only a change of `open` slides).
 */
const ThumbnailPanel = ({
  animateHeight = false,
  children,
  open,
  side,
}: ThumbnailPanelProps) => {
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousOpen = useRef(open);
  // oxlint-disable-next-line react/hook-use-state -- Only the first value is read.
  const [initiallyOpen] = useState(open);
  const closedOffset = side === "left" ? "-100%" : "100%";

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const content = panel?.firstElementChild;

    if (
      !animateHeight ||
      !open ||
      !panel ||
      !(content instanceof HTMLElement)
    ) {
      return noCleanup;
    }

    return observePanelHeight(panel, content, reducedMotion);
  }, [animateHeight, open, reducedMotion]);

  useEffect(() => {
    const panel = panelRef.current;
    let animation: Animation | undefined;

    if (panel !== null && previousOpen.current !== open) {
      previousOpen.current = open;
      const hidden = `translateX(${closedOffset})`;
      const visible = "translateX(0px)";

      if (reducedMotion) {
        panel.style.display = open ? "block" : "none";
      } else {
        if (open) {
          panel.style.display = "block";
        }

        animation = panel.animate(
          [
            { transform: open ? hidden : visible },
            { transform: open ? visible : hidden },
          ],
          {
            duration: SPRING_DURATION_SECONDS * 1000,
            easing: SPRING_EASING,
            fill: "both",
          }
        );
        animation.onfinish = () => {
          if (!open) {
            panel.style.display = "none";
          }
        };
      }
    }

    return () => {
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
      }
    };
  }, [closedOffset, open, reducedMotion]);

  return (
    <div
      aria-hidden={!open}
      className={cn("absolute inset-0", !initiallyOpen && "hidden")}
      inert={!open}
      ref={panelRef}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Rail                                                                 */
/* ------------------------------------------------------------------ */

const pluralRules = new Intl.PluralRules("en");

const pageCountLabel = (count: number) =>
  pluralRules.select(count) === "one" ? `${count} page` : `${count} pages`;

interface ThumbnailRailProps {
  /** Animates the panel's height as its content changes (thumbnail-panel `animateHeight`). */
  animateHeight?: boolean;
  currentPage: number;
  isDocked: boolean;
  onDockedChange: (docked: boolean) => void;
  onPageSelect: (page: number) => void;
  renderThumbnail: (page: number) => ReactNode;
  /** The panel's slide side. It defaults to the start side of the document. */
  side?: "left" | "right";
  totalPages: number;
}

/** A stack of page marks that opens a list of page thumbnails. */
const ThumbnailRail = ({
  animateHeight,
  currentPage,
  isDocked,
  onDockedChange,
  onPageSelect,
  renderThumbnail,
  side,
  totalPages,
}: ThumbnailRailProps) => {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLButtonElement | null>(null);
  const [listMounted, setListMounted] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const open = isDocked || hoverOpen;

  const revealCurrent = useCallback((focus = false) => {
    requestAnimationFrame(() => {
      const list = listRef.current;
      const { current } = currentRef;

      if (list && current) {
        const top = current.offsetTop;
        const bottom = top + current.offsetHeight;

        if (top < list.scrollTop) {
          list.scrollTop = top;
        } else if (bottom > list.scrollTop + list.clientHeight) {
          list.scrollTop = bottom - list.clientHeight;
        }
      }

      if (focus) {
        current?.focus({ preventScroll: true });
      }
    });
  }, []);

  const enter = () => {
    if (!open) {
      revealCurrent();
    }

    setListMounted(true);
    setHoverOpen(true);
  };

  const onEnter = useEffectEvent(enter);

  useEffect(() => {
    const region = trigger?.parentElement;

    if (isDocked || !trigger || !region) {
      return noCleanup;
    }

    return observeRailHover({
      onEnter: () => {
        onEnter();
      },
      onLeave: () => {
        if (!region.contains(region.ownerDocument.activeElement)) {
          setHoverOpen(false);
        }
      },
      open,
      region,
      trigger,
    });
  }, [isDocked, open, trigger]);

  const resolvedSide = useMemo<"left" | "right">(() => {
    if (side !== undefined) {
      return side;
    }

    return typeof document !== "undefined" &&
      document.documentElement.dir === "rtl"
      ? "right"
      : "left";
  }, [side]);

  if (totalPages <= 1) {
    return null;
  }

  const showLabel = "Show table of contents";
  const navLabel = "Table of contents";

  const dockLabel = isDocked
    ? "Undock table of contents"
    : "Dock table of contents";

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;

    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }

    setHoverOpen(false);
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The rail forwards focus and blur within it to open and close the panel.
    <div
      className={cn(
        "absolute start-0 top-16 bottom-6 z-30 w-43.5",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      data-testid="paged-thumbnail-rail"
      onBlurCapture={handleBlurCapture}
      onFocusCapture={enter}
    >
      <Button
        aria-expanded={open}
        aria-label={showLabel}
        className={cn(
          "pointer-events-auto absolute inset-y-0 start-0 flex w-7 cursor-(--ck-action-cursor) flex-col items-start justify-center gap-1.5 overflow-hidden border-0 bg-transparent p-0 ps-2 whitespace-normal outline-none select-auto focus-visible:ring-2 focus-visible:ring-ring",
          open && "pointer-events-none opacity-0"
        )}
        data-testid="paged-thumbnail-stack"
        disabledAppearance="none"
        focusRing="none"
        onClick={() => {
          enter();
          revealCurrent(true);
        }}
        onFocus={() => {
          revealCurrent(true);
        }}
        ref={setTrigger}
        tabIndex={open ? -1 : undefined}
        unstyled
      >
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;

          return (
            <span
              aria-hidden
              className={cn(
                "block h-0.5 rounded-full transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none",
                page === currentPage
                  ? "w-4 bg-current text-text"
                  : "w-3 bg-border"
              )}
              key={page}
            />
          );
        })}
      </Button>
      <ThumbnailPanel
        animateHeight={animateHeight}
        open={open}
        side={resolvedSide}
      >
        <nav
          aria-hidden={!open}
          aria-label={navLabel}
          className={cn(
            "pointer-events-auto absolute inset-y-0 start-2 flex w-41.5 flex-col rounded-2xl px-1.5 py-2 backdrop-blur-xl",
            VIEWER_SURFACE_BACKGROUND,
            RAIL_ELEVATION
          )}
          data-testid="paged-thumbnail-panel"
          inert={!open}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 ps-2 pe-0.5 pb-2 text-xs text-text-subtle select-none">
            {pageCountLabel(totalPages)}
            <TooltipHint content={dockLabel}>
              <Button
                aria-label={dockLabel}
                aria-pressed={isDocked}
                className={styles.control}
                color="ghostActive"
                onClick={(event) => {
                  const next = !isDocked;
                  setListMounted(true);
                  onDockedChange(next);
                  setHoverOpen(false);

                  if (!next && event.detail > 0) {
                    event.currentTarget.blur();
                  }
                }}
                radius="full"
                uniform
              >
                <Sidebar16Icon className="text-text-muted" />
              </Button>
            </TooltipHint>
          </div>
          <div
            className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
            data-testid="paged-thumbnail-list"
            ref={listRef}
          >
            {listMounted
              ? Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  const current = page === currentPage;

                  return (
                    <Button
                      aria-current={current ? "page" : undefined}
                      aria-label={`Page ${page}`}
                      className="flex w-full cursor-(--ck-action-cursor) items-start gap-2 rounded-2xl p-2 text-start text-xs whitespace-normal text-text-muted outline-none select-auto hover:bg-fill-primary-transparent-hover focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-text-notice/10 aria-[current=page]:text-text-notice"
                      data-ck-thumbnail-page={page}
                      disabledAppearance="none"
                      focusRing="none"
                      key={page}
                      onClick={() => {
                        onPageSelect(page);
                      }}
                      ref={current ? currentRef : undefined}
                      unstyled
                    >
                      <span className="w-4.5 shrink-0 pt-0.5 text-end leading-4 tabular-nums">
                        {page}
                      </span>
                      <span className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
                        {renderThumbnail(page)}
                      </span>
                    </Button>
                  );
                })
              : null}
          </div>
        </nav>
      </ThumbnailPanel>
    </div>
  );
};

export { ThumbnailRail };

export type { ThumbnailRailProps };
