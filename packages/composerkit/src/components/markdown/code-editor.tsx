"use client";

/* oxlint-disable anti-slop/no-known-value-widening -- Lookup tables are typed by their string keys. */
/* oxlint-disable eslint/complexity -- The LaTeX stream parser follows the stex tokenizer branch for branch. */
/* oxlint-disable eslint/prefer-named-capture-group, eslint/require-unicode-regexp -- The stex patterns are kept, which uses no u flag. */
/* oxlint-disable typescript/consistent-return -- Effects return a cleanup only when they registered something. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional values by truthiness. */
/* oxlint-disable unicorn/prefer-regexp-test -- CodeMirror's stream.match consumes the match; the patterns are not tests. */

import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import {
  defaultKeymap,
  toggleBlockComment,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  codeFolding,
  foldKeymap,
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import type { StreamParser } from "@codemirror/language";
import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  gotoLine,
  openSearchPanel,
  search,
  SearchQuery,
  selectNextOccurrence,
  selectSelectionMatches,
  setSearchQuery,
} from "@codemirror/search";
import {
  Annotation,
  Compartment,
  EditorState,
  Transaction,
} from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  placeholder as placeholderExtension,
} from "@codemirror/view";
import type { KeyBinding, Panel, ViewUpdate } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { languageSupport } from "composerkit/components/markdown/code-editor-languages";
import { cn } from "composerkit/lib/utils";
import { useEffect, useEffectEvent, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";

/**
 * The CodeMirror editor of an
 * editable code block. Its keymap is `[...default, ...fold, ...completion,
 * ...history, indentWithTab]` plus the find extension's own keymap.
 */

/** Marks a change that came from the `code` prop, which `onChange` skips. */
const external = Annotation.define<boolean>();

/** The matches counted by the find panel stop here. */
const MATCH_CAP = 999;

export interface CodeEditorFindMessages {
  close: string;
  find: string;
  next: string;
  noResults: string;
  placeholder: string;
  previous: string;
  results: (active: number, matches: number, capped: boolean) => string;
}

/** The English strings of the message descriptors. */
export const DEFAULT_FIND_MESSAGES: CodeEditorFindMessages = {
  close: "Close find",
  find: "Find in file",
  next: "Next result",
  noResults: "0 results",
  placeholder: "Find in file…",
  previous: "Previous result",
  results: (active, matches, capped) =>
    capped
      ? `${active} / ${matches}+ results`
      : `${active} / ${matches} results`,
};

export const DEFAULT_EDITOR_LABEL = "Edit code";

/**
 * The find extension's keymap. `Escape` and `Mod-f` apply in the editor and its panel.
 */
export const findKeymap: readonly KeyBinding[] = [
  { key: "Mod-f", run: openSearchPanel, scope: "editor search-panel" },
  {
    key: "F3",
    preventDefault: true,
    run: findNext,
    scope: "editor search-panel",
    shift: findPrevious,
  },
  {
    key: "Mod-g",
    preventDefault: true,
    run: findNext,
    scope: "editor search-panel",
    shift: findPrevious,
  },
  { key: "Escape", run: closeSearchPanel, scope: "editor search-panel" },
  { key: "Mod-Shift-l", run: selectSelectionMatches },
  { key: "Mod-Alt-g", run: gotoLine },
  { key: "Mod-d", preventDefault: true, run: selectNextOccurrence },
];

// The installed commands package also binds Ctrl-A on Mac to block comments;
// the default keymap binds Alt-A alone.
const sourceDefaultKeymap: readonly KeyBinding[] = defaultKeymap.map(
  (binding) =>
    binding.run === toggleBlockComment
      ? { key: "Alt-A", run: toggleBlockComment }
      : binding
);

/** Every binding list the editor installs, in the order. */
export const editorKeymaps: readonly (readonly KeyBinding[])[] = [
  sourceDefaultKeymap,
  foldKeymap,
  completionKeymap,
  historyKeymap,
  [indentWithTab],
  findKeymap,
];

// ---- LaTeX --------------------------------

interface Command {
  argument: string | null;
  bracketNo: number;
  name: string;
  styles: readonly string[];
}

interface LatexState {
  commands: Command[];
  mode: "math" | "text" | "command";
  mathClose: string;
}

const COMMAND_STYLES: Record<string, readonly string[]> = {
  Bibitem: ["atom"],
  RBibitem: ["atom"],
  begin: ["atom"],
  bibitem: ["atom"],
  cite: ["atom"],
  documentclass: ["", "atom"],
  end: ["atom"],
  eqref: ["atom"],
  importmodule: ["string", "builtin"],
  label: ["atom"],
  ref: ["atom"],
  usepackage: ["atom"],
};

const TOP_COMMAND = (): Command => ({
  argument: null,
  bracketNo: 0,
  name: "DEFAULT",
  styles: [],
});

const activeCommand = (state: LatexState): Command =>
  state.commands.findLast((command) => command.name !== "DEFAULT") ??
  TOP_COMMAND();

const commandStyle = (command: Command): string | null =>
  command.name === "DEFAULT"
    ? null
    : (command.styles[command.bracketNo - 1] ?? null);

const COMMAND_NAME = /^\\[a-zA-Z@\u00C0-\u1FFF\u2060-\uFFFF]+/;
const ESCAPED_SYMBOL = /^\\[$&%#{}_]/;
const ESCAPED_SPACING = /^\\[,;!/\\]/;
const MATH_WORD = /^\\[a-zA-Z@]+/;
const LETTERS = /^[a-zA-Z]+/;
const MATH_OPERATOR = /^[\^_&]/;
const MATH_SYMBOL = /^[+\-<>|=,/@!*:;'"`~#?]/;
const NUMBER = /^(\d+\.\d*|\d*\.\d+|\d+)/;
const DIGIT = /\d/;
const NUMBER_TAIL = /[\w.%]/;
const WORD_TAIL = /[\w\-_]/;
const BLANK = /[ \t\r]/;

const latexParser: StreamParser<LatexState> = {
  blankLine(state) {
    state.mode = "text";
    state.commands.length = 0;
  },
  copyState: (state) => ({ ...state, commands: [...state.commands] }),
  languageData: { commentTokens: { line: "%" } },
  name: "stex",
  startState: () => ({ commands: [], mathClose: "", mode: "text" }),
  token(stream, state) {
    if (state.mode === "math") {
      if (stream.eatSpace()) {
        return null;
      }

      if (state.mathClose !== "" && stream.match(state.mathClose)) {
        state.mode = "text";

        return "keyword";
      }

      if (stream.match(MATH_WORD)) {
        return "tag";
      }

      if (stream.match(LETTERS)) {
        return "variableName.special";
      }

      if (
        stream.match(ESCAPED_SYMBOL) ||
        stream.match(ESCAPED_SPACING) ||
        stream.match(MATH_OPERATOR)
      ) {
        return "tag";
      }

      if (stream.match(MATH_SYMBOL)) {
        return null;
      }

      if (stream.match(NUMBER)) {
        return "number";
      }

      const next = stream.next();

      if ("{}[]()".includes(next ?? "")) {
        return "bracket";
      }

      if (next === "%") {
        stream.skipToEnd();

        return "comment";
      }

      return "error";
    }

    if (state.mode === "command") {
      const peek = stream.peek();

      if (peek === "{" || peek === "[") {
        const command = activeCommand(state);
        command.bracketNo += 1;
        stream.eat(peek);
        state.mode = "text";

        return "bracket";
      }

      if (peek !== undefined && BLANK.test(peek)) {
        stream.eat(peek);

        return null;
      }

      state.mode = "text";
      state.commands.pop();

      return latexParser.token(stream, state);
    }

    const name = stream.match(COMMAND_NAME);

    if (name) {
      const command = stream.current().slice(1);

      state.commands.push({
        argument: null,
        bracketNo: 0,
        name: Object.hasOwn(COMMAND_STYLES, command) ? command : "DEFAULT",
        styles: COMMAND_STYLES[command] ?? [],
      });
      state.mode = "command";

      return "tag";
    }

    if (stream.match(ESCAPED_SYMBOL) || stream.match(ESCAPED_SPACING)) {
      return "tag";
    }

    for (const [open, close] of [
      ["\\[", "\\]"],
      ["\\(", "\\)"],
      ["$$", "$$"],
      ["$", "$"],
    ] as const) {
      if (stream.match(open)) {
        state.mode = "math";
        state.mathClose = close;

        return "keyword";
      }
    }

    const char = stream.next() ?? "";

    if (char === "%") {
      stream.skipToEnd();

      return "comment";
    }

    if (char === "}" || char === "]") {
      const command = state.commands.at(-1);

      if (command === undefined) {
        return "error";
      }

      state.mode = "command";

      return "bracket";
    }

    if (char === "{" || char === "[") {
      state.commands.push(TOP_COMMAND());

      return "bracket";
    }

    if (DIGIT.test(char)) {
      stream.eatWhile(NUMBER_TAIL);

      return "atom";
    }

    stream.eatWhile(WORD_TAIL);
    const active = activeCommand(state);

    if (active.name === "begin") {
      active.argument = stream.current();
    }

    return commandStyle(active);
  },
};

const latexLanguage = StreamLanguage.define(latexParser);

// The colors of the code editor's highlight style.
const highlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { color: "var(--color-text-notice)", tag: [tags.keyword, tags.tagName] },
    {
      color: "var(--color-chart-purple)",
      tag: [tags.atom, tags.number, tags.special(tags.variableName)],
    },
    {
      color: "var(--color-text-positive)",
      tag: [tags.string, tags.link, tags.url],
    },
    {
      color: "var(--ck-palette-ink-secondary)",
      tag: [tags.comment, tags.bracket],
    },
    { color: "var(--color-text-error)", tag: tags.invalid },
  ])
);

const isLatex = (language: string | undefined): boolean =>
  ["latex", "tex"].includes(language?.trim().toLowerCase() ?? "");

/** LaTeX, else the mode of the language, else none. */
const languageExtension = (language: string | undefined): Extension => {
  if (isLatex(language)) {
    return latexLanguage;
  }

  return (language === undefined ? null : languageSupport(language)) ?? [];
};

// ---- find panel ---------------------------------------------------------------

const countMatches = (view: EditorView) => {
  const query = getSearchQuery(view.state);

  if (!query.valid) {
    return { active: 0, capped: false, matches: 0 };
  }

  const { from, to } = view.state.selection.main;
  let matches = 0;
  let active = 0;
  let capped = false;
  const cursor = query.getCursor(view.state);

  for (let step = cursor.next(); !step.done; step = cursor.next()) {
    if (matches === MATCH_CAP) {
      capped = true;
      break;
    }

    matches += 1;

    if (step.value.from === from && step.value.to === to) {
      active = matches;
    }
  }

  return { active: active === 0 && matches > 0 ? 1 : active, capped, matches };
};

// Lucide artwork is covered by components/icon/lucide.license.
const SVG_CHEVRON = "m6 9 6 6 6-6";

const iconButton = (
  label: string,
  path: string,
  onClick: () => void
): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.ariaLabel = label;
  button.className =
    "inline-flex size-6 items-center justify-center rounded-md text-text-muted hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-ring";
  button.innerHTML = `<svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="16"><path d="${path}"/></svg>`;
  button.addEventListener("click", onClick);

  return button;
};

const createFindPanel =
  (messages: CodeEditorFindMessages) =>
  (view: EditorView): Panel => {
    const dom = document.createElement("div");
    dom.className = "cm-composerkit-search";

    const root = document.createElement("div");
    root.className =
      "inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-background p-1 text-sm shadow-sm";

    const input = document.createElement("input");
    input.type = "text";
    input.ariaLabel = messages.find;
    input.placeholder = messages.placeholder;
    input.setAttribute("main-field", "true");
    input.className =
      "h-6 w-44 min-w-0 rounded-md bg-transparent px-2 text-text outline-none placeholder:text-text-subtle";
    input.addEventListener("focus", () => {
      input.select();
    });
    input.addEventListener("input", () => {
      const current = getSearchQuery(view.state);

      view.dispatch({
        effects: setSearchQuery.of(
          new SearchQuery({
            caseSensitive: current.caseSensitive,
            literal: current.literal,
            regexp: current.regexp,
            replace: current.replace,
            search: input.value,
            wholeWord: current.wholeWord,
          })
        ),
      });
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        if (event.shiftKey) {
          findPrevious(view);
        } else {
          findNext(view);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSearchPanel(view);
      }
    });

    const previous = iconButton(messages.previous, "m18 15-6-6-6 6", () => {
      findPrevious(view);
    });

    const next = iconButton(messages.next, SVG_CHEVRON, () => {
      findNext(view);
    });

    const count = document.createElement("span");
    count.className = "px-1 text-xs text-text-muted tabular-nums";
    count.ariaLive = "polite";

    const close = iconButton(messages.close, "M18 6 6 18M6 6l12 12", () => {
      closeSearchPanel(view);
    });

    root.append(input, previous, next, count, close);
    dom.append(root);

    const draw = () => {
      const query = getSearchQuery(view.state);
      const visible = query.search.length > 0;
      const { active, capped, matches } = countMatches(view);

      if (input.value !== query.search) {
        input.value = query.search;
      }

      previous.hidden = !visible;
      next.hidden = !visible;
      count.hidden = !visible;
      count.textContent =
        matches === 0
          ? messages.noResults
          : messages.results(active, matches, capped);
    };

    draw();

    return {
      dom,
      mount() {
        input.focus();
        input.select();
      },
      top: true,
      update(update: ViewUpdate) {
        draw();

        if (update.docChanged || update.selectionSet) {
          draw();
        }
      },
    };
  };

const panelTheme = EditorView.theme({
  ".cm-composerkit-search": {
    background: "transparent",
    maxWidth: "100%",
    pointerEvents: "auto",
  },
  ".cm-panels.cm-panels-top:has(.cm-composerkit-search)": {
    background: "transparent",
    border: "none",
    boxSizing: "border-box",
    display: "flex",
    inset: "0 0 auto",
    justifyContent: "flex-end",
    padding: "12px",
    pointerEvents: "none",
    position: "absolute",
    zIndex: "10",
  },
  ".cm-searchMatch": { backgroundColor: "var(--color-fill-info-soft)" },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "var(--color-fill-info-surface)",
  },
});

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--ck-palette-ink)",
    fontSize: "inherit",
    minWidth: "0",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--color-editor-line-highlight)",
  },
  ".cm-content": {
    caretColor: "var(--color-editor-cursor)",
    lineHeight: "max(1.5em, calc(var(--spacing) * 5))",
    padding: "calc(var(--spacing) * 3) calc(var(--spacing) * 5)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--color-editor-cursor)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--ck-palette-ink-secondary)",
  },
  ".cm-line": { padding: "0" },
  ".cm-matchingBracket": {
    color: "inherit",
    outline: "1px solid var(--color-syntax-name)",
  },
  ".cm-nonmatchingBracket": {
    color: "inherit",
    outline: "1px solid var(--color-syntax-error)",
  },
  ".cm-scroller": {
    fontFamily: "var(--ck-type-code-family)",
    overflowX: "auto",
    overscrollBehaviorX: "contain",
  },
  ".cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--color-fill-text-selection)",
  },
});

// ---- component ----------------------------------------------------------------

export interface CodeEditorHandle {
  focus: () => void;
}

export interface CodeEditorProps {
  autoFocus?: boolean;
  className?: string;
  code: string;
  /** The `aria-label` of the editing surface. Default `Edit code`. */
  label?: string;
  /**
   * Language name. `latex` and `tex` select the LaTeX highlighting, and a name
   * with a mode (bash, zsh) its own. Any other name is a plain editor.
   */
  language?: string;
  messages?: CodeEditorFindMessages;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (code: string) => void;
  placeholder?: string;
  ref?: Ref<CodeEditorHandle>;
  wrapLines?: boolean;
}

const buildExtensions = (
  messages: CodeEditorFindMessages,
  compartments: Record<
    "a11y" | "language" | "placeholder" | "wrapping",
    Compartment
  >,
  options: {
    label: string;
    language?: string;
    placeholder?: string;
    wrapLines: boolean;
  },
  listeners: Extension
): Extension[] => [
  compartments.language.of(languageExtension(options.language)),
  editorTheme,
  highlightStyle,
  compartments.wrapping.of(
    isLatex(options.language) || options.wrapLines
      ? EditorView.lineWrapping
      : []
  ),
  compartments.placeholder.of(
    options.placeholder === undefined
      ? []
      : placeholderExtension(options.placeholder)
  ),
  compartments.a11y.of(
    EditorView.contentAttributes.of({
      "aria-label": options.label,
      "aria-multiline": "true",
      spellcheck: "false",
    })
  ),
  search({ createPanel: createFindPanel(messages), top: true }),
  panelTheme,
  history(),
  codeFolding(),
  autocompletion(),
  keymap.of(editorKeymaps.flat()),
  listeners,
];

/** An editable code block backed by CodeMirror. */
export const CodeEditor = ({
  autoFocus = true,
  className,
  code,
  label = DEFAULT_EDITOR_LABEL,
  language,
  messages = DEFAULT_FIND_MESSAGES,
  onBlur,
  onChange,
  placeholder,
  ref,
  wrapLines = false,
}: CodeEditorProps) => {
  const parent = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  const compartments = useRef({
    a11y: new Compartment(),
    language: new Compartment(),
    placeholder: new Compartment(),
    wrapping: new Compartment(),
  });

  const emitChange = useEffectEvent((value: string) => onChange?.(value));
  const emitBlur = useEffectEvent((event: FocusEvent) => onBlur?.(event));

  useImperativeHandle(ref, () => ({ focus: () => view.current?.focus() }));

  const latex = isLatex(language);

  const create = useEffectEvent((element: HTMLElement) => {
    const editor = new EditorView({
      parent: element,
      state: EditorState.create({
        doc: code,
        extensions: buildExtensions(
          messages,
          compartments.current,
          { label, language, placeholder, wrapLines },
          [
            EditorView.updateListener.of((update) => {
              if (
                update.transactions.some(
                  (transaction) =>
                    transaction.docChanged && !transaction.annotation(external)
                )
              ) {
                emitChange(update.state.doc.toString());
              }
            }),
            EditorView.domEventHandlers({
              blur: (event) => {
                emitBlur(event);
              },
            }),
          ]
        ),
      }),
    });

    editor.scrollDOM.classList.add("code-scrollport");
    view.current = editor;

    if (autoFocus) {
      editor.focus();
    }

    return () => {
      view.current = null;
      editor.destroy();
    };
  });

  useEffect(() => {
    if (parent.current) {
      return create(parent.current);
    }
  }, []);

  useEffect(() => {
    view.current?.dispatch({
      effects: compartments.current.language.reconfigure(
        languageExtension(language)
      ),
    });
  }, [language]);

  useEffect(() => {
    view.current?.dispatch({
      effects: [
        compartments.current.wrapping.reconfigure(
          latex || wrapLines ? EditorView.lineWrapping : []
        ),
        compartments.current.placeholder.reconfigure(
          placeholder === undefined ? [] : placeholderExtension(placeholder)
        ),
        compartments.current.a11y.reconfigure(
          EditorView.contentAttributes.of({
            "aria-label": label,
            "aria-multiline": "true",
            spellcheck: "false",
          })
        ),
      ],
    });
  }, [label, latex, placeholder, wrapLines]);

  useEffect(() => {
    const editor = view.current;

    if (editor && editor.state.doc.toString() !== code) {
      editor.dispatch({
        annotations: [external.of(true), Transaction.addToHistory.of(false)],
        changes: { from: 0, insert: code, to: editor.state.doc.length },
      });
    }
  }, [code]);

  return (
    <div
      className={cn(
        "min-h-24 w-full overflow-auto text-(length:--text-code,0.875em)",
        latex && "h-full",
        className
      )}
      data-ck-editor-search-surface
      dir="ltr"
      onCopy={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest(".cm-editor")
        ) {
          event.stopPropagation();
        }
      }}
      ref={parent}
    />
  );
};
