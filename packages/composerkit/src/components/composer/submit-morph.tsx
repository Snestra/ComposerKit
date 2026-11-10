"use client";

/* oxlint-disable shadcn/no-inline-styles -- The icon's rotate, y and scale are custom properties that a transform class reads; they change on every frame. */

/* oxlint-disable shadcn/no-inline-styles -- The icon's rotate, y and scale are custom properties that a transform class reads; they change on every frame. */

import {
  MORPH_PATHS,
  VOICE_COLLAPSED,
  VOICE_SEND_LINES,
} from "composerkit/components/composer/morph-geometry";
import type { ComposerMorphState } from "composerkit/components/composer/morph-geometry";
import { cn } from "composerkit/lib/utils";
import type { CSSProperties } from "react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import styles from "composerkit/components/composer/composer.module.css";

/*
 * The morphing send, stop and voice icon.
 * The component animates an svg with framer-motion: the svg's rotate, y and scale
 * and each of four paths' `d`. The library has no animation package, so
 * this file runs the same keyframes (values, times, durations, delays and
 * easings from the transition table) on
 * requestAnimationFrame. A `null` keyframe is the value at the moment the
 * animation starts, so a state change in mid-flight continues from where the
 * icon is.
 */

type Bezier = readonly [number, number, number, number];

const EASE: Bezier = [0.4, 0, 0.2, 1];

interface TrackSpec {
  delay?: number;
  duration: number;
  ease: Bezier;
  times: readonly number[];
}

interface MorphTransition {
  /** The transform values after the animation. */
  rest: Transform;
  /** The `transform` keyframes; the first keyframe of every track is the current value. */
  transform: {
    rotate: readonly number[];
    scale: readonly number[];
    y: readonly number[];
  };
  transformTransition: TrackSpec & { rotateTimes?: readonly number[] };
  pathTransition: TrackSpec;
}

interface Transform {
  rotate: number;
  scale: number;
  y: number;
}

const REST: Transform = { rotate: 0, scale: 1, y: 0 };

/** Keyframe times and transitions of each morph between send, stop and voice. */
const SEND_TIMES = [0, 0.2, 0.7, 1] as const;
const STOP_TIMES = [0, 0.2, 0.8, 1] as const;

const MORPH_TRANSITIONS = {
  stopToSend: {
    pathTransition: { delay: 0.06, duration: 0.36, ease: EASE, times: [0, 1] },
    rest: REST,
    transform: { rotate: [-6, 0], scale: [0.94, 1.03, 1], y: [0.5, -0.8, 0] },
    transformTransition: {
      duration: 0.46,
      ease: EASE,
      rotateTimes: [0, 0.8, 1],
      times: STOP_TIMES,
    },
  },
  toStop: {
    pathTransition: { delay: 0.06, duration: 0.36, ease: EASE, times: [0, 1] },
    rest: { ...REST, rotate: 90 },
    transform: { rotate: [94, 90], scale: [1.07, 0.96, 1], y: [-2.5, 0.2, 0] },
    transformTransition: {
      duration: 0.46,
      ease: EASE,
      rotateTimes: [0, 0.8, 1],
      times: STOP_TIMES,
    },
  },
  toVoice: {
    pathTransition: {
      duration: 0.5,
      ease: EASE,
      times: [0, 0.43, 0.67, 1],
    },
    rest: REST,
    transform: {
      rotate: [2.8, -1, 0],
      scale: [0.9, 1.05, 1],
      y: [-0.5, 0.42, 0],
    },
    transformTransition: { duration: 0.5, ease: EASE, times: SEND_TIMES },
  },
  voiceToSend: {
    pathTransition: {
      duration: 0.5,
      ease: EASE,
      times: [0, 0.21, 0.43, 1],
    },
    rest: REST,
    transform: {
      rotate: [-3, 1, 0],
      scale: [0.88, 1.06, 1],
      y: [0.5, -1.45, 0],
    },
    transformTransition: { duration: 0.5, ease: EASE, times: SEND_TIMES },
  },
} as const satisfies Record<string, MorphTransition>;

type MorphTransitionName = keyof typeof MORPH_TRANSITIONS;

/** Which transition the icon plays for a state change. */
interface MorphTransitionChoice {
  involvesVoice: boolean;
  name: MorphTransitionName;
}

const transitionFor = (
  state: ComposerMorphState,
  previous: ComposerMorphState
): MorphTransitionChoice => {
  const involvesVoice =
    state === "voice" || (state === "send" && previous === "voice");

  if (state === "voice") {
    return { involvesVoice, name: "toVoice" };
  }

  if (involvesVoice) {
    return { involvesVoice, name: "voiceToSend" };
  }

  return { involvesVoice, name: state === "stop" ? "toStop" : "stopToSend" };
};

/* ---------------------------------------------------------------- easing and sampling */

const BEZIER_EPSILON = 1e-6;
const BEZIER_ITERATIONS = 24;

const bezierAxis = (a: number, b: number, t: number) =>
  3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;

const cubicBezier =
  ([x1, y1, x2, y2]: Bezier) =>
  (progress: number) => {
    if (progress <= 0 || progress >= 1) {
      return Math.min(1, Math.max(0, progress));
    }

    let low = 0;
    let high = 1;
    let t = progress;

    for (let index = 0; index < BEZIER_ITERATIONS; index += 1) {
      const x = bezierAxis(x1, x2, t);

      if (Math.abs(x - progress) < BEZIER_EPSILON) {
        break;
      }

      if (x < progress) {
        low = t;
      } else {
        high = t;
      }

      t = (low + high) / 2;
    }

    return bezierAxis(y1, y2, t);
  };

const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

/**
 * Value of a keyframe track at `progress` (0 to 1). The easing applies
 * to each interval between keyframes, as the single `ease` does.
 */
const sample = (
  frames: readonly number[],
  times: readonly number[],
  ease: (value: number) => number,
  progress: number
) => {
  const last = frames.length - 1;

  if (progress >= 1 || last === 0) {
    return frames[last];
  }

  let index = 0;

  while (index < last - 1 && progress >= times[index + 1]) {
    index += 1;
  }

  const span = times[index + 1] - times[index];
  const local = span === 0 ? 1 : (progress - times[index]) / span;

  return lerp(frames[index], frames[index + 1], ease(local));
};

const NUMBER = /-?\d+(?:\.\d+)?/gu;

interface ParsedPath {
  numbers: number[];
  template: string[];
}

const parsePath = (d: string): ParsedPath => ({
  numbers: (d.match(NUMBER) ?? []).map(Number),
  template: d.split(NUMBER),
});

const formatPath = ({ template }: ParsedPath, values: readonly number[]) => {
  const [first] = template;
  let out = first;

  for (const [index, value] of values.entries()) {
    out += `${value.toFixed(4)}${template[index + 1]}`;
  }

  return out;
};

const PARSED = {
  collapsed: VOICE_COLLAPSED.map(parsePath),
  lines: VOICE_SEND_LINES.map(parsePath),
  send: MORPH_PATHS.send.map(parsePath),
  stop: MORPH_PATHS.stop.map(parsePath),
  voice: MORPH_PATHS.voice.map(parsePath),
};

const targetPaths = (state: ComposerMorphState) => PARSED[state];

/** The svg's transform is a class that reads these three custom properties. */
type MorphVariables = CSSProperties & Record<`--morph-${string}`, string>;

const transformVariables = (value: Transform): MorphVariables => ({
  "--morph-rotate": `${value.rotate}deg`,
  "--morph-scale": `${value.scale}`,
  "--morph-y": `${value.y}px`,
});

/* ---------------------------------------------------------------- reduced motion */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The host's `data-ck-reduced-motion` ("true" reduces, any other value does not) or, unset, the media query. */
const readReducedMotion = () => {
  const attribute = document.documentElement.dataset.ckReducedMotion;

  return attribute === undefined
    ? (window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false)
    : attribute === "true";
};

const subscribeReducedMotion = (notify: () => void) => {
  const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
  const observer = new MutationObserver(notify);

  observer.observe(document.documentElement, {
    attributeFilter: ["data-ck-reduced-motion"],
    attributes: true,
  });
  query?.addEventListener("change", notify);

  return () => {
    observer.disconnect();
    query?.removeEventListener("change", notify);
  };
};

const useReducedMotion = () =>
  useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);

/* ---------------------------------------------------------------- component */

const MS_PER_SECOND = 1000;
const PATH_COUNT = 4;

interface ComposerMorphIconProps {
  className?: string;
  isLoading?: boolean;
  state: ComposerMorphState;
}

interface Pose {
  paths: number[][];
  transform: Transform;
}

const restingPose = (state: ComposerMorphState): Pose => ({
  paths: targetPaths(state).map((path) => [...path.numbers]),
  transform: {
    ...(state === "stop" ? MORPH_TRANSITIONS.toStop.rest : REST),
  },
});

/**
 * The icon rests on the shape of `state`. When `state`
 * changes it plays the transition for that change and ends on the new shape.
 * Reduced motion jumps to the new shape without animating.
 */
const ComposerMorphIcon = ({
  className,
  isLoading = false,
  state,
}: ComposerMorphIconProps) => {
  const svg = useRef<SVGSVGElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const pose = useRef<Pose>(restingPose(state));
  const previous = useRef(state);
  const frame = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (previous.current === state) {
      return;
    }

    const from = previous.current;
    previous.current = state;

    const draw = () => {
      const { current } = pose;

      svg.current?.style.setProperty(
        "--morph-rotate",
        `${current.transform.rotate}deg`
      );
      svg.current?.style.setProperty(
        "--morph-scale",
        `${current.transform.scale}`
      );
      svg.current?.style.setProperty("--morph-y", `${current.transform.y}px`);

      for (let index = 0; index < PATH_COUNT; index += 1) {
        paths.current[index]?.setAttribute(
          "d",
          formatPath(targetPaths(state)[index], current.paths[index])
        );
      }
    };

    if (frame.current !== undefined) {
      cancelAnimationFrame(frame.current);
    }

    const end = restingPose(state);

    if (reducedMotion) {
      pose.current = end;
      draw();

      return;
    }

    const { involvesVoice, name } = transitionFor(state, from);
    const spec = MORPH_TRANSITIONS[name];

    const start: Pose = {
      paths: pose.current.paths.map((numbers) => [...numbers]),
      transform: { ...pose.current.transform },
    };

    const targets = end.paths;

    const middles = involvesVoice
      ? (state === "voice"
          ? [PARSED.lines, PARSED.collapsed]
          : [PARSED.collapsed, PARSED.lines]
        ).map((set) => set.map((path) => path.numbers))
      : [];

    const ease = cubicBezier(EASE);
    const transformDuration = spec.transformTransition.duration * MS_PER_SECOND;
    const pathDuration = spec.pathTransition.duration * MS_PER_SECOND;

    const pathDelay =
      ("delay" in spec.pathTransition ? spec.pathTransition.delay : 0) *
      MS_PER_SECOND;

    const startedAt = performance.now();

    const step = (now: number) => {
      const elapsed = now - startedAt;
      const transformProgress = Math.min(1, elapsed / transformDuration);

      const pathProgress = Math.min(
        1,
        Math.max(0, (elapsed - pathDelay) / pathDuration)
      );

      pose.current = {
        paths: targets.map((target, pathIndex) =>
          target.map((value, numberIndex) =>
            sample(
              [
                start.paths[pathIndex][numberIndex],
                ...middles.map((set) => set[pathIndex][numberIndex]),
                value,
              ],
              spec.pathTransition.times,
              ease,
              pathProgress
            )
          )
        ),
        transform: {
          rotate: sample(
            [start.transform.rotate, ...spec.transform.rotate],
            "rotateTimes" in spec.transformTransition
              ? spec.transformTransition.rotateTimes
              : spec.transformTransition.times,
            ease,
            transformProgress
          ),
          scale: sample(
            [start.transform.scale, ...spec.transform.scale],
            spec.transformTransition.times,
            ease,
            transformProgress
          ),
          y: sample(
            [start.transform.y, ...spec.transform.y],
            spec.transformTransition.times,
            ease,
            transformProgress
          ),
        },
      };
      draw();

      frame.current =
        transformProgress < 1 || pathProgress < 1
          ? requestAnimationFrame(step)
          : undefined;
    };

    frame.current = requestAnimationFrame(step);
  }, [reducedMotion, state]);

  useEffect(
    () => () => {
      if (frame.current !== undefined) {
        cancelAnimationFrame(frame.current);
      }
    },
    []
  );

  const initial = restingPose(state);

  return (
    <svg
      ref={svg}
      aria-hidden="true"
      className={cn(
        styles.morphIcon,
        isLoading && !reducedMotion && "animate-pulse",
        className
      )}
      fill="currentColor"
      focusable="false"
      style={transformVariables(initial.transform)}
      viewBox="0 0 20 20"
    >
      {targetPaths(state).map((path, index) => (
        <path
          // oxlint-disable-next-line react/no-array-index-key -- the four paths are fixed slots the animation reuses across shapes
          key={index}
          ref={(node) => {
            paths.current[index] = node;
          }}
          d={formatPath(path, path.numbers)}
        />
      ))}
    </svg>
  );
};

export { ComposerMorphIcon, MORPH_TRANSITIONS, sample, transitionFor };

export type { ComposerMorphIconProps, MorphTransitionName };
