import type { BitMatrix } from "./encoder";
import {
  createQr,
  getAlignmentCoordinates,
  getBlocksCount,
  getEcCodewordsCount,
} from "./encoder";

// Level H leaves room to knock a
// portrait silhouette out of the modules while the code still decodes.

const MIN_PORTRAIT_VERSION = 10;
const MASK_COUNT = 8;
const MAX_BOX = 29;
const MIN_BOX = 5;
const BOX_STEP = 2;
const COVERAGE_THRESHOLD = 0.09;
const CHROMA_WEIGHT = 0.62;
const SAMPLE_OFFSETS = [-0.35, -0.18, 0, 0.18, 0.35] as const;
const SAMPLE_COUNT = SAMPLE_OFFSETS.length * SAMPLE_OFFSETS.length;
const MODULE_COVERED = 0.13;
const MODULE_SOLID = 0.65;
const ALIGNMENT_REACH = 2;
const ERROR_MARGIN = 4;

export interface PortraitPixels {
  readonly data: Uint8ClampedArray;
  readonly height: number;
  readonly width: number;
}

const buildCoverage = ({ data, height, width }: PortraitPixels) => {
  const coverage = new Float32Array(width * height);
  const bounds = { maxX: -1, maxY: -1, minX: width, minY: height };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];

      const darkness =
        1 - (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

      const chroma =
        (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;

      const value =
        (data[offset + 3] / 255) * Math.max(darkness, chroma * CHROMA_WEIGHT);

      coverage[y * width + x] = value;

      if (value > COVERAGE_THRESHOLD) {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
    }
  }

  return { bounds, coverage };
};

// Maps each matrix cell to its codeword and each codeword to its block, so a
// candidate edit can be rejected when one block would lose too many codewords.
const createBlockValidator = (matrix: BitMatrix, version: number) => {
  const codewordOf = new Int16Array(matrix.data.length).fill(-1);
  let bitCount = 0;
  let row = matrix.size - 1;
  let direction = -1;

  for (let col = matrix.size - 1; col > 0; col -= 2) {
    if (col === 6) {
      col -= 1;
    }

    while (row >= 0 && row < matrix.size) {
      for (let offset = 0; offset < 2; offset += 1) {
        const index = row * matrix.size + col - offset;

        if (!matrix.reservedBit[index]) {
          codewordOf[index] = Math.floor(bitCount / 8);
          bitCount += 1;
        }
      }

      row += direction;
    }

    row -= direction;
    direction = -direction;
  }

  const codewords = Math.floor(bitCount / 8);
  const blocks = getBlocksCount(version, "H");
  const ecTotal = getEcCodewordsCount(version, "H");

  const dataCodewords = codewords - ecTotal;
  const shortData = Math.floor(dataCodewords / blocks);
  const shortBlocks = blocks - (codewords % blocks);
  const blockOf = new Int16Array(codewords);

  for (let index = 0; index < codewords; index += 1) {
    if (index >= dataCodewords) {
      blockOf[index] = (index - dataCodewords) % blocks;
    } else if (index < shortData * blocks) {
      blockOf[index] = index % blocks;
    } else {
      blockOf[index] = shortBlocks + index - shortData * blocks;
    }
  }

  const tolerated = Math.floor(ecTotal / blocks / 2) - ERROR_MARGIN;

  return (candidate: BitMatrix, edits: Map<number, number>) => {
    const seen = new Set<number>();
    const perBlock = new Uint8Array(blocks);

    for (const [index, value] of edits) {
      const codeword = codewordOf[index];

      if (
        candidate.data[index] === value ||
        codeword < 0 ||
        codeword >= codewords ||
        seen.has(codeword)
      ) {
        continue;
      }

      seen.add(codeword);
      perBlock[blockOf[codeword]] += 1;

      if (perBlock[blockOf[codeword]] > tolerated) {
        return false;
      }
    }

    return true;
  };
};

interface Fit {
  readonly box: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly origin: number;
  readonly width: number;
}

const sampleModules = (
  size: number,
  fit: Fit,
  coverage: Float32Array,
  pixels: PortraitPixels,
  bounds: { maxX: number; maxY: number; minX: number; minY: number }
) => {
  const mean = new Float32Array(size * size);
  const peak = new Float32Array(size * size);
  const spanX = bounds.maxX - bounds.minX + 1;
  const spanY = bounds.maxY - bounds.minY + 1;

  for (let row = fit.origin; row < fit.origin + fit.box; row += 1) {
    for (let col = fit.origin; col < fit.origin + fit.box; col += 1) {
      if (
        col + 0.5 < fit.offsetX ||
        col + 0.5 >= fit.offsetX + fit.width ||
        row + 0.5 < fit.offsetY ||
        row + 0.5 >= fit.offsetY + fit.height
      ) {
        continue;
      }

      const cell = row * size + col;

      for (const dy of SAMPLE_OFFSETS) {
        for (const dx of SAMPLE_OFFSETS) {
          const x = Math.max(
            bounds.minX,
            Math.min(
              bounds.maxX,
              bounds.minX +
                Math.floor(((col + 0.5 + dx - fit.offsetX) / fit.width) * spanX)
            )
          );

          const y = Math.max(
            bounds.minY,
            Math.min(
              bounds.maxY,
              bounds.minY +
                Math.floor(
                  ((row + 0.5 + dy - fit.offsetY) / fit.height) * spanY
                )
            )
          );

          const value = coverage[y * pixels.width + x];

          mean[cell] += value / SAMPLE_COUNT;
          peak[cell] = Math.max(peak[cell], value);
        }
      }
    }
  }

  return { mean, peak };
};

const findExterior = (
  size: number,
  fit: Fit,
  covered: (cell: number) => boolean
) => {
  const { box, origin } = fit;
  const exterior = new Set<number>();
  const queue = [(origin - 1) * size + origin - 1];

  for (const cell of queue) {
    if (exterior.has(cell) || covered(cell)) {
      continue;
    }

    exterior.add(cell);

    const col = cell % size;
    const row = Math.floor(cell / size);

    if (col > origin - 1) {
      queue.push(cell - 1);
    }

    if (col < origin + box) {
      queue.push(cell + 1);
    }

    if (row > origin - 1) {
      queue.push(cell - size);
    }

    if (row < origin + box) {
      queue.push(cell + size);
    }
  }

  return exterior;
};

const planEdits = (
  modules: BitMatrix,
  fit: Fit,
  alignmentCenter: number | undefined,
  mean: Float32Array,
  peak: Float32Array,
  fillSilhouette: boolean
) => {
  const { size } = modules;
  const { box, origin } = fit;
  const covered = (cell: number) => mean[cell] > MODULE_COVERED;
  const exterior = findExterior(size, fit, covered);
  const edits = new Map<number, number>();

  for (let row = origin - 1; row <= origin + box; row += 1) {
    for (let col = origin - 1; col <= origin + box; col += 1) {
      const cell = row * size + col;

      const inAlignment =
        alignmentCenter !== undefined &&
        Math.abs(col - alignmentCenter) <= ALIGNMENT_REACH &&
        Math.abs(row - alignmentCenter) <= ALIGNMENT_REACH;

      if (modules.reservedBit[cell] && !inAlignment) {
        continue;
      }

      const neighbours = [cell - 1, cell + 1, cell - size, cell + size];

      if (covered(cell)) {
        const onEdge = neighbours.some((neighbour) => !covered(neighbour));

        edits.set(
          cell,
          Number(fillSilhouette || onEdge || peak[cell] > MODULE_SOLID)
        );
      } else if (
        !exterior.has(cell) ||
        neighbours.some(covered) ||
        inAlignment
      ) {
        edits.set(cell, 0);
      }
    }
  }

  return edits;
};

export const buildPortraitModules = (
  value: string,
  pixels: PortraitPixels | null,
  fillSilhouette: boolean
): BitMatrix => {
  const base = createQr(value, { errorCorrectionLevel: "H" });
  const version = Math.max(MIN_PORTRAIT_VERSION, base.version);

  const plain =
    version === base.version
      ? base.modules
      : createQr(value, { errorCorrectionLevel: "H", version }).modules;

  if (pixels === null) {
    return plain;
  }

  const { bounds, coverage } = buildCoverage(pixels);
  const hasCoverage = bounds.maxX >= bounds.minX && bounds.maxY >= bounds.minY;

  if (!hasCoverage || coverage.every((entry) => entry === coverage[0])) {
    return plain;
  }

  const candidates = Array.from(
    { length: MASK_COUNT },
    (_, maskPattern) =>
      createQr(value, { errorCorrectionLevel: "H", maskPattern, version })
        .modules
  );

  const isEditSafe = createBlockValidator(plain, version);
  const { size } = plain;
  const middle = (size - 1) / 2;

  const alignmentCenter = getAlignmentCoordinates(version).find(
    (coordinate) => Math.abs(coordinate - middle) <= ALIGNMENT_REACH
  );

  const aspect =
    (bounds.maxX - bounds.minX + 1) / (bounds.maxY - bounds.minY + 1);

  for (let box = MAX_BOX; box >= MIN_BOX; box -= BOX_STEP) {
    const origin = (size - box) / 2;
    const inner = box - 2;
    const width = aspect > 1 ? inner : inner * aspect;
    const height = aspect > 1 ? inner / aspect : inner;

    const fit: Fit = {
      box,
      height,
      offsetX: origin + (box - width) / 2,
      offsetY: origin + (box - height) / 2,
      origin,
      width,
    };

    const { mean, peak } = sampleModules(size, fit, coverage, pixels, bounds);

    const edits = planEdits(
      plain,
      fit,
      alignmentCenter,
      mean,
      peak,
      fillSilhouette
    );

    let best: BitMatrix | null = null;
    let fewest = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      let changed = 0;

      for (const [cell, edit] of edits) {
        if (candidate.data[cell] !== edit) {
          changed += 1;
        }
      }

      if (changed < fewest && isEditSafe(candidate, edits)) {
        fewest = changed;
        best = candidate;
      }
    }

    if (best !== null) {
      for (const [cell, edit] of edits) {
        best.data[cell] = edit;
      }

      return best;
    }
  }

  return plain;
};
