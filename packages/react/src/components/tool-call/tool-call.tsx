import type { ToolCallPartState } from "@workspace/react/lib/chat-part-state";
import {
  chatPartStatusClassNames,
  chatPartStatusLabels,
} from "@workspace/react/lib/chat-part-state";
import { cn } from "@workspace/react/lib/utils";

interface ToolCallPartProps {
  className?: string;
  state: ToolCallPartState;
}

const CodeBlock = ({ label, text }: { label: string; text: string }) => (
  <pre
    aria-label={label}
    className="min-w-0 rounded-lg bg-panel-secondary p-3 font-mono text-xs leading-5 wrap-anywhere whitespace-pre-wrap"
  >
    {text}
  </pre>
);

/**
 * One tool call. While the provider streams the arguments, the input shows the
 * partial JSON as it grows. The error state keeps the partial input and shows
 * the message.
 */
const ToolCallPart = ({ className, state }: ToolCallPartProps) => {
  const name = state.name.trim() || "Unnamed tool";
  const busy = state.status === "pending" || state.status === "streaming";

  return (
    <section
      aria-busy={busy}
      aria-label={`Tool call ${name}`}
      aria-live="polite"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-panel p-4 text-text",
        className
      )}
      data-chat-part="tool"
      data-state={state.status}
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h3
          className="min-w-0 flex-1 font-mono text-sm font-semibold wrap-anywhere"
          dir="auto"
        >
          {name}
        </h3>
        <span
          className={cn(
            "shrink-0 text-xs font-medium whitespace-nowrap",
            chatPartStatusClassNames[state.status]
          )}
        >
          {chatPartStatusLabels[state.status]}
        </span>
      </header>
      <div className="flex min-w-0 flex-col gap-1">
        <h4 className="text-xs font-medium text-text-muted">Input</h4>
        <CodeBlock
          label={`${name} input`}
          text={state.argumentsText || "Waiting for arguments."}
        />
      </div>
      {state.outputText !== "" && (
        <div className="flex min-w-0 flex-col gap-1">
          <h4 className="text-xs font-medium text-text-muted">Output</h4>
          <CodeBlock label={`${name} output`} text={state.outputText} />
        </div>
      )}
      {state.status === "error" && (
        <p className="text-sm wrap-anywhere text-text-error">{state.error}</p>
      )}
    </section>
  );
};

export { ToolCallPart };

export type { ToolCallPartProps };
