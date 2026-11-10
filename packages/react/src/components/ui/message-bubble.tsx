import { cn } from "@workspace/react/lib/utils";
import type { ComponentProps, CSSProperties } from "react";

type MessageBubbleProps = ComponentProps<"div"> & {
  accentColor?: string;
  alignment?: "start" | "end";
  hasPrompt?: boolean;
  isAeonFormatted?: boolean;
  isFromOtherUser?: boolean;
  isTemporaryChat?: boolean;
};

const MessageBubble = ({
  accentColor,
  alignment = "end",
  children,
  className,
  hasPrompt = true,
  isAeonFormatted = false,
  isFromOtherUser = false,
  isTemporaryChat = false,
  style,
  ...props
}: MessageBubbleProps) => {
  const bubbleStyle: CSSProperties & {
    "--ck-sender-accent-color"?: string;
  } = {
    ...style,
    "--ck-sender-accent-color": accentColor,
  };

  return (
    <div
      {...props}
      className={cn(
        "relative max-w-(--ck-sender-width) min-w-0 overflow-hidden rounded-2xl bg-(--bubble-background) px-(--ck-chat-content-margin) text-start break-words text-(--bubble-foreground) [--bubble-background:color-mix(in_oklab,var(--bubble-foreground)_5%,transparent)] [--bubble-foreground:light-dark(var(--color-light-ink),var(--color-dark-ink))] [--ck-chat-content-margin:calc(var(--spacing)*4)] [--ck-sender-width:70%] [--radius-2xl:calc(var(--spacing)*5.5)] [&_.contain-inline-size]:[contain:initial]",
        alignment === "start" && "[--ck-sender-width:100%]",
        isAeonFormatted
          ? "w-fit py-2 [--bubble-background:var(--ck-compact-message-bubble-background,var(--color-fill-user-message-compact,light-dark(#f3f3f3,#414141)))] [--bubble-foreground:var(--ck-compact-message-bubble-foreground,light-dark(var(--color-light-ink),var(--color-dark-ink)))] [--ck-chat-content-margin:calc(var(--spacing)*3)] [--ck-sender-width:min(456px,100%)] [--radius-2xl:calc(var(--spacing)*4)] [corner-shape:superellipse(1)]! [&_[data-ck-markdown-text-tone=user-message]]:tracking-[-.01em] [&_[data-ck-markdown-text-tone=user-message]]:[--ck-prose-line-height:calc(var(--ck-prose-font-size)+4px)]"
          : "py-2.5",
        isFromOtherUser &&
          "[--bubble-background:color-mix(in_oklab,var(--bubble-foreground)_10%,transparent)] [--bubble-foreground:light-dark(var(--color-light-ink),var(--color-dark-ink))]",
        accentColor !== undefined &&
          "[--bubble-background:color-mix(in_srgb,var(--ck-sender-accent-color)_10%,transparent)] [--bubble-foreground:light-dark(var(--color-light-ink),var(--color-dark-ink))]",
        isTemporaryChat &&
          "[border-radius:var(--radius-2xl)] [corner-shape:round]!",
        !hasPrompt && "leading-none",
        className
      )}
      data-ck-user-message-bubble
      style={bubbleStyle}
    >
      {isTemporaryChat && (
        <svg
          aria-hidden="true"
          className="[container-type:size] pointer-events-none absolute inset-0 h-full w-full [&_rect]:[rx:calc(min(var(--radius-2xl),50cqmin)-.5px)] [&_rect]:[ry:calc(min(var(--radius-2xl),50cqmin)-.5px)]"
          focusable="false"
        >
          <rect
            fill="none"
            height="calc(100% - 1px)"
            stroke="currentColor"
            strokeDasharray="8 8"
            strokeOpacity="0.4"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            width="calc(100% - 1px)"
            x="0.5"
            y="0.5"
          />
        </svg>
      )}
      {children}
    </div>
  );
};

export { MessageBubble };

export type { MessageBubbleProps };
