"use client";

/* oxlint-disable typescript/strict-boolean-expressions -- The settings parts test optional slots by truthiness: a description, a title or an icon that is 0, "" or false renders nothing. */

/* oxlint-disable shadcn/no-inline-styles -- The component sets the card panel background inline, so it wins over a caller's class. */

/* oxlint-disable complexity -- Each part composes its classes with one branch per variant, size and density. */

/* oxlint-disable anti-slop/no-runtime-typeof -- A row control is a node or a function of the label and description ids, and the component tests which with typeof. */

/* oxlint-disable react/no-unstable-nested-components -- The row control prop is a render function of the label and description ids, aria-describedby)). */

import {
  Check16Icon,
  ChevronDownIcon,
  ChevronRight16Icon,
  PuzzlePiece20Icon,
} from "composerkit/components/settings/icons";
import { SettingsPluginLogo } from "composerkit/components/settings/logo";
import { Button, ButtonLink } from "composerkit/components/ui/button";
import type { ButtonLinkProps } from "composerkit/components/ui/button";
import { Menu, MenuItem } from "composerkit/components/ui/menu";
import { isNil, isPresent } from "composerkit/lib/present";
import { cn } from "composerkit/lib/utils";
import { useId } from "react";
import type {
  ComponentProps,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from "react";

import styles from "./settings.module.css";

/*
 * The settings family: SettingsRow, SettingsRowLabel, SettingsInteractiveRow,
 * SettingsLabelValueRow, SettingsRadioRow, the text spans, the card dividers,
 * SettingsCard, SettingsGroup, SettingsRows, SettingsRowDisclosure,
 * PreferenceRow, SettingsDropdownButton and DetailPropertyRow.
 *
 * Utility names follow the host stylesheet and resolve to
 * the Electron theme tokens of the foundations family: text-default is
 * text-text, text-secondary is text-text-muted, text-tertiary is
 * text-text-subtle, text-description is text-token-description-foreground,
 * border-default and
 * bg-border are --color-border = --ck-palette-border, border-subtle is
 * --ck-palette-border-light, border-primary-outline is --ck-palette-border-heavy,
 * bg-primary-transparent-hover is
 * --ck-palette-surface-button-secondary-hover, bg-secondary-soft-alpha is
 * the same ghost hover, and bg-primary-soft-alpha is
 * --ck-palette-surface-elevated-secondary on the window body.
 * cursor-interaction is --ck-action-cursor, `default` on the Electron window.
 * The `dark:` colour variants are written as light-dark, so a
 * panel resolves to its nearest theme scope at any depth.
 */

/* ------------------------------------------------------------------ */
/* Text spans                                               */
/* ------------------------------------------------------------------ */

const SettingsTertiaryText = ({ children }: { children?: ReactNode }) => (
  <span className="text-text-subtle">{children}</span>
);

const SettingsSecondaryText = ({ children }: { children?: ReactNode }) => (
  <span className="text-xs text-text-muted">{children}</span>
);

/* ------------------------------------------------------------------ */
/* Row label block                                               */
/* ------------------------------------------------------------------ */

type SettingsRowVariant =
  | "default"
  | "featured"
  | "nested"
  | "recommendation"
  | "stacked";

type SettingsRowLabelVariant = SettingsRowVariant | "empty";

type SettingsLabelSizing = "content" | "grow";

type SettingsLabelWeight = "medium" | "normal";

type SettingsVerticalAlignment = "center" | "start";

interface SettingsRowLabelProps {
  description?: ReactNode;
  descriptionId?: string;
  icon?: ReactNode;
  label?: ReactNode;
  labelId?: string;
  labelSizing?: SettingsLabelSizing;
  labelWeight?: SettingsLabelWeight;
  variant?: SettingsRowLabelVariant;
  verticalAlignment?: SettingsVerticalAlignment;
}

const SettingsRowLabel = ({
  description,
  descriptionId,
  icon,
  label,
  labelId,
  labelSizing = "grow",
  labelWeight = "medium",
  variant,
  verticalAlignment,
}: SettingsRowLabelProps) => (
  <div
    className={cn(
      "flex min-w-0 gap-3",
      verticalAlignment === "start" ? "items-start" : "items-center",
      labelSizing === "grow" && "flex-1"
    )}
  >
    {isNil(icon) ? null : <span className="flex shrink-0">{icon}</span>}
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div
        className={cn(
          "min-w-0 break-words text-text group-data-[density=compact]/settings:leading-4.5",
          variant === "featured" && "text-base",
          variant === "recommendation" && "text-[13px] leading-[18.571429px]",
          variant !== "featured" && variant !== "recommendation" && "text-sm",
          variant !== "nested" && labelWeight === "medium" && "font-medium"
        )}
        id={labelId}
      >
        {label}
      </div>
      {description ? (
        <div
          className="min-w-0 text-xs leading-4 text-wrap break-words text-text-muted"
          id={descriptionId}
        >
          {description}
        </div>
      ) : null}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* SettingsRow                                                   */
/* ------------------------------------------------------------------ */

interface SettingsRowControlAria {
  "aria-describedby": string | undefined;
  "aria-labelledby": string | undefined;
}

type SettingsRowControl =
  | ReactNode
  | ((aria: SettingsRowControlAria) => ReactNode);

type SettingsRowLayout = "default" | "split";

type SettingsRowSize = "compact" | "default";

type SettingsControlSizing = "content" | "grow" | "minimum";

interface SettingsRowProps {
  className?: string;
  /** A function is called with the ids that name the control by the row's label and description. */
  control?: SettingsRowControl;
  controlSizing?: SettingsControlSizing;
  description?: ReactNode;
  icon?: ReactNode;
  id?: string;
  inset?: boolean;
  label?: ReactNode;
  labelSizing?: SettingsLabelSizing;
  labelWeight?: SettingsLabelWeight;
  layout?: SettingsRowLayout;
  size?: SettingsRowSize;
  variant?: SettingsRowVariant;
  verticalAlignment?: SettingsVerticalAlignment;
}

const SettingsRow = ({
  className,
  control,
  controlSizing = "minimum",
  description,
  icon,
  id,
  inset = true,
  label,
  labelSizing = "grow",
  labelWeight = "medium",
  layout = "default",
  size = "default",
  variant = "default",
  verticalAlignment = "center",
}: SettingsRowProps) => {
  const baseId = useId();

  const hasHeader =
    isPresent(label) || isPresent(description) || isPresent(icon);

  const controlIsFunction = typeof control === "function";

  const labelId =
    controlIsFunction && isPresent(label) ? `${baseId}-label` : undefined;

  const descriptionId =
    controlIsFunction && description ? `${baseId}-description` : undefined;

  const flexRow =
    layout === "default" &&
    (variant === "default" ||
      variant === "featured" ||
      variant === "recommendation");

  const split = layout === "split" && variant === "default";
  const compact = size === "compact";

  const rowClassName = cn(
    "@container/settings-row",
    inset && (layout !== "split" || variant !== "default") && "px-4",
    inset && variant === "nested" && "group-data-[density=form]/settings:px-5",
    variant === "stacked" &&
      "flex flex-col items-stretch gap-1 py-3 group-data-[density=compact]/settings:gap-0.5 group-data-[density=compact]/settings:py-2.5 group-data-[density=compact]/settings:first:pt-3.5 group-data-[density=compact]/settings:last:pb-4",
    variant === "nested" &&
      "flex min-h-10 justify-between gap-3 py-2 group-data-[density=form]/settings:min-h-12 max-sm:min-h-0 max-sm:flex-col max-sm:items-stretch sm:group-data-[density=form]/settings:py-0",
    variant !== "stacked" &&
      (verticalAlignment === "start" ? "items-start" : "items-center"),
    split && "grid grid-cols-1 gap-2 px-0 py-4 sm:grid-cols-3",
    flexRow &&
      cn(
        "flex justify-between",
        variant === "featured" &&
          cn("gap-6", compact ? "min-h-11 py-2" : "py-4"),
        variant !== "featured" && (compact ? "gap-4 py-2" : "gap-6 py-3")
      ),
    variant === "recommendation" &&
      "bg-[light-dark(transparent,var(--ck-palette-surface-button-secondary-hover))]",
    className
  );

  const showControl = isPresent(control) && control !== false;

  return (
    <div className={rowClassName} id={id}>
      {hasHeader ? (
        <SettingsRowLabel
          description={description}
          descriptionId={descriptionId}
          icon={icon}
          label={label}
          labelId={labelId}
          labelSizing={labelSizing}
          labelWeight={labelWeight}
          variant={variant}
          verticalAlignment={verticalAlignment}
        />
      ) : null}
      {showControl ? (
        <div
          className={cn(
            variant === "stacked" && "w-full",
            variant === "nested" &&
              "flex min-w-0 flex-1 items-center justify-end max-sm:justify-stretch",
            split &&
              cn(
                "flex max-w-full min-w-0 items-center justify-end gap-2 sm:col-span-2",
                controlSizing === "grow" && "w-full"
              ),
            flexRow &&
              cn(
                "flex max-w-full items-center justify-end gap-2",
                controlSizing === "grow" ? "min-w-0 flex-1" : "shrink-0",
                controlSizing === "minimum" &&
                  "min-w-[min(--spacing(40),40cqw)] empty:min-w-0"
              )
          )}
        >
          {typeof control === "function"
            ? control({
                "aria-describedby": descriptionId,
                "aria-labelledby": labelId,
              })
            : control}
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SettingsInteractiveRow                                        */
/* ------------------------------------------------------------------ */

type SettingsInteractiveRowVariant =
  | "default"
  | "empty"
  | "nested"
  | "recommendation";

type SettingsActionsPlacement = "before-trailing" | "end";

type SettingsEdgeRounding = "none" | "row" | "surface";

interface SettingsInteractiveRowOwnProps {
  actions?: ReactNode;
  actionsPlacement?: SettingsActionsPlacement;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaLabel?: string;
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  edgeRounding?: SettingsEdgeRounding;
  icon?: ReactNode;
  label?: ReactNode;
  size?: "default" | "large";
  trailing?: ReactNode;
  variant?: SettingsInteractiveRowVariant;
}

type OwnKeys =
  | "aria-controls"
  | "aria-expanded"
  | "aria-label"
  | "children"
  | "className"
  | "color"
  | "disabled"
  | "ref"
  | "title";

type SettingsInteractiveRowButtonProps = Omit<
  ComponentProps<"button">,
  OwnKeys | "type"
> & { to?: undefined };

type SettingsInteractiveRowLinkProps = Omit<ComponentProps<"a">, OwnKeys> &
  Pick<
    ButtonLinkProps,
    "prefetch" | "preventScrollReset" | "reloadDocument" | "replace"
  > & { to: NonNullable<ButtonLinkProps["to"]> };

type SettingsInteractiveRowProps = SettingsInteractiveRowOwnProps &
  (SettingsInteractiveRowButtonProps | SettingsInteractiveRowLinkProps);

const preventDefault = (event: MouseEvent<HTMLElement>) => {
  event.preventDefault();
};

const SettingsInteractiveRow = ({
  actions,
  actionsPlacement = "end",
  ariaControls,
  ariaExpanded,
  ariaLabel,
  className,
  description,
  disabled,
  edgeRounding = "row",
  icon,
  label,
  size = "default",
  trailing,
  variant = "default",
  ...rest
}: SettingsInteractiveRowProps) => {
  const beforeTrailing =
    actionsPlacement === "before-trailing" &&
    !disabled &&
    isPresent(actions) &&
    isPresent(trailing);

  const buttonClassName = cn(
    "min-w-0 flex-1 cursor-(--ck-action-cursor) items-center rounded-[inherit] whitespace-normal focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-default disabled:opacity-60",
    beforeTrailing
      ? "col-span-full row-start-1 grid grid-cols-subgrid"
      : "flex",
    variant === "empty"
      ? "flex-col justify-center gap-4 px-6 py-10 text-center text-base text-text-subtle select-none"
      : cn(
          "px-4 text-start",
          variant === "nested" && "min-h-10 py-0.5",
          variant !== "nested" && (size === "large" ? "py-4" : "py-3"),
          beforeTrailing && "gap-2",
          !beforeTrailing && (variant === "nested" ? "gap-3" : "gap-6")
        ),
    className
  );

  const content = (
    <>
      {variant === "empty" ? (
        <>
          {icon}
          {label}
        </>
      ) : (
        <SettingsRowLabel
          description={description}
          icon={icon}
          label={label}
          variant={variant}
          verticalAlignment="center"
        />
      )}
      {isNil(trailing) ? null : (
        <div className="col-start-3 flex shrink-0 items-center gap-2">
          {trailing}
        </div>
      )}
    </>
  );

  const wrapperClassName = cn(
    "group w-full items-center",
    beforeTrailing
      ? "grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-2"
      : "flex",
    edgeRounding === "row" && "first:rounded-t-2xl last:rounded-b-2xl",
    variant === "recommendation" &&
      "bg-[light-dark(transparent,var(--ck-palette-surface-button-secondary-hover))]",
    // The component adds dark:hover:bg-secondary-soft-alpha for recommendation
    // rows; that token is the same ghost hover colour, so one hover
    // rule covers every variant and scope.
    !disabled &&
      "focus-within:bg-fill-primary-transparent-hover hover:bg-fill-primary-transparent-hover"
  );

  const action =
    !disabled && isPresent(actions) ? (
      <div
        className={cn(
          "flex shrink-0 items-center gap-1",
          beforeTrailing ? "relative col-start-2 row-start-1" : "pe-4"
        )}
      >
        {actions}
      </div>
    ) : null;

  if (rest.to === undefined) {
    return (
      <div className={wrapperClassName}>
        <Button
          {...rest}
          aria-controls={ariaControls}
          aria-expanded={ariaExpanded}
          aria-label={ariaLabel}
          className={buttonClassName}
          disabled={disabled}
          disabledAppearance="none"
          focusRing="none"
          type="button"
          unstyled
        >
          {content}
        </Button>
        {action}
      </div>
    );
  }

  const { onClick, ...linkRest } = rest;

  return (
    <div className={wrapperClassName}>
      <ButtonLink
        {...linkRest}
        aria-controls={ariaControls}
        aria-disabled={disabled ? true : undefined}
        aria-expanded={ariaExpanded}
        aria-label={ariaLabel}
        className={buttonClassName}
        disabledAppearance="none"
        focusRing="none"
        onClick={disabled ? preventDefault : onClick}
        tabIndex={disabled ? -1 : undefined}
        unstyled
      >
        {content}
      </ButtonLink>
      {action}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SettingsLabelValueRow                                         */
/* ------------------------------------------------------------------ */

interface SettingsLabelValueRowProps {
  children?: ReactNode;
  compactLabelInset?: boolean;
  label?: ReactNode;
  valueAlignment?: "end" | "start";
  variant?: "compact" | "default";
}

const SettingsLabelValueRow = ({
  children,
  compactLabelInset = true,
  label,
  valueAlignment = "start",
  variant = "default",
}: SettingsLabelValueRowProps) => {
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "grid items-center",
        compact
          ? "h-[1.875rem] w-full grid-cols-[auto_minmax(0,1fr)] gap-x-6 overflow-x-hidden rounded-lg text-base leading-[18px] text-text"
          : "min-h-14 gap-1 px-4 py-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6"
      )}
    >
      <div
        className={cn(
          "min-w-0",
          compact
            ? cn(
                "flex items-center pe-2 text-start",
                compactLabelInset && "ps-1"
              )
            : "text-sm text-text-muted"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "min-w-0",
          compact
            ? "flex items-center justify-end justify-self-stretch overflow-hidden"
            : cn(
                "text-sm break-words whitespace-normal text-text",
                valueAlignment === "end" && "text-end"
              )
        )}
      >
        {children}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SettingsRadioRow                                              */
/* ------------------------------------------------------------------ */

type SettingsRadioIndicator = "checkmark" | "radio";

type SettingsRadioRowVariant = "default" | "form" | "inline";

interface SettingsRadioRowProps {
  ariaLabel?: string;
  autoFocus?: boolean;
  checked?: boolean;
  description?: ReactNode;
  highlightSelected?: boolean;
  id: string;
  indicator?: SettingsRadioIndicator;
  label?: ReactNode;
  name?: string;
  onChange?: ComponentProps<"input">["onChange"];
  onClick?: ComponentProps<"input">["onClick"];
  value?: string;
  variant?: SettingsRadioRowVariant;
}

const SettingsRadioRow = ({
  ariaLabel,
  autoFocus,
  checked,
  description,
  highlightSelected = true,
  id,
  indicator = "radio",
  label,
  name,
  onChange,
  onClick,
  value,
  variant = "default",
}: SettingsRadioRowProps) => (
  <div
    className={cn(
      "relative flex has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-2px] has-[:focus-visible]:outline-ring",
      variant === "default" &&
        cn(
          "gap-3 px-4 py-3 hover:bg-fill-primary-transparent-hover",
          isNil(description) ? "items-center" : "min-h-16 items-start"
        ),
      variant === "default" &&
        checked &&
        highlightSelected &&
        indicator === "radio" &&
        "bg-(--ck-palette-surface-elevated-secondary)",
      variant === "form" &&
        "items-center gap-4 px-4 py-4 hover:bg-fill-primary-transparent-hover",
      variant === "inline" && "items-center gap-2",
      indicator === "checkmark" && "after:ms-7"
    )}
  >
    <label
      aria-label={ariaLabel}
      className="absolute inset-0 cursor-(--ck-action-cursor)"
      htmlFor={id}
    />
    <input
      aria-describedby={isNil(description) ? undefined : `${id}-description`}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      checked={checked}
      className={cn(
        "z-10 cursor-(--ck-action-cursor)",
        indicator === "checkmark"
          ? "absolute inset-0 size-full opacity-0"
          : cn(
              "relative shrink-0 appearance-auto accent-current",
              variant === "default" ? "mt-1 size-4" : "size-5"
            )
      )}
      id={id}
      name={name}
      onChange={onChange}
      onClick={onClick}
      type="radio"
      value={value}
    />
    {indicator === "checkmark" ? (
      <Check16Icon className={cn(!checked && "invisible")} />
    ) : null}
    <span className="pointer-events-none relative flex min-w-0 flex-col gap-0.5">
      <span
        className={cn(
          "text-text",
          variant === "default" ? "text-sm font-medium" : "text-base"
        )}
      >
        {label}
      </span>
      {isNil(description) ? null : (
        <span
          className="text-sm leading-5 text-text-muted"
          id={`${id}-description`}
        >
          {description}
        </span>
      )}
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/* SettingsCard and its dividers                      */
/* ------------------------------------------------------------------ */

type SettingsCardVariant =
  | "default"
  | "flat"
  | "form"
  | "input"
  | "metered"
  | "muted"
  | "outlined"
  | "outlinedLarge"
  | "recommendation"
  | "rows"
  | "secondary";

const INSET_DIVIDERS =
  "flex flex-col [&>*:not(:last-child)]:relative [&>*:not(:last-child)]:after:pointer-events-none [&>*:not(:last-child)]:after:absolute [&>*:not(:last-child)]:after:inset-x-4 [&>*:not(:last-child)]:after:bottom-0 [&>*:not(:last-child)]:after:h-px [&>*:not(:last-child)]:after:bg-border [&>*:not(:last-child)]:after:content-['']";

const FULL_DIVIDERS =
  "flex flex-col [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border";

const PANEL_BACKGROUND: CSSProperties = {
  backgroundColor:
    "var(--theme-background-panel, var(--ck-palette-surface-elevated-secondary))",
};

interface SettingsCardProps {
  children?: ReactNode;
  className?: string;
  contentOverflow?: "hidden" | "visible";
  /** `"daybreak"` adds the gradient glow at the inline end. */
  decoration?: "daybreak";
  dividers?: boolean;
  variant?: SettingsCardVariant;
}

const SettingsCard = ({
  children,
  className,
  contentOverflow = "hidden",
  decoration,
  dividers = true,
  variant = "default",
}: SettingsCardProps) => {
  const flat = variant === "flat" || variant === "rows";
  let dividerClassName = "flex flex-col";

  if (dividers) {
    dividerClassName = flat ? FULL_DIVIDERS : INSET_DIVIDERS;
  }

  return (
    <div
      className={cn(
        dividerClassName,
        variant === "recommendation" && "rounded-[20px]",
        variant !== "recommendation" &&
          !flat &&
          variant !== "outlinedLarge" &&
          "rounded-2xl",
        variant === "outlinedLarge" &&
          "rounded-[30px] border border-border bg-transparent",
        decoration === "daybreak" && styles.daybreak,
        contentOverflow === "visible" ? "overflow-visible" : "overflow-hidden",
        variant === "default" &&
          "border border-border group-data-[density=compact]/settings:border-0 group-data-[density=compact]/settings:ring-1 group-data-[density=compact]/settings:ring-border group-data-[density=compact]/settings:ring-inset",
        variant === "metered" && "ring-1 ring-stroke-subtle ring-inset",
        variant === "secondary" && "bg-panel-secondary/92",
        variant === "muted" &&
          "bg-[light-dark(color-mix(in_oklab,var(--ck-palette-surface-elevated-secondary)_50%,transparent),var(--ck-palette-surface-elevated-secondary))]",
        variant === "form" &&
          "border border-stroke-subtle bg-[light-dark(var(--ck-palette-surface-surface),color-mix(in_oklab,var(--ck-palette-surface-surface-under)_92%,transparent))] group-data-[density=form]/settings:border-border group-data-[density=form]/settings:bg-transparent group-data-[density=form]/settings:[&>*:not(:last-child)]:after:inset-x-5 group-data-[density=form]/settings:[&>*:not(:last-child)]:after:h-px group-data-[density=form]/settings:[&>*:not(:last-child)]:after:bg-stroke-subtle",
        variant === "outlined" && "border border-stroke-subtle bg-transparent",
        variant === "flat" &&
          "relative bg-transparent before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:content-['']",
        variant === "input" &&
          "border border-token-border-heavy bg-fill-primary-soft",
        variant === "recommendation" &&
          "border border-border bg-[light-dark(var(--ck-palette-surface-button-secondary),transparent)]",
        className
      )}
      style={
        variant === "default" || variant === "metered"
          ? PANEL_BACKGROUND
          : undefined
      }
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SettingsRows (settings-rows)                                        */
/* ------------------------------------------------------------------ */

interface SettingsRowsProps {
  children?: ReactNode;
  /** `"none"` runs the dividers edge to edge instead of inset. */
  dividerInset?: "default" | "none";
  variant?: "default" | "interactive";
}

const SettingsRows = ({
  children,
  dividerInset = "default",
  variant = "default",
}: SettingsRowsProps) => {
  let className = INSET_DIVIDERS;

  if (variant === "interactive") {
    className = cn("divide-y", styles.interactive);
  } else if (dividerInset === "none") {
    className = FULL_DIVIDERS;
  }

  return <div className={className}>{children}</div>;
};

/* ------------------------------------------------------------------ */
/* SettingsRowDisclosure (settings-row-disclosure)                     */
/* ------------------------------------------------------------------ */

interface SettingsRowDisclosureProps {
  /** The toggle row. */
  children?: ReactNode;
  /** Rendered, in a sibling with `contentId`, only while `expanded`. */
  content?: ReactNode;
  contentId?: string;
  expanded?: boolean;
}

const SettingsRowDisclosure = ({
  children,
  content,
  contentId,
  expanded,
}: SettingsRowDisclosureProps) => (
  <div className={INSET_DIVIDERS}>
    {children}
    {expanded ? (
      <div className={INSET_DIVIDERS} id={contentId}>
        {content}
      </div>
    ) : null}
  </div>
);

/* ------------------------------------------------------------------ */
/* SettingsGroup (settings-group)                                      */
/* ------------------------------------------------------------------ */

interface SettingsGroupProps {
  children?: ReactNode;
  className?: string;
  id?: string;
}

const SettingsGroupRoot = ({ children, className, id }: SettingsGroupProps) => (
  <section className={cn("flex flex-col", className)} id={id}>
    {children}
  </section>
);

interface SettingsGroupHeaderProps {
  actions?: ReactNode;
  actionsAlignment?: "end" | "start";
  className?: string;
  size?: "base" | "compact" | "default" | "large";
  spacing?: "compact" | "default";
  subtitle?: ReactNode;
  subtitlePlacement?: "below-header" | "below-title";
  subtitleWrap?: "balance" | "wrap";
  title?: ReactNode;
  titleGap?: "default" | "none";
}

const SettingsGroupHeader = ({
  actions,
  actionsAlignment,
  className,
  size = "default",
  spacing = "default",
  subtitle,
  subtitlePlacement = "below-title",
  subtitleWrap = "balance",
  title,
  titleGap = "default",
}: SettingsGroupHeaderProps) => {
  const hasTitle = isPresent(title);
  const hasSubtitle = isPresent(subtitle);

  if (!hasTitle && !hasSubtitle && isNil(actions)) {
    return null;
  }

  const compact = size === "compact";

  const subtitleNode = subtitle ? (
    <div
      className={cn(
        "font-normal text-text-muted group-data-[density=compact]/settings:text-wrap",
        subtitleWrap === "balance" ? "text-balance" : "text-wrap",
        compact ? "text-xs leading-4" : "text-sm leading-[18px]",
        subtitlePlacement === "below-header" && "w-full"
      )}
    >
      {subtitle}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "flex justify-between group-data-[density=compact]/settings:min-h-0 group-data-[density=compact]/settings:pb-3",
        subtitlePlacement === "below-header"
          ? "flex-wrap gap-x-4 gap-y-0.5"
          : "gap-4",
        hasSubtitle && spacing === "compact" && "pb-2",
        hasSubtitle && spacing !== "compact" && "pb-3",
        !hasSubtitle &&
          cn(
            "items-center pb-1.5",
            spacing === "compact" ? "min-h-8" : "min-h-[var(--height-bar,46px)]"
          ),
        hasSubtitle && compact && "items-center",
        hasSubtitle && !compact && "items-start",
        className
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          titleGap === "none"
            ? "gap-0"
            : "gap-0.5 group-data-[density=compact]/settings:gap-0.75"
        )}
      >
        {title ? (
          <div
            className={cn(
              "font-medium text-text group-data-[density=compact]/settings:text-lg group-data-[density=compact]/settings:leading-5",
              size === "compact" && "text-sm leading-[18px]",
              (size === "large" || (size === "default" && hasSubtitle)) &&
                "text-lg",
              (size === "base" || (size === "default" && !hasSubtitle)) &&
                "text-base"
            )}
          >
            {title}
          </div>
        ) : null}
        {subtitlePlacement === "below-title" ? subtitleNode : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "flex items-center gap-2",
            actionsAlignment === "end" && "self-end"
          )}
        >
          {actions}
        </div>
      ) : null}
      {subtitlePlacement === "below-header" ? subtitleNode : null}
    </div>
  );
};

const SettingsGroupContent = ({
  children,
  className,
}: Omit<SettingsGroupProps, "id">) => (
  <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
);

interface SettingsGroupFooterProps {
  children?: ReactNode;
  className?: string;
  variant?: "action" | "description";
}

const SettingsGroupFooter = ({
  children,
  className,
  variant = "description",
}: SettingsGroupFooterProps) => (
  <div
    className={cn(
      "text-balance text-text-muted",
      variant === "action"
        ? "pt-4 text-sm leading-5"
        : "px-4 pt-1.5 text-xs leading-4",
      className
    )}
  >
    {children}
  </div>
);

const SettingsGroup = Object.assign(SettingsGroupRoot, {
  Content: SettingsGroupContent,
  Footer: SettingsGroupFooter,
  Header: SettingsGroupHeader,
});

/* ------------------------------------------------------------------ */
/* DetailPropertyRow (detail-property-row)                             */
/* ------------------------------------------------------------------ */

interface DetailPropertyRowProps {
  align?: "center" | "start";
  children?: ReactNode;
  className?: string;
  /** Keeps the label for assistive tech only until the container is 24rem wide. */
  hideLabelWhenNarrow?: boolean;
  icon?: ReactNode;
  label?: ReactNode;
  spacing?: "default" | "relaxed";
}

const DetailPropertyRow = ({
  align = "center",
  children,
  className,
  hideLabelWhenNarrow = false,
  icon,
  label,
  spacing = "default",
}: DetailPropertyRowProps) => (
  <div
    className={cn(
      // --ck-row-height-row is 31px on the Electron window body; a caller can set the token.
      "grid min-h-[var(--ck-row-height-row,31px)] gap-x-3 gap-y-0.5 text-[length:var(--ck-detail-row-font-size,var(--text-base))] leading-5 [@container_(min-width:24rem)]:grid-cols-[var(--ck-detail-property-label-width,120px)_minmax(0,1fr)]",
      spacing === "relaxed"
        ? "py-3 last:pb-0"
        : "py-[var(--ck-row-padding-y,calc(var(--spacing)*1.25))]",
      hideLabelWhenNarrow ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1",
      align === "start"
        ? "items-start"
        : cn(
            hideLabelWhenNarrow
              ? "items-center"
              : "items-start [@container_(min-width:24rem)]:items-center"
          ),
      className
    )}
  >
    <dt className="flex min-w-0 items-center gap-2 wrap-anywhere text-token-description-foreground">
      {icon}
      {hideLabelWhenNarrow ? (
        <span className="sr-only [@container_(min-width:24rem)]:not-sr-only">
          {label}
        </span>
      ) : (
        label
      )}
    </dt>
    <dd className="m-0 flex min-w-0 items-center wrap-anywhere text-text">
      {children}
    </dd>
  </div>
);

/* ------------------------------------------------------------------ */
/* SettingsDropdownButton and PreferenceRow. */
/* ------------------------------------------------------------------ */

type SettingsDropdownButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children"
> & {
  chevronClassName?: string;
  children?: ReactNode;
  contentClassName?: string;
  leadingVisual?: ReactNode;
};

const SettingsDropdownButton = ({
  chevronClassName,
  children,
  className,
  color = "outline",
  contentClassName,
  leadingVisual,
  size = "toolbar",
  ...props
}: SettingsDropdownButtonProps) => (
  <Button
    color={color}
    size={size}
    {...props}
    className={cn(
      "max-w-full justify-between",
      size === "toolbar" &&
        (isNil(leadingVisual)
          ? "px-3"
          : "ps-[calc((calc(var(--spacing)*7)-var(--spacing)*5)/2-1px)] pe-3"),
      className
    )}
  >
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5",
        contentClassName
      )}
    >
      {leadingVisual}
      {children}
    </span>
    <ChevronDownIcon
      className={cn(
        "size-(--icon-detail-size,14px) shrink-0 text-text-subtle",
        chevronClassName
      )}
    />
  </Button>
);

/** The bar shown in place of a value while it loads. */
const SettingsLoadingBar = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn(styles.loadingBar, className)}
    data-size="sm"
  />
);

interface PreferenceOption<Value extends string> {
  label: ReactNode;
  value: Value;
}

interface PreferenceRowProps<Value extends string> {
  description?: ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  label?: ReactNode;
  /** Called with the chosen value, or null for the default entry. */
  onChange: (value: Value | null) => void;
  options: readonly PreferenceOption<Value>[];
  value?: Value | null;
}

const UseDefaultLabel = () => "Use default";

const PreferenceRow = <Value extends string>({
  description,
  disabled,
  isLoading = false,
  label,
  onChange,
  options,
  value,
}: PreferenceRowProps<Value>) => {
  let current: ReactNode;

  if (isLoading) {
    current = (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a span with role="status" around the sr-only text and the bar.
      <span role="status">
        <span className="sr-only">Loading…</span>
        <SettingsLoadingBar className="block w-24" />
      </span>
    );
  } else if (isNil(value)) {
    current = <UseDefaultLabel />;
  } else {
    current =
      options.find((option) => option.value === value)?.label ?? "Unavailable";
  }

  return (
    <SettingsRow
      control={(aria) => (
        <Menu
          align="end"
          disabled={disabled}
          triggerButton={
            <SettingsDropdownButton
              {...aria}
              aria-busy={isLoading || undefined}
              disabled={disabled}
            >
              {current}
            </SettingsDropdownButton>
          }
        >
          <MenuItem
            onSelect={() => {
              onChange(null);
            }}
          >
            <UseDefaultLabel />
          </MenuItem>
          {options.map((option) => (
            <MenuItem
              key={option.value}
              onSelect={() => {
                onChange(option.value);
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      )}
      description={description}
      label={label}
    />
  );
};

/* ------------------------------------------------------------------ */
/* PluginSettingsRow (plugin-settings-row)                             */
/* ------------------------------------------------------------------ */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

type PluginSettingsRowProps = DistributiveOmit<
  SettingsInteractiveRowProps,
  "actionsPlacement" | "edgeRounding" | "icon" | "trailing"
> & {
  /** KnownAppId: a static registry icon replaces the remote logo. */
  knownAppId?: string;
  logoDarkUrl?: string | null;
  logoUrl?: string | null;
};

const PluginSettingsRow = ({
  knownAppId,
  logoDarkUrl,
  logoUrl,
  ...rest
}: PluginSettingsRowProps) => (
  <SettingsInteractiveRow
    {...rest}
    actionsPlacement="before-trailing"
    edgeRounding="surface"
    icon={
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-panel">
        <SettingsPluginLogo
          alt=""
          className="h-full w-full object-contain"
          knownAppId={knownAppId}
          fallback={
            <span className="flex items-center justify-center">
              <PuzzlePiece20Icon />
            </span>
          }
          logoDarkUrl={logoDarkUrl}
          logoUrl={logoUrl}
        />
      </span>
    }
    trailing={<ChevronRight16Icon className="text-text-subtle" />}
  />
);

export {
  DetailPropertyRow,
  PluginSettingsRow,
  PreferenceRow,
  SettingsCard,
  SettingsDropdownButton,
  SettingsGroup,
  SettingsInteractiveRow,
  SettingsLabelValueRow,
  SettingsLoadingBar,
  SettingsRadioRow,
  SettingsRow,
  SettingsRowDisclosure,
  SettingsRowLabel,
  SettingsRows,
  SettingsSecondaryText,
  SettingsTertiaryText,
};

export type {
  DetailPropertyRowProps,
  PreferenceOption,
  PluginSettingsRowProps,
  PreferenceRowProps,
  SettingsCardProps,
  SettingsCardVariant,
  SettingsInteractiveRowProps,
  SettingsLabelValueRowProps,
  SettingsRadioRowProps,
  SettingsRowControl,
  SettingsRowControlAria,
  SettingsRowDisclosureProps,
  SettingsRowProps,
  SettingsRowVariant,
  SettingsRowsProps,
};
