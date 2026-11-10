import { MessageBubble } from "@workspace/react/components/ui/message-bubble";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: ReactNode;
}

type ChatThreadProps = ComponentProps<"div"> & {
  messages: readonly ChatMessage[];
  emptyContent?: ReactNode;
};

const ChatThread = ({
  messages,
  emptyContent,
  className,
  ...props
}: ChatThreadProps) => (
  <div
    className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto p-4", className)}
    {...props}
  >
    {messages.length === 0 ? (
      emptyContent
    ) : (
      <ol className="chat-content flex min-w-0 flex-col gap-6">
        {messages.map((message) => (
          <li
            key={message.id}
            className={cn(
              "min-w-0 break-words",
              message.role === "user" && "flex justify-end"
            )}
          >
            {message.role === "user" ? (
              <MessageBubble>{message.content}</MessageBubble>
            ) : (
              message.content
            )}
          </li>
        ))}
      </ol>
    )}
  </div>
);

export { ChatThread };

export type { ChatMessage };
