"use client";

/* oxlint-disable shadcn/no-inline-styles -- The scroll distance, duration and timing function are measured at runtime and set as the three custom properties the CSS module reads. */

import { mergeRefs } from "@workspace/react/components/dialog/dialog-layer";
import { useReducedMotion } from "@workspace/react/lib/reduced-motion";
import { cn } from "@workspace/react/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ComponentProps, ReactNode, Ref } from "react";

import styles from "./marquee-text.module.css";

/*
 * The marquee text of the summary item label.
 * It measures its content against its viewport, and when the content is wider
 * it scrolls it on hover or focus of the enclosing `.group`.
 */

/*
 * The zoom factor of the window, divided out of measured widths
 * (`width / zoom`). The default is 1. The marquee
 * measures in CSS pixels of the zoomed window, so a provider above it with
 * the window zoom makes the measured distance match.
 */
const MarqueeZoomContext = createContext(1);

const MarqueeZoomProvider = MarqueeZoomContext.Provider;

const unzoom = (width: number, zoom: number) => width / zoom;

type MarqueeScrollMode = "loop" | "stop-at-end";

interface MarqueeScroll {
  contentWidth: number;
  scrollDistance: number;
  speedPxPerSecond: number;
}

// Scroll speed, loop spacing, pauses and easing for the marquee.
const FALLBACK_FONT_SIZE_PX = 13;
const FALLBACK_SPEED_EM_PER_SECOND = 1.9;
const LOOP_GAP_EM = 1.2;
const LEAD_IN_SECONDS = 0.4;
const LOOP_TAIL_SECONDS = 1.8;
const TIMING_STEPS = 36;
const EASE = { x1: 0.5, x2: 0.72, y1: 0.62, y2: 1 } as const;

const percent = (value: number, total: number) =>
  `${((value / total) * 100).toFixed(4)}%`;

const timingPoint = (progress: number, time: number, total: number) =>
  `${progress.toFixed(4)} ${percent(time, total)}`;

// 37 points sampled on the cubic Bezier between the lead-in and
// the end of the travel.
const easedPoints = (leadIn: number, travel: number, total: number) =>
  Array.from({ length: TIMING_STEPS + 1 }, (_, index) => {
    const t = index / TIMING_STEPS;
    const inverse = 1 - t;
    const a = 3 * inverse ** 2 * t;
    const b = 3 * inverse * t ** 2;
    const c = t ** 3;

    return timingPoint(
      a * EASE.y1 + b * EASE.y2 + c,
      leadIn + travel * (a * EASE.x1 + b * EASE.x2 + c),
      total
    );
  });

const scrollStyle = (
  distance: number,
  speed: number,
  mode: MarqueeScrollMode
): CSSProperties => {
  const travel = distance / speed;

  const total =
    LEAD_IN_SECONDS + travel + (mode === "loop" ? LOOP_TAIL_SECONDS : 0);

  // SAFETY: the object only holds the three custom properties the CSS module reads.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return {
    "--ck-scrolling-label-duration": `${total.toFixed(3)}s`,
    "--ck-scrolling-label-scroll-distance": `${distance}px`,
    "--ck-scrolling-label-scroll-timing": `linear(${[
      timingPoint(0, 0, total),
      ...easedPoints(LEAD_IN_SECONDS, travel, total),
      ...(mode === "loop" ? [timingPoint(1, total, total)] : []),
    ].join(", ")})`,
  } as CSSProperties;
};

const sameScroll = (a: MarqueeScroll | null, b: MarqueeScroll) =>
  a?.contentWidth === b.contentWidth &&
  a.scrollDistance === b.scrollDistance &&
  a.speedPxPerSecond === b.speedPxPerSecond;

const measure = (
  viewport: HTMLElement,
  mode: MarqueeScrollMode,
  zoom: number
): MarqueeScroll | null => {
  if (!viewport.checkVisibility?.({ contentVisibilityAuto: true })) {
    return null;
  }

  const content = viewport.querySelector<HTMLElement>(
    "[data-ck-marquee-content]"
  );

  if (content === null) {
    return null;
  }

  const contentRect = content.getBoundingClientRect();

  const unzoomedContent = unzoom(contentRect.width, zoom);

  const contentWidth =
    unzoomedContent > 0 ? unzoomedContent : content.scrollWidth;

  const viewportRect = viewport.getBoundingClientRect();

  const unzoomedViewport = unzoom(viewportRect.width, zoom);

  const viewportWidth =
    unzoomedViewport > 0 ? unzoomedViewport : viewport.clientWidth;

  if (viewportWidth <= 0 || contentWidth - viewportWidth < 1) {
    return null;
  }

  const style = getComputedStyle(content);
  const parsedFont = Number(style.fontSize.replace("px", ""));

  const fontSize = Number.isFinite(parsedFont)
    ? parsedFont
    : FALLBACK_FONT_SIZE_PX;

  const parsedSpeed = Number(
    style.getPropertyValue("--ck-scrolling-label-speed-em-per-second")
  );

  const speed =
    Number.isFinite(parsedSpeed) && parsedSpeed > 0
      ? parsedSpeed
      : FALLBACK_SPEED_EM_PER_SECOND;

  let distance = contentWidth - viewportWidth;

  if (mode === "loop") {
    distance = contentWidth + fontSize * LOOP_GAP_EM;
    const copy = viewport.querySelector<HTMLElement>("[data-ck-marquee-copy]");

    if (copy !== null) {
      const offset = unzoom(
        Math.abs(copy.getBoundingClientRect().left - contentRect.left),
        zoom
      );

      if (offset > 0) {
        distance = offset;
      }
    }
  }

  return {
    contentWidth,
    scrollDistance: distance,
    speedPxPerSecond: fontSize * speed,
  };
};

type MarqueeTextProps = Omit<ComponentProps<"span">, "ref"> & {
  animate?: boolean;
  animateOnGroupHover?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
  scrollMode?: MarqueeScrollMode;
};

const MarqueeText = ({
  animate = false,
  animateOnGroupHover = false,
  children,
  className,
  ref,
  scrollMode = "stop-at-end",
  ...props
}: MarqueeTextProps) => {
  const reducedMotion = useReducedMotion();
  const zoom = useContext(MarqueeZoomContext);
  const [scroll, setScroll] = useState<MarqueeScroll | null>(null);
  const viewportRef = useRef<HTMLSpanElement | null>(null);

  const mergedRef = useMemo(
    () => mergeRefs<HTMLSpanElement>(viewportRef, ref),
    [ref]
  );

  const update = useCallback(() => {
    const viewport = viewportRef.current;

    if (viewport === null) {
      return;
    }

    const next = measure(viewport, scrollMode, zoom);
    setScroll((current) => {
      if (next === null) {
        return null;
      }

      return sameScroll(current, next) ? current : next;
    });
  }, [scrollMode, zoom]);

  useLayoutEffect(() => {
    update();
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const observer = new ResizeObserver(update);

    if (viewport !== null) {
      observer.observe(viewport);

      for (const element of viewport.querySelectorAll(
        "[data-ck-marquee-content]"
      )) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [update]);

  const overflowing = scroll !== null;
  const loopCopy = scrollMode === "loop" && overflowing && !reducedMotion;

  const style =
    overflowing && !reducedMotion
      ? scrollStyle(scroll.scrollDistance, scroll.speedPxPerSecond, scrollMode)
      : undefined;

  const animatable = style !== undefined;

  return (
    <span
      {...props}
      className={cn(
        styles.viewport,
        animate && styles.animate,
        animateOnGroupHover && styles.animateOnGroupHover,
        scrollMode === "stop-at-end" && styles.stopAtEnd,
        className
      )}
      data-ck-marquee-animatable={animatable ? true : undefined}
      data-ck-marquee-overflowing={overflowing ? true : undefined}
      data-ck-marquee-text
      draggable={false}
      ref={mergedRef}
    >
      <span
        className={cn(
          styles.clipViewport,
          overflowing && styles.overflowingViewport
        )}
        style={style}
      >
        <span className={cn(styles.track, animatable && styles.scrolling)}>
          <span className={styles.content} data-ck-marquee-content>
            {children}
          </span>
          {loopCopy ? (
            <span
              aria-hidden
              className={styles.content}
              data-ck-marquee-copy
              inert
            >
              {children}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
};

export { MarqueeText, MarqueeZoomProvider };

export type { MarqueeScrollMode, MarqueeTextProps };
