"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/require-static-classes -- ToolbarButton and RoundIconToggleButton are the button family's own composites: the component builds them from ButtonBase with the group module's classes. */

import { Tooltip } from "@base-ui/react/tooltip";
import { ButtonBase } from "@workspace/react/components/ui/button";
import type {
  ButtonColor,
  ButtonProps,
} from "@workspace/react/components/ui/button";
import { cn } from "@workspace/react/lib/utils";
import type { ComponentProps, ReactNode } from "react";

import styles from "./button-group.module.css";

// ButtonGroup and its capsule, ToolbarButton, RoundIconToggleButton, the
// divider and the title pill. Their classes come from button-group.module.css.

export type ButtonGroupVariant = "default" | "joined" | "zoom";

interface ControlCapsuleProps extends ComponentProps<"div"> {
  variant?: "default" | "input";
}

const ControlCapsule = ({
  className,
  variant = "default",
  ...props
}: ControlCapsuleProps) => (
  <div
    className={cn(
      styles.capsule,
      styles.controlSurface,
      variant === "input" && styles.inputSurface,
      "rounded-full",
      className
    )}
    data-ck-menu-overlay-surface
    {...props}
  />
);

export interface ButtonGroupProps extends Omit<
  ComponentProps<"div">,
  "aria-label"
> {
  /** Accessible name of the group. */
  label?: string;
  /** Hides the group when it has no children. */
  hideWhenEmpty?: boolean;
  /** Lets the group shrink instead of keeping its width. */
  shrink?: boolean;
  variant?: ButtonGroupVariant;
}

/** A `role="group"` that lays its buttons out in one capsule. */
export const ButtonGroup = ({
  children,
  className,
  hideWhenEmpty = false,
  label,
  shrink = false,
  variant = "default",
  ...props
}: ButtonGroupProps) => (
  <ControlCapsule
    {...props}
    aria-label={label}
    className={cn(
      styles.group,
      variant === "joined" && styles.joined,
      variant === "zoom" && styles.zoomGroup,
      hideWhenEmpty && "empty:hidden",
      "inline-flex items-center border-0 text-text",
      shrink ? "min-w-0" : "shrink-0",
      (variant === "joined" || variant === "zoom") && "gap-0",
      className
    )}
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a div with role="group" and an aria-label.
    role="group"
  >
    {children}
  </ControlCapsule>
);

export type ToolbarButtonVariant =
  | "avatarGroup"
  | "default"
  | "dropdown"
  | "ghost"
  | "label"
  | "primary"
  | "selected"
  | "zoom";

export interface ToolbarButtonProps extends ButtonProps {
  /** Applies the selected surface. */
  selected?: boolean;
  variant?: ToolbarButtonVariant;
}

/** A button in a group or toolbar: unstyled ButtonBase plus the group look. */
export const ToolbarButton = ({
  className,
  selected = false,
  uniform,
  variant = "default",
  ...props
}: ToolbarButtonProps) => (
  <ButtonBase
    {...props}
    className={cn(
      styles.button,
      variant !== "ghost" && styles.controlSurface,
      variant === "primary" && styles.primary,
      (selected || variant === "selected") && styles.selected,
      (variant === "dropdown" || variant === "zoom") && styles.dropdown,
      variant === "zoom" && styles.zoom,
      variant === "label" && styles.label,
      variant === "avatarGroup" && styles.avatarGroup,
      variant !== "primary" &&
        "disabled:text-text-subtle disabled:opacity-100 aria-disabled:text-text-subtle aria-disabled:opacity-100",
      className
    )}
    uniform={uniform}
    unstyled
  />
);

export interface RoundIconToggleButtonProps extends ButtonProps {
  color?: ButtonColor;
}

/** A round, uniform, ghost button for icon toggles. */
export const RoundIconToggleButton = ({
  className,
  color = "ghostActive",
  ...props
}: RoundIconToggleButtonProps) => (
  <ButtonBase
    {...props}
    className={cn(styles.control, className)}
    color={color}
    radius="full"
  />
);

export interface ButtonGroupDividerProps {
  /** `section` draws the wider-spaced divider between sections. */
  variant?: "default" | "section";
}

/** A 1px vertical rule between buttons. Hidden from assistive technology. */
export const ButtonGroupDivider = ({
  variant = "default",
}: ButtonGroupDividerProps) => (
  <span
    aria-hidden="true"
    className={cn(
      styles.divider,
      variant === "section" && styles.sectionDivider
    )}
  />
);

export interface ButtonGroupTitleProps {
  icon?: ReactNode;
  /** Shows the full title in a tooltip. */
  showTooltip?: boolean;
  title: ReactNode;
}

/** A pill showing a title that truncates at 168px. */
export const ButtonGroupTitle = ({
  icon,
  showTooltip = true,
  title,
}: ButtonGroupTitleProps) => {
  const pill = (
    <div
      className={cn(
        styles.title,
        styles.controlSurface,
        "inline-flex min-w-0 items-center gap-2 rounded-full border-0 px-3 text-sm text-text"
      )}
    >
      {icon}
      <span
        className="block max-w-[168px] min-w-0 truncate"
        data-ck-viewer-header-collapsible={
          icon === undefined || icon === null ? undefined : true
        }
      >
        {title}
      </span>
    </div>
  );

  if (!showTooltip) {
    return pill;
  }

  // The tooltip: opens after 150ms or on keyboard focus, is not
  // hoverable, closes on click, pointer leave, blur and Escape (Escape does
  // not reach outer handlers), sits 5px below the trigger with 15px of
  // collision padding, is at most min(320px, the available width) wide and is
  // hidden once its trigger is scrolled out of view.
  return (
    <Tooltip.Root
      disableHoverablePopup
      onOpenChange={(_open, details) => {
        if (details.reason === "escape-key") {
          details.event.stopPropagation();
        }
      }}
    >
      <Tooltip.Trigger closeDelay={0} closeOnClick delay={150} render={pill} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          className="z-50 data-anchor-hidden:invisible"
          collisionPadding={15}
          side="bottom"
          sideOffset={5}
        >
          <Tooltip.Popup
            className="tooltip-popup max-w-[min(320px,var(--available-width))] text-center wrap-break-word whitespace-normal"
            role="tooltip"
          >
            {title}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
