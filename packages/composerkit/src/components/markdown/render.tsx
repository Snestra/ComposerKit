"use client";

/* oxlint-disable anti-slop/no-object-parameters, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, typescript/no-explicit-any, typescript/no-invalid-void-type -- The rehype plugin contract is the unified one: settings of any type and a transformer that may return nothing. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion, typescript/no-unsafe-argument, eslint/no-use-before-define -- SAFETY: custom properties in style objects and plugin results checked for type root before use. */

/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables and parse results are typed by their string keys. */
/* oxlint-disable anti-slop/no-runtime-typeof -- A value may be a string or a list, or a value or a function, as in the components. */
/* oxlint-disable anti-slop/no-unsafe-dictionary-type -- Hast element properties are an open attribute dictionary. */
/* oxlint-disable eslint/complexity -- The parsers are single-pass state machines that follow the reference algorithms branch for branch. */
/* oxlint-disable eslint/prefer-destructuring -- Stylistic. */
/* oxlint-disable eslint/prefer-named-capture-group -- The grammars are written with positional groups, as the reference parsers do. */
/* oxlint-disable eslint/require-unicode-regexp -- The patterns are CommonMark, GFM and ANSI grammar kept without the u flag, which rejects the escaped punctuation classes they use. */
/* oxlint-disable oxc/no-accumulating-spread -- Each element gets its own properties copy. */
/* oxlint-disable react/exhaustive-effect-dependencies, react/memo-dependencies -- The previous result lives in a ref so the next pass can reuse the unchanged blocks. */
/* oxlint-disable react/no-clone-element -- Block outputs are re-keyed with cloneElement so unchanged blocks keep their identity). */
/* oxlint-disable react/no-react-children -- The renderer reads and maps text children. */
/* oxlint-disable react/refs -- The component keeps the latest props in refs during render so timers read current values. */
/* oxlint-disable typescript/no-base-to-string -- URL attributes are strings in practice. */
/* oxlint-disable typescript/prefer-nullish-coalescing, typescript/strict-boolean-expressions -- Branches test optional flags, regex groups and empty strings by truthiness, as react-markdown and the component do. */
/* oxlint-disable unicorn/no-array-for-each -- Stylistic; the loops need the index and the closure. */

import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { ElementType, ReactElement, ReactNode } from "react";

import { AssistantText } from "./assistant-text";
import { parseMarkdownBlocks } from "./parse";
import type { HastElement, HastNode, HastText, ParseOptions } from "./parse";

/**
 * Renderer shared by both prose flavours. It turns the parser's hast nodes
 * into React elements the way react-markdown does, with block-by-block
 * incremental rendering.
 */

export type MarkdownComponents = Partial<Record<string, ElementType>>;

export type MarkdownUrlTransform = (
  url: string,
  key: string,
  node: HastElement
) => string | null | undefined;

export interface HastRoot {
  children: HastNode[];
  type: "root";
}

/** The `this` of a rehype plugin: the part of the unified processor a plugin reads. */
export interface RehypeProcessor {
  data: {
    (): Record<string, unknown>;
    (key: string): unknown;
    (key: string, value: unknown): RehypeProcessor;
  };
}

export type RehypeTransformer = (
  tree: HastRoot,
  file: { data: Record<string, unknown>; messages: unknown[] }
) => HastRoot | undefined | void;

// A plugin is called with its settings and returns a transformer of the tree.
export type RehypePlugin = (
  this: RehypeProcessor,
  ...settings: any[]
) => RehypeTransformer | undefined | void;

/** A plugin, or `[plugin, ...settings]`; a first setting of `false` skips it. */
export type RehypePluggable = RehypePlugin | [RehypePlugin, ...unknown[]];

const createProcessor = (): RehypeProcessor => {
  const store: Record<string, unknown> = {};

  function data(): Record<string, unknown>;
  function data(key: string): unknown;
  function data(key: string, value: unknown): RehypeProcessor;
  function data(key?: string, value?: unknown): unknown {
    if (key === undefined) {
      return store;
    }

    if (arguments.length === 1) {
      return store[key];
    }

    store[key] = value;

    return processor;
  }

  const processor: RehypeProcessor = { data };

  return processor;
};

/**
 * Runs rehype plugins over the hast tree, in order, as unified's `runSync` does
 * after remark-rehype. The tree is copied first because the parser shares
 * its newline nodes between blocks.
 */
export const runRehypePlugins = (
  nodes: HastNode[],
  plugins: readonly RehypePluggable[]
): HastNode[] => {
  let tree: HastRoot = { children: structuredClone(nodes), type: "root" };
  const processor = createProcessor();
  const file = { data: {}, messages: [] };

  for (const pluggable of plugins) {
    const [plugin, ...settings] = Array.isArray(pluggable)
      ? pluggable
      : [pluggable];

    if (settings[0] === false) {
      continue;
    }

    if (settings[0] === true) {
      settings[0] = undefined;
    }

    const transformer = plugin.call(processor, ...settings);

    if (typeof transformer !== "function") {
      continue;
    }

    const result: unknown = transformer(tree, file);

    if (result instanceof Promise) {
      throw new TypeError("`runSync` finished async. Use `run` instead");
    }

    if ((result as HastRoot | undefined)?.type === "root") {
      tree = result as HastRoot;
    }
  }

  return tree.children;
};

/** Hooks that decorate the prepared tree: replace a text node or add props to an element. */
export interface RenderDecorations {
  /** Props merged onto an element; `className` joins and `style` merges. */
  elementProps?: (node: HastElement) => object | undefined;
  /** Replaces the rendering of a text node; `undefined` keeps the plain string. */
  renderText?: (node: HastText) => ReactNode;
}

export interface RenderOptions {
  allowBasicHtml?: boolean;
  allowElement?: (
    element: HastElement,
    index: number,
    parent: HastElement | HastRoot
  ) => boolean | null | undefined;
  allowedElements?: readonly string[];
  components: MarkdownComponents;
  /** Called with the prepared tree (filters and URL transform applied), before rendering. */
  decorate?: (prepared: HastNode[]) => RenderDecorations;
  disallowedElements?: readonly string[];
  /** Rehype plugins, run on the tree before the element filters. */
  rehypePlugins?: readonly RehypePluggable[];
  skipHtml?: boolean;
  unwrapDisallowed?: boolean;
  urlTransform: MarkdownUrlTransform;
}

// react-markdown's `urlAttributes`.
const URL_ATTRIBUTES: Record<string, readonly string[] | null> = {
  action: ["form"],
  cite: ["blockquote", "del", "ins", "q"],
  data: ["object"],
  formAction: ["button", "input"],
  href: ["a", "area", "base", "link"],
  icon: ["menuitem"],
  itemId: null,
  manifest: ["html"],
  ping: ["a", "area"],
  poster: ["video"],
  src: [
    "audio",
    "embed",
    "iframe",
    "img",
    "input",
    "script",
    "source",
    "track",
    "video",
  ],
};

const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i;

/** react-markdown's default URL transform. */
export const defaultUrlTransform = (value: string): string => {
  const colon = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash = value.indexOf("/");

  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    SAFE_PROTOCOL.test(value.slice(0, colon))
  ) {
    return value;
  }

  return "";
};

/** The default transform that also allows tel:, sms: and data:image/. */
export const markdownUrlTransform: MarkdownUrlTransform = (url) =>
  url.startsWith("tel:") ||
  url.startsWith("sms:") ||
  url.startsWith("data:image/")
    ? url
    : defaultUrlTransform(url);

/** The text a React subtree renders, used for sizing and numeric detection. */
export const textContent = (node: ReactNode): string => {
  let result = "";
  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      result += String(child);
    } else if (
      isValidElement<{ text: string }>(child) &&
      child.type === AssistantText
    ) {
      // Assistant replies render each text node through AssistantText's text prop.
      result += child.props.text;
    } else if (isValidElement<{ children?: ReactNode }>(child)) {
      result += textContent(child.props.children);
    }
  });

  return result;
};

const BASIC_HTML_TAG = /^<(\/?)(b|del|em|i|kbd|s|strong|sub|sup|u)>$/i;
const HTML_BREAK = /^<br\s*\/?>$/i;

const basicHtml = (nodes: HastNode[]): HastNode[] => {
  const result: HastNode[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];

    if (!node) {
      continue;
    }

    if (node.type !== "raw") {
      result.push(node);
      continue;
    }

    const value = node.value.trim();

    if (HTML_BREAK.test(value)) {
      result.push({
        children: [],
        properties: {},
        tagName: "br",
        type: "element",
      });
      continue;
    }

    const match = BASIC_HTML_TAG.exec(value);

    if (!match || match[1]) {
      continue;
    }

    const tag = match[2]?.toLowerCase();
    let depth = 0;
    let end = index + 1;

    for (; end < nodes.length; end += 1) {
      const next = nodes[end];

      if (next?.type !== "raw") {
        continue;
      }

      const candidate = BASIC_HTML_TAG.exec(next.value.trim());

      if (candidate?.[2]?.toLowerCase() !== tag) {
        continue;
      }

      if (!candidate[1]) {
        depth += 1;
      } else if (depth === 0) {
        break;
      } else {
        depth -= 1;
      }
    }

    if (end < nodes.length && tag) {
      result.push({
        children: basicHtml(nodes.slice(index + 1, end)),
        properties: {},
        tagName: tag,
        type: "element",
      });
      index = end;
    }
  }

  return result;
};

const prepare = (
  nodes: HastNode[],
  parent: HastElement | HastRoot,
  options: RenderOptions
): HastNode[] => {
  const result: HastNode[] = [];
  (options.allowBasicHtml ? basicHtml(nodes) : nodes).forEach((node, index) => {
    if (node.type === "raw") {
      if (!options.skipHtml) {
        result.push({ type: "text", value: node.value });
      }

      return;
    }

    if (node.type === "text") {
      result.push(node);

      return;
    }

    if (node.tagName === "#unwrap") {
      result.push(...prepare(node.children, parent, options));

      return;
    }

    let { properties } = node;

    for (const [attribute, tags] of Object.entries(URL_ATTRIBUTES)) {
      if (
        Object.hasOwn(properties, attribute) &&
        (tags === null || tags.includes(node.tagName))
      ) {
        properties = {
          ...properties,
          [attribute]: options.urlTransform(
            String(properties[attribute] || ""),
            attribute,
            node
          ),
        };
      }
    }

    const current: HastElement = { ...node, properties };

    const disallowed = options.allowedElements
      ? !options.allowedElements.includes(current.tagName)
      : options.disallowedElements?.includes(current.tagName);

    const rejected =
      !disallowed && options.allowElement
        ? !options.allowElement(current, index, parent)
        : false;

    if (disallowed || rejected) {
      if (options.unwrapDisallowed) {
        result.push(...prepare(current.children, parent, options));
      }

      return;
    }

    result.push({
      ...current,
      children: prepare(current.children, current, options),
    });
  });

  return result;
};

const VOID_TAGS = new Set(["br", "hr", "img", "input"]);

const HAST_DATA_OR_ARIA = /^(aria|data)([A-Z][A-Za-z0-9]*)$/;
const UPPER_CASE = /[A-Z]/g;

// Hast names `aria*` and `data*` properties in camel case (`dataFootnoteRef`);
// the DOM attribute is hyphenated. The parser already emits hyphenated names.
const attributeName = (name: string): string => {
  const match = HAST_DATA_OR_ARIA.exec(name);

  return match
    ? `${match[1]}-${(match[2] ?? "").replaceAll(UPPER_CASE, (letter, offset) => `${offset === 0 ? "" : "-"}${letter.toLowerCase()}`)}`
    : name;
};

const toProps = (properties: Record<string, unknown>) => {
  const props: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(properties)) {
    if (value === null || value === undefined || value === false) {
      continue;
    }

    props[attributeName(name)] = Array.isArray(value) ? value.join(" ") : value;
  }

  return props;
};

const mergeProps = (props: Record<string, unknown>, extra: object) => {
  for (const [name, value] of Object.entries(extra)) {
    if (value === undefined) {
      continue;
    }

    if (name === "className") {
      props.className = [props.className, value].filter(Boolean).join(" ");
    } else if (name === "style") {
      props.style = { ...(props.style as object), ...(value as object) };
    } else {
      props[name] = value;
    }
  }
};

// Elements that cannot hold text: whitespace between their children is dropped
// (hast-util-to-jsx-runtime `tableElements`), else React reports a hydration error.
const TABLE_ELEMENTS = new Set(["table", "tbody", "tfoot", "thead", "tr"]);
const WHITESPACE_ONLY = /^\s*$/;

const renderNodes = (
  nodes: HastNode[],
  options: RenderOptions,
  counter: { value: number },
  decorations?: RenderDecorations,
  parentTag?: string
): ReactNode[] => {
  const out: ReactNode[] = [];

  for (const node of nodes) {
    if (
      node.type === "text" &&
      parentTag !== undefined &&
      TABLE_ELEMENTS.has(parentTag) &&
      WHITESPACE_ONLY.test(node.value)
    ) {
      continue;
    }

    if (node.type === "text") {
      const decorated = decorations?.renderText?.(node);

      if (Array.isArray(decorated)) {
        out.push(...decorated);
      } else if (isValidElement(decorated) && decorated.key === null) {
        // A decorated text node sits in a children array beside its siblings, so it needs a key.
        out.push(cloneElement(decorated, { key: `text-${counter.value}` }));
        counter.value += 1;
      } else {
        out.push(decorated ?? node.value);
      }

      continue;
    }

    if (node.type === "raw") {
      out.push(node.value);
      continue;
    }

    const key = `${node.tagName}-${counter.value}`;
    counter.value += 1;
    const Component = options.components[node.tagName] ?? node.tagName;
    const props: Record<string, unknown> = { ...toProps(node.properties), key };
    const extra = decorations?.elementProps?.(node);

    if (extra) {
      mergeProps(props, extra);
    }

    if (typeof Component !== "string") {
      props.node = node;
    }

    const children = VOID_TAGS.has(node.tagName)
      ? []
      : renderNodes(node.children, options, counter, decorations, node.tagName);

    if (children.length === 1) {
      props.children = children[0];
    } else if (children.length > 1) {
      props.children = children;
    }

    out.push(createElement(Component, props));
  }

  return out;
};

/** Renders hast nodes: URL transform, element filters, then component mapping. */
export const renderHast = (
  nodes: HastNode[],
  options: RenderOptions
): ReactNode[] => {
  if (options.allowedElements && options.disallowedElements) {
    throw new Error(
      "Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other"
    );
  }

  const tree =
    options.rehypePlugins && options.rehypePlugins.length > 0
      ? runRehypePlugins(nodes, options.rehypePlugins)
      : nodes;

  const root: HastRoot = { children: tree, type: "root" };

  const prepared = prepare(tree, root, options);

  return renderNodes(
    prepared,
    options,
    { value: 0 },
    options.decorate?.(prepared)
  );
};

// ---- incremental rendering ------------------------------------------------

interface BlockState {
  hasBlankLineAfter: boolean;
  output: ReactNode[];
  startLine: number;
  startOffset: number;
}

export interface IncrementalState {
  blocks: BlockState[];
  cacheKey: unknown;
  enabled: boolean;
  fallbackReason?: "disabled" | "document-context";
  outputs: ReactNode[][];
  source: string;
  stableBlockCount: number;
}

/** The identity of a config is the cache key: a new config drops the cache. */
interface IncrementalConfig {
  enabled: boolean;
  parse: ParseOptions;
  render: (nodes: HastNode[]) => ReactNode[];
}

const wholeDocument = (
  source: string,
  config: IncrementalConfig,
  reason: "disabled" | "document-context"
): IncrementalState => {
  const nodes: HastNode[] = [];

  for (const block of parseMarkdownBlocks(source, config.parse)) {
    if (nodes.length > 0) {
      nodes.push({ type: "text", value: "\n" });
    }

    nodes.push(block.node);
  }

  const output = config.render(nodes);

  return {
    blocks: [
      {
        hasBlankLineAfter: false,
        output,
        startLine: 1,
        startOffset: 0,
      },
    ],
    cacheKey: config,
    enabled: config.enabled,
    fallbackReason: reason,
    outputs: [output],
    source,
    stableBlockCount: 0,
  };
};

/** Parses only from the first unstable block when text is appended. */
export const advanceIncremental = (
  previous: IncrementalState | undefined,
  source: string,
  config: IncrementalConfig
): IncrementalState => {
  const sameConfig =
    previous?.cacheKey === config && previous?.enabled === config.enabled;

  if (previous && sameConfig && previous.source === source) {
    return previous;
  }

  if (!config.enabled) {
    return wholeDocument(source, config, "disabled");
  }

  if (
    source.includes("]:") ||
    source.includes("[^") ||
    source.includes("\uFEFF")
  ) {
    return wholeDocument(source, config, "document-context");
  }

  const canResume =
    sameConfig &&
    previous !== undefined &&
    !previous.fallbackReason &&
    source.length > previous.source.length &&
    source.startsWith(previous.source);

  const stable = canResume
    ? previous.blocks.slice(0, previous.stableBlockCount)
    : [];

  const unstable = canResume
    ? previous.blocks[previous.stableBlockCount]
    : undefined;

  const offset = unstable?.startOffset ?? 0;
  const firstLine = unstable?.startLine ?? 1;
  const parsed = parseMarkdownBlocks(source.slice(offset), config.parse);
  const blocks: BlockState[] = [...stable];

  for (const block of parsed) {
    blocks.push({
      hasBlankLineAfter: block.hasBlankLineAfter,
      output: config.render([block.node]),
      startLine: firstLine - 1 + block.startLine,
      startOffset: offset + block.startOffset,
    });
  }

  let stableBlockCount = 0;

  for (let index = blocks.length - 3; index >= 0; index -= 1) {
    if (blocks[index]?.hasBlankLineAfter) {
      stableBlockCount = index + 1;
      break;
    }
  }

  return {
    blocks,
    cacheKey: config,
    enabled: config.enabled,
    outputs: blocks.map((block) => block.output),
    source,
    stableBlockCount,
  };
};

const KEY_SUFFIX = /-\d+$/;

interface Joined {
  children: ReactNode[];
  normalized: Map<ReactElement, ReactElement>;
  state: IncrementalState;
}

/** Renders `source` block by block with stable element keys. */
export const useIncrementalBlocks = (
  source: string,
  config: IncrementalConfig
): ReactNode[] => {
  const previous = useRef<Joined | undefined>(undefined);

  const joined = useMemo<Joined>(() => {
    const before = previous.current;
    const state = advanceIncremental(before?.state, source, config);
    const children: ReactNode[] = [];
    const counts = new Map<string, number>();
    const normalized = new Map<ReactElement, ReactElement>();
    state.outputs.forEach((output, index) => {
      if (index > 0) {
        children.push("\n");
      }

      for (const child of output) {
        if (!isValidElement(child)) {
          children.push(child);
          continue;
        }

        const base = child.key?.replace(KEY_SUFFIX, "") ?? "element";
        const seen = counts.get(base) ?? 0;
        counts.set(base, seen + 1);
        const key = `${base}-${seen}`;

        if (child.key === key) {
          children.push(child);
          continue;
        }

        const cached = before?.normalized.get(child);

        const next =
          cached?.key === key ? cached : cloneElement(child, { key });

        normalized.set(child, next);
        children.push(next);
      }
    });

    return { children, normalized, state };
  }, [source, config]);

  useLayoutEffect(() => {
    previous.current = joined;
  }, [joined]);

  return joined.children;
};
