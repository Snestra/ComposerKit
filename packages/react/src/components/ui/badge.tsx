/* oxlint-disable react/no-react-children, react/no-clone-element, anti-slop/no-runtime-typeof, typescript/promise-function-async -- The component walks children with Children.map and cloneElement and tells strings from elements by type; a child that is a thenable passes through unchanged. */

import { cn } from "@workspace/react/lib/utils";
import { Children, cloneElement, isValidElement } from "react";
import type { ComponentProps, ReactNode } from "react";

type BadgeVariant = "outline" | "soft" | "solid";

type BadgeColor =
  | "danger"
  | "discovery"
  | "info"
  | "secondary"
  | "success"
  | "warning";

type BadgeSize = "lg" | "md" | "sm";

interface BadgeProps {
  children?: ReactNode;
  className?: string;
  color?: BadgeColor;
  pill?: boolean;
  size?: BadgeSize;
  variant?: BadgeVariant;
}

type WebBadgeProps = BadgeProps &
  Omit<ComponentProps<"div">, keyof BadgeProps> & {
    "data-color"?: string;
    "data-pill"?: string;
    "data-size"?: string;
    "data-variant"?: string;
  };

// Text children: adjacent strings and numbers merge into one string, and each
// non-blank string becomes a <span> only when it has siblings, so a lone label
// stays a bare text node. The walk recurses into element children
//.
const mergeTextChildren = (children: ReactNode): ReactNode[] => {
  const merged: ReactNode[] = [];
  let text = "";

  for (const child of Children.toArray(children)) {
    if (typeof child === "string" || typeof child === "number") {
      text += String(child);
    } else {
      if (text !== "") {
        merged.push(text);
        text = "";
      }

      merged.push(child);
    }
  }

  if (text !== "") {
    merged.push(text);
  }

  return merged;
};

const wrapText = (children: ReactNode): ReactNode => {
  const merged = mergeTextChildren(children);

  return Children.map(merged, (child) => {
    if (typeof child === "string" && child.trim() !== "") {
      return merged.length > 1 ? <span>{child}</span> : child;
    }

    if (isValidElement<{ children?: ReactNode }>(child)) {
      const { children: inner } = child.props;

      if (inner !== null && inner !== undefined) {
        return cloneElement(child, {}, wrapText(inner));
      }
    }

    return child;
  });
};

// Every size, gutter, radius, type and icon value reads a --ck-pill-* token the
// way the component does, so an ancestor can restyle the badges
// below it by redefining a token such as --ck-pill-size-sm. The fallbacks are the
// values the Electron token layer resolves to:
// --ck-control-size-3xs 1.375rem, --ck-control-size-2xs 1.5rem, --ck-control-gutter-2xs
// .375rem, --ck-control-gutter-xs .5rem, --ck-type-body-xs/sm/md-size .75/.875/1rem.
// --radius-xs and --radius-sm are the base radius (.25rem, .375rem) times
// --ck-rounding-scale, which the Electron layer sets to 1.25 where the engine
// supports corner-shape.
const sizeClasses = {
  lg: [
    "[--ck-pill-size:var(--ck-pill-size-lg,var(--ck-control-size-2xs,1.5rem))]",
    "[--ck-pill-gutter:var(--ck-pill-gutter-lg,var(--ck-control-gutter-xs,.5rem))]",
    "[--ck-pill-font-size:var(--ck-pill-font-size-lg,var(--ck-type-body-sm-size,.875rem))]",
    "[--ck-pill-font-weight:var(--ck-pill-font-weight-lg,var(--font-weight-semibold,600))]",
    "[--ck-pill-tracking:var(--ck-pill-tracking-lg,var(--tracking-normal,0em))]",
    "[--ck-pill-radius:var(--ck-pill-radius-lg,calc(.375rem_*_var(--ck-rounding-scale,1)))]",
    "[--ck-pill-icon-font-size:var(--ck-pill-icon-font-size-lg,var(--ck-type-body-md-size,1rem))]",
    "[--ck-pill-indicator-size:var(--ck-pill-indicator-size-lg,var(--ck-type-body-sm-size,.875rem))]",
  ],
  md: [
    "[--ck-pill-size:var(--ck-pill-size-md,var(--ck-control-size-3xs,1.375rem))]",
    "[--ck-pill-gutter:var(--ck-pill-gutter-md,var(--ck-control-gutter-2xs,.375rem))]",
    "[--ck-pill-font-size:var(--ck-pill-font-size-md,var(--ck-type-body-sm-size,.875rem))]",
    "[--ck-pill-font-weight:var(--ck-pill-font-weight-md,var(--font-weight-semibold,600))]",
    "[--ck-pill-tracking:var(--ck-pill-tracking-md,var(--tracking-normal,0em))]",
    "[--ck-pill-radius:var(--ck-pill-radius-md,calc(.25rem_*_var(--ck-rounding-scale,1)))]",
    "[--ck-pill-icon-font-size:var(--ck-pill-icon-font-size-md,var(--ck-type-body-md-size,1rem))]",
    "[--ck-pill-indicator-size:var(--ck-pill-indicator-size-md,var(--ck-type-body-xs-size,.75rem))]",
  ],
  sm: [
    "[--ck-pill-size:var(--ck-pill-size-sm,calc(var(--ck-control-size-3xs,1.375rem)_-_2px))]",
    "[--ck-pill-gutter:var(--ck-pill-gutter-sm,calc(var(--ck-control-gutter-2xs,.375rem)_-_1px))]",
    "[--ck-pill-font-size:var(--ck-pill-font-size-sm,var(--ck-type-body-xs-size,.75rem))]",
    "[--ck-pill-font-weight:var(--ck-pill-font-weight-sm,var(--font-weight-semibold,600))]",
    "[--ck-pill-tracking:var(--ck-pill-tracking-sm,var(--tracking-wide,.025em))]",
    "[--ck-pill-radius:var(--ck-pill-radius-sm,calc(.25rem_*_var(--ck-rounding-scale,1)))]",
    "[--ck-pill-icon-font-size:var(--ck-pill-icon-font-size-sm,var(--ck-type-body-xs-size,.75rem))]",
    "[--ck-pill-indicator-size:var(--ck-pill-indicator-size-sm,var(--ck-type-body-xs-size,.75rem))]",
  ],
} as const satisfies Record<BadgeSize, readonly string[]>;

const pillClasses = [
  "[--ck-pill-radius:var(--radius-pill,9999px)]",
  "px-[calc(var(--ck-pill-gutter)*var(--ck-control-gutter-pill-scaling,1.33))]",
];

const colorClasses = {
  outline: {
    danger: [
      "[--ck-pill-border-color:var(--color-stroke-danger-outline)]",
      "[--ck-pill-text-color:var(--color-text-error-outline)]",
    ],
    discovery: [
      "[--ck-pill-border-color:var(--color-stroke-discovery-outline)]",
      "[--ck-pill-text-color:var(--color-text-accent-outline)]",
    ],
    info: [
      "[--ck-pill-border-color:var(--color-stroke-info-outline)]",
      "[--ck-pill-text-color:var(--color-text-notice-outline)]",
    ],
    secondary: [
      "[--ck-pill-border-color:var(--color-stroke-secondary-outline)]",
      "[--ck-pill-text-color:var(--color-text-muted-outline)]",
    ],
    success: [
      "[--ck-pill-border-color:var(--color-stroke-success-outline)]",
      "[--ck-pill-text-color:var(--color-text-positive-outline)]",
    ],
    warning: [
      "[--ck-pill-border-color:var(--color-stroke-warning-outline)]",
      "[--ck-pill-text-color:var(--color-text-alert-outline)]",
    ],
  },
  soft: {
    danger: [
      "[--ck-pill-background-color:var(--color-fill-danger-soft-alpha)]",
      "[--ck-pill-text-color:var(--color-text-error-soft)]",
    ],
    discovery: [
      "[--ck-pill-background-color:var(--color-fill-discovery-soft-alpha)]",
      "[--ck-pill-text-color:var(--color-text-accent-soft)]",
    ],
    info: [
      "[--ck-pill-background-color:var(--color-fill-info-soft-alpha)]",
      "[--ck-pill-text-color:var(--color-text-notice-soft)]",
    ],
    secondary: [
      "[--ck-pill-background-color:var(--color-fill-secondary-soft-alpha)]",
      "[--ck-pill-text-color:var(--color-text-muted-soft)]",
    ],
    success: [
      "[--ck-pill-background-color:var(--color-fill-success-soft-alpha)]",
      "[--ck-pill-text-color:var(--color-text-positive-soft)]",
    ],
    warning: [
      "[--ck-pill-background-color:var(--color-fill-warning-soft-alpha)]",
      "[--ck-pill-text-color:var(--color-text-alert-soft)]",
    ],
  },
  solid: {
    danger: [
      "[--ck-pill-background-color:var(--color-fill-danger-solid)]",
      "[--ck-pill-text-color:var(--color-text-error-solid)]",
    ],
    discovery: [
      "[--ck-pill-background-color:var(--color-fill-discovery-solid)]",
      "[--ck-pill-text-color:var(--color-text-accent-solid)]",
    ],
    info: [
      "[--ck-pill-background-color:var(--color-fill-info-solid)]",
      "[--ck-pill-text-color:var(--color-text-notice-solid)]",
    ],
    secondary: [
      "[--ck-pill-background-color:var(--color-fill-secondary-solid)]",
      "[--ck-pill-text-color:var(--color-text-muted-solid)]",
    ],
    success: [
      "[--ck-pill-background-color:var(--color-fill-success-solid)]",
      "[--ck-pill-text-color:var(--color-text-positive-solid)]",
    ],
    warning: [
      "[--ck-pill-background-color:var(--color-fill-warning-solid)]",
      "[--ck-pill-text-color:var(--color-text-alert-solid)]",
    ],
  },
} as const satisfies Record<
  BadgeVariant,
  Record<BadgeColor, readonly string[]>
>;

const variantClasses = {
  outline:
    "text-(--ck-pill-text-color) shadow-[inset_0_0_0_1px_var(--ck-pill-border-color)]",
  soft: "bg-(--ck-pill-background-color) text-(--ck-pill-text-color)",
  solid: "bg-(--ck-pill-background-color) text-(--ck-pill-text-color)",
} as const satisfies Record<BadgeVariant, string>;

// An svg child takes the icon size unless it opts out with data-ck-no-autosize,
// and its outer edge sits 1px outside the padding (physical left and right, so
// right-to-left does not mirror it) unless it is the only child. The offset
// rules have no specificity, like the :where, so a class on the svg
// can replace them.
const iconClasses = [
  "[&_svg:where(:not([data-ck-no-autosize]))]:[font-size:var(--ck-pill-icon-font-size)]",
  "[:where(&_svg:where(:not([data-ck-no-autosize])):first-child:not(:only-child))]:[margin-left:var(--ck-pill-icon-offset,-1px)]",
  "[:where(&_svg:where(:not([data-ck-no-autosize])):last-child:not(:only-child))]:[margin-right:var(--ck-pill-icon-offset,-1px)]",
];

const baseClasses = [
  "[--progress-ring-size:var(--ck-pill-indicator-size)]",
  "inline-flex h-(--ck-pill-size) items-center gap-[var(--spacing,.25rem)] rounded-(--ck-pill-radius) px-(--ck-pill-gutter) text-(length:--ck-pill-font-size) font-(weight:--ck-pill-font-weight) tracking-(--ck-pill-tracking) whitespace-nowrap",
];

function Badge({
  children,
  className,
  color = "secondary",
  pill = true,
  size = "sm",
  variant = "soft",
}: BadgeProps) {
  return (
    <div
      className={cn(
        baseClasses,
        iconClasses,
        sizeClasses[size],
        colorClasses[variant][color],
        variantClasses[variant],
        pill ? pillClasses : undefined,
        className
      )}
      data-color={color}
      data-pill={pill ? "" : undefined}
      data-size={size}
      data-variant={variant}
    >
      {wrapText(children)}
    </div>
  );
}

function WebBadge({
  children,
  className,
  color = "secondary",
  pill = false,
  size = "sm",
  variant = "soft",
  ...props
}: WebBadgeProps) {
  const actualSize = Object.hasOwn(props, "data-size")
    ? props["data-size"]
    : size;

  const actualColor = Object.hasOwn(props, "data-color")
    ? props["data-color"]
    : color;

  const actualVariant = Object.hasOwn(props, "data-variant")
    ? props["data-variant"]
    : variant;

  const actualPill = Object.hasOwn(props, "data-pill")
    ? props["data-pill"] !== null && props["data-pill"] !== undefined
    : pill;

  const colors: Record<string, readonly string[]> | undefined = Object.entries(
    colorClasses
  ).find(([key]) => key === actualVariant)?.[1];

  return (
    <div
      className={cn(
        baseClasses,
        "gap-[calc(var(--spacing)*1)]",
        iconClasses,
        Object.entries(sizeClasses).find(([key]) => key === actualSize)?.[1],
        colors &&
          Object.entries(colors).find(([key]) => key === actualColor)?.[1],
        Object.entries(variantClasses).find(
          ([key]) => key === actualVariant
        )?.[1],
        actualPill ? pillClasses : undefined,
        className
      )}
      data-color={color}
      data-pill={pill ? "" : undefined}
      data-size={size}
      data-variant={variant}
      {...props}
    >
      {wrapText(children)}
    </div>
  );
}

export { Badge, WebBadge };

export type { BadgeColor, BadgeProps, BadgeSize, BadgeVariant, WebBadgeProps };
