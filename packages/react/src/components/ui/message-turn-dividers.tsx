"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The separator contains the time element. */

import { SharedChevronRightIcon } from "@workspace/react/components/icon/glyphs";
import { Button } from "@workspace/react/components/ui/button";
import { LoadingResultsShimmer } from "@workspace/react/components/ui/skeleton";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

const MessageTurnGap = ({ grouped = false }: { grouped?: boolean }) => (
  <div
    aria-hidden
    className={cn(
      grouped
        ? "h-(--ck-conversation-grouped-item-gap,4px) shrink-0"
        : "h-(--ck-conversation-item-gap,16px)"
    )}
  />
);

const dateDaysBetween = (later: Date, earlier: Date) =>
  (Date.UTC(later.getFullYear(), later.getMonth(), later.getDate()) -
    Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())) /
  86_400_000;

const TimestampSeparator = ({
  sentAtMs,
  nowMs,
  compact = false,
  locale = "en",
}: {
  sentAtMs: number;
  nowMs?: number;
  compact?: boolean;
  locale?: string;
}) => {
  const [initialNow, setInitialNow] = useState(Date.now);
  void setInitialNow;

  if (!Number.isFinite(sentAtMs)) {
    return null;
  }

  const date = new Date(sentAtMs);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const days = Math.max(
    dateDaysBetween(new Date(nowMs ?? initialNow), date),
    0
  );

  let day: string;

  if (days <= 1) {
    day = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -days,
      "day"
    );

    if (locale.startsWith("en")) {
      day = day.charAt(0).toUpperCase() + day.slice(1);
    }
  } else {
    let options: Intl.DateTimeFormatOptions;

    if (days <= 7) {
      options = { weekday: "long" };
    } else if (days <= 365) {
      options = { weekday: "short", month: "short", day: "numeric" };
    } else {
      options = { month: "short", day: "numeric", year: "numeric" };
    }

    day = new Intl.DateTimeFormat(locale, options).format(date);
  }

  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  const connector = days > 7 ? " at " : " ";

  return (
    <div
      aria-label={`${day}${connector}${time}`}
      className={cn("flex justify-center", compact ? "py-2" : "py-4")}
      data-ck-markdown-copy="exclude"
      role="separator"
    >
      <time
        className={cn(
          "text-[light-dark(var(--color-light-app-text-foreground-tertiary),var(--color-dark-app-text-foreground-tertiary))] select-none",
          compact ? "text-xs" : "text-sm leading-5 font-normal"
        )}
        dateTime={date.toISOString()}
      >
        <span className="font-medium">{day}</span>
        {connector}
        {time}
      </time>
    </div>
  );
};

type WorkStatus =
  | "loading"
  | "unknown"
  | "paused"
  | "working"
  | "worked"
  | "stopped";

const formatDurationUnit = (
  value: number,
  unit: "day" | "hour" | "minute" | "second",
  locale: string
) => {
  const formatter = new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "narrow",
  });

  return locale.toLowerCase().split("-")[0] === "hu"
    ? formatter
        .formatToParts(value)
        .filter((part) => part.type !== "literal")
        .map((part) => part.value)
        .join("")
    : formatter.format(value);
};

const duration = (ms: number, locale: string) => {
  let seconds = Math.floor(Math.max(ms, 0) / 1000);

  const units = [
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ] as const;

  const parts: string[] = [];

  for (const [unit, size] of units) {
    const value = Math.floor(seconds / size);
    seconds %= size;

    if (value > 0) {
      parts.push(formatDurationUnit(value, unit, locale));
    }
  }

  return parts.length
    ? parts.join(" ")
    : formatDurationUnit(0, "second", locale);
};

const WorkedFor = ({
  status,
  startedAtMs,
  completedAtMs,
  locale = "en",
}: {
  status: WorkStatus;
  startedAtMs: number;
  completedAtMs?: number;
  locale?: string;
}) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval =
      status === "working" && completedAtMs === undefined
        ? window.setInterval(() => {
            setNow(Date.now());
          }, 1000)
        : undefined;

    return () => {
      window.clearInterval(interval);
    };
  }, [completedAtMs, status]);
  const elapsed = Math.max((completedAtMs ?? now) - startedAtMs, 0);
  const time = duration(elapsed, locale);

  const text: Record<WorkStatus, ReactNode> = {
    loading: (
      <span className="flex h-lh items-center">
        <LoadingResultsShimmer as="span" className="w-36" size="md" />
        <span className="sr-only">Loading activity status</span>
      </span>
    ),
    unknown: "Activity",
    paused: "Paused",
    working: elapsed >= 1000 ? `Working for ${time}` : "Working",
    worked: `Worked for ${time}`,
    stopped: `You stopped after ${time}`,
  };

  return <span className="text-text-subtle tabular-nums">{text[status]}</span>;
};

const WorkedForDivider = (props: ComponentProps<typeof WorkedFor>) => (
  <div className="flex min-h-0 flex-col items-start gap-2 text-[length:var(--ui-message-text-size,13px)] text-text-muted">
    <WorkedFor {...props} />
    <div className="w-full border-t border-border" />
  </div>
);

interface CollapsedTurnDisclosureProps extends Omit<
  ComponentProps<"button">,
  "children" | "color"
> {
  children?: ReactNode;
  expanded: boolean;
  deniedActionCount?: number;
  collapsedMessageCount?: number;
  workedDurationMs?: number;
  workedForItem?: ComponentProps<typeof WorkedFor>;
}

const DisclosureLabel = ({
  children,
  workedForItem,
  workedDurationMs,
  collapsedMessageCount,
}: Pick<
  CollapsedTurnDisclosureProps,
  "children" | "workedForItem" | "workedDurationMs" | "collapsedMessageCount"
>): ReactNode => {
  if (children !== undefined && children !== null) {
    return children;
  }

  if (workedForItem !== undefined) {
    return <WorkedFor {...workedForItem} />;
  }

  if (workedDurationMs !== undefined) {
    return `Worked for ${duration(workedDurationMs, "en")}`;
  }

  const count = collapsedMessageCount ?? 0;

  return `${count} ${count === 1 ? "previous message" : "previous messages"}`;
};

const CollapsedTurnDisclosure = ({
  children,
  className,
  deniedActionCount = 0,
  collapsedMessageCount = 0,
  workedDurationMs,
  workedForItem,
  expanded,
  ...props
}: CollapsedTurnDisclosureProps) => (
  <div className="text-text-muted">
    <Button
      {...props}
      aria-expanded={expanded}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center text-[length:var(--ui-message-text-size,13px)]",
        deniedActionCount > 0 && "w-full",
        className
      )}
      color="ghostTertiary"
      radius="small"
      size="inline"
      type="button"
    >
      <span>
        <DisclosureLabel
          collapsedMessageCount={collapsedMessageCount}
          workedDurationMs={workedDurationMs}
          workedForItem={workedForItem}
        >
          {children}
        </DisclosureLabel>
      </span>
      <SharedChevronRightIcon
        aria-hidden
        className={cn(
          "size-3 transition-transform duration-150",
          expanded && "rotate-90"
        )}
      />
      {deniedActionCount > 0 && (
        <TooltipHint
          content={
            deniedActionCount === 1
              ? "Auto-review denied 1 action. View the action and why it was denied."
              : `Auto-review denied ${deniedActionCount} actions. View the actions and why they were denied.`
          }
        >
          <span
            className="ms-auto inline-flex items-center gap-1 text-text-muted"
            data-ck-denied-action-count
          >
            <ShieldAlert aria-hidden className="size-3" />
            {deniedActionCount}{" "}
            {deniedActionCount === 1 ? "denied action" : "denied actions"}
          </span>
        </TooltipHint>
      )}
    </Button>
    <div className="pt-1">
      <div className="w-full border-t border-border" />
    </div>
  </div>
);

export {
  CollapsedTurnDisclosure,
  MessageTurnGap,
  TimestampSeparator,
  WorkedFor,
  WorkedForDivider,
};

export type { CollapsedTurnDisclosureProps, WorkStatus };
