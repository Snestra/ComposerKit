/**
 * Icon definition rules: the canvas
 * overflow check, the paint variables for multicolor icons, and the per
 * instance id prefix for ids inside the SVG body.
 */

export type IconRole = "accent" | "brand" | "fixed" | "foreground";

export interface IconPaintLayer {
  color: string;
  role: IconRole;
  /** Names the `--icon-<token>` variable that can recolor this layer. */
  token?: string;
}

export type IconPaint =
  | { kind: "monochrome" }
  | { kind: "multicolor"; layers: readonly IconPaintLayer[] };

export interface IconRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface IconCanvas {
  frame?: IconRect;
  height: number;
  viewBox: string;
  visualBounds?: IconRect;
  width: number;
}

export interface IconDefinition {
  body: string;
  canvas: IconCanvas;
  name: string;
  /** Omitted for monochrome icons. Multicolor icons list their paint layers. */
  paint?: IconPaint;
}

const ICON_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const ID_PREFIX = /^[A-Za-z_:][A-Za-z0-9_.:-]*$/u;

// Named groups need an ES2018 target and this project targets ES2017.
// oxlint-disable-next-line prefer-named-capture-group
const LOCAL_ID = /(?:^|[\s<])id\s*=\s*(["'])([^"']+)\1/gu;
const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/gu;

const escapeRegExp = (value: string) =>
  value.replaceAll(REGEXP_SPECIALS, "\\$&");

export const assertIconDefinition = (definition: IconDefinition) => {
  if (!ICON_NAME.test(definition.name)) {
    throw new TypeError(
      "Use lowercase words separated by hyphens for the icon name"
    );
  }
};

/** True when the artwork reaches outside its frame, so it must not be clipped. */
export const canvasOverflows = ({ frame, visualBounds }: IconCanvas) =>
  frame !== undefined &&
  visualBounds !== undefined &&
  (visualBounds.x < frame.x ||
    visualBounds.y < frame.y ||
    visualBounds.x + visualBounds.width > frame.x + frame.width ||
    visualBounds.y + visualBounds.height > frame.y + frame.height);

/** The `--icon-<token>` variables of a multicolor icon, each with its fallback. */
export const iconPaintVariables = ({ paint }: IconDefinition) => {
  const variables: Record<string, string> = {};

  if (paint?.kind !== "multicolor") {
    return variables;
  }

  for (const layer of paint.layers) {
    if (layer.token !== undefined) {
      variables[`--icon-${layer.token}`] =
        `var(--${layer.token}, ${layer.color})`;
    }
  }

  return variables;
};

/** Points each tokenized color in the body at its `--icon-<token>` variable. */
export const paintIconBody = ({ body, paint }: IconDefinition) => {
  if (paint?.kind !== "multicolor") {
    return body;
  }

  let painted = body;

  for (const layer of paint.layers) {
    if (layer.token === undefined) {
      continue;
    }

    const attributes =
      layer.role === "brand" || layer.role === "fixed"
        ? "fill|stroke|stop-color"
        : "fill|stroke";

    painted = painted.replaceAll(
      new RegExp(
        `\\b(${attributes})=(["'])${escapeRegExp(layer.color)}\\2`,
        "giu"
      ),
      `$1="var(--icon-${layer.token}, ${layer.color})"`
    );
  }

  return painted;
};

/** Prefixes every id in the body, and each reference to it, with `prefix-`. */
export const scopeIconIds = (body: string, prefix: string) => {
  const ids = new Set([...body.matchAll(LOCAL_ID)].map((match) => match[2]));

  if (!ID_PREFIX.test(prefix)) {
    throw new TypeError("Provide a valid, nonempty SVG prefix for this icon");
  }

  let scoped = body;

  for (const id of ids) {
    const scopedId = `${prefix}-${id}`;
    const escaped = escapeRegExp(id);
    scoped = scoped
      .replaceAll(
        new RegExp(`((?:^|[\\s<])id\\s*=\\s*)(["'])${escaped}\\2`, "gu"),
        (_match, lead: string, quote: string) =>
          `${lead}${quote}${scopedId}${quote}`
      )
      .replaceAll(
        new RegExp(`(url\\(\\s*)(["']?)#${escaped}\\2(\\s*\\))`, "gu"),
        (_match, lead: string, quote: string, tail: string) =>
          `${lead}${quote}#${scopedId}${quote}${tail}`
      )
      .replaceAll(
        new RegExp(
          `((?:^|[\\s<])(?:xlink:)?href\\s*=\\s*)(["'])#${escaped}\\2`,
          "gu"
        ),
        (_match, lead: string, quote: string) =>
          `${lead}${quote}#${scopedId}${quote}`
      );
  }

  return scoped;
};
