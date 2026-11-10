/* oxlint-disable eslint/complexity -- the controller keeps one branch per InteractionManager case; splitting the pointer handlers would separate the shared session state. */
/* oxlint-disable unicorn/prefer-dom-node-dataset -- the checks run on composed-path nodes that include SVG icons, which have no `dataset` on Element; the component reads attributes with getAttribute/hasAttribute. */

/*
 * Line selection, based on the @pierre/diffs InteractionManager. The manager keeps one pointer session:
 *
 *   idle
 *   selecting                 a press on a line number, then a drag over line numbers or line text
 *   pendingSingleLineUnselect a press on the only selected line; a drag turns it into `selecting`,
 *                             a release unselects the line
 *   gutterSelecting           a press on the gutter utility button (needs onGutterUtilityClick)
 *
 * A pointer cancel ends every session. A press with Shift extends the selected range from the
 * end that is farther from the pressed line. A touch press first reveals the gutter utility on the
 * pressed number cell, and number cells use `touch-action: none` so a drag is not taken as a pan.
 */

import type { AnnotationSide, SelectedLineRange } from "./diff-view";

export type SelectionColumn = "additions" | "deletions" | "unified";

/** Where the gutter utility button sits: a number cell of one rendered column. */
export interface UtilityTarget {
  column: SelectionColumn;
  indexAttribute: string;
  lineNumber: number;
  side: AnnotationSide;
}

/** The selection as rendered: `setSelectedLines(range, { activeLineSide, lineNumberOnly })`. */
export interface SelectionView {
  highlightSide: AnnotationSide | undefined;
  lineNumberOnly: boolean;
  range: SelectedLineRange | null;
}

export interface SelectedLinesOptions {
  /** Highlights only this column of a split diff. */
  activeLineSide?: AnnotationSide;
  /** Highlights the number cells only, not the line bodies. */
  lineNumberOnly?: boolean;
  /** `false` skips the committed callback. */
  notify?: boolean;
}

interface SelectionPoint {
  lineNumber: number;
  side: AnnotationSide;
}

type PointerSession =
  | { mode: "idle" }
  | { mode: "selecting"; pointerId: number }
  | {
      anchor: SelectionPoint;
      mode: "pendingSingleLineUnselect";
      pending: SelectionPoint;
      pointerId: number;
    }
  | {
      anchor: SelectionPoint;
      current: SelectionPoint;
      mode: "gutterSelecting";
      pointerId: number;
    };

interface LineTarget {
  column: SelectionColumn;
  indexAttribute: string;
  lineNumber: number;
  numberColumn: boolean;
  side: AnnotationSide;
  splitLineIndex: number | undefined;
}

export interface LineSelectionOptions {
  enableGutterUtility: boolean;
  enableLineSelection: boolean;
  /** The row indexes (unified, split) of a rendered line. */
  getLineIndex: (
    lineNumber: number,
    side: AnnotationSide
  ) => readonly [number, number] | null;
  /** The hovered number cell, if the pointer is over one. */
  getHovered: () => UtilityTarget | null;
  onGutterUtilityClick?: (range: SelectedLineRange) => void;
  onLineSelected?: (range: SelectedLineRange | null) => void;
  onLineSelectionChange?: (range: SelectedLineRange | null) => void;
  onLineSelectionEnd?: (range: SelectedLineRange | null) => void;
  onLineSelectionStart?: (range: SelectedLineRange | null) => void;
  /** The selection is driven by the `selectedLines` prop. */
  controlledSelection: boolean;
  onUtilityChange: (target: UtilityTarget | null) => void;
  onViewChange: (view: SelectionView) => void;
}

const sameRange = (
  left: SelectedLineRange | null | undefined,
  right: SelectedLineRange | null | undefined
) =>
  left?.start === right?.start &&
  left?.end === right?.end &&
  left?.side === right?.side &&
  left?.endSide === right?.endSide;

const samePoint = (left: SelectionPoint, right: SelectionPoint) =>
  left.lineNumber === right.lineNumber && left.side === right.side;

/** The path runs through the gutter utility. */
const isUtilityPath = (path: readonly EventTarget[]) =>
  path.some(
    (node) =>
      node instanceof HTMLElement &&
      (node.hasAttribute("data-ck-utility-button") ||
        node.hasAttribute("data-gutter-utility-slot") ||
        node.getAttribute("slot") === "gutter-utility-slot" ||
        node.getAttribute("name") === "gutter-utility-slot")
  );

/** The node and its ancestors, nearest first. */
const ancestorsOf = (node: Element) => {
  const path: Node[] = [];

  for (let next: Node | null = node; next !== null; next = next.parentNode) {
    path.push(next);
  }

  return path;
};

/** The line or number cell of an element, or the cell an annotation row follows. */
const closestLineCell = (element: Element) => {
  const cell = element.closest("[data-line], [data-ck-column-number]");

  if (cell instanceof HTMLElement) {
    return cell;
  }

  const annotation = element.closest(
    '[data-line-annotation], [data-gutter-buffer="annotation"]'
  );

  if (!(annotation instanceof HTMLElement)) {
    return null;
  }

  const previous = annotation.previousElementSibling;

  return previous instanceof HTMLElement &&
    (previous.hasAttribute("data-line") ||
      previous.hasAttribute("data-ck-column-number"))
    ? previous
    : null;
};

/** The numbers of a `data-line-index` value: `unified,split`. */
const parseIndexes = (attribute: string) =>
  attribute
    .split(",")
    .filter((part) => part.trim() !== "")
    .map(Number)
    .filter((part) => Number.isFinite(part));

const LINE_TYPES = new Set([
  "change-addition",
  "change-deletion",
  "context",
  "context-expanded",
]);

const columnOf = (code: Element): SelectionColumn => {
  if (code.hasAttribute("data-deletions")) {
    return "deletions";
  }

  return code.hasAttribute("data-additions") ? "additions" : "unified";
};

/** The side of a line, from its type or else its column. */
const sideOf = (lineType: string, code: Element): AnnotationSide => {
  if (lineType === "change-deletion") {
    return "deletions";
  }

  if (lineType === "change-addition") {
    return "additions";
  }

  return code.hasAttribute("data-deletions") ? "deletions" : "additions";
};

/** The pointer target, reduced to the line and number cells selection reads. */
const resolveLineTarget = (
  path: readonly Node[],
  split: boolean
): LineTarget | null => {
  let numberElement: HTMLElement | undefined;
  let lineElement: HTMLElement | undefined;
  let code: HTMLElement | undefined;

  for (const node of path) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }

    if (
      numberElement === undefined &&
      lineElement === undefined &&
      node.hasAttribute("data-ck-column-number")
    ) {
      numberElement = node;
    } else if (
      lineElement === undefined &&
      numberElement === undefined &&
      node.hasAttribute("data-line")
    ) {
      lineElement = node;
    } else if (node.hasAttribute("data-code")) {
      code = node;
      break;
    }
  }

  const cell = numberElement ?? lineElement;
  const lineType = cell?.getAttribute("data-line-type") ?? undefined;

  if (
    code === undefined ||
    cell === undefined ||
    lineType === undefined ||
    !LINE_TYPES.has(lineType)
  ) {
    return null;
  }

  const lineNumber = Number(
    cell.getAttribute(
      numberElement === undefined ? "data-line" : "data-ck-column-number"
    ) ?? Number.NaN
  );

  const indexAttribute = cell.getAttribute("data-line-index") ?? "";

  if (Number.isNaN(lineNumber)) {
    return null;
  }

  const indexes = parseIndexes(indexAttribute);

  let splitLineIndex: number | undefined;

  if (split) {
    splitLineIndex = indexes.length === 2 ? indexes[1] : undefined;
  } else {
    [splitLineIndex] = indexes;
  }

  return {
    column: columnOf(code),
    indexAttribute,
    lineNumber,
    numberColumn: numberElement !== undefined,
    side: sideOf(lineType, code),
    splitLineIndex,
  };
};

const buildSelectionRange = (
  start: number,
  end: number,
  startSide: AnnotationSide | undefined,
  endSide: AnnotationSide | undefined
): SelectedLineRange => {
  const range: SelectedLineRange = { end, start };

  if (startSide !== undefined) {
    range.side = startSide;
  }

  if (startSide !== endSide && endSide !== undefined) {
    range.endSide = endSide;
  }

  return range;
};

type PathSource = "coordinates-first" | "event-path";

/** The path from the line or number cell of an element. */
const pathFromElement = (element: Element, excludeUtility: boolean) => {
  if (excludeUtility && isUtilityPath(ancestorsOf(element))) {
    return null;
  }

  const cell = closestLineCell(element);

  return cell === null ? null : ancestorsOf(cell);
};

/** The path of the event's first element. */
const pathFromEventPath = (
  path: readonly EventTarget[],
  excludeUtility: boolean
) => {
  if (excludeUtility && isUtilityPath(path)) {
    return null;
  }

  const first = path.find((node) => node instanceof Element);

  return first instanceof Element
    ? pathFromElement(first, excludeUtility)
    : null;
};

export class LineSelectionController {
  options: LineSelectionOptions;
  pre: HTMLElement | undefined;
  /** The range that is rendered. */
  selectedRange: SelectedLineRange | null = null;
  highlightSide: AnnotationSide | undefined;
  lineNumberOnly = false;
  /** A controlled selection's drag result, until the parent sets it. */
  proposedRange: SelectedLineRange | null | undefined;
  anchor: SelectionPoint | undefined;
  session: PointerSession = { mode: "idle" };
  private documentListeners = false;

  constructor(options: LineSelectionOptions) {
    this.options = options;
  }

  setOptions(options: LineSelectionOptions) {
    this.options = options;

    const { enableLineSelection, onGutterUtilityClick } = options;

    const active =
      this.session.mode === "selecting" ||
      this.session.mode === "pendingSingleLineUnselect";

    // Switching a mode off ends its session.
    if (
      (!enableLineSelection && active) ||
      (onGutterUtilityClick === undefined &&
        this.session.mode === "gutterSelecting")
    ) {
      this.clearSession();
      this.detachDocumentListeners();
      this.anchor = undefined;
    }
  }

  setup(pre: HTMLElement | null) {
    if (pre === null) {
      this.cleanUp();

      return;
    }

    if (this.pre !== pre) {
      this.cleanUp();
      this.pre = pre;
    }

    if (
      !this.options.enableGutterUtility &&
      this.session.mode === "gutterSelecting"
    ) {
      this.clearSession();
      this.detachDocumentListeners();
    }

    this.placeUtility();
  }

  cleanUp() {
    this.pre = undefined;
    this.detachDocumentListeners();
    this.clearSession();
    this.anchor = undefined;
  }

  /** The selected lines are set from outside (`selectedLines`). */
  setSelection(
    range: SelectedLineRange | null,
    options?: SelectedLinesOptions
  ) {
    const changed = !sameRange(range, this.selectedRange);
    const lineNumberOnly = options?.lineNumberOnly ?? false;

    const optionsChanged =
      options?.activeLineSide !== this.highlightSide ||
      lineNumberOnly !== this.lineNumberOnly;

    if (!(changed || optionsChanged)) {
      return;
    }

    this.proposedRange = undefined;
    this.selectedRange = range;
    this.highlightSide = options?.activeLineSide;
    this.lineNumberOnly = lineNumberOnly;
    this.publish();
    this.placeUtility();

    if (changed && options?.notify !== false) {
      this.options.onLineSelected?.(range);
    }
  }

  private publish() {
    this.options.onViewChange({
      highlightSide: this.highlightSide,
      lineNumberOnly: this.lineNumberOnly,
      range: this.selectedRange,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Pointer entry                                                     */
  /* ---------------------------------------------------------------- */

  handlePointerDown = (event: PointerEvent) => {
    if (
      (event.pointerType === "mouse" && event.button !== 0) ||
      this.pre === undefined ||
      this.session.mode !== "idle"
    ) {
      return;
    }

    const path = event.composedPath();

    if (
      isUtilityPath(path) &&
      this.options.onGutterUtilityClick !== undefined
    ) {
      this.startGutterSelection(event);

      return;
    }

    if (event.pointerType !== "mouse") {
      this.revealUtilityFromPath(path);
    }

    this.startLineSelection(event);
  };

  private isSplit() {
    return this.pre?.getAttribute("data-diff-type") === "split";
  }

  /* ---------------------------------------------------------------- */
  /* Resolving the line under the pointer                              */
  /* ---------------------------------------------------------------- */

  private resolveSelectionPath(
    event: PointerEvent,
    source: PathSource,
    excludeUtility = true
  ) {
    const hasCoordinates =
      Number.isFinite(event.clientX) && Number.isFinite(event.clientY);

    if (source === "event-path" || !hasCoordinates) {
      return pathFromEventPath(event.composedPath(), excludeUtility);
    }

    // The element at the pointer coordinates.
    const root = this.pre?.getRootNode();

    const scope =
      root instanceof Document || root instanceof ShadowRoot ? root : document;

    const hit = scope.elementFromPoint(event.clientX, event.clientY);

    return hit === null ? null : pathFromElement(hit, excludeUtility);
  }

  private resolveSelectionInfo(
    event: PointerEvent,
    source: PathSource,
    requireNumberColumn: boolean
  ) {
    const path = this.resolveSelectionPath(event, source);

    const target =
      path === null ? null : resolveLineTarget(path, this.isSplit());

    if (
      target === null ||
      (requireNumberColumn && !target.numberColumn) ||
      target.splitLineIndex === undefined
    ) {
      return null;
    }

    return {
      eventSide: target.side,
      lineIndex: target.splitLineIndex,
      lineNumber: target.lineNumber,
    };
  }

  private resolveSelectionPoint(
    event: PointerEvent,
    source: PathSource,
    excludeUtility = true
  ): SelectionPoint | null {
    const path = this.resolveSelectionPath(event, source, excludeUtility);

    const target =
      path === null ? null : resolveLineTarget(path, this.isSplit());

    return target === null
      ? null
      : { lineNumber: target.lineNumber, side: target.side };
  }

  /* ---------------------------------------------------------------- */
  /* Selection range                                                   */
  /* ---------------------------------------------------------------- */

  currentRange() {
    return this.proposedRange === undefined
      ? this.selectedRange
      : this.proposedRange;
  }

  private indexesOf(range: SelectedLineRange, split: boolean) {
    const start = this.options.getLineIndex(
      range.start,
      range.side ?? "additions"
    );

    const end = this.options.getLineIndex(
      range.end,
      range.endSide ?? range.side ?? "additions"
    );

    return start === null || end === null
      ? null
      : { end: split ? end[1] : end[0], start: split ? start[1] : start[0] };
  }

  private updateSelection(
    lineNumber: number | null,
    side: AnnotationSide | undefined,
    notify = true
  ) {
    const previous = this.currentRange();

    const next =
      lineNumber === null
        ? null
        : buildSelectionRange(
            this.anchor?.lineNumber ?? lineNumber,
            lineNumber,
            this.anchor?.side ?? side,
            side
          );

    if (sameRange(previous, next)) {
      return;
    }

    this.highlightSide = undefined;
    this.lineNumberOnly = false;

    if (this.options.controlledSelection) {
      this.proposedRange = next;
    } else {
      this.selectedRange = next;
      this.publish();
    }

    this.placeUtility();

    if (notify) {
      this.options.onLineSelectionChange?.(this.currentRange());
    }
  }

  private clearProposed() {
    this.proposedRange = undefined;
  }

  private notifyStart(range: SelectedLineRange | null) {
    this.options.onLineSelectionStart?.(range);
  }

  private notifyEnd(range: SelectedLineRange | null) {
    this.options.onLineSelectionEnd?.(range);
  }

  private notifyCommitted(range: SelectedLineRange | null) {
    this.options.onLineSelected?.(range);
  }

  /* ---------------------------------------------------------------- */
  /* Starting a selection                                              */
  /* ---------------------------------------------------------------- */

  private startLineSelection(event: PointerEvent) {
    if (!this.options.enableLineSelection) {
      return;
    }

    const info = this.resolveSelectionInfo(event, "event-path", true);

    if (info === null || this.pre === undefined) {
      return;
    }

    const { eventSide, lineIndex, lineNumber } = info;
    const selected = this.selectedRange;

    if (event.shiftKey && selected !== null) {
      const indexes = this.indexesOf(selected, this.isSplit());

      if (indexes === null) {
        return;
      }

      const forward =
        indexes.start <= indexes.end
          ? lineIndex >= indexes.start
          : lineIndex <= indexes.end;

      this.anchor = {
        lineNumber: forward ? selected.start : selected.end,
        side: forward
          ? (selected.side ?? "additions")
          : (selected.endSide ?? selected.side ?? "additions"),
      };
      this.updateSelection(lineNumber, eventSide, false);
      this.notifyStart(this.currentRange());
      this.session = { mode: "selecting", pointerId: event.pointerId };
    } else if (selected?.start === lineNumber && selected.end === lineNumber) {
      const point = { lineNumber, side: eventSide };

      this.anchor = point;
      this.session = {
        anchor: point,
        mode: "pendingSingleLineUnselect",
        pending: point,
        pointerId: event.pointerId,
      };
    } else {
      if (this.options.controlledSelection) {
        this.proposedRange = null;
      } else {
        this.selectedRange = null;
      }

      this.placeUtility();
      this.anchor = { lineNumber, side: eventSide };
      this.updateSelection(lineNumber, eventSide, false);
      this.notifyStart(this.currentRange());
      this.session = { mode: "selecting", pointerId: event.pointerId };
    }

    this.attachDocumentListeners();
  }

  private startGutterSelection(event: PointerEvent) {
    if (this.options.onGutterUtilityClick === undefined) {
      return;
    }

    const ends = this.currentSelectionEnds();

    const bottom =
      ends?.bottom ?? this.resolveSelectionPoint(event, "event-path", false);

    const top = ends?.top ?? bottom;

    if (bottom === null || top === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.session = {
      anchor: top,
      current: bottom,
      mode: "gutterSelecting",
      pointerId: event.pointerId,
    };
    this.anchor = { lineNumber: top.lineNumber, side: top.side };
    this.updateSelection(bottom.lineNumber, bottom.side, false);
    this.notifyStart(this.currentRange());
    this.attachDocumentListeners();
  }

  /* ---------------------------------------------------------------- */
  /* The session                                                       */
  /* ---------------------------------------------------------------- */

  private attachDocumentListeners() {
    if (!this.documentListeners) {
      document.addEventListener("pointermove", this.handleDocumentPointerMove);
      document.addEventListener("pointerup", this.handleDocumentPointerUp);
      document.addEventListener(
        "pointercancel",
        this.handleDocumentPointerCancel
      );
      this.documentListeners = true;
    }
  }

  private detachDocumentListeners() {
    if (this.documentListeners) {
      document.removeEventListener(
        "pointermove",
        this.handleDocumentPointerMove
      );
      document.removeEventListener("pointerup", this.handleDocumentPointerUp);
      document.removeEventListener(
        "pointercancel",
        this.handleDocumentPointerCancel
      );
      this.documentListeners = false;
    }
  }

  private clearSession() {
    this.session = { mode: "idle" };
  }

  private readonly handleDocumentPointerMove = (event: PointerEvent) => {
    const { session } = this;

    if (session.mode === "idle" || event.pointerId !== session.pointerId) {
      return;
    }

    event.preventDefault();

    if (session.mode === "gutterSelecting") {
      const point = this.resolveSelectionPoint(event, "coordinates-first");

      if (point === null) {
        return;
      }

      session.current = point;
      this.updateSelection(point.lineNumber, point.side);

      return;
    }

    const info = this.resolveSelectionInfo(event, "coordinates-first", false);

    if (info === null || this.anchor === undefined) {
      return;
    }

    if (session.mode === "selecting") {
      this.updateSelection(info.lineNumber, info.eventSide);

      return;
    }

    if (
      samePoint(session.pending, {
        lineNumber: info.lineNumber,
        side: info.eventSide,
      })
    ) {
      return;
    }

    this.updateSelection(info.lineNumber, info.eventSide, false);
    this.notifyStart(this.currentRange());
    this.options.onLineSelectionChange?.(this.currentRange());
    this.session = { mode: "selecting", pointerId: event.pointerId };
  };

  private readonly handleDocumentPointerUp = (event: PointerEvent) => {
    const { session } = this;

    if (session.mode === "idle" || event.pointerId !== session.pointerId) {
      return;
    }

    event.preventDefault();

    if (session.mode === "gutterSelecting") {
      const point = this.resolveSelectionPoint(event, "coordinates-first");

      if (point !== null) {
        session.current = point;
        this.updateSelection(point.lineNumber, point.side);
      }

      const range = buildSelectionRange(
        session.anchor.lineNumber,
        session.current.lineNumber,
        session.anchor.side,
        session.current.side
      );

      this.options.onGutterUtilityClick?.({ ...range });
      this.anchor = undefined;
      this.notifyEnd(range);
      this.notifyCommitted(range);
      this.clearProposed();
      this.clearSession();
      this.detachDocumentListeners();

      return;
    }

    if (session.mode === "pendingSingleLineUnselect") {
      this.updateSelection(null, undefined, false);
      this.anchor = undefined;
      this.clearSession();
      this.detachDocumentListeners();
      this.notifyEnd(this.currentRange());
      this.notifyCommitted(this.currentRange());
      this.clearProposed();

      return;
    }

    this.anchor = undefined;
    this.detachDocumentListeners();
    this.clearSession();
    this.notifyEnd(this.currentRange());
    this.notifyCommitted(this.currentRange());
    this.clearProposed();
  };

  private readonly handleDocumentPointerCancel = (event: PointerEvent) => {
    const { session } = this;

    if (session.mode === "idle" || event.pointerId !== session.pointerId) {
      return;
    }

    this.anchor = undefined;
    this.clearProposed();
    this.clearSession();
    this.detachDocumentListeners();
  };

  /* ---------------------------------------------------------------- */
  /* The gutter utility                                                */
  /* ---------------------------------------------------------------- */

  private selectionPointRowIndex(point: SelectionPoint) {
    const indexes = this.options.getLineIndex(point.lineNumber, point.side);

    return indexes === null ? null : indexes[this.isSplit() ? 1 : 0];
  }

  private currentSelectionEnds() {
    const range = this.currentRange();

    if (range === null) {
      return null;
    }

    const first: SelectionPoint = {
      lineNumber: range.start,
      side: range.side ?? "additions",
    };

    const last: SelectionPoint = {
      lineNumber: range.end,
      side: range.endSide ?? range.side ?? "additions",
    };

    const firstRow = this.selectionPointRowIndex(first);
    const lastRow = this.selectionPointRowIndex(last);

    if (firstRow === null || lastRow === null) {
      return null;
    }

    return firstRow > lastRow
      ? { bottom: first, top: last }
      : { bottom: last, top: first };
  }

  /** The number cell of a selection end. */
  private targetForSelectionPoint(point: SelectionPoint): UtilityTarget | null {
    const indexes = this.options.getLineIndex(point.lineNumber, point.side);

    if (this.pre === undefined || indexes === null) {
      return null;
    }

    const cells = this.pre.querySelectorAll(
      `[data-ck-column-number="${point.lineNumber}"][data-line-index="${indexes[0]},${indexes[1]}"]`
    );

    for (const cell of cells) {
      if (cell instanceof HTMLElement) {
        const target = resolveLineTarget(ancestorsOf(cell), this.isSplit());

        if (target?.side === point.side) {
          return {
            column: target.column,
            indexAttribute: target.indexAttribute,
            lineNumber: target.lineNumber,
            side: target.side,
          };
        }
      }
    }

    return null;
  }

  private placeUtilityFromSelection() {
    const ends = this.currentSelectionEnds();

    if (ends === null) {
      return false;
    }

    this.options.onUtilityChange(this.targetForSelectionPoint(ends.bottom));

    return true;
  }

  /** The selection's last line, else the hovered line, else none. */
  placeUtility() {
    if (this.placeUtilityFromSelection()) {
      return;
    }

    this.options.onUtilityChange(this.options.getHovered());
  }

  /** A touch press shows the utility on the pressed number. */
  private revealUtilityFromPath(path: readonly EventTarget[]) {
    if (this.placeUtilityFromSelection()) {
      return;
    }

    const first = path.find((node) => node instanceof Element);

    if (first === undefined) {
      return;
    }

    const cell = pathFromElement(first, false);

    const target =
      cell === null ? null : resolveLineTarget(cell, this.isSplit());

    if (target?.numberColumn === true) {
      this.options.onUtilityChange({
        column: target.column,
        indexAttribute: target.indexAttribute,
        lineNumber: target.lineNumber,
        side: target.side,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Rendering the selection                  */
/* ------------------------------------------------------------------ */

const parseLineIndex = (element: Element, split: boolean) => {
  const indexes = parseIndexes(element.getAttribute("data-line-index") ?? "");

  if (split) {
    return indexes.length === 2 ? indexes[1] : undefined;
  }

  return indexes[0];
};

/**
 * Marks the selected lines with `data-selected-line`: `single`, `first`, `last` or an empty
 * value. The range is a span of row indexes, so in a split diff both columns of a row are
 * marked unless `highlightSide` names one. Unless `lineNumberOnly`, the line bodies and the
 * annotation row under a selected line are marked too.
 */
export const renderSelection = (
  pre: HTMLElement,
  view: SelectionView,
  getLineIndex: LineSelectionOptions["getLineIndex"]
) => {
  for (const marked of pre.querySelectorAll("[data-selected-line]")) {
    marked.removeAttribute("data-selected-line");
  }

  const { range } = view;

  if (range === null) {
    return;
  }

  const split = pre.getAttribute("data-diff-type") === "split";
  const start = getLineIndex(range.start, range.side ?? "additions");

  const end = getLineIndex(
    range.end,
    range.endSide ?? range.side ?? "additions"
  );

  if (start === null || end === null) {
    return;
  }

  const first = Math.min(start[split ? 1 : 0], end[split ? 1 : 0]);
  const last = Math.max(start[split ? 1 : 0], end[split ? 1 : 0]);
  const single = first === last;

  for (const code of pre.children) {
    const column = columnOf(code);

    if (
      view.highlightSide !== undefined &&
      column !== "unified" &&
      view.highlightSide !== column
    ) {
      continue;
    }

    const [gutter, content] = code.children;

    if (!(gutter instanceof HTMLElement && content instanceof HTMLElement)) {
      continue;
    }

    const lines = content.children;
    const numbers = gutter.children;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const number = numbers[index];

      if (!(line instanceof HTMLElement && number instanceof HTMLElement)) {
        continue;
      }

      const row = parseLineIndex(line, split);

      if ((row ?? 0) > last) {
        break;
      }

      if (row === undefined || row < first || row > last) {
        continue;
      }

      let value = "";

      if (single) {
        value = "single";
      } else if (row === first) {
        value = "first";
      } else if (row === last) {
        value = "last";
      }

      number.setAttribute("data-selected-line", value);

      if (view.lineNumberOnly) {
        continue;
      }

      line.setAttribute("data-selected-line", value);

      const nextLine = lines[index + 1];
      const nextNumber = numbers[index + 1];

      if (
        nextLine instanceof HTMLElement &&
        nextNumber instanceof HTMLElement &&
        nextLine.hasAttribute("data-line-annotation")
      ) {
        let annotation = value;

        if (single) {
          annotation = "last";
          line.setAttribute("data-selected-line", "first");
        } else if (row === first) {
          annotation = "";
        } else if (row === last) {
          line.setAttribute("data-selected-line", "");
        }

        nextLine.setAttribute("data-selected-line", annotation);
        nextNumber.setAttribute("data-selected-line", annotation);
      }
    }
  }
};
