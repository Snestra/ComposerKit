/* oxlint-disable anti-slop/no-runtime-typeof, typescript/no-misused-spread -- Values may be a string or a list, and the reference parsers walk strings by code point. */
/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable anti-slop/no-unsafe-dictionary-type -- Hast element properties are an open attribute dictionary. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion, typescript/non-nullable-type-assertion-style -- SAFETY: custom properties in style objects, children props read after an element check, and regex matches checked before use. */
/* oxlint-disable eslint/complexity -- The parsers are single-pass state machines that follow the reference algorithms branch for branch. */
/* oxlint-disable eslint/no-nested-ternary -- Stylistic; kept in the form. */
/* oxlint-disable eslint/no-use-before-define -- The constants and helpers are read at render time, after the module has loaded. */
/* oxlint-disable eslint/prefer-destructuring, unicorn/no-useless-collection-argument -- Stylistic. */
/* oxlint-disable eslint/prefer-named-capture-group -- The grammars are written with positional groups, as the reference parsers do. */
/* oxlint-disable eslint/require-unicode-regexp -- The patterns are CommonMark, GFM and ANSI grammar kept without the u flag, which rejects the escaped punctuation classes they use. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional flags, regex groups and empty strings by truthiness, as react-markdown and the component do. */
/* oxlint-disable unicorn/consistent-function-scoping -- Stylistic; the helper closes over the parser state. */
/* oxlint-disable unicorn/no-array-for-each -- Stylistic; the loops need the index and the closure. */
/* oxlint-disable unicorn/prefer-number-coercion -- Stylistic; parseInt reads the leading digits of an escape parameter. */

/**
 * Markdown parser for the markdown family. The component renders with
 * react-markdown (remark and rehype, vendored third-party code); the library
 * has no markdown dependency, so this module parses CommonMark blocks and
 * inlines, GFM tables, task lists and strikethrough (single tilde off), line
 * breaks and `remark-directive` style directives into the same hast shape
 * (text, element and raw nodes) that react-markdown's component map consumes.
 */

export interface HastText {
  type: "text";
  value: string;
}

export interface HastRaw {
  type: "raw";
  value: string;
}

export interface HastElement {
  children: HastNode[];
  properties: Record<string, unknown>;
  tagName: string;
  type: "element";
}

export type HastNode = HastElement | HastRaw | HastText;

type FootnoteContent = string | HastNode | HastNode[];

/** The footnote options of mdast-util-to-hast (`remarkRehypeOptions`). */
export interface FootnoteOptions {
  /** Prefix of the `id` attributes. Default `user-content-`. */
  clobberPrefix?: string;
  /** Back-reference content. Default `↩`, plus a superscript count after the first. */
  footnoteBackContent?:
    | FootnoteContent
    | ((referenceIndex: number, rereferenceIndex: number) => FootnoteContent);
  /** Back-reference `aria-label`. Default `Back to reference N[-M]`. */
  footnoteBackLabel?:
    | string
    | ((referenceIndex: number, rereferenceIndex: number) => string);
  /** Heading text of the footnotes section. Default `Footnotes`. */
  footnoteLabel?: string;
  /** Heading properties. Default `{ className: ["sr-only"] }`. */
  footnoteLabelProperties?: Record<string, unknown>;
  /** Heading tag. Default `h2`. */
  footnoteLabelTagName?: string;
}

export interface ParseOptions {
  /** Footnote section options (mdast-util-to-hast). */
  footnotes?: FootnoteOptions;
  /** Convert soft line breaks to `<br>`. */
  breakNewLines?: boolean;
  /**
   * Math syntax of remark-math with `singleDollarTextMath` off: `$$` fenced
   * blocks become `pre > code.language-math.math-display` and `$$...$$` runs
   * become `code.language-math.math-inline`, the shape rehype-katex reads.
   */
  math?: boolean;
  /** Names of the registered directives. */
  directives?: readonly string[];
  /** GFM tables, task lists and strikethrough. Default true. */
  gfm?: boolean;
  /**
   * Where a task item's checkbox goes. `inline` (remark-gfm) puts it at the
   * start of the first paragraph; `leading` makes it the
   * first child of the item, before the content.
   */
  taskCheckbox?: "inline" | "leading";
  /**
   * Gives every table cell a `data-ck-col-size` (`sm`, `md`, `lg` or `xl`) from
   * the longest text in its column.
   */
  tableColumnSizes?: boolean;
  /**
   * Puts the table's own markdown on the `table` element as `markdownSource`
   * (the table renderer copies it as text/plain). The table component
   * must take the prop, because a plain `table` tag would pass it to the DOM.
   */
  tableMarkdownSource?: boolean;
}

/** A top-level block with the range it was parsed from. */
export interface ParsedBlock {
  endOffset: number;
  hasBlankLineAfter: boolean;
  node: HastElement | HastRaw;
  startLine: number;
  startOffset: number;
}

interface Definition {
  href: string;
  title?: string;
}

interface FootnoteState {
  /** Times each footnote was referenced, by upper-cased identifier. */
  counts: Map<string, number>;
  /** Body lines of the first definition of each identifier. */
  definitions: Map<string, string[]>;
  /** Identifiers with a definition anywhere in the document (calls need one). */
  labels: ReadonlySet<string>;
  options: FootnoteOptions;
  /** Identifiers in order of first reference. */
  order: string[];
}

interface Context {
  breakNewLines: boolean;
  /** Link reference definitions of the document, by normalized label. */
  definitions: ReadonlyMap<string, Definition>;
  /** Directive syntax is parsed when any directive is registered (remark-directive). */
  directiveMode: boolean;
  directives: ReadonlySet<string>;
  footnotes: FootnoteState;
  gfm: boolean;
  math: boolean;
  taskCheckbox: "inline" | "leading";
  tableColumnSizes: boolean;
  tableMarkdownSource: boolean;
}

interface Entry {
  end: number;
  node: HastElement | HastRaw;
  start: number;
}

const el = (
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[]
): HastElement => ({ children, properties, tagName, type: "element" });

const text = (value: string): HastText => ({ type: "text", value });

/**
 * A directive keeps its name when it is registered; any other directive is
 * replaced by its children.
 */
const directiveElement = (
  ctx: Pick<Context, "directives">,
  name: string,
  attributes: Record<string, unknown>,
  children: HastNode[]
): HastElement =>
  ctx.directives.has(name)
    ? el(name, attributes, children)
    : el("#unwrap", {}, children);

const NEWLINE = text("\n");

const BLANK = /^\s*$/;
const FENCE_OPEN = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/;

// micromark-extension-math flow: two or more dollars, then a meta without any.
const MATH_FENCE_OPEN = /^( {0,3})(\$\$+)[ \t]*([^$]*)$/;
const MATH_PADDING = /^[ \n]$/;
const MATH_DATA = /[^ \n]/;
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?/;
const BULLET = /^( {0,3})([-+*])( +|\t|$)/;
const ORDERED = /^( {0,3})(\d{1,9})([.)])( +|\t|$)/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;

// GFM footnotes: `[^label]` (no whitespace or brackets) and `[^label]: body`.
const FOOTNOTE_LABEL = String.raw`((?:\\.|[^\s[\]\\])+)`;

const FOOTNOTE_DEFINITION = new RegExp(
  String.raw`^ {0,3}\[\^${FOOTNOTE_LABEL}\]:[ \t]*(.*)$`
);

const FOOTNOTE_CALL = new RegExp(String.raw`^\[\^${FOOTNOTE_LABEL}\]`);

const FOOTNOTE_DEFINITION_ANYWHERE = new RegExp(
  String.raw`^[ \t>]*(?:(?:[-+*]|\d{1,9}[.)])[ \t]+)*\[\^${FOOTNOTE_LABEL}\]:`
);

const TABLE_DELIMITER =
  /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

const HTML_BLOCK = /^ {0,3}<(?:\/?[A-Za-z][A-Za-z0-9-]*(?:[\s/>]|$)|!--)/;

const CONTAINER_DIRECTIVE =
  /^:{3,}[ \t]*([A-Za-z][\w-]*)(\[[^\]]*\])?(\{[^}]*\})?[ \t]*$/;

const CONTAINER_CLOSE = /^:{3,}[ \t]*$/;

const LEAF_DIRECTIVE = /^::([A-Za-z][\w-]*)(\[[^\]]*\])?(\{[^}]*\})?[ \t]*$/;

const DEFINITION =
  /^ {0,3}\[((?:[^\]\\]|\\.)+)\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^)\\]|\\.)*\)))?[ \t]*$/u;

const TASK = /^\[( |x|X)\][ \t]+/;
const NEWLINES = /\r\n?/g;
const TAB = /\t/g;
const TRAILING_SPACES = /[ \t]+$/;
const LEADING_SPACES = /^[ \t]+/;

const indentOf = (line: string): number => {
  let width = 0;

  for (const char of line) {
    if (char === " ") {
      width += 1;
    } else if (char === "\t") {
      width += 4 - (width % 4);
    } else {
      break;
    }
  }

  return width;
};

const stripIndent = (line: string, width: number): string => {
  let removed = 0;
  let index = 0;

  while (index < line.length && removed < width) {
    const char = line[index];

    if (char === " ") {
      removed += 1;
    } else if (char === "\t") {
      removed += 4 - (removed % 4);
    } else {
      break;
    }

    index += 1;
  }

  return line.slice(index);
};

const isBlank = (line: string | undefined): boolean =>
  line === undefined || BLANK.test(line);

const startsFence = (line: string): boolean => {
  const match = FENCE_OPEN.exec(line);

  return (
    match !== null && !(match[2]?.startsWith("`") && match[3]?.includes("`"))
  );
};

const interruptsParagraph = (line: string, ctx: Context): boolean => {
  if (isBlank(line)) {
    return true;
  }

  if (indentOf(line) >= 4) {
    return false;
  }

  if (
    startsFence(line) ||
    ATX.test(line) ||
    HR.test(line) ||
    QUOTE.test(line) ||
    (ctx.gfm && FOOTNOTE_DEFINITION.test(line)) ||
    (ctx.math && MATH_FENCE_OPEN.test(line))
  ) {
    return true;
  }

  const bullet = BULLET.exec(line);

  if (bullet && line.slice(bullet[0].length).trim() !== "") {
    return true;
  }

  const ordered = ORDERED.exec(line);

  if (
    ordered &&
    ordered[2] === "1" &&
    line.slice(ordered[0].length).trim() !== ""
  ) {
    return true;
  }

  return ctx.directiveMode && CONTAINER_DIRECTIVE.test(line);
};

// A table body ends at a blank line or at the start of another block. A table
// is not a paragraph, so every list item (any ordered start, empty or not),
// rule, fence, heading, quote and directive container interrupts it
// (micromark-extension-gfm-table dynamic interrupt).
const interruptsTable = (line: string, ctx: Context): boolean =>
  isBlank(line) ||
  (indentOf(line) < 4 &&
    (startsFence(line) ||
      ATX.test(line) ||
      HR.test(line) ||
      QUOTE.test(line) ||
      FOOTNOTE_DEFINITION.test(line) ||
      BULLET.test(line) ||
      ORDERED.test(line) ||
      (ctx.directiveMode && CONTAINER_DIRECTIVE.test(line))));

// ---- entities and escapes -------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  copy: "©",
  gt: ">",
  hellip: "…",
  lt: "<",
  mdash: "—",
  nbsp: "\u00A0",
  ndash: "–",
  quot: '"',
};

const ENTITY =
  /&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});/g;

const decodeEntities = (value: string): string =>
  value.replaceAll(ENTITY, (whole, body: string) => {
    if (body.startsWith("#")) {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);

      return code > 0 && code <= 0x10_ff_ff
        ? String.fromCodePoint(code)
        : "\uFFFD";
    }

    return NAMED_ENTITIES[body] ?? whole;
  });

const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/;
const UNICODE_WHITESPACE = /[\s\u00A0]/u;
const UNICODE_PUNCTUATION = /[\p{P}\p{S}]/u;

// ---- inline parsing -------------------------------------------------------

interface DelimItem {
  canClose: boolean;
  canOpen: boolean;
  char: string;
  count: number;
  kind: "delim";
  original: number;
}

interface NodeItem {
  kind: "node";
  node: HastNode;
}

interface BracketItem {
  active: boolean;
  image: boolean;
  index: number;
  /** Offset in the source text just after the opening bracket. */
  position: number;
}

type InlineItem = DelimItem | NodeItem;

const flanking = (
  before: string,
  after: string,
  char: string
): { canClose: boolean; canOpen: boolean } => {
  const afterWhite = after === "" || UNICODE_WHITESPACE.test(after);
  const beforeWhite = before === "" || UNICODE_WHITESPACE.test(before);
  const afterPunct = after !== "" && UNICODE_PUNCTUATION.test(after);
  const beforePunct = before !== "" && UNICODE_PUNCTUATION.test(before);
  const left = !afterWhite && (!afterPunct || beforeWhite || beforePunct);
  const right = !beforeWhite && (!beforePunct || afterWhite || afterPunct);

  if (char === "_") {
    return {
      canClose: right && (!left || afterPunct),
      canOpen: left && (!right || beforePunct),
    };
  }

  return { canClose: right, canOpen: left };
};

const matchCodeSpan = (
  value: string,
  start: number
): { end: number; node: HastElement } | undefined => {
  let ticks = 0;

  while (value[start + ticks] === "`") {
    ticks += 1;
  }

  let search = start + ticks;

  while (search < value.length) {
    const next = value.indexOf("`", search);

    if (next === -1) {
      return undefined;
    }

    let run = 0;

    while (value[next + run] === "`") {
      run += 1;
    }

    if (run === ticks) {
      let content = value.slice(start + ticks, next).replaceAll("\n", " ");

      if (
        content.length > 2 &&
        content.startsWith(" ") &&
        content.endsWith(" ") &&
        content.trim() !== ""
      ) {
        content = content.slice(1, -1);
      }

      return { end: next + run, node: el("code", {}, [text(content)]) };
    }

    search = next + run;
  }

  return undefined;
};

/**
 * Math (text) of micromark-extension-math with single dollars off: a run of
 * two or more dollars closes at a run of the same length. When the content
 * starts and ends with a space or line ending and holds other characters, one
 * of each is padding and is dropped.
 */
const matchMathText = (
  value: string,
  start: number
): { end: number; node: HastElement } | undefined => {
  let size = 0;

  while (value[start + size] === "$") {
    size += 1;
  }

  if (size < 2) {
    return undefined;
  }

  let search = start + size;

  while (search < value.length) {
    const next = value.indexOf("$", search);

    if (next === -1) {
      return undefined;
    }

    let run = 0;

    while (value[next + run] === "$") {
      run += 1;
    }

    if (run === size) {
      let content = value.slice(start + size, next);

      if (
        MATH_PADDING.test(content.slice(0, 1)) &&
        MATH_PADDING.test(content.slice(-1)) &&
        MATH_DATA.test(content)
      ) {
        content = content.slice(1, -1);
      }

      return {
        end: next + run,
        node: el("code", { className: ["language-math", "math-inline"] }, [
          text(content),
        ]),
      };
    }

    search = next + run;
  }

  return undefined;
};

const AUTOLINK_URI = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*)>/;

const AUTOLINK_EMAIL =
  /^<([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/;

const INLINE_HTML =
  /^<(?:\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^<>]*?)?\/?|!--[\s\S]*?--)>/;

const parseLinkTail = (
  value: string,
  start: number
): { end: number; href: string; title?: string } | undefined => {
  if (value[start] !== "(") {
    return undefined;
  }

  let index = start + 1;

  const skip = () => {
    while (index < value.length && /\s/.test(value[index] ?? "")) {
      index += 1;
    }
  };

  skip();
  let href = "";

  if (value[index] === "<") {
    const close = value.indexOf(">", index);

    if (close === -1 || value.slice(index, close).includes("\n")) {
      return undefined;
    }

    href = value.slice(index + 1, close);
    index = close + 1;
  } else {
    let depth = 0;
    const begin = index;

    while (index < value.length) {
      const char = value[index] ?? "";

      if (char === "\\" && ASCII_PUNCTUATION.test(value[index + 1] ?? "")) {
        index += 2;
        continue;
      }

      if (/\s/.test(char)) {
        break;
      }

      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        if (depth === 0) {
          break;
        }

        depth -= 1;
      }

      index += 1;
    }

    href = value.slice(begin, index);
  }

  skip();
  let title: string | undefined;
  const quote = value[index];

  if (quote === '"' || quote === "'" || quote === "(") {
    const closing = quote === "(" ? ")" : quote;
    let end = index + 1;

    while (end < value.length && value[end] !== closing) {
      end += value[end] === "\\" ? 2 : 1;
    }

    if (end >= value.length) {
      return undefined;
    }

    title = value.slice(index + 1, end);
    index = end + 1;
    skip();
  }

  if (value[index] !== ")") {
    return undefined;
  }

  const unescape = (raw: string) =>
    decodeEntities(raw.replaceAll(/\\([!-/:-@[-`{-~])/g, "$1"));

  return {
    end: index + 1,
    href: unescape(href),
    title: title === undefined ? undefined : unescape(title),
  };
};

const parseAttributes = (raw: string | undefined): Record<string, unknown> => {
  const attributes: Record<string, unknown> = {};

  if (!raw) {
    return attributes;
  }

  const body = raw.slice(1, -1);

  const pattern =
    /([#.])([\w-]+)|([A-Za-z_:][\w:.-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`}]+)))?/g;

  let match = pattern.exec(body);
  const classes: string[] = [];

  while (match) {
    if (match[1] === "#") {
      attributes.id = match[2];
    } else if (match[1] === ".") {
      classes.push(match[2] ?? "");
    } else if (match[3]) {
      attributes[match[3]] = match[4] ?? match[5] ?? match[6] ?? "";
    }

    match = pattern.exec(body);
  }

  if (classes.length > 0) {
    attributes.className = classes;
  }

  return attributes;
};

const mergeText = (nodes: HastNode[]): HastNode[] => {
  const merged: HastNode[] = [];

  for (const node of nodes) {
    const previous = merged.at(-1);

    if (node.type === "text" && previous?.type === "text") {
      previous.value += node.value;
    } else {
      merged.push(node.type === "text" ? text(node.value) : node);
    }
  }

  return merged;
};

const GFM_URL = /(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:*_~'")\]]/g;

const linkifyText = (value: string): HastNode[] => {
  const nodes: HastNode[] = [];
  let last = 0;

  for (const match of value.matchAll(GFM_URL)) {
    const index = match.index ?? 0;
    const before = value[index - 1] ?? "";

    if (index > 0 && !/[\s*_~(]/.test(before)) {
      continue;
    }

    let url = match[0];

    // Balance a trailing parenthesis the way GFM does.
    while (
      url.endsWith(")") &&
      (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)
    ) {
      url = url.slice(0, -1);
    }

    if (index > last) {
      nodes.push(text(value.slice(last, index)));
    }

    nodes.push(
      el("a", { href: url.startsWith("www.") ? `http://${url}` : url }, [
        text(url),
      ])
    );
    last = index + url.length;
  }

  if (nodes.length === 0) {
    return [text(value)];
  }

  if (last < value.length) {
    nodes.push(text(value.slice(last)));
  }

  return nodes;
};

const linkifyChildren = (nodes: HastNode[]): HastNode[] => {
  const result: HastNode[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      result.push(...linkifyText(node.value));
    } else if (
      node.type === "element" &&
      node.tagName !== "a" &&
      node.tagName !== "code"
    ) {
      result.push({ ...node, children: linkifyChildren(node.children) });
    } else {
      result.push(node);
    }
  }

  return result;
};

const wrapDelimiters = (items: InlineItem[], from: number): void => {
  // CommonMark "process emphasis" over items[from..].
  const openersBottom = new Map<string, number>();
  let closerIndex = from;

  while (closerIndex < items.length) {
    const closer = items[closerIndex];

    if (!closer || closer.kind !== "delim" || !closer.canClose) {
      closerIndex += 1;
      continue;
    }

    const key = `${closer.char}${closer.canOpen}${closer.original % 3}`;
    const bottom = openersBottom.get(key) ?? from - 1;
    let openerIndex = closerIndex - 1;
    let found = -1;

    while (openerIndex > bottom && openerIndex >= from) {
      const candidate = items[openerIndex];

      if (
        candidate?.kind === "delim" &&
        candidate.char === closer.char &&
        candidate.canOpen &&
        candidate.count > 0
      ) {
        const oddMatch =
          (candidate.canClose || closer.canOpen) &&
          closer.char !== "~" &&
          (candidate.original + closer.original) % 3 === 0 &&
          !(candidate.original % 3 === 0 && closer.original % 3 === 0);

        if (!oddMatch) {
          found = openerIndex;
          break;
        }
      }

      openerIndex -= 1;
    }

    if (found === -1) {
      openersBottom.set(key, closerIndex - 1);

      if (!closer.canOpen) {
        // Not usable any more: becomes text.
        items[closerIndex] = {
          kind: "node",
          node: text(closer.char.repeat(closer.count)),
        };
      }

      closerIndex += 1;
      continue;
    }

    const opener = items[found] as DelimItem;

    if (closer.char === "~") {
      if (opener.count < 2 || closer.count < 2) {
        closerIndex += 1;
        continue;
      }

      if (opener.count !== 2 || closer.count !== 2) {
        // Single tilde is off and runs other than two are literal.
        closerIndex += 1;
        continue;
      }
    }

    const used =
      closer.char === "~" ? 2 : opener.count >= 2 && closer.count >= 2 ? 2 : 1;

    const inner = items.slice(found + 1, closerIndex);

    const children = mergeText(
      inner.map((item) =>
        item.kind === "node" ? item.node : text(item.char.repeat(item.count))
      )
    );

    let tagName = "em";

    if (closer.char === "~") {
      tagName = "del";
    } else if (used === 2) {
      tagName = "strong";
    }

    const wrapped: NodeItem = {
      kind: "node",
      node: el(tagName, {}, children),
    };

    opener.count -= used;
    closer.count -= used;
    const replacement: InlineItem[] = [];

    if (opener.count > 0) {
      replacement.push(opener);
    }

    replacement.push(wrapped);
    const closerKept = closer.count > 0;

    if (closerKept) {
      replacement.push(closer);
    }

    items.splice(found, closerIndex - found + 1, ...replacement);
    closerIndex = found + replacement.length - (closerKept ? 1 : 0);
  }
};

const itemsToNodes = (items: InlineItem[]): HastNode[] =>
  mergeText(
    items.map((item) =>
      item.kind === "node" ? item.node : text(item.char.repeat(item.count))
    )
  );

// Image description: the plain text of the label, as mdast-util-to-string
// reads it (text, code and raw values, nested image alt, then children).
const altText = (nodes: HastNode[]): string =>
  nodes
    .map((node) => {
      if (node.type !== "element") {
        return node.value;
      }

      if (node.tagName === "img") {
        const { alt } = node.properties;

        return typeof alt === "string" ? alt : "";
      }

      return altText(node.children);
    })
    .join("");

const WHITESPACE_RUN = /\s+/gu;

/** Reference labels match without regard to case or runs of whitespace. */
const normalizeLabel = (label: string): string =>
  label.trim().replaceAll(WHITESPACE_RUN, " ").toLowerCase();

// micromark-util-sanitize-uri `normalizeUri`: percent-encodes what a URL
// cannot hold and keeps valid escapes, as the footnote ids are built with it.
const SAFE_URI_CHARACTER = /[!#$&-;=?-Z_a-z~]/;
const ALPHANUMERIC = /[0-9A-Za-z]/;

const normalizeUri = (value: string): string => {
  let result = "";
  const characters = [...value];

  characters.forEach((character, index) => {
    const code = character.codePointAt(0) ?? 0;

    if (
      character === "%" &&
      ALPHANUMERIC.test(characters[index + 1] ?? "") &&
      ALPHANUMERIC.test(characters[index + 2] ?? "")
    ) {
      result += character;
    } else if (code < 128) {
      result += SAFE_URI_CHARACTER.test(character)
        ? character
        : encodeURIComponent(character);
    } else if (code >= 0xd8_00 && code <= 0xdf_ff) {
      result += "%EF%BF%BD";
    } else {
      result += encodeURIComponent(character);
    }
  });

  return result;
};

/** The `<sup><a>` of a footnote call (mdast-util-to-hast `footnoteReference`). */
const footnoteCall = (state: FootnoteState, key: string): HastElement => {
  const prefix = state.options.clobberPrefix ?? "user-content-";
  const identifier = key.toUpperCase();
  const id = normalizeUri(identifier.toLowerCase());
  const known = state.counts.get(identifier);
  let count = known ?? 0;
  let number = state.order.indexOf(identifier) + 1;

  if (known === undefined) {
    state.order.push(identifier);
    number = state.order.length;
  }

  count += 1;
  state.counts.set(identifier, count);

  return el("sup", {}, [
    el(
      "a",
      {
        "aria-describedby": ["footnote-label"],
        "data-footnote-ref": true,
        href: `#${prefix}fn-${id}`,
        id: `${prefix}fnref-${id}${count > 1 ? `-${count}` : ""}`,
      },
      [text(String(number))]
    ),
  ]);
};

/** `[text][label]`, `[text][]` and `[text]` against the document's definitions. */
const parseReference = (
  value: string,
  closeIndex: number,
  position: number,
  definitions: ReadonlyMap<string, Definition>
): { end: number; href: string; title?: string } | undefined => {
  const label = value.slice(position, closeIndex);
  let key = label;
  let end = closeIndex + 1;

  if (value[end] === "[") {
    const close = value.indexOf("]", end);

    if (close !== -1) {
      const inner = value.slice(end + 1, close);
      key = inner === "" ? label : inner;
      end = close + 1;
    }
  }

  const definition = definitions.get(normalizeLabel(key));

  return definition === undefined ? undefined : { end, ...definition };
};

export const parseInline = (
  value: string,
  ctx: Pick<
    Context,
    | "breakNewLines"
    | "definitions"
    | "directiveMode"
    | "directives"
    | "footnotes"
    | "gfm"
    | "math"
  >
): HastNode[] => {
  const items: InlineItem[] = [];
  const brackets: BracketItem[] = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (buffer !== "") {
      items.push({ kind: "node", node: text(buffer) });
      buffer = "";
    }
  };

  const pushNode = (node: HastNode) => {
    flush();
    items.push({ kind: "node", node });
  };

  while (index < value.length) {
    const char = value[index] ?? "";

    if (char === "\\") {
      const next = value[index + 1] ?? "";

      if (next === "\n") {
        pushNode(el("br", {}, []));
        buffer += "\n";
        index += 2;
        continue;
      }

      if (ASCII_PUNCTUATION.test(next)) {
        buffer += next;
        index += 2;
        continue;
      }

      buffer += char;
      index += 1;
      continue;
    }

    if (char === "$" && ctx.math) {
      const span = matchMathText(value, index);

      if (span) {
        pushNode(span.node);
        index = span.end;
        continue;
      }

      // A failed run cannot start math from a later dollar of the same run.
      let run = 0;

      while (value[index + run] === "$") {
        run += 1;
      }

      buffer += value.slice(index, index + run);
      index += run;
      continue;
    }

    if (char === "`") {
      const span = matchCodeSpan(value, index);

      if (span) {
        pushNode(span.node);
        index = span.end;
        continue;
      }

      let run = 0;

      while (value[index + run] === "`") {
        run += 1;
      }

      buffer += "`".repeat(run);
      index += run;
      continue;
    }

    if (char === "\n") {
      const trailing = TRAILING_SPACES.exec(buffer);
      const hard = trailing !== null && trailing[0].length >= 2;

      if (trailing) {
        buffer = buffer.slice(0, trailing.index);
      }

      if (hard || ctx.breakNewLines) {
        pushNode(el("br", {}, []));
      }

      buffer += "\n";
      index += 1;

      while (value[index] === " " || value[index] === "\t") {
        index += 1;
      }

      continue;
    }

    if (char === "<") {
      const rest = value.slice(index);
      const uri = AUTOLINK_URI.exec(rest);
      const email = uri ? null : AUTOLINK_EMAIL.exec(rest);

      if (uri || email) {
        const match = (uri ?? email) as RegExpExecArray;
        const label = match[1] ?? "";
        pushNode(
          el("a", { href: email ? `mailto:${label}` : label }, [text(label)])
        );
        index += match[0].length;
        continue;
      }

      const html = INLINE_HTML.exec(rest);

      if (html) {
        pushNode({ type: "raw", value: html[0] });
        index += html[0].length;
        continue;
      }

      buffer += char;
      index += 1;
      continue;
    }

    if (char === "&") {
      const entity =
        /^&(?:#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});/.exec(
          value.slice(index)
        );

      if (entity) {
        buffer += decodeEntities(entity[0]);
        index += entity[0].length;
        continue;
      }

      buffer += char;
      index += 1;
      continue;
    }

    if (char === "!" && value[index + 1] === "[") {
      flush();
      brackets.push({
        active: true,
        image: true,
        index: items.length,
        position: index + 2,
      });
      items.push({ kind: "node", node: text("![") });
      index += 2;
      continue;
    }

    if (char === "[" && ctx.gfm && value[index + 1] === "^") {
      const call = FOOTNOTE_CALL.exec(value.slice(index));
      const key = call?.[1] === undefined ? "" : normalizeLabel(call[1]);

      if (call && ctx.footnotes.labels.has(key)) {
        pushNode(footnoteCall(ctx.footnotes, key));
        index += call[0].length;
        continue;
      }
    }

    if (char === "[") {
      flush();
      brackets.push({
        active: true,
        image: false,
        index: items.length,
        position: index + 1,
      });
      items.push({ kind: "node", node: text("[") });
      index += 1;
      continue;
    }

    if (char === "]") {
      flush();
      const opener = brackets.pop();

      if (!opener?.active) {
        buffer += "]";
        index += 1;
        continue;
      }

      const tail =
        parseLinkTail(value, index + 1) ??
        parseReference(value, index, opener.position, ctx.definitions);

      if (!tail) {
        items[opener.index] = {
          kind: "node",
          node: text(opener.image ? "![" : "["),
        };
        buffer += "]";
        index += 1;
        continue;
      }

      const inner = items.splice(opener.index + 1);
      items.pop();
      wrapDelimiters(inner, 0);
      const children = itemsToNodes(inner);

      if (opener.image) {
        const properties: Record<string, unknown> = {
          alt: altText(children),
          src: tail.href,
        };

        if (tail.title !== undefined) {
          properties.title = tail.title;
        }

        items.push({ kind: "node", node: el("img", properties, []) });
      } else {
        const properties: Record<string, unknown> = { href: tail.href };

        if (tail.title !== undefined) {
          properties.title = tail.title;
        }

        items.push({ kind: "node", node: el("a", properties, children) });

        for (const earlier of brackets) {
          if (!earlier.image) {
            earlier.active = false;
          }
        }
      }

      index = tail.end;
      continue;
    }

    if (char === "*" || char === "_" || (char === "~" && ctx.gfm)) {
      let run = 0;

      while (value[index + run] === char) {
        run += 1;
      }

      const before = value[index - 1] ?? "";
      const after = value[index + run] ?? "";
      const { canClose, canOpen } = flanking(before, after, char);
      flush();
      items.push({
        canClose,
        canOpen,
        char,
        count: run,
        kind: "delim",
        original: run,
      });
      index += run;
      continue;
    }

    if (char === ":" && ctx.directiveMode && value[index - 1] !== ":") {
      const directive = /^:([A-Za-z][\w-]*)(\[[^\]]*\])?(\{[^}]*\})?/.exec(
        value.slice(index)
      );

      if (directive?.[1]) {
        const label = directive[2]?.slice(1, -1);
        pushNode(
          directiveElement(
            ctx,
            directive[1],
            parseAttributes(directive[3]),
            label === undefined ? [] : parseInline(label, ctx)
          )
        );
        index += directive[0].length;
        continue;
      }
    }

    buffer += char;
    index += 1;
  }

  flush();
  wrapDelimiters(items, 0);
  const nodes = itemsToNodes(items);

  return ctx.gfm ? mergeText(linkifyChildren(nodes)) : nodes;
};

// ---- block parsing --------------------------------------------------------

const splitRow = (line: string): string[] => {
  let body = line.trim();

  if (body.startsWith("|")) {
    body = body.slice(1);
  }

  if (body.endsWith("|") && !body.endsWith("\\|")) {
    body = body.slice(0, -1);
  }

  const cells: string[] = [];
  let current = "";

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i] ?? "";

    if (char === "\\" && body[i + 1] === "|") {
      current += "|";
      i += 1;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());

  return cells;
};

const alignOf = (cell: string): string | undefined => {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");

  if (left && right) {
    return "center";
  }

  if (right) {
    return "right";
  }

  return left ? "left" : undefined;
};

const nodesText = (nodes: HastNode[]): string =>
  nodes
    .map((node) => {
      if (node.type === "text") {
        return node.value;
      }

      return node.type === "element" ? nodesText(node.children) : "";
    })
    .join("");

const COLUMN_SIZE_LIMITS = [
  [40, "sm"],
  [100, "md"],
  [160, "lg"],
] as const;

/** A column is sized by the longest text in it, up to 160 characters. */
const columnSize = (lengths: number[]): string => {
  let longest = lengths[0] ?? 0;

  for (const length of lengths.slice(1)) {
    if (longest > 160) {
      break;
    }

    longest = Math.max(longest, length);
  }

  return COLUMN_SIZE_LIMITS.find(([limit]) => longest <= limit)?.[1] ?? "xl";
};

const joinBlocks = (nodes: HastNode[]): HastNode[] => {
  const result: HastNode[] = [NEWLINE];

  for (const node of nodes) {
    result.push(node, NEWLINE);
  }

  return nodes.length === 0 ? [] : result;
};

const parseBlocks = (lines: string[], ctx: Context): Entry[] => {
  const entries: Entry[] = [];
  let i = 0;

  const paragraph = (start: number): number => {
    let end = start + 1;

    while (end < lines.length && !interruptsParagraph(lines[end] ?? "", ctx)) {
      const setext = SETEXT.exec(lines[end] ?? "");

      if (setext) {
        break;
      }

      end += 1;
    }

    return end;
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    // Indented code
    if (indentOf(line) >= 4) {
      const start = i;
      const code: string[] = [];
      let last = i;

      while (i < lines.length) {
        const current = lines[i] ?? "";

        if (isBlank(current)) {
          code.push(stripIndent(current, 4));
          i += 1;
        } else if (indentOf(current) >= 4) {
          code.push(stripIndent(current, 4));
          last = i;
          i += 1;
        } else {
          break;
        }
      }

      i = last + 1;
      entries.push({
        end: i,
        node: el("pre", {}, [
          el("code", {}, [
            text(`${code.slice(0, last - start + 1).join("\n")}\n`),
          ]),
        ]),
        start,
      });
      continue;
    }

    // Math (flow): a `$$` fence holds its lines up to a fence of at least the
    // same length, or to the end of the text.
    const mathFence = ctx.math ? MATH_FENCE_OPEN.exec(line) : null;

    if (mathFence) {
      const start = i;
      const size = mathFence[2]?.length ?? 2;
      const fenceIndent = mathFence[1]?.length ?? 0;
      const closing = new RegExp(`^ {0,3}\\\${${size},}[ \\t]*$`);
      const body: string[] = [];
      i += 1;

      while (i < lines.length) {
        const current = lines[i] ?? "";
        i += 1;

        if (closing.test(current)) {
          break;
        }

        body.push(stripIndent(current, fenceIndent));
      }

      entries.push({
        end: i,
        node: el("pre", {}, [
          el("code", { className: ["language-math", "math-display"] }, [
            text(body.join("\n")),
          ]),
        ]),
        start,
      });
      continue;
    }

    // Fenced code
    const fence = FENCE_OPEN.exec(line);

    if (fence && startsFence(line)) {
      const start = i;
      const marker = fence[2] ?? "```";
      const fenceIndent = fence[1]?.length ?? 0;
      const info = (fence[3] ?? "").trim();
      const language = decodeEntities(info.split(/\s+/)[0] ?? "");
      const code: string[] = [];
      let closed = false;
      i += 1;

      while (i < lines.length) {
        const current = lines[i] ?? "";

        const close = new RegExp(
          `^ {0,3}${marker.startsWith("`") ? "`" : "~"}{${marker.length},}[ \\t]*$`
        );

        if (close.test(current)) {
          i += 1;
          closed = true;
          break;
        }

        code.push(stripIndent(current, fenceIndent));
        i += 1;
      }

      const properties: Record<string, unknown> = {};

      if (language) {
        properties.className = [`language-${language}`];
      }

      // A fence still open at the end of the text (a streaming block) is
      // flagged for the pre component; the built-in ones do not forward it.
      entries.push({
        end: i,
        node: el("pre", closed ? {} : { fenceOpen: true }, [
          el("code", properties, [
            text(code.length > 0 ? `${code.join("\n")}\n` : ""),
          ]),
        ]),
        start,
      });
      continue;
    }

    // ATX heading
    const atx = ATX.exec(line);

    if (atx) {
      entries.push({
        end: i + 1,
        node: el(
          `h${atx[1]?.length ?? 1}`,
          {},
          parseInline((atx[2] ?? "").trim(), ctx)
        ),
        start: i,
      });
      i += 1;
      continue;
    }

    // Thematic break
    if (HR.test(line)) {
      entries.push({ end: i + 1, node: el("hr", {}, []), start: i });
      i += 1;
      continue;
    }

    // Footnote definition: collected, rendered in the footnotes section.
    const note = ctx.gfm ? FOOTNOTE_DEFINITION.exec(line) : null;

    if (note) {
      const start = i;
      const body = [(note[2] ?? "").trimEnd()];
      i += 1;

      while (i < lines.length) {
        const current = lines[i] ?? "";

        if (isBlank(current)) {
          let next = i + 1;

          while (next < lines.length && isBlank(lines[next])) {
            next += 1;
          }

          if (next >= lines.length || indentOf(lines[next] ?? "") < 4) {
            break;
          }

          body.push("");
          i += 1;
        } else if (indentOf(current) >= 4) {
          body.push(stripIndent(current, 4));
          i += 1;
        } else if (
          !isBlank(body.at(-1)) &&
          !interruptsParagraph(current, ctx) &&
          !SETEXT.test(current)
        ) {
          body.push(current);
          i += 1;
        } else {
          break;
        }
      }

      const key = normalizeLabel(note[1] ?? "");

      if (!ctx.footnotes.definitions.has(key.toUpperCase())) {
        ctx.footnotes.definitions.set(key.toUpperCase(), body);
      }

      entries.push({ end: i, node: el("#unwrap", {}, []), start });
      continue;
    }

    // Blockquote
    if (QUOTE.test(line)) {
      const start = i;
      const inner: string[] = [];

      while (i < lines.length) {
        const current = lines[i] ?? "";

        if (QUOTE.test(current)) {
          inner.push(current.replace(QUOTE, ""));
          i += 1;
        } else if (
          !isBlank(current) &&
          !isBlank(inner.at(-1)) &&
          !interruptsParagraph(current, ctx)
        ) {
          inner.push(current);
          i += 1;
        } else {
          break;
        }
      }

      const children = parseBlocks(inner, ctx).map((entry) => entry.node);
      entries.push({
        end: i,
        node: el("blockquote", {}, joinBlocks(children)),
        start,
      });
      continue;
    }

    // Directives
    if (ctx.directiveMode) {
      const container = CONTAINER_DIRECTIVE.exec(line);

      if (container?.[1]) {
        const start = i;
        const fenceLength = /^:+/.exec(line)?.[0].length ?? 3;
        const inner: string[] = [];
        i += 1;
        let depth = 0;

        while (i < lines.length) {
          const current = lines[i] ?? "";

          if (CONTAINER_CLOSE.test(current)) {
            if (
              depth === 0 &&
              (/^:+/.exec(current)?.[0].length ?? 0) >= fenceLength
            ) {
              i += 1;
              break;
            }

            depth -= 1;
          } else if (CONTAINER_DIRECTIVE.test(current)) {
            depth += 1;
          }

          inner.push(current);
          i += 1;
        }

        const children = parseBlocks(inner, ctx).map((entry) => entry.node);
        const label = container[2]?.slice(1, -1);

        const labelNodes: HastNode[] =
          label === undefined
            ? []
            : [el("p", { directiveLabel: true }, parseInline(label, ctx))];

        entries.push({
          end: i,
          node: directiveElement(
            ctx,
            container[1],
            parseAttributes(container[3]),
            joinBlocks([
              ...labelNodes.filter(
                (node): node is HastElement => node.type === "element"
              ),
              ...children,
            ])
          ),
          start,
        });
        continue;
      }

      const leaf = LEAF_DIRECTIVE.exec(line);

      if (leaf?.[1]) {
        const label = leaf[2]?.slice(1, -1);
        entries.push({
          end: i + 1,
          node: directiveElement(
            ctx,
            leaf[1],
            parseAttributes(leaf[3]),
            label === undefined ? [] : parseInline(label, ctx)
          ),
          start: i,
        });
        i += 1;
        continue;
      }
    }

    // List
    if (BULLET.test(line) || ORDERED.test(line)) {
      const result = parseList(lines, i, ctx);

      if (result) {
        entries.push({ end: result.end, node: result.node, start: i });
        i = result.end;
        continue;
      }
    }

    // Table
    if (ctx.gfm && line.includes("|")) {
      const delimiter = lines[i + 1];

      if (
        delimiter &&
        TABLE_DELIMITER.test(delimiter) &&
        delimiter.includes("-")
      ) {
        const header = splitRow(line);
        const delimiters = splitRow(delimiter);

        if (header.length === delimiters.length) {
          const start = i;
          const aligns = delimiters.map(alignOf);
          const rows: string[][] = [];
          i += 2;

          while (i < lines.length && !interruptsTable(lines[i] ?? "", ctx)) {
            rows.push(splitRow(lines[i] ?? ""));
            i += 1;
          }

          const parsed = (value: string) => parseInline(value, ctx);

          const sizes = ctx.tableColumnSizes
            ? header.map((title, column) =>
                columnSize([
                  nodesText(parsed(title)).length,
                  ...rows.map(
                    (cells) => nodesText(parsed(cells[column] ?? "")).length
                  ),
                ])
              )
            : [];

          const cell = (tag: string, value: string, column: number) => {
            const properties: Record<string, unknown> = {};
            const align = aligns[column];

            if (align) {
              properties.align = align;
            }

            if (sizes[column] !== undefined) {
              properties["data-ck-col-size"] = sizes[column];
            }

            return el(tag, properties, parsed(value));
          };

          const row = (tag: string, cells: string[]) =>
            el(
              "tr",
              {},
              joinBlocks(
                header.map((_, column) =>
                  cell(tag, cells[column] ?? "", column)
                )
              )
            );

          const sections: HastElement[] = [
            el("thead", {}, joinBlocks([row("th", header)])),
          ];

          if (rows.length > 0) {
            sections.push(
              el("tbody", {}, joinBlocks(rows.map((cells) => row("td", cells))))
            );
          }

          entries.push({
            end: i,
            node: el(
              "table",
              ctx.tableMarkdownSource
                ? { markdownSource: lines.slice(start, i).join("\n") }
                : {},
              joinBlocks(sections)
            ),
            start,
          });
          continue;
        }
      }
    }

    // Link reference definition: collected up front, renders nothing.
    if (DEFINITION.test(line) && !line.trimStart().startsWith("[^")) {
      entries.push({ end: i + 1, node: el("#unwrap", {}, []), start: i });
      i += 1;
      continue;
    }

    // HTML block (kept as raw, which renders as text unless skipHtml)
    if (HTML_BLOCK.test(line)) {
      const start = i;
      const html: string[] = [];

      while (i < lines.length && !isBlank(lines[i])) {
        html.push(lines[i] ?? "");
        i += 1;
      }

      entries.push({
        end: i,
        node: { type: "raw", value: html.join("\n") },
        start,
      });
      continue;
    }

    // Paragraph or setext heading
    const start = i;
    const end = paragraph(i);

    const content = lines
      .slice(start, end)
      .map((current, offset) =>
        offset === end - start - 1
          ? current.replace(LEADING_SPACES, "").replace(TRAILING_SPACES, "")
          : current.replace(LEADING_SPACES, "")
      )
      .join("\n");

    const underline = end < lines.length ? SETEXT.exec(lines[end] ?? "") : null;

    if (underline) {
      entries.push({
        end: end + 1,
        node: el(
          underline[1]?.startsWith("=") ? "h1" : "h2",
          {},
          parseInline(content, ctx)
        ),
        start,
      });
      i = end + 1;
      continue;
    }

    entries.push({
      end,
      node: el("p", {}, parseInline(content, ctx)),
      start,
    });
    i = end;
  }

  return entries;
};

interface ListMarker {
  contentIndent: number;
  kind: string;
  rest: string;
  start?: number;
}

const readMarker = (line: string): ListMarker | undefined => {
  const bullet = BULLET.exec(line);

  if (bullet) {
    const spaces = bullet[3] ?? "";
    const markerEnd = (bullet[1]?.length ?? 0) + 1;
    const rest = line.slice(bullet[0].length);
    const wide = spaces.length > 4 || spaces === "\t";
    const gap = rest.trim() === "" ? 1 : wide ? 1 : Math.max(spaces.length, 1);

    return {
      contentIndent: markerEnd + gap,
      kind: `b${bullet[2]}`,
      rest: wide
        ? `${" ".repeat(Math.max(spaces.length - 1, 0))}${rest}`
        : rest,
    };
  }

  const ordered = ORDERED.exec(line);

  if (ordered) {
    const spaces = ordered[4] ?? "";
    const markerEnd = (ordered[1]?.length ?? 0) + (ordered[2]?.length ?? 0) + 1;
    const rest = line.slice(ordered[0].length);
    const wide = spaces.length > 4 || spaces === "\t";
    const gap = rest.trim() === "" ? 1 : wide ? 1 : Math.max(spaces.length, 1);

    return {
      contentIndent: markerEnd + gap,
      kind: `o${ordered[3]}`,
      rest: wide
        ? `${" ".repeat(Math.max(spaces.length - 1, 0))}${rest}`
        : rest,
      start: Number.parseInt(ordered[2] ?? "1", 10),
    };
  }

  return undefined;
};

const parseList = (
  lines: string[],
  startLine: number,
  ctx: Context
): { end: number; node: HastElement } | undefined => {
  const first = readMarker(lines[startLine] ?? "");

  if (!first) {
    return undefined;
  }

  // A horizontal rule is not a list item.
  if (HR.test(lines[startLine] ?? "")) {
    return undefined;
  }

  interface Item {
    blocks: Entry[];
    checked?: boolean;
    spreadBetween: boolean;
    task: boolean;
  }

  const items: Item[] = [];
  let loose = false;
  let i = startLine;

  while (i < lines.length) {
    const marker = readMarker(lines[i] ?? "");

    if (!marker || marker.kind !== first.kind || HR.test(lines[i] ?? "")) {
      break;
    }

    const itemLines: string[] = [marker.rest];
    i += 1;
    let endedByBlank = false;

    while (i < lines.length) {
      const current = lines[i] ?? "";

      if (isBlank(current)) {
        let probe = i;

        while (probe < lines.length && isBlank(lines[probe])) {
          probe += 1;
        }

        const next = lines[probe];

        if (next !== undefined && indentOf(next) >= marker.contentIndent) {
          for (let k = i; k < probe; k += 1) {
            itemLines.push("");
          }

          i = probe;
          continue;
        }

        endedByBlank = true;
        break;
      }

      if (indentOf(current) >= marker.contentIndent) {
        itemLines.push(stripIndent(current, marker.contentIndent));
        i += 1;
        continue;
      }

      const previous = itemLines.at(-1);

      if (
        !isBlank(previous) &&
        !readMarker(current) &&
        !interruptsParagraph(current, ctx)
      ) {
        itemLines.push(current.replace(LEADING_SPACES, ""));
        i += 1;
        continue;
      }

      break;
    }

    let task = false;
    let checked: boolean | undefined;
    const taskMatch = ctx.gfm ? TASK.exec(itemLines[0] ?? "") : null;

    if (taskMatch) {
      task = true;
      checked = taskMatch[1] !== " ";
      itemLines[0] = (itemLines[0] ?? "").slice(taskMatch[0].length);
    }

    const blocks = parseBlocks(itemLines, ctx);
    let spreadBetween = false;

    for (let k = 1; k < blocks.length; k += 1) {
      if ((blocks[k]?.start ?? 0) > (blocks[k - 1]?.end ?? 0)) {
        spreadBetween = true;
      }
    }

    if (spreadBetween) {
      loose = true;
    }

    items.push({ blocks, checked, spreadBetween, task });

    // Blank line between items makes the list loose.
    if (endedByBlank) {
      let probe = i;

      while (probe < lines.length && isBlank(lines[probe])) {
        probe += 1;
      }

      const next = readMarker(lines[probe] ?? "");

      if (next && next.kind === first.kind && !HR.test(lines[probe] ?? "")) {
        loose = true;
        i = probe;
      } else {
        break;
      }
    }
  }

  const hasTask = items.some((item) => item.task);
  const children: HastNode[] = [];

  for (const item of items) {
    const liChildren: HastNode[] = [];

    const checkbox = (): HastElement =>
      el(
        "input",
        item.checked
          ? { checked: true, disabled: true, type: "checkbox" }
          : { disabled: true, type: "checkbox" },
        []
      );

    const inlineCheckbox = item.task && ctx.taskCheckbox === "inline";

    if (item.task && !inlineCheckbox) {
      liChildren.push(checkbox());
    }

    item.blocks.forEach((block, position) => {
      const { node } = block;
      const isParagraph = node.type === "element" && node.tagName === "p";

      if (isParagraph && !loose) {
        if (position > 0) {
          liChildren.push(NEWLINE);
        }

        if (position === 0 && inlineCheckbox) {
          liChildren.push(checkbox(), text(" "));
        }

        liChildren.push(...node.children);

        return;
      }

      liChildren.push(NEWLINE);

      if (position === 0 && inlineCheckbox && isParagraph) {
        liChildren.push(el("p", {}, [checkbox(), text(" "), ...node.children]));
      } else {
        if (position === 0 && inlineCheckbox) {
          liChildren.push(checkbox(), text(" "));
        }

        liChildren.push(node);
      }
    });

    if (item.blocks.length === 0 && inlineCheckbox) {
      liChildren.push(checkbox());
    }

    const lastBlock = item.blocks.at(-1)?.node;

    if (
      loose ||
      (lastBlock &&
        !(lastBlock.type === "element" && lastBlock.tagName === "p"))
    ) {
      liChildren.push(NEWLINE);
    }

    children.push(
      el("li", item.task ? { className: ["task-list-item"] } : {}, liChildren),
      NEWLINE
    );
  }

  const ordered = first.kind.startsWith("o");
  const properties: Record<string, unknown> = {};

  if (hasTask) {
    properties.className = ["contains-task-list"];
  }

  if (ordered && first.start !== undefined && first.start !== 1) {
    properties.start = first.start;
  }

  return {
    end: i,
    node: el(ordered ? "ol" : "ul", properties, [NEWLINE, ...children]),
  };
};

// ---- entry points ---------------------------------------------------------

const normalise = (source: string): string => source.replaceAll(NEWLINES, "\n");

const collectDefinitions = (lines: string[]): Map<string, Definition> => {
  const definitions = new Map<string, Definition>();
  let fence: string | undefined;

  for (const line of lines) {
    const opening = FENCE_OPEN.exec(line);

    if (fence === undefined && opening && startsFence(line)) {
      fence = opening[2]?.[0];
    } else if (
      fence !== undefined &&
      new RegExp(`^ {0,3}${fence}{3,}[ \\t]*$`, "u").test(line)
    ) {
      fence = undefined;
    } else if (fence === undefined) {
      const match = DEFINITION.exec(line);
      const label = match?.[1];

      if (label !== undefined && !label.startsWith("^")) {
        const key = normalizeLabel(label);
        const raw = match?.[2] ?? "";
        const title = match?.[3];

        if (!definitions.has(key)) {
          definitions.set(key, {
            href: decodeEntities(raw.startsWith("<") ? raw.slice(1, -1) : raw),
            title:
              title === undefined
                ? undefined
                : decodeEntities(title.slice(1, -1)),
          });
        }
      }
    }
  }

  return definitions;
};

/** Identifiers of every footnote definition, so a call may precede its definition. */
const collectFootnoteLabels = (lines: string[]): Set<string> => {
  const labels = new Set<string>();
  let fence: string | undefined;

  for (const line of lines) {
    const opening = FENCE_OPEN.exec(line);

    if (fence === undefined && opening && startsFence(line)) {
      fence = opening[2]?.[0];
    } else if (
      fence !== undefined &&
      new RegExp(`^ {0,3}${fence}{3,}[ \\t]*$`, "u").test(line)
    ) {
      fence = undefined;
    } else if (fence === undefined) {
      const label = FOOTNOTE_DEFINITION_ANYWHERE.exec(line)?.[1];

      if (label !== undefined) {
        labels.add(normalizeLabel(label));
      }
    }
  }

  return labels;
};

const defaultBackContent = (
  _reference: number,
  rereference: number
): HastNode[] => {
  const content: HastNode[] = [text("↩")];

  if (rereference > 1) {
    content.push(el("sup", {}, [text(String(rereference))]));
  }

  return content;
};

const defaultBackLabel = (reference: number, rereference: number): string =>
  `Back to reference ${reference + 1}${rereference > 1 ? `-${rereference}` : ""}`;

/**
 * The footnotes section (mdast-util-to-hast `defaultFootnoteBackContent`,
 * `footnoteBackLabel` and the section builder of prism-light): one list
 * item per referenced definition, in order of first reference, each ending in
 * a back-reference per call. Definitions found while converting a body are
 * appended to the order, so the loop reads the live length.
 */
const footnoteSection = (ctx: Context): HastElement | undefined => {
  const { footnotes: state } = ctx;
  const { options } = state;
  const prefix = options.clobberPrefix ?? "user-content-";
  const backContent = options.footnoteBackContent ?? defaultBackContent;
  const backLabel = options.footnoteBackLabel ?? defaultBackLabel;
  const items: HastNode[] = [];

  for (let index = 0; index < state.order.length; index += 1) {
    const identifier = state.order[index] ?? "";
    const body = state.definitions.get(identifier);

    if (!body) {
      continue;
    }

    const content: HastNode[] = parseBlocks(body, ctx).map(
      (entry) => entry.node
    );

    const id = normalizeUri(identifier.toLowerCase());
    const backReferences: HastNode[] = [];
    const total = state.counts.get(identifier) ?? 0;

    for (let count = 1; count <= total; count += 1) {
      if (backReferences.length > 0) {
        backReferences.push(text(" "));
      }

      let back =
        typeof backContent === "function"
          ? backContent(index, count)
          : backContent;

      if (typeof back === "string") {
        back = text(back);
      }

      backReferences.push(
        el(
          "a",
          {
            "aria-label":
              typeof backLabel === "string"
                ? backLabel
                : backLabel(index, count),
            className: ["data-ck-footnote-backref"],
            "data-ck-footnote-backref": "",
            href: `#${prefix}fnref-${id}${count > 1 ? `-${count}` : ""}`,
          },
          Array.isArray(back) ? back : [back]
        )
      );
    }

    const last = content.at(-1);

    if (last?.type === "element" && last.tagName === "p") {
      const tail = last.children.at(-1);

      if (tail?.type === "text") {
        tail.value += " ";
      } else {
        last.children.push(text(" "));
      }

      last.children.push(...backReferences);
    } else {
      content.push(...backReferences);
    }

    items.push(el("li", { id: `${prefix}fn-${id}` }, joinBlocks(content)));
  }

  if (items.length === 0) {
    return undefined;
  }

  return el("section", { className: ["footnotes"], "data-footnotes": true }, [
    el(
      options.footnoteLabelTagName ?? "h2",
      {
        ...(options.footnoteLabelProperties ?? { className: ["sr-only"] }),
        id: "footnote-label",
      },
      [text(options.footnoteLabel ?? "Footnotes")]
    ),
    NEWLINE,
    el("ol", {}, joinBlocks(items)),
    NEWLINE,
  ]);
};

const createContext = (
  options: ParseOptions,
  definitions: ReadonlyMap<string, Definition>,
  footnoteLabels: ReadonlySet<string>
): Context => ({
  breakNewLines: options.breakNewLines ?? false,
  definitions,
  directiveMode: (options.directives?.length ?? 0) > 0,
  directives: new Set(options.directives ?? []),
  footnotes: {
    counts: new Map(),
    definitions: new Map(),
    labels: footnoteLabels,
    options: options.footnotes ?? {},
    order: [],
  },
  gfm: options.gfm ?? true,
  math: options.math ?? false,
  tableColumnSizes: options.tableColumnSizes ?? false,
  tableMarkdownSource: options.tableMarkdownSource ?? false,
  taskCheckbox: options.taskCheckbox ?? "inline",
});

/** Parses a document into its top-level blocks with their source ranges. */
export const parseMarkdownBlocks = (
  source: string,
  options: ParseOptions = {}
): ParsedBlock[] => {
  const normalised = normalise(source).replaceAll(TAB, "\t");
  const lines = normalised.split("\n");
  const offsets: number[] = [];
  let offset = 0;

  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  const ctx = createContext(
    options,
    collectDefinitions(lines),
    options.gfm === false ? new Set() : collectFootnoteLabels(lines)
  );

  const entries = parseBlocks(lines, ctx);

  const blocks = entries.map((entry, position) => {
    const next = entries[position + 1];
    const endLine = Math.min(entry.end, lines.length) - 1;

    const endOffset = Math.min(
      (offsets[endLine] ?? 0) + (lines[endLine]?.length ?? 0),
      normalised.length
    );

    let blankLines = 0;
    const upTo = next ? next.start : lines.length;

    for (let k = entry.end; k < upTo; k += 1) {
      if (isBlank(lines[k])) {
        blankLines += 1;
      }
    }

    return {
      endOffset,
      hasBlankLineAfter: next !== undefined && blankLines >= 1,
      node: entry.node,
      startLine: entry.start + 1,
      startOffset: offsets[entry.start] ?? 0,
    };
  });

  // The section is built after the body so every call is numbered first.
  const section = footnoteSection(ctx);

  if (section) {
    blocks.push({
      endOffset: normalised.length,
      hasBlankLineAfter: false,
      node: section,
      startLine: lines.length + 1,
      startOffset: normalised.length,
    });
  }

  return blocks;
};

/** Parses a document into hast children, newline text between blocks. */
export const parseMarkdown = (
  source: string,
  options: ParseOptions = {}
): HastNode[] => {
  const nodes: HastNode[] = [];

  for (const block of parseMarkdownBlocks(source, options)) {
    if (nodes.length > 0) {
      nodes.push(NEWLINE);
    }

    nodes.push(block.node);
  }

  return nodes;
};
