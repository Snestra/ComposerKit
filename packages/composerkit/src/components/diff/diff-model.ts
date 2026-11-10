/* oxlint-disable eslint/complexity -- diffSequences, buildHunks and parseUnifiedPatch are single-pass versions of the diff library's edit-script walk, hunk grouping and patch parser; splitting them would separate the shared cursor state. */

/*
 * Diff model for the diff family, based on the @pierre/diffs library, which is
 * not a dependency of this project: the file-diff hunk model, the hunk expansion
 * ranges, the word-alt intra-line highlighting and the "unmodified lines" label.
 */

export interface DiffFile {
  contents: string;
  lang?: string;
  name: string;
}

export type DiffChangeType =
  | "change"
  | "deleted"
  | "new"
  | "rename-changed"
  | "rename-pure";

export interface DiffContentContext {
  additionLineIndex: number;
  deletionLineIndex: number;
  lines: number;
  type: "context";
}

export interface DiffContentChange {
  additionLineIndex: number;
  additions: number;
  deletionLineIndex: number;
  deletions: number;
  type: "change";
}

export type DiffHunkContent = DiffContentChange | DiffContentContext;

export interface DiffHunk {
  additionCount: number;
  additionLineIndex: number;
  additionStart: number;
  collapsedBefore: number;
  deletionCount: number;
  deletionLineIndex: number;
  deletionStart: number;
  hunkContent: DiffHunkContent[];
  hunkSpecs?: string;
  noEOFCRAdditions: boolean;
  noEOFCRDeletions: boolean;
  splitLineCount: number;
  splitLineStart: number;
  unifiedLineCount: number;
  unifiedLineStart: number;
}

export interface FileDiffMetadata {
  additionLines: string[];
  deletionLines: string[];
  hunks: DiffHunk[];
  isPartial: boolean;
  lang?: string;
  name: string;
  prevName?: string;
  splitLineCount: number;
  type: DiffChangeType;
  unifiedLineCount: number;
}

/** The app's `diff` object around the library metadata. */
export interface CodeDiffData {
  additions: number;
  deletions: number;
  firstAdditionLine?: number;
  firstDeletionLine?: number;
  isBinary?: boolean;
  isGitlink?: boolean;
  metadata: FileDiffMetadata;
  newPath: string;
  oldPath: string;
}

const NULL_FILE = "/dev/null";
const DEFAULT_CONTEXT = 3;

const splitLines = (text: string): string[] => {
  if (text === "") {
    return [];
  }

  const lines = text.split("\n").map((line) => `${line}\n`);

  if (text.endsWith("\n")) {
    lines.pop();
  } else {
    const last = lines.pop() ?? "";
    lines.push(last.slice(0, -1));
  }

  return lines;
};

/** The line text without its line ending. */
export const stripLineEnding = (line: string) => line.replace(/\r?\n$/u, "");

type Op = "add" | "delete" | "equal";

/**
 * The diff library's path component: a run of equal, added or
 * removed tokens that points at the run before it.
 */
interface PathComponent {
  added: boolean;
  count: number;
  previous: PathComponent | undefined;
  removed: boolean;
}

/** One furthest-reaching path on a diagonal. */
interface EditPath {
  last: PathComponent | undefined;
  oldPos: number;
}

const addToPath = (
  path: EditPath,
  added: boolean,
  removed: boolean,
  oldAdvance: number
): EditPath => {
  const { last } = path;

  return last && last.added === added && last.removed === removed
    ? {
        last: {
          added,
          count: last.count + 1,
          previous: last.previous,
          removed,
        },
        oldPos: path.oldPos + oldAdvance,
      }
    : {
        last: { added, count: 1, previous: last, removed },
        oldPos: path.oldPos + oldAdvance,
      };
};

/** Follows the snake of equal tokens; returns the new position. */
const extractCommon = <T>(
  path: EditPath,
  right: readonly T[],
  left: readonly T[],
  diagonal: number
) => {
  const newLength = right.length;
  const oldLength = left.length;
  let { oldPos } = path;
  let newPos = oldPos - diagonal;
  let common = 0;

  while (
    newPos + 1 < newLength &&
    oldPos + 1 < oldLength &&
    left[oldPos + 1] === right[newPos + 1]
  ) {
    newPos += 1;
    oldPos += 1;
    common += 1;
  }

  if (common > 0) {
    path.last = {
      added: false,
      count: common,
      previous: path.last,
      removed: false,
    };
  }

  path.oldPos = oldPos;

  return newPos;
};

/** The components, oldest first, as one op per token. */
const opsFromComponents = (last: PathComponent | undefined) => {
  const components: PathComponent[] = [];

  for (let next = last; next; next = next.previous) {
    components.push(next);
  }

  const ops: Op[] = [];

  for (const component of components.toReversed()) {
    let op: Op = "equal";

    if (component.added) {
      op = "add";
    } else if (component.removed) {
      op = "delete";
    }

    for (let step = 0; step < component.count; step += 1) {
      ops.push(op);
    }
  }

  return ops;
};

/**
 * The diff library's Myers walk. The caller passes neither `maxEditLength` nor `timeout`, so the search always runs to the shortest edit
 * script. Each diagonal keeps one linked path instead of a trace per round, so memory stays
 * proportional to the live paths and no edit-distance cap is needed.
 */
const diffSequences = <T>(left: readonly T[], right: readonly T[]): Op[] => {
  const oldLength = left.length;
  const newLength = right.length;
  const offset = oldLength + newLength + 1;
  const paths = Array.from<EditPath | undefined>({ length: 2 * offset + 1 });
  const origin: EditPath = { last: undefined, oldPos: -1 };
  let newPos = extractCommon(origin, right, left, 0);

  if (origin.oldPos + 1 >= oldLength && newPos + 1 >= newLength) {
    return opsFromComponents(origin.last);
  }

  paths[offset] = origin;

  let minDiagonal = Number.NEGATIVE_INFINITY;
  let maxDiagonal = Number.POSITIVE_INFINITY;

  for (let edits = 1; edits <= oldLength + newLength; edits += 1) {
    for (
      let diagonal = Math.max(minDiagonal, -edits);
      diagonal <= Math.min(maxDiagonal, edits);
      diagonal += 2
    ) {
      const removePath = paths[offset + diagonal - 1];
      const addPath = paths[offset + diagonal + 1];

      if (removePath) {
        paths[offset + diagonal - 1] = undefined;
      }

      const addNewPos = addPath ? addPath.oldPos - diagonal : -1;
      const canAdd = addNewPos >= 0 && addNewPos < newLength;

      const canRemove =
        removePath !== undefined && removePath.oldPos + 1 < oldLength;

      let base: EditPath;

      if (
        addPath !== undefined &&
        canAdd &&
        (!canRemove ||
          removePath === undefined ||
          removePath.oldPos < addPath.oldPos)
      ) {
        base = addToPath(addPath, true, false, 0);
      } else if (removePath !== undefined && canRemove) {
        base = addToPath(removePath, false, true, 1);
      } else {
        paths[offset + diagonal] = undefined;
        continue;
      }

      newPos = extractCommon(base, right, left, diagonal);

      if (base.oldPos + 1 >= oldLength && newPos + 1 >= newLength) {
        return opsFromComponents(base.last);
      }

      paths[offset + diagonal] = base;

      if (base.oldPos + 1 >= oldLength) {
        maxDiagonal = Math.min(maxDiagonal, diagonal - 1);
      }

      if (newPos + 1 >= newLength) {
        minDiagonal = Math.max(minDiagonal, diagonal + 1);
      }
    }
  }

  return opsFromComponents(undefined);
};

interface ChangeBlock {
  additions: number;
  deletions: number;
  newStart: number;
  oldStart: number;
}

const collectBlocks = (ops: readonly Op[]) => {
  const blocks: ChangeBlock[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let current: ChangeBlock | null = null;

  for (const op of ops) {
    if (op === "equal") {
      current = null;
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (current === null) {
      current = {
        additions: 0,
        deletions: 0,
        newStart: newIndex,
        oldStart: oldIndex,
      };
      blocks.push(current);
    }

    if (op === "delete") {
      current.deletions += 1;
      oldIndex += 1;
    } else {
      current.additions += 1;
      newIndex += 1;
    }
  }

  return blocks;
};

const startFor = (index: number, count: number) =>
  count === 0 ? index : index + 1;

export const hunkIndexStart = (start: number, count: number) =>
  count === 0 ? start : start - 1;

export const hunkEnd = (start: number, count: number) =>
  hunkIndexStart(start, count) + count;

const measureHunk = (hunk: DiffHunk) => {
  let split = 0;
  let unified = 0;

  for (const part of hunk.hunkContent) {
    if (part.type === "context") {
      split += part.lines;
      unified += part.lines;
    } else {
      split += Math.max(part.deletions, part.additions);
      unified += part.deletions + part.additions;
    }
  }

  hunk.splitLineCount = split;
  hunk.unifiedLineCount = unified;
};

/** Recomputes collapsedBefore and the line starts. */
const layoutHunks = (diff: FileDiffMetadata) => {
  let split = 0;
  let unified = 0;
  let previousEnd = 0;

  for (const hunk of diff.hunks) {
    hunk.collapsedBefore = Math.max(
      hunkIndexStart(hunk.additionStart, hunk.additionCount) - previousEnd,
      0
    );
    hunk.splitLineStart = split + hunk.collapsedBefore;
    hunk.unifiedLineStart = unified + hunk.collapsedBefore;
    measureHunk(hunk);
    split += hunk.collapsedBefore + hunk.splitLineCount;
    unified += hunk.collapsedBefore + hunk.unifiedLineCount;
    previousEnd = hunkEnd(hunk.additionStart, hunk.additionCount);
  }

  const last = diff.hunks.at(-1);

  if (last) {
    const trailing = Math.max(
      diff.additionLines.length -
        hunkEnd(last.additionStart, last.additionCount),
      0
    );

    split += trailing;
    unified += trailing;
  }

  diff.splitLineCount = split;
  diff.unifiedLineCount = unified;
};

const endsWithoutNewline = (lines: readonly string[], endIndex: number) => {
  const last = lines.at(-1);

  return (
    last !== undefined &&
    last !== "" &&
    !last.endsWith("\n") &&
    endIndex === lines.length
  );
};

const buildHunks = (
  blocks: readonly ChangeBlock[],
  oldLines: readonly string[],
  newLines: readonly string[],
  context: number
) => {
  const hunks: DiffHunk[] = [];
  let groupStart = 0;

  while (groupStart < blocks.length) {
    let groupEnd = groupStart;

    while (groupEnd + 1 < blocks.length) {
      const here = blocks[groupEnd];
      const next = blocks[groupEnd + 1];
      const gap = next.oldStart - (here.oldStart + here.deletions);

      if (gap > context * 2) {
        break;
      }

      groupEnd += 1;
    }

    const first = blocks[groupStart];
    const lastBlock = blocks[groupEnd];
    const previous = blocks[groupStart - 1];

    const before =
      previous === undefined
        ? first.oldStart
        : first.oldStart - (previous.oldStart + previous.deletions);

    const lastOldEnd = lastBlock.oldStart + lastBlock.deletions;
    const after = oldLines.length - lastOldEnd;
    const leading = Math.min(context, before);
    const trailing = Math.min(context, after);
    const content: DiffHunkContent[] = [];

    if (leading > 0) {
      content.push({
        additionLineIndex: first.newStart - leading,
        deletionLineIndex: first.oldStart - leading,
        lines: leading,
        type: "context",
      });
    }

    for (let index = groupStart; index <= groupEnd; index += 1) {
      const block = blocks[index];
      content.push({
        additionLineIndex: block.newStart,
        additions: block.additions,
        deletionLineIndex: block.oldStart,
        deletions: block.deletions,
        type: "change",
      });

      const nextBlock = blocks[index + 1];

      if (index < groupEnd && nextBlock !== undefined) {
        const between = nextBlock.oldStart - (block.oldStart + block.deletions);

        content.push({
          additionLineIndex: block.newStart + block.additions,
          deletionLineIndex: block.oldStart + block.deletions,
          lines: between,
          type: "context",
        });
      }
    }

    if (trailing > 0) {
      content.push({
        additionLineIndex: lastBlock.newStart + lastBlock.additions,
        deletionLineIndex: lastOldEnd,
        lines: trailing,
        type: "context",
      });
    }

    const deletionIndex = first.oldStart - leading;
    const additionIndex = first.newStart - leading;
    let additionCount = 0;
    let deletionCount = 0;

    for (const part of content) {
      if (part.type === "context") {
        additionCount += part.lines;
        deletionCount += part.lines;
      } else {
        additionCount += part.additions;
        deletionCount += part.deletions;
      }
    }

    const additionStart = startFor(additionIndex, additionCount);
    const deletionStart = startFor(deletionIndex, deletionCount);

    const hunk: DiffHunk = {
      additionCount,
      additionLineIndex: additionIndex,
      additionStart,
      collapsedBefore: 0,
      deletionCount,
      deletionLineIndex: deletionIndex,
      deletionStart,
      hunkContent: content,
      hunkSpecs: `@@ -${deletionStart},${deletionCount} +${additionStart},${additionCount} @@`,
      noEOFCRAdditions: endsWithoutNewline(
        newLines,
        additionIndex + additionCount
      ),
      noEOFCRDeletions: endsWithoutNewline(
        oldLines,
        deletionIndex + deletionCount
      ),
      splitLineCount: 0,
      splitLineStart: 0,
      unifiedLineCount: 0,
      unifiedLineStart: 0,
    };

    measureHunk(hunk);
    hunks.push(hunk);
    groupStart = groupEnd + 1;
  }

  return hunks;
};

export interface CreateFileDiffOptions {
  /** Unchanged lines kept around each change. Pierre's patch default. */
  context?: number;
}

/**
 * Compares two file versions and returns
 * the full-file diff (`isPartial` false).
 */
export const createFileDiff = (
  oldFile: DiffFile | null,
  newFile: DiffFile | null,
  { context = DEFAULT_CONTEXT }: CreateFileDiffOptions = {}
): FileDiffMetadata => {
  if (oldFile === null && newFile === null) {
    throw new Error("createFileDiff: pass oldFile, newFile, or both");
  }

  const oldLines = splitLines(oldFile?.contents ?? "");
  const newLines = splitLines(newFile?.contents ?? "");
  const blocks = collectBlocks(diffSequences(oldLines, newLines));
  const name = newFile?.name ?? oldFile?.name ?? NULL_FILE;
  const renamed = oldFile !== null && newFile !== null && oldFile.name !== name;
  let type: DiffChangeType = "change";

  if (oldFile === null) {
    type = "new";
  } else if (newFile === null) {
    type = "deleted";
  } else if (renamed) {
    type = blocks.length === 0 ? "rename-pure" : "rename-changed";
  }

  const diff: FileDiffMetadata = {
    additionLines: newLines,
    deletionLines: oldLines,
    hunks: buildHunks(blocks, oldLines, newLines, context),
    isPartial: false,
    lang: newFile?.lang ?? oldFile?.lang,
    name,
    prevName: renamed ? oldFile?.name : undefined,
    splitLineCount: 0,
    type,
    unifiedLineCount: 0,
  };

  layoutHunks(diff);

  return diff;
};

// oxlint-disable-next-line eslint/prefer-named-capture-group -- the tsconfig target predates named capture groups (TS1503).
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/u;

/**
 * Parses one file's unified patch into a partial diff: only the lines that
 * the patch carries exist, so the unchanged lines between hunks cannot be
 * expanded without loading the files (Pierre `isPartial`).
 */
export const parseUnifiedPatch = (
  patch: string,
  fallbackName = "file"
): FileDiffMetadata => {
  const lines = patch.split(/\r?\n/u);
  const additionLines: string[] = [];
  const deletionLines: string[] = [];
  const hunks: DiffHunk[] = [];
  let name = fallbackName;
  let prevName: string | undefined;
  let type: DiffChangeType = "change";
  let current: DiffHunk | null = null;
  let currentChange: DiffContentChange | null = null;
  let lastLineType: "addition" | "context" | "deletion" | null = null;

  const closeChange = () => {
    currentChange = null;
  };

  for (const line of lines) {
    const header = HUNK_HEADER.exec(line);

    if (header) {
      closeChange();
      lastLineType = null;
      const deletionStart = Number(header[1]);
      const deletionCount = header[2] === undefined ? 1 : Number(header[2]);
      const additionStart = Number(header[3]);
      const additionCount = header[4] === undefined ? 1 : Number(header[4]);
      current = {
        additionCount,
        additionLineIndex: additionLines.length,
        additionStart,
        collapsedBefore: 0,
        deletionCount,
        deletionLineIndex: deletionLines.length,
        deletionStart,
        hunkContent: [],
        hunkSpecs: line.slice(0, header[0].length),
        noEOFCRAdditions: false,
        noEOFCRDeletions: false,
        splitLineCount: 0,
        splitLineStart: 0,
        unifiedLineCount: 0,
        unifiedLineStart: 0,
      };
      hunks.push(current);
      continue;
    }

    if (current === null) {
      if (line.startsWith("new file mode ") || line === "--- /dev/null") {
        type = "new";
      } else if (
        line.startsWith("deleted file mode ") ||
        line === "+++ /dev/null"
      ) {
        type = "deleted";
      } else if (line.startsWith("--- ")) {
        prevName = line.slice(4).replace(/^a\//u, "");
        name = prevName;
      } else if (line.startsWith("+++ ")) {
        name = line.slice(4).replace(/^b\//u, "");
      }

      continue;
    }

    const [marker] = line;

    if (marker === " ") {
      closeChange();
      lastLineType = "context";
      const last = current.hunkContent.at(-1);

      if (last?.type === "context") {
        last.lines += 1;
      } else {
        current.hunkContent.push({
          additionLineIndex: additionLines.length,
          deletionLineIndex: deletionLines.length,
          lines: 1,
          type: "context",
        });
      }

      additionLines.push(`${line.slice(1)}\n`);
      deletionLines.push(`${line.slice(1)}\n`);
    } else if (marker === "-" || marker === "+") {
      lastLineType = marker === "-" ? "deletion" : "addition";

      if (currentChange === null) {
        currentChange = {
          additionLineIndex: additionLines.length,
          additions: 0,
          deletionLineIndex: deletionLines.length,
          deletions: 0,
          type: "change",
        };
        current.hunkContent.push(currentChange);
      }

      if (marker === "-") {
        currentChange.deletions += 1;
        deletionLines.push(`${line.slice(1)}\n`);
      } else {
        currentChange.additions += 1;
        additionLines.push(`${line.slice(1)}\n`);
      }
    } else if (
      marker === "\\" &&
      line === "\\ No newline at end of file" &&
      lastLineType !== null
    ) {
      if (lastLineType === "context") {
        current.noEOFCRAdditions = true;
        current.noEOFCRDeletions = true;
      } else if (lastLineType === "deletion") {
        current.noEOFCRDeletions = true;
      } else {
        current.noEOFCRAdditions = true;
      }

      if (lastLineType === "addition" || lastLineType === "context") {
        const index = additionLines.length - 1;

        if (index >= 0) {
          additionLines[index] = stripLineEnding(additionLines[index] ?? "");
        }
      }

      if (lastLineType === "deletion" || lastLineType === "context") {
        const index = deletionLines.length - 1;

        if (index >= 0) {
          deletionLines[index] = stripLineEnding(deletionLines[index] ?? "");
        }
      }
    }
  }

  if (type === "change" && prevName !== undefined && prevName !== name) {
    type = "rename-changed";
  }

  const diff: FileDiffMetadata = {
    additionLines,
    deletionLines,
    hunks,
    isPartial: true,
    name,
    prevName: type === "rename-changed" ? prevName : undefined,
    splitLineCount: 0,
    type,
    unifiedLineCount: 0,
  };

  let previousEnd = 0;

  for (const hunk of hunks) {
    hunk.collapsedBefore = Math.max(
      hunkIndexStart(hunk.additionStart, hunk.additionCount) - previousEnd,
      0
    );
    previousEnd = hunkEnd(hunk.additionStart, hunk.additionCount);
    measureHunk(hunk);
  }

  let split = 0;
  let unified = 0;

  for (const hunk of hunks) {
    hunk.splitLineStart = split + hunk.collapsedBefore;
    hunk.unifiedLineStart = unified + hunk.collapsedBefore;
    split += hunk.collapsedBefore + hunk.splitLineCount;
    unified += hunk.collapsedBefore + hunk.unifiedLineCount;
  }

  diff.splitLineCount = split;
  diff.unifiedLineCount = unified;

  return diff;
};

export const countChanges = (diff: FileDiffMetadata) => {
  let additions = 0;
  let deletions = 0;

  for (const hunk of diff.hunks) {
    for (const part of hunk.hunkContent) {
      if (part.type === "change") {
        additions += part.additions;
        deletions += part.deletions;
      }
    }
  }

  return { additions, deletions };
};

/** Wraps library metadata in the object the app's CodeDiff receives. */
export const toCodeDiffData = (
  metadata: FileDiffMetadata,
  extra: Partial<Pick<CodeDiffData, "isBinary" | "isGitlink">> = {}
): CodeDiffData => {
  const { additions, deletions } = countChanges(metadata);
  const [firstHunk] = metadata.hunks;

  const firstChange = firstHunk?.hunkContent.find(
    (part): part is DiffContentChange => part.type === "change"
  );

  const firstAdditionLine =
    firstHunk !== undefined && firstChange !== undefined
      ? hunkIndexStart(firstHunk.additionStart, firstHunk.additionCount) +
        (firstChange.additionLineIndex - firstHunk.additionLineIndex) +
        1
      : undefined;

  const firstDeletionLine =
    firstHunk !== undefined && firstChange !== undefined
      ? hunkIndexStart(firstHunk.deletionStart, firstHunk.deletionCount) +
        (firstChange.deletionLineIndex - firstHunk.deletionLineIndex) +
        1
      : undefined;

  return {
    additions,
    deletions,
    firstAdditionLine: additions > 0 ? firstAdditionLine : undefined,
    firstDeletionLine: deletions > 0 ? firstDeletionLine : undefined,
    metadata,
    newPath: metadata.type === "deleted" ? NULL_FILE : metadata.name,
    oldPath:
      metadata.type === "new"
        ? NULL_FILE
        : (metadata.prevName ?? metadata.name),
    ...extra,
  };
};

/* ------------------------------------------------------------------ */
/* Hunk expansion. */
/* ------------------------------------------------------------------ */

export interface ExpandedRange {
  fromEnd: number;
  fromStart: number;
}

export type ExpandedHunks = ReadonlyMap<number, ExpandedRange> | true;

export interface ExpansionState {
  collapsedLines: number;
  fromEnd: number;
  fromStart: number;
  rangeSize: number;
  renderAll: boolean;
}

/** How much of the gap before a hunk is shown. */
export const resolveHunkExpansion = ({
  collapsedContextThreshold,
  expandedHunks,
  hunkIndex,
  isPartial,
  rangeSize,
}: {
  collapsedContextThreshold: number;
  expandedHunks: ExpandedHunks | undefined;
  hunkIndex: number;
  isPartial: boolean;
  rangeSize: number;
}): ExpansionState => {
  const size = Math.max(rangeSize, 0);

  if (size === 0 || isPartial) {
    return {
      collapsedLines: size,
      fromEnd: 0,
      fromStart: 0,
      rangeSize: size,
      renderAll: false,
    };
  }

  if (expandedHunks === true || size <= collapsedContextThreshold) {
    return {
      collapsedLines: 0,
      fromEnd: 0,
      fromStart: size,
      rangeSize: size,
      renderAll: true,
    };
  }

  const range = expandedHunks?.get(hunkIndex);
  const fromStart = Math.min(Math.max(range?.fromStart ?? 0, 0), size);
  const fromEnd = Math.min(Math.max(range?.fromEnd ?? 0, 0), size);
  const shown = fromStart + fromEnd;
  const all = shown >= size;

  return {
    collapsedLines: Math.max(size - shown, 0),
    fromEnd: all ? 0 : fromEnd,
    fromStart: all ? size : fromStart,
    rangeSize: size,
    renderAll: all,
  };
};

/** Unchanged lines after the last hunk. */
export const trailingContextSize = (diff: FileDiffMetadata) => {
  const last = diff.hunks.at(-1);

  if (
    !last ||
    diff.isPartial ||
    diff.additionLines.length === 0 ||
    diff.deletionLines.length === 0
  ) {
    return 0;
  }

  const additions =
    diff.additionLines.length - hunkEnd(last.additionStart, last.additionCount);

  const deletions =
    diff.deletionLines.length - hunkEnd(last.deletionStart, last.deletionCount);

  return Math.max(Math.min(additions, deletions), 0);
};

/** How much of the trailing unchanged lines is shown. */
export const resolveTrailingExpansion = ({
  collapsedContextThreshold,
  diff,
  expandedHunks,
}: {
  collapsedContextThreshold: number;
  diff: FileDiffMetadata;
  expandedHunks: ExpandedHunks | undefined;
}): ExpansionState | undefined => {
  const size = trailingContextSize(diff);

  if (size <= 0) {
    return undefined;
  }

  if (expandedHunks === true || size <= collapsedContextThreshold) {
    return {
      collapsedLines: 0,
      fromEnd: 0,
      fromStart: size,
      rangeSize: size,
      renderAll: true,
    };
  }

  const range = expandedHunks?.get(diff.hunks.length);
  const fromStart = Math.min(Math.max(range?.fromStart ?? 0, 0), size);

  return {
    collapsedLines: size - fromStart,
    fromEnd: 0,
    fromStart,
    rangeSize: size,
    renderAll: fromStart >= size,
  };
};

const pluralRules = new Intl.PluralRules("en-US");

export const unmodifiedLinesLabel = (count: number) =>
  `${count} unmodified line${pluralRules.select(count) === "one" ? "" : "s"}`;

/* ------------------------------------------------------------------ */
/* Intra-line (word-alt) highlighting                                  */
/* ------------------------------------------------------------------ */

export type LineDiffType = "char" | "none" | "word" | "word-alt";

export interface DiffSpan {
  length: number;
  start: number;
}

const WORD_TOKEN = /[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu;

const tokenizeWords = (text: string) => text.match(WORD_TOKEN) ?? [];

interface TextPart {
  added: boolean;
  removed: boolean;
  value: string;
}

const diffText = (
  left: readonly string[],
  right: readonly string[]
): TextPart[] => {
  const ops = diffSequences(left, right);
  const parts: TextPart[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  const push = (kind: "added" | "equal" | "removed", value: string) => {
    const last = parts.at(-1);
    const added = kind === "added";
    const removed = kind === "removed";

    if (last && last.added === added && last.removed === removed) {
      last.value += value;
    } else {
      parts.push({ added, removed, value });
    }
  };

  for (const op of ops) {
    if (op === "equal") {
      push("equal", left[leftIndex]);
      leftIndex += 1;
      rightIndex += 1;
    } else if (op === "delete") {
      push("removed", left[leftIndex]);
      leftIndex += 1;
    } else {
      push("added", right[rightIndex]);
      rightIndex += 1;
    }
  }

  return parts;
};

type Segment = [changed: 0 | 1, value: string];

/** Appends a part, joining one-character neutral gaps. */
const appendSegment = ({
  enableJoin,
  isLastItem,
  isNeutral,
  segments,
  value,
}: {
  enableJoin: boolean;
  isLastItem: boolean;
  isNeutral: boolean;
  segments: Segment[];
  value: string;
}) => {
  const last = segments.at(-1);

  if (last === undefined || isLastItem || !enableJoin) {
    segments.push([isNeutral ? 0 : 1, value]);

    return;
  }

  const lastIsNeutral = last[0] === 0;

  if (
    isNeutral === lastIsNeutral ||
    (isNeutral && value.length === 1 && !lastIsNeutral)
  ) {
    last[1] += value;
  } else {
    segments.push([isNeutral ? 0 : 1, value]);
  }
};

const spansFromSegments = (segments: readonly Segment[]): DiffSpan[] => {
  const spans: DiffSpan[] = [];
  let position = 0;

  for (const [changed, value] of segments) {
    if (changed === 1) {
      spans.push({ length: value.length, start: position });
    }

    position += value.length;
  }

  return spans;
};

export const MAX_LINE_DIFF_LENGTH = 1000;

/** Highlight ranges for one deleted and one added line. */
export const diffLinePair = (
  deletionLine: string,
  additionLine: string,
  lineDiffType: LineDiffType,
  maxLineDiffLength = MAX_LINE_DIFF_LENGTH
): { additions: DiffSpan[]; deletions: DiffSpan[] } | undefined => {
  if (lineDiffType === "none") {
    return undefined;
  }

  const left = stripLineEnding(deletionLine);
  const right = stripLineEnding(additionLine);

  if (left.length > maxLineDiffLength || right.length > maxLineDiffLength) {
    return undefined;
  }

  const parts =
    lineDiffType === "char"
      ? diffText(left.split(""), right.split(""))
      : diffText(tokenizeWords(left), tokenizeWords(right));

  const enableJoin = lineDiffType === "word-alt";
  const deletionSegments: Segment[] = [];
  const additionSegments: Segment[] = [];
  const lastPart = parts.at(-1);

  for (const part of parts) {
    const isLastItem = part === lastPart;

    if (!(part.added || part.removed)) {
      appendSegment({
        enableJoin,
        isLastItem,
        isNeutral: true,
        segments: deletionSegments,
        value: part.value,
      });
      appendSegment({
        enableJoin,
        isLastItem,
        isNeutral: true,
        segments: additionSegments,
        value: part.value,
      });
    } else if (part.removed) {
      appendSegment({
        enableJoin,
        isLastItem,
        isNeutral: false,
        segments: deletionSegments,
        value: part.value,
      });
    } else {
      appendSegment({
        enableJoin,
        isLastItem,
        isNeutral: false,
        segments: additionSegments,
        value: part.value,
      });
    }
  }

  return {
    additions: spansFromSegments(additionSegments),
    deletions: spansFromSegments(deletionSegments),
  };
};

/* ------------------------------------------------------------------ */
/* Patch statistics for the hover preview (diff-preview-tooltip f, p)  */
/* ------------------------------------------------------------------ */

/** Counts "+" and "-" lines, ignoring the "+++" and "---" headers. */
export const countPatchLines = (patch: string) => {
  let added = 0;
  let deleted = 0;

  for (const line of patch.split(/\r?\n/u)) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }

    if (line.startsWith("+")) {
      added += 1;
    } else if (line.startsWith("-")) {
      deleted += 1;
    }
  }

  return { added, deleted };
};

export interface DiffPreviewStats {
  added: number;
  deleted: number;
  openLocation: { line: number; path: string };
}

/** Structured stats first, "+"/"-" line counts when they are zero. */
export const getDiffPreviewStats = (
  patch: string | null | undefined,
  path: string
): DiffPreviewStats | null => {
  if (patch === null || patch === undefined || patch === "") {
    return null;
  }

  const metadata = parseUnifiedPatch(patch, path);
  const data = toCodeDiffData(metadata);

  if (data.additions === 0 && data.deletions === 0) {
    const counted = countPatchLines(patch);

    if (counted.added > 0 || counted.deleted > 0) {
      return { ...counted, openLocation: { line: 1, path } };
    }
  }

  return {
    added: data.additions,
    deleted: data.deletions,
    openLocation: {
      line: data.firstAdditionLine ?? data.firstDeletionLine ?? 1,
      path,
    },
  };
};

/* ------------------------------------------------------------------ */
/* Inline review size limits (inline-file-diff-review j, F, I)         */
/* ------------------------------------------------------------------ */

export const INLINE_REVIEW_MAX_CHARACTERS = 262_144;
export const INLINE_REVIEW_MAX_LINES = 5000;

/** Over 262144 characters or more than 5000 lines. */
export const exceedsInlineReviewLimit = (contents: string) =>
  contents.length > INLINE_REVIEW_MAX_CHARACTERS ||
  contents.split("\n", INLINE_REVIEW_MAX_LINES + 1).length >
    INLINE_REVIEW_MAX_LINES;
