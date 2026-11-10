"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-arbitrary-values -- The component styles plain <button> elements itself; they are the library Button in `unstyled` mode and take the measured sizes, radii and token expressions through className, which no Button variant or theme token carries. */

import { Button } from "composerkit/components/ui/button";
import { cn } from "composerkit/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/*
 * Name and status row and the resource row with the resource card pieces it
 * uses.
 *
 * `text-description` is --ck-palette-ink-tertiary and
 * `text-size-chat` is --ui-message-text-size, which the root sets to
 * `var(--ui-message-text-size-override, var(--ck-interface-size, 13px))`.
 */

const CHAT_SIZE =
  "text-[length:var(--ui-message-text-size,var(--ck-interface-size,13px))]";

const CHAT_SIZE_SM =
  "text-[length:calc(var(--ui-message-text-size,var(--ck-interface-size,13px))-1px)]";

interface SubagentRowProps {
  /** The 24px avatar. It is hidden from assistive technology. */
  avatar?: ReactNode;
  name?: ReactNode;
  status?: ReactNode;
}

/** An avatar, a truncating name and a status. */
const SubagentRow = ({ avatar, name, status }: SubagentRowProps) => (
  <div className="flex min-w-0 items-center gap-1.5 text-sm leading-5">
    {avatar === undefined || avatar === null ? null : (
      <span aria-hidden className="flex size-6 shrink-0">
        {avatar}
      </span>
    )}
    <span className="min-w-0 flex-1 truncate">{name}</span>
    <span className="shrink-0 text-xs text-(--ck-palette-ink-tertiary)">
      {status}
    </span>
  </div>
);

/** The card-wide button. With children it lays out in flow instead. */
const ResourceCardButton = ({
  children,
  className,
  type = "button",
  ...props
}: Omit<ComponentProps<"button">, "color">) => (
  <Button
    {...props}
    className={cn(
      "peer/resource-card cursor-(--ck-action-cursor) rounded-[inherit] bg-transparent whitespace-normal select-auto group-hover/resource-card:bg-fill-primary-transparent-hover/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
      children === undefined || children === null
        ? "absolute inset-0"
        : "relative w-full",
      className
    )}
    disabledAppearance="none"
    focusRing="none"
    type={type}
    unstyled
  >
    {children}
  </Button>
);

/** The 40px icon box of a card. */
const ResourceIconBox = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "flex size-10 shrink-0 items-center justify-center rounded-lg bg-panel-secondary/92 text-text-muted",
      className
    )}
  >
    {children}
  </span>
);

/** The bordered label at the end of a resource card. */
const ResourceOpenLabel = ({ label }: { label: ReactNode }) => (
  <span className="flex h-[calc(var(--spacing)*7)] shrink-0 items-center gap-1 overflow-hidden rounded-lg border border-border bg-transparent px-2 py-0 text-base leading-[18px] whitespace-nowrap hover:bg-fill-primary-transparent-hover">
    {label}
  </span>
);

interface ResourceCardProps {
  className?: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
  titleTooltip?: string;
  trailing?: ReactNode;
}

/** The default variant with default padding. */
const ResourceCard = ({
  className,
  icon,
  subtitle,
  title,
  titleTooltip,
  trailing,
}: ResourceCardProps) => (
  <span
    className={cn(
      "flex min-w-0 items-center gap-2.5 px-[var(--ck-resource-row-padding,0.75rem)] py-3 text-start",
      className
    )}
  >
    {icon}
    <span className="flex min-w-0 flex-1 flex-col">
      <span
        className={cn("truncate font-medium text-text", CHAT_SIZE)}
        title={titleTooltip}
      >
        {title}
      </span>
      {subtitle === undefined || subtitle === null ? null : (
        <span className={cn("truncate text-text-muted", CHAT_SIZE_SM)}>
          {subtitle}
        </span>
      )}
    </span>
    {trailing}
  </span>
);

interface ResourceRowProps {
  /** Controls beside the Open label. They stay clickable above the card button. */
  actions?: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onOpen?: () => void;
  openLabel?: ReactNode;
  /** The accessible name of the card button. It defaults to `Open {title}`. */
  openAriaLabel?: string;
  subtitle?: ReactNode;
  title: string;
}

/** A cited resource as a card with a click-through button layer. */
const ResourceRow = ({
  actions,
  busy,
  disabled,
  icon,
  onOpen,
  openAriaLabel,
  openLabel = "Open",
  subtitle,
  title,
}: ResourceRowProps) => (
  <div className="group/resource-card relative select-none">
    <ResourceCardButton
      aria-busy={busy}
      aria-label={openAriaLabel ?? `Open ${title}`}
      disabled={disabled}
      onClick={onOpen}
    />
    <ResourceCard
      className="pointer-events-none relative z-10"
      icon={<ResourceIconBox>{icon}</ResourceIconBox>}
      subtitle={subtitle}
      title={title}
      titleTooltip={title}
      trailing={
        <span className="flex items-center gap-2">
          {actions === undefined || actions === null ? null : (
            <span className="pointer-events-auto">{actions}</span>
          )}
          <ResourceOpenLabel label={openLabel} />
        </span>
      }
    />
  </div>
);

export {
  ResourceCard,
  ResourceCardButton,
  ResourceIconBox,
  ResourceOpenLabel,
  ResourceRow,
  SubagentRow,
};

export type { ResourceCardProps, ResourceRowProps, SubagentRowProps };
