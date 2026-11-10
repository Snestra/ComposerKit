/* eslint-disable eslint/no-bitwise */

// Based on the node-qrcode `create` encoder (MIT). Kanji mode is left out
// because no SJIS converter is registered.

export const EC_LEVELS = {
  H: { bit: 2, index: 3 },
  L: { bit: 1, index: 0 },
  M: { bit: 0, index: 1 },
  Q: { bit: 3, index: 2 },
} as const;

export type EcLevel = keyof typeof EC_LEVELS;

export class BitMatrix {
  readonly size: number;
  readonly data: Uint8Array;
  readonly reservedBit: Uint8Array;

  constructor(size: number) {
    if (Number.isNaN(size) || size < 1) {
      throw new Error("BitMatrix size must be defined and greater than 0");
    }

    this.size = size;
    this.data = new Uint8Array(size * size);
    this.reservedBit = new Uint8Array(size * size);
  }

  set(row: number, col: number, value: boolean | number, reserved?: boolean) {
    const index = row * this.size + col;
    this.data[index] = Number(value);

    if (reserved === true) {
      this.reservedBit[index] = 1;
    }
  }

  get(row: number, col: number) {
    return this.data[row * this.size + col];
  }

  xor(row: number, col: number, value: number) {
    this.data[row * this.size + col] ^= value;
  }

  isReserved(row: number, col: number) {
    return this.reservedBit[row * this.size + col];
  }
}

const TOTAL_CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655,
  733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921,
  2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

const EC_BLOCKS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4,
  6, 5, 2, 4, 6, 6, 2, 5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4, 8, 10, 11, 4, 9, 12,
  16, 4, 9, 16, 16, 6, 10, 12, 18, 6, 10, 17, 16, 6, 11, 16, 19, 6, 13, 18, 21,
  7, 14, 21, 25, 8, 16, 20, 25, 8, 17, 23, 25, 9, 17, 23, 34, 9, 18, 25, 30, 10,
  20, 27, 32, 12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34, 40, 13, 26, 35, 42,
  14, 28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51, 17, 33, 45, 54, 18, 35, 48,
  57, 19, 37, 51, 60, 19, 38, 53, 63, 20, 40, 56, 66, 21, 43, 59, 70, 22, 45,
  62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
];

const EC_CODEWORDS = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26, 48, 72, 88,
  36, 64, 96, 112, 40, 72, 108, 130, 48, 88, 132, 156, 60, 110, 160, 192, 72,
  130, 192, 224, 80, 150, 224, 264, 96, 176, 260, 308, 104, 198, 288, 352, 120,
  216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480, 168, 308, 448, 532,
  180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700, 224, 442, 644,
  750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960, 312, 588,
  870, 1050, 336, 644, 952, 1110, 360, 700, 1020, 1200, 390, 728, 1050, 1260,
  420, 784, 1140, 1350, 450, 812, 1200, 1440, 480, 868, 1290, 1530, 510, 924,
  1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530, 1800, 570, 1064, 1590,
  1890, 600, 1120, 1680, 1980, 630, 1204, 1770, 2100, 660, 1260, 1860, 2220,
  720, 1316, 1950, 2310, 750, 1372, 2040, 2430,
];

const MAX_VERSION = 40;
const FINDER_SIZE = 7;
const VERSION_BCH = 7973;
const FORMAT_BCH = 1335;
const FORMAT_MASK = 21_522;
const MASK_PATTERN_COUNT = 8;

export const getSymbolSize = (version: number) => version * 4 + 17;

export const getBlocksCount = (version: number, level: EcLevel) =>
  EC_BLOCKS[(version - 1) * 4 + EC_LEVELS[level].index];

export const getEcCodewordsCount = (version: number, level: EcLevel) =>
  EC_CODEWORDS[(version - 1) * 4 + EC_LEVELS[level].index];

export const getAlignmentCoordinates = (version: number) => {
  if (version === 1) {
    return [];
  }

  const count = Math.floor(version / 7) + 2;
  const size = getSymbolSize(version);
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const coordinates = [size - 7];

  for (let index = 1; index < count - 1; index += 1) {
    coordinates[index] = coordinates[index - 1] - step;
  }

  coordinates.push(6);

  return coordinates.toReversed();
};

const getAlignmentPositions = (version: number) => {
  const coordinates = getAlignmentCoordinates(version);
  const last = coordinates.length - 1;
  const positions: [number, number][] = [];

  for (const [row, rowValue] of coordinates.entries()) {
    for (const [col, colValue] of coordinates.entries()) {
      const onFinder =
        (row === 0 && col === 0) ||
        (row === 0 && col === last) ||
        (row === last && col === 0);

      if (!onFinder) {
        positions.push([rowValue, colValue]);
      }
    }
  }

  return positions;
};

const bchDigit = (value: number) => {
  let digit = 0;
  let rest = value;

  while (rest !== 0) {
    digit += 1;
    rest >>>= 1;
  }

  return digit;
};

const bchEncode = (data: number, polynomial: number) => {
  const polynomialDigit = bchDigit(polynomial);
  let remainder = data;

  while (bchDigit(remainder) - polynomialDigit >= 0) {
    remainder ^= polynomial << (bchDigit(remainder) - polynomialDigit);
  }

  return remainder;
};

const getVersionBits = (version: number) =>
  (version << 12) | bchEncode(version << 12, VERSION_BCH);

const getFormatBits = (level: EcLevel, mask: number) => {
  const data = (EC_LEVELS[level].bit << 3) | mask;

  return ((data << 10) | bchEncode(data << 10, FORMAT_BCH)) ^ FORMAT_MASK;
};

interface BitBuffer {
  readonly buffer: number[];
  length: number;
  put: (value: number, length: number) => void;
  putBit: (bit: boolean) => void;
}

const createBitBuffer = (): BitBuffer => {
  const bits: BitBuffer = {
    buffer: [],
    length: 0,
    put: (value, length) => {
      for (let index = 0; index < length; index += 1) {
        bits.putBit(((value >>> (length - index - 1)) & 1) === 1);
      }
    },
    putBit: (bit) => {
      const byteIndex = Math.floor(bits.length / 8);

      if (bits.buffer.length <= byteIndex) {
        bits.buffer.push(0);
      }

      if (bit) {
        bits.buffer[byteIndex] |= 128 >>> (bits.length % 8);
      }

      bits.length += 1;
    },
  };

  return bits;
};

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

{
  let value = 1;

  for (let index = 0; index < 255; index += 1) {
    GF_EXP[index] = value;
    GF_LOG[value] = index;
    value <<= 1;

    if (value & 256) {
      value ^= 285;
    }
  }

  for (let index = 255; index < 512; index += 1) {
    GF_EXP[index] = GF_EXP[index - 255];
  }
}

const gfMul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];

const polyMul = (a: Uint8Array, b: Uint8Array) => {
  const result = new Uint8Array(a.length + b.length - 1);

  for (const [i, aValue] of a.entries()) {
    for (const [j, bValue] of b.entries()) {
      result[i + j] ^= gfMul(aValue, bValue);
    }
  }

  return result;
};

const polyMod = (dividend: Uint8Array, divisor: Uint8Array) => {
  let result = new Uint8Array(dividend);

  while (result.length - divisor.length >= 0) {
    const [lead] = result;

    for (const [index, value] of divisor.entries()) {
      result[index] ^= gfMul(value, lead);
    }

    let offset = 0;

    while (offset < result.length && result[offset] === 0) {
      offset += 1;
    }

    result = result.slice(offset);
  }

  return result;
};

const generatorPolynomial = (degree: number) => {
  let poly = new Uint8Array([1]);

  for (let index = 0; index < degree; index += 1) {
    poly = polyMul(poly, new Uint8Array([1, GF_EXP[index]]));
  }

  return poly;
};

const reedSolomonEncode = (data: Uint8Array, degree: number) => {
  const padded = new Uint8Array(data.length + degree);
  padded.set(data);

  const remainder = polyMod(padded, generatorPolynomial(degree));
  const missing = degree - remainder.length;

  if (missing > 0) {
    const result = new Uint8Array(degree);
    result.set(remainder, missing);

    return result;
  }

  return remainder;
};

type ModeId = "numeric" | "alphanumeric" | "byte";

interface Mode {
  readonly bit: number;
  readonly ccBits: readonly [number, number, number];
  readonly id: ModeId;
}

const MODES = {
  alphanumeric: { bit: 2, ccBits: [9, 11, 13], id: "alphanumeric" },
  byte: { bit: 4, ccBits: [8, 16, 16], id: "byte" },
  numeric: { bit: 1, ccBits: [10, 12, 14], id: "numeric" },
} as const satisfies Record<ModeId, Mode>;

const ALPHANUMERIC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

const NUMERIC_PATTERN = /[0-9]+/gu;
const ALPHANUMERIC_PATTERN = /[A-Z $%*+\-./:]+/gu;
const BYTE_PATTERN = /[^A-Z0-9 $%*+\-./:]+/gu;
const NUMERIC_TEST = /^[0-9]+$/u;
const ALPHANUMERIC_TEST = /^[A-Z0-9 $%*+\-./:]+$/u;

const getCharCountBits = (mode: Mode, version: number) => {
  if (version < 10) {
    return mode.ccBits[0];
  }

  return version < 27 ? mode.ccBits[1] : mode.ccBits[2];
};

const getBitsLength = (mode: Mode, length: number) => {
  if (mode.id === "numeric") {
    return (
      10 * Math.floor(length / 3) + (length % 3 ? (length % 3) * 3 + 1 : 0)
    );
  }

  if (mode.id === "alphanumeric") {
    return 11 * Math.floor(length / 2) + (length % 2) * 6;
  }

  return length * 8;
};

const getBestModeForData = (data: string): Mode => {
  if (NUMERIC_TEST.test(data)) {
    return MODES.numeric;
  }

  return ALPHANUMERIC_TEST.test(data) ? MODES.alphanumeric : MODES.byte;
};

interface Segment {
  readonly data: string | Uint8Array;
  readonly length: number;
  readonly mode: Mode;
}

const makeSegment = (data: string, requested: Mode): Segment => {
  const best = getBestModeForData(data);

  if (requested.id !== "byte" && requested.bit < best.bit) {
    throw new Error(
      `"${data}" cannot be encoded with mode ${requested.id}. Suggested mode is: ${best.id}`
    );
  }

  if (requested.id === "byte") {
    const bytes = new TextEncoder().encode(data);

    return { data: bytes, length: bytes.length, mode: MODES.byte };
  }

  return { data, length: data.length, mode: requested };
};

const writeSegment = (segment: Segment, buffer: BitBuffer) => {
  if (segment.data instanceof Uint8Array) {
    for (const byte of segment.data) {
      buffer.put(byte, 8);
    }

    return;
  }

  const { data } = segment;

  if (segment.mode.id === "numeric") {
    let index = 0;

    for (; index + 3 <= data.length; index += 3) {
      buffer.put(Math.trunc(Number(data.slice(index, index + 3))), 10);
    }

    const rest = data.length - index;

    if (rest > 0) {
      buffer.put(Math.trunc(Number(data.slice(index))), rest * 3 + 1);
    }

    return;
  }

  let index = 0;

  for (; index + 2 <= data.length; index += 2) {
    buffer.put(
      ALPHANUMERIC_CHARS.indexOf(data[index]) * 45 +
        ALPHANUMERIC_CHARS.indexOf(data[index + 1]),
      11
    );
  }

  if (data.length % 2) {
    buffer.put(ALPHANUMERIC_CHARS.indexOf(data[index]), 6);
  }
};

const getSegmentBits = (segment: Segment) =>
  getBitsLength(segment.mode, segment.length);

const getMixedCapacity = (version: number, level: EcLevel) =>
  (TOTAL_CODEWORDS[version] - getEcCodewordsCount(version, level)) * 8;

const getCapacity = (version: number, level: EcLevel, mode: Mode) => {
  const available =
    getMixedCapacity(version, level) - (getCharCountBits(mode, version) + 4);

  if (mode.id === "numeric") {
    return Math.floor((available / 10) * 3);
  }

  if (mode.id === "alphanumeric") {
    return Math.floor((available / 11) * 2);
  }

  return Math.floor(available / 8);
};

const getBestVersionForSegments = (
  segments: readonly Segment[],
  level: EcLevel
) => {
  if (segments.length === 0) {
    return 1;
  }

  const fits = (version: number) => {
    if (segments.length === 1) {
      const [segment] = segments;

      return segment.length <= getCapacity(version, level, segment.mode);
    }

    let bits = 0;

    for (const segment of segments) {
      bits +=
        getCharCountBits(segment.mode, version) + 4 + getSegmentBits(segment);
    }

    return bits <= getMixedCapacity(version, level);
  };

  return Array.from({ length: MAX_VERSION }, (_, index) => index + 1).find(
    fits
  );
};

interface RawSegment {
  readonly data: string;
  readonly length: number;
  readonly mode: Mode;
}

const matchAll = (pattern: RegExp, mode: Mode, text: string) =>
  [...text.matchAll(pattern)].map((match) => ({
    data: match[0],
    index: match.index,
    length: match[0].length,
    mode,
  }));

const splitRaw = (text: string): RawSegment[] =>
  [
    ...matchAll(NUMERIC_PATTERN, MODES.numeric, text),
    ...matchAll(ALPHANUMERIC_PATTERN, MODES.alphanumeric, text),
    ...matchAll(BYTE_PATTERN, MODES.byte, text),
  ]
    .toSorted((a, b) => a.index - b.index)
    .map(({ data, length, mode }) => ({ data, length, mode }));

const utf8Length = (text: string) => new TextEncoder().encode(text).length;

const getAlternatives = (segments: readonly RawSegment[]): RawSegment[][] =>
  segments.map((segment) => {
    if (segment.mode.id === "numeric") {
      return [
        segment,
        { ...segment, mode: MODES.alphanumeric },
        { ...segment, mode: MODES.byte },
      ];
    }

    if (segment.mode.id === "alphanumeric") {
      return [segment, { ...segment, mode: MODES.byte }];
    }

    return [
      {
        data: segment.data,
        length: utf8Length(segment.data),
        mode: MODES.byte,
      },
    ];
  });

interface Edges {
  [node: string]: number;
}

interface Graph {
  [node: string]: Edges;
}

const createGraph = (): Graph => ({ start: {} });

const findShortestPath = (graph: Graph, start: string, end: string) => {
  const costs = new Map<string, number>([[start, 0]]);
  const predecessors: Record<string, string> = {};
  let queue: { cost: number; value: string }[] = [{ cost: 0, value: start }];

  while (queue.length > 0) {
    const [current, ...rest] = queue;
    queue = rest;

    const edges = graph[current.value] ?? {};

    for (const next of Object.keys(edges)) {
      const total = current.cost + edges[next];
      const known = costs.get(next);

      if (known === undefined || known > total) {
        costs.set(next, total);
        queue.push({ cost: total, value: next });
        queue.sort((a, b) => a.cost - b.cost);
        predecessors[next] = current.value;
      }
    }
  }

  if (!costs.has(end)) {
    throw new Error(`Could not find a path from ${start} to ${end}.`);
  }

  const path: string[] = [];

  for (let node: string | undefined = end; node; node = predecessors[node]) {
    path.push(node);
  }

  return path.toReversed();
};

const buildGraph = (alternatives: readonly RawSegment[][], version: number) => {
  const table = new Map<string, { lastCount: number; node: RawSegment }>();
  const map = createGraph();
  let previous = ["start"];

  for (const [segmentIndex, options] of alternatives.entries()) {
    const current: string[] = [];

    for (const [optionIndex, node] of options.entries()) {
      const key = `${segmentIndex}${optionIndex}`;
      current.push(key);
      table.set(key, { lastCount: 0, node });
      map[key] = {};

      for (const prior of previous) {
        const prev = table.get(prior);

        if (prev !== undefined && prev.node.mode === node.mode) {
          map[prior][key] =
            getBitsLength(node.mode, prev.lastCount + node.length) -
            getBitsLength(node.mode, prev.lastCount);
          prev.lastCount += node.length;
        } else {
          if (prev !== undefined) {
            prev.lastCount = node.length;
          }

          map[prior][key] =
            getBitsLength(node.mode, node.length) +
            4 +
            getCharCountBits(node.mode, version);
        }
      }
    }

    previous = current;
  }

  for (const key of previous) {
    map[key].end = 0;
  }

  return { map, table };
};

const mergeSegments = (nodes: readonly RawSegment[]) => {
  const merged: { data: string; mode: Mode }[] = [];

  for (const node of nodes) {
    const last = merged.at(-1);

    if (last && last.mode === node.mode) {
      last.data += node.data;
    } else {
      merged.push({ data: node.data, mode: node.mode });
    }
  }

  return merged.map(({ data, mode }) => makeSegment(data, mode));
};

const segmentString = (text: string, version: number) => {
  const { map, table } = buildGraph(getAlternatives(splitRaw(text)), version);
  const path = findShortestPath(map, "start", "end");

  return mergeSegments(
    path.slice(1, -1).flatMap((key) => table.get(key)?.node ?? [])
  );
};

const rawSegments = (text: string) =>
  splitRaw(text).map((segment) => makeSegment(segment.data, segment.mode));

const placeFinderPatterns = (matrix: BitMatrix) => {
  const { size } = matrix;

  for (const [row, col] of [
    [0, 0],
    [size - FINDER_SIZE, 0],
    [0, size - FINDER_SIZE],
  ]) {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || size <= row + r) {
        continue;
      }

      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || size <= col + c) {
          continue;
        }

        const dark =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);

        matrix.set(row + r, col + c, dark, true);
      }
    }
  }
};

const placeTimingPatterns = (matrix: BitMatrix) => {
  for (let index = 8; index < matrix.size - 8; index += 1) {
    const dark = index % 2 === 0;
    matrix.set(index, 6, dark, true);
    matrix.set(6, index, dark, true);
  }
};

const placeAlignmentPatterns = (matrix: BitMatrix, version: number) => {
  for (const [row, col] of getAlignmentPositions(version)) {
    for (let r = -2; r <= 2; r += 1) {
      for (let c = -2; c <= 2; c += 1) {
        const dark =
          r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);

        matrix.set(row + r, col + c, dark, true);
      }
    }
  }
};

const placeVersionInfo = (matrix: BitMatrix, version: number) => {
  const { size } = matrix;
  const bits = getVersionBits(version);

  for (let index = 0; index < 18; index += 1) {
    const row = Math.floor(index / 3);
    const col = (index % 3) + size - 8 - 3;
    const dark = ((bits >> index) & 1) === 1;
    matrix.set(row, col, dark, true);
    matrix.set(col, row, dark, true);
  }
};

const placeFormatInfo = (matrix: BitMatrix, level: EcLevel, mask: number) => {
  const { size } = matrix;
  const bits = getFormatBits(level, mask);

  for (let index = 0; index < 15; index += 1) {
    const dark = ((bits >> index) & 1) === 1;

    if (index < 6) {
      matrix.set(index, 8, dark, true);
    } else if (index < 8) {
      matrix.set(index + 1, 8, dark, true);
    } else {
      matrix.set(size - 15 + index, 8, dark, true);
    }

    if (index < 8) {
      matrix.set(8, size - index - 1, dark, true);
    } else if (index < 9) {
      matrix.set(8, 15 - index - 1 + 1, dark, true);
    } else {
      matrix.set(8, 15 - index - 1, dark, true);
    }
  }

  matrix.set(size - 8, 8, 1, true);
};

const placeData = (matrix: BitMatrix, data: Uint8Array) => {
  const { size } = matrix;
  let direction = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) {
      col -= 1;
    }

    for (;;) {
      for (let offset = 0; offset < 2; offset += 1) {
        if (!matrix.isReserved(row, col - offset)) {
          let dark = false;

          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
          }

          matrix.set(row, col - offset, dark);
          bitIndex -= 1;

          if (bitIndex === -1) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }
      }

      row += direction;

      if (row < 0 || size <= row) {
        row -= direction;
        direction = -direction;
        break;
      }
    }
  }
};

const maskApplies = (pattern: number, row: number, col: number) => {
  switch (pattern) {
    case 0: {
      return (row + col) % 2 === 0;
    }

    case 1: {
      return row % 2 === 0;
    }

    case 2: {
      return col % 3 === 0;
    }

    case 3: {
      return (row + col) % 3 === 0;
    }

    case 4: {
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    }

    case 5: {
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    }

    case 6: {
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    }

    case 7: {
      return (((row * col) % 3) + ((row + col) % 2)) % 2 === 0;
    }

    default: {
      throw new Error(`bad maskPattern:${pattern}`);
    }
  }
};

const applyMask = (pattern: number, matrix: BitMatrix) => {
  const { size } = matrix;

  for (let col = 0; col < size; col += 1) {
    for (let row = 0; row < size; row += 1) {
      if (!matrix.isReserved(row, col)) {
        matrix.xor(row, col, Number(maskApplies(pattern, row, col)));
      }
    }
  }
};

const PENALTY_RUN = 3;
const PENALTY_BLOCK = 3;
const PENALTY_FINDER = 40;
const PENALTY_BALANCE = 10;
const FINDER_LIKE_A = 1488;
const FINDER_LIKE_B = 93;

const penaltyRuns = (matrix: BitMatrix) => {
  const { size } = matrix;
  let penalty = 0;

  for (let a = 0; a < size; a += 1) {
    let rowRun = 0;
    let colRun = 0;
    let rowPrev: number | null = null;
    let colPrev: number | null = null;

    for (let b = 0; b < size; b += 1) {
      const rowValue = matrix.get(a, b);

      if (rowValue === rowPrev) {
        rowRun += 1;
      } else {
        if (rowRun >= 5) {
          penalty += PENALTY_RUN + (rowRun - 5);
        }

        rowPrev = rowValue;
        rowRun = 1;
      }

      const colValue = matrix.get(b, a);

      if (colValue === colPrev) {
        colRun += 1;
      } else {
        if (colRun >= 5) {
          penalty += PENALTY_RUN + (colRun - 5);
        }

        colPrev = colValue;
        colRun = 1;
      }
    }

    if (rowRun >= 5) {
      penalty += PENALTY_RUN + (rowRun - 5);
    }

    if (colRun >= 5) {
      penalty += PENALTY_RUN + (colRun - 5);
    }
  }

  return penalty;
};

const penaltyBlocks = (matrix: BitMatrix) => {
  const { size } = matrix;
  let count = 0;

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const sum =
        matrix.get(row, col) +
        matrix.get(row, col + 1) +
        matrix.get(row + 1, col) +
        matrix.get(row + 1, col + 1);

      if (sum === 4 || sum === 0) {
        count += 1;
      }
    }
  }

  return count * PENALTY_BLOCK;
};

const penaltyFinderLike = (matrix: BitMatrix) => {
  const { size } = matrix;
  let count = 0;

  for (let a = 0; a < size; a += 1) {
    let rowBits = 0;
    let colBits = 0;

    for (let b = 0; b < size; b += 1) {
      rowBits = ((rowBits << 1) & 2047) | matrix.get(a, b);

      if (b >= 10 && (rowBits === FINDER_LIKE_A || rowBits === FINDER_LIKE_B)) {
        count += 1;
      }

      colBits = ((colBits << 1) & 2047) | matrix.get(b, a);

      if (b >= 10 && (colBits === FINDER_LIKE_A || colBits === FINDER_LIKE_B)) {
        count += 1;
      }
    }
  }

  return count * PENALTY_FINDER;
};

const penaltyBalance = (matrix: BitMatrix) => {
  let dark = 0;

  for (const value of matrix.data) {
    dark += value;
  }

  return (
    Math.abs(Math.ceil((dark * 100) / matrix.data.length / 5) - 10) *
    PENALTY_BALANCE
  );
};

const getBestMask = (
  matrix: BitMatrix,
  writeFormat: (mask: number) => void
) => {
  let best = 0;
  let lowest = Number.POSITIVE_INFINITY;

  for (let pattern = 0; pattern < MASK_PATTERN_COUNT; pattern += 1) {
    writeFormat(pattern);
    applyMask(pattern, matrix);

    const penalty =
      penaltyRuns(matrix) +
      penaltyBlocks(matrix) +
      penaltyFinderLike(matrix) +
      penaltyBalance(matrix);

    applyMask(pattern, matrix);

    if (penalty < lowest) {
      lowest = penalty;
      best = pattern;
    }
  }

  return best;
};

const createCodewords = (
  buffer: BitBuffer,
  version: number,
  level: EcLevel
) => {
  const total = TOTAL_CODEWORDS[version];
  const dataTotal = total - getEcCodewordsCount(version, level);
  const blocks = getBlocksCount(version, level);
  const shortBlocks = blocks - (total % blocks);
  const blockTotal = Math.floor(total / blocks);
  const shortData = Math.floor(dataTotal / blocks);
  const ecPerBlock = blockTotal - shortData;
  const bytes = Uint8Array.from(buffer.buffer);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  let maxData = 0;

  for (let index = 0; index < blocks; index += 1) {
    const size = index < shortBlocks ? shortData : shortData + 1;
    dataBlocks[index] = bytes.slice(offset, offset + size);
    ecBlocks[index] = reedSolomonEncode(dataBlocks[index], ecPerBlock);
    offset += size;
    maxData = Math.max(maxData, size);
  }

  const result = new Uint8Array(total);
  let position = 0;

  for (let index = 0; index < maxData; index += 1) {
    for (const block of dataBlocks) {
      if (index < block.length) {
        result[position] = block[index];
        position += 1;
      }
    }
  }

  for (let index = 0; index < ecPerBlock; index += 1) {
    for (const block of ecBlocks) {
      result[position] = block[index];
      position += 1;
    }
  }

  return result;
};

const PAD_BYTES = [236, 17] as const;

const createData = (
  version: number,
  level: EcLevel,
  segments: readonly Segment[]
) => {
  const buffer = createBitBuffer();

  for (const segment of segments) {
    buffer.put(segment.mode.bit, 4);
    buffer.put(segment.length, getCharCountBits(segment.mode, version));
    writeSegment(segment, buffer);
  }

  const capacityBits = getMixedCapacity(version, level);

  if (buffer.length + 4 <= capacityBits) {
    buffer.put(0, 4);
  }

  while (buffer.length % 8 !== 0) {
    buffer.putBit(false);
  }

  const padding = (capacityBits - buffer.length) / 8;

  for (let index = 0; index < padding; index += 1) {
    buffer.put(PAD_BYTES[index % 2], 8);
  }

  return createCodewords(buffer, version, level);
};

export interface QrCreateOptions {
  readonly errorCorrectionLevel: EcLevel;
  readonly maskPattern?: number;
  readonly version?: number;
}

export interface QrSymbol {
  readonly maskPattern: number;
  readonly modules: BitMatrix;
  readonly version: number;
}

export const createQr = (
  value: string,
  { errorCorrectionLevel: level, maskPattern, version }: QrCreateOptions
): QrSymbol => {
  if (value === "") {
    throw new Error("No input text");
  }

  const requested =
    version !== undefined && version >= 1 && version <= MAX_VERSION
      ? version
      : undefined;

  const sizingVersion =
    requested ?? getBestVersionForSegments(rawSegments(value), level);

  const segments = segmentString(value, sizingVersion ?? MAX_VERSION);
  const minimum = getBestVersionForSegments(segments, level);

  if (minimum === undefined) {
    throw new Error("The amount of data is too big to be stored in a QR Code");
  }

  if (requested !== undefined && requested < minimum) {
    throw new Error(
      `The chosen QR Code version cannot contain this amount of data. Minimum version required to store current data is: ${minimum}.`
    );
  }

  const finalVersion = requested ?? minimum;
  const data = createData(finalVersion, level, segments);
  const modules = new BitMatrix(getSymbolSize(finalVersion));

  placeFinderPatterns(modules);
  placeTimingPatterns(modules);
  placeAlignmentPatterns(modules, finalVersion);
  placeFormatInfo(modules, level, 0);

  if (finalVersion >= 7) {
    placeVersionInfo(modules, finalVersion);
  }

  placeData(modules, data);

  const mask =
    maskPattern !== undefined && maskPattern >= 0 && maskPattern <= 7
      ? maskPattern
      : getBestMask(modules, (pattern) => {
          placeFormatInfo(modules, level, pattern);
        });

  applyMask(mask, modules);
  placeFormatInfo(modules, level, mask);

  return { maskPattern: mask, modules, version: finalVersion };
};
