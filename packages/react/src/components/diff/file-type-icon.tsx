"use client";

/* oxlint-disable shadcn/no-inline-styles -- the component sets the icon color inline from its token; here it is a custom property read by a class. */

import { useEffect } from "react";
import type { CSSProperties } from "react";

import {
  FILE_ICON_BY_EXTENSION,
  FILE_ICON_BY_FILE_NAME,
  FILE_ICON_SYMBOLS,
  FILE_ICON_VARIANT_BY_EXTENSION,
} from "./file-type-icon-data";

// Maps, so a name such as "constructor" is not read from the object prototype.
const TOKEN_BY_FILE_NAME = new Map(Object.entries(FILE_ICON_BY_FILE_NAME));
const TOKEN_BY_EXTENSION = new Map(Object.entries(FILE_ICON_BY_EXTENSION));

const VARIANT_BY_EXTENSION = new Map(
  Object.entries(FILE_ICON_VARIANT_BY_EXTENSION)
);

const COLOR_NAME_BY_TOKEN = new Map<string, keyof typeof COLORS>();

/*
 * The file-type icon of the full-review header.
 * The app configures no tables of its own, so the "complete" built-in set decides.
 */

/** The colors of the icon tokens, as light and dark pairs. */
const COLORS = {
  blue: "light-dark(#1a85d4, #69b1ff)",
  cyan: "light-dark(#1ca1c7, #68cdf2)",
  gray: "light-dark(#84848a, #adadb1)",
  green: "light-dark(#199f43, #5ecc71)",
  indigo: "light-dark(#693acf, #9d6afb)",
  mauve: "light-dark(#594c5b, #79697b)",
  orange: "light-dark(#d47628, #ffa359)",
  pink: "light-dark(#d32a61, #ff678d)",
  purple: "light-dark(#a631be, #d568ea)",
  red: "light-dark(#d52c36, #ff6762)",
  teal: "light-dark(#17a5af, #64d1db)",
  vermilion: "light-dark(#ff8c5b, #d5512f)",
  yellow: "light-dark(#d5a910, #ffd452)",
} as const;

type ColorName = keyof typeof COLORS;

/** The color name of each icon token that has one. */
const COLOR_OF_TOKEN = {
  astro: "purple",
  babel: "yellow",
  bash: "green",
  biome: "blue",
  bootstrap: "indigo",
  browserslist: "yellow",
  bun: "mauve",
  c: "blue",
  claude: "orange",
  cpp: "blue",
  css: "indigo",
  database: "purple",
  default: "gray",
  docker: "blue",
  eslint: "indigo",
  git: "vermilion",
  go: "cyan",
  graphql: "pink",
  html: "orange",
  image: "pink",
  javascript: "yellow",
  json: "orange",
  markdown: "green",
  mcp: "teal",
  npm: "red",
  oxc: "cyan",
  postcss: "red",
  prettier: "teal",
  python: "blue",
  react: "cyan",
  ruby: "red",
  rust: "orange",
  sass: "pink",
  svelte: "red",
  svg: "orange",
  svgo: "green",
  swift: "orange",
  table: "teal",
  tailwind: "cyan",
  terraform: "indigo",
  text: "gray",
  typescript: "blue",
  vite: "purple",
  vscode: "blue",
  vue: "green",
  wasm: "indigo",
  webpack: "blue",
  yml: "red",
  zig: "orange",
  zip: "orange",
} satisfies Readonly<Record<string, ColorName>>;

for (const [token, color] of Object.entries(COLOR_OF_TOKEN)) {
  COLOR_NAME_BY_TOKEN.set(token, color);
}

const TERTIARY = "var(--ck-palette-ink-tertiary)";

/** The color of an icon token, falling back to the tertiary text color. */
export const fileIconColor = (token: string | undefined) => {
  if (token === undefined) {
    return TERTIARY;
  }

  const name = COLOR_NAME_BY_TOKEN.get(token);

  return name === undefined
    ? TERTIARY
    : `var(--ck-file-symbol-ink-${token}, var(--ck-file-symbol-ink, ${COLORS[name]}))`;
};

/** The suffixes after each dot of a name, longest first (`a.b.c` gives `b.c`, `c`). */
const extensionsOf = (name: string) => {
  const parts = name.toLowerCase().split(".");
  const extensions: string[] = [];

  for (let index = 1; index < parts.length; index += 1) {
    extensions.push(parts.slice(index).join("."));
  }

  return extensions;
};

/** For the complete set: a file name, then a variant, then an extension. */
const tokenOf = (name: string, extensions: readonly string[]) => {
  const byName = TOKEN_BY_FILE_NAME.get(name.toLowerCase());

  if (byName !== undefined) {
    return byName;
  }

  for (const extension of extensions) {
    const variant = VARIANT_BY_EXTENSION.get(extension);

    if (variant !== undefined) {
      return variant;
    }

    const byExtension = TOKEN_BY_EXTENSION.get(extension);

    if (byExtension !== undefined) {
      return byExtension;
    }
  }

  return "default";
};

/** The symbol and token of a path. */
export const resolveFileIcon = (path: string) => {
  const name = path.split("/").at(-1) ?? path;
  const token = tokenOf(name, extensionsOf(name));

  return { name: `ck-file-symbol-${token}`, token };
};

const SPRITE_ATTRIBUTE = "data-file-icon-sprite";

/** Puts the icon sprite in the document once, where `<use href="#...">` can reach its symbols. */
const ensureSprite = () => {
  if (document.querySelector(`[${SPRITE_ATTRIBUTE}]`) !== null) {
    return;
  }

  const sheet = new DOMParser().parseFromString(
    `<svg ${SPRITE_ATTRIBUTE} data-icon-sprite aria-hidden="true" width="0" height="0" style="position:absolute">${FILE_ICON_SYMBOLS.join("")}</svg>`,
    "text/html"
  ).body.firstElementChild;

  if (sheet !== null) {
    document.body.append(sheet);
  }
};

type IconStyle = CSSProperties & Record<`--${string}`, string>;

/** A 16px glyph picked from the path, colored by its token. */
export const DiffFileIcon = ({ path }: { path: string }) => {
  useEffect(() => {
    ensureSprite();
  }, []);

  const { name, token } = resolveFileIcon(path);
  const style: IconStyle = { "--diff-file-icon-color": fileIconColor(token) };

  return (
    <span
      className="size-4 shrink-0 text-(--diff-file-icon-color)"
      data-icon-token={token}
      style={style}
    >
      <svg aria-hidden className="size-4 shrink-0" viewBox="0 0 16 16">
        <use href={`#${name}`} />
      </svg>
    </span>
  );
};
