import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import type { Middleware, Placement } from "@floating-ui/react-dom";
import { useLayoutEffect, useMemo } from "react";
import type { RefObject } from "react";

import { isAlign, isSide } from "./popover-context";
import type { PopoverAlign, PopoverSide } from "./popover-context";

/*
 * The floating-ui setup of the popover content, based on the Radix popper:
 * fixed strategy,
 * offset, shift with limitShift, flip, a size middleware that publishes the
 * available and anchor sizes, a transform origin from the placed side and
 * align, and hide when the anchor is detached.
 */

const NO_BOUNDARY: Element[] = [];

export const sideAndAlign = (placement: Placement) => {
  const [side = "", align = "center"] = placement.split("-");

  return [
    isSide(side) ? side : "bottom",
    isAlign(align) ? align : "center",
  ] as const;
};

const ALIGNMENTS = { center: "50%", end: "100%", start: "0%" } as const;

/** The Radix popper's `transformOrigin` middleware, without an arrow. */
const transformOrigin: Middleware = {
  fn({ placement, rects }) {
    const [side, align] = sideAndAlign(placement);
    const alignment = ALIGNMENTS[align];
    let x: string;
    let y: string;

    if (side === "bottom") {
      x = alignment;
      y = "0px";
    } else if (side === "top") {
      x = alignment;
      y = `${rects.floating.height}px`;
    } else if (side === "right") {
      x = "0px";
      y = alignment;
    } else {
      x = `${rects.floating.width}px`;
      y = alignment;
    }

    return { data: { x, y } };
  },
  name: "transformOrigin",
};

const isOrigin = (value: unknown): value is { x: string; y: string } =>
  typeof value === "object" &&
  value !== null &&
  "x" in value &&
  typeof value.x === "string" &&
  "y" in value &&
  typeof value.y === "string";

/** floating-ui's `roundByDPR`: the position snaps to device pixels. */
const roundByDpr = (value: number) => {
  const dpr = window.devicePixelRatio || 1;

  return Math.round(value * dpr) / dpr;
};

export interface PositionOptions {
  align: PopoverAlign;
  alignOffset: number;
  avoidCollisions: boolean;
  collisionPadding: number;
  hideWhenDetached: boolean;
  side: PopoverSide;
  sideOffset: number;
  sticky: "always" | "partial";
}

const buildMiddleware = (options: PositionOptions): Middleware[] => {
  const detectOverflow = {
    altBoundary: false,
    boundary: NO_BOUNDARY,
    padding: options.collisionPadding,
  };

  const middleware: Middleware[] = [
    offset({
      alignmentAxis: options.alignOffset,
      mainAxis: options.sideOffset,
    }),
  ];

  if (options.avoidCollisions) {
    middleware.push(
      shift({
        crossAxis: false,
        limiter: options.sticky === "partial" ? limitShift() : undefined,
        mainAxis: true,
        ...detectOverflow,
      }),
      flip({ ...detectOverflow })
    );
  }

  middleware.push(
    size({
      ...detectOverflow,
      apply({ availableHeight, availableWidth, elements, rects }) {
        const { style } = elements.floating;

        style.setProperty("--ck-flyout-available-width", `${availableWidth}px`);
        style.setProperty(
          "--ck-flyout-available-height",
          `${availableHeight}px`
        );
        style.setProperty(
          "--ck-flyout-anchor-width",
          `${rects.reference.width}px`
        );
        style.setProperty(
          "--ck-flyout-anchor-height",
          `${rects.reference.height}px`
        );
      },
    }),
    transformOrigin
  );

  if (options.hideWhenDetached) {
    middleware.push(hide({ strategy: "referenceHidden", ...detectOverflow }));
  }

  return middleware;
};

/**
 * Places the floating wrapper against the trigger (`triggerRef`). The wrapper
 * takes the content's z-index, as the Radix popper does.
 */
export const usePopoverPosition = (
  options: PositionOptions,
  triggerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>
) => {
  const {
    align,
    alignOffset,
    avoidCollisions,
    collisionPadding,
    hideWhenDetached,
    side,
    sideOffset,
    sticky,
  } = options;

  const placement: Placement = align === "center" ? side : `${side}-${align}`;

  const middleware = useMemo(
    () =>
      buildMiddleware({
        align,
        alignOffset,
        avoidCollisions,
        collisionPadding,
        hideWhenDetached,
        side,
        sideOffset,
        sticky,
      }),
    [
      align,
      alignOffset,
      avoidCollisions,
      collisionPadding,
      hideWhenDetached,
      side,
      sideOffset,
      sticky,
    ]
  );

  const {
    isPositioned,
    middlewareData,
    placement: placed,
    refs: { floating: floatingRef, setFloating, setReference },
    x,
    y,
  } = useFloating({
    middleware,
    placement,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    setReference(triggerRef.current);
  }, [setReference, triggerRef]);

  useLayoutEffect(() => {
    const wrapper = floatingRef.current;
    const content = contentRef.current;

    if (wrapper && content) {
      wrapper.style.setProperty(
        "--ck-flyout-z-index",
        window.getComputedStyle(content).zIndex
      );
    }
  }, [floatingRef, contentRef]);

  const origin: unknown = middlewareData.transformOrigin;
  const [placedSide, placedAlign] = sideAndAlign(placed);

  return {
    hidden: middlewareData.hide?.referenceHidden === true,
    isPositioned,
    origin: isOrigin(origin) ? `${origin.x} ${origin.y}` : undefined,
    placedAlign,
    placedSide,
    setFloating,
    x: `${roundByDpr(x)}px`,
    y: `${roundByDpr(y)}px`,
  };
};
