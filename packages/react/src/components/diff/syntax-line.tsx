/* oxlint-disable shadcn/no-inline-styles -- the app sets each token's --diffs-token-light/-dark inline; the values come from the code theme, not from this project's tokens. */

/*
 * The DOM of a highlighted diff line.
 *
 * A token with outer whitespace splits into the whitespace and the trimmed
 * token. A token is a span with its --diffs-token-light/-dark style and its
 * offset in `data-char`. The word diff ranges cut the tokens into pieces and
 * wrap them, and pieces of one token regroup under a span that carries the
 * offset.
 */

import type { CSSProperties, ReactElement } from "react";

import { DEFAULT_SYNTAX_THEMES } from "./code-themes";
import type { RoleToken } from "./syntax-highlight";
import { resolveRoleStyle } from "./syntax-theme";
import type { SyntaxThemes, ZedTheme } from "./syntax-theme";

const styleCache = new Map<string, CSSProperties>();

const themeStyle = (theme: ZedTheme, role: string | undefined) => {
  const fallback = theme.style["editor.foreground"];

  if (role === undefined) {
    return { color: fallback, italic: false, weight: 0 };
  }

  const resolved = resolveRoleStyle(theme, role);

  return { ...resolved, color: resolved.color ?? fallback };
};

/**
 * The token style: `--diffs-token-light` and `--diffs-token-dark`
 * (the engine's `htmlStyle` with `defaultColor: false` and the `token`
 * prefix). The developer themes agree on italic and weight, so those are plain
 * declarations; the engine writes a theme-less declaration in that case too.
 */
export const tokenStyle = (
  role: string | undefined,
  themes: SyntaxThemes = DEFAULT_SYNTAX_THEMES
): CSSProperties => {
  const key = `${themes.light.name}\u0000${themes.dark.name}\u0000${role ?? ""}`;
  const cached = styleCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const light = themeStyle(themes.light, role);
  const dark = themeStyle(themes.dark, role);

  const entries: [string, number | string][] = [
    ["--diffs-token-dark", dark.color],
    ["--diffs-token-light", light.color],
  ];

  if (light.italic && dark.italic) {
    entries.push(["fontStyle", "italic"]);
  } else if (light.italic) {
    entries.push(["--diffs-token-light-font-style", "italic"]);
  } else if (dark.italic) {
    entries.push(["--diffs-token-dark-font-style", "italic"]);
  }

  if (light.weight !== 0 && light.weight === dark.weight) {
    entries.push(["fontWeight", light.weight]);
  } else {
    if (light.weight !== 0) {
      entries.push(["--diffs-token-light-font-weight", light.weight]);
    }

    if (dark.weight !== 0) {
      entries.push(["--diffs-token-dark-font-weight", dark.weight]);
    }
  }

  // SAFETY: CSSProperties has no keys for custom properties; React sets every
  // key of the style object, custom properties included, with setProperty.
  const style = Object.fromEntries(entries) as CSSProperties;
  styleCache.set(key, style);

  return style;
};

/** A span of the line: a token piece (text) or a word diff wrapper (children). */
interface LineNode {
  children: LineNode[];
  dataChar: number | undefined;
  diffSpan: boolean;
  style: CSSProperties | undefined;
  text: string | undefined;
}

export interface LineRange {
  length: number;
  start: number;
}

interface Piece {
  content: string;
  offset: number;
  style: CSSProperties | undefined;
}

/** Split a token around its outer whitespace. */
const splitTokens = (
  tokens: readonly RoleToken[],
  themes: SyntaxThemes
): Piece[] =>
  tokens.flatMap((token) => {
    const style = tokenStyle(token.role, themes);
    const trimmed = token.content.trim();

    if (trimmed === "" || trimmed === token.content) {
      return [{ content: token.content, offset: token.offset, style }];
    }

    const lead = token.content.indexOf(trimmed);
    const end = lead + trimmed.length;

    return [
      {
        content: token.content.slice(0, lead),
        offset: token.offset,
        style: undefined,
      },
      { content: trimmed, offset: token.offset + lead, style },
      {
        content: token.content.slice(end),
        offset: token.offset + end,
        style: undefined,
      },
    ];
  });

const tokenNode = (
  content: string,
  offset: number,
  style: CSSProperties | undefined
): LineNode => ({
  children: [],
  dataChar: offset,
  diffSpan: false,
  style,
  text: content,
});

/** One span per token. */
const plainNodes = (pieces: readonly Piece[]) =>
  pieces.flatMap((piece) =>
    piece.content === ""
      ? []
      : [tokenNode(piece.content, piece.offset, piece.style)]
  );

const rangeAt = (ranges: readonly LineRange[], index: number) =>
  ranges.find(
    (range) =>
      range.length > 0 &&
      index >= range.start &&
      index < range.start + range.length
  );

/** The next position after `position` where a range starts, up to `limit`. */
const nextEdge = (
  ranges: readonly LineRange[],
  position: number,
  limit: number
) => {
  let edge = limit;

  for (const range of ranges) {
    if (range.length > 0 && range.start > position && range.start < edge) {
      edge = range.start;
    }
  }

  return edge;
};

/** Cut the tokens at the range edges and wrap the pieces inside a range. */
const decoratedNodes = (
  pieces: readonly Piece[],
  ranges: readonly LineRange[]
): LineNode[] => {
  const root: LineNode[] = [];
  let wrapper: LineNode | undefined;
  let wrapperRange: LineRange | undefined;

  for (const piece of pieces) {
    const tokenStart = piece.offset;
    const tokenEnd = tokenStart + piece.content.length;
    let position = tokenStart;

    while (position < tokenEnd) {
      const range = rangeAt(ranges, position);

      const end = range
        ? Math.min(tokenEnd, range.start + range.length)
        : nextEdge(ranges, position, tokenEnd);

      const node = tokenNode(
        piece.content.slice(position - tokenStart, end - tokenStart),
        tokenStart,
        piece.style
      );

      if (range === undefined) {
        wrapper = undefined;
        wrapperRange = undefined;
        root.push(node);
      } else {
        if (wrapper === undefined || wrapperRange !== range) {
          wrapper = {
            children: [],
            dataChar: undefined,
            diffSpan: true,
            style: undefined,
            text: undefined,
          };
          wrapperRange = range;
          root.push(wrapper);
        }

        wrapper.children.push(node);
      }

      position = end;
    }
  }

  return root;
};

/** Offsets are not negative, so these two never collide with a token offset. */
const NO_TOKEN = -1;
const MULTIPLE_TOKENS = -2;

const clearDataChar = (node: LineNode) => {
  node.dataChar = undefined;

  for (const child of node.children) {
    clearDataChar(child);
  }
};

/** What a child adds to the token a parent holds. */
const mergeToken = (held: number, found: number) => {
  if (found === NO_TOKEN) {
    return held;
  }

  if (found === MULTIPLE_TOKENS || (held !== NO_TOKEN && held !== found)) {
    return MULTIPLE_TOKENS;
  }

  return found;
};

/** A run of pieces of one token as one node: the piece itself, or a span around several. */
const groupNode = (group: readonly LineNode[], offset: number): LineNode => {
  const [only] = group;

  if (group.length === 1 && only !== undefined) {
    for (const child of only.children) {
      clearDataChar(child);
    }

    only.dataChar = offset;

    return only;
  }

  for (const member of group) {
    clearDataChar(member);
  }

  return {
    children: [...group],
    dataChar: offset,
    diffSpan: false,
    style: undefined,
    text: undefined,
  };
};

/** Regroup the pieces of one token under a span that carries its offset. */
const regroup = (node: LineNode): number => {
  if (node.dataChar !== undefined) {
    return node.dataChar;
  }

  let held = NO_TOKEN;
  const output: LineNode[] = [];
  let group: LineNode[] = [];
  let groupChar = NO_TOKEN;

  const flush = () => {
    if (group.length > 0 && groupChar >= 0) {
      output.push(groupNode(group, groupChar));
    }

    group = [];
    groupChar = NO_TOKEN;
  };

  for (const child of node.children) {
    const found = regroup(child);
    held = mergeToken(held, found);

    if (found >= 0) {
      if (groupChar >= 0 && groupChar !== found) {
        flush();
      }

      groupChar = found;
      group.push(child);
    } else {
      flush();
      output.push(child);
    }
  }

  flush();
  node.children = output;

  return held;
};

const toElement = (node: LineNode, key: number): ReactElement => (
  <span
    data-char={node.dataChar}
    data-diff-span={node.diffSpan ? "" : undefined}
    key={key}
    style={node.style}
  >
    {node.text ?? node.children.map((child, index) => toElement(child, index))}
  </span>
);

/**
 * The children of a highlighted `[data-line]`. Returns undefined when the
 * tokens do not spell the line text, so the caller shows the plain line.
 */
export const renderTokenLine = (
  text: string,
  tokens: readonly RoleToken[],
  ranges: readonly LineRange[] | undefined,
  themes: SyntaxThemes = DEFAULT_SYNTAX_THEMES
): ReactElement[] | undefined => {
  if (tokens.map((token) => token.content).join("") !== text) {
    return undefined;
  }

  const pieces = splitTokens(tokens, themes);

  if (ranges === undefined || ranges.length === 0) {
    return plainNodes(pieces).map((node, index) => toElement(node, index));
  }

  const line: LineNode = {
    children: decoratedNodes(
      pieces.filter((piece) => piece.content !== ""),
      ranges
    ),
    dataChar: undefined,
    diffSpan: false,
    style: undefined,
    text: undefined,
  };

  regroup(line);

  return line.children.map((node, index) => toElement(node, index));
};
