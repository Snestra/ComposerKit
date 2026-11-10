"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-arbitrary-values -- The component styles plain <button> elements itself; they are the library Button in `unstyled` mode and take the measured sizes, radii and token expressions through className, which no Button variant or theme token carries. */

/* oxlint-disable eslint/complexity -- ExpandableList keeps one branch per case. */

/* oxlint-disable anti-slop/no-runtime-typeof -- The link destination is a string or path parts and the platform link component is "a" or a component). */

import { AppLink } from "composerkit/components/list/app-link";
import type { AppLinkProps } from "composerkit/components/list/app-link";
import {
  ChevronDown16Icon,
  ChevronRight16Icon,
  ChevronUp16Icon,
  CircleGrid2x16Icon,
  ItemChevronIcon,
} from "composerkit/components/list/icons";
import { MarqueeText } from "composerkit/components/list/marquee-text";
import { useLinkComponent } from "composerkit/components/platform-provider";
import { Button, Spinner } from "composerkit/components/ui/button";
import type {
  ButtonColor,
  ButtonLinkPath,
  ButtonProps,
} from "composerkit/components/ui/button";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useId, useMemo, useState } from "react";
import type {
  ComponentProps,
  ComponentType,
  MouseEvent,
  ReactNode,
  Ref,
} from "react";

/*
 * Summary list items and the expandable list.
 *
 * Utility names follow the host stylesheet: text-default is
 * text-text here, text-secondary and text-tertiary are text-text-muted and
 * text-text-subtle, border-default is border-border, primary-transparent-hover is
 * background-primary-transparent-hover and cursor-(--ck-action-cursor) is --cursor-(--ck-action-cursor).
 * `--ck-compose-button-spacing` is 7 spacing steps and
 * `--ck-compose-button-spacing-gap` one step; icon-sm is
 * 18px and icon-xs is --ck-control-icon-size-xs, .875rem.
 * text-chart-red is --ck-palette-accent-red, red-500 in light and red-300 in
 * dark. The `browser:` variants only match the browser window type and never
 * apply to the Electron theme, so they are left out.
 */

// The `text-dynamic-isle-row` utility is 14px with line height 20/14
//; the literal classes below carry it.

const CHART_RED = "text-(color:--list-chart-red)";

const CHART_RED_VAR = "[--list-chart-red:var(--color-status-danger)]";

// `.text-fade-truncate`: the end fades out instead
// of showing an ellipsis, mirrored for right-to-left languages.
const TEXT_FADE_TRUNCATE =
  "block w-full min-w-0 overflow-hidden whitespace-nowrap [text-overflow:clip] [mask-image:linear-gradient(to_right,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)] [&:is(:lang(ae),:lang(ar),:lang(arc),:lang(bcc),:lang(bqi),:lang(ckb),:lang(dv),:lang(fa),:lang(glk),:lang(he),:lang(ku),:lang(mzn),:lang(nqo),:lang(pnb),:lang(ps),:lang(sd),:lang(ug),:lang(ur),:lang(yi))]:[mask-image:linear-gradient(to_left,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)]";

/* ------------------------------------------------------------------ */
/* Class constants                                                      */
/* ------------------------------------------------------------------ */

// G
const ITEM_BASE =
  "group group/summary-panel-item relative isolate flex min-h-[calc(var(--spacing)*7)] w-full min-w-0 items-center gap-(--spacing) rounded-sm border-0 bg-transparent px-0 py-1 text-start data-[multiline=true]:items-start group-data-[summary-row-density=comfortable]/summary-row-density:gap-2 group-data-[summary-panel-variant=dynamic-isle]/summary-panel:min-h-0 group-data-[summary-panel-variant=dynamic-isle]/summary-panel:text-[length:14px] group-data-[summary-panel-variant=dynamic-isle]/summary-panel:leading-[calc(20/14)] group-data-[variant=card]/summary-card:min-h-10 group-data-[variant=card]/summary-card:gap-3 group-data-[variant=card]/summary-card:rounded-none group-data-[variant=card]/summary-card:px-3 group-data-[variant=card]/summary-card:py-2 group-data-[variant=card]/summary-card:after:pointer-events-none group-data-[variant=card]/summary-card:after:absolute group-data-[variant=card]/summary-card:after:start-10 group-data-[variant=card]/summary-card:after:end-0 group-data-[variant=card]/summary-card:after:top-full group-data-[variant=card]/summary-card:after:h-px group-data-[variant=card]/summary-card:after:bg-border";

// K
const BACKGROUND_INTERACTION =
  "cursor-(--ck-action-cursor) before:absolute before:inset-y-0 before:-inset-x-2 before:-z-10 before:rounded-sm before:content-[''] hover:before:bg-fill-primary-transparent-hover group-data-[variant=card]/summary-card:before:inset-x-0 group-data-[variant=card]/summary-card:before:rounded-none";

// q
const INTERACTION = {
  background: BACKGROUND_INTERACTION,
  foreground: "cursor-(--ck-action-cursor) hover:text-text",
} as const;

// The library Button in `unstyled` mode keeps only behaviour, but still sets
// select-none and whitespace-nowrap; the plain <button> has neither.
const BUTTON_RESET = "select-auto whitespace-normal";

// J
const FOCUS_OUTLINE =
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-[-2px] focus-visible:outline-ring";

// Y
const ICON_BOX =
  "flex size-[18px] items-center justify-center [&_svg]:size-full";

// X
const TONES = {
  "conversation-summary": "text-text-subtle",
  critical: cn(CHART_RED, CHART_RED_VAR),
  default: "text-text",
  muted: "text-text-muted",
  tertiary: "text-text-subtle",
} as const;

type ListTone = keyof typeof TONES;

type ListLeadingVariant =
  | "custom"
  | "glyph"
  | "intrinsic"
  | "preview"
  | "status"
  | "thumbnail";

// Z
const LEADING_WIDTHS: Record<ListLeadingVariant, string | null> = {
  custom:
    "w-[18px] group-data-[summary-row-density=comfortable]/summary-row-density:w-4 group-data-[summary-panel-variant=dynamic-isle]/summary-panel:w-4",
  glyph:
    "w-[18px] group-data-[summary-row-density=comfortable]/summary-row-density:w-4",
  intrinsic: null,
  preview: "size-[18px] overflow-hidden rounded-sm",
  status:
    "w-[18px] group-data-[summary-row-density=comfortable]/summary-row-density:w-4 group-data-[summary-panel-variant=dynamic-isle]/summary-panel:w-4",
  thumbnail: null,
};

const LEADING_BOXES: Record<ListLeadingVariant, string | null> = {
  custom: null,
  glyph: "size-[18px] [&>*]:size-full [&_svg]:size-full",
  intrinsic: null,
  preview: null,
  status: "size-3.5 [&>*]:size-full [&_svg]:size-full",
  thumbnail:
    "relative size-12 overflow-hidden rounded-xl bg-panel-secondary text-text",
};

type ListMetaTone = "critical" | "default" | "muted";

const META_TONES: Record<ListMetaTone, string> = {
  critical: cn(CHART_RED, CHART_RED_VAR),
  default: "text-text",
  muted: "text-text-subtle",
};

type ListMetaVariant =
  | "action-preview"
  | "icon"
  | "section-status"
  | "text"
  | "thumbnail";

const META_VARIANTS: Record<ListMetaVariant, string> = {
  "action-preview":
    "min-w-[calc(var(--spacing)*7)] justify-end overflow-hidden text-sm group-focus-within/summary-panel-item:w-[calc(var(--spacing)*7)] group-hover/summary-panel-item:w-[calc(var(--spacing)*7)] group-has-[[aria-expanded=true]]/summary-panel-item:w-[calc(var(--spacing)*7)]",
  icon: "size-3.5 [&>*]:size-full [&_svg]:size-full",
  "section-status":
    "-me-1 w-5 justify-center empty:hidden group-data-[summary-panel-variant=dynamic-isle]/summary-panel:group-data-[summary-panel-density=default]/summary-panel:me-0",
  text: "text-sm",
  thumbnail:
    "relative size-10 justify-center overflow-hidden rounded-xl bg-panel-secondary",
};

type ListMetaVisibility = "always" | "interaction" | "rest";

const META_VISIBILITY: Record<ListMetaVisibility, string | false> = {
  always: false,
  interaction:
    "opacity-0 group-focus-visible/summary-panel-item:opacity-100 group-focus-within/summary-panel-item:opacity-100 group-hover/summary-panel-item:opacity-100 group-aria-expanded/summary-panel-item:opacity-100",
  rest: "group-focus-within/summary-panel-item:opacity-0 group-hover/summary-panel-item:opacity-0 group-has-[[aria-expanded=true]]/summary-panel-item:opacity-0",
};

/* ------------------------------------------------------------------ */
/* Containers                                                           */
/* ------------------------------------------------------------------ */

type ListPanelVariant = "dynamic-isle" | "default";

type ListPanelDensity = "comfortable" | "default";

interface ListPanelProps extends ComponentProps<"div"> {
  density?: ListPanelDensity;
  variant?: ListPanelVariant;
}

/**
 * The summary panel scope. Items read `group-data-[summary-panel-variant]` and
 * `group-data-[summary-panel-density]` from the nearest `group/summary-panel`.
 */
const ListPanel = ({
  className,
  density = "default",
  variant = "default",
  ...props
}: ListPanelProps) => (
  <div
    {...props}
    className={cn("group/summary-panel", className)}
    data-ck-summary-panel-density={density}
    data-ck-summary-panel-variant={variant}
  />
);

/**
 * The card container in card mode:
 * `group/summary-card overflow-hidden rounded-2xl border border-default` with
 * `data-variant=card`, which switches the items to their card layout.
 */
const ListCard = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    {...props}
    className={cn(
      "group/summary-card overflow-hidden rounded-2xl border border-border",
      className
    )}
    data-variant="card"
  />
);

/* ------------------------------------------------------------------ */
/* Item                                                                 */
/* ------------------------------------------------------------------ */

interface ListItemChevronProps {
  showChevron?: boolean;
}

const ItemCardChevron = () => (
  <ChevronRight16Icon className="hidden text-text-subtle group-data-[variant=card]/summary-card:block" />
);

interface ListItemProps
  extends Omit<ComponentProps<"div">, "ref">, ListItemChevronProps {
  disabled?: boolean;
  interactive?: boolean;
  multiline?: boolean;
  ref?: Ref<HTMLDivElement>;
  tone?: ListTone;
}

/** A div row. `disabled` is `aria-disabled`, not a native attribute. */
const ListItem = ({
  children,
  className,
  disabled = false,
  interactive = false,
  multiline = false,
  ref,
  showChevron = true,
  tone = "default",
  ...props
}: ListItemProps) => (
  <div
    {...props}
    aria-disabled={disabled || undefined}
    className={cn(
      ITEM_BASE,
      TONES[tone],
      !disabled && interactive && BACKGROUND_INTERACTION,
      disabled && "cursor-not-allowed text-text-subtle",
      className
    )}
    data-multiline={multiline || undefined}
    data-slot="chat-summary-item"
    ref={ref}
  >
    {children}
    {interactive && showChevron ? <ItemCardChevron /> : null}
  </div>
);

type ListItemInteraction = keyof typeof INTERACTION;

interface ListItemButtonProps
  extends
    Omit<ComponentProps<"button">, "color" | "ref">,
    ListItemChevronProps {
  interaction?: ListItemInteraction;
  multiline?: boolean;
  ref?: Ref<HTMLButtonElement>;
  tone?: ListTone;
  unread?: boolean;
}

/** A native button row. */
const ListItemButton = ({
  children,
  className,
  disabled = false,
  interaction = "background",
  multiline = false,
  ref,
  showChevron = true,
  tone = "default",
  type = "button",
  unread = false,
  ...props
}: ListItemButtonProps) => {
  const unreadId = useId();

  const describedBy = unread
    ? [props["aria-describedby"], unreadId].filter(Boolean).join(" ")
    : props["aria-describedby"];

  return (
    <Button
      {...props}
      aria-describedby={describedBy}
      className={cn(
        BUTTON_RESET,
        ITEM_BASE,
        !disabled && INTERACTION[interaction],
        FOCUS_OUTLINE,
        "disabled:cursor-not-allowed disabled:not-aria-busy:text-text-subtle",
        TONES[tone],
        className
      )}
      data-multiline={multiline || undefined}
      data-slot="chat-summary-item-button"
      disabled={disabled}
      disabledAppearance="none"
      focusRing="none"
      ref={ref}
      type={type}
      unstyled
    >
      {children}
      {unread ? (
        <>
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue"
          />
          <span className="sr-only" id={unreadId}>
            Unread updates
          </span>
        </>
      ) : null}
      {showChevron ? <ItemCardChevron /> : null}
    </Button>
  );
};

type ListLinkTarget = ButtonLinkPath | string;

// The router's parsePath and createPath (see ButtonLink).
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

const destinationPath = (to: ListLinkTarget, currentPathname: string) => {
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

interface ListItemLinkProps extends Omit<AppLinkProps, "href"> {
  href?: string;
  tone?: ListTone;
  /** A destination resolved against the current path, like the router `to`. */
  to?: ListLinkTarget;
}

/**
 * The app link styled as a row with the background interaction
 * and no underline. A `to` destination is resolved against the current path
 * and renders the platform link instead.
 */
const ListItemLink = ({
  appLinkItems,
  appearance,
  className,
  contextMenuInitiator,
  conversationId,
  hostId,
  href,
  initiator,
  isBrowserEnabled,
  onActivate,
  onUnmodifiedClick,
  openAsWebsite,
  openTarget,
  originHostId,
  ref,
  requiresConfirmation,
  services,
  showCopyLinkInConfirmation,
  showHoverActions,
  tone = "default",
  to,
  tooltipContent,
  tooltipDelayDuration,
  underline,
  ...props
}: ListItemLinkProps) => {
  const LinkComponent = useLinkComponent();
  const pathname = usePathname() ?? "/";

  const linkClassName = cn(
    ITEM_BASE,
    BACKGROUND_INTERACTION,
    FOCUS_OUTLINE,
    TONES[tone],
    "no-underline",
    className
  );

  if (to === undefined && href !== undefined) {
    return (
      <AppLink
        {...props}
        appLinkItems={appLinkItems}
        appearance={appearance}
        className={linkClassName}
        contextMenuInitiator={contextMenuInitiator}
        conversationId={conversationId}
        data-slot="chat-summary-item-link"
        hostId={hostId}
        href={href}
        initiator={initiator}
        isBrowserEnabled={isBrowserEnabled}
        onActivate={onActivate}
        onUnmodifiedClick={onUnmodifiedClick}
        openAsWebsite={openAsWebsite}
        openTarget={openTarget}
        originHostId={originHostId}
        ref={ref}
        requiresConfirmation={requiresConfirmation}
        services={services}
        showCopyLinkInConfirmation={showCopyLinkInConfirmation}
        showHoverActions={showHoverActions}
        tooltipContent={tooltipContent}
        tooltipDelayDuration={tooltipDelayDuration}
        underline={underline}
      />
    );
  }

  const destination = to === undefined ? href : destinationPath(to, pathname);

  if (typeof LinkComponent === "string") {
    return (
      // oxlint-disable-next-line jsx-a11y/anchor-has-content -- The children arrive through props.
      <a
        {...props}
        className={linkClassName}
        data-slot="chat-summary-item-link"
        href={destination}
        ref={ref}
      />
    );
  }

  // SAFETY: the platform link component is anchor-like and forwards `prefetch`.
  const RouterLink = LinkComponent as ComponentType<RouterLinkProps>;

  return (
    <RouterLink
      {...props}
      className={linkClassName}
      data-slot="chat-summary-item-link"
      href={destination}
      prefetch={false}
      ref={ref}
    />
  );
};

/** The full-row button inside an item that holds other controls. */
const ListItemTrigger = ({
  children,
  className,
  type = "button",
  ...props
}: Omit<ComponentProps<"button">, "color">) => (
  <Button
    {...props}
    className={cn(
      BUTTON_RESET,
      "flex min-w-0 flex-1 cursor-(--ck-action-cursor) items-center gap-(--spacing) self-stretch border-0 bg-transparent p-0 text-start text-inherit group-data-[summary-row-density=comfortable]/summary-row-density:gap-2 group-data-[variant=card]/summary-card:gap-3 after:absolute after:-inset-x-2 after:inset-y-0 after:-z-10 after:content-[''] group-data-[variant=card]/summary-card:after:inset-x-0 disabled:cursor-not-allowed",
      FOCUS_OUTLINE,
      className
    )}
    data-slot="chat-summary-item-trigger"
    disabledAppearance="none"
    focusRing="none"
    type={type}
    unstyled
  >
    {children}
  </Button>
);

interface ListItemGroupProps extends ComponentProps<"div"> {
  density?: ListPanelDensity;
}

/** The column of items; it is the `summary-row-density` scope. */
const ListItemGroup = ({
  className,
  density,
  ...props
}: ListItemGroupProps) => (
  <div
    {...props}
    className={cn(
      "relative z-10 flex min-w-0 flex-col gap-0.5 group-data-[summary-panel-variant=dynamic-isle]/summary-panel:gap-0 group-data-[variant=card]/summary-card:mx-0 group-data-[variant=card]/summary-card:gap-0 group-data-[variant=card]/summary-card:px-0",
      "group/summary-row-density",
      className
    )}
    data-slot="chat-summary-item-group"
    data-ck-summary-row-density={density}
  />
);

interface ListItemLeadingProps extends ComponentProps<"span"> {
  variant?: ListLeadingVariant;
}

/** The leading visual slot. */
const ListItemLeading = ({
  children,
  className,
  variant = "glyph",
  ...props
}: ListItemLeadingProps) => {
  const box = LEADING_BOXES[variant];

  return (
    <span
      {...props}
      className={cn(
        "me-2 flex shrink-0 items-center justify-center group-data-[multiline=true]/summary-panel-item:h-lh group-data-[summary-row-density=comfortable]/summary-row-density:me-0 group-data-[variant=card]/summary-card:me-0 group-data-[variant=card]/summary-card:w-4",
        LEADING_WIDTHS[variant],
        className
      )}
      data-slot="chat-summary-item-leading"
    >
      {box === null ? (
        children
      ) : (
        <span className={cn("flex shrink-0 items-center justify-center", box)}>
          {children}
        </span>
      )}
    </span>
  );
};

/** A 16px round button in the leading area. */
const ListItemAvatarButton = ({
  children,
  className,
  type = "button",
  ...props
}: Omit<ComponentProps<"button">, "color">) => (
  <Button
    {...props}
    className={cn(
      BUTTON_RESET,
      "flex size-4 cursor-(--ck-action-cursor) items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring focus-visible:outline-solid [&>img]:size-4 [&>svg]:size-4",
      className
    )}
    data-slot="chat-summary-item-avatar-button"
    disabledAppearance="none"
    focusRing="none"
    type={type}
    unstyled
  >
    {children}
  </Button>
);

/** A row of 16px avatars. */
const ListItemAvatarGroup = ({
  className,
  ...props
}: ComponentProps<"span">) => (
  <span
    {...props}
    className={cn(
      "flex shrink-0 items-center gap-(--spacing) [&_img]:size-4 [&_svg]:size-4",
      className
    )}
    data-slot="chat-summary-item-avatar-group"
  />
);

interface ListItemMetaProps extends Omit<ComponentProps<"span">, "ref"> {
  tone?: ListMetaTone;
  truncate?: boolean;
  variant?: ListMetaVariant;
  visibility?: ListMetaVisibility;
}

/** The trailing text or icon slot. */
const ListItemMeta = ({
  children,
  className,
  tone = "muted",
  truncate = false,
  variant = "text",
  visibility = "always",
  ...props
}: ListItemMetaProps) => (
  <span
    {...props}
    className={cn(
      "flex items-center group-data-[summary-panel-variant=dynamic-isle]/summary-panel:text-[length:14px] group-data-[summary-panel-variant=dynamic-isle]/summary-panel:leading-[calc(20/14)]",
      truncate ? "max-w-1/2 min-w-0 shrink" : "shrink-0",
      META_TONES[tone],
      META_VARIANTS[variant],
      META_VISIBILITY[visibility],
      className
    )}
    data-slot="chat-summary-item-meta"
  >
    {truncate ? (
      <span className={TEXT_FADE_TRUNCATE}>{children}</span>
    ) : (
      children
    )}
  </span>
);

interface ListItemLabelProps extends Omit<ComponentProps<"span">, "ref"> {
  description?: ReactNode;
  truncate?: boolean;
}

/** The label. Truncated text is a marquee that scrolls on group hover. */
const ListItemLabel = ({
  children,
  className,
  description,
  truncate = true,
  ...props
}: ListItemLabelProps) => {
  const label = (
    <span
      {...props}
      className={cn(
        "min-w-0 flex-1 text-sm group-data-[summary-panel-variant=dynamic-isle]/summary-panel:text-[length:14px] group-data-[summary-panel-variant=dynamic-isle]/summary-panel:leading-[calc(20/14)]",
        className
      )}
      data-slot="chat-summary-item-label"
    >
      {truncate ? (
        <MarqueeText animateOnGroupHover>{children}</MarqueeText>
      ) : (
        children
      )}
    </span>
  );

  if (description === undefined || description === null) {
    return label;
  }

  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[summary-panel-variant=dynamic-isle]/summary-panel:gap-0">
      {label}
      <ListItemMeta>
        <span className={TEXT_FADE_TRUNCATE}>{description}</span>
      </ListItemMeta>
    </span>
  );
};

/** The trailing chevron. */
const ListItemChevron = () => (
  <ListItemMeta variant="icon">
    <ItemChevronIcon />
  </ListItemMeta>
);

type ListActionsAlign = "content" | "preview" | "section-actions";

type ListActionsPlacement = "inline" | "overlay";

interface ListItemActionsProps extends ComponentProps<"span"> {
  align?: ListActionsAlign;
  placement?: ListActionsPlacement;
  visibility?: "always" | "interaction";
}

const stop =
  <E extends { stopPropagation: () => void }>(
    handler: ((event: E) => void) | undefined
  ) =>
  (event: E) => {
    event.stopPropagation();
    handler?.(event);
  };

/** Trailing actions. Clicks, keys and presses do not reach the row. */
const ListItemActions = ({
  align = "content",
  children,
  className,
  onClick,
  onKeyDown,
  onPointerDown,
  placement = "inline",
  visibility = "always",
  ...props
}: ListItemActionsProps) => (
  <span
    {...props}
    className={cn(
      "flex h-5 shrink-0 items-center",
      align === "section-actions" && "-me-1.5",
      align === "preview" && "me-2 w-15 justify-center",
      placement === "overlay" && "absolute inset-y-0 end-0 my-auto",
      visibility === "interaction" && [
        "pointer-events-none opacity-0 group-focus-within/summary-panel-item:pointer-events-auto group-focus-within/summary-panel-item:opacity-100 group-hover/summary-panel-item:pointer-events-auto group-hover/summary-panel-item:opacity-100 has-[[aria-expanded=true]]:pointer-events-auto has-[[aria-expanded=true]]:opacity-100",
        placement === "inline" &&
          "pointer-coarse:pointer-events-auto pointer-coarse:opacity-100",
      ],
      className
    )}
    data-slot="chat-summary-item-actions"
    onClick={stop<MouseEvent<HTMLSpanElement>>(onClick)}
    onKeyDown={stop(onKeyDown)}
    onPointerDown={stop(onPointerDown)}
    role="presentation"
  >
    {children}
  </span>
);

interface ListItemActionLinkProps extends ComponentProps<"a"> {
  label: string;
}

/** An icon link action with a 250ms tooltip. */
const ListItemActionLink = ({
  children,
  className,
  label,
  ...props
}: ListItemActionLinkProps) => (
  <TooltipHint content={label} openDelay={250}>
    <a
      {...props}
      aria-label={label}
      className={cn(
        "-me-2 flex size-[calc(var(--spacing)*7)] cursor-(--ck-action-cursor) items-center justify-center rounded-sm text-text-subtle hover:text-text",
        FOCUS_OUTLINE,
        className
      )}
      data-slot="chat-summary-item-action-link"
    >
      <span className={ICON_BOX}>{children}</span>
    </a>
  </TooltipHint>
);

/** Section header actions. */
const ListSectionActions = ({
  className,
  ...props
}: ComponentProps<"span">) => (
  <span
    {...props}
    className={cn("ms-auto flex items-center gap-0.5", className)}
    data-slot="chat-summary-section-actions"
  />
);

interface ListIconButtonProps extends Omit<ButtonProps, "color" | "children"> {
  children?: ReactNode;
  color?: ButtonColor;
  disableTooltip?: boolean;
  label: string;
  shortcut?: ComponentProps<typeof TooltipHint>["shortcut"];
  tooltipContent?: ReactNode;
}

/** A 24px icon button with a 250ms tooltip. */
const ListIconButton = ({
  children,
  className,
  color = "ghost",
  disableTooltip,
  label,
  shortcut,
  tooltipContent,
  ...props
}: ListIconButtonProps) => (
  <TooltipHint
    content={tooltipContent ?? label}
    disabled={disableTooltip}
    openDelay={250}
    shortcut={shortcut}
  >
    <Button
      {...props}
      aria-label={label}
      className={cn("size-6", FOCUS_OUTLINE, className)}
      color={color}
      data-slot="chat-summary-icon-button"
      focusRing="inset"
      size="icon"
      uniform
    >
      <span className={ICON_BOX}>{children}</span>
    </Button>
  </TooltipHint>
);

/** The section header icon button, pulled in 6 spacing quarters. */
const ListSectionIconButton = ({
  className,
  ...props
}: ListIconButtonProps) => (
  <ListIconButton className={cn("-me-1.5", className)} {...props} />
);

/* ------------------------------------------------------------------ */
/* Channel button                                                       */
/* ------------------------------------------------------------------ */

type ChannelButtonMode = "content" | "default" | "shortcut";

interface ListChannelButtonProps extends Omit<
  ComponentProps<"button">,
  "color" | "ref"
> {
  icon?: ReactNode;
  iconOnly?: boolean;
  iconVariant?: ListLeadingVariant;
  loading?: boolean;
  mode?: ChannelButtonMode;
  ref?: Ref<HTMLButtonElement>;
  selectable?: boolean;
}

/** An item button with a leading icon and a loading meta. */
const ListChannelButton = ({
  children,
  icon,
  iconOnly = false,
  iconVariant,
  loading = false,
  mode,
  selectable = false,
  ...props
}: ListChannelButtonProps) => {
  const body =
    mode === "shortcut" ? (
      <Button
        {...props}
        allowShrink
        className={
          iconOnly ? undefined : "w-full justify-center only:col-span-full"
        }
        color="secondary"
        loading={loading}
        radius="large"
        size="dialogGhost"
        uniform={iconOnly}
      >
        {loading ? null : icon}
        {iconOnly ? <span className="sr-only">{children}</span> : children}
      </Button>
    ) : (
      <ListItemButton {...props} className="select-none">
        {mode === "content" ? (
          <span className="me-2 flex w-5 shrink-0 items-center justify-start">
            {icon}
          </span>
        ) : (
          <ListItemLeading variant={iconVariant}>{icon}</ListItemLeading>
        )}
        <ListItemLabel
          className={
            selectable
              ? cn(TEXT_FADE_TRUNCATE, "leading-5 select-text")
              : "leading-5 select-none"
          }
          truncate={!selectable}
        >
          {children}
        </ListItemLabel>
        {loading ? (
          <ListItemMeta variant="icon">
            <Spinner />
          </ListItemMeta>
        ) : null}
      </ListItemButton>
    );

  return iconOnly ? <TooltipHint content={children}>{body}</TooltipHint> : body;
};

/* ------------------------------------------------------------------ */
/* Expandable list                                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_VISIBLE_ITEM_LIMIT = 6;

const DEFAULT_VISIBLE_ITEM_INCREMENT = 50;

type ExpandableListPresentation = "card" | "plain" | "summary";

type ListNewItemPosition = "end" | "start";

interface ExpandableListPaginationState {
  isExpanded: boolean;
  isLoadingMore: boolean;
  nextRevealCount: number;
  onToggle: () => void;
}

interface ExpandableListProps<Item> {
  children: (item: Item, index: number) => ReactNode;
  empty?: ReactNode;
  getKey: (item: Item, index: number) => string;
  getNewItemPosition?: (item: Item) => ListNewItemPosition | undefined;
  isLoadingMore?: boolean;
  items: readonly Item[];
  listAriaLabel?: string;
  listClassName?: string;
  onAnalyticsEvent?: (control: "show_less" | "show_more") => void;
  onLoadMore?: () => void;
  onVisibleItemsChange?: (items: readonly Item[]) => void;
  paginationButtonClassName?: string;
  presentation?: ExpandableListPresentation;
  preserveExpandedOrder?: boolean;
  renderFooter?: (items: readonly Item[]) => ReactNode;
  renderPagination?: (state: ExpandableListPaginationState) => ReactNode;
  visibleItemIncrement?: number;
  visibleItemLimit?: number;
}

const pluralCount = (count: number) => new Intl.NumberFormat().format(count);

// lodash sortBy on one iteratee: a stable ascending sort.
const stableSortBy = <T,>(values: readonly T[], order: (value: T) => number) =>
  values
    .map((value, index) => ({ index, key: order(value), value }))
    .toSorted((a, b) => {
      if (a.key === b.key) {
        return a.index - b.index;
      }

      return a.key < b.key ? -1 : 1;
    })
    .map(({ value }) => value);

const ExpandablePlainToggle = ({
  disabled,
  isExpanded,
  onClick,
}: {
  disabled: boolean;
  isExpanded: boolean;
  onClick: () => void;
}) => (
  <div className="flex gap-1 py-1">
    <Button
      className="relative -ms-2 h-6 shrink-0 cursor-pointer rounded-sm px-2 leading-none font-normal text-text-subtle transition-colors before:absolute before:inset-0 before:rounded-[inherit] before:bg-[color-mix(in_oklab,var(--ck-palette-ink)_light-dark(8%,12%),transparent)] before:opacity-0 before:content-[''] hover:text-text hover:before:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid active:before:bg-[color-mix(in_oklab,var(--ck-palette-ink)_light-dark(12%,16%),transparent)] disabled:cursor-not-allowed disabled:text-[light-dark(var(--color-light-app-text-foreground-secondary),var(--color-dark-app-text-foreground-secondary))] disabled:opacity-40 [&>span]:relative"
      disabled={disabled}
      focusRing="none"
      onClick={onClick}
      unstyled
    >
      <span className="text-base">
        {isExpanded ? "Show less" : "Show more"}
      </span>
    </Button>
  </div>
);

/** Shows the first items and reveals more on demand. */
const ExpandableList = <Item,>({
  children,
  empty,
  getKey,
  getNewItemPosition,
  isLoadingMore = false,
  items,
  listAriaLabel,
  listClassName,
  onAnalyticsEvent,
  onLoadMore,
  onVisibleItemsChange,
  paginationButtonClassName,
  presentation = "summary",
  preserveExpandedOrder = false,
  renderFooter,
  renderPagination,
  visibleItemIncrement,
  visibleItemLimit = DEFAULT_VISIBLE_ITEM_LIMIT,
}: ExpandableListProps<Item>) => {
  const [visibleCount, setVisibleCount] = useState(visibleItemLimit);

  const [expandedOrder, setExpandedOrder] = useState<ReadonlyMap<
    string,
    number
  > | null>(null);

  let ordered: readonly Item[] = items;

  if (preserveExpandedOrder && expandedOrder !== null) {
    const keyed = items.map((item, index) => ({
      item,
      key: getKey(item, index),
    }));

    const sorted = stableSortBy(
      keyed,
      ({ item, key }) =>
        expandedOrder.get(key) ??
        (getNewItemPosition?.(item) === "end" ? Number.POSITIVE_INFINITY : -1)
    );

    ordered = sorted.map(({ item }) => item);

    if (
      sorted.length !== expandedOrder.size ||
      sorted.some(({ key }) => !expandedOrder.has(key))
    ) {
      setExpandedOrder(new Map(sorted.map(({ key }, index) => [key, index])));
      setVisibleCount(
        Math.max(
          visibleCount,
          sorted.findLastIndex(
            ({ key }) =>
              (expandedOrder.get(key) ?? Number.POSITIVE_INFINITY) <
              visibleCount
          ) + 1
        )
      );
    }
  }

  const visible = useMemo(
    () => ordered.slice(0, visibleCount),
    [ordered, visibleCount]
  );

  useEffect(() => {
    onVisibleItemsChange?.(visible);
  }, [onVisibleItemsChange, visible]);

  if (items.length === 0 && onLoadMore === undefined) {
    // oxlint-disable-next-line react/jsx-no-useless-fragment -- `empty` is any ReactNode, and the component returns an element or null.
    return <>{empty ?? null}</>;
  }

  const hasPagination =
    items.length > visibleItemLimit || onLoadMore !== undefined;

  const remaining = items.length - visible.length;
  const isExpanded = remaining === 0 && onLoadMore === undefined;
  const increment = visibleItemIncrement ?? DEFAULT_VISIBLE_ITEM_INCREMENT;

  const nextRevealCount =
    onLoadMore === undefined ? Math.min(remaining, increment) : increment;

  const toggle = () => {
    if (isLoadingMore) {
      return;
    }

    onAnalyticsEvent?.(isExpanded ? "show_less" : "show_more");

    if (preserveExpandedOrder) {
      setExpandedOrder(
        isExpanded
          ? null
          : new Map(ordered.map((item, index) => [getKey(item, index), index]))
      );
    }

    setVisibleCount((current) => {
      if (isExpanded) {
        return visibleItemLimit;
      }

      return onLoadMore === undefined
        ? Math.min(items.length, current + increment)
        : current + increment;
    });

    if (remaining < increment) {
      onLoadMore?.();
    }
  };

  const rows = visible.map((item, index) => ({
    key: getKey(item, index),
    node: children(item, index),
  }));

  const list =
    listAriaLabel === undefined ? (
      <ListItemGroup className={listClassName}>
        {rows.map(({ key, node }) => (
          <Fragment key={key}>{node}</Fragment>
        ))}
      </ListItemGroup>
    ) : (
      <ListItemGroup
        aria-label={listAriaLabel}
        className={listClassName}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The container is a div with role=list.
        role="list"
      >
        {rows.map(({ key, node }) => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The component wraps each row in a div with the list roles.
          <div key={key} role="listitem">
            {node}
          </div>
        ))}
      </ListItemGroup>
    );

  const custom =
    hasPagination && renderPagination !== undefined
      ? renderPagination({
          isExpanded,
          isLoadingMore,
          nextRevealCount,
          onToggle: toggle,
        })
      : null;

  const usesBuiltIn = hasPagination && renderPagination === undefined;

  return (
    <>
      {list}
      {renderFooter?.(visible)}
      {custom}
      {usesBuiltIn && presentation === "plain" ? (
        <ExpandablePlainToggle
          disabled={isLoadingMore}
          isExpanded={isExpanded}
          onClick={toggle}
        />
      ) : null}
      {usesBuiltIn && presentation === "card" ? (
        <ListItemButton disabled={isLoadingMore} onClick={toggle}>
          <ListItemLeading variant="custom">
            <CircleGrid2x16Icon />
          </ListItemLeading>
          <ListItemLabel>
            {isExpanded ? "Show less" : "Show more"}
          </ListItemLabel>
        </ListItemButton>
      ) : null}
      {usesBuiltIn && presentation === "summary" ? (
        <Button
          className={cn(
            "!px-0 !py-0 text-text-subtle hover:text-text-muted",
            paginationButtonClassName
          )}
          color="ghostMuted"
          disabled={isLoadingMore}
          onClick={toggle}
          size="default"
        >
          {isExpanded
            ? "Show less"
            : `Show ${pluralCount(nextRevealCount)} more`}
        </Button>
      ) : null}
    </>
  );
};

/** The expandable list with a tertiary item toggle. */
const DynamicIsleList = <Item,>(props: ExpandableListProps<Item>) => (
  <ExpandableList
    {...props}
    renderPagination={({ isExpanded, isLoadingMore, onToggle }) => (
      <ListItemButton
        aria-busy={isLoadingMore}
        disabled={isLoadingMore}
        onClick={onToggle}
        tone="tertiary"
      >
        <ListItemLeading variant="custom">
          {isExpanded ? <ChevronUp16Icon /> : <ChevronDown16Icon />}
        </ListItemLeading>
        <ListItemLabel>{isExpanded ? "Show less" : "Show more"}</ListItemLabel>
      </ListItemButton>
    )}
  />
);

/* ------------------------------------------------------------------ */
/* Divided rows                                                         */
/* ------------------------------------------------------------------ */

// An inset hairline under every child but the last.
const INSET_DIVIDERS =
  "flex flex-col [&>*:not(:last-child)]:relative [&>*:not(:last-child)]:after:pointer-events-none [&>*:not(:last-child)]:after:absolute [&>*:not(:last-child)]:after:inset-x-4 [&>*:not(:last-child)]:after:bottom-0 [&>*:not(:last-child)]:after:h-px [&>*:not(:last-child)]:after:bg-border [&>*:not(:last-child)]:after:content-['']";

// A full-width bottom border on every child but the last.
const BORDER_DIVIDERS =
  "flex flex-col [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border";

// The border between two
// rows turns transparent when either row holds an enabled control that is
// hovered or focused.
const INTERACTIVE_DIVIDERS = [
  "divide-y [&>:not(:last-child)]:border-b-border",
  "[&>:has(>button:enabled,>input[type=radio]:enabled,>label>input[type=radio]:enabled):focus-within]:border-b-transparent",
  "[&>:has(+:focus-within>button:enabled,+:focus-within>input[type=radio]:enabled,+:focus-within>label>input[type=radio]:enabled)]:border-b-transparent",
  "[@media(hover:hover)]:[&>:has(>button:enabled,>input[type=radio]:enabled,>label>input[type=radio]:enabled):hover]:border-b-transparent",
  "[@media(hover:hover)]:[&>:has(+:hover>button:enabled,+:hover>input[type=radio]:enabled,+:hover>label>input[type=radio]:enabled)]:border-b-transparent",
].join(" ");

interface DividedRowsProps extends ComponentProps<"div"> {
  dividerInset?: "default" | "none";
  variant?: "default" | "interactive";
}

/** A column of rows with hairlines between them. */
const dividerClassName = (
  variant: DividedRowsProps["variant"],
  dividerInset: DividedRowsProps["dividerInset"]
) => {
  if (variant === "interactive") {
    return INTERACTIVE_DIVIDERS;
  }

  return dividerInset === "none" ? BORDER_DIVIDERS : INSET_DIVIDERS;
};

const DividedRows = ({
  className,
  dividerInset = "default",
  variant = "default",
  ...props
}: DividedRowsProps) => (
  <div
    {...props}
    className={cn(dividerClassName(variant, dividerInset), className)}
  />
);

export {
  DEFAULT_VISIBLE_ITEM_INCREMENT,
  DEFAULT_VISIBLE_ITEM_LIMIT,
  DividedRows,
  DynamicIsleList,
  ExpandableList,
  ListCard,
  ListChannelButton,
  ListIconButton,
  ListItem,
  ListItemActionLink,
  ListItemActions,
  ListItemAvatarButton,
  ListItemAvatarGroup,
  ListItemButton,
  ListItemChevron,
  ListItemGroup,
  ListItemLabel,
  ListItemLeading,
  ListItemLink,
  ListItemMeta,
  ListItemTrigger,
  ListPanel,
  ListSectionActions,
  ListSectionIconButton,
};

export type {
  DividedRowsProps,
  ExpandableListPaginationState,
  ExpandableListPresentation,
  ExpandableListProps,
  ListChannelButtonProps,
  ListIconButtonProps,
  ListItemActionsProps,
  ListItemButtonProps,
  ListItemGroupProps,
  ListItemLabelProps,
  ListItemLeadingProps,
  ListItemLinkProps,
  ListItemMetaProps,
  ListItemProps,
  ListLeadingVariant,
  ListMetaTone,
  ListMetaVariant,
  ListMetaVisibility,
  ListNewItemPosition,
  ListPanelDensity,
  ListPanelProps,
  ListPanelVariant,
  ListTone,
};
