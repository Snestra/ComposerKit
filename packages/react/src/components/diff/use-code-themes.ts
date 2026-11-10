"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_CODE_THEME_SELECTION,
  DEFAULT_SYNTAX_THEMES,
  loadCodeThemes,
} from "./code-themes";
import type { CodeThemeSelection } from "./code-themes";
import type { SyntaxThemes } from "./syntax-theme";

/** Resolve the selected themes on demand, with the default theme as the pending state. */
export const useCodeThemes = (
  selection: CodeThemeSelection = DEFAULT_CODE_THEME_SELECTION
): SyntaxThemes => {
  const key = `${selection.light}\u0000${selection.dark}`;
  const { light } = selection;
  const { dark } = selection;

  const [resolved, setResolved] = useState<{
    key: string;
    themes: SyntaxThemes;
  }>({ key, themes: DEFAULT_SYNTAX_THEMES });

  useEffect(() => {
    let cancelled = false;

    if (
      key !==
      `${DEFAULT_CODE_THEME_SELECTION.light}\u0000${DEFAULT_CODE_THEME_SELECTION.dark}`
    ) {
      loadCodeThemes({ dark, light })
        .then((themes) => {
          if (!cancelled) {
            setResolved({ key, themes });
          }

          return themes;
        })
        .catch(console.error);
    }

    return () => {
      cancelled = true;
    };
  }, [dark, key, light]);

  return resolved.key === key ? resolved.themes : DEFAULT_SYNTAX_THEMES;
};
