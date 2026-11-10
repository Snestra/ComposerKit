"use client";

import { cn } from "@workspace/react/lib/utils";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

type AnimatedSegmentedToggleSize = "compact" | "default";

interface AnimatedSegmentedToggleOption {
  ariaLabel?: string;
  id: string;
  label: ReactNode;
}

interface AnimatedSegmentedToggleProps {
  animateSelection?: boolean;
  ariaLabel?: string;
  className?: string;
  onSelect: (id: string) => void;
  options: readonly AnimatedSegmentedToggleOption[];
  selectedId: string;
  size?: AnimatedSegmentedToggleSize;
}

// The container, option and
// thumb classes are the ones.
const containerClasses = {
  compact: "inline-grid gap-0.5 rounded-[10px] bg-panel-secondary/92 p-0.5",
  default: "bg-text/10 inline-grid gap-1 rounded-2xl p-1",
} as const satisfies Record<AnimatedSegmentedToggleSize, string>;

// `cursor-interaction` is `default` on the Electron desktop window.
const optionClasses = {
  compact:
    "flex h-6 items-center justify-center rounded-lg px-2 py-0 text-xs leading-4 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
  default: "rounded-xl px-3 py-1.5 text-sm font-medium",
} as const satisfies Record<AnimatedSegmentedToggleSize, string>;

const selectedTextClasses = {
  compact: "text-text",
  default: "text-black",
} as const satisfies Record<AnimatedSegmentedToggleSize, string>;

const thumbClasses = {
  compact: "absolute inset-0 -z-10 rounded-lg bg-panel shadow-sm",
  default: "absolute inset-0 -z-10 rounded-xl bg-white shadow-sm",
} as const satisfies Record<AnimatedSegmentedToggleSize, string>;

// The thumb's layout animation, on the Web Animations API.
//
// The thumb is `<motion.span layoutId transition={{ type: "spring",
// duration: 0.28, bounce: 0 }}>`. Motion's shared layout animation runs one
// spring from 0 to 1000 and mixes the thumb from its old box to its new box
// with that progress. Both boxes have the same size (equal grid columns), so
// only the translation changes, linearly in the progress; the component never
// animates the thumb's opacity here.
//
// Motion resolves a spring from duration and bounce. With bounce 0 the
// damping ratio is 1 and the velocity 0. It finds the undamped frequency w by
// Newton's method (11 steps from 5 / duration) on
// exp(-w * duration) * (w * duration + 1) = 0.001, and the spring returns
// progress(t) = 1 - (1 + w * t) * exp(-w * t), snapping to 1 at the duration.
// Here that is w = 32.98 / s and a 280 ms animation. A keyframe every
// millisecond keeps the interpolation error below 0.02% of the travel.
//
// Measured in Chromium on /gallery/segmented-control: the thumb is within 0.01 px of this
// formula at every frame. Against motion 14.9.0 running the same markup the
// curve is the same; from rest this version starts at the first frame after the
// click, motion one frame later (0 to 16.2 ms, under one 60 Hz frame), and
// when a click interrupts a move both restart from rest at the thumb's
// current position and start together within 2 ms.
const SPRING_DURATION_SECONDS = 0.28;
const SPRING_REST_DELTA = 0.001;
const SPRING_NEWTON_STEPS = 11;
const SPRING_SAMPLES = 280;
const MILLISECONDS = 1000;

const springFrequency = () => {
  let x = 5;

  for (let step = 0; step < SPRING_NEWTON_STEPS; step += 1) {
    const decay = Math.exp(-x);

    x -= (decay * (1 + x) - SPRING_REST_DELTA) / (-x * decay);
  }

  return x / SPRING_DURATION_SECONDS;
};

const frequency = springFrequency();

// Position of a critically damped spring released at rest, from 0 to 1.
const springProgress = (seconds: number) =>
  1 - (1 + frequency * seconds) * Math.exp(-frequency * seconds);

const springKeyframes = (dx: number, dy: number): Keyframe[] =>
  Array.from({ length: SPRING_SAMPLES + 1 }, (_, index) => {
    const remaining =
      1 - springProgress((index / SPRING_SAMPLES) * SPRING_DURATION_SECONDS);

    return { transform: `translate(${dx * remaining}px, ${dy * remaining}px)` };
  });

const AnimatedSegmentedToggle = ({
  animateSelection = true,
  ariaLabel,
  className,
  onSelect,
  options,
  selectedId,
  size = "default",
}: AnimatedSegmentedToggleProps) => {
  const thumbRef = useRef<HTMLSpanElement | null>(null);
  const previousRect = useRef<DOMRect | null>(null);
  const animationRef = useRef<Animation | null>(null);

  // layoutId: the thumb is one shared element, so a new selection moves it
  // from where the old one is drawn to where the new one is. The thumb is
  // remounted in the newly selected option; its ref cleanup runs while the
  // old thumb is still in the document, so for every selection change,
  // whether from a click or from the parent, the start is the position the
  // thumb is drawn at now, also while it is still moving.
  // A ref callback that returns a cleanup is never called with null.
  const attachThumb = useCallback((thumb: HTMLSpanElement) => {
    thumbRef.current = thumb;

    return () => {
      previousRect.current = thumb.getBoundingClientRect();
      thumbRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const thumb = thumbRef.current;

    if (!thumb) {
      return;
    }

    const from = previousRect.current;
    const to = thumb.getBoundingClientRect();

    previousRect.current = null;
    animationRef.current?.cancel();
    animationRef.current = null;

    if (animateSelection && from) {
      const dx = from.left - to.left;
      const dy = from.top - to.top;

      if (dx !== 0 || dy !== 0) {
        animationRef.current = thumb.animate(springKeyframes(dx, dy), {
          duration: SPRING_DURATION_SECONDS * MILLISECONDS,
          easing: "linear",
        });
      }
    }

    // The effect runs when the selection changes; the thumb is read from the ref.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [animateSelection, selectedId]);

  const columnsStyle: CSSProperties & Record<`--${string}`, string> = {
    "--columns": String(options.length),
  };

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        containerClasses[size],
        "[grid-template-columns:repeat(var(--columns),minmax(0,1fr))]",
        className
      )}
      // The group is <div role="group" aria-label>.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      style={columnsStyle}
    >
      {options.map((option) => {
        const selected = option.id === selectedId;

        return (
          <button
            aria-label={option.ariaLabel}
            aria-pressed={selected}
            className={cn(
              "relative isolate min-w-0 cursor-default transition-transform duration-(--motion-duration-fast) active:scale-[0.98]",
              optionClasses[size],
              selected ? selectedTextClasses[size] : "text-text-muted"
            )}
            key={option.id}
            onClick={() => {
              onSelect(option.id);
            }}
            type="button"
          >
            {selected ? (
              <span className={thumbClasses[size]} ref={attachThumb} />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export { AnimatedSegmentedToggle };

export type {
  AnimatedSegmentedToggleOption,
  AnimatedSegmentedToggleProps,
  AnimatedSegmentedToggleSize,
};
