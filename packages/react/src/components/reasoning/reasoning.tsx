import type { ReasoningPartState } from "@workspace/react/lib/chat-part-state";
import {
  chatPartStatusClassNames,
  chatPartStatusLabels,
} from "@workspace/react/lib/chat-part-state";
import { cn } from "@workspace/react/lib/utils";

interface ReasoningPartProps {
  className?: string;
  state: ReasoningPartState;
}

const ReasoningPart = ({ className, state }: ReasoningPartProps) => {
  const busy = state.status === "pending" || state.status === "streaming";

  return (
    <section
      aria-busy={busy}
      aria-label="Reasoning summary"
      aria-live="polite"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-panel p-4 text-text",
        className
      )}
      data-chat-part="reasoning"
      data-state={state.status}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Reasoning summary</h3>
        <span
          className={cn(
            "shrink-0 text-xs font-medium whitespace-nowrap",
            chatPartStatusClassNames[state.status]
          )}
        >
          {chatPartStatusLabels[state.status]}
        </span>
      </header>
      <p
        className="min-w-0 text-sm leading-6 wrap-anywhere whitespace-pre-wrap"
        dir="auto"
      >
        {state.text || "Waiting for the reasoning summary."}
      </p>
      {state.status === "error" && (
        <p className="text-sm wrap-anywhere text-text-error">{state.error}</p>
      )}
    </section>
  );
};

export { ReasoningPart };

export type { ReasoningPartProps };
