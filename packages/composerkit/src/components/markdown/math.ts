/* oxlint-disable anti-slop/no-known-value-widening, anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters -- Hast element properties and the entity table are open dictionaries, and the plugin signature follows the unified plugin contract. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: the entity name is one of the four names the pattern matches. */
/* oxlint-disable eslint/prefer-named-capture-group, eslint/require-unicode-regexp -- The tokenizer patterns read the ASCII markup katex writes. */
/* oxlint-disable eslint/no-nested-ternary, typescript/consistent-return -- The text reader branches over the three hast node types; effects return a cleanup only when they registered something. */
/* oxlint-disable eslint/require-await, promise/always-return, promise/prefer-await-to-callbacks, typescript/return-await, unicorn/prefer-number-coercion -- The loader mirrors the memoised dynamic import, whose failure is swallowed by the caller. */

import type { KatexOptions } from "katex";
import { useEffect, useState } from "react";

import type { HastElement, HastNode, HastText } from "./parse";
import type { HastRoot, RehypePlugin } from "./render";

/** The part of the `katex` module the plugin calls. */
export interface KatexRenderer {
  renderToString: (expression: string, options?: KatexOptions) => string;
}

const TOKEN =
  /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;

const ATTRIBUTE = /([\w:.-]+)="([^"]*)"/g;
const ENTITY = /&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot));/gi;
const NAMED = { amp: "&", gt: ">", lt: "<", quot: '"' } as const;
const HYPHEN_LETTER = /-([a-z])/g;
const DECLARATION_SEPARATOR = /;/;

const decode = (value: string): string =>
  value.replaceAll(
    ENTITY,
    (_, hex?: string, decimal?: string, name?: string) => {
      if (hex !== undefined) {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      }

      if (decimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      }

      return NAMED[(name ?? "amp").toLowerCase() as keyof typeof NAMED];
    }
  );

const toStyle = (value: string): Record<string, string> => {
  const style: Record<string, string> = {};

  for (const declaration of value.split(DECLARATION_SEPARATOR)) {
    const colon = declaration.indexOf(":");

    if (colon > 0) {
      style[
        declaration
          .slice(0, colon)
          .trim()
          .replaceAll(HYPHEN_LETTER, (_, letter: string) =>
            letter.toUpperCase()
          )
      ] = declaration.slice(colon + 1).trim();
    }
  }

  return style;
};

// SVG presentation attributes are hyphenated in markup; aria and data names are
// hyphenated in the DOM and stay so.
const propertyName = (name: string): string =>
  name.startsWith("aria-") || name.startsWith("data-")
    ? name
    : name.replaceAll(HYPHEN_LETTER, (_, letter: string) =>
        letter.toUpperCase()
      );

const toProperties = (raw: string): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};

  for (const [, name = "", value = ""] of raw.matchAll(ATTRIBUTE)) {
    const decoded = decode(value);

    if (name === "class") {
      properties.className = decoded.split(" ").filter(Boolean);
    } else if (name === "style") {
      properties.style = toStyle(decoded);
    } else {
      properties[propertyName(name)] = decoded;
    }
  }

  return properties;
};

/**
 * Reads the markup `katex.renderToString` writes (elements with double-quoted
 * attributes, escaped text, self-closing `path`, `line` and `img`) into hast, as
 * rehype-katex does with its HTML parser.
 */
export const katexHtmlToHast = (html: string): HastNode[] => {
  const root: HastNode[] = [];
  const stack: HastElement[] = [];

  const append = (node: HastNode) => {
    (stack.at(-1)?.children ?? root).push(node);
  };

  for (const match of html.matchAll(TOKEN)) {
    const [, closing, tagName, attributes = "", selfClosing, data] = match;

    if (data !== undefined) {
      append({ type: "text", value: decode(data) } satisfies HastText);
    } else if (closing === "/") {
      stack.pop();
    } else if (tagName !== undefined) {
      const element: HastElement = {
        children: [],
        properties: toProperties(attributes),
        tagName,
        type: "element",
      };

      append(element);

      if (selfClosing !== "/") {
        stack.push(element);
      }
    }
  }

  return root;
};

const hasClass = (node: HastElement, name: string): boolean => {
  const { className } = node.properties;

  return Array.isArray(className) && className.includes(name);
};

const isElement = (node: HastNode | undefined): node is HastElement =>
  node?.type === "element";

const textOf = (node: HastNode): string =>
  node.type === "text"
    ? node.value
    : node.type === "element"
      ? node.children.map(textOf).join("")
      : "";

interface MathHit {
  display: boolean;
  source: string;
}

const findMath = (node: HastElement): MathHit | undefined => {
  if (node.tagName === "pre") {
    const code = node.children.find(
      (child): child is HastElement =>
        isElement(child) &&
        child.tagName === "code" &&
        hasClass(child, "language-math")
    );

    return code ? { display: true, source: textOf(code) } : undefined;
  }

  const isMath = hasClass(node, "language-math");
  const display = hasClass(node, "math-display");

  if (!isMath && !display && !hasClass(node, "math-inline")) {
    return undefined;
  }

  return { display, source: textOf(node) };
};

const katexError = (source: string, reason: unknown): HastElement => ({
  children: [{ type: "text", value: source }],
  properties: {
    className: ["katex-error"],
    style: "color: var(--color-syntax-error)",
    title: String(reason),
  },
  tagName: "span",
  type: "element",
});

const renderMath = (
  katex: KatexRenderer,
  hit: MathHit,
  messages: unknown[]
): HastNode[] => {
  const { display: displayMode, source } = hit;

  try {
    return katexHtmlToHast(
      katex.renderToString(source, { displayMode, throwOnError: true })
    );
  } catch (error) {
    messages.push({
      cause: error,
      reason: "Could not render math with KaTeX",
      source: "rehype-katex",
    });

    try {
      return katexHtmlToHast(
        katex.renderToString(source, {
          displayMode,
          strict: "ignore",
          throwOnError: false,
        })
      );
    } catch {
      return [katexError(source, error)];
    }
  }
};

const replaceMath = (
  nodes: HastNode[],
  katex: KatexRenderer,
  messages: unknown[]
): HastNode[] =>
  nodes.flatMap((node) => {
    if (!isElement(node)) {
      return [node];
    }

    const hit = findMath(node);

    if (hit) {
      return renderMath(katex, hit, messages);
    }

    return [{ ...node, children: replaceMath(node.children, katex, messages) }];
  });

/**
 * The `rehype-katex` (`rehypePlugins`): a `language-math` code (inside
 * a `pre` it is display math), or any element with `math-display` or
 * `math-inline`, becomes KaTeX markup. A parse failure renders again with
 * `strict: "ignore"`, and a second failure leaves a `katex-error` span with the
 * source and the error as its title.
 */
export const createRehypeKatex = (katex: KatexRenderer): RehypePlugin =>
  function rehypeKatex() {
    return (tree: HastRoot, file) => {
      tree.children = replaceMath(tree.children, katex, file.messages);
    };
  };

let katexLoad: Promise<KatexRenderer> | null = null;
let katexLoaded: KatexRenderer | null = null;

// Katex and its stylesheet load together on first use. A failed
// load is forgotten so the next render tries again.
const loadKatex = async (): Promise<KatexRenderer> => {
  katexLoad ??= Promise.all([
    import("katex"),
    import("katex/dist/katex.min.css"),
  ])
    .then(([module]) => {
      katexLoaded = module.default;

      return module.default;
    })
    .catch((error: unknown) => {
      katexLoad = null;
      throw error;
    });

  return katexLoad;
};

/**
 * The renderer once it has loaded and `enabled`, else null (the
 * document then renders its math as plain text).
 */
export const useKatex = (enabled: boolean): KatexRenderer | null => {
  const [renderer, setRenderer] = useState(katexLoaded);

  useEffect(() => {
    if (!enabled || renderer) {
      return;
    }

    let current = true;

    loadKatex()
      .then((loaded) => {
        if (current) {
          setRenderer(loaded);
        }
      })
      .catch(() => {
        // The component swallows the failure and keeps rendering without math.
      });

    return () => {
      current = false;
    };
  }, [enabled, renderer]);

  return enabled ? renderer : null;
};
