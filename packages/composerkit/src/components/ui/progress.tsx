"use client";

import { useReducedMotion } from "composerkit/lib/reduced-motion";
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The component renders div and span elements with role progressbar and status, not progress or output elements. */
import { cn } from "composerkit/lib/utils";
import {
  Flower2 as LucideFlower2,
  LoaderCircle as LucideLoaderCircle,
} from "lucide-react";
import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ComponentProps, ReactNode, Ref } from "react";

import styles from "./progress.module.css";

/*
 * Progress and spinner family: CircularProgress, Spinner, the decorative
 * visibility binder, loading status, percent badge, blossom shimmer and
 * delayed loading indicator, linear bar, usage meter and delayed spinner.
 */

/** Inline style that only carries CSS custom properties, which classes then read. */
type CustomProperties = CSSProperties &
  Record<`--${string}`, number | string | undefined>;

const PERCENT_MIN = 0;
const PERCENT_MAX = 100;
const CIRCULAR_DEFAULT_SIZE = 12;
const CIRCULAR_DEFAULT_TRANSITION_MS = 120;
const PLAY_STATE_PROPERTY = "--ck-decoration-playback";

/*
 * `spin 2s steps(60, end) infinite` is --animate-spin. The component
 * motion-safe:animate-spin applies when data-ck-reduced-motion is false, or when
 * it is unset and the system does not ask for reduced motion. The play state
 * follows --ck-decoration-playback like the .animate-spin rule.
 */
const SPIN_CLASS =
  "[--animate-spin:spin_2s_steps(60,end)_infinite_var(--ck-decoration-playback,running)] motion-safe:animate-spin [:root[data-ck-reduced-motion=false]_&]:animate-spin [:root[data-ck-reduced-motion=true]_&]:animate-none";

const noCleanup = () => {
  // There is nothing to undo when the element is missing or cannot be observed.
};

/* ---------------------------------------------------------------- visibility binder */

interface VisibilityRegistry {
  observer: IntersectionObserver;
  targets: Map<Element, (visible: boolean) => void>;
}

const visibilityRegistries = new WeakMap<Document, VisibilityRegistry>();

const createVisibilityRegistry = (): VisibilityRegistry => {
  const targets = new Map<Element, (visible: boolean) => void>();

  return {
    observer: new IntersectionObserver((entries) => {
      for (const entry of entries) {
        targets.get(entry.target)?.(entry.isIntersecting);
      }
    }),
    targets,
  };
};

/**
 * Pauses decorative animations while the element is off-screen by setting
 * --ck-decoration-playback: paused on it. Returns a
 * cleanup function, so it can be used as a React callback ref.
 */
function bindDecorativeAnimationVisibility(
  element: HTMLElement | null | undefined,
  onChange?: (visible: boolean) => void
): () => void {
  if (element === null || element === undefined) {
    return noCleanup;
  }

  if (typeof IntersectionObserver === "undefined") {
    onChange?.(true);

    return noCleanup;
  }

  const { ownerDocument } = element;
  let registry = visibilityRegistries.get(ownerDocument);

  if (registry === undefined) {
    registry = createVisibilityRegistry();
    visibilityRegistries.set(ownerDocument, registry);
  }

  const { observer, targets } = registry;

  const apply = (visible: boolean) => {
    if (visible) {
      element.style.removeProperty(PLAY_STATE_PROPERTY);
    } else {
      element.style.setProperty(PLAY_STATE_PROPERTY, "paused");
    }

    onChange?.(visible);
  };

  apply(false);
  targets.set(element, apply);
  observer.observe(element);

  return () => {
    targets.delete(element);
    observer.unobserve(element);
    element.style.removeProperty(PLAY_STATE_PROPERTY);

    if (targets.size === 0) {
      observer.disconnect();
      visibilityRegistries.delete(ownerDocument);
    }
  };
}

const decorativeVisibilityRef = (element: HTMLElement | null) =>
  bindDecorativeAnimationVisibility(element);

/*
 * The spinner is paused while off-screen or while the document is
 * hidden, and the spin animation start time is reset to 0 on start, on
 * visibility changes and on document visibility changes, so every spinner
 * rotates in phase.
 */
const alignStart = async (animation: Animation, canSync: () => boolean) => {
  try {
    await animation.ready;
  } catch {
    // A cancelled animation needs no phase sync.
    return;
  }

  if (canSync() && !animation.pending && animation.playState === "running") {
    animation.startTime = 0;
  }
};

const spinnerRef = (element: HTMLElement | null) => {
  if (element === null) {
    return noCleanup;
  }

  const { ownerDocument } = element;
  let visible = false;

  const canSync = () => visible && element.isConnected && !ownerDocument.hidden;

  const sync = () => {
    if (!canSync()) {
      return;
    }

    queueMicrotask(() => {
      if (!canSync()) {
        return;
      }

      const animation = element
        .getAnimations()
        .find(
          (candidate) =>
            candidate instanceof CSSAnimation &&
            candidate.animationName === "spin"
        );

      if (animation?.playState !== "running") {
        return;
      }

      void alignStart(animation, canSync);
    });
  };

  const handleAnimationStart = (event: AnimationEvent) => {
    if (event.target === element && event.animationName === "spin") {
      sync();
    }
  };

  const unbind = bindDecorativeAnimationVisibility(element, (isVisible) => {
    visible = isVisible;
    sync();
  });

  ownerDocument.addEventListener("visibilitychange", sync);
  element.addEventListener("animationstart", handleAnimationStart);

  return () => {
    visible = false;
    unbind();
    ownerDocument.removeEventListener("visibilitychange", sync);
    element.removeEventListener("animationstart", handleAnimationStart);
  };
};

/* ---------------------------------------------------------------- circular progress */

const clampPercent = (value: number) => {
  if (!Number.isFinite(value) || value < PERCENT_MIN) {
    return PERCENT_MIN;
  }

  return value > PERCENT_MAX ? PERCENT_MAX : value;
};

interface CircularProgressProps {
  animateOnMount?: boolean;
  animateOnMountDelayMs?: number;
  className?: string;
  percent: number;
  progressClassName?: string;
  reducedMotion?: boolean;
  size?: number;
  strokeWidth?: number;
  transitionDurationMs?: number;
}

/** Decorative determinate ring. It never carries progressbar semantics. */
function CircularProgress({
  animateOnMount = false,
  animateOnMountDelayMs = 0,
  className,
  percent,
  progressClassName,
  reducedMotion = false,
  size = CIRCULAR_DEFAULT_SIZE,
  strokeWidth = 2,
  transitionDurationMs = CIRCULAR_DEFAULT_TRANSITION_MS,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const value = clampPercent(percent);
  const center = size / 2;
  const fillsOnMount = animateOnMount && !reducedMotion;

  const ringStyle: CustomProperties = {
    "--progress-delay": fillsOnMount ? `${animateOnMountDelayMs}ms` : undefined,
    "--progress-transition": reducedMotion
      ? "none"
      : `stroke-dashoffset ${transitionDurationMs}ms ease-out, opacity ${transitionDurationMs}ms ease-out`,
  };

  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <circle
        cx={center}
        cy={center}
        fill="none"
        opacity={0.16}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <circle
        className={cn(
          "[animation-delay:var(--progress-delay)] [transition:var(--progress-transition)]",
          progressClassName,
          fillsOnMount && styles.fillOnMount
        )}
        cx={center}
        cy={center}
        fill="none"
        opacity={value === PERCENT_MIN ? 0 : 1}
        pathLength={PERCENT_MAX}
        r={radius}
        stroke="currentColor"
        strokeDasharray={PERCENT_MAX}
        strokeDashoffset={PERCENT_MAX - value}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        style={ringStyle}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}

/* ---------------------------------------------------------------- spinner */

function SpinnerIcon(props: ComponentProps<"svg">) {
  return (
    <LucideLoaderCircle
      height={24}
      width={24}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      strokeWidth={1.5}
    />
  );
}

interface SpinnerProps {
  as?: "div" | "span";
  className?: string;
  containerClassName?: string;
  Icon?: (props: { className?: string }) => ReactNode;
}

/** Indeterminate spinner. className sizes the icon, for example size-7 or size-3. */
function Spinner({
  as = "div",
  className,
  containerClassName,
  Icon = SpinnerIcon,
}: SpinnerProps) {
  return createElement(
    as,
    {
      className: cn(
        "inline-flex h-fit w-fit items-center justify-center leading-none [contain:layout_paint_style]",
        SPIN_CLASS,
        containerClassName
      ),
      "data-loading-indicator": "",
      ref: spinnerRef,
    },
    <Icon className={className} />
  );
}

/* ---------------------------------------------------------------- loading status */

const LOADING_STATUS_MESSAGE = "Loading scheduled run…";

interface LoadingStatusProps {
  /** Replaces the announced text. The component has no props and always announces the default. */
  children?: ReactNode;
}

/** Standalone loading placeholder. */
function LoadingStatus({
  children = LOADING_STATUS_MESSAGE,
}: LoadingStatusProps) {
  return (
    <div className="flex h-full items-center justify-center" role="status">
      <Spinner className="size-7" />
      <span className="sr-only">{children}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- percent badge */

const GENERATION_CURVE = [
  [0, 3],
  [0.1, 25],
  [0.55, 58],
  [0.85, 88],
  [1, 90],
] as const;

const GENERATION_CURVE_MS = 45_000;
const GENERATION_CAP = 99;
const GENERATION_REFRESH_MS = 500;
const GENERATION_TAIL_START = 90;
const GENERATION_TAIL_RANGE = 10;
const GENERATION_TAIL_RATE = 1.5;

/** Integer percent estimated from the time since generation started. */
function estimateGenerationProgress(elapsedMs: number): number {
  const position = Math.max(0, elapsedMs / GENERATION_CURVE_MS);

  for (let index = 1; index < GENERATION_CURVE.length; index += 1) {
    const [fromX, fromY] = GENERATION_CURVE[index - 1];
    const [toX, toY] = GENERATION_CURVE[index];

    if (position <= toX) {
      const fraction = (position - fromX) / (toX - fromX);

      return Math.floor(fromY + fraction * (toY - fromY));
    }
  }

  return Math.min(
    GENERATION_CAP,
    Math.floor(
      GENERATION_TAIL_START +
        GENERATION_TAIL_RANGE *
          (1 - Math.exp(-GENERATION_TAIL_RATE * (position - 1)))
    )
  );
}

interface ProgressBadgeProps {
  locale?: string;
  progress: number;
  ref?: Ref<HTMLSpanElement>;
}

/** Percent pill. progress is 0 to 100. */
function ProgressBadge({ locale, progress, ref }: ProgressBadgeProps) {
  const text = new Intl.NumberFormat(locale, { style: "percent" }).format(
    progress / PERCENT_MAX
  );

  return (
    <span
      className="pointer-events-none absolute end-3.5 bottom-3.5 z-10 flex h-7 min-w-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ck-palette-surface-card,var(--ck-palette-surface-surface))_80%,transparent)] px-2 text-[0.875rem] leading-5 font-medium tracking-normal text-[color:var(--color-image-generation-text,var(--ck-palette-label-accent))] tabular-nums shadow-lg ring-[0.5px] ring-border backdrop-blur-md select-none"
      ref={ref}
    >
      {text}
    </span>
  );
}

interface GenerationProgressBadgeProps {
  generationStartedAtMs: number;
  isActive?: boolean;
  locale?: string;
}

/** Badge that tracks the estimate while visible. Updates every 500ms and stops at 99. */
function GenerationProgressBadge({
  generationStartedAtMs,
  isActive = true,
  locale,
}: GenerationProgressBadgeProps) {
  const [progress, setProgress] = useState(() => estimateGenerationProgress(0));

  const elementRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (element === null) {
      return noCleanup;
    }

    const { ownerDocument } = element;
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = () => {
      const next = estimateGenerationProgress(
        Date.now() - generationStartedAtMs
      );

      setProgress(next);

      if (next === GENERATION_CAP) {
        clearInterval(timer);
        timer = undefined;
      }

      return next;
    };

    const tick = () => {
      refresh();
    };

    const schedule = () => {
      clearInterval(timer);
      timer = undefined;

      if (visible && !ownerDocument.hidden && refresh() < GENERATION_CAP) {
        timer = setInterval(tick, GENERATION_REFRESH_MS);
      }
    };

    refresh();

    if (!isActive) {
      return noCleanup;
    }

    ownerDocument.addEventListener("visibilitychange", schedule);

    const unbind = bindDecorativeAnimationVisibility(element, (isVisible) => {
      visible = isVisible;
      schedule();
    });

    return () => {
      unbind();
      ownerDocument.removeEventListener("visibilitychange", schedule);
      clearInterval(timer);
    };
  }, [generationStartedAtMs, isActive]);

  return <ProgressBadge locale={locale} progress={progress} ref={elementRef} />;
}

/* ---------------------------------------------------------------- blossom shimmer */

const BLOSSOM_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flower-2" aria-hidden="true"><path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"></path><circle cx="12" cy="8" r="2"></circle><path d="M12 10v12"></path><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"></path><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"></path></svg>';

/* An SVG string as a data URL. */
const BLOSSOM_MASK_URL = `data:image/svg+xml;utf8,${encodeURIComponent(BLOSSOM_SVG)}`;

function BlossomIcon(props: ComponentProps<"svg">) {
  return (
    <LucideFlower2
      height={21}
      width={21}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      strokeWidth={1.5}
    />
  );
}

interface BlossomShimmerProps {
  className?: string;
  Icon?: (props: { className?: string }) => ReactNode;
  maskUrl?: string;
}

/** Glyph with a masked, moving highlight. Decorative. */
function BlossomShimmer({
  className,
  Icon = BlossomIcon,
  maskUrl = BLOSSOM_MASK_URL,
}: BlossomShimmerProps) {
  const maskStyle: CustomProperties = { "--blossom-mask": `url("${maskUrl}")` };

  return (
    <div
      aria-hidden="true"
      className={cn(styles.blossomRoot, className)}
      ref={decorativeVisibilityRef}
    >
      <Icon className={styles.blossomBase} />
      <div className={styles.blossomOverlay} style={maskStyle} />
    </div>
  );
}

/* ---------------------------------------------------------------- delayed loading indicator */

interface DelayedLoadingIndicatorProps {
  /** Accepted and unused. */
  debugName?: string;
  delay?: boolean;
  fillParent?: boolean;
  overlay?: boolean;
  startupIndicator?: ReactNode;
  status?: ReactNode;
  variant?: "blossom" | "page";
}

function loadingFrameClass(overlay: boolean, fillParent: boolean) {
  if (overlay) {
    return "absolute inset-0 z-10 bg-panel-secondary/70";
  }

  return fillParent
    ? "absolute inset-0 bg-transparent"
    : "relative size-full bg-transparent";
}

/* The component gives the presentation frame a click handler that does nothing. */
const ignoreClick = () => {
  // Intentionally empty, like the handler.
};

/** Delayed page or blossom loading state. */
function DelayedLoadingIndicator({
  delay = true,
  fillParent = false,
  overlay = false,
  startupIndicator,
  status,
  variant = "page",
}: DelayedLoadingIndicatorProps) {
  const isBlossom = variant === "blossom";

  let indicator: ReactNode = <Spinner className="size-7 text-text-muted" />;

  if (isBlossom) {
    indicator = startupIndicator ?? <BlossomShimmer className="size-14" />;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        loadingFrameClass(overlay, fillParent)
      )}
      onClick={ignoreClick}
      role="presentation"
    >
      {overlay || fillParent ? null : (
        <div className="absolute inset-x-0 top-0 h-bar select-none [-webkit-app-region:drag]" />
      )}
      <div
        className={cn(
          "flex flex-col items-center gap-2",
          !isBlossom && delay && styles.delayedIndicator,
          isBlossom && delay && styles.delayedBlossom
        )}
      >
        {indicator}
        {status === undefined || status === null || status === false ? null : (
          <span className="text-text-muted" role="status">
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- typing dots */

const TYPING_DOT_COUNT = 3;

const TYPING_DOT_KEYS = Array.from(
  { length: TYPING_DOT_COUNT },
  (_, index) => `dot-${index}`
);

/** Three bouncing dots. Decorative. */
function TypingDots() {
  return (
    <span
      aria-hidden
      className="flex items-center justify-center gap-1"
      ref={decorativeVisibilityRef}
    >
      {TYPING_DOT_KEYS.map((key) => (
        <span
          className={cn("size-1 rounded-full bg-text/70", styles.waveDot)}
          key={key}
        />
      ))}
    </span>
  );
}

/* ---------------------------------------------------------------- linear progress */

/*
 * Fill `transition-all duration-1000 motion-reduce:transition-none`.
 * The motion-reduce variant follows the app override: the transition
 * is removed when :root[data-ck-reduced-motion=true], or, with no attribute,
 * when the system asks for reduced motion. With the attribute false the
 * transition stays even if the system asks for reduced motion.
 */
const LINEAR_FILL_CLASS =
  "h-full w-(--bar-width) rounded-full bg-text transition-all duration-1000 [:root[data-ck-reduced-motion=true]_&]:transition-none motion-reduce:[:root:not([data-ck-reduced-motion])_&]:transition-none";

interface LinearProgressProps {
  complete?: boolean;
  labelledBy?: string;
  value: number;
}

/** Thin bar. aria-valuenow is 100 only when complete, otherwise omitted. */
function LinearProgress({ complete, labelledBy, value }: LinearProgressProps) {
  const isComplete = complete === true;

  const barStyle: CustomProperties = {
    "--bar-width": `${isComplete ? PERCENT_MAX : value}%`,
  };

  return (
    <div
      aria-labelledby={labelledBy}
      aria-valuenow={isComplete ? PERCENT_MAX : undefined}
      className="h-1 overflow-hidden rounded-full bg-stroke-subtle"
      role="progressbar"
    >
      <div className={LINEAR_FILL_CLASS} style={barStyle} />
    </div>
  );
}

/* ---------------------------------------------------------------- meter and reset fill */

type Easing = (progress: number) => number;

const BEZIER_ITERATIONS = 24;
const BEZIER_PRECISION = 1e-7;

const bezierAxis = (a: number, b: number, t: number) =>
  3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;

/** Cubic bezier easing with the control points of CSS cubic-bezier(x1, y1, x2, y2). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  return (x) => {
    if (x <= 0) {
      return 0;
    }

    if (x >= 1) {
      return 1;
    }

    let low = 0;
    let high = 1;
    let t = x;

    for (let step = 0; step < BEZIER_ITERATIONS; step += 1) {
      t = (low + high) / 2;
      const error = bezierAxis(x1, x2, t) - x;

      if (Math.abs(error) < BEZIER_PRECISION) {
        break;
      }

      if (error > 0) {
        high = t;
      } else {
        low = t;
      }
    }

    return bezierAxis(y1, y2, t);
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Piecewise interpolation between stops, easing the progress inside each segment. */
function interpolate(
  input: readonly number[],
  output: readonly number[],
  ease: Easing
) {
  return (value: number) => {
    const last = input.length - 1;

    if (value <= input[0]) {
      return output[0];
    }

    if (value >= input[last]) {
      return output[last];
    }

    let segment = 0;

    while (segment < last - 1 && value > input[segment + 1]) {
      segment += 1;
    }

    const span = input[segment + 1] - input[segment];
    const local = ease((value - input[segment]) / span);

    return output[segment] + local * (output[segment + 1] - output[segment]);
  };
}

const RESET_DURATION_MS = 1900;
const RESET_FILL_START_MS = 80;
const RESET_FILL_DURATION_MS = 1220;
const RESET_COLOR_IN_MS = 160;
const RESET_COLOR_OUT_MS = 360;
const RESET_COLOR_HOLD_END_MS = 1520;
const RESET_COLOR_OUT_END_MS = 1880;
const RESET_SHIMMER_DELAY_MS = 40;
const RESET_SHIMMER_DURATION_MS = 520;
const RESET_SHIMMER_PEAK = 0.7;
const RESET_BLOOM_START_MS = 1250;
const RESET_BLOOM_DURATION_MS = 560;
const RESET_COLOR_CURRENT = "currentColor";
const RESET_COLOR_ACCENT = "var(--color-status-discovery-fill)";
const SHIMMER_FADE_IN = 0.18;
const SHIMMER_FADE_OUT_START = 0.76;
const SHIMMER_X_START = -110;
const SHIMMER_X_TRAVEL = 340;
const COLOR_DECIMALS = 3;

const fillEase = cubicBezier(0.25, 0.1, 0.25, 1);
const curveEase = cubicBezier(0.4, 0, 0.2, 1);

const bloomOpacityAt = interpolate(
  [0, 0.16, 0.42, 0.7, 1],
  [0, 0.14, 0.58, 0.3, 0],
  curveEase
);

const bloomScaleAt = interpolate(
  [0, 0.42, 0.7, 1],
  [0.93, 0.985, 1, 1],
  curveEase
);

const mixAccent = (amount: number) =>
  `color-mix(in srgb, ${RESET_COLOR_CURRENT} ${((1 - amount) * 100).toFixed(COLOR_DECIMALS)}%, ${RESET_COLOR_ACCENT} ${(amount * 100).toFixed(COLOR_DECIMALS)}%)`;

const shimmerWindow = (ms: number) =>
  clamp(
    (ms - RESET_BLOOM_START_MS - RESET_SHIMMER_DELAY_MS) /
      RESET_SHIMMER_DURATION_MS,
    0,
    1
  );

const bloomWindow = (ms: number) =>
  clamp((ms - RESET_BLOOM_START_MS) / RESET_BLOOM_DURATION_MS, 0, 1);

function resetFillColor(ms: number): string {
  if (ms <= RESET_FILL_START_MS) {
    return RESET_COLOR_CURRENT;
  }

  if (ms < RESET_FILL_START_MS + RESET_COLOR_IN_MS) {
    return mixAccent(curveEase((ms - RESET_FILL_START_MS) / RESET_COLOR_IN_MS));
  }

  if (ms < RESET_COLOR_HOLD_END_MS) {
    return RESET_COLOR_ACCENT;
  }

  if (ms < RESET_COLOR_OUT_END_MS) {
    return mixAccent(
      1 - curveEase((ms - RESET_COLOR_HOLD_END_MS) / RESET_COLOR_OUT_MS)
    );
  }

  return RESET_COLOR_CURRENT;
}

function resetShimmerOpacity(ms: number): number {
  const phase = shimmerWindow(ms);

  if (phase <= 0 || phase >= 1) {
    return 0;
  }

  if (phase <= SHIMMER_FADE_IN) {
    return RESET_SHIMMER_PEAK * curveEase(phase / SHIMMER_FADE_IN);
  }

  if (phase <= SHIMMER_FADE_OUT_START) {
    return RESET_SHIMMER_PEAK;
  }

  return (
    RESET_SHIMMER_PEAK *
    (1 -
      curveEase(
        (phase - SHIMMER_FADE_OUT_START) / (1 - SHIMMER_FADE_OUT_START)
      ))
  );
}

/** Values of the usage meter reset fill at a point of its timeline (0 to 1). */
interface ResetFillAnimation {
  bloomOpacity: number;
  bloomScale: number;
  fillColor: string;
  /** Eased fill fraction from 0 to 1. */
  progress: number;
  shimmerOpacity: number;
  shimmerX: string;
}

function resetFillAt(timeline: number): ResetFillAnimation {
  const ms = timeline * RESET_DURATION_MS;
  const phase = bloomWindow(ms);

  return {
    bloomOpacity: bloomOpacityAt(phase),
    bloomScale: bloomScaleAt(phase),
    fillColor: resetFillColor(ms),
    progress: fillEase(
      clamp((ms - RESET_FILL_START_MS) / RESET_FILL_DURATION_MS, 0, 1)
    ),
    shimmerOpacity: resetShimmerOpacity(ms),
    shimmerX: `${SHIMMER_X_START + SHIMMER_X_TRAVEL * curveEase(shimmerWindow(ms))}%`,
  };
}

const idleResetFill = resetFillAt(0);

interface ResetFillControls extends ResetFillAnimation {
  reset: () => void;
  /** Runs the 1900ms reset and calls onDone when it completes. reset stops it without calling onDone. */
  start: (onDone: () => void) => void;
}

/** Reset fill timeline. With reducedMotion it jumps to the end and finishes at once. */
function useResetFillAnimation(reducedMotion = false): ResetFillControls {
  const [timeline, setTimeline] = useState(0);
  const frame = useRef(0);

  const reset = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setTimeline(0);
  }, []);

  const start = useCallback(
    (onDone: () => void) => {
      reset();

      if (reducedMotion) {
        setTimeline(1);
        onDone();

        return;
      }

      const begin = performance.now();

      const tick = (now: number) => {
        const next = Math.min(1, (now - begin) / RESET_DURATION_MS);
        setTimeline(next);

        if (next < 1) {
          frame.current = requestAnimationFrame(tick);
        } else {
          onDone();
        }
      };

      frame.current = requestAnimationFrame(tick);
    },
    [reducedMotion, reset]
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    []
  );

  return useMemo(
    () => ({ ...resetFillAt(timeline), reset, start }),
    [reset, start, timeline]
  );
}

const meterClip = (percent: number) =>
  `inset(0 ${PERCENT_MAX - clamp(percent, PERCENT_MIN, PERCENT_MAX)}% 0 0 round 999px)`;

interface MeterProps {
  accessibleLabel: string;
  /** Percent from 0 to 100 that the fill follows while isResetFillActive is true. */
  animatedPercent?: number;
  isResetFillActive?: boolean;
  remainingPercent: number;
  resetFillAnimation?: Omit<ResetFillAnimation, "progress">;
  size?: "compact" | "default";
}

/** Usage meter. The fill is clipped and takes its colour from currentColor. */
function Meter({
  accessibleLabel,
  animatedPercent = PERCENT_MIN,
  isResetFillActive = false,
  remainingPercent,
  resetFillAnimation = idleResetFill,
  size = "default",
}: MeterProps) {
  const fillStyle: CustomProperties = {
    "--meter-clip": isResetFillActive
      ? meterClip(animatedPercent)
      : `inset(0 ${PERCENT_MAX - remainingPercent}% 0 0 round 999px)`,
    "--meter-fill": resetFillAnimation.fillColor,
  };

  const bloomStyle: CustomProperties = {
    "--bloom-opacity": resetFillAnimation.bloomOpacity,
    "--bloom-scale": resetFillAnimation.bloomScale,
  };

  const shimmerStyle: CustomProperties = {
    "--ck-sweep-opacity": resetFillAnimation.shimmerOpacity,
    "--ck-sweep-x": resetFillAnimation.shimmerX,
  };

  return (
    <div
      aria-label={accessibleLabel}
      aria-valuemax={PERCENT_MAX}
      aria-valuemin={PERCENT_MIN}
      aria-valuenow={remainingPercent}
      className={cn(
        "relative overflow-hidden rounded-full bg-text/10",
        size === "compact" ? "h-1.5" : "h-2"
      )}
      role="progressbar"
    >
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-full [background-color:var(--meter-fill)] [will-change:background-color,clip-path] [clip-path:var(--meter-clip)]"
        style={fillStyle}
      >
        <div
          className={cn(
            "absolute inset-0 origin-right [transform:scaleX(var(--bloom-scale))] rounded-full opacity-(--bloom-opacity) [will-change:opacity,transform]",
            styles.meterBloom
          )}
          style={bloomStyle}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[68%] [transform:translateX(var(--ck-sweep-x))] opacity-(--ck-sweep-opacity) mix-blend-screen [will-change:opacity,transform]",
            styles.meterShimmer
          )}
          style={shimmerStyle}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- delayed spinner */

const DELAYED_SPINNER_MS = 200;

interface DelayedSpinnerProps {
  className?: string;
}

/** Renders nothing for 200ms, then a progressbar span holding the spinner. */
function DelayedSpinner({ className }: DelayedSpinnerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, DELAYED_SPINNER_MS);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <span className="inline-flex items-center" role="progressbar">
      <Spinner as="span" className={className} />
    </span>
  );
}

/* ---------------------------------------------------------------- upload overlay */

const UPLOAD_INDETERMINATE_PERCENT = 25;
const UPLOAD_RING_SIZE = 24;

interface UploadOverlayProps {
  label: string;
  percentage?: number | null;
}

/** Progress overlay for media being uploaded. */
function UploadOverlay({ label, percentage }: UploadOverlayProps) {
  const reducedMotion = useReducedMotion();

  const determinate =
    percentage !== null && percentage !== undefined && percentage !== 0;

  const indeterminate = !determinate;
  const spins = indeterminate && !reducedMotion;

  return (
    <span
      aria-label={label}
      aria-valuemax={PERCENT_MAX}
      aria-valuemin={PERCENT_MIN}
      aria-valuenow={determinate ? percentage : undefined}
      className="absolute inset-0 flex items-center justify-center bg-black/50 text-white backdrop-blur-xs"
      ref={spins ? decorativeVisibilityRef : undefined}
      role="progressbar"
    >
      <CircularProgress
        className={spins ? SPIN_CLASS : undefined}
        percent={determinate ? percentage : UPLOAD_INDETERMINATE_PERCENT}
        reducedMotion={reducedMotion}
        size={UPLOAD_RING_SIZE}
        strokeWidth={2}
      />
    </span>
  );
}

export {
  BlossomShimmer,
  CircularProgress,
  DelayedLoadingIndicator,
  DelayedSpinner,
  GenerationProgressBadge,
  LinearProgress,
  LoadingStatus,
  Meter,
  ProgressBadge,
  Spinner,
  SpinnerIcon,
  TypingDots,
  UploadOverlay,
  bindDecorativeAnimationVisibility,
  estimateGenerationProgress,
  useResetFillAnimation,
};

export type {
  CircularProgressProps,
  DelayedLoadingIndicatorProps,
  MeterProps,
  ResetFillAnimation,
  SpinnerProps,
};
