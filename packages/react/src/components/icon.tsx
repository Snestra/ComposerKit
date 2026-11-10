"use client";

// Lucide artwork is covered by components/icon/lucide.license.

import {
  assertIconDefinition,
  canvasOverflows,
  iconPaintVariables,
  paintIconBody,
  scopeIconIds,
} from "@workspace/react/lib/icon-markup";
import type { IconDefinition } from "@workspace/react/lib/icon-markup";
import { cn } from "@workspace/react/lib/utils";
import { useId, useMemo } from "react";
import type { ComponentProps, CSSProperties } from "react";

export type IconProps = Omit<
  ComponentProps<"svg">,
  | "children"
  | "dangerouslySetInnerHTML"
  | "height"
  | "viewBox"
  | "width"
  | "xmlns"
> & {
  /** Prefix for the ids inside the svg. It defaults to the icon name and a per instance id. */
  idPrefix?: string;
  /** An accessible name. `aria-label` wins when both are given. */
  label?: string;
};

const lucideCanvas = {
  height: 24,
  viewBox: "0 0 24 24",
  width: 24,
} as const;

const hasText = (value: string | undefined) =>
  value !== undefined && value !== "";

/**
 * Makes an icon component from a definition. Each instance is decorative
 * (`aria-hidden`) until it has an `aria-label`, `aria-labelledby` or `label`,
 * which makes it `role="img"`. Ids inside the body get a per instance prefix from
 * `useId`, so two instances never share a gradient or clip path id.
 */
export const createIcon = (definition: IconDefinition) => {
  assertIconDefinition(definition);

  const body = paintIconBody(definition);

  const paintStyle: CSSProperties = iconPaintVariables(definition);

  const overflowClass = canvasOverflows(definition.canvas)
    ? "overflow-visible"
    : undefined;

  const Icon = ({
    "aria-hidden": ariaHidden,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
    focusable = "false",
    idPrefix,
    label,
    role,
    style,
    ...props
  }: IconProps) => {
    const instanceId = useId();
    const prefix = idPrefix ?? `${definition.name}-${instanceId}`;

    const markup = useMemo(
      () => ({ __html: scopeIconIds(body, prefix) }),
      [prefix]
    );

    const accessibleName = ariaLabel ?? (hasText(label) ? label : undefined);
    const labelled = hasText(accessibleName) || hasText(ariaLabelledBy);

    return (
      <svg
        {...props}
        aria-hidden={ariaHidden ?? (labelled ? undefined : true)}
        aria-label={accessibleName}
        aria-labelledby={ariaLabelledBy}
        className={cn("shrink-0", overflowClass, className)}
        data-icon-p3={
          definition.paint?.kind === "multicolor" ? definition.name : undefined
        }
        // The body is a static string owned by the icon definition.
        // oxlint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={markup}
        focusable={focusable}
        height={definition.canvas.height}
        role={role ?? (labelled ? "img" : undefined)}
        // The multicolor paint variables are set per icon definition.
        // oxlint-disable-next-line shadcn/no-inline-styles
        style={{ ...paintStyle, ...style }}
        viewBox={definition.canvas.viewBox}
        width={definition.canvas.width}
        xmlns="http://www.w3.org/2000/svg"
      />
    );
  };

  Icon.displayName = `Icon(${definition.name})`;

  return Icon;
};

export const CheckIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></g>',
  canvas: lucideCanvas,
  name: "check",
});

export const CloseIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: lucideCanvas,
  name: "close",
});

export const SearchIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></g>',
  canvas: lucideCanvas,
  name: "search",
});

export const StatusBadgeIcon = createIcon({
  body: [
    "<defs>",
    '<linearGradient id="badge-fill" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="var(--color-status-info)"/>',
    '<stop offset="1" stop-color="var(--color-status-discovery-fill)"/>',
    "</linearGradient>",
    '<clipPath id="badge-clip"><circle cx="12" cy="12" r="10"/></clipPath>',
    "</defs>",
    '<g clip-path="url(#badge-clip)"><rect width="24" height="24" fill="url(#badge-fill)"/></g>',
    '<path d="M20 6 9 17l-5-5" fill="none" stroke="var(--ck-fixed-white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  ].join(""),
  canvas: lucideCanvas,
  name: "status-badge",
  paint: {
    kind: "multicolor",
    layers: [
      {
        color: "var(--color-status-info)",
        role: "brand",
        token: "status-badge-start",
      },
      {
        color: "var(--color-status-discovery-fill)",
        role: "brand",
        token: "status-badge-end",
      },
      {
        color: "var(--ck-fixed-white)",
        role: "foreground",
        token: "status-badge-mark",
      },
    ],
  },
});
