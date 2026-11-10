import { composerSchema } from "@workspace/react/components/composer/editor/schema";
import { dedupeFileAttachments } from "@workspace/react/components/composer/rules";
import type { FileAttachmentRef } from "@workspace/react/components/composer/rules";
import type { Node as ProseMirrorNode } from "prosemirror-model";

/*
 * The text and attachment drafts the editor keeps per conversation. A draft
 * is the document and the attachment list. A document node is immutable, so a
 * saved draft cannot change under the editor. Adding attachments drops the
 * ones the draft already holds.
 */

interface ComposerDraft<Attachment extends FileAttachmentRef> {
  attachments: readonly Attachment[];
  doc: ProseMirrorNode;
}

const emptyDocument = () =>
  composerSchema.node("doc", null, [composerSchema.node("paragraph")]);

const createDraft = <Attachment extends FileAttachmentRef>(
  doc: ProseMirrorNode = emptyDocument(),
  attachments: readonly Attachment[] = []
): ComposerDraft<Attachment> => ({ attachments, doc });

const addDraftAttachments = <Attachment extends FileAttachmentRef>(
  draft: ComposerDraft<Attachment>,
  incoming: readonly Attachment[]
): ComposerDraft<Attachment> => ({
  ...draft,
  attachments: [
    ...draft.attachments,
    ...dedupeFileAttachments(draft.attachments, incoming),
  ],
});

/** A draft store keyed by conversation; the library keeps it in memory. */
const createDraftStore = <Attachment extends FileAttachmentRef>() => {
  const drafts = new Map<string, ComposerDraft<Attachment>>();

  return {
    clear: (key: string) => drafts.delete(key),
    get: (key: string) => drafts.get(key),
    keys: () => [...drafts.keys()],
    set: (key: string, draft: ComposerDraft<Attachment>) => {
      drafts.set(key, draft);
    },
  };
};

export { addDraftAttachments, createDraft, createDraftStore, emptyDocument };

export type { ComposerDraft };
