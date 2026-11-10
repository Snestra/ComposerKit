/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable eslint/no-nested-ternary -- Stylistic; kept in the form. */
/* oxlint-disable eslint/prefer-destructuring -- Stylistic. */
/* oxlint-disable eslint/prefer-named-capture-group -- The parser reads capture groups by position. */
/* oxlint-disable eslint/require-unicode-regexp -- The patterns are CommonMark, GFM and ANSI grammar kept without the u flag, which rejects the escaped punctuation classes they use. */
/* oxlint-disable unicorn/prefer-code-point -- Stylistic; the code compares UTF-16 code units of the escape and BOM characters. */

/**
 * Front-matter reader for the markdown file preview: a leading
 * `---` block with flat `key: value` entries, `key:` followed by `- item`
 * lists, and inline `[a, b]` lists. Nested maps and block scalars are skipped.
 */

export type FrontMatterValue = string | string[];

export interface FrontMatterEntry {
  key: string;
  value: FrontMatterValue;
}

export interface FrontMatter {
  body: string;
  entries: FrontMatterEntry[];
}

const BLOCK_SCALAR = /^[>|][+-]?$/;
const FENCE_LINE = /^-{3,}$/;
const LIST_ITEM = /^[ \t]*-[ \t]*(.*)$/;
const INDENTED = /^[ \t]/;
const WHITESPACE = /\s/;

const splitLines = (value: string): string[] =>
  value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");

const lineEnd = (value: string, from: number): number => {
  const newline = value.indexOf("\n", from);

  if (newline === -1) {
    return value.length;
  }

  return value[newline - 1] === "\r" ? newline - 1 : newline;
};

const nextLineStart = (value: string, at: number): number => {
  if (value[at] === "\r" && value[at + 1] === "\n") {
    return at + 2;
  }

  return value[at] === "\n" ? at + 1 : at;
};

const skipWhitespace = (value: string, from: number): number => {
  let index = from;

  while (index < value.length && WHITESPACE.test(value[index] ?? "")) {
    index += 1;
  }

  return index;
};

const escapeValue = (char: string): string => {
  switch (char) {
    case "n": {
      return "\n";
    }

    case "r": {
      return "\r";
    }

    case "t": {
      return "\t";
    }

    default: {
      return char;
    }
  }
};

const readQuoted = (
  value: string,
  from: number,
  mustEnd: boolean
): { nextIndex: number; value: string } | null => {
  const quote = value[from];
  let result = "";
  let index = from + 1;

  while (index < value.length) {
    const char = value[index] ?? "";

    if (quote === '"' && char === "\\") {
      if (index + 1 >= value.length) {
        return null;
      }

      result += escapeValue(value[index + 1] ?? "");
      index += 2;
    } else if (quote === "'" && char === "'" && value[index + 1] === "'") {
      result += "'";
      index += 2;
    } else {
      if (char === quote) {
        const after = index + 1;

        if (mustEnd && value.slice(after).trim().length > 0) {
          return null;
        }

        return { nextIndex: after, value: result };
      }

      result += char;
      index += 1;
    }
  }

  return null;
};

const looksNested = (value: string): boolean =>
  value.startsWith("-") || /:\s/.test(value);

const readScalar = (value: string): string | null => {
  const first = value[0];

  if (
    value.startsWith("[") ||
    value.startsWith("{") ||
    BLOCK_SCALAR.test(value)
  ) {
    return null;
  }

  if (first === '"' || first === "'") {
    return readQuoted(value, 0, true)?.value ?? null;
  }

  return value;
};

const readFlowItem = (
  value: string,
  from: number
): { nextIndex: number; value: string } | null => {
  const first = value[from];

  if (first === '"' || first === "'") {
    return readQuoted(value, from, false);
  }

  if (first === "[" || first === "{") {
    return null;
  }

  let end = from;

  while (end < value.length && value[end] !== "," && value[end] !== "]") {
    end += 1;
  }

  const item = value.slice(from, end).trim();

  return item.length === 0 || looksNested(item)
    ? null
    : { nextIndex: end, value: item };
};

const readFlowList = (value: string): string[] | null => {
  const items: string[] = [];
  let index = 1;

  while (index < value.length) {
    index = skipWhitespace(value, index);

    if (value[index] === "]") {
      return value.slice(index + 1).trim().length === 0 ? items : null;
    }

    const item = readFlowItem(value, index);

    if (item === null) {
      return null;
    }

    items.push(item.value);
    index = skipWhitespace(value, item.nextIndex);

    if (value[index] === ",") {
      index += 1;
    } else {
      return value[index] === "]" && value.slice(index + 1).trim().length === 0
        ? items
        : null;
    }
  }

  return null;
};

const readInlineValue = (value: string): FrontMatterValue | null => {
  if (BLOCK_SCALAR.test(value) || value.startsWith("{")) {
    return null;
  }

  return value.startsWith("[") ? readFlowList(value) : readScalar(value);
};

const readBlockList = (
  lines: string[],
  from: number
): { items: string[]; nextIndex: number } | null => {
  const items: string[] = [];
  let index = from;
  let found = false;

  while (index < lines.length) {
    const match = LIST_ITEM.exec(lines[index] ?? "");

    if (match === null) {
      break;
    }

    found = true;
    const raw = (match[1] ?? "").trim();
    const first = raw[0];

    const item =
      first === '"' || first === "'"
        ? readScalar(raw)
        : looksNested(raw)
          ? null
          : readScalar(raw);

    if (item !== null) {
      items.push(item);
    }

    index += 1;
  }

  return found ? { items, nextIndex: index } : null;
};

const readEntries = (
  block: string
): { entries: FrontMatterEntry[]; hasMetadataSyntax: boolean } => {
  const lines = splitLines(block);
  const entries: FrontMatterEntry[] = [];
  let hasMetadataSyntax = false;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (
      trimmed.length === 0 ||
      trimmed.startsWith("#") ||
      INDENTED.test(line)
    ) {
      index += 1;
      continue;
    }

    const colon = line.indexOf(":");
    const key = colon === -1 ? "" : line.slice(0, colon).trim();

    if (colon <= 0 || key.length === 0 || key.startsWith("-")) {
      index += 1;
      continue;
    }

    hasMetadataSyntax = true;
    const rest = line.slice(colon + 1).trim();

    if (rest.length === 0) {
      const list = readBlockList(lines, index + 1);

      if (list !== null) {
        if (list.items.length > 0) {
          entries.push({ key, value: list.items });
        }

        index = list.nextIndex;
        continue;
      }

      const following = lines[index + 1];

      if (
        following !== undefined &&
        INDENTED.test(following) &&
        following.trim().length > 0
      ) {
        index += 1;
        continue;
      }

      entries.push({ key, value: "" });
      index += 1;
      continue;
    }

    const value = readInlineValue(rest);

    if (value !== null && (!Array.isArray(value) || value.length > 0)) {
      entries.push({ key, value });
    }

    index += 1;
  }

  return { entries, hasMetadataSyntax };
};

/** Returns the metadata entries and the body, or `null` without front matter. */
export const parseFrontMatter = (source: string): FrontMatter | null => {
  const offset = source.charCodeAt(0) === 65_279 ? 1 : 0;
  const firstEnd = lineEnd(source, offset);

  if (!FENCE_LINE.test(source.slice(offset, firstEnd).trim())) {
    return null;
  }

  const blockStart = nextLineStart(source, firstEnd);
  let cursor = blockStart;

  while (cursor < source.length) {
    const end = lineEnd(source, cursor);

    if (FENCE_LINE.test(source.slice(cursor, end).trim())) {
      const parsed = readEntries(source.slice(blockStart, cursor));

      return parsed.hasMetadataSyntax
        ? {
            body: source.slice(nextLineStart(source, end)),
            entries: parsed.entries,
          }
        : null;
    }

    cursor = nextLineStart(source, end);

    if (cursor === end) {
      break;
    }
  }

  return null;
};
