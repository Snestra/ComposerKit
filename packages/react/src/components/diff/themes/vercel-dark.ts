import type { TextMateTheme } from "../syntax-theme";

export default {
  bg: "#000000",
  colors: {
    "activityBar.activeBorder": "#006efe",
    "activityBar.background": "#000000",
    "activityBarBadge.background": "#006efe",
    "button.background": "#006efe",
    "editor.background": "#000000",
    "editor.foreground": "#ededed",
    "editorCursor.foreground": "#006efe",
    "editorGroupHeader.tabsBackground": "#000000",
    focusBorder: "#006efe",
    foreground: "#ededed",
    "panel.background": "#000000",
    "sideBar.background": "#000000",
    "sideBar.foreground": "#a1a1a1",
    "sideBarTitle.foreground": "#ededed",
    "textLink.foreground": "#006efe",
  },
  fg: "#ededed",
  name: "Vercel Dark",
  settings: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#666666",
      },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "constant.other.symbol",
        "entity.other.attribute-name",
      ],
      settings: {
        foreground: "#00AD3A",
      },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.language.boolean",
        "constant.character.escape",
        "regexp",
        "string.regexp",
      ],
      settings: {
        foreground: "#9540D5",
      },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "storage",
        "storage.type",
        "storage.modifier",
      ],
      settings: {
        foreground: "#006efe",
      },
    },
    {
      scope: [
        "entity.name.type",
        "entity.other.inherited-class",
        "support.class",
        "support.type",
      ],
      settings: {
        foreground: "#52A8FF",
      },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "variable.function",
        "meta.function-call",
      ],
      settings: {
        foreground: "#9540D5",
      },
    },
    {
      scope: [
        "keyword.operator",
        "punctuation.accessor",
        "punctuation.definition.tag",
        "punctuation",
        "punctuation.bracket",
        "punctuation.separator",
      ],
      settings: {
        foreground: "#a1a1a1",
      },
    },
    {
      scope: [
        "variable",
        "meta.object-literal.key",
        "meta.object.member",
        "meta.property-name",
      ],
      settings: {
        foreground: "#ededed",
      },
    },
  ],
} satisfies TextMateTheme;
