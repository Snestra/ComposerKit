"use client";

import { CheckIcon } from "@workspace/react/components/icon";
import { Avatar } from "@workspace/react/components/ui/avatar";
import { cn } from "@workspace/react/lib/utils";
import {
  Circle as LucideCircle,
  CircleCheck as LucideCircleCheck,
} from "lucide-react";
import type {
  ComponentType,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";

/*
 * The results popup of the autocomplete.
 * A listbox of option buttons: the highlighted one has the transparent-hover fill,
 * an option with a `disabledReason` is disabled at half opacity and receives
 * no item props, and a failed search shows an inline message with role alert.
 * `field` options are top-aligned with `px-2 py-1.5`; `select` options are
 * centred with `px-3 py-2`, take no tab stop and show a selection circle.
 */

export interface AutocompleteOption {
  avatar?: ReactNode;
  colorKey?: string;
  disabledReason?: string;
  Icon?: ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
  id: string;
  imageUrl?: string | null;
  label: string;
  renderIdentity?: (button: ReactElement, context: "option") => ReactElement;
  secondaryLabel?: string;
}

export type AutocompleteVariant = "field" | "select";

export interface AutocompleteListboxProps {
  ariaLabel: string;
  disabled?: boolean;
  /** Shown instead of the options when the search failed. */
  error?: ReactNode;
  getItemProps: (index: number) => HTMLAttributes<HTMLButtonElement>;
  highlightedIndex: number;
  listboxId: string;
  options: readonly AutocompleteOption[];
  selectedIds?: readonly string[];
  variant: AutocompleteVariant;
}

const SelectedCircle = () => (
  <LucideCircleCheck height={20} width={20} strokeWidth={1.5} />
);

const UnselectedCircle = () => (
  <LucideCircle height={20} width={20} strokeWidth={1.5} />
);

interface OptionRowProps {
  disabled: boolean;
  highlighted: boolean;
  itemProps: HTMLAttributes<HTMLButtonElement>;
  listboxId: string;
  option: AutocompleteOption;
  selected: boolean | undefined;
  variant: AutocompleteVariant;
}

const optionLeading = (option: AutocompleteOption): ReactNode => {
  const { Icon, avatar, colorKey, imageUrl, label } = option;

  if (avatar !== undefined && avatar !== null) {
    return avatar;
  }

  if (imageUrl !== undefined && imageUrl !== null) {
    return <Avatar colorKey={colorKey} name={label} size="sm" src={imageUrl} />;
  }

  if (Icon === undefined) {
    return colorKey === undefined ? null : (
      <Avatar colorKey={colorKey} name={label} size="sm" src={null} />
    );
  }

  return <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />;
};

const OptionRow = ({
  disabled,
  highlighted,
  itemProps,
  listboxId,
  option,
  selected,
  variant,
}: OptionRowProps) => {
  const { disabledReason } = option;
  const leading = optionLeading(option);

  const unavailable = disabled || disabledReason !== undefined;

  const button = (
    <button
      {...itemProps}
      aria-selected={selected ?? highlighted}
      className={cn(
        "flex w-full cursor-(--ck-action-cursor,pointer) gap-2 rounded-sm text-start disabled:cursor-not-allowed",
        variant === "select"
          ? "items-center px-3 py-2"
          : "items-start px-2 py-1.5",
        unavailable && "opacity-50",
        highlighted && "bg-(--color-fill-primary-transparent-hover)"
      )}
      disabled={unavailable}
      id={`${listboxId}-option-${encodeURIComponent(option.id)}`}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The option is a button with role option; a native option cannot hold an avatar or a button.
      role="option"
      tabIndex={variant === "select" ? -1 : undefined}
      type="button"
    >
      {variant === "select" &&
        (selected === true ? <SelectedCircle /> : <UnselectedCircle />)}
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={variant === "select" ? "text-base" : "text-sm"}>
          {option.label}
        </span>
        {option.secondaryLabel === undefined ? null : (
          <span className="text-sm text-(--ck-palette-ink-secondary)">
            {option.secondaryLabel}
          </span>
        )}
      </span>
      {disabledReason === undefined ? null : (
        <span className="shrink-0 self-center text-end text-sm text-(--ck-palette-ink-secondary)">
          {disabledReason}
        </span>
      )}
      {selected === true && variant !== "select" ? (
        <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
      ) : null}
    </button>
  );

  return option.renderIdentity?.(button, "option") ?? button;
};

export const AutocompleteListbox = ({
  ariaLabel,
  disabled = false,
  error,
  getItemProps,
  highlightedIndex,
  listboxId,
  options,
  selectedIds,
  variant,
}: AutocompleteListboxProps) => {
  if (error !== undefined && error !== null) {
    return (
      <div className="px-3 py-2 text-sm" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      aria-multiselectable={
        variant === "select" && selectedIds !== undefined ? true : undefined
      }
      id={listboxId}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The results popup is a div with role listbox.
      role="listbox"
    >
      {options.map((option, index) => (
        <OptionRow
          disabled={disabled}
          highlighted={index === highlightedIndex}
          itemProps={
            option.disabledReason === undefined ? getItemProps(index) : {}
          }
          key={option.id}
          listboxId={listboxId}
          option={option}
          selected={selectedIds?.includes(option.id)}
          variant={variant}
        />
      ))}
    </div>
  );
};
