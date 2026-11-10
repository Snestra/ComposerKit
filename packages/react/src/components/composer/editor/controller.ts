import {
  isMentionNode,
  composerSchema,
} from "@workspace/react/components/composer/editor/schema";
import type { ComposerMentionAttributes } from "@workspace/react/components/composer/editor/schema";
import { submitsOnEnter } from "@workspace/react/components/composer/rules";
import type { ComposerEnterBehavior } from "@workspace/react/components/composer/rules";
import { handleComposerShortcutKey } from "@workspace/react/components/ui/composer";
import type { SelectedMode } from "@workspace/react/components/ui/composer";
import {
  baseKeymap,
  chainCommands,
  exitCode,
  toggleMark,
} from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import {
  InputRule,
  ellipsis,
  emDash,
  inputRules,
  smartQuotes,
} from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState, Plugin, PluginKey, Selection } from "prosemirror-state";
import type { Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import type { NodeViewConstructor } from "prosemirror-view";

/*
 * The composer editor engine: a ProseMirror editor and its controller class.
 * The plugin set: history with a 500 ms group delay and Mod-z, Mod-y and
 * Mod-Shift-z, the typography input rules (-- to an em dash, ... to an ellipsis, curly quotes), the
 * placeholder decoration (a node decoration with class prosemirror-placeholder
 * and data-placeholder on an empty single paragraph), the base keymap and the
 * key routing for Enter, Escape and Backspace.
 */

const HISTORY_GROUP_DELAY_MS = 500;
const IME_KEY_CODE = 229;

const formattingRule = (
  pattern: RegExp,
  mark: "strong" | "em" | "code" | "strike"
) =>
  new InputRule(pattern, (state, match, start, end) => {
    const [, prefix, content, trailing] = match;
    const from = start + prefix.length;

    return state.tr
      .replaceWith(from, end, [
        composerSchema.text(content, [composerSchema.marks[mark].create()]),
        composerSchema.text(trailing),
      ])
      .removeStoredMark(composerSchema.marks[mark]);
  });

// The input rule handler reads capture groups by position.
/* oxlint-disable eslint/prefer-named-capture-group */
const formattingRules = [
  formattingRule(/(^|[^*])\*\*([^\s*](?:.*?[^\s*])?)\*\*([^*])$/u, "strong"),
  formattingRule(/(^|[^\w_])__([^\s_](?:.*?[^\s_])?)__([^\w_])$/u, "strong"),
  formattingRule(/(^|[^*])\*([^\s*](?:.*?[^\s*])?)\*([^*])$/u, "em"),
  formattingRule(/(^|[^_])_([^\s_](?:.*?[^\s_])?)_([^_])$/u, "em"),
  formattingRule(/(^|[^`])`([^`]+)`([^`])$/u, "code"),
  formattingRule(/(^|[^~])~~([^~]+)~~([^~])$/u, "strike"),
];
/* oxlint-enable eslint/prefer-named-capture-group */

/** The range a dictation transcript was inserted at. */
interface InsertedTranscript {
  from: number;
  to: number;
}

const transcriptKey = new PluginKey<InsertedTranscript | null>(
  "composer-transcript"
);

const placeholderKey = new PluginKey<string>("composer-placeholder");

/** The live inputs of the key routing, read at every key press. */
interface ComposerEditorKeyContext {
  enterBehavior: ComposerEnterBehavior;
  handleEscape: () => void;
  hasActiveMentionMenu: boolean;
  hasDefaultMode: boolean;
  isPlanMode: boolean;
  onSubmit: () => void;
  setSelectedMode: (mode: SelectedMode) => void;
}

const doNothing = () => {
  /* the default key context has nothing to run */
};

const defaultKeyContext: ComposerEditorKeyContext = {
  enterBehavior: "enter",
  handleEscape: doNothing,
  hasActiveMentionMenu: false,
  hasDefaultMode: true,
  isPlanMode: false,
  onSubmit: doNothing,
  setSelectedMode: doNothing,
};

const isComposingKey = (event: KeyboardEvent) =>
  // oxlint-disable-next-line typescript/no-deprecated -- the component checks keyCode 229 for an IME composition
  event.isComposing || event.keyCode === IME_KEY_CODE;

/** True when the document has more than one line (a second block or a line break). */
const isMultilineDocument = (doc: ProseMirrorNode) => {
  if (doc.childCount > 1) {
    return true;
  }

  let multiline = false;

  doc.descendants((node) => {
    if (node.type.name === "hardBreak") {
      multiline = true;
    }

    return !multiline;
  });

  return multiline;
};

/** Enter that submits, Escape and Backspace that leave plan mode or run the escape handler. */
const routeKey = (
  view: EditorView,
  event: KeyboardEvent,
  context: ComposerEditorKeyContext
) => {
  if (isComposingKey(event)) {
    return false;
  }

  const { selection } = view.state;

  if (
    handleComposerShortcutKey({
      event,
      handleEscape: context.handleEscape,
      hasActiveMentionMenu: context.hasActiveMentionMenu,
      hasDefaultMode: context.hasDefaultMode,
      isComposerFocused: view.hasFocus(),
      isPlanMode: context.isPlanMode,
      isSelectionAtStart: selection.empty && selection.from === 1,
      setSelectedMode: context.setSelectedMode,
    })
  ) {
    return true;
  }

  if (
    submitsOnEnter(
      event,
      context.enterBehavior,
      isMultilineDocument(view.state.doc),
      view.dom.ownerDocument.activeElement
    )
  ) {
    event.preventDefault();
    event.stopPropagation();
    context.onSubmit();

    return true;
  }

  return false;
};

const insertHardBreak = chainCommands(exitCode, (state, dispatch) => {
  dispatch?.(
    state.tr
      .replaceSelectionWith(composerSchema.nodes.hardBreak.create())
      .scrollIntoView()
  );

  return true;
});

// SAFETY: this controller is the only writer of the placeholder meta key and always writes a string.
const placeholderMeta = (transaction: Transaction) =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the meta is read back as the type it was written with
  transaction.getMeta(placeholderKey) as string | undefined;

// SAFETY: this controller is the only writer of the transcript meta key and always writes an InsertedTranscript.
const transcriptMeta = (transaction: Transaction) =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the meta is read back as the type it was written with
  transaction.getMeta(transcriptKey) as InsertedTranscript | undefined;

const placeholderPlugin = () =>
  new Plugin<string>({
    key: placeholderKey,
    props: {
      decorations: (state) => {
        const text = placeholderKey.getState(state) ?? "";
        const [first] = state.doc.children;

        if (
          text === "" ||
          state.doc.childCount !== 1 ||
          !first.isTextblock ||
          first.content.size !== 0
        ) {
          return null;
        }

        return DecorationSet.create(state.doc, [
          Decoration.node(0, first.nodeSize, {
            class: "prosemirror-placeholder",
            "data-placeholder": text,
          }),
        ]);
      },
    },
    state: {
      apply: (transaction, value) => placeholderMeta(transaction) ?? value,
      init: () => "",
    },
  });

const transcriptPlugin = () =>
  new Plugin<InsertedTranscript | null>({
    key: transcriptKey,
    state: {
      apply: (transaction, value) => {
        const next = transcriptMeta(transaction);

        if (next !== undefined) {
          return next;
        }

        return transaction.docChanged ? null : value;
      },
      init: () => null,
    },
  });

interface ComposerEditorOptions {
  /** SetSelectionAtStart: where the caret goes for a restored draft. */
  doc?: ProseMirrorNode;
  /** The element the editor mounts into. */
  element: HTMLElement;
  /** A class for the editor element. */
  className?: string;
  editable?: boolean;
  keyContext?: Partial<ComposerEditorKeyContext>;
  nodeViews?: Record<string, NodeViewConstructor>;
  onChange?: (doc: ProseMirrorNode) => void;
  placeholder?: string;
}

/** The controller API the component gives the tip and dictation code. */
class ComposerEditorController {
  readonly view: EditorView;
  private keyContext: ComposerEditorKeyContext;

  constructor(options: ComposerEditorOptions) {
    this.keyContext = { ...defaultKeyContext, ...options.keyContext };

    const state = EditorState.create({
      doc: options.doc,
      plugins: [
        inputRules({
          rules: [...formattingRules, emDash, ellipsis, ...smartQuotes],
        }),
        history({ newGroupDelay: HISTORY_GROUP_DELAY_MS }),
        keymap({
          "Mod-Shift-z": redo,
          "Mod-b": toggleMark(composerSchema.marks.strong),
          "Mod-i": toggleMark(composerSchema.marks.em),
          "Mod-y": redo,
          "Mod-z": undo,
        }),
        new Plugin({
          props: {
            handleKeyDown: (view, event) =>
              routeKey(view, event, this.keyContext),
          },
        }),
        keymap({ "Shift-Enter": insertHardBreak }),
        keymap(baseKeymap),
        placeholderPlugin(),
        transcriptPlugin(),
      ],
      schema: composerSchema,
    });

    this.view = new EditorView(options.element, {
      attributes: {
        "aria-multiline": "true",
        class: options.className ?? "",
        role: "textbox",
      },
      dispatchTransaction: (transaction) => {
        const next = this.view.state.apply(transaction);
        this.view.updateState(next);

        if (transaction.docChanged) {
          options.onChange?.(next.doc);
        }
      },
      editable: () => options.editable ?? true,
      nodeViews: options.nodeViews,
      state,
    });

    this.setPlaceholder(options.placeholder ?? "");
  }

  setKeyContext(context: Partial<ComposerEditorKeyContext>) {
    this.keyContext = { ...this.keyContext, ...context };
  }

  setPlaceholder(text: string) {
    this.view.dispatch(this.view.state.tr.setMeta(placeholderKey, text));
  }

  /** The prompt text, including the path of each mention. */
  getText() {
    return this.view.state.doc.textBetween(
      0,
      this.view.state.doc.content.size,
      "\n",
      (node) => {
        if (isMentionNode(node)) {
          const name = String(node.attrs.name);
          const path = String(node.attrs.path);
          const label = `$${name}`;

          return path === "" ? label : `[${label}](${path})`;
        }

        return node.type.name === "hardBreak" ? "\n" : "";
      }
    );
  }

  hasText() {
    return this.getText().trim().length > 0;
  }

  serializeDocument() {
    return JSON.stringify(this.view.state.doc.toJSON());
  }

  restoreDocument(serialized: string) {
    const doc = composerSchema.nodeFromJSON(JSON.parse(serialized));
    this.view.dispatch(
      this.view.state.tr.replaceWith(
        0,
        this.view.state.doc.content.size,
        doc.content
      )
    );
  }

  get lastInsertedTranscript() {
    return transcriptKey.getState(this.view.state) ?? null;
  }

  focus() {
    this.view.focus();
  }

  destroy() {
    this.view.destroy();
  }

  clear() {
    const { state } = this.view;

    this.view.dispatch(
      state.tr.replaceWith(0, state.doc.content.size, [
        composerSchema.nodes.paragraph.create(),
      ])
    );
  }

  /**
   * AppendText: trims the text, adds a space when the draft does not end
   * in whitespace or a mention, then inserts it at the end of the draft.
   */
  appendText(raw: string) {
    const text = raw.trim();

    if (text.length === 0) {
      return;
    }

    const current = this.getText();
    const { lastChild } = this.view.state.doc;

    const spaced =
      lastChild?.isAtom !== true && current.length > 0 && !/\s$/u.test(current)
        ? ` ${text}`
        : text;

    this.appendRaw(spaced);
    this.view.focus();
  }

  private appendRaw(text: string) {
    const { state } = this.view;
    const transaction = state.tr;
    transaction.setSelection(Selection.atEnd(transaction.doc));

    const position =
      transaction.doc.lastChild?.isAtom === true
        ? transaction.doc.content.size
        : transaction.selection.to;

    transaction.insertText(text, position, position);
    transaction.setSelection(Selection.atEnd(transaction.doc));
    this.view.dispatch(transaction);
  }

  /** InsertTextAtSelection: replaces the selection and puts the caret after the text. */
  insertTextAtSelection(text: string) {
    if (text.length === 0) {
      return;
    }

    const { state } = this.view;
    const { from, to } = state.selection;
    const lines = text.split("\n");
    const transaction = state.tr;

    if (lines.length === 1) {
      transaction.insertText(text, from, to);
      transaction.setSelection(
        Selection.near(transaction.doc.resolve(from + text.length))
      );
    } else {
      transaction.replaceWith(
        from,
        to,
        lines.flatMap((line, index) => {
          const parts =
            index === 0 ? [] : [composerSchema.nodes.hardBreak.create()];

          return line.length > 0
            ? [...parts, composerSchema.text(line)]
            : parts;
        })
      );
    }

    this.view.dispatch(transaction);
    this.view.focus();
  }

  /**
   * InsertDictationText: trims the transcript, appends it when the
   * editor holds no DOM selection, and otherwise pads it with a space on a
   * side that touches a non-space, then records the inserted range.
   */
  insertDictationText(raw: string) {
    const text = raw.trim();

    if (text.length === 0) {
      return;
    }

    const selection = this.view.dom.ownerDocument.getSelection();

    const insideEditor =
      selection !== null &&
      selection.rangeCount > 0 &&
      selection.anchorNode !== null &&
      selection.focusNode !== null &&
      this.view.dom.contains(selection.anchorNode) &&
      this.view.dom.contains(selection.focusNode);

    if (!insideEditor) {
      this.appendText(text);
      const end = this.view.state.selection.to;
      this.view.dispatch(
        this.view.state.tr.setMeta(transcriptKey, {
          from: end - text.length,
          to: end,
        })
      );

      return;
    }

    const { doc, selection: current } = this.view.state;
    const { from, to } = current;
    const before = doc.textBetween(Math.max(0, from - 1), from, "\n");
    const after = doc.textBetween(to, Math.min(doc.content.size, to + 1), "\n");
    const padStart = before.length > 0 && !/\s$/u.test(before);
    const padEnd = after.length > 0 && !/^\s/u.test(after);
    const padded = `${padStart ? " " : ""}${text}${padEnd ? " " : ""}`;
    const transaction = this.view.state.tr.insertText(padded, from, to);

    transaction.setSelection(
      Selection.near(transaction.doc.resolve(from + padded.length))
    );

    const start = from + (padStart ? 1 : 0);
    transaction.setMeta(transcriptKey, {
      from: start,
      to: start + text.length,
    });
    this.view.dispatch(transaction);
    this.view.focus();
  }

  /** InsertMentionAtSelection and insertSkillMentionAtSelection. */
  insertMentionAtSelection(
    mention: ComposerMentionAttributes,
    kind: "mention" | "skillMention" = "mention"
  ) {
    const { from, to } = this.view.state.selection;
    const node = composerSchema.nodes[kind].create(mention);
    const transaction = this.view.state.tr.replaceWith(from, to, node);

    transaction.setSelection(
      Selection.near(transaction.doc.resolve(from + node.nodeSize))
    );
    this.view.dispatch(transaction);
    this.view.focus();
  }

  insertSkillMentionAtSelection(mention: ComposerMentionAttributes) {
    this.insertMentionAtSelection(mention, "skillMention");
  }

  /** PrependAppMentions: mentions followed by a space, ahead of the first line. */
  prependMentions(mentions: readonly ComposerMentionAttributes[]) {
    const { state } = this.view;
    const { mention, paragraph } = composerSchema.nodes;

    const content = mentions.flatMap((attributes) => [
      mention.create(attributes),
      composerSchema.text(" "),
    ]);

    const [first] = state.doc.children;
    const transaction: Transaction = state.tr;

    if (first.isTextblock) {
      transaction.insert(1, content);
    } else {
      transaction.insert(0, paragraph.create(null, content));
    }

    this.view.dispatch(transaction.setMeta("addToHistory", false));
  }
}

export {
  ComposerEditorController,
  defaultKeyContext,
  isMultilineDocument,
  transcriptKey,
};

export type {
  ComposerEditorKeyContext,
  ComposerEditorOptions,
  InsertedTranscript,
};
