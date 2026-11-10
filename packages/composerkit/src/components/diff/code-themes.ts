/*
 * The registered code themes. Each theme keeps its own module, so selecting a
 * theme other than the default loads only that theme.
 */

import { developerDarkTheme } from "./developer-dark-theme";
import { developerLightTheme } from "./developer-light-theme";
import { toZedTheme } from "./syntax-theme";
import type { SyntaxThemes, TextMateTheme } from "./syntax-theme";

interface CodeThemeRegistration {
  appearance: "dark" | "light";
  load: () => Promise<{ default: TextMateTheme }>;
}

export const CODE_THEMES = {
  "Developer Dark": {
    appearance: "dark",
    load: async () => await import("./themes/developer-dark"),
  },
  "Developer Light": {
    appearance: "light",
    load: async () => await import("./themes/developer-light"),
  },
  "Linear Dark": {
    appearance: "dark",
    load: async () => await import("./themes/linear-dark"),
  },
  "Linear Light": {
    appearance: "light",
    load: async () => await import("./themes/linear-light"),
  },
  "Matrix Dark": {
    appearance: "dark",
    load: async () => await import("./themes/matrix-dark"),
  },
  "Notion Dark": {
    appearance: "dark",
    load: async () => await import("./themes/notion-dark"),
  },
  "Notion Light": {
    appearance: "light",
    load: async () => await import("./themes/notion-light"),
  },
  "OG Dark": {
    appearance: "dark",
    load: async () => await import("./themes/og-dark"),
  },
  "Raycast Dark": {
    appearance: "dark",
    load: async () => await import("./themes/raycast-dark"),
  },
  "Raycast Light": {
    appearance: "light",
    load: async () => await import("./themes/raycast-light"),
  },
  "Sentry Dark": {
    appearance: "dark",
    load: async () => await import("./themes/sentry-dark"),
  },
  "Vercel Dark": {
    appearance: "dark",
    load: async () => await import("./themes/vercel-dark"),
  },
  "Vercel Light": {
    appearance: "light",
    load: async () => await import("./themes/vercel-light"),
  },
  "Xcode Dark": {
    appearance: "dark",
    load: async () => await import("./themes/xcode-dark"),
  },
  "Xcode Light": {
    appearance: "light",
    load: async () => await import("./themes/xcode-light"),
  },
  "ayu-dark": {
    appearance: "dark",
    load: async () => await import("./themes/ayu-dark"),
  },
  "catppuccin-latte": {
    appearance: "light",
    load: async () => await import("./themes/catppuccin-latte"),
  },
  "catppuccin-mocha": {
    appearance: "dark",
    load: async () => await import("./themes/catppuccin-mocha"),
  },
  "dark-plus": {
    appearance: "dark",
    load: async () => await import("./themes/dark-plus"),
  },
  dracula: {
    appearance: "dark",
    load: async () => await import("./themes/dracula"),
  },
  "everforest-dark": {
    appearance: "dark",
    load: async () => await import("./themes/everforest-dark"),
  },
  "everforest-light": {
    appearance: "light",
    load: async () => await import("./themes/everforest-light"),
  },
  "github-dark-default": {
    appearance: "dark",
    load: async () => await import("./themes/github-dark-default"),
  },
  "github-light-default": {
    appearance: "light",
    load: async () => await import("./themes/github-light-default"),
  },
  "gruvbox-dark-medium": {
    appearance: "dark",
    load: async () => await import("./themes/gruvbox-dark-medium"),
  },
  "gruvbox-light-medium": {
    appearance: "light",
    load: async () => await import("./themes/gruvbox-light-medium"),
  },
  "light-plus": {
    appearance: "light",
    load: async () => await import("./themes/light-plus"),
  },
  "material-theme-darker": {
    appearance: "dark",
    load: async () => await import("./themes/material-theme-darker"),
  },
  monokai: {
    appearance: "dark",
    load: async () => await import("./themes/monokai"),
  },
  "night-owl": {
    appearance: "dark",
    load: async () => await import("./themes/night-owl"),
  },
  nord: {
    appearance: "dark",
    load: async () => await import("./themes/nord"),
  },
  "one-dark-pro": {
    appearance: "dark",
    load: async () => await import("./themes/one-dark-pro"),
  },
  "one-light": {
    appearance: "light",
    load: async () => await import("./themes/one-light"),
  },
  "rose-pine-dawn": {
    appearance: "light",
    load: async () => await import("./themes/rose-pine-dawn"),
  },
  "rose-pine-moon": {
    appearance: "dark",
    load: async () => await import("./themes/rose-pine-moon"),
  },
  "solarized-dark": {
    appearance: "dark",
    load: async () => await import("./themes/solarized-dark"),
  },
  "solarized-light": {
    appearance: "light",
    load: async () => await import("./themes/solarized-light"),
  },
  "tokyo-night": {
    appearance: "dark",
    load: async () => await import("./themes/tokyo-night"),
  },
} as const satisfies Record<string, CodeThemeRegistration>;

export type CodeThemeName = keyof typeof CODE_THEMES;

export interface CodeThemeSelection {
  dark: CodeThemeName;
  light: CodeThemeName;
}

export const DEFAULT_CODE_THEME_SELECTION = {
  dark: "Developer Dark",
  light: "Developer Light",
} as const satisfies CodeThemeSelection;

export const CODE_THEME_NAMES = Object.keys(CODE_THEMES).filter(
  (name): name is CodeThemeName => Object.hasOwn(CODE_THEMES, name)
);

export const loadCodeThemes = async (
  selection: CodeThemeSelection
): Promise<SyntaxThemes> => {
  const [light, dark] = await Promise.all([
    CODE_THEMES[selection.light].load(),
    CODE_THEMES[selection.dark].load(),
  ]);

  return { dark: toZedTheme(dark.default), light: toZedTheme(light.default) };
};

export const DEFAULT_SYNTAX_THEMES: SyntaxThemes = {
  dark: toZedTheme(developerDarkTheme),
  light: toZedTheme(developerLightTheme),
};
