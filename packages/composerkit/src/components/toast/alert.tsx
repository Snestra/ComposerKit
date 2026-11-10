"use client";

// Lucide artwork is covered by components/icon/lucide.license.

/* oxlint-disable eslint/eqeqeq, eslint/no-eq-null -- The component tests `!= null` for the leading node and the actions; each test stays as written. */
/* oxlint-disable eslint/complexity -- Alert and the toast content keeps one branch per case. */
/* oxlint-disable shadcn/no-arbitrary-values -- The leading utility preserves the alert line height. */
/* oxlint-disable anti-slop/no-runtime-typeof -- The component wraps string children in a font-medium div. */

import { createIcon } from "composerkit/components/icon";
import { Button } from "composerkit/components/ui/button";
import type { ComponentType, ReactNode } from "react";

import type { ToastAction, ToastLevel, ToastVariant } from "./types";

/*
 * Alert joins class names with clsx, not tailwind-merge, so conflicting
 * utilities remain and stylesheet order decides which applies.
 */

type ClassValue =
  | Record<string, boolean | undefined>
  | false
  | string
  | undefined;

const classNames = (...values: ClassValue[]) =>
  values
    .flatMap((value) => {
      if (value === undefined || value === false) {
        return [];
      }

      if (typeof value === "string") {
        return [value];
      }

      return Object.entries(value).flatMap(([name, on]) =>
        on === true ? [name] : []
      );
    })
    .join(" ");

const DEFAULT_CLOSE_LABEL = "Close";

// The component also lists alert-root and box-shadow-lg, which
// have no CSS, so they are left out.
const SURFACE_CLASS_NAME =
  "inline-flex flex-col gap-2 rounded-xl px-3 py-2 text-base leading-[1.4] pointer-events-auto border";

const CONTENT_CLASS_NAME =
  "[pointer-events:all] min-w-0 max-w-full shadow-(--shadow-toast)";

const InfoIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "circle-info-16",
});

const SuccessIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m16 9-5.5 5.5L8 12"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "circle-check-16",
});

const AlertIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "circle-exclamation-mark-16",
});

const SuccessSolidIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m16 9-5.5 5.5L8 12"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "circle-check-20",
});

const CloseIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-16",
});

export interface ToastAlertProps {
  actions?: ReactNode;
  actionsInline?: boolean;
  /** Renders role="alert" (default true); the toast content turns it off. */
  announce?: boolean;
  children?: ReactNode;
  className?: string;
  /** Label of the close button; the default is "Close". */
  closeLabel?: string;
  contentAlignment?: "center";
  fullWidth?: boolean;
  icon?: ComponentType<{ className?: string }>;
  leading?: ReactNode;
  level?: ToastLevel;
  onRemove?: () => void;
  richColors?: boolean;
  testId?: string;
  variant?: ToastVariant;
}

// Theme values of the Electron token layer. light-dark resolves each pair against the
// nearest theme scope at any depth.
const THEME_VARIABLES = [
  // --color-text-positive: --ck-palette-accent-green (green-500 / green-300).
  "[--toast-success:var(--color-status-success)]",
  // --color-text-alert: --ck-palette-label-warning (orange-500 / orange-300).
  "[--toast-warning:var(--color-status-warning)]",
  // --color-text-error: --ck-palette-label-error (red-500 / red-300).
  "[--toast-danger:var(--color-status-danger)]",
  // --color-fill-{success,warning,danger}-surface (-25 / -950 steps).
  "[--toast-success-surface:var(--color-status-success-surface)]",
  "[--toast-warning-surface:var(--color-status-warning-surface)]",
  "[--toast-danger-surface:var(--color-status-danger-surface)]",
  // --color-stroke-warning-outline / -danger-outline: --ck-palette-border-*.
  "[--toast-warning-outline:var(--color-status-warning)]",
  "[--toast-danger-outline:var(--color-status-danger)]",
  // --color-fill-success-solid and -danger-solid.
  "[--toast-success-solid:var(--color-status-success-solid)]",
  "[--toast-danger-solid:var(--color-status-danger-solid)]",
].join(" ");

/** The alert surface, leading icon slot, content, actions and close. */
export const ToastAlert = ({
  actions,
  actionsInline = false,
  announce = true,
  children,
  className,
  closeLabel = DEFAULT_CLOSE_LABEL,
  contentAlignment,
  fullWidth,
  icon: LeadingIcon,
  leading,
  level = "info",
  onRemove,
  richColors = false,
  testId,
  variant = "default",
}: ToastAlertProps) => {
  const isDefault = variant === "default";

  const infoSurface =
    isDefault && (level === "info" || (level === "success" && !richColors));

  const successSurface = isDefault && level === "success" && richColors;
  const successNeutral = variant === "successNeutral";
  const successSolid = variant === "successSolid";
  const dangerSolid = variant === "dangerSolid";
  const warningSurface = isDefault && level === "warning";
  const dangerSurface = isDefault && level === "danger";
  const defaultText = isDefault && (!richColors || level === "info");
  const successText = isDefault && richColors && level === "success";
  const warningText = isDefault && richColors && level === "warning";
  const dangerText = isDefault && richColors && level === "danger";
  const centered = contentAlignment === "center";

  const surfaceClassName = classNames(
    THEME_VARIABLES,
    SURFACE_CLASS_NAME,
    {
      "border-(--toast-danger-outline) bg-(--toast-danger-surface)":
        dangerSurface,
      "border-(--toast-success)/20 bg-(--toast-success-surface)":
        successSurface,
      "border-(--toast-warning-outline) bg-(--toast-warning-surface)":
        warningSurface,
      "border-border bg-panel-elevated-secondary": infoSurface,
      "border-transparent bg-(--toast-danger-solid) text-white": dangerSolid,
      "border-transparent bg-(--toast-success-solid) text-white": successSolid,
      "border-transparent bg-fill-primary-solid text-text-strong-solid":
        successNeutral,
      flex: fullWidth,
      "text-(--toast-danger)": dangerText,
      "text-(--toast-success)": successText,
      "text-(--toast-warning)": warningText,
      "text-text": defaultText,
    },
    className
  );

  const leadingSlot =
    leading != null || LeadingIcon ? (
      <div
        className={classNames(
          "flex size-6 shrink-0 grow-0 items-center justify-center",
          {
            "self-start": !centered,
            "text-text": isDefault && !richColors,
          }
        )}
      >
        {leading ??
          (LeadingIcon ? (
            <LeadingIcon className="size-(--icon-size,16px)" />
          ) : null)}
      </div>
    ) : null;

  return (
    <div
      className={surfaceClassName}
      data-testid={testId}
      role={announce ? "alert" : undefined}
    >
      <div
        className={classNames(
          "flex min-w-0",
          centered ? "items-center gap-3" : "items-start gap-1"
        )}
      >
        {leadingSlot}
        <div
          className={classNames(
            "flex min-w-0 flex-1 gap-3",
            centered ? "items-center" : "items-start"
          )}
        >
          <div className="min-w-0 flex-1 justify-center gap-2 break-words">
            {typeof children === "string" ? (
              <div className="font-medium">{children}</div>
            ) : (
              children
            )}
          </div>
          {actionsInline && actions != null ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
        {onRemove ? (
          <button
            aria-label={closeLabel}
            className={classNames(
              "flex size-6 shrink-0 grow-0 cursor-(--ck-action-cursor) items-center justify-center rounded-full hover:bg-fill-primary-transparent-hover/5",
              { "self-start": !centered }
            )}
            onClick={onRemove}
            type="button"
          >
            <CloseIcon aria-hidden={false} />
          </button>
        ) : null}
      </div>
      {!actionsInline && actions != null ? (
        <div className="flex items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
};

export interface ToastContentProps {
  actionPlacement?: "inline";
  closeLabel?: string;
  description?: ReactNode;
  leading?: ReactNode;
  level: ToastLevel;
  onClose?: () => void;
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
  testId?: string;
  title?: ReactNode;
  variant?: ToastVariant;
}

const LEVEL_ICONS = {
  danger: AlertIcon,
  info: InfoIcon,
  success: SuccessIcon,
  warning: AlertIcon,
} as const;

const descriptionClassName = (variant: ToastVariant, level: ToastLevel) =>
  classNames("text-start", {
    "text-(--toast-danger)": variant === "default" && level === "danger",
    "text-(--toast-success)": variant === "default" && level === "success",
    "text-(--toast-warning)": variant === "default" && level === "warning",
    "text-sm font-normal": variant === "successSolid",
    "text-text-muted": variant === "default" && level === "info",
    "text-text-strong-solid": variant === "successNeutral",
    "text-white": variant === "dangerSolid",
  });

/** Toast content uses the Alert with the level icon, title, description and actions. */
export const ToastContent = ({
  actionPlacement,
  closeLabel,
  description,
  leading,
  level,
  onClose,
  primaryAction,
  secondaryAction,
  testId,
  title,
  variant = "default",
}: ToastContentProps) => {
  const compactActions =
    variant === "successNeutral" || variant === "successSolid";

  let primaryColor: "primary" | "successOutline" | "tinted" = "primary";

  if (variant === "successSolid") {
    primaryColor = "successOutline";
  } else if (variant === "successNeutral") {
    primaryColor = "tinted";
  }

  const inline = actionPlacement === "inline";

  const LevelIcon =
    variant === "successSolid" ? SuccessSolidIcon : LEVEL_ICONS[level];

  const actions =
    primaryAction != null || secondaryAction != null ? (
      <>
        {secondaryAction == null ? null : (
          <Button
            color={variant === "successSolid" ? "successOutline" : "secondary"}
            {...secondaryAction.dataAttributes}
            loading={secondaryAction.loading}
            onClick={() => {
              secondaryAction.onClick();
            }}
            size={compactActions ? "actionSm" : "compact"}
          >
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction == null ? null : (
          <Button
            color={primaryColor}
            {...primaryAction.dataAttributes}
            loading={primaryAction.loading}
            onClick={() => {
              primaryAction.onClick();
            }}
            size={compactActions ? "actionSm" : "compact"}
          >
            {primaryAction.label}
          </Button>
        )}
      </>
    ) : undefined;

  return (
    <ToastAlert
      actions={actions}
      actionsInline={inline || description == null}
      announce={false}
      className={classNames(
        CONTENT_CLASS_NAME,
        {
          "[&_a]:text-inherit! [&_a]:underline!": variant === "successSolid",
        },
        "leading-normal",
        { "w-max": inline }
      )}
      closeLabel={closeLabel}
      contentAlignment={inline ? "center" : undefined}
      fullWidth
      leading={
        leading === undefined ? <LevelIcon aria-hidden={false} /> : leading
      }
      level={level}
      onRemove={onClose}
      richColors
      testId={testId}
      variant={variant}
    >
      <div className="min-w-0">
        <div
          className={classNames(
            "flex min-h-6 items-center text-start whitespace-pre-wrap",
            variant === "successSolid"
              ? "text-base font-semibold"
              : "font-medium"
          )}
        >
          {title}
        </div>
        {description == null ? null : (
          <div className={descriptionClassName(variant, level)}>
            {description}
          </div>
        )}
      </div>
    </ToastAlert>
  );
};
