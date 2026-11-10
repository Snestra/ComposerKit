"use client";

/* oxlint-disable shadcn/no-arbitrary-values, shadcn/no-restyle, jsx-a11y/prefer-tag-over-role -- The tip bar is an aside with role=status, draws its pill shadow and background with theme values and styles its Buttons with these classes. */

import { Xmark16Icon } from "composerkit/components/composer/icons";
import { Button } from "composerkit/components/ui/button";
import { cn } from "composerkit/lib/utils";
import { useEffect, useEffectEvent } from "react";
import type { ReactNode } from "react";

/* The tip bar uses the default badge and dismiss messages. */

type ComposerTipVariant = "pill" | "plain";

interface ComposerTipContent {
  /** The label of the dotted-underline action button. */
  actionLabel?: ReactNode;
  badgeLabel?: ReactNode;
  /** A React element is used as is, text is the message. */
  content: ReactNode;
}

interface ComposerTipProps {
  /** Extra content after the message, before the dismiss button. */
  actions?: ReactNode;
  dismissLabel?: string;
  /** `onShown` runs again when it changes. */
  impressionId?: string;
  onDismiss?: () => void;
  onPrimaryAction?: () => void;
  onShown?: () => void;
  tip: ComposerTipContent;
  variant?: ComposerTipVariant;
}

const TIP_BADGE_CLASSES: Record<ComposerTipVariant, string> = {
  pill: "min-h-5 rounded-[calc(var(--radius-2xl)-var(--spacing)*2-1px)] bg-(--ck-palette-surface-tip-badge) px-2 text-xs leading-none font-medium text-(--ck-palette-label-tip-badge)",
  plain:
    "min-h-5 rounded-full bg-(--ck-palette-surface-tip-badge) px-2 text-xs leading-none font-medium text-(--ck-palette-label-tip-badge)",
};

/** The small badge before the message. */
const ComposerTipBadge = ({
  children,
  className,
  variant = "plain",
}: {
  children?: ReactNode;
  className?: string;
  variant?: ComposerTipVariant;
}) => (
  <span
    className={cn(
      "inline-flex items-center",
      TIP_BADGE_CLASSES[variant],
      className
    )}
  >
    {children}
  </span>
);

const PILL_SURFACE =
  "rounded-2xl border border-transparent bg-[light-dark(var(--theme-background-control-opaque),var(--ck-palette-surface-elevated-primary-opaque))] py-2 ps-2 pe-9 shadow-(--shadow-xl) max-sm:shadow-(--shadow-lg)";

/** The tip bar under the composer. */
const ComposerTip = ({
  actions,
  dismissLabel = "Dismiss tip",
  impressionId,
  onDismiss,
  onPrimaryAction,
  onShown,
  tip,
  variant = "plain",
}: ComposerTipProps) => {
  const pill = variant === "pill";

  const reportShown = useEffectEvent(() => {
    onShown?.();
  });

  useEffect(() => {
    reportShown();
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the component runs onShown again whenever the impression id changes
  }, [impressionId]);

  return (
    <aside
      aria-live="polite"
      className="flex w-full justify-center"
      role="status"
    >
      <div
        className={cn(
          "group relative flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 select-none",
          pill ? PILL_SURFACE : "px-7 py-1"
        )}
      >
        <ComposerTipBadge className="shrink-0" variant={variant}>
          {tip.badgeLabel ?? "TIP"}
        </ComposerTipBadge>
        <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span className="min-w-0 text-center wrap-anywhere">
            {tip.content}
          </span>
          {tip.actionLabel !== undefined &&
          tip.actionLabel !== null &&
          onPrimaryAction ? (
            <Button
              className="underline decoration-dotted underline-offset-4"
              color="ghostMuted"
              size="inline"
              onClick={onPrimaryAction}
            >
              {tip.actionLabel}
            </Button>
          ) : null}
        </span>
        {actions}
        <Button
          aria-label={dismissLabel}
          className={
            pill
              ? "absolute end-2 top-1/2 -translate-y-1/2"
              : "pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
          }
          color={pill ? "ghost" : "secondary"}
          radius="large"
          size="iconCircleSm"
          onClick={onDismiss}
        >
          <Xmark16Icon />
        </Button>
      </div>
    </aside>
  );
};

interface ComposerBeaconTipProps {
  actions?: ReactNode;
  beacon: { ui_info: { description?: string | null; title: ReactNode } };
  dismissLabel?: string;
  onDismiss?: () => void;
  onShown?: () => void;
}

/** A beacon's title and optional description as a pill tip. */
const ComposerBeaconTip = ({
  actions,
  beacon,
  dismissLabel,
  onDismiss,
  onShown,
}: ComposerBeaconTipProps) => {
  const description = beacon.ui_info.description ?? "";

  return (
    <ComposerTip
      actions={actions}
      dismissLabel={dismissLabel}
      tip={{
        content: (
          <>
            {beacon.ui_info.title}
            {description === "" ? null : (
              <span className="block">{description}</span>
            )}
          </>
        ),
      }}
      variant="pill"
      onDismiss={onDismiss}
      onShown={onShown}
    />
  );
};

export { ComposerBeaconTip, ComposerTip, ComposerTipBadge };

export type {
  ComposerBeaconTipProps,
  ComposerTipContent,
  ComposerTipProps,
  ComposerTipVariant,
};
