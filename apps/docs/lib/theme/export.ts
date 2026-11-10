import Color from "colorjs.io";
import type { Theme } from "./model.ts";

const nameLine = /^name: .*$/mu;
const colorLine = /^( {2})([a-z0-9-]+): "([^"]+)"$/u;
const tableRow =
  /^\| `--color-([a-z0-9-]+)`(\s*)\| `([^`]+)`(\s*)\| `([^`]+)`(\s*)\|(.*)$/u;

const valuesByName = (theme: Theme) =>
  new Map(
    theme.tokens
      .filter((token) => token.value !== token.source)
      .map((token) => [token.name, token.value])
  );

/** Keeps a Markdown table cell's width when its value changes. */
const cell = (value: string, oldValue: string, oldPadding: string) =>
  `\`${value}\`${" ".repeat(Math.max(1, oldValue.length + oldPadding.length - value.length))}`;

/**
 * Writes the theme into the source DESIGN.md. Only changed tokens are
 * rewritten, so the default seeds give back the source byte for byte.
 */
export const toDesignMd = (
  sourceDesignMd: string,
  theme: Theme,
  themeName?: string
): string => {
  const changed = valuesByName(theme);
  const lines = sourceDesignMd.split("\n").map((line) => {
    const color = colorLine.exec(line);
    if (color) {
      const value = changed.get(color[2]);
      return value ? `${color[1]}${color[2]}: "${value}"` : line;
    }
    const row = tableRow.exec(line);
    if (row) {
      const [, name, namePad, light, lightPad, dark, darkPad, rest] = row;
      const newLight = changed.get(`light-${name}`) ?? light;
      const newDark = changed.get(`dark-${name}`) ?? dark;
      if (newLight === light && newDark === dark) {
        return line;
      }
      return `| \`--color-${name}\`${namePad}| ${cell(newLight, light, lightPad)}| ${cell(newDark, dark, darkPad)}|${rest}`;
    }
    return line;
  });
  const text = lines.join("\n");
  return themeName ? text.replace(nameLine, `name: ${themeName}`) : text;
};

const round = (value: number | null) =>
  Math.round(Math.min(1, Math.max(0, value ?? 0)) * 1000) / 1000;

interface DtcgColor {
  $value: {
    colorSpace: "srgb";
    components: [number, number, number];
    alpha?: number;
    hex: string;
  };
}

/**
 * W3C Design Tokens (format 2025.10) for the theme's colors, in the shape the
 * design.md CLI emits. DTCG keeps hex to six digits and puts opacity in alpha.
 */
export const toDtcg = (theme: Theme, themeName: string) => {
  const color: Record<string, DtcgColor | "color"> = { $type: "color" };
  for (const token of theme.tokens) {
    const value = new Color(token.value).to("srgb");
    const [r, g, b] = value.coords;
    const opaque = value.clone();
    opaque.alpha = 1;
    color[token.name] = {
      $value: {
        colorSpace: "srgb",
        components: [round(r), round(g), round(b)],
        ...(value.alpha < 1 ? { alpha: round(value.alpha) } : {}),
        hex: opaque.toGamut({ space: "srgb" }).toString({
          collapse: false,
          format: "hex",
        }),
      },
    };
  }
  return {
    $description: themeName,
    $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
    color,
  };
};

/**
 * CSS that overrides the scoped light and dark source variables. Components
 * resolve them with light-dark(), so one block themes both modes and every
 * nested theme scope.
 */
export const toThemeCss = (theme: Theme): string => {
  const declarations = theme.tokens
    .filter((token) => token.mode !== undefined)
    .map((token) => `  --color-${token.name}: ${token.value};`);
  return `:root {\n${declarations.join("\n")}\n}\n`;
};
