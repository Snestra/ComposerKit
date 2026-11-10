"use client";

/* oxlint-disable eslint/no-negated-condition -- Link branches precede their button or static counterparts. */

import { AppLink } from "composerkit/components/list/app-link";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import type { ReactNode } from "react";

interface CitationSource {
  sourceKey: string;
  number: number;
  displayLabel: string;
  title: ReactNode;
  sourceName?: string;
  dateDisplay?: string;
  authors?: string;
  url?: string;
  icon?: ReactNode;
}

const SourceRow = ({
  source,
  bibliography = false,
}: {
  source: CitationSource;
  bibliography?: boolean;
}) => {
  const metadata = [
    source.sourceName,
    source.dateDisplay,
    source.authors,
  ].filter((value) => value !== undefined);

  const content = (
    <>
      <span
        className={cn(
          "shrink-0 text-text-muted tabular-nums",
          bibliography ? "flex h-5 w-6 items-center justify-center" : "w-5"
        )}
      >
        {source.number}.
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          bibliography ? "gap-1" : "gap-2"
        )}
      >
        <span
          className={cn(
            "break-words underline decoration-dotted underline-offset-3",
            bibliography
              ? "line-clamp-2 font-semibold"
              : "line-clamp-3 font-medium"
          )}
        >
          {source.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-text-muted">
          {source.icon}
          {metadata.map((value, index) => (
            <span
              key={`${index}-${value}`}
              className={cn("contents", value === source.authors && "italic")}
            >
              {index > 0 && <span aria-hidden>·</span>}
              {value}
            </span>
          ))}
        </span>
      </span>
    </>
  );

  return source.url === undefined ? (
    <div className="flex min-w-0 gap-1.5 text-sm leading-5 text-text">
      {content}
    </div>
  ) : (
    <AppLink
      className="flex min-w-0 gap-1.5 text-sm leading-5 text-text no-underline"
      href={source.url}
    >
      {content}
    </AppLink>
  );
};

const ClinicalCitation = ({
  sources,
}: {
  sources: readonly CitationSource[];
}) => {
  if (sources.length === 0) {
    return null;
  }

  const [first] = sources;

  const content = (
    <>
      {first.icon ?? (
        <span
          aria-hidden
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-panel-secondary"
        >
          {first.displayLabel.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="max-w-[18ch] min-w-0 flex-auto truncate">
        {first.displayLabel}
      </span>
      {sources.length > 1 && (
        <span aria-hidden className="shrink-0 text-text-muted">
          +{sources.length - 1}
        </span>
      )}
    </>
  );

  const label = `Citation: ${first.displayLabel}, ${sources.length} ${sources.length === 1 ? "source" : "sources"}`;

  const classes =
    "group inline-flex h-6 max-w-[28ch] items-center justify-center gap-1.5 rounded-full border border-border bg-panel ps-1 pe-2 text-xs leading-5 font-normal text-text no-underline select-none hover:bg-panel-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <TooltipHint
      align="start"
      content={
        <ol className="flex max-h-105 w-120 max-w-full flex-col gap-3 overflow-y-auto p-3 text-start text-sm font-normal">
          {sources
            .toSorted((a, b) => a.number - b.number)
            .map((source) => (
              <li key={source.sourceKey}>
                <SourceRow source={source} />
              </li>
            ))}
        </ol>
      }
      delayDuration={150}
      interactive
      openOnFocusWithin
      maxWidth="min(30rem, var(--radix-tooltip-content-available-width), calc(100vw - 16px))"
      side="bottom"
      variant="rich"
    >
      <span className="ms-1 inline-flex max-w-full items-center align-middle font-sans select-none">
        {first.url === undefined ? (
          <button
            aria-label={label}
            className={classes}
            data-testid="clinical-citation"
            type="button"
          >
            {content}
          </button>
        ) : (
          <AppLink
            aria-label={label}
            className={classes}
            data-testid="clinical-citation"
            href={first.url}
          >
            {content}
          </AppLink>
        )}
      </span>
    </TooltipHint>
  );
};

const CitationBibliography = ({
  sources,
  isStreaming = false,
}: {
  sources: readonly CitationSource[];
  isStreaming?: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);
  const id = useId();

  if (sources.length === 0) {
    return null;
  }

  const label = `${expanded ? "Collapse" : "Expand"} ${sources.length} ${sources.length === 1 ? "citation" : "citations"}`;

  return (
    <section
      className="mt-6 flex w-full min-w-0 flex-col"
      data-ck-keep-turn-view={isStreaming ? "" : undefined}
    >
      <button
        aria-controls={id}
        aria-expanded={expanded}
        aria-label={label}
        className="flex w-full items-center gap-1.5 rounded-lg py-1.5 text-start text-base leading-6 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => {
          setExpanded((value) => !value);
        }}
        type="button"
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          {expanded ? <ChevronDown /> : <ChevronRight />}
        </span>
        <span className="font-semibold">Citations</span>
        <span aria-hidden className="text-text-muted">
          ·
        </span>
        <span className="text-text-muted">{sources.length}</span>
      </button>
      {expanded && (
        <ol className="flex flex-col py-1" id={id}>
          {sources.map((source) => (
            <li
              className="rounded-lg py-2 hover:bg-panel-secondary"
              key={source.sourceKey}
            >
              <SourceRow bibliography source={source} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

interface CitationPillProps {
  label: string;
  ariaLabel?: string;
  icon?: ReactNode;
  supportingCountLabel?: string;
  variant?: "default" | "file";
  isActive?: boolean;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
  showHoverActions?: boolean;
  tooltipContent?: ReactNode;
}

const CitationPill = ({
  label,
  ariaLabel,
  icon,
  supportingCountLabel,
  variant = "default",
  isActive = false,
  href,
  disabled = false,
  onClick,
  showHoverActions,
  tooltipContent,
}: CitationPillProps) => {
  const file = variant === "file";

  const classes = cn(
    "group no-underline",
    disabled ? "cursor-default" : "cursor-pointer",
    file
      ? "relative flex h-[25px] items-center justify-center gap-1 rounded-xl bg-[var(--color-fill-primary-soft)] px-2 text-[10px] leading-[13px] font-normal text-[light-dark(var(--color-light-app-text-foreground-secondary),var(--color-dark-app-text-foreground-secondary))] select-none"
      : "flex h-4.5 max-w-[15rem] overflow-hidden rounded-xl ps-1 pe-2 text-[9px] leading-none font-medium select-none",
    !file &&
      (isActive
        ? "bg-(--ck-palette-surface-button-secondary-hover) text-text"
        : "bg-fill-secondary-soft text-text-muted"),
    !disabled &&
      (file
        ? "hover:bg-[color-mix(in_oklab,var(--ck-palette-ink)_12%,transparent)] hover:text-[light-dark(var(--color-light-ink),var(--color-dark-ink))]"
        : "hover:bg-(--ck-palette-surface-button-secondary-hover) hover:text-text")
  );

  const content = (
    <>
      {icon}
      <span
        className={cn(
          "min-w-0 flex-auto truncate",
          !file && "max-w-[15ch] text-center"
        )}
      >
        {label}
      </span>
      {supportingCountLabel !== undefined && (
        <span
          aria-hidden
          className={cn(
            file
              ? "ms-0.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-text-subtle/15 px-1 text-[8px] font-semibold"
              : "-me-1 flex h-full shrink-0 items-center px-1"
          )}
        >
          {supportingCountLabel}
        </span>
      )}
    </>
  );

  return (
    <span className="relative ms-1 inline-flex max-w-full items-center font-sans select-none">
      {href === undefined ? (
        <button
          aria-label={ariaLabel}
          className={classes}
          disabled={disabled}
          onClick={onClick}
          type="button"
        >
          {content}
        </button>
      ) : (
        <AppLink
          aria-label={ariaLabel}
          className={classes}
          href={href}
          onClick={onClick}
          showHoverActions={showHoverActions}
          tooltipContent={tooltipContent}
        >
          {content}
        </AppLink>
      )}
    </span>
  );
};

export { CitationBibliography, CitationPill, ClinicalCitation };

export type { CitationPillProps, CitationSource };
