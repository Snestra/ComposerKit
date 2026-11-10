/*
 * When the pointer leaves the trigger or content, the popover stays open
 * while the pointer moves through the convex hull of the exit point and the
 * other element's box.
 */

export interface Point {
  x: number;
  y: number;
}

type Side = "bottom" | "left" | "right" | "top";

const EXIT_PADDING = 5;

/** The side of the box nearest to the point. */
const nearestSide = (point: Point, rect: DOMRect): Side => {
  const top = Math.abs(rect.top - point.y);
  const bottom = Math.abs(rect.bottom - point.y);
  const right = Math.abs(rect.right - point.x);
  const left = Math.abs(rect.left - point.x);
  const nearest = Math.min(top, bottom, right, left);

  if (nearest === left) {
    return "left";
  }

  if (nearest === right) {
    return "right";
  }

  return nearest === top ? "top" : "bottom";
};

/** Two points padded around the exit point, on the far side. */
const exitPoints = (point: Point, side: Side): Point[] => {
  switch (side) {
    case "top": {
      return [
        { x: point.x - EXIT_PADDING, y: point.y + EXIT_PADDING },
        { x: point.x + EXIT_PADDING, y: point.y + EXIT_PADDING },
      ];
    }

    case "bottom": {
      return [
        { x: point.x - EXIT_PADDING, y: point.y - EXIT_PADDING },
        { x: point.x + EXIT_PADDING, y: point.y - EXIT_PADDING },
      ];
    }

    case "left": {
      return [
        { x: point.x + EXIT_PADDING, y: point.y - EXIT_PADDING },
        { x: point.x + EXIT_PADDING, y: point.y + EXIT_PADDING },
      ];
    }

    case "right": {
      return [
        { x: point.x - EXIT_PADDING, y: point.y - EXIT_PADDING },
        { x: point.x - EXIT_PADDING, y: point.y + EXIT_PADDING },
      ];
    }

    default: {
      return [];
    }
  }
};

/** The four corners of a box. */
const cornerPoints = ({ top, right, bottom, left }: DOMRect): Point[] => [
  { x: left, y: top },
  { x: right, y: top },
  { x: right, y: bottom },
  { x: left, y: bottom },
];

/** Whether the point lies inside the polygon (ray casting). */
export const isPointInPolygon = (
  { x, y }: Point,
  polygon: readonly Point[]
): boolean => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const current = polygon[i];
    const previous = polygon[j];

    if (
      current !== undefined &&
      previous !== undefined &&
      current.y > y !== previous.y > y &&
      x <
        ((previous.x - current.x) * (y - current.y)) /
          (previous.y - current.y) +
          current.x
    ) {
      inside = !inside;
    }
  }

  return inside;
};

const crossBelow = (a: Point, b: Point, c: Point) =>
  (a.x - b.x) * (c.y - b.y) >= (a.y - b.y) * (c.x - b.x);

/** Andrew's monotone chain over points sorted by x then y. */
const monotoneChain = (points: readonly Point[]): Point[] => {
  if (points.length <= 1) {
    return [...points];
  }

  const upper: Point[] = [];

  for (const point of points) {
    while (upper.length >= 2) {
      const last = upper.at(-1);
      const beforeLast = upper.at(-2);

      if (
        last !== undefined &&
        beforeLast !== undefined &&
        crossBelow(last, beforeLast, point)
      ) {
        upper.pop();
      } else {
        break;
      }
    }

    upper.push(point);
  }

  upper.pop();

  const lower: Point[] = [];

  for (const point of points.toReversed()) {
    while (lower.length >= 2) {
      const last = lower.at(-1);
      const beforeLast = lower.at(-2);

      if (
        last !== undefined &&
        beforeLast !== undefined &&
        crossBelow(last, beforeLast, point)
      ) {
        lower.pop();
      } else {
        break;
      }
    }

    lower.push(point);
  }

  lower.pop();

  const [onlyUpper] = upper;
  const [onlyLower] = lower;

  if (
    upper.length === 1 &&
    lower.length === 1 &&
    onlyUpper !== undefined &&
    onlyLower !== undefined &&
    onlyUpper.x === onlyLower.x &&
    onlyUpper.y === onlyLower.y
  ) {
    return upper;
  }

  return [...upper, ...lower];
};

/** The convex hull of the points. */
const convexHull = (points: readonly Point[]): Point[] =>
  monotoneChain(
    points.toSorted((a, b) => {
      if (a.x !== b.x) {
        return a.x < b.x ? -1 : 1;
      }

      if (a.y === b.y) {
        return 0;
      }

      return a.y < b.y ? -1 : 1;
    })
  );

/**
 * The grace area when the pointer leaves `from` toward `to`, the
 * hull of the padded exit points and the box of `to`.
 */
export const graceArea = (event: PointerEvent, from: Element, to: Element) => {
  const point = { x: event.clientX, y: event.clientY };

  const exit = exitPoints(
    point,
    nearestSide(point, from.getBoundingClientRect())
  );

  return convexHull([...exit, ...cornerPoints(to.getBoundingClientRect())]);
};
