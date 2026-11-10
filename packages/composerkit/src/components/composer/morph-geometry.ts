/*
 * Path geometry of the morphing send, stop and voice icon. Every shape is four closed paths of the
 * same command structure (one move and eight cubic curves each), so any two
 * shapes can be blended number by number. All coordinates are in a 20 by 20
 * viewBox.
 */

type Point = readonly [number, number];

type ComposerMorphState = "send" | "stop" | "voice";

/** The point `amount` of the way from `from` to `to`. */
const between = (from: Point, to: Point, amount: number): Point => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
];

const CIRCLE_HANDLE = (4 * (Math.SQRT2 - 1)) / 3;
const PATH_PRECISION = 3;
const VOICE_SCALE = 1.18;

/** Where a rounded corner starts and ends along its two edges. */
const corner = (
  previous: Point,
  vertex: Point,
  next: Point,
  radius: number
) => ({
  after: between(
    vertex,
    next,
    radius === 0
      ? 0
      : Math.min(
          0.5,
          radius / Math.hypot(next[0] - vertex[0], next[1] - vertex[1])
        )
  ),
  before: between(
    vertex,
    previous,
    radius === 0
      ? 0
      : Math.min(
          0.5,
          radius / Math.hypot(previous[0] - vertex[0], previous[1] - vertex[1])
        )
  ),
  vertex,
});

const fixed = (value: number) =>
  String(Number(value.toPrecision(PATH_PRECISION)));

/** A quadrilateral with rounded corners as one closed cubic path. */
const roundedQuad = (
  [first, second, third, fourth]: readonly [Point, Point, Point, Point],
  radius: number
) => {
  const corners = [
    corner(fourth, first, second, radius),
    corner(first, second, third, radius),
    corner(second, third, fourth, radius),
    corner(third, fourth, first, radius),
  ];

  const curves = corners.flatMap(({ after, before, vertex }) => [
    [before, before, before],
    [
      between(before, vertex, CIRCLE_HANDLE),
      between(after, vertex, CIRCLE_HANDLE),
      after,
    ],
  ]);

  const [startX, startY] = corners[3].after;

  return `M${fixed(startX)} ${fixed(startY)} ${curves
    .map((curve) => `C${curve.flat().map(fixed).join(" ")}`)
    .join(" ")} Z`;
};

/** A rounded rectangle. */
const roundedRect = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) =>
  roundedQuad(
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ],
    radius
  );

/** A line with the given thickness and half-thickness corner radius. */
const capsule = (start: Point, end: Point, thickness: number) => {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);

  const side: Point = [
    (((end[1] - start[1]) / length) * thickness) / 2,
    (((start[0] - end[0]) / length) * thickness) / 2,
  ];

  const along: Point = [-side[1], side[0]];

  return roundedQuad(
    [
      [start[0] - side[0] - along[0], start[1] - side[1] - along[1]],
      [start[0] + side[0] - along[0], start[1] + side[1] - along[1]],
      [end[0] + side[0] + along[0], end[1] + side[1] + along[1]],
      [end[0] - side[0] + along[0], end[1] - side[1] + along[1]],
    ],
    thickness / 2
  );
};

/** Scale bar offsets around the center of the 20 by 20 viewBox. */
const bars = (
  scale: number,
  thickness: number,
  rows: readonly (readonly [number, number, number])[]
) =>
  rows.map(([x, y1, y2]) =>
    capsule(
      [10 + x * scale, 10 + y1 * scale],
      [10 + x * scale, 10 + y2 * scale],
      thickness * scale
    )
  );

/** A zero-size shape at the centre, the resting place of an unused path. */
const UNUSED_PATH = roundedRect(10, 10, 0, 0, 0);

const MORPH_PATHS = {
  send: [
    capsule([10, 4.6], [10, 16.7], 1.4),
    capsule([4.17, 9.17], [10, 3.33], 1.4),
    capsule([10, 3.33], [15.8, 9.17], 1.4),
    UNUSED_PATH,
  ],
  stop: [
    roundedRect(4.7, 4.7, 10.6, 10.6, 1.2),
    UNUSED_PATH,
    UNUSED_PATH,
    UNUSED_PATH,
  ],
  voice: bars(VOICE_SCALE, 1.4, [
    [-1.6, -5.2, 5.2],
    [-4.8, 1.8, -1.8],
    [1.6, -3.2, 3.2],
    [4.8, -1.3, 1.3],
  ]),
} as const satisfies Record<ComposerMorphState, readonly string[]>;

/** The voice bars collapsed to a short column, the middle of a voice morph. */
const VOICE_COLLAPSED = bars(VOICE_SCALE, 1.1, [
  [0, -4.6, 4.6],
  [-2.3, 1.5, -1.5],
  [1.4, -2.6, 2.6],
  [2.6, -1.05, 1.05],
]);

/** The send shapes drawn as one vertical line each, the other middle of a voice morph. */
const VOICE_SEND_LINES = [
  capsule([10, 3.33], [10, 16.7], 1.4),
  capsule([10, 9.17], [10, 3.33], 1.4),
  capsule([10, 3.33], [10, 9.17], 1.4),
  UNUSED_PATH,
];

export { UNUSED_PATH, MORPH_PATHS, VOICE_COLLAPSED, VOICE_SEND_LINES };

export type { ComposerMorphState };
