/* oxlint-disable anti-slop/no-runtime-typeof, typescript/promise-function-async -- A node is a string or a token, and ReactNode includes promises though these functions return content synchronously. */
/* oxlint-disable shadcn/no-inline-styles -- The component styles each line number inline. */
/* oxlint-disable shadcn/no-unknown-classes -- Prism token class names and the react-syntax-highlighter line number class are kept as styling hooks. */

import type { ReactNode } from "react";

import { tokenizeCode } from "./highlight";
import type { MarkdownNode, MarkdownToken } from "./highlight";

type TokenClassName = (classes: readonly string[]) => string;

const renderNode = (
  node: MarkdownNode,
  key: number,
  tokenClassName: TokenClassName
): ReactNode => {
  if (typeof node === "string") {
    return node;
  }

  return (
    <span className={tokenClassName(node.classes)} key={key}>
      {node.content.map((child, index) =>
        renderNode(child, index, tokenClassName)
      )}
    </span>
  );
};

type Line = MarkdownNode[];

const wrap = (
  text: string,
  wrappers: readonly (readonly string[])[]
): MarkdownNode => {
  let node: MarkdownNode = text;

  for (const classes of wrappers.toReversed()) {
    const wrapped: MarkdownToken = { classes, content: [node] };
    node = wrapped;
  }

  return node;
};

/** Splits tokens at newlines, keeping each wrapping token on every line it spans. */
const splitIntoLines = (nodes: readonly MarkdownNode[]): Line[] => {
  const lines: Line[] = [[]];

  const walk = (
    node: MarkdownNode,
    wrappers: readonly (readonly string[])[]
  ) => {
    if (typeof node !== "string") {
      for (const child of node.content) {
        walk(child, [...wrappers, node.classes]);
      }

      return;
    }

    for (const [index, part] of node.split("\n").entries()) {
      if (index > 0) {
        lines.push([]);
      }

      if (part !== "") {
        lines.at(-1)?.push(wrap(part, wrappers));
      }
    }
  };

  for (const node of nodes) {
    walk(node, []);
  }

  return lines;
};

/**
 * The code as react-syntax-highlighter renders it with `useInlineStyles` off:
 * token spans with Prism class names. With line numbers (`showLineNumbers` and
 * `showInlineLineNumbers`) every line is a span that starts with a number span
 * (`comment linenumber react-syntax-highlighter-line-number`, inline-block,
 * min-width `<digits>.25em`, 1em right padding, right aligned, unselectable).
 */
export const highlightLines = (
  code: string,
  language: string,
  showLineNumbers: boolean,
  tokenClassName: TokenClassName
): ReactNode => {
  const nodes = tokenizeCode(code, language);

  if (!showLineNumbers) {
    return nodes.map((node, index) => renderNode(node, index, tokenClassName));
  }

  const lines = splitIntoLines(nodes);
  const minWidth = `${String(lines.length).length}.25em`;

  return lines.map((line, index) => (
    // oxlint-disable-next-line react/no-array-index-key -- lines have no identity besides their position.
    <span key={index}>
      <span
        className="comment linenumber react-syntax-highlighter-line-number"
        style={{
          display: "inline-block",
          minWidth,
          paddingRight: "1em",
          textAlign: "right",
          userSelect: "none",
        }}
      >
        {index + 1}
      </span>
      {line.map((node, nodeIndex) =>
        renderNode(node, nodeIndex, tokenClassName)
      )}
      {index < lines.length - 1 ? "\n" : null}
    </span>
  ));
};
