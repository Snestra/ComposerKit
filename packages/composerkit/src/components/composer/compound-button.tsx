"use client";

/* oxlint-disable shadcn/no-restyle, eslint/complexity, anti-slop/no-runtime-typeof, anti-slop/no-unsafe-dictionary-type, anti-slop/require-safety-comment-for-type-assertion -- The compound button joins two Buttons with these classes, branches on string or number children and clones a trigger element whose props are the caller's. */

import { ChevronDownIcon } from "composerkit/components/composer/icons";
import { Button, buttonClassName } from "composerkit/components/ui/button";
import type {
  ButtonColor,
  ButtonRadius,
  ButtonSize,
} from "composerkit/components/ui/button";
import { Menu } from "composerkit/components/ui/menu";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import { useState } from "react";
import type {
  ComponentProps,
  ComponentType,
  ReactElement,
  ReactNode,
  Ref,
} from "react";

/*
 * The compound (split) button is a
 * primary button joined to a dropdown target that opens a menu. The approval
 * card uses it for "Allow once" with "Allow this conversation".
 */

const preventDefault = (event: { preventDefault: () => void }) => {
  event.preventDefault();
};

type CompoundButtonProps = Omit<
  ComponentProps<"div">,
  "onClick" | "children" | "color" | "ref"
> & {
  autoFocus?: boolean;
  children?: ReactNode;
  color?: ButtonColor;
  disabled?: boolean;
  dropdownAlign?: "center" | "end" | "start";
  dropdownButtonClassName?: string;
  dropdownButtonRef?: Ref<HTMLButtonElement>;
  dropdownContent?: ReactNode;
  dropdownDisabled?: boolean;
  dropdownOpen?: boolean;
  dropdownSide?: "bottom" | "left" | "right" | "top";
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDropdownOpenChange?: (open: boolean) => void;
  primaryAriaLabel?: string;
  primaryClassName?: string;
  primaryDisabled?: boolean;
  radius?: ButtonRadius;
  ref?: Ref<HTMLDivElement>;
  /** Replaces the menu; receives the dropdown target button. */
  renderDropdown?: (
    trigger: ReactElement<Record<string, unknown>>
  ) => ReactNode;
  secondaryAriaLabel?: string;
  secondaryIcon?: ComponentType<{ className?: string }>;
  secondaryTooltipContent?: ReactNode;
  secondaryTooltipDisabled?: boolean;
  separated?: boolean;
  size?: ButtonSize;
  tooltipAlign?: "center" | "end" | "start";
  tooltipContent?: ReactNode;
  tooltipDelayOpen?: number;
  tooltipSide?: "bottom" | "left" | "right" | "top";
  tooltipSideOffset?: number;
  type?: "button" | "reset" | "submit";
};

/** The size's radius classes. */
const containerRadius = (size: ButtonSize, radius: ButtonRadius) =>
  radius === "full"
    ? "rounded-full"
    : buttonClassName({ radius, size })
        .split(" ")
        .filter((name) => name.startsWith("rounded"))
        .join(" ");

const CompoundButton = ({
  autoFocus,
  children,
  className,
  color = "primary",
  disabled = false,
  dropdownAlign = "start",
  dropdownButtonClassName,
  dropdownButtonRef,
  dropdownContent,
  dropdownDisabled,
  dropdownOpen,
  dropdownSide = "bottom",
  loading = false,
  onClick,
  onDropdownOpenChange,
  primaryAriaLabel,
  primaryClassName,
  primaryDisabled,
  radius = "default",
  ref,
  renderDropdown,
  secondaryAriaLabel = "Secondary action",
  secondaryIcon: SecondaryIcon = ChevronDownIcon,
  secondaryTooltipContent,
  secondaryTooltipDisabled,
  separated = false,
  size = "default",
  tooltipAlign,
  tooltipContent,
  tooltipDelayOpen,
  tooltipSide,
  tooltipSideOffset,
  type,
  ...props
}: CompoundButtonProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = dropdownOpen !== undefined;
  const open = controlled ? dropdownOpen : uncontrolledOpen;
  const anyDisabled = disabled || loading;
  const primaryOff = anyDisabled || primaryDisabled === true;
  const dropdownOff = dropdownDisabled ?? anyDisabled;
  const bothOff = primaryOff && dropdownOff;
  const outlineDropdownOnly = color === "outline" && primaryOff && !dropdownOff;

  const setOpen = (next: boolean) => {
    if (!controlled) {
      setUncontrolledOpen(next);
    }

    onDropdownOpenChange?.(next);
  };

  const primary = (
    <Button
      aria-label={primaryAriaLabel}
      autoFocus={autoFocus}
      className={cn(
        "rounded-e-none border-e-0",
        separated ? "pe-3" : "pe-1",
        separated && radius === "full" && "ps-4",
        color === "outline" && primaryOff && "disabled:opacity-100",
        outlineDropdownOnly && "disabled:[&>*]:opacity-40",
        primaryClassName
      )}
      color={color}
      disabled={primaryOff}
      focusRing="inset"
      loading={loading}
      radius={radius}
      size={size}
      type={type}
      onClick={(event) => {
        if (primaryOff) {
          return;
        }

        if (onClick) {
          onClick(event);
        } else {
          setOpen(!open);
        }
      }}
    >
      {outlineDropdownOnly &&
      (typeof children === "string" || typeof children === "number") ? (
        <span>{children}</span>
      ) : (
        children
      )}
    </Button>
  );

  const target = (
    <Button
      ref={dropdownButtonRef}
      aria-label={secondaryAriaLabel}
      className={cn(
        "gap-0 rounded-s-none border-s-0",
        separated
          ? "relative ps-2 pe-2 before:pointer-events-none before:absolute before:inset-y-2 before:start-0 before:w-px before:bg-current/25"
          : "ps-0.5 pe-1.5",
        color === "outline" && dropdownOff && "disabled:opacity-100",
        dropdownButtonClassName
      )}
      color={color}
      disabled={dropdownOff}
      focusRing="inset"
      radius={radius}
      size={size}
      type="button"
      onMouseDown={preventDefault}
    >
      <SecondaryIcon
        className={cn(
          "size-3.5",
          color === "outline" && dropdownOff && !primaryOff
            ? "opacity-20"
            : "opacity-50"
        )}
      />
    </Button>
  );

  const targetWithHint =
    secondaryTooltipContent === undefined ||
    secondaryTooltipContent === null ||
    secondaryTooltipDisabled === true ? (
      target
    ) : (
      <TooltipHint
        content={secondaryTooltipContent}
        openDelay={tooltipDelayOpen}
      >
        <span className="inline-flex">{target}</span>
      </TooltipHint>
    );

  const primaryWithHint =
    tooltipContent === undefined || tooltipContent === null ? (
      primary
    ) : (
      <TooltipHint
        align={tooltipAlign}
        content={tooltipContent}
        openDelay={tooltipDelayOpen}
        side={tooltipSide}
        sideOffset={tooltipSideOffset}
      >
        <span className="inline-flex min-w-0">{primary}</span>
      </TooltipHint>
    );

  const dropdown = renderDropdown ? (
    renderDropdown(targetWithHint as ReactElement<Record<string, unknown>>)
  ) : (
    <Menu
      align={dropdownAlign}
      open={!dropdownOff && open}
      side={dropdownSide}
      triggerButton={targetWithHint as ReactElement<Record<string, unknown>>}
      onOpenChange={(next) => {
        if (!dropdownOff) {
          setOpen(next);
        }
      }}
    >
      <div className="flex min-w-[168px] flex-col gap-0.5">
        {dropdownContent}
      </div>
    </Menu>
  );

  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        "inline-flex items-stretch self-start overflow-hidden",
        containerRadius(size, radius),
        color === "outline" && bothOff && "opacity-40",
        className
      )}
    >
      {primaryWithHint}
      {dropdown}
    </div>
  );
};

export { CompoundButton };

export type { CompoundButtonProps };
