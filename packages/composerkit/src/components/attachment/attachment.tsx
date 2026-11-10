import type { AttachmentPartState } from "composerkit/lib/chat-part-state";
import {
  chatPartStatusClassNames,
  chatPartStatusLabels,
} from "composerkit/lib/chat-part-state";
import { cn } from "composerkit/lib/utils";

interface AttachmentPartProps {
  className?: string;
  state: AttachmentPartState;
}

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const formatSize = (size: number | undefined): string | undefined => {
  if (size === undefined) {
    return undefined;
  }

  if (!Number.isFinite(size) || size < 0) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  let value = size;
  let unitIndex = 0;

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  return `${numberFormat.format(value)} ${units[unitIndex]}`;
};

const AttachmentPart = ({ className, state }: AttachmentPartProps) => {
  const name = state.name.trim() || "Unnamed attachment";
  const mediaType = state.mediaType.trim() || "Unknown media type";
  const size = formatSize(state.size);
  const busy = state.status === "pending" || state.status === "streaming";

  return (
    <section
      aria-busy={busy}
      aria-label={`Attachment ${name}`}
      aria-live="polite"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-panel p-4 text-text",
        className
      )}
      data-chat-part="attachment"
      data-state={state.status}
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h3
          className="min-w-0 flex-1 text-sm font-semibold wrap-anywhere"
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
      <p className="text-xs wrap-anywhere text-text-muted" dir="auto">
        {mediaType}
        {size === undefined ? "" : `, ${size}`}
      </p>
      {state.status === "done" && (
        <a
          className="w-fit max-w-full text-sm font-medium break-all text-text-notice underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={state.url}
        >
          Open attachment
          <span className="sr-only"> {name}</span>
        </a>
      )}
      {state.status === "error" && (
        <p className="text-sm wrap-anywhere text-text-error">{state.error}</p>
      )}
    </section>
  );
};

export { AttachmentPart };

export type { AttachmentPartProps };
