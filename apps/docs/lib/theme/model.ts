import Color from "colorjs.io";

export const modes = ["light", "dark"] as const;
export type Mode = (typeof modes)[number];

export const roleIds = [
  "neutral",
  "accent",
  "message",
  "success",
  "danger",
  "warning",
  "caution",
  "info",
  "discovery",
  "syntax",
] as const;
export type RoleId = (typeof roleIds)[number];
export type Seeds = Record<RoleId, string>;

interface RoleDefinition {
  id: RoleId;
  label: string;
  /** The DESIGN.md token whose value is this role's default seed. */
  seedToken: string;
  /** Token names that follow this role, tested in role order. */
  match: RegExp;
}

// Order matters: the first matching role owns a token, and tokens no role
// matches keep their value. Neutral comes last because it catches the rest.
const fixedTokens =
  /^(?:light|dark)-(?:fixed-|transparent$|shadow$|tooltip-|media-)|^file-/u;

export const roles: readonly RoleDefinition[] = [
  {
    id: "message",
    label: "Message",
    match: /-message(?:-ink)?$/u,
    seedToken: "dark-message",
  },
  {
    id: "syntax",
    label: "Syntax",
    match: /-syntax-/u,
    seedToken: "light-syntax-4",
  },
  {
    id: "success",
    label: "Success",
    match: /status-success|decoration-added|editor-added/u,
    seedToken: "light-status-success-fill",
  },
  {
    id: "danger",
    label: "Danger",
    match: /status-danger|decoration-deleted|editor-deleted|accent-red/u,
    seedToken: "light-status-danger-fill",
  },
  {
    id: "warning",
    label: "Warning",
    match: /status-warning/u,
    seedToken: "light-status-warning-fill",
  },
  {
    id: "caution",
    label: "Caution",
    match: /status-caution/u,
    seedToken: "light-status-caution-fill",
  },
  {
    id: "info",
    label: "Info",
    match: /status-info/u,
    seedToken: "light-status-info-fill",
  },
  {
    id: "discovery",
    label: "Discovery",
    match: /status-discovery|accent-purple/u,
    seedToken: "light-status-discovery-fill",
  },
  {
    id: "accent",
    label: "Accent",
    match: /accent|border-focus/u,
    seedToken: "dark-base-accent",
  },
  {
    id: "neutral",
    label: "Neutral",
    match: /^(?:light|dark)-/u,
    seedToken: "light-base-ink",
  },
];

export interface SourceToken {
  name: string;
  value: string;
}

const colorsBlockStart = /^colors:\s*$/mu;
const colorLine = /^ {2}([a-z0-9-]+): "([^"]+)"$/u;

/** Reads the color tokens, in file order, from DESIGN.md front matter. */
export const parseDesignColors = (designMd: string): SourceToken[] => {
  const start = colorsBlockStart.exec(designMd);
  if (!start) {
    throw new Error("DESIGN.md has no colors block");
  }
  const tokens: SourceToken[] = [];
  for (const line of designMd.slice(start.index).split("\n").slice(1)) {
    const match = colorLine.exec(line);
    if (!match) {
      break;
    }
    tokens.push({ name: match[1], value: match[2] });
  }
  return tokens;
};

export const defaultSeeds = (source: readonly SourceToken[]): Seeds => {
  const byName = new Map(source.map((token) => [token.name, token.value]));
  const seeds = {} as Seeds;
  for (const role of roles) {
    const value = byName.get(role.seedToken);
    if (!value) {
      throw new Error(`DESIGN.md lacks the ${role.seedToken} seed token`);
    }
    seeds[role.id] = new Color(value).to("srgb").toString({
      collapse: false,
      format: "hex",
    });
  }
  return seeds;
};

const roleOf = (name: string): RoleId | undefined =>
  fixedTokens.test(name)
    ? undefined
    : roles.find((role) => role.match.test(name))?.id;

const modeOf = (name: string): Mode | undefined => {
  if (name.startsWith("light-")) {
    return "light";
  }
  return name.startsWith("dark-") ? "dark" : undefined;
};

const toHex = (color: Color) =>
  color
    .to("srgb")
    .toGamut({ space: "srgb" })
    .toString({ collapse: false, format: "hex" });

const oklch = (value: string | Color) => {
  const [l, c, h] = new Color(value).to("oklch").coords;
  return { c: c ?? 0, h: Number.isNaN(h) || h === null ? 0 : h, l: l ?? 0 };
};

// A tinted neutral stays close to grey: the seed adds at most this much chroma.
const neutralTintLimit = 0.04;

/**
 * Recolors a token toward its role's seed and keeps its OKLCH lightness.
 * A chromatic role turns the hue by the seed's hue change and scales chroma
 * by the seed's chroma change. Neutral adds the seed's tint.
 */
const recolorKeepingLightness = (
  value: string,
  role: RoleId,
  seed: string,
  defaultSeed: string
) => {
  const original = new Color(value);
  const token = oklch(original);
  const from = oklch(defaultSeed);
  const to = oklch(seed);
  let { c, h } = token;
  if (role === "neutral") {
    c = Math.max(
      0,
      c + Math.min(to.c, neutralTintLimit) - Math.min(from.c, neutralTintLimit)
    );
    h = to.c > 0.002 ? to.h : h;
  } else {
    c *= from.c > 0.001 ? to.c / from.c : 1;
    h += to.h - from.h;
  }
  return new Color("oklch", [token.l, c, h], original.alpha)
    .to("srgb")
    .toGamut({ space: "srgb" });
};

/** Moves OKLCH lightness, keeping hue and chroma where the gamut allows. */
const withLightness = (color: Color, lightness: number) => {
  const { c, h } = oklch(color);
  return new Color("oklch", [lightness, c, h], color.alpha)
    .to("srgb")
    .toGamut({ space: "srgb" });
};

const opaque = (color: Color) => {
  const result = color.clone();
  result.alpha = 1;
  return result;
};

/**
 * Finds the lightness whose WCAG luminance equals the target. Luminance rises
 * with OKLCH lightness at a fixed hue, so a bisection converges.
 */
const matchLuminance = (color: Color, luminance: number) => {
  let low = 0;
  let high = 1;
  for (let step = 0; step < 30; step += 1) {
    const middle = (low + high) / 2;
    if (opaque(withLightness(color, middle)).luminance < luminance) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return withLightness(color, (low + high) / 2);
};

export interface ThemeToken {
  name: string;
  mode: Mode | undefined;
  role: RoleId | undefined;
  /** The value in packages/composerkit/DESIGN.md. */
  source: string;
  /** The seed recolor with the token's lightness kept, before any limit. */
  raw: string;
  /** The exported value. Equals source when the role keeps its default seed. */
  value: string;
}

export interface ContrastLimit {
  wcag: number;
  apca: number;
}

// WCAG AA, and APCA Lc 60, its body-text minimum. The default dark theme sets
// status, syntax and tertiary text between Lc 45 and 60, so a pair whose
// default is below Lc 60 keeps its default as the floor: a brand theme never
// reads worse than the default theme.
export const wcagMinimum = 4.5;
export const apcaMinimum = 60;

interface PairDefinition {
  text: string;
  background: string;
}

const modePairs = (mode: Mode): PairDefinition[] => {
  const m = (name: string) => `${mode}-${name}`;
  const pair = (text: string, background: string): PairDefinition => ({
    background: m(background),
    text: m(text),
  });
  const statuses = ["success", "danger", "warning", "info", "discovery"];
  const statusTexts = [...statuses, "caution"];
  return [
    pair("ink", "canvas"),
    pair("ink", "surface"),
    pair("ink", "control"),
    pair("muted-ink", "canvas"),
    pair("muted-ink", "surface"),
    pair("muted-ink", "control"),
    pair(mode === "light" ? "surface" : "canvas", "ink"),
    pair("message-ink", "message"),
    pair("app-text-foreground", "app-background-surface"),
    pair("app-text-foreground", "app-background-surface-under"),
    pair("app-text-foreground-secondary", "app-background-surface"),
    pair("app-text-foreground-tertiary", "app-background-surface"),
    pair("app-text-accent", "app-background-surface"),
    pair("app-text-accent", "app-background-accent"),
    ...statusTexts.map((status) => pair(`status-${status}`, "surface")),
    ...statuses.map((status) =>
      pair(`status-${status}`, `status-${status}-surface`)
    ),
    ...[
      "1",
      "2",
      "3",
      "4",
      "5",
      "attribute",
      "comment",
      "keyword",
      "literal",
      "string",
      "variable",
      "name",
      "error",
    ].map((name) => pair(`syntax-${name}`, "code-surface")),
  ];
};

const allPairs = modes.flatMap(modePairs);

const composite = (top: Color, bottom: Color) => {
  const [r, g, b] = top.to("srgb").coords;
  const [br, bg, bb] = bottom.to("srgb").coords;
  const a = top.alpha;
  const mix = (front: number | null, back: number | null) =>
    (front ?? 0) * a + (back ?? 0) * (1 - a);
  return new Color("srgb", [mix(r, br), mix(g, bg), mix(b, bb)]);
};

export interface Contrast {
  wcag: number;
  apca: number;
}

const measure = (text: Color, background: Color): Contrast => {
  const seen = composite(text, background);
  return {
    apca: Math.abs(background.contrast(seen, "APCA")),
    wcag: background.contrast(seen, "WCAG21"),
  };
};

const passes = (contrast: Contrast, limit: ContrastLimit) =>
  contrast.wcag >= limit.wcag && contrast.apca >= limit.apca;

export interface PairResult {
  text: string;
  background: string;
  limit: ContrastLimit;
  /** Contrast of the raw recolor, before the limits moved any lightness. */
  raw: Contrast;
  final: Contrast;
  /** The final colors meet the limit. */
  ok: boolean;
  /** The raw recolor broke the limit and the theme corrected it. */
  corrected: boolean;
}

export interface Theme {
  seeds: Seeds;
  tokens: ThemeToken[];
  pairs: PairResult[];
  /** True when every pair meets its limit, so the theme may be exported. */
  exportable: boolean;
}

/**
 * Moves the text's lightness away from the background, in the smallest
 * steps that reach the limit. Translucent text that runs out of lightness
 * then gains opacity. Returns undefined when nothing reaches the limit.
 */
const correctText = (
  text: Color,
  background: Color,
  limit: ContrastLimit
): Color | undefined => {
  const start = oklch(text).l;
  const darker = opaque(background).luminance > 0.18;
  for (let step = 1; step <= 100; step += 1) {
    const lightness = darker
      ? Math.max(0, start - step * 0.01)
      : Math.min(1, start + step * 0.01);
    const candidate = withLightness(text, lightness);
    if (passes(measure(candidate, background), limit)) {
      return candidate;
    }
  }
  const extreme = withLightness(text, darker ? 0 : 1);
  for (let alpha = text.alpha + 0.01; alpha <= 1; alpha += 0.01) {
    const candidate = extreme.clone();
    candidate.alpha = Math.min(1, alpha);
    if (passes(measure(candidate, background), limit)) {
      return candidate;
    }
  }
  return undefined;
};

export const buildTheme = (
  source: readonly SourceToken[],
  seeds: Seeds
): Theme => {
  const defaults = defaultSeeds(source);
  const sourceColors = new Map(
    source.map(({ name, value }) => [name, new Color(value)])
  );
  const rawColors = new Map<string, Color>();
  const finalColors = new Map<string, Color>();
  const changed = new Set<string>();
  const tokens: ThemeToken[] = source.map(({ name, value }) => {
    const role = roleOf(name);
    const seedChanged =
      role !== undefined &&
      seeds[role].toLowerCase() !== defaults[role].toLowerCase();
    if (!seedChanged) {
      const color = new Color(value);
      rawColors.set(name, color);
      finalColors.set(name, color);
      return {
        mode: modeOf(name),
        name,
        raw: value,
        role,
        source: value,
        value,
      };
    }
    const raw = recolorKeepingLightness(
      value,
      role,
      seeds[role],
      defaults[role]
    );
    const anchored = matchLuminance(raw, opaque(new Color(value)).luminance);
    rawColors.set(name, raw);
    finalColors.set(name, anchored);
    changed.add(name);
    return {
      mode: modeOf(name),
      name,
      raw: toHex(raw),
      role,
      source: value,
      value: toHex(anchored),
    };
  });

  const resolve = (colors: Map<string, Color>, pair: PairDefinition) => {
    const text = colors.get(pair.text);
    const background = colors.get(pair.background);
    if (!text || !background) {
      throw new Error(
        `Contrast pair ${pair.text} on ${pair.background} names a missing token`
      );
    }
    return { background, text };
  };

  const limitOf = (pair: PairDefinition): ContrastLimit => {
    const { text, background } = resolve(sourceColors, pair);
    return {
      apca: Math.min(apcaMinimum, measure(text, background).apca),
      wcag: wcagMinimum,
    };
  };
  const limited = allPairs.map((pair) => ({ ...pair, limit: limitOf(pair) }));

  for (const pair of limited) {
    const { text, background } = resolve(finalColors, pair);
    if (!passes(measure(text, background), pair.limit)) {
      const corrected = correctText(text, background, pair.limit);
      if (corrected) {
        finalColors.set(pair.text, corrected);
        changed.add(pair.text);
      }
    }
  }

  const pairs = limited.map((pair): PairResult => {
    const before = resolve(rawColors, pair);
    const after = resolve(finalColors, pair);
    const raw = measure(before.text, before.background);
    const final = measure(after.text, after.background);
    const ok = passes(final, pair.limit);
    return {
      background: pair.background,
      corrected: ok && !passes(raw, pair.limit),
      final,
      limit: pair.limit,
      ok,
      raw,
      text: pair.text,
    };
  });

  for (const token of tokens) {
    const color = finalColors.get(token.name);
    if (color && changed.has(token.name)) {
      token.value = toHex(color);
    }
  }

  return {
    exportable: pairs.every((pair) => pair.ok),
    pairs,
    seeds,
    tokens,
  };
};

const rampLightness = [
  0.97, 0.93, 0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22,
] as const;

/** An OKLCH ramp at the seed's hue and chroma, from light to dark. */
export const ramp = (seed: string): string[] => {
  const { c, h } = oklch(seed);
  return rampLightness.map((lightness) =>
    toHex(new Color("oklch", [lightness, c, h]))
  );
};
