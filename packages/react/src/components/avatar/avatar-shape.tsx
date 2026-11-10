"use client";

/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The public names are shape, animateShape and AvatarShape. */

import { useReducedMotion } from "@workspace/react/lib/reduced-motion";
import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

type CustomProperties = CSSProperties & Record<`--${string}`, number | string>;

export type AvatarShapeName =
  | "blossom"
  | "circle"
  | "oval"
  | "scalloped"
  | "square";

// The outline of each avatar shape.
const shapes = {
  blossom: {
    path: "M27.8 0C32.3 0 36.3 1.8 39.3 4.8C40.6 4.4 42.1 4.2 43.5 4.2C52.5 4.2 59.8 11.5 59.8 20.5C59.8 21.9 59.6 23.4 59.2 24.7C62.2 27.7 64 31.7 64 36.2C64 43.7 58.9 50.1 51.9 51.9C50.1 58.9 43.7 64 36.2 64C31.7 64 27.7 62.2 24.7 59.2C23.4 59.6 21.9 59.8 20.5 59.8C11.5 59.8 4.2 52.5 4.2 43.5C4.2 42.1 4.4 40.6 4.8 39.3C1.8 36.3 0 32.3 0 27.8C0 20.3 5.1 13.9 12.1 12.1C13.9 5.1 20.3 0 27.8 0Z",
    transform: "matrix(0.015625 0 0 0.015625 0 0)",
  },
  circle: {
    path: "M.5 0 A.5 .5 0 1 1 .5 1 A.5 .5 0 1 1 .5 0 Z",
    transform: "matrix(1 0 0 1 0 0)",
  },
  oval: {
    path: "M.5 0 A.42 .5 0 1 1 .5 1 A.42 .5 0 1 1 .5 0 Z",
    transform: "matrix(1 0 0 1 0 0)",
  },
  scalloped: {
    path: "M26.5 0C28.7 0 30.6 1.4 31.3 3.3C32.2 2.5 33.4 2 34.7 2C37.5 2 39.8 4.4 39.8 7.2C39.8 7.6 39.8 7.9 39.7 8.2C40.3 8 41 7.9 41.7 7.9C44.5 7.9 46.8 10.2 46.8 13C46.8 14.4 46.2 15.7 45.3 16.7C45.6 16.6 46 16.6 46.3 16.6C49.1 16.6 51.4 18.9 51.4 21.7C51.4 24.2 49.8 26.2 47.5 26.7C47.5 26.8 47.5 26.8 47.5 26.9C47.7 26.8 47.8 26.8 47.9 26.8C50.8 26.8 53.1 29.2 53.1 32C53.1 34.8 50.8 37.2 47.9 37.2C47.8 37.2 47.7 37.2 47.5 37.1C47.5 37.2 47.5 37.2 47.5 37.3C49.8 37.8 51.4 39.8 51.4 42.3C51.4 45.1 49.1 47.4 46.3 47.4C46 47.4 45.6 47.4 45.3 47.3L45.3 47.3C46.2 48.3 46.8 49.6 46.8 51C46.8 53.8 44.5 56.1 41.7 56.1C41 56.1 40.3 56 39.7 55.8C39.8 56.1 39.8 56.4 39.8 56.8C39.8 59.6 37.6 62 34.7 62C33.4 62 32.2 61.5 31.3 60.7C30.6 62.6 28.7 64 26.5 64C24.3 64 22.5 62.6 21.7 60.7C20.8 61.5 19.6 62 18.3 62C15.5 62 13.2 59.6 13.2 56.8C13.2 56.4 13.3 56.1 13.3 55.8C12.7 56 12.1 56.1 11.4 56.1C8.6 56.1 6.3 53.8 6.3 51C6.3 49.6 6.8 48.3 7.8 47.3C7.4 47.4 7.1 47.4 6.7 47.4C3.9 47.4 1.6 45.1 1.6 42.3C1.6 39.8 3.3 37.8 5.5 37.3C5.5 37.2 5.5 37.2 5.5 37.1C5.4 37.2 5.2 37.2 5.1 37.2C2.3 37.2 0 34.8 0 32C0 29.2 2.3 26.8 5.1 26.8C5.2 26.8 5.4 26.8 5.5 26.9C5.5 26.8 5.5 26.8 5.5 26.7C3.3 26.2 1.6 24.2 1.6 21.7C1.6 18.9 3.9 16.6 6.7 16.6C7.1 16.6 7.4 16.6 7.8 16.7C6.8 15.7 6.3 14.4 6.3 13C6.3 10.2 8.6 7.9 11.4 7.9C12.1 7.9 12.7 8 13.3 8.2C13.3 7.9 13.2 7.6 13.2 7.2C13.2 4.4 15.5 2 18.3 2C19.6 2 20.8 2.5 21.7 3.3C22.5 1.4 24.3 0 26.5 0Z",
    transform: "matrix(0.015625 0 0 0.015625 0.0852 0)",
  },
  square: {
    path: "M.28 0 H.72 A.28 .28 0 0 1 1 .28 V.72 A.28 .28 0 0 1 .72 1 H.28 A.28 .28 0 0 1 0 .72 V.28 A.28 .28 0 0 1 .28 0 Z",
    transform: "matrix(1 0 0 1 0 0)",
  },
} as const;

type Point = readonly [number, number];

interface MotionControls {
  stop: () => void;
}

const RAY_COUNT = 320;
const PATH_SAMPLE_COUNT = 1280;
const MORPH_DURATION_MS = 300;
const SPIN_DELAY_MS = 960;
const FULL_TURN_DEGREES = 360;
const MILLISECONDS_PER_SECOND = 1000;
const SPRING_STIFFNESS = 66;
const SPRING_DAMPING = 13;
const SPRING_MASS = 1;
const SPRING_REST_DELTA = 0.05;
const SPRING_REST_SPEED = 1;
const SPRING_VELOCITY_SAMPLE_SECONDS = 0.006;
const CENTER = 0.5;

const sampleCache = new Map<AvatarShapeName, Point[]>();

// Sample the outline, then cast RAY_COUNT rays from the
// centre and keep the farthest hit, so every shape has the same point count.
const sampleShape = (name: AvatarShapeName): Point[] => {
  const cached = sampleCache.get(name);

  if (cached !== undefined) {
    return cached;
  }

  const shape = shapes[name];
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  path.setAttribute("d", shape.path);

  const matrix = new DOMMatrix(shape.transform.replaceAll(" ", ", "));
  const length = path.getTotalLength();

  const outline = Array.from({ length: PATH_SAMPLE_COUNT }, (_, index) => {
    const point = matrix.transformPoint(
      path.getPointAtLength((length * index) / PATH_SAMPLE_COUNT)
    );

    return [point.x, point.y] as const;
  });

  const rays = Array.from({ length: RAY_COUNT }, (_, index) => {
    const angle = (index / RAY_COUNT) * Math.PI * 2 - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let reach = 0;

    for (const [edgeIndex, start] of outline.entries()) {
      const end = outline[(edgeIndex + 1) % outline.length];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const cross = cos * dy - sin * dx;

      if (Math.abs(cross) < 1e-10) {
        continue;
      }

      const offsetX = start[0] - CENTER;
      const offsetY = start[1] - CENTER;
      const distance = (offsetX * dy - offsetY * dx) / cross;
      const along = (offsetX * sin - offsetY * cos) / cross;

      if (distance >= 0 && along >= 0 && along <= 1) {
        reach = Math.max(reach, distance);
      }
    }

    return [CENTER + cos * reach, CENTER + sin * reach] as const;
  });

  sampleCache.set(name, rays);

  return rays;
};

const toPolygonPath = (points: readonly Point[]) =>
  `${points
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(5)} ${y.toFixed(5)}`
    )
    .join("")}Z`;

const wave = (value: number) =>
  1 -
  Math.exp(-7.6 * value) *
    (Math.cos(9.5 * value) + 0.72 * Math.sin(9.5 * value));

// A damped oscillation normalised to end at 1.
const morphEase = (progress: number) => wave(progress) / wave(1);

const runTween = ({
  duration,
  ease,
  onComplete,
  onUpdate,
}: {
  duration: number;
  ease: (progress: number) => number;
  onComplete: () => void;
  onUpdate: (value: number) => void;
}): MotionControls => {
  let frame = 0;
  let startedAt: number | null = null;

  const tick = (now: number) => {
    startedAt ??= now;

    const progress = Math.min((now - startedAt) / duration, 1);

    onUpdate(ease(progress));

    if (progress >= 1) {
      onComplete();

      return;
    }

    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return {
    stop: () => {
      cancelAnimationFrame(frame);
    },
  };
};

// Solve the underdamped spring from rest and stop at the speed and distance limits.
const runSpin = ({
  onComplete,
  onUpdate,
}: {
  onComplete: () => void;
  onUpdate: (value: number) => void;
}): MotionControls => {
  const target = FULL_TURN_DEGREES;
  const naturalFrequency = Math.sqrt(SPRING_STIFFNESS / SPRING_MASS);

  const dampingRatio =
    SPRING_DAMPING / (2 * Math.sqrt(SPRING_STIFFNESS * SPRING_MASS));

  const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio ** 2);

  const valueAt = (seconds: number) =>
    target -
    Math.exp(-dampingRatio * naturalFrequency * seconds) *
      (((dampingRatio * naturalFrequency * target) / dampedFrequency) *
        Math.sin(dampedFrequency * seconds) +
        target * Math.cos(dampedFrequency * seconds));

  let frame = 0;
  let startedAt: number | null = null;

  const tick = (now: number) => {
    startedAt ??= now;

    const seconds = (now - startedAt) / MILLISECONDS_PER_SECOND;
    const value = valueAt(seconds);

    const velocity =
      (value - valueAt(Math.max(0, seconds - SPRING_VELOCITY_SAMPLE_SECONDS))) /
      SPRING_VELOCITY_SAMPLE_SECONDS;

    const settled =
      Math.abs(velocity) <= SPRING_REST_SPEED &&
      Math.abs(target - value) <= SPRING_REST_DELTA;

    onUpdate(settled ? target : value);

    if (settled) {
      onComplete();

      return;
    }

    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return {
    stop: () => {
      cancelAnimationFrame(frame);
    },
  };
};

export interface AvatarShapeProps {
  /** Morph between outlines over 300ms when `shape` changes. */
  animateShape?: boolean;
  children?: ReactNode;
  /** After 960ms of hover, the blossom outline turns once. Needs `animateShape`. */
  hovered?: boolean;
  shape: AvatarShapeName;
}

/**
 * Clips its children to a named outline with an objectBoundingBox clip path.
 */
export const AvatarShape = ({
  animateShape = false,
  children,
  hovered = false,
  shape,
}: AvatarShapeProps) => {
  const clipId = useId();
  const reducedMotion = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const previousShape = useRef(shape);
  const morphPoints = useRef<Point[] | null>(null);
  const spin = useRef<MotionControls | null>(null);

  const clipStyle: CustomProperties = {
    "--avatar-clip-path": `url(#${clipId})`,
  };

  useLayoutEffect(() => {
    const path = pathRef.current;
    const previous = previousShape.current;

    previousShape.current = shape;
    spin.current?.stop();
    spin.current = null;
    path?.setAttribute("transform", shapes[shape].transform);

    const settle = () => {
      path?.setAttribute("d", shapes[shape].path);
      path?.setAttribute("transform", shapes[shape].transform);
      morphPoints.current = null;
    };

    const morphs =
      path !== null &&
      animateShape &&
      !reducedMotion &&
      (previous !== shape || morphPoints.current !== null);

    let morph: MotionControls | null = null;

    if (morphs) {
      const from = morphPoints.current ?? sampleShape(previous);
      const to = sampleShape(shape);

      path.removeAttribute("transform");
      path.setAttribute("d", toPolygonPath(from));
      morph = runTween({
        duration: MORPH_DURATION_MS,
        ease: morphEase,
        onComplete: settle,
        onUpdate: (progress) => {
          const next = from.map(
            (point, index) =>
              [
                point[0] + (to[index][0] - point[0]) * progress,
                point[1] + (to[index][1] - point[1]) * progress,
              ] as const
          );

          morphPoints.current = next;
          path.setAttribute("d", toPolygonPath(next));
        },
      });
    } else {
      settle();
    }

    return () => {
      morph?.stop();
    };
  }, [shape, animateShape, reducedMotion]);

  useEffect(
    () => () => {
      spin.current?.stop();
    },
    []
  );

  useEffect(() => {
    const spins =
      hovered && animateShape && !reducedMotion && shape === "blossom";

    const timer = spins
      ? setTimeout(() => {
          // oxlint-disable-next-line eslint/logical-assignment-operators -- React Compiler does not support ??=.
          spin.current =
            spin.current ??
            runSpin({
              onComplete: () => {
                pathRef.current?.setAttribute(
                  "transform",
                  shapes[shape].transform
                );
                spin.current = null;
              },
              onUpdate: (degrees) => {
                pathRef.current?.setAttribute(
                  "transform",
                  `rotate(${degrees} .5 .5) ${shapes[shape].transform}`
                );
              },
            });
        }, SPIN_DELAY_MS)
      : undefined;

    return () => {
      clearTimeout(timer);
    };
  }, [hovered, animateShape, reducedMotion, shape]);

  return (
    <span className="relative inline-flex shrink-0">
      <svg aria-hidden="true" className="absolute size-0" focusable="false">
        <defs>
          <clipPath clipPathUnits="objectBoundingBox" id={clipId}>
            <path
              d={shapes[shape].path}
              ref={pathRef}
              transform={shapes[shape].transform}
            />
          </clipPath>
        </defs>
      </svg>
      <span
        className="relative inline-flex [clip-path:var(--avatar-clip-path)]"
        style={clipStyle}
      >
        {children}
      </span>
    </span>
  );
};
