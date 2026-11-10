"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values -- The checkbox is the app checkbox (variant default), which is the Radix root and indicator with these exact classes; the onboarding list passes its own 18px box (`h-[18px] w-[18px] rounded-[3px] border-[1px]`). */

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The list and its rows are divs with the list and listitem roles. */

import {
  CheckMark17Icon,
  MinusMark20Icon,
} from "composerkit/components/list/icons";
import {
  CheckboxIndicator,
  CheckboxRoot,
} from "composerkit/components/ui/checkbox";
import type { CheckedState } from "composerkit/components/ui/checkbox";
import { cn } from "composerkit/lib/utils";
import type { ReactNode } from "react";

/*
 * The onboarding selection list. `text-description` is
 * --ck-palette-ink-tertiary in the theme scope; border-default is the border color token.
 */

// The app checkbox, variant default, size md: the Radix root
// and indicator with `group peer shrink-0 outline-none`, the transition, the
// `icon-2xs rounded-xs` box (14px), `border border-strong shadow-sm`, the
// checked and indeterminate fill (--color-fill-primary-soft), the focus
// ring, the enabled hover fill (surface-tertiary) and the invalid ring. The
// onboarding list passes `h-[18px] w-[18px] rounded-[3px] border-[1px]`, which
// wins over the box size, radius and width. `text-danger` is red-500 / red-300.
const CHECKBOX_BOX =
  "group peer shrink-0 outline-none [--sel-danger:var(--color-status-danger)] transition-[background-color,border-color,box-shadow] size-3.5 rounded-xs data-[state=checked]:bg-fill-primary-soft data-[state=indeterminate]:bg-fill-primary-soft border border-stroke-strong shadow-sm data-[state=checked]:text-text data-[state=indeterminate]:text-text focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 not-disabled:hover:bg-panel-tertiary aria-invalid:border-(--sel-danger) aria-invalid:ring-2 aria-invalid:ring-[color-mix(in_oklab,var(--sel-danger)_20%,transparent)] disabled:cursor-not-allowed";

const ONBOARDING_CHECKBOX = "h-[18px] w-[18px] rounded-[3px] border-[1px]";

interface SelectionCheckboxProps {
  checked?: CheckedState;
  className?: string;
  defaultChecked?: CheckedState;
  disabled?: boolean;
  id?: string;
  onCheckedChange?: (checked: boolean) => void;
}

/** The app checkbox, default variant. `onCheckedChange` never receives "indeterminate". */
const SelectionCheckbox = ({
  checked,
  className,
  onCheckedChange,
  ...props
}: SelectionCheckboxProps) => (
  <CheckboxRoot
    {...props}
    checked={checked}
    className={cn(CHECKBOX_BOX, className)}
    onCheckedChange={(next) => {
      onCheckedChange?.(next === "indeterminate" || next);
    }}
  >
    <CheckboxIndicator className="flex h-full w-full items-center justify-center text-current">
      {checked === "indeterminate" ? (
        <MinusMark20Icon className="size-3.5 shrink-0" />
      ) : (
        <CheckMark17Icon className="size-3 shrink-0" />
      )}
    </CheckboxIndicator>
  </CheckboxRoot>
);

interface SelectionListProps {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
}

/** The 240px scrolling box. */
const SelectionList = ({
  ariaLabel,
  children,
  className,
}: SelectionListProps) => (
  <div
    aria-label={ariaLabel}
    className={cn(
      "flex h-[240px] w-full flex-col overflow-y-auto rounded-2xl border border-border px-5 py-4",
      className
    )}
    role="list"
  >
    {children}
  </div>
);

interface SelectionListRowProps {
  alignment?: "center" | "start";
  checkboxClassName?: string;
  checkboxId?: string;
  checked?: CheckedState;
  className?: string;
  /** Replaces the checkbox. The label then is not tied to a control. */
  control?: ReactNode;
  controlPlacement?: "left" | "right";
  description?: ReactNode;
  descriptionClassName?: string;
  disabled?: boolean;
  label?: ReactNode;
  labelClassName?: string;
  leadingContent?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  trailingClassName?: string;
  trailingContent?: ReactNode;
  trailingControl?: ReactNode;
}

const has = (node: ReactNode) => node !== undefined && node !== null;

/** A row whose label toggles its checkbox. */
const SelectionListRow = ({
  alignment = "start",
  checkboxClassName = ONBOARDING_CHECKBOX,
  checkboxId,
  checked,
  className,
  control,
  controlPlacement = "left",
  description,
  descriptionClassName,
  disabled = false,
  label,
  labelClassName,
  leadingContent,
  onCheckedChange,
  trailingClassName,
  trailingContent,
  trailingControl,
}: SelectionListRowProps) => {
  const ownsCheckbox =
    !has(control) &&
    checkboxId !== undefined &&
    checked !== undefined &&
    onCheckedChange !== undefined;

  const checkbox = ownsCheckbox ? (
    <SelectionCheckbox
      checked={checked}
      className={checkboxClassName}
      disabled={disabled}
      id={checkboxId}
      onCheckedChange={(next) => {
        onCheckedChange(next);
      }}
    />
  ) : (
    control
  );

  return (
    <div
      className={cn(
        "relative flex gap-2 last:border-b-0",
        alignment === "center" ? "items-center" : "items-start",
        className
      )}
      role="listitem"
    >
      {controlPlacement === "left" ? <div>{checkbox}</div> : null}
      {has(leadingContent) ? <div>{leadingContent}</div> : null}
      <label
        className="flex min-w-0 flex-1 items-start gap-2 text-start"
        htmlFor={ownsCheckbox ? checkboxId : undefined}
      >
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate text-base leading-5 text-text",
              labelClassName
            )}
          >
            {label}
          </div>
          {has(description) ? (
            <div
              className={cn(
                "truncate text-xs leading-4 text-text-muted",
                descriptionClassName
              )}
            >
              {description}
            </div>
          ) : null}
        </div>
        {has(trailingContent) ? (
          <span
            className={cn(
              "max-w-[45%] shrink truncate text-end text-sm leading-5 text-(--ck-palette-ink-tertiary)",
              trailingClassName
            )}
          >
            {trailingContent}
          </span>
        ) : null}
      </label>
      {has(trailingControl) ? <div>{trailingControl}</div> : null}
      {controlPlacement === "right" ? <div>{checkbox}</div> : null}
    </div>
  );
};

export { SelectionCheckbox, SelectionList, SelectionListRow };

export type {
  SelectionCheckboxProps,
  SelectionListProps,
  SelectionListRowProps,
};
