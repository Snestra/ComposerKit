"use client";

import { Button } from "@workspace/react/components/ui/button";
import { InlineComposer } from "@workspace/react/components/ui/composer";
import { cn } from "cn";
import { useId } from "react";
import type { ComponentProps } from "react";

type PreviewState = "ready" | "working" | "error";

type ChatComposerProps = Omit<ComponentProps<"div">, "onSubmit"> & {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  state: PreviewState;
  onRetry?: () => void;
};

const noCancel = () => {
  /* the chat composer has no cancel action */
};

/**
 * The chat message composer of the preview: the inline composer
 * (multiline, auto-growing textarea, send button, working status) with the
 * preview's error line and retry button under it.
 */
const ChatComposer = ({
  value,
  onValueChange,
  onSubmit,
  state,
  onRetry,
  className,
  ...props
}: ChatComposerProps) => {
  const id = useId();

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2 p-4", className)}
      {...props}
    >
      <div className="chat-content">
        <InlineComposer
          canCancel={false}
          canSubmit={value.trim() !== ""}
          generating={state === "working"}
          label="Write a message"
          multiline
          status="Working…"
          submitLabel="Send"
          onCancel={noCancel}
          onSubmit={onSubmit}
        >
          <label htmlFor={id} className="sr-only">
            Write a message
          </label>
          <textarea
            id={id}
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value);
            }}
            placeholder="Write a message"
            rows={1}
            className="field-sizing-content max-h-48 min-h-6 w-full min-w-0 resize-none bg-transparent outline-none"
          />
        </InlineComposer>
      </div>
      <div aria-live="polite" className="chat-content text-muted-foreground">
        {state === "error" && (
          <div className="flex flex-wrap items-center gap-2">
            <span>Unable to complete this action.</span>
            {onRetry && (
              <Button
                type="button"
                color="outline"
                size="pageAction"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { ChatComposer };

export type { PreviewState };
