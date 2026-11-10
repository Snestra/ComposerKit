/*
 * Code theme resolution for the diff's syntax highlighting.
 *
 * Code themes are TextMate themes, converted to the Zed form the highlighter
 * reads. A token role then resolves to a color, an italic flag and a weight.
 * This file holds the conversion and the resolution for every theme,
 * including Developer Light and Developer Dark.
 */

export interface TextMateTokenColor {
  name?: string;
  scope?: string | string[];
  settings: {
    "-webkit-font-smoothing"?: string;
    background?: string;
    content?: string;
    fontStyle?: string;
    foreground?: string;
    "text-decoration"?: string;
  };
}

export interface TextMateTheme {
  bg?: string;
  colors?: {
    [key: string]: string | string[] | null | undefined;
    "editor.background"?: string;
    "editor.foreground"?: string;
  };
  fg?: string;
  name: string;
  semanticTokenColors?: Record<string, string>;
  settings?: TextMateTokenColor[];
  tokenColors?: TextMateTokenColor[];
  type?: "dark" | "light";
}

export interface ZedSyntaxStyle {
  color?: string;
  font_style?: "italic" | "normal";
  font_weight?: number;
}

export interface ZedTheme {
  appearance: "dark" | "light";
  name: string;
  style: {
    "editor.background": string;
    "editor.foreground": string;
    syntax: Record<string, ZedSyntaxStyle>;
  };
}

export interface SyntaxThemes {
  dark: ZedTheme;
  light: ZedTheme;
}

/** The Zed token roles and the TextMate scopes they take their style from. */
const ZED_ROLE_SCOPES = {
  attribute: ["entity.other.attribute-name"],
  boolean: ["constant.language.boolean", "constant.language"],
  comment: ["comment"],
  constant: ["constant"],
  constructor: ["entity.name.type.class"],
  "diff.minus": ["markup.deleted"],
  "diff.plus": ["markup.inserted"],
  emphasis: ["markup.italic"],
  "emphasis.strong": ["markup.bold"],
  function: ["entity.name.function", "support.function"],
  keyword: ["keyword", "storage.type", "storage.modifier"],
  link_text: ["markup.underline.link"],
  link_uri: ["markup.underline.link", "string.other.link"],
  number: ["constant.numeric"],
  operator: ["keyword.operator"],
  preproc: ["keyword.control.directive"],
  property: ["variable.other.property", "support.type.property-name"],
  "property.json_key": ["support.type.property-name.json"],
  punctuation: ["punctuation"],
  string: ["string"],
  "string.escape": ["constant.character.escape"],
  "string.regex": ["string.regexp"],
  tag: ["entity.name.tag"],
  "text.literal": ["markup.inline.raw"],
  title: ["markup.heading"],
  type: ["entity.name.type", "support.type"],
  variable: ["variable"],
  "variable.parameter": ["variable.parameter"],
  "variable.special": ["variable.language"],
} satisfies Record<string, string[]>;

const scopesOfRule = (rule: TextMateTokenColor) =>
  [rule.scope ?? []].flat().flatMap((scope) => scope.split(","));

/**
 * The style a role takes from the rules: of the rules whose scope is, or is a
 * parent of, one of the role's scopes, the longest scope wins, separately for
 * the color and for the font.
 */
const styleOfRole = (
  rules: readonly TextMateTokenColor[],
  roleScopes: readonly string[]
): ZedSyntaxStyle => {
  const style: ZedSyntaxStyle = {};
  let colorLength = -1;
  let fontLength = -1;

  for (const rule of rules) {
    const { fontStyle, foreground } = rule.settings;

    for (const raw of scopesOfRule(rule)) {
      const scope = raw.trim();

      const matches =
        scope !== "" &&
        roleScopes.some(
          (entry) => entry === scope || entry.startsWith(`${scope}.`)
        );

      if (matches && foreground !== undefined && scope.length >= colorLength) {
        style.color = foreground;
        colorLength = scope.length;
      }

      if (matches && fontStyle !== undefined && scope.length >= fontLength) {
        style.font_style = fontStyle.includes("italic") ? "italic" : "normal";
        style.font_weight = fontStyle.includes("bold") ? 700 : 400;
        fontLength = scope.length;
      }
    }
  }

  return style;
};

/** TextMate theme to Zed theme. */
export const toZedTheme = (theme: TextMateTheme): ZedTheme => {
  const rules = theme.tokenColors ?? theme.settings ?? [];
  const base = rules.find((rule) => rule.scope === undefined);
  const appearance = theme.type === "light" ? "light" : "dark";
  const syntax: Record<string, ZedSyntaxStyle> = {};

  for (const [role, scopes] of Object.entries(ZED_ROLE_SCOPES)) {
    syntax[role] = styleOfRole(rules, scopes);
  }

  return {
    appearance,
    name: theme.name,
    style: {
      "editor.background":
        theme.bg ??
        theme.colors?.["editor.background"] ??
        base?.settings.background ??
        "var(--color-code-surface)",
      "editor.foreground":
        theme.fg ??
        theme.colors?.["editor.foreground"] ??
        base?.settings.foreground ??
        "var(--color-syntax-comment)",
      syntax,
    },
  };
};

export interface ResolvedTokenStyle {
  color: string | undefined;
  italic: boolean;
  weight: number;
}

const HEX_COLOR = /^#(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/iu;

/** The style of a role, falling back through its dotted parents. */
const lookupRole = (
  syntax: Record<string, ZedSyntaxStyle>,
  role: string
): ZedSyntaxStyle | undefined => {
  let first: ZedSyntaxStyle | undefined;

  for (let name = role; name !== "";) {
    const entry = Object.hasOwn(syntax, name) ? syntax[name] : undefined;

    if (entry !== undefined) {
      first ??= entry;

      if (entry.color !== undefined) {
        return { ...first, color: entry.color };
      }
    }

    const dot = name.lastIndexOf(".");
    name = dot === -1 ? "" : name.slice(0, dot);
  }

  return first;
};

const canonicalHex = (color: string) => {
  let value = color.trim().toLowerCase();

  if (value.length <= 5) {
    value = value.replaceAll(/[^#]/gu, "$&$&");
  }

  return value.length === 9 && value.endsWith("ff") ? value.slice(0, 7) : value;
};

const normalizeColor = (color: string | undefined) => {
  const value =
    color !== undefined && HEX_COLOR.test(color.trim())
      ? canonicalHex(color)
      : undefined;

  return value === `#${"0".repeat(8)}` ? undefined : value;
};

/** Color, italic and weight of a role in a Zed theme. */
export const resolveRoleStyle = (
  theme: ZedTheme,
  role: string
): ResolvedTokenStyle => {
  const found = lookupRole(theme.style.syntax, role);

  const hasFont =
    found?.font_style !== undefined || found?.font_weight !== undefined;

  const color = hasFont
    ? (found?.color ?? theme.style["editor.foreground"])
    : found?.color;

  const weight = found?.font_weight ?? 0;

  return {
    color: normalizeColor(color),
    italic: found?.font_style === "italic",
    weight: weight >= 100 && weight <= 900 ? Math.round(weight / 100) * 100 : 0,
  };
};
