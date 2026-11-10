"use client";

/* oxlint-disable typescript/strict-boolean-expressions -- The tile shows its icon, actions and description slots when the value is truthy (0, "" and false render nothing). */

/* oxlint-disable anti-slop/no-runtime-typeof -- The tile link destination is a string or path parts, the platform link component is "a" or a component, and a badge is a string or a node, router `Link`). */

import {
  ArrowUp16Icon,
  Terms20Icon,
} from "@workspace/react/components/card/icons";
import { useLinkComponent } from "@workspace/react/components/platform-provider";
import { Button } from "@workspace/react/components/ui/button";
import type {
  ButtonLinkPath,
  ButtonProps,
} from "@workspace/react/components/ui/button";
import {
  TooltipHint,
  useTooltipDelay,
} from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { usePathname } from "next/navigation";
import { createElement, useId } from "react";
import type {
  ComponentProps,
  ComponentType,
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
} from "react";

import styles from "./card.module.css";

// Utility names follow the host stylesheet: text-default is
// --color-text (text-text here), text-secondary is --color-text-muted,
// text-info is --color-text-notice, text-description is
// --color-description, border-default is --color-border, border-subtle is
// --color-stroke-subtle, border-primary-outline is --color-stroke-primary-outline
//, hover:bg-primary-transparent-hover is
// --ck-palette-surface-button-secondary-hover, and bg-primary-soft-alpha is
// --ck-palette-surface-elevated-secondary in the window theme.
// cursor-interaction is --ck-action-cursor, `default` on the Electron window.

/* ------------------------------------------------------------------ */
/* Card tile                     */
/* ------------------------------------------------------------------ */

type CardTilePresentation =
  | "card"
  | "catalog"
  | "compact-row"
  | "directory-row"
  | "featured"
  | "ranked"
  | "related"
  | "row";

type CardTileDescriptionPlacement = "inline" | "stacked";

type CardTileActionsPlacement = "center" | "top";

type CardTileIconPlacement = "inline" | "outside";

type CardTileIconContainerVariant = "filled" | "outline";

type CardTileLinkTarget = ButtonLinkPath | string;

type CardTileClickHandler = (event: MouseEvent<HTMLElement>) => void;

interface CardTileProps {
  actions?: ReactNode;
  actionsPlacement?: CardTileActionsPlacement;
  /** Strings render as outline pills; other nodes render as they are. */
  badges?: readonly ReactNode[];
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  descriptionPlacement?: CardTileDescriptionPlacement;
  disabled?: boolean;
  icon?: ReactNode;
  iconContainer?: boolean;
  iconContainerVariant?: CardTileIconContainerVariant;
  iconPlacement?: CardTileIconPlacement;
  isHighlighted?: boolean;
  onClick?: CardTileClickHandler;
  presentation?: CardTilePresentation;
  ref?: Ref<HTMLDivElement>;
  title?: ReactNode;
  tooltip?: ReactNode;
  /** Destination of the full-bleed link, given as a path or as its parts. */
  to?: CardTileLinkTarget;
  trailing?: ReactNode;
}

// `--ck-row-height-row` is `--ck-row-height-nav-row` resolved at :root, which is
// text-base 14px * 1.5 + padding-row-y 1 spacing step * 2 = 29px in the Electron
// theme. `--ck-row-padding-x` is 2 spacing steps,
// `--ck-row-padding-y` is 1.25 steps under the window body and
// `--radius-token-row` is 9999px at :root. The fallbacks are those
// values; an ancestor can still redefine each token.
const ROW_HEIGHT =
  "min-h-[var(--ck-row-height-row,calc(var(--text-base,14px)*1.5+var(--spacing)*2))]";

const ROW_PADDING =
  "px-[var(--ck-row-padding-x,calc(var(--spacing)*2))] py-[var(--ck-row-padding-y,calc(var(--spacing)*1.25))]";

const ROW_RADIUS = "rounded-[var(--radius-token-row,9999px)]";

const presentationClasses = {
  card: "rounded-2xl border border-border/40 p-2 hover:bg-text/5",
  catalog:
    "h-full min-h-40 rounded-2xl border border-border p-5 hover:bg-fill-primary-transparent-hover",
  "compact-row": "min-h-14 w-full min-w-0 justify-center",
  "directory-row": "rounded-2xl",
  featured:
    "h-full rounded-xl bg-panel-secondary px-7 py-8 hover:bg-fill-primary-transparent-hover",
  ranked:
    "min-h-24 rounded-xl px-3 py-4 hover:bg-fill-primary-transparent-hover",
  related:
    "min-h-24 rounded-xl bg-panel px-3 py-4 hover:bg-fill-primary-transparent-hover",
  row: ROW_RADIUS,
} as const satisfies Record<CardTilePresentation, string>;

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:ring-inset";

const SUGGESTION_DESCRIPTION_SIZE = "text-[13px] leading-[18px]";

// The router's parsePath: "#hash" and "?search" split off the end of the
// string, the rest is the pathname.
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

// The router's resolveTo and createPath: an omitted pathname resolves to the
// current one, then pathname, search with a leading "?" and hash with a
// leading "#".
const destinationPath = (to: CardTileLinkTarget, currentPathname: string) => {
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

/**
 * The full-bleed anchor over a tile (the router `Link`). It goes through
 * the platform link component with `prefetch` off, the router default, and
 * calls `onClick` first so a handler can cancel the navigation.
 */
const CardTileLink = ({
  "aria-labelledby": ariaLabelledBy,
  className,
  onClick,
  to,
}: {
  "aria-labelledby": string;
  className: string;
  onClick?: CardTileClickHandler;
  to: CardTileLinkTarget;
}) => {
  const LinkComponent = useLinkComponent();
  const currentPathname = usePathname() ?? "/";

  const anchorProps: ComponentProps<"a"> = {
    "aria-labelledby": ariaLabelledBy,
    className,
    href: destinationPath(to, currentPathname),
    onAuxClick: (event) => {
      if (event.button === 1) {
        onClick?.(event);
      }
    },
    onClick,
  };

  if (typeof LinkComponent === "string") {
    return createElement("a", anchorProps);
  }

  // SAFETY: the platform link component is an anchor-like component, and
  // `prefetch` is the Next.js Link prop every such component in this library
  // forwards. ComponentType<PlatformLinkProps> only lacks it in its declared
  // props.
  return createElement(LinkComponent as ComponentType<RouterLinkProps>, {
    ...anchorProps,
    prefetch: false,
  });
};

/**
 * The string badge of a tile ( with variant `outline`, not the
 * library Badge): `rounded-sm border border-default bg-transparent px-2 py-1
 * text-xs leading-none font-medium text-secondary`.
 */
const CardTileBadge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-sm border border-border bg-transparent px-2 py-1 text-xs leading-none font-medium text-text-muted">
    {children}
  </span>
);

const renderBadge = (badge: ReactNode, index: number) =>
  typeof badge === "string" ? (
    <CardTileBadge key={badge}>{badge}</CardTileBadge>
  ) : (
    // The component keys non-string badges by position.
    // oxlint-disable-next-line react/no-array-index-key
    <span className="flex items-center" key={index}>
      {badge}
    </span>
  );

interface CardTileSurfaceProps extends Omit<ComponentProps<"div">, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

// A tile without a click handler is a plain div with `tabIndex={-1}`. With one
// (or while disabled) it is `role="button"` in the tab order; a disabled tile
// keeps the role and `aria-disabled` and drops both handlers.
const CardTileSurface = ({
  disabled,
  onClick,
  onKeyDown,
  tooltip,
  ...props
}: CardTileSurfaceProps & {
  disabled: boolean;
  tooltip?: ReactNode;
}) => {
  const tooltipDelay = useTooltipDelay(150);

  const element =
    onClick === undefined && !disabled ? (
      <div {...props} tabIndex={-1} />
    ) : (
      <div
        {...props}
        aria-disabled={disabled || undefined}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a div with role="button" because the tile holds buttons and links.
        role="button"
        tabIndex={0}
        onClick={disabled ? undefined : onClick}
        onKeyDown={disabled ? undefined : onKeyDown}
      />
    );

  return tooltip === undefined || tooltip === null ? (
    element
  ) : (
    <TooltipHint content={tooltip} delayDuration={tooltipDelay}>
      {element}
    </TooltipHint>
  );
};

const isPresent = <T,>(value: T | null | undefined): value is T =>
  value !== undefined && value !== null;

const tileClassName = ({
  className,
  hasLink,
  isHighlighted,
  isRow,
  onClick,
  presentation,
}: {
  className?: string;
  hasLink: boolean;
  isHighlighted: boolean;
  isRow: boolean;
  onClick?: CardTileClickHandler;
  presentation: CardTilePresentation;
}) =>
  cn(
    "flex flex-col gap-2.5",
    hasLink && "relative",
    presentationClasses[presentation],
    isRow && [ROW_HEIGHT, "w-full min-w-0 justify-center", ROW_PADDING],
    isRow && onClick && "hover:bg-fill-primary-transparent-hover",
    isHighlighted && "bg-text/5",
    onClick ? "cursor-(--ck-action-cursor)" : null,
    onClick && FOCUS_RING,
    className
  );

const TileIcon = ({
  container,
  icon,
  isCompact,
  isRow,
  variant,
}: {
  container: boolean;
  icon: ReactNode;
  isCompact: boolean;
  isRow: boolean;
  variant: CardTileIconContainerVariant;
}) => {
  if (!icon) {
    return null;
  }

  if (!container) {
    return <span className="shrink-0">{icon}</span>;
  }

  let size = "size-10 rounded-lg";

  if (isCompact) {
    size = "size-13 rounded-2xl";
  } else if (isRow) {
    size = "size-9 rounded-lg";
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        size,
        variant === "outline"
          ? "border border-border bg-transparent"
          : "bg-panel-secondary"
      )}
    >
      {isCompact ? (
        <span className="flex size-8 items-center justify-center">{icon}</span>
      ) : (
        icon
      )}
    </span>
  );
};

const TileActions = ({
  actions,
  hasLink,
  isCompact,
}: {
  actions: ReactNode;
  hasLink: boolean;
  isCompact: boolean;
}) =>
  actions ? (
    <div
      className={cn(
        "flex shrink-0 items-center",
        isCompact && "max-w-1/2",
        hasLink && "pointer-events-auto relative z-10"
      )}
    >
      {actions}
    </div>
  ) : null;

const TileBadges = ({
  badges,
  hasLink,
}: {
  badges?: readonly ReactNode[];
  hasLink: boolean;
}) =>
  badges !== undefined && badges.length > 0 ? (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1",
        hasLink && "pointer-events-auto relative z-10"
      )}
    >
      {badges.map(renderBadge)}
    </div>
  ) : null;

const TileTitle = ({
  children,
  id,
  isCompact,
  isRow,
  presentation,
}: {
  children: ReactNode;
  id: string;
  isCompact: boolean;
  isRow: boolean;
  presentation: CardTilePresentation;
}) => (
  <div
    className={cn(
      "text-text",
      isCompact ? "min-w-0 text-lg leading-6 wrap-break-word" : "truncate",
      isRow
        ? "text-[length:var(--ck-detail-row-font-size,var(--text-base))]"
        : "font-medium",
      presentation === "catalog" && "text-base font-semibold"
    )}
    id={id}
  >
    {children}
  </div>
);

const TileDescription = ({
  children,
  className,
  inline,
  isCompact,
}: {
  children: ReactNode;
  className?: string;
  inline: boolean;
  isCompact: boolean;
}) =>
  children ? (
    <div
      className={cn(
        "text-text-muted",
        isCompact
          ? ["truncate", SUGGESTION_DESCRIPTION_SIZE]
          : "text-sm leading-relaxed",
        inline && "min-w-0 flex-1 truncate text-start",
        className ?? (!isCompact && "line-clamp-3")
      )}
    >
      {children}
    </div>
  ) : null;

interface TileLayoutProps extends Pick<
  CardTileProps,
  | "actions"
  | "badges"
  | "contentClassName"
  | "description"
  | "descriptionClassName"
  | "icon"
  | "iconContainer"
  | "iconContainerVariant"
  | "title"
  | "trailing"
> {
  actionsPlacement: CardTileActionsPlacement;
  descriptionPlacement: CardTileDescriptionPlacement;
  hasLink: boolean;
  iconPlacement: CardTileIconPlacement;
  presentation: CardTilePresentation;
  titleId: string;
}

// The title row (icon, title, badges, actions) above the description.
const TileTextBlock = ({
  actions,
  badges,
  centeredActions,
  contentClassName,
  description,
  descriptionClassName,
  descriptionPlacement,
  hasLink,
  iconNode,
  iconPlacement,
  presentation,
  title,
  titleId,
}: TileLayoutProps & { centeredActions: boolean; iconNode: ReactNode }) => {
  const isCompact = presentation === "compact-row";
  const isRow = presentation === "row" || presentation === "directory-row";
  const inlineDescription = descriptionPlacement === "inline";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 justify-center gap-0.5",
        inlineDescription ? "items-center gap-3" : "flex-col",
        contentClassName
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          inlineDescription && "w-28 shrink-0 sm:w-48",
          centeredActions || iconPlacement === "inline"
            ? null
            : "justify-between"
        )}
      >
        {iconPlacement === "inline" ? iconNode : null}
        <div className="flex min-w-0 items-center gap-2">
          <TileTitle
            id={titleId}
            isCompact={isCompact}
            isRow={isRow}
            presentation={presentation}
          >
            {title}
          </TileTitle>
          <TileBadges badges={badges} hasLink={hasLink} />
        </div>
        {centeredActions ? null : (
          <TileActions
            actions={actions}
            hasLink={hasLink}
            isCompact={isCompact}
          />
        )}
      </div>
      <TileDescription
        className={descriptionClassName}
        inline={inlineDescription}
        isCompact={isCompact}
      >
        {description}
      </TileDescription>
    </div>
  );
};

// The row inside the tile: outside icon, text block with centred actions, and
// the trailing slot.
const TileRow = (props: TileLayoutProps) => {
  const {
    actions,
    actionsPlacement,
    descriptionPlacement,
    hasLink,
    icon,
    iconContainer,
    iconContainerVariant,
    iconPlacement,
    presentation,
    trailing,
  } = props;

  const isCompact = presentation === "compact-row";
  const isRow = presentation === "row" || presentation === "directory-row";

  const centeredActions =
    (isCompact || actionsPlacement === "center") && Boolean(actions);

  const iconNode = (
    <TileIcon
      container={iconContainer ?? true}
      icon={icon}
      isCompact={isCompact}
      isRow={isRow}
      variant={iconContainerVariant ?? "filled"}
    />
  );

  return (
    <div
      className={cn(
        "flex",
        isCompact ? "gap-4" : "gap-3",
        hasLink && "pointer-events-none",
        presentation === "catalog" ? "items-start" : "items-center",
        descriptionPlacement === "inline" && "gap-2"
      )}
    >
      {iconPlacement === "outside" ? iconNode : null}
      <div
        className={cn(
          "flex min-w-0 flex-1",
          centeredActions && ["items-center", isCompact ? "gap-4" : "gap-3"]
        )}
      >
        <TileTextBlock
          {...props}
          centeredActions={centeredActions}
          iconNode={iconNode}
        />
        {centeredActions ? (
          <TileActions
            actions={actions}
            hasLink={hasLink}
            isCompact={isCompact}
          />
        ) : null}
      </div>
      {trailing}
    </div>
  );
};

/**
 * Tile with icon, title, description, badges, actions and trailing slots. It becomes a button when `onClick` is set and a full-bleed link when
 * `to` is set; the link then sits under the actions and badges.
 */
const CardTile = ({
  className,
  disabled = false,
  isHighlighted = false,
  onClick,
  presentation = "card",
  ref,
  tooltip,
  to,
  actionsPlacement = "top",
  descriptionPlacement = "stacked",
  iconPlacement = "outside",
  ...slots
}: CardTileProps) => {
  const titleId = useId();
  const hasLink = isPresent(to);
  const isRow = presentation === "row" || presentation === "directory-row";

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      onClick &&
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <CardTileSurface
      className={tileClassName({
        className,
        hasLink,
        isHighlighted,
        isRow,
        onClick,
        presentation,
      })}
      data-ck-search-result-active={isHighlighted ? "true" : undefined}
      disabled={!hasLink && disabled}
      ref={ref}
      tooltip={tooltip}
      onClick={hasLink ? undefined : onClick}
      onKeyDown={hasLink ? undefined : handleKeyDown}
    >
      {hasLink && !disabled ? (
        <CardTileLink
          aria-labelledby={titleId}
          className={cn(
            "absolute inset-0 cursor-(--ck-action-cursor) rounded-[inherit]",
            FOCUS_RING
          )}
          to={to}
          onClick={onClick}
        />
      ) : null}
      <TileRow
        {...slots}
        actionsPlacement={actionsPlacement}
        descriptionPlacement={descriptionPlacement}
        hasLink={hasLink}
        iconPlacement={iconPlacement}
        presentation={presentation}
        titleId={titleId}
      />
    </CardTileSurface>
  );
};

/* ------------------------------------------------------------------ */
/* Suggestion card         */
/* ------------------------------------------------------------------ */

type SuggestionCardVariant = "compact" | "illustrated";

interface SuggestionCardProps {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  /** The shortcut text, shown as written. */
  keyboardShortcut?: string;
  label?: ReactNode;
  onClick?: ComponentProps<"button">["onClick"];
  tooltipContent?: ReactNode;
  variant?: SuggestionCardVariant;
}

// The max width of the card tooltip (`tooltipMaxWidth`).
const SUGGESTION_TOOLTIP_MAX_WIDTH =
  "min(24rem, var(--radix-tooltip-content-available-width), calc(100vw - 16px))";

const suggestionVariantClasses = {
  compact:
    "h-full min-h-26 rounded-2xl bg-panel px-4 py-3 hover:bg-fill-primary-transparent-hover",
  illustrated:
    "h-37.5 gap-4 rounded-3xl bg-(--ck-palette-surface-card,var(--ck-palette-surface-surface)) px-5 py-4 hover:bg-fill-primary-transparent-hover",
} as const satisfies Record<SuggestionCardVariant, string>;

/**
 * The shortcut hint of a suggestion card: the `default` keyboard-shortcut
 * variant, a `kbd` whose text is the label as given.
 */
const SuggestionShortcut = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex rounded-md! border-0! bg-current/10! px-1.5 py-0.5 font-sans! text-xs! leading-none text-current! shadow-none!">
    {children}
  </kbd>
);

/**
 * Button card with an icon, a label and a description. Label and
 * description name the button; `description` is wired only when given.
 */
const SuggestionCard = ({
  description,
  disabled,
  icon,
  keyboardShortcut,
  label,
  onClick,
  tooltipContent,
  variant = "compact",
}: SuggestionCardProps) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const labelId = `${id}-label`;
  const illustrated = variant === "illustrated";
  const hasDescription = description !== undefined && description !== null;

  return (
    <TooltipHint
      content={tooltipContent}
      maxWidth={SUGGESTION_TOOLTIP_MAX_WIDTH}
    >
      <button
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-labelledby={labelId}
        className={cn(
          // The card has border border-primary-outline, and the electron:
          // variant swaps it for border-0 with a
          // 0.5px ring-stroke-strong on the Electron window.
          "flex w-full min-w-0 cursor-(--ck-action-cursor) flex-col border-0 text-start shadow-(--shadow-md) ring-[0.5px] ring-stroke-strong outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50",
          suggestionVariantClasses[variant]
        )}
        disabled={disabled}
        type="button"
        onClick={onClick}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span
            className={cn(
              "flex shrink-0 items-center justify-start text-text-notice [&>svg]:size-[18px]",
              illustrated ? "size-10" : "size-6"
            )}
          >
            {icon}
          </span>
          {keyboardShortcut !== undefined && keyboardShortcut !== "" ? (
            <span className="shrink-0 text-text-muted">
              <SuggestionShortcut>{keyboardShortcut}</SuggestionShortcut>
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "flex w-full flex-col",
            illustrated ? "min-h-0" : "mt-auto min-h-10 justify-end"
          )}
        >
          <span
            className={cn(
              "leading-5 font-medium text-text",
              illustrated ? "line-clamp-1 text-[14px]" : "text-sm"
            )}
            id={labelId}
          >
            {label}
          </span>
          {hasDescription ? (
            <span
              className={cn(
                "mt-1 line-clamp-2 text-text-muted",
                illustrated
                  ? [SUGGESTION_DESCRIPTION_SIZE, "font-normal"]
                  : "text-xs leading-4"
              )}
              id={descriptionId}
            >
              {description}
            </span>
          ) : null}
        </span>
      </button>
    </TooltipHint>
  );
};

/* ------------------------------------------------------------------ */
/* Writing block surface       */
/* ------------------------------------------------------------------ */

// The surface tokens, each with the
// fallback chain resolved to the Electron theme tokens it ends in
//, so a `--ck-document-custom-*` override
// on an ancestor still wins.
const writingBlockTheme = [
  "[--ck-document-spacing:var(--spacing,0.25rem)]",
  "[--ck-document-text-primary:var(--ck-document-custom-text-primary,var(--ck-palette-ink))]",
  "[--ck-document-text-secondary:var(--ck-document-custom-text-secondary,color-mix(in_srgb,var(--ck-palette-ink)_65%,transparent))]",
  "[--ck-document-text-tertiary:var(--ck-document-custom-text-tertiary,var(--ck-palette-ink-tertiary))]",
  "[--ck-document-surface-primary:var(--ck-document-custom-surface-primary,var(--ck-palette-surface-surface))]",
  "[--ck-document-surface-secondary:var(--ck-document-custom-surface-secondary,color-mix(in_srgb,var(--ck-palette-surface-surface-under)_85%,transparent))]",
  "[--ck-document-interactive-secondary-hover:var(--ck-document-custom-interactive-secondary-hover,var(--ck-palette-surface-button-secondary-hover))]",
  "[--ck-document-border:var(--ck-document-custom-border,var(--ck-palette-border))]",
  "[--ck-document-border-hover:var(--ck-document-custom-border-hover,var(--ck-palette-border))]",
  "[--ck-document-divider:var(--ck-document-custom-divider,var(--ck-palette-border-light))]",
  "[--ck-document-focus:var(--ck-document-custom-focus,var(--color-ring))]",
  "[--ck-document-control-border:var(--ck-document-custom-control-border,var(--ck-interactive-border-focus,var(--ck-document-focus)))]",
  "[--ck-document-entity-accent:var(--ck-document-custom-entity-accent,var(--ck-entity-accent,var(--ck-document-accent)))]",
  "[--ck-document-accent:var(--ck-document-custom-accent,var(--ck-interactive-label-accent-default,var(--color-status-info-fill)))]",
  "[--ck-document-on-accent:var(--ck-document-custom-on-accent,var(--bg-primary,var(--ck-palette-surface-surface)))]",
  "[--ck-document-interactive-background:var(--ck-document-custom-interactive-background,var(--ck-interactive-bg-accent-default,color-mix(in_srgb,#0091ff_12%,transparent)))]",
  "[--ck-document-selection:var(--ck-document-custom-selection,color-mix(in_srgb,var(--ck-palette-label-accent)_30%,transparent))]",
  "[--ck-document-radius:var(--ck-document-custom-radius,1.5rem)]",
  "[--ck-document-radius-sm:var(--ck-document-custom-radius-sm,0.5rem)]",
  "[--ck-document-shadow:var(--ck-document-custom-shadow,0_4px_80px_rgb(0_0_0/2%))]",
  "[--ck-document-shadow-lg:var(--ck-document-custom-shadow-lg,0_10px_30px_rgb(0_0_0/12%))]",
  "[--ck-document-font-sans:var(--ck-document-custom-font-sans,var(--font-sans,sans-serif))]",
  "[--ck-document-font-mono:var(--ck-document-custom-font-mono,var(--font-mono,monospace))]",
  "[--ck-document-font-size:var(--ck-document-custom-font-size,0.875rem)]",
  "[--ck-document-shimmer-dark-contrast:var(--ck-document-custom-shimmer-dark-contrast,var(--ck-document-text-tertiary))]",
  "[--ck-document-shimmer-dark-secondary:var(--ck-document-custom-shimmer-dark-secondary,var(--ck-document-text-tertiary))]",
];

// The overrides that the DocumentCard surface adds: the surface
// colour mixes the elevated and base surfaces 86 to 14. The editor controls
// (`_editorControls`) live in card.module.css.
const writingBlockOverrides =
  "[--ck-document-custom-surface-primary:color-mix(in_srgb,var(--theme-background-control-opaque,var(--ck-palette-surface-surface))_86%,var(--ck-palette-surface-surface))] [--ck-document-custom-accent:var(--ck-palette-label-accent)] [--ck-document-custom-interactive-background:var(--ck-palette-surface-button-secondary-hover)] [--ck-document-custom-on-accent:var(--ck-palette-label-on-accent,var(--ck-palette-label-button-primary))] [--ck-document-custom-font-size:var(--ui-message-text-size,0.875rem)]";

interface WritingBlockSurfaceProps extends Omit<ComponentProps<"div">, "ref"> {
  backgroundProps?: ComponentProps<"div">;
  backgroundStyle?: CSSProperties;
  borderProps?: ComponentProps<"div">;
  borderStyle?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The surface a DocumentCard sits on with the editor overrides: a clipped
 * rounded panel with a background layer, a content layer and a 1px inset
 * border layer on top.
 */
const WritingBlockSurface = ({
  backgroundProps,
  backgroundStyle,
  borderProps,
  borderStyle,
  children,
  className,
  ref,
  ...props
}: WritingBlockSurfaceProps) => (
  <div
    className={cn(
      "group/writing-block-surface relative isolate w-full min-w-0 overflow-clip rounded-[var(--ck-document-radius)] [font-family:var(--ck-document-font-sans)] [color:var(--ck-document-text-primary)] [box-shadow:var(--ck-document-shadow)] [contain:inline-size]",
      writingBlockTheme,
      styles.editorControls,
      writingBlockOverrides,
      className
    )}
    data-document-surface=""
    ref={ref}
    {...props}
  >
    <div
      {...backgroundProps}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[-1] rounded-[inherit] [background:var(--ck-document-surface-primary)]",
        backgroundProps?.className
      )}
      // oxlint-disable-next-line shadcn/no-inline-styles -- the component merges the backgroundProps style with backgroundStyle.
      style={{ ...backgroundProps?.style, ...backgroundStyle }}
    />
    <div className="relative z-[1]">{children}</div>
    <div
      {...borderProps}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] rounded-[inherit] [box-shadow:inset_0_0_0_1px_var(--ck-document-border)] group-hover/writing-block-surface:[box-shadow:inset_0_0_0_1px_var(--ck-document-border-hover)]",
        borderProps?.className
      )}
      // oxlint-disable-next-line shadcn/no-inline-styles -- the component merges the borderProps style with borderStyle.
      style={{ ...borderProps?.style, ...borderStyle }}
    />
  </div>
);

/* ------------------------------------------------------------------ */
/* Document card            */
/* ------------------------------------------------------------------ */

interface DocumentCardProps {
  actions?: ReactNode;
  children?: ReactNode;
  /** Defaults to the terms icon in the accent colour. */
  icon?: ReactNode;
  title?: ReactNode;
}

/** Header row with an icon box, a title and actions, above the card content. */
const DocumentCard = ({
  actions,
  children,
  icon,
  title,
}: DocumentCardProps) => (
  <WritingBlockSurface className="my-4">
    <div className="flex min-w-0 items-center gap-3 p-4 select-none">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-panel-secondary/92">
        {icon ?? <Terms20Icon className="text-text-notice" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-base leading-6 font-medium text-text">
        {title}
      </span>
      {actions}
    </div>
    {children}
  </WritingBlockSurface>
);

/* ------------------------------------------------------------------ */
/* Content reference card and status indicator                          */
/* ------------------------------------------------------------------ */

interface ContentReferenceCardProps {
  children?: ReactNode;
  title?: ReactNode;
}

/** Bordered reference box with an optional title. */
const ContentReferenceCard = ({
  children,
  title,
}: ContentReferenceCardProps) => (
  <div
    className="my-3 max-w-[40rem] rounded-lg border border-stroke-subtle bg-panel-secondary/92 p-3 text-sm text-text"
    data-testid="content-reference-card"
  >
    {title === undefined || title === null ? null : (
      <div className="mb-2 font-semibold text-text">{title}</div>
    )}
    {children}
  </div>
);

interface CardStatusIndicatorProps {
  ariaLabel?: string;
  icon?: ReactNode;
}

/** A 28px status icon with a text alternative. */
const CardStatusIndicator = ({ ariaLabel, icon }: CardStatusIndicatorProps) => (
  <span
    aria-label={ariaLabel}
    className="flex h-7 w-7 items-center justify-center rounded-md text-text-subtle"
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a span with role="img" around any icon node.
    role="img"
  >
    {icon}
  </span>
);

/* ------------------------------------------------------------------ */
/* Comment card and comment composer             */
/* ------------------------------------------------------------------ */

type CommentCardSurfaceVariant = "default" | "inline";

type CommentCardHeaderLayout = "truncate" | "wrap";

interface CommentCardProps {
  authorAvatar?: ReactNode;
  authorLabel?: ReactNode;
  body?: ReactNode;
  className?: string;
  footer?: ReactNode;
  headerAccessory?: ReactNode;
  headerLayout?: CommentCardHeaderLayout;
  headerSuffix?: ReactNode;
  onHeaderClick?: ComponentProps<"div">["onClick"];
  onPointerDownCapture?: ComponentProps<"div">["onPointerDownCapture"];
  surfaceVariant?: CommentCardSurfaceVariant;
}

/**
 * Comment with a header (avatar, author, accessory), an optional body and an
 * optional footer. The `default` surface has a border and the soft
 * background; `inline` has neither.
 */
const CommentCard = ({
  authorAvatar,
  authorLabel,
  body,
  className,
  footer,
  headerAccessory,
  headerLayout = "wrap",
  headerSuffix,
  onHeaderClick,
  onPointerDownCapture,
  surfaceVariant = "default",
}: CommentCardProps) => {
  const hasBody = body !== undefined && body !== null;

  return (
    <div
      className={cn(
        "group/comment overflow-hidden rounded-lg",
        surfaceVariant !== "inline" && "border border-border",
        surfaceVariant === "default" &&
          "bg-(--ck-palette-surface-elevated-secondary)",
        className
      )}
      onPointerDownCapture={onPointerDownCapture}
    >
      {/* The header only forwards pointer clicks; the component gives it
          role="presentation". */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 pt-2 select-none",
          headerLayout === "wrap" && "flex-wrap",
          hasBody || (headerSuffix !== undefined && headerSuffix !== null)
            ? "pb-0.5"
            : "pb-2",
          onHeaderClick && "cursor-(--ck-action-cursor)"
        )}
        role="presentation"
        onClick={onHeaderClick}
      >
        <div
          className={cn(
            "flex min-h-6 min-w-0 items-center gap-2.5",
            headerLayout === "truncate" && "flex-1"
          )}
        >
          {authorAvatar}
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex min-w-0 items-center truncate text-xs leading-4 text-text-subtle">
              {authorLabel}
            </span>
          </div>
        </div>
        {headerAccessory}
      </div>
      {headerSuffix}
      {hasBody ? body : null}
      {footer === undefined || footer === null ? null : (
        <div className="flex items-center justify-end px-3 py-2 text-sm leading-5 text-text-subtle has-[[data-ck-composer-surface-variant=inline]]:mt-2 has-[[data-ck-composer-surface-variant=inline]]:border-t has-[[data-ck-composer-surface-variant=inline]]:border-border">
          {footer}
        </div>
      )}
    </div>
  );
};

// `--ck-compose-button-spacing-sm` is 7 spacing steps under the Electron
// window body.
const COMPOSER_SM_SIZE =
  "size-(--ck-compose-button-spacing-sm,calc(var(--spacing)*7))";

const COMPOSER_SM_MIN_HEIGHT =
  "min-h-(--ck-compose-button-spacing-sm,calc(var(--spacing)*7))";

type SubmitButtonProps = Omit<ButtonProps, "radius" | "uniform">;

/**
 * The round submit button of a comment composer: a
 * composerSm Button with `radius="full"`, `uniform`, `type="submit"` and the
 * arrow-up icon unless it has children or is loading.
 */
const SubmitButton = ({
  children,
  loading,
  size = "composerSm",
  type = "submit",
  ...props
}: SubmitButtonProps) => (
  <Button
    {...props}
    loading={loading}
    radius="full"
    size={size}
    type={type}
    uniform
  >
    {loading === true ? null : (children ?? <ArrowUp16Icon />)}
  </Button>
);

type CommentComposerLayout = "card" | "inline";

interface CommentComposerProps {
  authorAvatar?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
  layout?: CommentComposerLayout;
  loading?: boolean;
  onSubmit?: ButtonProps["onClick"];
  showSubmit?: boolean;
  submitLabel?: string;
  submitType?: ButtonProps["type"];
}

/**
 * Comment composer row: an inline row with an optional avatar, the
 * content and a submit button, or the `card` layout with the content above
 * the button. Without `showSubmit` an empty slot keeps the layout stable.
 */
const CommentComposer = ({
  authorAvatar,
  children,
  disabled,
  layout = "inline",
  loading = false,
  onSubmit,
  showSubmit = true,
  submitLabel,
  submitType,
}: CommentComposerProps) => {
  const action = showSubmit ? (
    <SubmitButton
      aria-label={submitLabel}
      className="self-end"
      disabled={disabled}
      loading={loading}
      type={submitType}
      onClick={onSubmit}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn("shrink-0 self-end", COMPOSER_SM_SIZE)}
    />
  );

  if (layout === "card") {
    return (
      <div className="px-3 pt-1 pb-2 text-sm leading-5">
        <div className="flex min-w-0 items-start gap-2">
          <div
            className={cn(
              "min-w-0 flex-1 break-words whitespace-pre-wrap",
              COMPOSER_SM_MIN_HEIGHT
            )}
          >
            {children}
          </div>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-2.5 px-3 pt-2 pb-3">
      {authorAvatar === undefined || authorAvatar === null ? null : (
        <div className="flex h-7 shrink-0 items-center">{authorAvatar}</div>
      )}
      <div className="min-w-0 flex-1 self-center">{children}</div>
      {action}
    </div>
  );
};

export {
  CardStatusIndicator,
  CardTile,
  CommentCard,
  CommentComposer,
  ContentReferenceCard,
  DocumentCard,
  SubmitButton,
  SuggestionCard,
  WritingBlockSurface,
};

export type {
  CardStatusIndicatorProps,
  CardTileActionsPlacement,
  CardTileDescriptionPlacement,
  CardTileIconContainerVariant,
  CardTileIconPlacement,
  CardTileLinkTarget,
  CardTilePresentation,
  CardTileProps,
  CommentCardHeaderLayout,
  CommentCardProps,
  CommentCardSurfaceVariant,
  CommentComposerLayout,
  CommentComposerProps,
  ContentReferenceCardProps,
  DocumentCardProps,
  SubmitButtonProps,
  SuggestionCardProps,
  SuggestionCardVariant,
  WritingBlockSurfaceProps,
};
