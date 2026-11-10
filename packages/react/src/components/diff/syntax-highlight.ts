/*
 * Syntax tokenizing for the diff, on Prism through refractor.
 *
 * The app tokenizes in a pool of module workers
 * and colors each token with --diffs-token-light/-dark from the code theme. This
 * file produces the same shape: for each line, the tokens with their offsets,
 * each carrying a token role (the names of the Highlights engine's role
 * table: keyword, string, function, ...). syntax-theme.ts turns a role into the
 * theme colors, so the role is the only thing Prism has to decide.
 */

import css from "refractor/css";
import javascript from "refractor/javascript";
import markup from "refractor/markup";
import python from "refractor/python";
import typescript from "refractor/typescript";

import { GRAMMAR_LOADERS } from "./syntax-grammars";
import { GRAMMAR_BY_LANGUAGE } from "./syntax-languages";
import { refractor } from "./syntax-refractor.js";

/** The languages the app loads before the first file. */
export const PRELOADED_LANGUAGES = [
  "typescript",
  "javascript",
  "css",
  "html",
  "python",
] as const;

// CSS and JavaScript attach embedded grammars only after markup is registered.
for (const grammar of [markup, css, javascript, typescript, python]) {
  refractor.register(grammar);
}

refractor.languages.astro = refractor.languages.extend("markup", {});

refractor.languages.insertBefore("astro", "comment", {
  frontmatter: {
    greedy: true,
    inside: {
      "frontmatter-delimiter": {
        alias: "comment",
        pattern: /^---|(?:---|\.{3})[\t ]*$/u,
      },
      rest: refractor.languages.typescript,
    },
    pattern:
      /^---[\t ]*(?:\r?\n|$)[\s\S]*?(?:\r?\n---|\.{3}[\t ]*(?=\r?\n|$)|$)/u,
  },
});

/** A token of one line: its offset in the line text and its role (none: default color). */
export interface RoleToken {
  content: string;
  offset: number;
  role: string | undefined;
}

export type RoleLines = RoleToken[][];

/**
 * Prism token type to token role. Prism names the syntactic kind of a
 * token; the Highlights engine names the role and the theme colors the role.
 */
const PRISM_TYPE_ROLES = new Map([
  ["atrule", "keyword"],
  ["attr-name", "attribute"],
  ["attr-value", "string"],
  ["boolean", "boolean"],
  ["builtin", "type"],
  ["cdata", "comment"],
  ["char", "string"],
  ["class-name", "type"],
  ["comment", "comment"],
  ["constant", "constant"],
  ["decorator", "attribute"],
  ["doctype", "tag"],
  ["entity", "string.escape"],
  ["function", "function"],
  ["function-variable", "function"],
  ["generic-function", "function"],
  ["important", "keyword"],
  ["keyword", "keyword"],
  ["named-entity", "string.escape"],
  ["number", "number"],
  ["operator", "operator"],
  ["parameter", "variable.parameter"],
  ["prolog", "comment"],
  ["property", "property"],
  ["punctuation", "punctuation"],
  ["regex", "string.regex"],
  ["rule", "keyword"],
  ["selector", "selector"],
  ["string", "string"],
  ["tag", "tag"],
  ["triple-quoted-string", "string"],
  ["url", "link_uri"],
  ["variable", "variable"],
]);

/**
 * Keywords the Highlights engine colors as values, not as keywords: the
 * grammars class them as `keyword` (or `boolean`), the engine as the constant
 * and `this` roles.
 */
const VALUE_KEYWORD_ROLES = new Map([
  ["None", "constant"],
  ["null", "constant"],
  ["self", "variable.special"],
  ["super", "variable.special"],
  ["this", "variable.special"],
  ["undefined", "constant"],
]);

const roleOfClasses = (
  classes: readonly string[],
  inherited: string | undefined
) => {
  let role = inherited;

  for (const name of classes) {
    const named = PRISM_TYPE_ROLES.get(name);

    // The quotes of a string are string-colored; they are not punctuation.
    if (
      named !== undefined &&
      !(name === "punctuation" && inherited === "string")
    ) {
      role = named;
    }
  }

  return role;
};

/**
 * Grammars whose plain identifiers the engine colors as variables. Prism leaves
 * an identifier without a class; the engine's role table has `variable` for it.
 * Checked against the engine for these grammars only (see the round 3 report).
 */
const IDENTIFIER_VARIABLE_GRAMMARS = new Set([
  "javascript",
  "jsx",
  "python",
  "tsx",
  "typescript",
]);

const IDENTIFIER = /[A-Za-z_$][\w$]*/gu;

interface HastNode {
  children?: HastNode[];
  properties?: { className?: string[] };
  type: string;
  value?: string;
}

const grammarFile = (language: string) => GRAMMAR_BY_LANGUAGE.get(language);

/** Languages a file can be tokenized in right away, without a download. */
export const isLanguageLoaded = (language: string) => {
  const file = grammarFile(language);

  return file !== undefined && refractor.registered(file);
};

/** Load the grammar of a language. Resolves false when Prism has none. */
export const loadLanguage = async (language: string) => {
  const file = grammarFile(language);

  if (file === undefined) {
    return false;
  }

  if (!refractor.registered(file)) {
    const loader = GRAMMAR_LOADERS.get(file);

    if (loader === undefined) {
      return false;
    }

    const grammar = await loader();
    refractor.register(grammar.default);
  }

  return true;
};

const roleOfText = (text: string, role: string | undefined) =>
  role === undefined ? role : (VALUE_KEYWORD_ROLES.get(text) ?? role);

const pushToken = (
  tokens: RoleToken[],
  content: string,
  offset: number,
  role: string | undefined
) => {
  const previous = tokens.at(-1);

  if (previous && previous.role === role) {
    previous.content += content;
  } else {
    tokens.push({ content, offset, role });
  }
};

const pushIdentifiers = (tokens: RoleToken[], text: string, offset: number) => {
  let position = 0;

  for (const match of text.matchAll(IDENTIFIER)) {
    if (match.index > position) {
      pushToken(
        tokens,
        text.slice(position, match.index),
        offset + position,
        undefined
      );
    }

    pushToken(tokens, match[0], offset + match.index, "variable");
    position = match.index + match[0].length;
  }

  if (position < text.length) {
    pushToken(tokens, text.slice(position), offset + position, undefined);
  }
};

const collect = (
  node: HastNode,
  inherited: string | undefined,
  lines: RoleLines,
  state: { identifiers: boolean; line: number; offset: number }
) => {
  if (node.type === "text") {
    const parts = (node.value ?? "").split("\n");

    for (const [index, part] of parts.entries()) {
      if (index > 0) {
        state.line += 1;
        state.offset = 0;
        lines[state.line] ??= [];
      }

      if (part === "") {
        continue;
      }

      lines[state.line] ??= [];
      const tokens = lines[state.line] ?? [];

      if (inherited === undefined && state.identifiers) {
        pushIdentifiers(tokens, part, state.offset);
      } else {
        pushToken(tokens, part, state.offset, roleOfText(part, inherited));
      }

      state.offset += part.length;
    }

    return;
  }

  const classes = node.properties?.className ?? [];

  const role =
    node.type === "element" ? roleOfClasses(classes, inherited) : inherited;

  for (const child of node.children ?? []) {
    collect(child, role, lines, state);
  }
};

/**
 * Tokenize a document in a language into lines of role tokens. A line at or
 * over `tokenizeMaxLineLength` becomes one default token, and is kept out of Prism so a minified
 * line cannot stall the tokenizer.
 */
export const tokenizeRoles = (
  contents: string,
  language: string,
  tokenizeMaxLineLength: number
): RoleLines | undefined => {
  const file = grammarFile(language);

  if (file === undefined || !refractor.registered(file)) {
    return undefined;
  }

  const source = contents.split("\n");
  const longLines = new Set<number>();

  const prepared = source.map((line, index) => {
    const text = line.endsWith("\r") ? line.slice(0, -1) : line;

    if (tokenizeMaxLineLength > 0 && text.length >= tokenizeMaxLineLength) {
      longLines.add(index);

      return "";
    }

    return text;
  });

  const lines: RoleLines = [];

  const state = {
    identifiers: IDENTIFIER_VARIABLE_GRAMMARS.has(file),
    line: 0,
    offset: 0,
  };

  lines[0] = [];
  collect(
    refractor.highlight(prepared.join("\n"), file),
    undefined,
    lines,
    state
  );

  for (const index of longLines) {
    const text = source[index] ?? "";
    const length = text.endsWith("\r") ? text.length - 1 : text.length;
    lines[index] = [
      { content: text.slice(0, length), offset: 0, role: undefined },
    ];
  }

  while (lines.length < source.length) {
    lines.push([]);
  }

  return lines;
};
