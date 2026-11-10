"use client";

import { useReducedMotion } from "@workspace/react/lib/reduced-motion";
import { cn } from "@workspace/react/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

import styles from "./typography.module.css";

/* Marquee text. */

const DEFAULT_FONT_SIZE = 13;
const DEFAULT_SPEED_EM_PER_SECOND = 1.9;
const LOOP_GAP_EM = 1.2;
const LEAD_IN_SECONDS = 0.4;
const LOOP_HOLD_SECONDS = 1.8;
const CURVE_STEPS = 36;
const CURVE = { x1: 0.5, x2: 0.72, y1: 0.62, y2: 1 } as const;

type MarqueeScrollMode = "loop" | "stop-at-end";

interface MarqueeMetrics {
  contentWidth: number;
  scrollDistance: number;
  speedPxPerSecond: number;
}

type MarqueeProps = Omit<ComponentProps<"span">, "children"> & {
  animate?: boolean;
  animateOnGroupHover?: boolean;
  children?: React.ReactNode;
  scrollMode?: MarqueeScrollMode;
};

type MarqueeStyle = React.CSSProperties & {
  "--ck-scrolling-label-duration": string;
  "--ck-scrolling-label-scroll-distance": string;
  "--ck-scrolling-label-scroll-timing": string;
};

const keyframePoint = (value: number, time: number, total: number) =>
  `${value.toFixed(4)} ${((time / total) * 100).toFixed(4)}%`;

const curvePoints = (lead: number, travel: number, total: number) =>
  Array.from({ length: CURVE_STEPS + 1 }, (_, index) => {
    const t = index / CURVE_STEPS;
    const inverse = 1 - t;
    const first = 3 * inverse ** 2 * t;
    const second = 3 * inverse * t ** 2;
    const third = t ** 3;

    return keyframePoint(
      first * CURVE.y1 + second * CURVE.y2 + third,
      lead + travel * (first * CURVE.x1 + second * CURVE.x2 + third),
      total
    );
  });

const scrollTiming = (
  distance: number,
  speed: number,
  mode: MarqueeScrollMode
) => {
  const travel = distance / speed;
  const loop = mode === "loop";
  const total = LEAD_IN_SECONDS + travel + (loop ? LOOP_HOLD_SECONDS : 0);

  return {
    duration: `${total.toFixed(3)}s`,
    timing: `linear(${[
      keyframePoint(0, 0, total),
      ...curvePoints(LEAD_IN_SECONDS, travel, total),
      ...(loop ? [keyframePoint(1, total, total)] : []),
    ].join(", ")})`,
  };
};

const measure = (
  root: HTMLElement,
  mode: MarqueeScrollMode
): MarqueeMetrics | null | undefined => {
  if (!root.checkVisibility?.({ contentVisibilityAuto: true })) {
    return undefined;
  }

  const content = root.querySelector("[data-ck-marquee-content]");

  if (!(content instanceof HTMLElement)) {
    return undefined;
  }

  const zoom = root.currentCSSZoom || 1;
  const contentRect = content.getBoundingClientRect();
  const measuredContentWidth = contentRect.width / zoom;

  const contentWidth =
    measuredContentWidth > 0 ? measuredContentWidth : content.scrollWidth;

  const rootWidth = root.getBoundingClientRect().width / zoom;
  const viewportWidth = rootWidth > 0 ? rootWidth : root.clientWidth;

  if (viewportWidth <= 0 || contentWidth - viewportWidth < 1) {
    return null;
  }

  const computed = getComputedStyle(content);
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- the component reads "13px" with parseFloat
  const parsedSize = Number.parseFloat(computed.fontSize);

  const fontSize = Number.isFinite(parsedSize) ? parsedSize : DEFAULT_FONT_SIZE;

  // oxlint-disable-next-line unicorn/prefer-number-coercion -- the component reads the property with parseFloat
  const parsedSpeed = Number.parseFloat(
    computed.getPropertyValue("--ck-scrolling-label-speed-em-per-second")
  );

  const speed =
    Number.isFinite(parsedSpeed) && parsedSpeed > 0
      ? parsedSpeed
      : DEFAULT_SPEED_EM_PER_SECOND;

  let scrollDistance = contentWidth - viewportWidth;

  if (mode === "loop") {
    scrollDistance = contentWidth + fontSize * LOOP_GAP_EM;
    const copy = root.querySelector("[data-ck-marquee-copy]");

    if (copy instanceof HTMLElement) {
      const offset =
        Math.abs(copy.getBoundingClientRect().left - contentRect.left) / zoom;

      if (offset > 0) {
        scrollDistance = offset;
      }
    }
  }

  return { contentWidth, scrollDistance, speedPxPerSecond: fontSize * speed };
};

const sameMetrics = (
  current: MarqueeMetrics | null,
  next: MarqueeMetrics | null
) =>
  current === next ||
  (current !== null &&
    next !== null &&
    current.contentWidth === next.contentWidth &&
    current.scrollDistance === next.scrollDistance &&
    current.speedPxPerSecond === next.speedPxPerSecond);

const closestMarquee = (element: Element | null) => {
  const root = element?.closest("[data-ck-marquee-text]");

  return root instanceof HTMLElement ? root : null;
};

const Marquee = ({
  animate = false,
  animateOnGroupHover = false,
  children,
  className,
  scrollMode = "stop-at-end",
  style,
  ...props
}: MarqueeProps) => {
  const reducedMotion = useReducedMotion();
  const [metrics, setMetrics] = useState<MarqueeMetrics | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);

  const remeasure = useCallback(
    (root: HTMLElement | null) => {
      if (root === null) {
        return;
      }

      const next = measure(root, scrollMode);

      if (next !== undefined) {
        setMetrics((current) => (sameMetrics(current, next) ? current : next));
      }
    },
    [scrollMode]
  );

  useEffect(() => {
    const root = rootRef.current;

    const observer =
      root !== null && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              remeasure(closestMarquee(entry.target));
            }
          })
        : null;

    if (root !== null && observer !== null) {
      observer.observe(root);

      for (const part of root.querySelectorAll(
        "[data-marquee-track], [data-ck-marquee-content]"
      )) {
        observer.observe(part);
      }
    }

    return () => {
      observer?.disconnect();
    };
  }, [remeasure]);

  const copyRef = useCallback(
    (element: HTMLSpanElement | null) => {
      remeasure(closestMarquee(element));
    },
    [remeasure]
  );

  const overflowing = metrics !== null;
  const showCopy = scrollMode === "loop" && overflowing && !reducedMotion;

  const timing =
    overflowing && !reducedMotion
      ? scrollTiming(
          metrics.scrollDistance,
          metrics.speedPxPerSecond,
          scrollMode
        )
      : null;

  const scrolling: MarqueeStyle | undefined =
    overflowing && timing !== null
      ? {
          "--ck-scrolling-label-duration": timing.duration,
          "--ck-scrolling-label-scroll-distance": `${metrics.scrollDistance}px`,
          "--ck-scrolling-label-scroll-timing": timing.timing,
        }
      : undefined;

  return (
    <span
      {...props}
      ref={rootRef}
      className={cn(
        styles.viewport,
        animate && styles.animate,
        animateOnGroupHover && styles.animateOnGroupHover,
        scrollMode === "stop-at-end" && styles.stopAtEnd,
        className
      )}
      data-ck-marquee-animatable={scrolling ? true : undefined}
      data-ck-marquee-overflowing={overflowing ? true : undefined}
      data-ck-marquee-text
      draggable={false}
      style={style}
    >
      <span
        className={cn(
          styles.clipViewport,
          overflowing && styles.overflowingViewport
        )}
        style={scrolling}
      >
        <span
          className={cn(styles.track, scrolling && styles.scrolling)}
          data-marquee-track
        >
          <span className={styles.content} data-ck-marquee-content>
            {children}
          </span>
          {showCopy ? (
            <span
              ref={copyRef}
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

export { Marquee };
