"use client";

import { ComposerEditorController } from "@workspace/react/components/composer/editor/controller";
import type { ComposerEditorKeyContext } from "@workspace/react/components/composer/editor/controller";
import { MENTION_ATTRIBUTE } from "@workspace/react/components/composer/editor/schema";
import { InlineMention } from "@workspace/react/components/ui/mention";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { NodeViewConstructor } from "prosemirror-view";
import { useEffect, useEffectEvent, useRef } from "react";
import type { RefObject } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import styles from "@workspace/react/components/composer/editor/editor.module.css";

/*
 * The editor view of the composer: a ProseMirror view mounted in a div, with
 * mention and skill mention node views drawn by the mention family's
 * InlineMention. The controller is handed to the caller through `controllerRef`
 * so a tip, a dictation source or a toolbar can drive it.
 */

const mentionNodeView =
  (kind: "mention" | "skillMention"): NodeViewConstructor =>
  (node) => {
    const dom = document.createElement("span");
    dom.className = styles.Mention;
    dom.contentEditable = "false";
    dom.setAttribute(MENTION_ATTRIBUTE, kind);
    let root: Root | undefined = createRoot(dom);

    const render = (current: ProseMirrorNode) => {
      root?.render(
        <InlineMention>{String(current.attrs.displayName)}</InlineMention>
      );
    };

    render(node);

    return {
      destroy: () => {
        const pending = root;
        root = undefined;
        queueMicrotask(() => pending?.unmount());
      },
      dom,
      ignoreMutation: () => true,
      update: (next) => {
        if (next.type !== node.type) {
          return false;
        }

        render(next);

        return true;
      },
    };
  };

const nodeViews = {
  mention: mentionNodeView("mention"),
  skillMention: mentionNodeView("skillMention"),
};

interface ComposerEditorProps {
  "aria-label"?: string;
  className?: string;
  controllerRef?: RefObject<ComposerEditorController | null>;
  doc?: ProseMirrorNode;
  editable?: boolean;
  keyContext?: Partial<ComposerEditorKeyContext>;
  onChange?: (doc: ProseMirrorNode) => void;
  placeholder?: string;
}

const releaseNothing = () => {
  /* there was no element to mount into, so there is nothing to release */
};

const ComposerEditor = ({
  "aria-label": ariaLabel,
  className,
  controllerRef,
  doc,
  editable = true,
  keyContext,
  onChange,
  placeholder,
}: ComposerEditorProps) => {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ComposerEditorController | null>(null);
  const initialKeyContext = useEffectEvent(() => keyContext);
  const initialPlaceholder = useEffectEvent(() => placeholder);

  const reportChange = useEffectEvent((next: ProseMirrorNode) => {
    onChange?.(next);
  });

  useEffect(() => {
    const element = host.current;

    if (element === null) {
      return releaseNothing;
    }

    const created = new ComposerEditorController({
      className:
        className === undefined || className === ""
          ? styles.Editor
          : `${styles.Editor} ${className}`,
      doc,
      editable,
      element,
      keyContext: initialKeyContext(),
      nodeViews,
      onChange: reportChange,
      placeholder: initialPlaceholder(),
    });

    if (ariaLabel !== undefined && ariaLabel !== "") {
      created.view.dom.setAttribute("aria-label", ariaLabel);
    }

    controller.current = created;

    if (controllerRef) {
      controllerRef.current = created;
    }

    return () => {
      if (controllerRef) {
        controllerRef.current = null;
      }

      controller.current = null;
      created.destroy();
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the view is created once per mount; later key context and placeholder changes flow through the effects below
  }, [ariaLabel, className, controllerRef, doc, editable]);

  useEffect(() => {
    if (keyContext) {
      controller.current?.setKeyContext(keyContext);
    }
  }, [keyContext]);

  useEffect(() => {
    controller.current?.setPlaceholder(placeholder ?? "");
  }, [placeholder]);

  return <div ref={host} />;
};

export { ComposerEditor };

export type { ComposerEditorProps };
