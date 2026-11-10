"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-arbitrary-values -- The component styles plain <button> elements itself; they are the library Button in `unstyled` mode and take the measured sizes, radii and token expressions through className, which no Button variant or theme token carries. */

/* oxlint-disable typescript/strict-boolean-expressions -- The row tests optional slots (icon, secondLine, secondLineRightText, buttonProps) for truthiness, so 0, "" and false render nothing, as the component does. */

/* oxlint-disable eslint/complexity -- SelectableListRow keeps one branch per case. */

/* oxlint-disable anti-slop/no-runtime-typeof -- The link destination is a string or path parts and the platform link component is "a" or a component). */

import { useLinkComponent } from "@workspace/react/components/platform-provider";
import { Button } from "@workspace/react/components/ui/button";
import type { ButtonLinkPath } from "@workspace/react/components/ui/button";
import { cn } from "@workspace/react/lib/utils";
import { usePathname } from "next/navigation";
import { createElement } from "react";
import type {
  ComponentProps,
  ComponentType,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";

import styles from "./selectable-row.module.css";

/*
 * SelectableListRow, its group wrappers, the loading rows and the pressable
 * hook. Utility names follow the host stylesheet: see
 * ui/card.tsx for the token mapping (`--ck-row-height-row`, `--ck-row-padding-*`).
 * `bg-primary-soft-active` is --ck-palette-surface-button-secondary
 * and `shadow-card` uses the theme shadow color.
 */

type SelectableRowDensity = "compact" | "default" | "profile" | "row";

type SelectableRowSurface = "embedded" | "flush" | "plain" | "raised";

type SelectableRowTone = "default" | "muted";

type SelectableRowLinkTarget = ButtonLinkPath | string;

interface PressableProps {
  "aria-disabled": boolean;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  role: "button";
  tabIndex: number;
}

/**
 * A div that behaves like a button. Enter and Space press it only when
 * the key is pressed on the div itself; a disabled row, or one with no handler,
 * leaves the tab order and ignores presses.
 */
const usePressable = ({
  isDisabled = false,
  onSelect,
}: {
  isDisabled?: boolean;
  onSelect?: (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
  ) => void;
}): PressableProps => {
  const inert = isDisabled || onSelect === undefined;

  return {
    "aria-disabled": inert,
    onClick: (event) => {
      if (inert || event.defaultPrevented) {
        return;
      }

      if (
        event.target instanceof Node &&
        event.currentTarget.contains(event.target)
      ) {
        onSelect?.(event);
      }
    },
    onKeyDown: (event) => {
      if (inert || event.defaultPrevented) {
        return;
      }

      if (
        event.currentTarget === event.target &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        onSelect?.(event);
      }
    },
    role: "button",
    tabIndex: inert ? -1 : 0,
  };
};

const parseLinkPath = (to: string): ButtonLinkPath => {
  const path: ButtonLinkPath = {};
  let rest = to;
  const hashIndex = rest.indexOf("#");

  if (hashIndex !== -1) {
    path.hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }

  const searchIndex = rest.indexOf("?");

  if (searchIndex !== -1) {
    path.search = rest.slice(searchIndex);
    rest = rest.slice(0, searchIndex);
  }

  if (rest) {
    path.pathname = rest;
  }

  return path;
};

const destinationPath = (
  to: SelectableRowLinkTarget,
  currentPathname: string
) => {
  const {
    hash = "",
    pathname,
    search = "",
  } = typeof to === "string" ? parseLinkPath(to) : to;

  const resolved =
    pathname !== undefined && pathname !== "" ? pathname : currentPathname;

  return `${resolved}${search && !search.startsWith("?") ? "?" : ""}${search}${hash && !hash.startsWith("#") ? "#" : ""}${hash}`;
};

interface RouterLinkProps extends ComponentProps<"a"> {
  prefetch?: boolean;
}

const RowLink = ({
  to,
  ...props
}: ComponentProps<"a"> & { to: SelectableRowLinkTarget }) => {
  const LinkComponent = useLinkComponent();
  const pathname = usePathname() ?? "/";

  const anchorProps: ComponentProps<"a"> = {
    ...props,
    href: destinationPath(to, pathname),
  };

  if (typeof LinkComponent === "string") {
    return createElement("a", anchorProps);
  }

  // SAFETY: the platform link component is anchor-like and forwards `prefetch`.
  return createElement(LinkComponent as ComponentType<RouterLinkProps>, {
    ...anchorProps,
    prefetch: false,
  });
};

const columnGap = (compact: boolean, dense: boolean) => {
  if (compact) {
    return "gap-0";
  }

  return dense ? "gap-0.5" : "gap-1";
};

interface SelectableListRowProps {
  ariaCurrent?: ComponentProps<"div">["aria-current"];
  ariaDescribedBy?: string;
  ariaLabel?: string;
  buttonProps?: Omit<ComponentProps<"button">, "color">;
  /** Replaces the default icon, title and lines. */
  children?: ReactNode;
  className?: string;
  compactSecondLine?: boolean;
  density?: SelectableRowDensity;
  hasInteractiveContent?: boolean;
  icon?: ReactNode;
  isDisabled?: boolean;
  isSelected?: boolean;
  onContextMenu?: ComponentProps<"div">["onContextMenu"];
  onSelect?: (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
  ) => void;
  rightText?: ReactNode;
  rightTextPosition?: "center" | "top";
  role?: ComponentProps<"div">["role"];
  secondaryTitle?: ReactNode;
  secondLine?: ReactNode;
  secondLineRightText?: ReactNode;
  showDivider?: boolean;
  surface?: SelectableRowSurface;
  title?: ReactNode;
  titleAdornment?: ReactNode;
  titleWrap?: boolean;
  to?: SelectableRowLinkTarget;
  tone?: SelectableRowTone;
}

const SelectableListRow = ({
  ariaCurrent,
  ariaDescribedBy,
  ariaLabel,
  buttonProps,
  children,
  className,
  compactSecondLine = false,
  density = "default",
  hasInteractiveContent = false,
  icon,
  isDisabled = false,
  isSelected,
  onContextMenu,
  onSelect,
  rightText,
  rightTextPosition = "top",
  role,
  secondaryTitle,
  secondLine,
  secondLineRightText,
  showDivider,
  surface = "plain",
  title,
  titleAdornment,
  titleWrap = false,
  to,
  tone = "default",
}: SelectableListRowProps) => {
  const dense = density !== "default";
  const divider = showDivider ?? surface === "plain";
  const pressable = usePressable({ isDisabled, onSelect });

  const centeredRight =
    rightText !== undefined &&
    rightText !== null &&
    rightTextPosition === "center";

  const content = children ?? (
    <div
      className={cn(
        "relative flex min-w-0 gap-2",
        dense && !titleWrap ? "items-center" : "items-start",
        centeredRight ? "pe-16" : null
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex min-w-4 shrink-0 items-center justify-center",
            dense ? "min-h-5" : "min-h-6"
          )}
        >
          {icon}
        </span>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          columnGap(compactSecondLine, dense)
        )}
      >
        <div
          className={cn(
            "flex min-w-0 gap-3",
            dense &&
              !titleWrap &&
              (density === "row" || !secondLine) &&
              "items-center",
            (titleWrap || (density === "compact" && !!secondLine)) &&
              "items-start",
            !dense && !titleWrap && "items-baseline"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-baseline gap-2",
              dense && titleWrap ? "text-sm leading-5" : "text-base leading-6"
            )}
          >
            <span
              className={cn(
                "min-w-0",
                titleWrap ? "wrap-anywhere" : "truncate",
                tone === "default" && "text-text"
              )}
            >
              {title}
            </span>
            {secondaryTitle === undefined || secondaryTitle === null ? null : (
              <span className="max-w-48 shrink-0 truncate text-(--ck-palette-ink-tertiary)">
                {secondaryTitle}
              </span>
            )}
            {titleAdornment === undefined || titleAdornment === null ? null : (
              <span className="flex min-w-0 shrink self-center">
                {titleAdornment}
              </span>
            )}
          </div>
          {rightText !== undefined && rightText !== null && !centeredRight ? (
            <div
              className={cn(
                "flex shrink-0 items-center text-(--ck-palette-ink-tertiary)",
                dense ? "min-h-5 text-xs" : "min-h-6 text-base"
              )}
            >
              {rightText}
            </div>
          ) : null}
        </div>
        {secondLine ? (
          <div
            className={cn(
              "flex min-w-0 items-center justify-between text-(--ck-palette-ink-tertiary)",
              dense ? "gap-2 text-xs" : "gap-3 text-sm",
              dense || compactSecondLine ? "leading-4" : "leading-[22px]"
            )}
          >
            <div className="min-w-0 flex-1">{secondLine}</div>
            {secondLineRightText ? (
              <div
                className={cn(
                  "flex shrink-0 items-center",
                  dense ? "min-h-4" : "min-h-[22px]"
                )}
              >
                {secondLineRightText}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {centeredRight ? (
        <div className="absolute top-1/2 right-0 flex min-h-6 -translate-y-1/2 items-center text-base text-(--ck-palette-ink-tertiary)">
          {rightText}
        </div>
      ) : null}
    </div>
  );

  const rowClassName = cn(
    "group w-full text-start text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
    styles.row,
    density === "profile" && styles.profile,
    divider && styles.divider,
    isSelected && styles.selected,
    isDisabled && styles.disabled,
    tone === "muted" && (isSelected ? "text-text" : "text-text-muted"),
    tone === "muted" && !isDisabled && "focus-within:text-text hover:text-text",
    density === "profile" && "min-h-18 border-b border-transparent py-4",
    density === "row" &&
      "min-h-[var(--ck-row-height-row,calc(var(--text-base,14px)*1.5+var(--spacing)*2))] px-[var(--ck-row-padding-cell-x,var(--ck-row-padding-x,calc(var(--spacing)*2)))] py-[var(--ck-row-padding-y,calc(var(--spacing)*1.25))]",
    density !== "profile" &&
      density !== "row" && ["min-h-10 px-3", dense ? "py-2.5" : "py-3"],
    surface === "raised" && "rounded-2xl",
    surface === "plain" && (dense ? "rounded-xl" : "rounded-lg"),
    surface === "raised" &&
      "border border-stroke-subtle shadow-(--shadow-card)",
    surface === "raised" &&
      !isDisabled &&
      !isSelected &&
      "hover:border-stroke-strong",
    surface === "raised" && !isSelected && "bg-panel-elevated/60",
    isDisabled ? "cursor-default opacity-50" : "cursor-(--ck-action-cursor)",
    surface !== "embedded" &&
      !isDisabled &&
      isSelected &&
      "bg-(--ck-palette-surface-button-secondary)",
    (surface === "plain" || surface === "flush") &&
      !isDisabled &&
      !isSelected &&
      "hover:bg-fill-primary-transparent-hover",
    className
  );

  if ((hasInteractiveContent || to !== undefined) && role !== "row") {
    const overlayClassName = cn(
      "absolute inset-0 cursor-(--ck-action-cursor) outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-default",
      surface === "raised" && "rounded-2xl",
      surface === "plain" && "rounded-lg",
      surface === "embedded" && "rounded-xl focus-visible:ring-inset"
    );

    const overlayProps = {
      "aria-current": ariaCurrent,
      "aria-describedby": ariaDescribedBy,
      "aria-label": ariaLabel,
    };

    return (
      // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The component forwards the context menu to the wrapper, the overlay inside it is the control.
      <div
        className={cn("relative", rowClassName)}
        onContextMenu={onContextMenu}
      >
        {to !== undefined && !isDisabled ? (
          <RowLink {...overlayProps} className={overlayClassName} to={to} />
        ) : (
          <Button
            {...overlayProps}
            disabled={isDisabled}
            disabledAppearance="none"
            focusRing="none"
            onClick={onSelect}
            type="button"
            unstyled
            {...buttonProps}
            className={cn(
              "whitespace-normal select-auto",
              overlayClassName,
              buttonProps?.className
            )}
          />
        )}
        <div className="pointer-events-none relative">{content}</div>
      </div>
    );
  }

  const pressableProps = isDisabled ? {} : pressable;

  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The row is a div with the pressable role and key handlers.
    <div
      aria-current={ariaCurrent}
      aria-describedby={ariaDescribedBy}
      aria-disabled={isDisabled}
      aria-label={ariaLabel}
      aria-selected={role === "row" ? isSelected : undefined}
      className={rowClassName}
      onContextMenu={onContextMenu}
      {...pressableProps}
      role={role ?? pressable.role}
    >
      {content}
    </div>
  );
};

/** A group of rows; the divider rules read its class. */
const SelectableListRowGroup = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div {...props} className={cn(styles.group, className)} />
);

/** One grouped item; it draws the divider between grouped items. */
const SelectableListRowGroupItem = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div {...props} className={cn(styles.groupItem, className)} />
);

/* ------------------------------------------------------------------ */
/* Loading rows                                                  */
/* ------------------------------------------------------------------ */

type SelectableListLoadingDensity = "compact" | "default" | "row" | "sidebar";

const LOADING_ROWS = [
  { key: "first", secondLineWidth: "w-1/2", titleWidth: "w-2/3" },
  { key: "second", secondLineWidth: "w-2/5", titleWidth: "w-1/2" },
  { key: "third", secondLineWidth: "w-3/5", titleWidth: "w-3/4" },
  { key: "fourth", secondLineWidth: "w-1/3", titleWidth: "w-5/12" },
  { key: "fifth", secondLineWidth: "w-1/2", titleWidth: "w-2/3" },
] as const;

interface SelectableListLoadingProps {
  density?: SelectableListLoadingDensity;
  icon?: ReactNode;
  loadingLabel?: ReactNode;
  rowCount?: number;
}

const SelectableListLoading = ({
  density = "default",
  icon,
  loadingLabel,
  rowCount,
}: SelectableListLoadingProps) => {
  const count = rowCount ?? (density === "sidebar" ? 4 : 5);

  const rows = LOADING_ROWS.slice(0, count).map((row) =>
    density === "row" ? (
      <div aria-hidden key={row.key}>
        <SelectableListRow
          buttonProps={{ disabled: true }}
          compactSecondLine
          density="row"
          hasInteractiveContent
          icon={icon}
          isSelected={false}
          secondLine={
            <span className="inline-block h-3 w-24 rounded bg-text/10 motion-safe:animate-pulse" />
          }
          title={
            <span className="inline-block h-4 w-32 rounded bg-text/10 motion-safe:animate-pulse" />
          }
        />
      </div>
    ) : (
      <div
        aria-hidden
        className={cn(
          "flex w-full gap-2 motion-safe:animate-pulse",
          density === "sidebar"
            ? "h-[var(--ck-row-height-row,calc(var(--text-base,14px)*1.5+var(--spacing)*2))] items-center px-[var(--ck-row-padding-cell-x,var(--ck-row-padding-x,calc(var(--spacing)*2)))]"
            : "min-h-10 px-3",
          density === "compact" && "items-center rounded-xl py-2.5",
          density === "default" && "items-start rounded-lg py-3"
        )}
        key={row.key}
      >
        {icon ??
          (density === "compact" ? null : (
            <div
              className={cn(
                "shrink-0 rounded-full bg-text/10",
                density === "sidebar" ? "size-4" : "size-5"
              )}
            />
          ))}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            density === "compact" && "gap-0",
            density === "sidebar" && "gap-1.5",
            density === "default" && "gap-2"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-3",
              density === "compact" && "h-6"
            )}
          >
            <div
              className={cn(
                "h-4 max-w-full rounded bg-text/10",
                row.titleWidth
              )}
            />
            {density === "default" ? (
              <div className="ms-auto h-3 w-12 shrink-0 rounded bg-text/10" />
            ) : null}
          </div>
          {density === "sidebar" ? null : (
            <div
              className={cn(
                "flex items-center",
                density === "compact" && "h-4"
              )}
            >
              <div
                className={cn(
                  "h-3 max-w-full rounded bg-text/10",
                  row.secondLineWidth
                )}
              />
            </div>
          )}
        </div>
      </div>
    )
  );

  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The loading wrapper is a div with role=status.
    <div role="status">
      <span className="sr-only">{loadingLabel}</span>
      {density === "sidebar" ? (
        <div
          className="group/nav-list flex flex-col gap-px"
          data-appearance="plain"
        >
          {rows}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">{rows}</div>
      )}
    </div>
  );
};

export {
  SelectableListLoading,
  SelectableListRow,
  SelectableListRowGroup,
  SelectableListRowGroupItem,
  usePressable,
};

export type {
  SelectableListLoadingDensity,
  SelectableListLoadingProps,
  SelectableListRowProps,
  SelectableRowDensity,
  SelectableRowSurface,
  SelectableRowTone,
};
