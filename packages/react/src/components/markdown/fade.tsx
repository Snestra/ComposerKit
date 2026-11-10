"use client";

/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: custom properties in style objects. */
/* oxlint-disable typescript/consistent-return, unicorn/prefer-code-point -- Functions return a value only on the fading path; the segmenter fallback tests UTF-16 units. */

/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable anti-slop/no-unsafe-dictionary-type -- Hast element properties are an open attribute dictionary. */
/* oxlint-disable eslint/prefer-destructuring -- Stylistic. */
/* oxlint-disable eslint/require-unicode-regexp -- The segment patterns are kept. */
/* oxlint-disable react/refs -- The timeline lives in a ref so the segment ref callbacks read the current clock. */
/* oxlint-disable typescript/prefer-nullish-coalescing, typescript/strict-boolean-expressions -- Branches test optional values by truthiness. */

import type {
  CSSProperties,
  ReactNode,
  RefCallback,
  SyntheticEvent,
} from "react";
import { createElement } from "react";

import type { HastElement, HastNode, HastText } from "./parse";

/**
 * The streaming text fade of the chat prose: the timeline, the segment props,
 * the text splitter, the span builder, and the key allocator with its
 * collector. The collector walks hast instead of marked
 * tokens, in document order, so a segment keeps its key while text streams in.
 */

// ---- timeline ----------------------------------------------------

export interface FadeSegmentTimeline {
  delayMsByKey: Map<string, number>;
  nextSegmentStartAtMs: number;
  segmentKeyByElement: WeakMap<HTMLElement, string>;
  settledKeys: Set<string>;
  startAtMsByKey: Map<string, number>;
}

export const createFadeSegmentTimeline = (): FadeSegmentTimeline => ({
  delayMsByKey: new Map(),
  nextSegmentStartAtMs: 0,
  segmentKeyByElement: new WeakMap(),
  settledKeys: new Set(),
  startAtMsByKey: new Map(),
});

interface FadeDelay {
  fadeSegmentDelayMs: number;
  fadeSegmentMaxDelayMs?: number;
}

/** The first time an element shows a segment it gets the next free start. */
const placeSegment = ({
  element,
  fadeSegmentDelayMs,
  fadeSegmentMaxDelayMs,
  segmentKey,
  timeline,
}: FadeDelay & {
  element: HTMLElement;
  segmentKey: string;
  timeline: FadeSegmentTimeline;
}) => {
  if (timeline.segmentKeyByElement.get(element) === segmentKey) {
    return;
  }

  const now = performance.now();
  const known = timeline.startAtMsByKey.get(segmentKey);

  const start =
    known ??
    Math.min(
      Math.max(timeline.nextSegmentStartAtMs, now),
      fadeSegmentMaxDelayMs === undefined
        ? Number.POSITIVE_INFINITY
        : now + fadeSegmentMaxDelayMs
    );

  const delay = Math.round(start - now);

  if (known === undefined) {
    timeline.startAtMsByKey.set(segmentKey, start);
    timeline.delayMsByKey.set(segmentKey, delay);
    timeline.nextSegmentStartAtMs = start + fadeSegmentDelayMs;
  }

  timeline.segmentKeyByElement.set(element, segmentKey);
  element.style.setProperty("--fade-delay", `${delay}ms`);
};

const indexDelay = ({
  fadeSegmentDelayMs,
  fadeSegmentMaxDelayMs,
  segmentIndex,
}: FadeDelay & { segmentIndex: number }): number =>
  Math.min(
    segmentIndex * fadeSegmentDelayMs,
    fadeSegmentMaxDelayMs ?? Number.POSITIVE_INFINITY
  );

export interface FadeSegmentProps {
  className?: string;
  onAnimationEnd?: (event: SyntheticEvent<HTMLElement>) => void;
  ref?: RefCallback<HTMLElement>;
  style?: CSSProperties;
}

/** Class, delay and bookkeeping for one fading element. */
export const fadeSegmentProps = ({
  className,
  fadeSegmentDelayMs,
  fadeSegmentMaxDelayMs,
  segmentIndex,
  segmentKey,
  timeline,
}: FadeDelay & {
  className: string;
  segmentIndex: number;
  segmentKey?: string;
  timeline?: FadeSegmentTimeline;
}): FadeSegmentProps => {
  const settled =
    segmentKey !== undefined && timeline?.settledKeys.has(segmentKey);

  const tracked =
    !settled && segmentKey !== undefined && timeline !== undefined;

  const delayMs =
    (segmentKey === undefined
      ? undefined
      : timeline?.delayMsByKey.get(segmentKey)) ??
    indexDelay({ fadeSegmentDelayMs, fadeSegmentMaxDelayMs, segmentIndex });

  return {
    className: settled ? undefined : className,
    onAnimationEnd: tracked
      ? (event) => {
          if (event.target === event.currentTarget) {
            timeline.settledKeys.add(segmentKey);
          }
        }
      : undefined,
    ref: tracked
      ? (element) => {
          if (element !== null) {
            placeSegment({
              element,
              fadeSegmentDelayMs,
              fadeSegmentMaxDelayMs,
              segmentKey,
              timeline,
            });
          }
        }
      : undefined,
    style:
      fadeSegmentDelayMs <= 0
        ? undefined
        : ({ "--fade-delay": `${delayMs}ms` } as CSSProperties),
  };
};

// ---- splitting text --------------------------------------

const BLANK = /^\s*$/;
const WORD_WITH_SPACE = /\s*\S+(?:\s+|$)/g;

const isAsciiLetterOrDigit = (text: string, index: number): boolean => {
  if (index >= text.length) {
    return false;
  }

  const code = text.charCodeAt(index);

  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  );
};

const isAscii = (text: string): boolean => {
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) > 127) {
      return false;
    }
  }

  return true;
};

/** Runs of ASCII letters and digits are segments, other characters join the previous one. */
const splitAscii = (text: string): string[] => {
  const segments: string[] = [];
  let index = 0;

  while (index < text.length) {
    if (isAsciiLetterOrDigit(text, index)) {
      const start = index;

      while (isAsciiLetterOrDigit(text, index)) {
        index += 1;
      }

      segments.push(text.slice(start, index));
      continue;
    }

    const last = Math.max(segments.length - 1, 0);
    segments[last] ??= "";
    segments[last] += text[index];
    index += 1;
  }

  return segments;
};

export const splitFadeText = (
  text: string,
  segmenter: Intl.Segmenter | null
): string[] => {
  if (isAscii(text)) {
    return splitAscii(text);
  }

  if (segmenter === null) {
    const parts = [...(text.match(WORD_WITH_SPACE) ?? [])];

    return parts.length > 0 || text.length === 0 ? parts : [text];
  }

  const segments: string[] = [];

  for (const { segment, isWordLike } of segmenter.segment(text)) {
    if (BLANK.test(segment) || !isWordLike) {
      const last = Math.max(segments.length - 1, 0);
      segments[last] ??= "";
      segments[last] += segment;
    } else {
      segments.push(segment);
    }
  }

  return segments;
};

/** `new Intl.Segmenter(undefined, { granularity: "word" })`, or null where it is missing. */
export const createWordSegmenter = (): Intl.Segmenter | null => {
  try {
    return new Intl.Segmenter(undefined, { granularity: "word" });
  } catch {
    return null;
  }
};

// Keys.

interface PreviousSegment {
  content: string;
  key: string;
}

export interface FadeKeyState {
  nextSegmentId: number;
  previousSegments: PreviousSegment[];
}

export const createFadeKeyState = (): FadeKeyState => ({
  nextSegmentId: 0,
  previousSegments: [],
});

/**
 * A segment keeps the key of the previous segment at its index
 * when the content matches or extends it, then of an unused previous segment
 * with the same content, else it gets a new key. Mutates `state`.
 */
const allocateKeys = (contents: string[], state: FadeKeyState): string[] => {
  const unused = new Set(state.previousSegments.keys());
  let byContent: Map<string, number[]> | undefined;

  const keys = contents.map((content, index) => {
    const same = state.previousSegments[index];

    if (
      same !== undefined &&
      unused.has(index) &&
      (same.content === content ||
        (same.content.length > 0 && content.startsWith(same.content)))
    ) {
      unused.delete(index);

      return same.key;
    }

    if (byContent === undefined && unused.size > 0) {
      byContent = new Map();

      for (let at = state.previousSegments.length - 1; at >= 0; at -= 1) {
        const previous = state.previousSegments[at];

        if (previous === undefined) {
          continue;
        }

        const list = byContent.get(previous.content) ?? [];
        list.push(at);
        byContent.set(previous.content, list);
      }
    }

    const candidates = byContent?.get(content);
    let found = candidates?.pop();

    while (found !== undefined && !unused.has(found)) {
      found = candidates?.pop();
    }

    const previous =
      found === undefined ? undefined : state.previousSegments[found];

    if (found !== undefined && previous !== undefined) {
      unused.delete(found);

      return previous.key;
    }

    const key = `fade-segment-${state.nextSegmentId}`;
    state.nextSegmentId += 1;

    return key;
  });

  state.previousSegments = keys.map((key, index) => ({
    content: contents[index] ?? "",
    key,
  }));

  return keys;
};

/** A candidate is allocated per render and committed once it is on screen. */
export const createFadeKeyStore = () => {
  let committed = createFadeKeyState();

  return {
    commit: (state: FadeKeyState) => {
      committed = state;
    },
    createCandidate: (): FadeKeyState => ({
      nextSegmentId: committed.nextSegmentId,
      previousSegments: committed.previousSegments,
    }),
  };
};

// Collecting segments.

interface TextEntry {
  keys: string[];
  segments: string[];
  startIndex: number;
}

interface ListItemEntry {
  segmentKey?: string;
  startIndex: number;
}

export interface FadeSegments {
  listItems: WeakMap<HastElement, ListItemEntry>;
  text: WeakMap<HastText, TextEntry>;
}

// Code (code, codespan) has no text tokens, so it never fades.
const CODE_TAGS = new Set(["code", "pre"]);

/**
 * Splits every text node into segments in document order,
 * numbers them across the whole document, and gives each its key. A list item
 * is decorated with the key of the first segment it contains.
 */
export const collectFadeSegments = (
  nodes: HastNode[],
  segmenter: Intl.Segmenter | null,
  state: FadeKeyState
): FadeSegments => {
  const contents: string[] = [];
  const textEntries: TextEntry[] = [];
  const itemEntries: ListItemEntry[] = [];

  const result: FadeSegments = {
    listItems: new WeakMap(),
    text: new WeakMap(),
  };

  const visit = (list: HastNode[]) => {
    for (const node of list) {
      if (node.type === "text") {
        // Newline text between blocks is layout, not a text token.
        if (node.value === "\n") {
          continue;
        }

        const segments = splitFadeText(node.value, segmenter);
        const entry = { keys: [], segments, startIndex: contents.length };
        result.text.set(node, entry);
        textEntries.push(entry);
        contents.push(...segments);
      } else if (node.type === "element" && !CODE_TAGS.has(node.tagName)) {
        if (node.tagName === "li") {
          const item = { startIndex: contents.length } as ListItemEntry;
          result.listItems.set(node, item);
          itemEntries.push(item);
        }

        visit(node.children);
      }
    }
  };

  visit(nodes);
  const keys = allocateKeys(contents, state);

  for (const entry of textEntries) {
    entry.keys = keys.slice(
      entry.startIndex,
      entry.startIndex + entry.segments.length
    );
  }

  for (const item of itemEntries) {
    item.segmentKey = keys[item.startIndex];
  }

  return result;
};

// ---- rendering -----------------------------------------------------

export interface FadeConfig extends FadeDelay {
  /** Class of a fading span. */
  fadeInClassName: string;
  /** Class of a list item whose marker fades. */
  listDecorationClassName: string;
  segments: FadeSegments;
  timeline: FadeSegmentTimeline;
}

/** One span per segment. */
export const renderFadeText = (
  node: HastText,
  config: FadeConfig
): ReactNode => {
  const entry = config.segments.text.get(node);

  if (entry === undefined) {
    return;
  }

  return entry.segments.map((segment, offset) =>
    createElement(
      "span",
      {
        ...fadeSegmentProps({
          className: config.fadeInClassName,
          fadeSegmentDelayMs: config.fadeSegmentDelayMs,
          fadeSegmentMaxDelayMs: config.fadeSegmentMaxDelayMs,
          segmentIndex: entry.startIndex + offset,
          segmentKey: entry.keys[offset],
          timeline: config.timeline,
        }),
        key: entry.keys[offset] ?? `fade-${entry.startIndex + offset}`,
      },
      segment
    )
  );
};

/** The fade props of a list item (a task item fades whole, others fade their marker). */
export const listItemFadeProps = (
  node: HastElement,
  config: FadeConfig
): FadeSegmentProps | undefined => {
  const entry = config.segments.listItems.get(node);

  if (entry === undefined) {
    return;
  }

  const task = Array.isArray(node.properties.className)
    ? node.properties.className.includes("task-list-item")
    : false;

  return fadeSegmentProps({
    className: task ? config.fadeInClassName : config.listDecorationClassName,
    fadeSegmentDelayMs: config.fadeSegmentDelayMs,
    fadeSegmentMaxDelayMs: config.fadeSegmentMaxDelayMs,
    segmentIndex: entry.startIndex,
    segmentKey: entry.segmentKey,
    timeline: config.timeline,
  });
};
