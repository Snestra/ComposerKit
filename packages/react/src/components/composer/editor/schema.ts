import { Schema } from "prosemirror-model";
import type { DOMOutputSpec, Node as ProseMirrorNode } from "prosemirror-model";

/*
 * The document schema of the composer editor. The component builds it from
 * extensions:
 * a doc of paragraphs, text, line breaks and inline mention atoms. Mentions
 * and skill mentions are separate node types so a draft can tell them apart
 * (the controller's insertMentionAtSelection and insertSkillMentionAtSelection).
 */

type ComposerMentionKind = "mention" | "skillMention";

interface ComposerMentionAttributes {
  description: string | null;
  displayName: string;
  name: string;
  path: string;
}

const MENTION_ATTRIBUTE = "data-composer-mention";

const mentionSpec = (kind: ComposerMentionKind) => ({
  atom: true,
  attrs: {
    description: { default: null },
    displayName: { default: "" },
    name: { default: "" },
    path: { default: "" },
  },
  group: "inline",
  inline: true,
  parseDOM: [
    {
      getAttrs: (dom: HTMLElement) => ({
        description: dom.dataset.description ?? null,
        displayName: dom.dataset.displayName ?? "",
        name: dom.dataset.name ?? "",
        path: dom.dataset.path ?? "",
      }),
      tag: `span[${MENTION_ATTRIBUTE}="${kind}"]`,
    },
  ],
  selectable: true,
  toDOM: (node: ProseMirrorNode): DOMOutputSpec => [
    "span",
    {
      [MENTION_ATTRIBUTE]: kind,
      "data-description":
        node.attrs.description === null
          ? undefined
          : String(node.attrs.description),
      "data-display-name": String(node.attrs.displayName),
      "data-name": String(node.attrs.name),
      "data-path": String(node.attrs.path),
    },
    String(node.attrs.displayName),
  ],
});

const composerSchema = new Schema({
  marks: {
    code: {
      code: true,
      excludes: "_",
      parseDOM: [{ tag: "code" }],
      toDOM: (): DOMOutputSpec => ["code", 0],
    },
    em: {
      parseDOM: [{ tag: "em" }, { tag: "i" }],
      toDOM: (): DOMOutputSpec => ["em", 0],
    },
    strike: {
      parseDOM: [{ tag: "s" }, { tag: "del" }],
      toDOM: (): DOMOutputSpec => ["s", 0],
    },
    strong: {
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
      toDOM: (): DOMOutputSpec => ["strong", 0],
    },
  },
  nodes: {
    doc: { content: "block+" },
    hardBreak: {
      group: "inline",
      inline: true,
      parseDOM: [{ tag: "br" }],
      selectable: false,
      toDOM: (): DOMOutputSpec => ["br"],
    },
    mention: mentionSpec("mention"),
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ preserveWhitespace: "full", tag: "p" }],
      toDOM: (): DOMOutputSpec => ["p", 0],
    },
    skillMention: mentionSpec("skillMention"),
    text: { group: "inline" },
  },
});

const isMentionNode = (node: ProseMirrorNode) =>
  node.type.name === "mention" || node.type.name === "skillMention";

export { composerSchema, isMentionNode, MENTION_ATTRIBUTE };

export type { ComposerMentionAttributes, ComposerMentionKind };
