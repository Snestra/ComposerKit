"use client";

import { CopyActionButton } from "composerkit/components/markdown/copy-action-button";
/* oxlint-disable shadcn/no-arbitrary-values -- The component sizes the block text with the chat font size (--ui-message-text-size); no theme token matches it. */
import { Button } from "composerkit/components/ui/button";
import { WritingBlockSurface } from "composerkit/components/ui/card";
import { copyMarkdownText } from "composerkit/components/ui/markdown";
import { MessageCirclePlus as LucideMessageCirclePlus } from "lucide-react";
import { useRef } from "react";
import type { ComponentProps } from "react";

/** (16px chat bubble), the glyph of the add to chat button. */
const AddToChatIcon = (props: ComponentProps<"svg">) => (
  <LucideMessageCirclePlus
    aria-hidden="true"
    height={16}
    width={16}
    {...props}
    strokeWidth={1.5}
  />
);

export interface MarkdownWritingBlockProps {
  className?: string;
  /** The block text, shown as written. */
  content: string;
  /** Gets the trimmed text and a range over the block. Without it the button is not shown. */
  onAddSelectedTextToChat?: (text: string, range: Range) => void;
  /** The copy button. Default `true`. */
  showCopyButton?: boolean;
}

/**
 * The
 * block text on the writing block surface, under a bar with the add to chat
 * button on the left and the copy button on the right.
 */
export const MarkdownWritingBlock = ({
  className,
  content,
  onAddSelectedTextToChat,
  showCopyButton = true,
}: MarkdownWritingBlockProps) => {
  const textRef = useRef<HTMLDivElement>(null);

  const addToChat = () => {
    const text = content.trim();
    const element = textRef.current;

    if (text.length === 0 || element === null) {
      return;
    }

    const range = element.ownerDocument.createRange();

    range.selectNodeContents(element);
    onAddSelectedTextToChat?.(text, range);
  };

  return (
    <WritingBlockSurface
      className={className}
      data-ck-markdown-copy="code-block"
    >
      <div
        className="flex items-center px-2 pt-2 pb-2 font-sans text-sm text-(color:--ck-palette-ink-tertiary) select-none"
        data-ck-markdown-copy="exclude"
      >
        {onAddSelectedTextToChat ? (
          <Button
            color="outline"
            onClick={addToChat}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            size="composer"
          >
            <AddToChatIcon aria-hidden="true" className="size-3.5" />
            Add to chat
          </Button>
        ) : null}
        {showCopyButton ? (
          <span className="ms-auto">
            <CopyActionButton
              label="Copy"
              onCopy={async () => await copyMarkdownText(content)}
              variant="toolbar"
            />
          </span>
        ) : null}
      </div>
      <div
        className="overflow-auto px-4 pt-2 pb-4 text-[length:var(--ui-message-text-size,13px)] whitespace-pre-wrap [unicode-bidi:plaintext]"
        data-ck-horizontal-scroll
        dir="auto"
        ref={textRef}
      >
        {content}
      </div>
    </WritingBlockSurface>
  );
};
