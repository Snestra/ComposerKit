"use client";

import { parseFrontMatter } from "composerkit/components/markdown/front-matter";
/* oxlint-disable shadcn/no-restyle -- The component gives these elements their own treatment (the metadata disclosure is a plain button; prose links take the tone color). */
import type {
  FrontMatterEntry,
  FrontMatterValue,
} from "composerkit/components/markdown/front-matter";
import { MarkdownProse } from "composerkit/components/markdown/prose";
import type { MarkdownProseProps } from "composerkit/components/markdown/prose";
import { Button } from "composerkit/components/ui/button";
import { cn } from "composerkit/lib/utils";
import { ChevronDown as LucideChevronDown } from "lucide-react";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";

/** Entries beyond this many hide behind "Show more". */
export const METADATA_COLLAPSED_ENTRIES = 8;

/** An empty string value is shown as two quotes. */
const EMPTY_VALUE = '""';

const Chevron = ({ className }: { className?: string }) => (
  <LucideChevronDown
    aria-hidden="true"
    className={className}
    height={21}
    width={20}
    strokeWidth={1.5}
  />
);

/** Array values render as chips, other values as monospace text. */
export const MarkdownMetadataValue = ({
  value,
}: {
  value: FrontMatterValue;
}) => {
  if (Array.isArray(value)) {
    return (
      <span className="flex min-w-0 flex-wrap gap-1">
        {value.map((item, index) => (
          <span
            className="max-w-full rounded-sm bg-text/10 px-1.5 py-0.5 font-mono break-words"
            // oxlint-disable-next-line react/no-array-index-key -- values may repeat.
            key={`${item}-${index}`}
          >
            {item.length === 0 ? EMPTY_VALUE : item}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="font-mono break-words">
      {value.length === 0 ? EMPTY_VALUE : value}
    </span>
  );
};

/** The key and value grid. */
export const MarkdownMetadataEntries = ({
  className,
  entries,
}: {
  className?: string;
  entries: readonly FrontMatterEntry[];
}) => (
  <dl
    className={cn(
      "grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5",
      className
    )}
  >
    {entries.map((entry, index) => (
      // oxlint-disable-next-line react/no-array-index-key -- keys may repeat in a document.
      <div className="contents" key={`${entry.key}-${index}`}>
        <dt className="truncate font-mono text-text-muted" title={entry.key}>
          {entry.key}
        </dt>
        <dd className="min-w-0 text-text">
          <MarkdownMetadataValue value={entry.value} />
        </dd>
      </div>
    ))}
  </dl>
);

export interface MarkdownMetadataProps {
  entries: readonly FrontMatterEntry[];
  /** Replaces the "Metadata" heading. */
  title?: ReactNode;
  /** Replaces the "Show less" label. */
  showLessLabel?: ReactNode;
  /** Replaces the "Show more" label. */
  showMoreLabel?: ReactNode;
}

/**
 * The metadata card above a markdown file's body. More than 8
 * entries show the first 8 with a disclosure button (`aria-expanded`, the
 * chevron turns 180 degrees).
 */
export const MarkdownMetadata = ({
  entries,
  showLessLabel = "Show less",
  showMoreLabel = "Show more",
  title = "Metadata",
}: MarkdownMetadataProps) => {
  const [expanded, setExpanded] = useState(false);
  const collapsible = entries.length > METADATA_COLLAPSED_ENTRIES;

  const visible =
    collapsible && !expanded
      ? entries.slice(0, METADATA_COLLAPSED_ENTRIES)
      : entries;

  return (
    <div className="mb-3 rounded-md border border-border/60 bg-text/5 px-3 py-2 text-xs">
      <div className="mb-2 font-medium text-text-muted">{title}</div>
      <MarkdownMetadataEntries entries={visible} />
      {collapsible ? (
        <Button
          aria-expanded={expanded}
          className="mt-1.5 inline-flex cursor-(--ck-action-cursor) items-center gap-1 text-text-muted hover:text-text"
          onClick={() => {
            setExpanded((current) => !current);
          }}
          unstyled
        >
          <span>{expanded ? showLessLabel : showMoreLabel}</span>
          <Chevron
            className={cn(
              "size-[14px] transition-transform",
              expanded ? "rotate-180" : "rotate-0"
            )}
          />
        </Button>
      ) : null}
    </div>
  );
};

export interface MarkdownSurfaceProps extends ComponentProps<"div"> {
  /** `subtle` is a text/5 tint, `normal` the surface color. Default `subtle`. */
  background?: "normal" | "subtle";
  /** Default `clip`. */
  overflow?: "auto" | "clip";
}

/** The rounded surface that holds a rendered markdown file. */
export const MarkdownSurface = ({
  background = "subtle",
  children,
  className,
  overflow = "clip",
  ...props
}: MarkdownSurfaceProps) => (
  <div
    className={cn(
      "relative rounded-lg",
      background === "normal" ? "bg-panel" : "bg-text/5",
      overflow === "auto" ? "overflow-auto" : "overflow-clip",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export interface MarkdownFilePreviewProps extends Omit<
  MarkdownProseProps,
  "children"
> {
  /** Reads a leading `---` front-matter block into the metadata card. */
  enableMetadataPreview?: boolean;
  /** The file's markdown. */
  markdown: string;
}

/**
 * A markdown file as the metadata card (when front matter was
 * found) above the prose, in a `px-4 py-3` area.
 */
export const MarkdownFilePreview = ({
  enableMetadataPreview = false,
  markdown,
  ...prose
}: MarkdownFilePreviewProps) => {
  const parsed = enableMetadataPreview ? parseFrontMatter(markdown) : null;
  const body = parsed?.body ?? markdown;

  return (
    <div className="px-4 py-3">
      {parsed !== null && parsed.entries.length > 0 ? (
        <MarkdownMetadata entries={parsed.entries} />
      ) : null}
      <MarkdownProse {...prose}>{body}</MarkdownProse>
    </div>
  );
};
