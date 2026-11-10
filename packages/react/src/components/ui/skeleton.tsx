"use client";

import { useReducedMotion } from "@workspace/react/lib/reduced-motion";
import { cn } from "@workspace/react/lib/utils";
import type { ComponentProps, CSSProperties, ElementType } from "react";

import styles from "@workspace/react/components/skeleton/skeleton.module.css";

// Widths come from seedrandom's ARC4 generator.
/* eslint-disable eslint/no-bitwise, unicorn/prefer-code-point */
const seededRandom = (seed: string) => {
  const key: number[] = [];
  let smear = 0;

  for (let index = 0; index < seed.length; index += 1) {
    const slot = index & 255;
    smear ^= (key[slot] ?? 0) * 19;
    key[slot] = (smear + seed.charCodeAt(index)) & 255;
  }

  const state = Array.from({ length: 256 }, (_, index) => index);
  let i = 0;
  let j = 0;

  for (let index = 0; index < 256; index += 1) {
    j = (j + state[index] + (key[index % key.length] ?? 0)) & 255;
    [state[index], state[j]] = [state[j], state[index]];
  }

  j = 0;

  const generate = (count: number) => {
    let result = 0;

    for (let index = 0; index < count; index += 1) {
      i = (i + 1) & 255;
      const value = state[i];
      j = (j + value) & 255;
      state[i] = state[j];
      state[j] = value;
      result = result * 256 + state[(state[i] + value) & 255];
    }

    return result;
  };

  generate(256);

  return () => {
    let value = generate(6);
    let denominator = 256 ** 6;
    let extra = 0;

    while (value < 2 ** 52) {
      value = (value + extra) * 256;
      denominator *= 256;
      extra = generate(1);
    }

    while (value >= 2 ** 53) {
      value /= 2;
      denominator /= 2;
      extra >>>= 1;
    }

    return (value + extra) / denominator;
  };
};

/* eslint-enable eslint/no-bitwise, unicorn/prefer-code-point */

const clampWidth = (value: number) => Math.max(1, Math.min(100, value));

type ShimmerSize = "sm" | "md" | "lg" | "thumbnail" | "fill";

type ShimmerVariant =
  | "standard"
  | "project"
  | "edge-to-edge"
  | "conversation-followup";

type BarProps = ComponentProps<"div"> & {
  as?: ElementType;
  animate?: boolean;
  delayMs?: number;
  size?: ShimmerSize;
  variant?: ShimmerVariant;
  widthPercent?: number;
};

const LoadingResultsShimmer = ({
  as: Element = "div",
  animate = true,
  className,
  delayMs,
  size = "md",
  style,
  variant,
  widthPercent,
  ...props
}: BarProps) => {
  const reducedMotion = useReducedMotion();

  const barStyle: CSSProperties & {
    "--ck-results-sweep-delay"?: string;
    "--ck-sweep-width"?: string;
  } = {
    ...style,
    "--ck-sweep-width":
      widthPercent === undefined ? undefined : `${clampWidth(widthPercent)}%`,
    "--ck-results-sweep-delay":
      delayMs === undefined ? undefined : `${delayMs}ms`,
  };

  return (
    <Element
      {...props}
      aria-hidden="true"
      className={cn(styles.bar, className)}
      data-size={size}
      data-variant={variant}
      data-ck-reduced-motion={!animate || reducedMotion || undefined}
      style={barStyle}
    />
  );
};

type LinesProps = ComponentProps<"div"> &
  Pick<BarProps, "animate" | "size" | "variant"> & {
    lines?: number;
    minWidth?: number;
    maxWidth?: number;
    seed?: string;
    lineClassName?: string;
  };

const LoadingResultsShimmerLines = ({
  animate = true,
  className,
  lineClassName,
  lines = 3,
  minWidth = 55,
  maxWidth = 100,
  seed = "shimmer-lines",
  size = "md",
  variant,
  ...props
}: LinesProps) => {
  const min = clampWidth(Math.min(minWidth, maxWidth));
  const max = clampWidth(Math.max(minWidth, maxWidth));
  const random = seededRandom(`${seed}:${lines}:${min}:${max}`);

  const widths = Array.from(
    { length: Math.max(0, lines) },
    () => min + random() * (max - min)
  );

  return (
    <div
      {...props}
      className={cn("flex w-full flex-col items-start gap-2", className)}
    >
      {widths.map((width, index) => (
        <LoadingResultsShimmer
          key={index}
          animate={animate}
          className={lineClassName}
          delayMs={-index * 120}
          size={size}
          variant={variant}
          widthPercent={width}
        />
      ))}
    </div>
  );
};

type PlaceholderProps = ComponentProps<"div"> & {
  animate?: boolean;
  variant?: "default" | "solid" | "prominent";
};

const LoadingPlaceholder = ({
  animate = true,
  className,
  variant = "default",
  ...props
}: PlaceholderProps) => (
  <div
    {...props}
    data-loading-indicator=""
    data-animate={(variant === "default" && animate) || undefined}
    data-variant={variant}
    className={cn(
      styles.placeholder,
      variant === "solid" && "bg-panel-secondary",
      variant === "prominent" && "bg-text/10",
      variant === "prominent" && animate && "motion-safe:animate-pulse",
      className
    )}
  />
);

export {
  LoadingPlaceholder,
  LoadingResultsShimmer,
  LoadingResultsShimmerLines,
};

export type { BarProps, LinesProps, PlaceholderProps };
