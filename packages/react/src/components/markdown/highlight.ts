/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: refractor returns a root whose children are elements and text. */

import type { Element, ElementContent } from "hast";
import bash from "refractor/bash";
import c from "refractor/c";
import clike from "refractor/clike";
import { refractor } from "refractor/core";
import css from "refractor/css";
import diff from "refractor/diff";
import docker from "refractor/docker";
import go from "refractor/go";
import java from "refractor/java";
import javascript from "refractor/javascript";
import json from "refractor/json";
import jsx from "refractor/jsx";
import kotlin from "refractor/kotlin";
import markdown from "refractor/markdown";
import markup from "refractor/markup";
import php from "refractor/php";
import python from "refractor/python";
import ruby from "refractor/ruby";
import scss from "refractor/scss";
import sql from "refractor/sql";
import toml from "refractor/toml";
import tsx from "refractor/tsx";
import typescript from "refractor/typescript";
import yaml from "refractor/yaml";

/**
 * The code block tokenizer. The component registers 24 Prism grammars on
 * react-syntax-highlighter's light build. That build ignores the name it is given and
 * registers the grammar under its own id and aliases, so `jsonc` registers the
 * json grammar again. A name that no grammar owns throws in `highlight`, and
 * the component then renders the code as plain text.
 */

export interface MarkdownToken {
  /** The class list of the token span (`token`, the type, then aliases). */
  classes: readonly string[];
  content: readonly (MarkdownToken | string)[];
}

export type MarkdownNode = MarkdownToken | string;

const GRAMMARS = [
  javascript,
  jsx,
  typescript,
  tsx,
  markup,
  css,
  scss,
  c,
  clike,
  bash,
  json,
  python,
  sql,
  diff,
  markdown,
  yaml,
  toml,
  docker,
  java,
  go,
  php,
  ruby,
  kotlin,
];

for (const grammar of GRAMMARS) {
  refractor.register(grammar);
}

const toNode = (node: ElementContent): MarkdownNode | undefined => {
  if (node.type === "text") {
    return node.value;
  }

  if (node.type !== "element") {
    return undefined;
  }

  const { className } = node.properties;

  return {
    classes: Array.isArray(className) ? className.map(String) : [],
    content: node.children
      .map(toNode)
      .filter((child): child is MarkdownNode => child !== undefined),
  };
};

/**
 * Tokenizes `code`. A language no registered grammar owns (the default
 * is `text`) renders as plain text, as react-syntax-highlighter does.
 */
export const tokenizeCode = (code: string, name: string): MarkdownNode[] => {
  if (name === "" || name === "text" || !refractor.registered(name)) {
    return [code];
  }

  const tree = refractor.highlight(code, name);

  return tree.children
    .map((child) => toNode(child as Element))
    .filter((child): child is MarkdownNode => child !== undefined);
};
