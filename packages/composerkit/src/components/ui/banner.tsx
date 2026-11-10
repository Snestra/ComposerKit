"use client";

/* oxlint-disable anti-slop/no-runtime-typeof -- AlertBox tells a string title from an element. */

import {
  CheckCircle16Icon,
  CheckCircle20Icon,
  Close16Icon,
  Close20Icon,
  CrossedLargeIcon,
  ExclamationCircle16Icon,
  InfoCircle16Icon,
  InfoCircle20Icon,
} from "composerkit/components/banner/icons";
import { Button } from "composerkit/components/ui/button";
import type {
  ButtonColor,
  ButtonProps,
} from "composerkit/components/ui/button";
import { cn } from "composerkit/lib/utils";
import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  AriaAttributes,
  AriaRole,
  ComponentType,
  MouseEventHandler,
  ReactNode,
  Ref,
} from "react";
import { createPortal } from "react-dom";

import styles from "./banner.module.css";

/*
 * Banner, Alert, the eyebrow notice and the composer-attached notice, with
 * their styles in banner.module.css.
 *
 * Utilities are written with this library's tokens (ui/app/globals.css), with
 * the Electron theme values as defaults: `electron:` classes are always on. Status colors that the app theme does not carry as tokens are
 * local custom properties holding the Electron values as light-dark pairs,
 * which resolve against the nearest color-scheme scope.
 */

// Electron values: text-danger/-warning/-success and chart-green read
// --ck-palette-label-error/-text-warning/-accent-green, the surfaces
// --color-fill-{danger,warning,success}-surface (red-25/950, orange-25/950,
// green-25/950), the outlines --ck-palette-border-error/-warning (the
// color-mix variants) and the solids red-500 and green-600
//.
const STATUS_VARS = [
  "[--bn-danger:var(--color-status-danger)]",
  "[--bn-warning:var(--color-status-warning)]",
  "[--bn-green:var(--color-status-success)]",
  "[--bn-caution:var(--color-status-caution)]",
  "[--bn-info:var(--ck-palette-label-accent)]",
  "[--bn-info-surface:var(--ck-palette-surface-accent-hover)]",
  "[--bn-danger-surface:var(--color-status-danger-surface)]",
  "[--bn-warning-surface:var(--color-status-warning-surface)]",
  "[--bn-success-surface:var(--color-status-success-surface)]",
  "[--bn-danger-outline:light-dark(color-mix(in_oklab,#e02e2a_15%,transparent),color-mix(in_oklab,#e5484d_40%,transparent))]",
  "[--bn-warning-outline:light-dark(color-mix(in_oklab,#e25507_15%,transparent),color-mix(in_oklab,#f98a5f_40%,transparent))]",
  "[--bn-danger-solid:var(--color-status-danger-solid)]",
  "[--bn-success-solid:var(--color-status-success-solid)]",
].join(" ");

// text-description is --ck-palette-ink-tertiary there.
const DESCRIPTION_COLOR = "text-(color:--ck-palette-ink-tertiary)";

// Tailwind reads class names as whole literals, so each group is written out.
const NARROW_FILL =
  "[@container_(max-width:400px)]:w-full [@container_(max-width:400px)]:shrink [@container_(max-width:400px)]:flex-wrap [@container_(max-width:400px)]:justify-center";

const NARROW_SEPARATOR =
  "[@container_(max-width:400px)]:border-t [@container_(max-width:400px)]:border-s-0 [@container_(max-width:400px)]:pt-2 [@container_(max-width:400px)]:ps-0";

const NARROW_CALLOUT_ROW =
  "[@container_(max-width:400px)]:flex-wrap [@container_(max-width:400px)]:items-start [@container_(max-width:400px)]:gap-2";

// The component tests props such as `title` for truthiness: an empty string, 0
// and false render nothing.
const has: (node: ReactNode) => boolean = Boolean;

const isNode = (node: ReactNode): boolean =>
  node !== undefined && node !== null;

type IconComponent = ComponentType<{ className?: string }>;

export type BannerType =
  | "caution"
  | "error"
  | "infoAccent"
  | "normal"
  | "success"
  | "warning";

export type BannerVariant =
  | "announcement"
  | "announcementInset"
  | "authUpsell"
  | "beacon"
  | "browserNotice"
  | "callout"
  | "catalog"
  | "composerContext"
  | "default"
  | "embedded"
  | "informationNotice"
  | "insetNotice"
  | "page"
  | "pageNotice"
  | "privacyNotice"
  | "promotion"
  | "recovery"
  | "settings"
  | "status"
  | "strip";

export type BannerLayout =
  | "horizontal"
  | "inline"
  | "vertical"
  | "verticalIcon"
  | "warningCallout";

export type BannerDensity = "compact" | "default";

/** What the banner tells its call-to-action children (the `$5` context). */
export type BannerCtaDensity = "default" | "eyebrow" | "recovery";

/**
 * The call-to-action context: the Banner wraps
 * custom call-to-action children in `recovery` or, for composer-attached and
 * beacon banners, `eyebrow`.
 */
export const BannerCtaContext = createContext<BannerCtaDensity>("default");

export const useBannerCtaDensity = () => use(BannerCtaContext);

export interface BannerProps {
  ariaLive?: AriaAttributes["aria-live"];
  /** `true` tucks the banner under the composer, `"compact"` is its small form. */
  attachedToComposer?: boolean | "compact";
  content?: ReactNode;
  customCtas?: ReactNode;
  dangerCtaText?: ReactNode;
  density?: BannerDensity;
  Icon?: IconComponent;
  icon?: ReactNode;
  iconClassName?: string;
  isDangerCtaDisabled?: boolean;
  isPrimaryCtaDisabled?: boolean;
  isSecondaryCtaDisabled?: boolean;
  layout?: BannerLayout;
  onDangerCtaClick?: ButtonProps["onClick"];
  onPrimaryCtaClick?: ButtonProps["onClick"];
  onSecondaryCtaClick?: ButtonProps["onClick"];
  primaryCtaColor?: ButtonColor;
  primaryCtaText?: ReactNode;
  role?: AriaRole;
  secondaryCtaColor?: ButtonColor;
  secondaryCtaText?: ReactNode;
  showCtaSeparator?: boolean;
  stackOnNarrow?: boolean;
  title?: ReactNode;
  trailingAction?: ReactNode;
  type?: BannerType;
  variant?: BannerVariant;
  wrapCtas?: boolean;
}

// ---------------------------------------------------------------------------
// Recovery card placement
// ---------------------------------------------------------------------------

/**
 * Where the recovery card is mounted. With
 * `homeBannerPlacement: "footer"` the card moves into `target`, otherwise it
 * stays where it is rendered.
 */
export interface RecoveryBannerPlacement {
  homeBannerPlacement?: string;
  target?: HTMLElement | null;
}

export const RecoveryBannerPlacementContext = createContext<
  RecoveryBannerPlacement | undefined
>(undefined);

// Moves a node but gives focus back to the element inside it when the
// move dropped focus to the body.
const preserveFocus = (node: HTMLElement, move: () => void) => {
  const doc = node.ownerDocument;
  const active = doc.activeElement;

  if (!(active instanceof HTMLElement) || !node.contains(active)) {
    move();

    return;
  }

  let focusMoved = false;

  const onFocusIn = () => {
    focusMoved = true;
  };

  doc.addEventListener("focusin", onFocusIn, true);
  move();
  queueMicrotask(() => {
    doc.removeEventListener("focusin", onFocusIn, true);

    if (
      !focusMoved &&
      active.isConnected &&
      node.contains(active) &&
      doc.activeElement === doc.body
    ) {
      active.focus({ preventScroll: true });
    }
  });
};

// Moves the host into the footer target and returns the cleanup that takes it
// out again.
const mountInTarget = (
  host: HTMLElement | null,
  target: HTMLElement | null,
  footer: boolean
): (() => void) | undefined => {
  if (!footer || host === null || target === null) {
    return undefined;
  }

  preserveFocus(host, () => {
    target.prepend(host);
  });

  return () => {
    if (host.parentNode === target) {
      preserveFocus(host, () => {
        host.remove();
      });
    }
  };
};

const RecoveryHost = ({ children }: { children: ReactNode }) => {
  const placement = use(RecoveryBannerPlacementContext);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const footer = placement?.homeBannerPlacement === "footer";
  const target = placement?.target ?? null;

  const setAnchor = useCallback(
    (anchor: HTMLDivElement | null) => {
      if (
        anchor === null &&
        host !== null &&
        host.parentNode === anchorRef.current
      ) {
        preserveFocus(host, () => {
          host.remove();
        });
      }

      anchorRef.current = anchor;

      if (anchor !== null && host === null) {
        const created = anchor.ownerDocument.createElement("div");
        created.className = "contents";
        setHost(created);
      } else if (anchor !== null && host !== null) {
        preserveFocus(host, () => {
          anchor.prepend(host);
        });
      }
    },
    [host]
  );

  useLayoutEffect(
    () => mountInTarget(host, target, footer),
    [host, target, footer]
  );

  return (
    <>
      {footer && host !== null ? null : (
        <div className="contents" ref={setAnchor} />
      )}
      {host === null ? null : createPortal(children, host)}
    </>
  );
};

const RecoveryBanner = ({
  content,
  customCtas,
  icon,
  title,
}: Pick<BannerProps, "content" | "customCtas" | "icon" | "title">) => (
  <RecoveryHost>
    <aside
      aria-live="polite"
      className={cn(styles.recovery, "@container")}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders an aside with role="status".
      role="status"
    >
      {isNode(icon) ? (
        <span
          aria-hidden="true"
          className="-ms-2 me-3 flex size-8 shrink-0 items-center justify-center self-center rounded-full bg-panel-elevated"
        >
          {icon}
        </span>
      ) : null}
      <div className="flex min-w-0 grow flex-col @min-[560px]:flex-row @min-[560px]:items-center @min-[560px]:justify-between @min-[560px]:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          {has(title) ? <h3 className="font-semibold">{title}</h3> : null}
          <div className={styles.recoveryDescription}>{content}</div>
        </div>
        {isNode(customCtas) ? (
          <div className="mt-2 flex min-w-0 shrink-0 flex-wrap gap-2 pb-1 @min-[560px]:mt-0 @min-[560px]:pb-0">
            <BannerCtaContext value="recovery">{customCtas}</BannerCtaContext>
          </div>
        ) : null}
      </div>
    </aside>
  </RecoveryHost>
);

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

interface BannerFlags {
  attached: boolean;
  beaconSurface: boolean;
  callout: boolean;
  compactAttached: boolean;
  documentFamily: boolean;
  embedded: boolean;
  horizontal: boolean;
  inline: boolean;
  inset: boolean;
  narrowStack: boolean;
  narrowStackCallout: boolean;
  pageNotice: boolean;
  stackedCtas: boolean;
  vertical: boolean;
  verticalIcon: boolean;
  warningCallout: boolean;
}

const DOCUMENT_FAMILY: ReadonlySet<BannerVariant> = new Set<BannerVariant>([
  "page",
  "catalog",
  "announcement",
  "announcementInset",
  "settings",
]);

const STACKABLE_VARIANTS: ReadonlySet<BannerVariant> = new Set<BannerVariant>([
  "default",
  "callout",
  "embedded",
]);

const getFlags = ({
  attachedToComposer = false,
  layout = "horizontal",
  stackOnNarrow = false,
  variant = "default",
}: BannerProps): BannerFlags => {
  const horizontal = layout === "horizontal";
  const narrowStack = horizontal && stackOnNarrow;

  return {
    attached: attachedToComposer !== false,
    beaconSurface: variant === "beacon" || variant === "authUpsell",
    callout: variant === "callout",
    compactAttached: attachedToComposer === "compact",
    documentFamily: DOCUMENT_FAMILY.has(variant),
    embedded: variant === "embedded",
    horizontal,
    inline: layout === "inline",
    inset: variant === "insetNotice",
    narrowStack,
    narrowStackCallout: layout === "warningCallout" && stackOnNarrow,
    pageNotice: variant === "pageNotice",
    stackedCtas: narrowStack && STACKABLE_VARIANTS.has(variant),
    vertical: layout === "vertical",
    verticalIcon: layout === "verticalIcon",
    warningCallout: layout === "warningCallout",
  };
};

const ctaBaseClass = (props: BannerProps, flags: BannerFlags) => {
  const { type = "normal", wrapCtas = false } = props;
  let sizing = "shrink-0";

  if (wrapCtas) {
    sizing = "min-w-0 shrink flex-wrap justify-end";
  } else if (flags.vertical) {
    sizing = "w-full justify-end";
  }

  return cn(
    "flex gap-2",
    sizing,
    flags.documentFamily && "max-w-full",
    type === "success" && styles.successCta
  );
};

const ctaStackClass = (flags: BannerFlags) => {
  const plain =
    flags.horizontal &&
    !flags.pageNotice &&
    !flags.inset &&
    !flags.documentFamily;

  const narrowBreakpoint = flags.attached
    ? "@max-[400px]:order-last @max-[400px]:w-full @max-[400px]:min-w-0 @max-[400px]:flex-wrap @max-[400px]:justify-center"
    : "@max-[560px]:order-last @max-[560px]:w-full @max-[560px]:min-w-0 @max-[560px]:flex-wrap @max-[560px]:justify-center @min-[560px]:ms-5";

  return cn(
    plain &&
      (flags.attached ? "mt-0 min-w-fit" : "mt-2 min-w-fit @min-[560px]:mt-0"),
    flags.stackedCtas && narrowBreakpoint,
    !flags.stackedCtas &&
      flags.narrowStack &&
      !flags.pageNotice &&
      !flags.documentFamily &&
      NARROW_FILL
  );
};

const ctaClassName = (props: BannerProps, flags: BannerFlags) => {
  const { showCtaSeparator = true } = props;

  if (flags.beaconSurface) {
    return props.variant === "authUpsell" ? styles.authUpsellCtas : styles.ctas;
  }

  return cn(
    ctaBaseClass(props, flags),
    ctaStackClass(flags),
    flags.warningCallout &&
      showCtaSeparator &&
      "border-s border-(--ck-palette-border) ps-3",
    flags.narrowStackCallout && NARROW_FILL,
    flags.narrowStackCallout && showCtaSeparator && NARROW_SEPARATOR
  );
};

const primaryCtaSize = (
  variant: BannerVariant,
  flags: BannerFlags
): ButtonProps["size"] => {
  if (variant === "page" || flags.inset) {
    return "dialogAction";
  }

  return flags.pageNotice ? "dialog" : undefined;
};

const CtaButtons = ({
  className,
  flags,
  props,
}: {
  className: string;
  flags: BannerFlags;
  props: BannerProps;
}) => {
  const {
    dangerCtaText,
    isDangerCtaDisabled = false,
    isPrimaryCtaDisabled = false,
    isSecondaryCtaDisabled = false,
    onDangerCtaClick,
    onPrimaryCtaClick,
    onSecondaryCtaClick,
    primaryCtaColor,
    primaryCtaText,
    secondaryCtaColor,
    secondaryCtaText,
    variant = "default",
  } = props;

  return (
    <div className={className}>
      {has(primaryCtaText) ? (
        <Button
          className="shrink-0"
          color={primaryCtaColor ?? "outline"}
          disabled={isPrimaryCtaDisabled}
          onClick={onPrimaryCtaClick}
          size={primaryCtaSize(variant, flags)}
        >
          {primaryCtaText}
        </Button>
      ) : null}
      {has(secondaryCtaText) ? (
        <Button
          className="shrink-0"
          color={secondaryCtaColor ?? "ghost"}
          disabled={isSecondaryCtaDisabled}
          onClick={onSecondaryCtaClick}
          size={flags.pageNotice ? "dialog" : undefined}
        >
          {secondaryCtaText}
        </Button>
      ) : null}
      {has(dangerCtaText) ? (
        <Button
          className="shrink-0"
          color="danger"
          disabled={isDangerCtaDisabled}
          onClick={onDangerCtaClick}
        >
          {dangerCtaText}
        </Button>
      ) : null}
    </div>
  );
};

const renderCtas = (props: BannerProps, flags: BannerFlags): ReactNode => {
  const { customCtas, dangerCtaText, primaryCtaText, secondaryCtaText } = props;
  const className = ctaClassName(props, flags);

  if (has(customCtas)) {
    const density =
      (flags.beaconSurface && flags.attached) || flags.compactAttached
        ? "eyebrow"
        : "default";

    return (
      <BannerCtaContext value={density}>
        <div className={className}>{customCtas}</div>
      </BannerCtaContext>
    );
  }

  if (has(primaryCtaText) || has(secondaryCtaText) || has(dangerCtaText)) {
    return <CtaButtons className={className} flags={flags} props={props} />;
  }

  return null;
};

const iconOrComponent = (
  icon: ReactNode,
  Icon: IconComponent | undefined,
  className?: string
): ReactNode => {
  if (isNode(icon)) {
    return icon;
  }

  return Icon ? <Icon className={className} /> : null;
};

interface AsideProps {
  ariaLive: BannerProps["ariaLive"];
  role: BannerProps["role"];
}

const ComposerContextBanner = ({
  ariaLive,
  content,
  role,
}: AsideProps & Pick<BannerProps, "content">) => (
  <aside
    aria-live={ariaLive}
    // The composer context card of uk1ge: inset by 1.5 spacing units, radius
    // that follows the composer radius, square bottom corners at md.
    className="m-1.5 mb-0 rounded-[max(0px,calc(var(--ck-compose-border-radius,var(--radius-3xl))-0.375rem))] rounded-ee-md rounded-es-md bg-panel-secondary px-3.5 py-3 text-text"
    role={role}
  >
    {content}
  </aside>
);

const BrowserNoticeBanner = ({
  ariaLive,
  content,
  customCtas,
  icon,
  role,
  title,
  trailingAction,
}: AsideProps &
  Pick<
    BannerProps,
    "content" | "customCtas" | "icon" | "title" | "trailingAction"
  >) => (
  <aside
    aria-live={ariaLive}
    className="flex w-full flex-wrap items-center gap-3 border-b border-(--ck-palette-border) bg-panel p-2 text-text select-none"
    role={role}
  >
    {icon}
    <div className="flex min-h-9 min-w-40 flex-1 flex-col justify-center">
      {has(title) ? (
        <div className="text-sm leading-5 font-medium">{title}</div>
      ) : null}
      <div
        className={
          has(title)
            ? cn("text-xs leading-4", DESCRIPTION_COLOR)
            : "text-sm leading-5"
        }
      >
        {content}
      </div>
    </div>
    <div
      className="ms-auto flex shrink-0 items-center gap-1.5"
      data-ck-viewer-density="compact"
    >
      {customCtas}
      {trailingAction}
    </div>
  </aside>
);

const StatusBanner = ({
  ariaLive,
  content,
  icon,
  role,
}: AsideProps & Pick<BannerProps, "content" | "icon">) => (
  <aside
    aria-live={ariaLive}
    className="flex items-center gap-2 rounded-lg bg-fill-secondary-soft px-3 py-3 text-sm text-text select-none"
    role={role}
  >
    {icon}
    <div className="min-w-0 flex-1 break-words">{content}</div>
  </aside>
);

const InformationNoticeBanner = ({
  ariaLive,
  content,
  Icon,
  icon,
  iconClassName,
  role,
  title,
}: AsideProps &
  Pick<
    BannerProps,
    "content" | "Icon" | "icon" | "iconClassName" | "title"
  >) => (
  <aside
    aria-live={ariaLive}
    className="flex items-start gap-3 rounded-2xl bg-[light-dark(var(--ck-palette-surface-button-secondary),var(--ck-palette-surface-editor-opaque))] p-4 text-sm leading-5 text-text"
    role={role}
  >
    {iconOrComponent(icon, Icon, iconClassName)}
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5 break-words">
      {has(title) ? <h3 className="font-semibold">{title}</h3> : null}
      <div className="text-text-muted">{content}</div>
    </div>
  </aside>
);

const PromotionBanner = ({
  ariaLive,
  content,
  icon,
  role,
  trailingAction,
}: AsideProps & Pick<BannerProps, "content" | "icon" | "trailingAction">) => (
  <aside
    aria-live={ariaLive}
    className={cn(
      "relative flex min-h-12 w-full shrink-0 items-center justify-center gap-2 bg-(--color-status-info-solid) py-3 text-center text-sm font-medium text-white select-none md:min-h-13 md:text-base",
      has(trailingAction) ? "px-14" : "px-4"
    )}
    role={role}
  >
    {icon}
    <div className="min-w-0 break-words">{content}</div>
    {has(trailingAction) ? (
      <div className="absolute end-3 top-1/2 -translate-y-1/2">
        {trailingAction}
      </div>
    ) : null}
  </aside>
);

const StripBanner = ({
  ariaLive,
  content,
  icon,
  role,
  title,
  type,
}: AsideProps & Pick<BannerProps, "content" | "icon" | "title" | "type">) => (
  <aside
    aria-live={ariaLive}
    className={cn(
      STATUS_VARS,
      "flex min-h-11 w-full shrink-0 items-center justify-center gap-2 px-4 py-2 text-sm select-none",
      type === "error"
        ? "bg-(--bn-danger-surface)/20 text-(color:--bn-danger)"
        : "bg-(--bn-info-surface) text-text"
    )}
    role={role}
  >
    {icon}
    <div className="min-w-0 text-center break-words">
      {has(title) ? <span className="font-semibold">{title} </span> : null}
      {content}
    </div>
  </aside>
);

const InsetNoticeBanner = ({
  ariaLive,
  content,
  ctas,
  role,
  trailingAction,
}: AsideProps &
  Pick<BannerProps, "content" | "trailingAction"> & { ctas: ReactNode }) => (
  <aside
    aria-live={ariaLive}
    className="flex w-full flex-wrap items-center gap-4 rounded-xl bg-fill-secondary-soft px-4 py-3 text-sm text-text select-none"
    role={role}
  >
    <div className="min-w-0 flex-1 text-text-muted">{content}</div>
    {ctas}
    {trailingAction}
  </aside>
);

const PageBanner = ({
  ariaLive,
  content,
  ctas,
  Icon,
  icon,
  iconClassName,
  role,
  title,
  trailingAction,
}: AsideProps &
  Pick<
    BannerProps,
    "content" | "Icon" | "icon" | "iconClassName" | "title" | "trailingAction"
  > & { ctas: ReactNode }) => (
  <aside
    aria-live={ariaLive}
    className={cn(
      STATUS_VARS,
      "w-full shrink-0 bg-panel-tertiary text-text select-none"
    )}
    role={role}
  >
    <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-2 py-4 md:px-6 lg:py-6">
      <div className="mx-2 min-w-0 grow md:mx-4">
        <div className="flex items-center gap-4">
          <div className="hidden shrink-0 text-(color:--bn-warning) md:block">
            {iconOrComponent(icon, Icon, iconClassName)}
          </div>
          <div className="text-lg font-semibold">{title}</div>
        </div>
        <div className="text-base md:ms-8">{content}</div>
      </div>
      {ctas}
      {trailingAction}
    </div>
  </aside>
);

const PageNoticeBanner = ({
  ariaLive,
  content,
  ctas,
  flags,
  Icon,
  icon,
  role,
  trailingAction,
  type,
}: AsideProps &
  Pick<BannerProps, "content" | "Icon" | "icon" | "trailingAction" | "type"> & {
    ctas: ReactNode;
    flags: BannerFlags;
  }) => (
  <aside
    aria-live={ariaLive}
    className={cn(
      STATUS_VARS,
      "flex min-h-13 w-full flex-wrap items-center gap-2 border-b px-5 py-2 text-sm text-text select-none md:flex-nowrap",
      type === "infoAccent"
        ? "border-(--bn-info)/40 bg-(--bn-info-surface)"
        : "border-(--ck-palette-border) bg-panel"
    )}
    role={role}
  >
    {iconOrComponent(icon, Icon)}
    <div
      className={cn(
        "min-w-0 flex-1 leading-5",
        !flags.narrowStack && "md:truncate"
      )}
    >
      {content}
    </div>
    {ctas}
    {trailingAction}
  </aside>
);

const PrivacyNoticeBanner = ({
  ariaLive,
  content,
  ctas,
  Icon,
  icon,
  iconClassName,
  role,
  title,
  trailingAction,
}: AsideProps &
  Pick<
    BannerProps,
    "content" | "Icon" | "icon" | "iconClassName" | "title" | "trailingAction"
  > & { ctas: ReactNode }) => {
  const FallbackIcon = Icon ?? InfoCircle20Icon;

  const glyph = isNode(icon) ? (
    icon
  ) : (
    <FallbackIcon className={cn("text-text-muted", iconClassName)} />
  );

  return (
    <aside
      aria-live={ariaLive}
      className="flex items-center gap-3 rounded-xl bg-fill-primary-transparent-hover p-3 select-none"
      role={role}
    >
      {glyph}
      <div className="flex min-w-0 flex-1 flex-col">
        {has(title) ? (
          <div className="text-xs font-medium text-text">{title}</div>
        ) : null}
        <div className="text-xs text-text-muted">{content}</div>
        {ctas}
      </div>
      {trailingAction}
    </aside>
  );
};

const BeaconBanner = ({
  ariaLive,
  attached,
  content,
  ctas,
  role,
  title,
  trailingAction,
  variant,
}: AsideProps &
  Pick<BannerProps, "content" | "title" | "trailingAction" | "variant"> & {
    attached: boolean;
    ctas: ReactNode;
  }) => {
  const auth = variant === "authUpsell";

  const body = isNode(title) ? (
    <div className={cn(styles.body, styles.noVisual)}>
      <div className={styles.copy}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.description}>{content}</div>
      </div>
    </div>
  ) : (
    content
  );

  return (
    <div className={cn(styles.container, attached && styles.composer)}>
      <aside
        aria-live={ariaLive}
        className={auth ? styles.authUpsellSurface : styles.surface}
        role={role}
      >
        <div className={auth ? styles.authUpsellContent : styles.content}>
          {body}
        </div>
        {ctas}
        {has(trailingAction) ? (
          <div className={styles.dismiss}>{trailingAction}</div>
        ) : null}
      </aside>
    </div>
  );
};

// --- the default family: default, callout, embedded, announcement, ... -----

type DocumentVariant =
  | "announcement"
  | "announcementInset"
  | "callout"
  | "catalog"
  | "default"
  | "embedded"
  | "settings";

const DOCUMENT_VARIANTS: ReadonlySet<BannerVariant> = new Set<BannerVariant>([
  "announcement",
  "announcementInset",
  "callout",
  "catalog",
  "default",
  "embedded",
  "settings",
]);

const isDocumentVariant = (
  variant: BannerVariant
): variant is DocumentVariant => DOCUMENT_VARIANTS.has(variant);

const TYPE_BORDER: Record<Exclude<BannerType, "normal">, string> = {
  caution: "border-(--ck-palette-border) text-text",
  error: "border-(--bn-danger)/20 text-(color:--bn-danger)",
  infoAccent: "border-(--bn-info)/40 text-text",
  success: "border-(--bn-green)/30 text-(color:--bn-green)",
  warning: "border-(--bn-warning)/30 text-text",
};

const normalBorder = (variant: DocumentVariant, flags: BannerFlags) => {
  if (flags.callout) {
    return "text-text border-(--ck-palette-border-heavy)";
  }

  return variant === "settings"
    ? "text-text border-(--ck-palette-border)"
    : "text-text border-(--ck-palette-border-heavy)";
};

const borderClass = (
  type: BannerType,
  variant: DocumentVariant,
  flags: BannerFlags
) => (type === "normal" ? normalBorder(variant, flags) : TYPE_BORDER[type]);

const NORMAL_WASH: Record<Exclude<DocumentVariant, "default">, string> = {
  announcement: "bg-panel-elevated",
  announcementInset: "bg-panel-tertiary",
  callout: "bg-panel-elevated",
  catalog: "bg-panel-elevated",
  embedded: "bg-transparent",
  settings: "bg-panel",
};

const TYPE_WASH: Record<Exclude<BannerType, "normal" | "warning">, string> = {
  caution: "bg-(--bn-caution)/15",
  error: "bg-(--bn-danger-surface)/20",
  infoAccent: "bg-fill-primary-soft",
  success: "bg-(--bn-green)/15",
};

const washClass = (
  type: BannerType,
  variant: DocumentVariant,
  flags: BannerFlags
) => {
  if (type === "warning") {
    return flags.warningCallout
      ? "bg-(--bn-warning-surface)/15"
      : "bg-(--bn-warning-surface)/30";
  }

  if (type !== "normal") {
    return TYPE_WASH[type];
  }

  if (variant !== "default") {
    return NORMAL_WASH[variant];
  }

  return flags.attached && !flags.compactAttached
    ? "bg-panel-tertiary"
    : "bg-transparent";
};

const ICON_TONE: Partial<Record<BannerType, string>> = {
  infoAccent: "text-(color:--bn-info)",
  success: "text-(color:--bn-green)",
  warning: "text-(color:--bn-warning)",
};

const SURFACE_SHADOW = "shadow-(--shadow-subtle) lg:mx-auto";

const defaultSurfaceClass = (props: BannerProps, flags: BannerFlags) => {
  if (flags.attached) {
    return cn(
      SURFACE_SHADOW,
      "-mb-9 rounded-t-[32px] rounded-b-none border border-b-0 pb-9",
      flags.compactAttached ? "ps-5 pe-3 pt-4" : "ps-4 pe-2.5 pt-2.5"
    );
  }

  return cn(
    SURFACE_SHADOW,
    "rounded-3xl border-0 ring-[0.5px] ring-(--ck-palette-border-heavy)",
    props.density === "compact" ? "py-2 ps-3 pe-2" : "py-4 ps-5 pe-3"
  );
};

const VARIANT_SURFACE: Record<Exclude<DocumentVariant, "default">, string> = {
  announcement: "rounded-3xl px-5 py-4 shadow-xs",
  announcementInset: "rounded-3xl px-5 py-4 shadow-xs",
  callout: "rounded-md px-4 py-3",
  catalog: cn("px-5 py-4", styles.catalog),
  embedded: "py-4 ps-5 pe-3",
  settings: "rounded-2xl py-4 ps-5 pe-3",
};

const variantSurfaceClass = (
  props: BannerProps,
  variant: DocumentVariant,
  flags: BannerFlags
) =>
  variant === "default"
    ? defaultSurfaceClass(props, flags)
    : VARIANT_SURFACE[variant];

const textSizeClass = (variant: DocumentVariant) => {
  if (variant === "catalog") {
    return "text-[length:var(--text-reading,14px)] leading-5";
  }

  return variant === "announcementInset" ? "text-base" : "text-sm";
};

const documentRootClass = (
  props: BannerProps,
  variant: DocumentVariant,
  flags: BannerFlags
) => {
  const { type = "normal" } = props;

  return cn(
    STATUS_VARS,
    "relative isolate flex w-full overflow-hidden",
    flags.embedded ? "bg-transparent" : "bg-panel",
    variant !== "catalog" && !flags.embedded && "border",
    !flags.documentFamily && "text-pretty",
    textSizeClass(variant),
    variantSurfaceClass(props, variant, flags),
    borderClass(type, variant, flags),
    flags.warningCallout &&
      type === "warning" &&
      "before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-(--bn-warning)/60"
  );
};

const TITLE_CLASS: Record<Exclude<DocumentVariant, "default">, string> = {
  announcement: "text-sm font-medium",
  announcementInset: "text-base font-semibold",
  callout: "text-sm font-medium",
  catalog: "text-[length:var(--text-reading,14px)] leading-5 font-medium",
  embedded: "text-sm font-bold",
  settings: "text-sm font-medium",
};

const titleClassFor = (variant: DocumentVariant, flags: BannerFlags) => {
  if (variant !== "default") {
    return TITLE_CLASS[variant];
  }

  return flags.compactAttached ? "text-sm font-medium" : "text-sm font-bold";
};

const TRACKING_VARIANTS: ReadonlySet<DocumentVariant> =
  new Set<DocumentVariant>(["announcement", "catalog", "settings"]);

const descriptionTone = (
  type: BannerType,
  flags: BannerFlags,
  secondary: boolean
) => {
  if (type === "error") {
    return "text-(color:--bn-danger)";
  }

  if (type === "success") {
    return "text-(color:--bn-green)";
  }

  const isSecondary =
    secondary || flags.documentFamily || flags.warningCallout || flags.attached;

  return isSecondary ? "text-text-muted" : DESCRIPTION_COLOR;
};

interface DocumentContext {
  ctas: ReactNode;
  family: DocumentVariant;
  flags: BannerFlags;
  gap: string;
  iconNode: ReactNode;
  props: BannerProps;
  root: string;
  titleClass: string;
  wash: ReactNode;
}

const DocumentDescription = ({
  context,
  extra,
}: {
  context: DocumentContext;
  extra?: string;
}) => {
  const { family, flags, props } = context;
  const { content, title, type = "normal" } = props;
  const plain = !flags.callout && !flags.documentFamily;

  return (
    <div className={cn("flex min-w-0 flex-1 flex-col", extra)}>
      <div
        className={cn(
          "min-w-0 flex-1",
          flags.inline && "truncate",
          plain && "leading-relaxed",
          flags.documentFamily && "leading-5",
          TRACKING_VARIANTS.has(family) && "tracking-[-0.01125rem]",
          plain && !flags.inline && "text-pretty",
          (has(title) || flags.attached) &&
            descriptionTone(type, flags, flags.callout)
        )}
      >
        {content}
      </div>
    </div>
  );
};

const TitleRow = ({ context }: { context: DocumentContext }) => {
  const { iconNode, props, titleClass } = context;

  return (
    <div className="flex items-center gap-1">
      {iconNode}
      {has(props.title) ? <h3 className={titleClass}>{props.title}</h3> : null}
    </div>
  );
};

const VerticalLayout = ({ context }: { context: DocumentContext }) => {
  const { ctas, gap, iconNode, props, root, wash } = context;

  return (
    <aside
      aria-live={props.ariaLive}
      className={cn(root, "flex-col", gap)}
      role={props.role}
    >
      {wash}
      {isNode(iconNode) || has(props.title) ? (
        <TitleRow context={context} />
      ) : null}
      <DocumentDescription context={context} extra={gap} />
      {ctas}
    </aside>
  );
};

const VerticalIconLayout = ({ context }: { context: DocumentContext }) => {
  const { ctas, flags, gap, iconNode, props, root, titleClass, wash } = context;
  const topAligned = flags.callout || props.variant === "settings";

  return (
    <aside
      aria-live={props.ariaLive}
      className={cn(root, "gap-3", topAligned && "items-start")}
      role={props.role}
    >
      {wash}
      {isNode(iconNode) ? (
        <div
          className={
            topAligned
              ? "flex h-lh items-center"
              : "flex items-center self-center"
          }
        >
          {iconNode}
        </div>
      ) : null}
      <div className={cn("flex min-w-0 flex-1 flex-col", gap)}>
        {has(props.title) ? (
          <h3 className={titleClass}>{props.title}</h3>
        ) : null}
        <DocumentDescription context={context} />
        {ctas}
      </div>
    </aside>
  );
};

const stackedRowClass = (props: BannerProps, flags: BannerFlags) => {
  if (!flags.stackedCtas) {
    return "items-center gap-3";
  }

  if (flags.attached) {
    return "items-start gap-x-3 @min-[560px]:items-center @max-[400px]:flex-wrap @max-[400px]:gap-y-2 @max-[400px]:px-3";
  }

  return props.density === "compact"
    ? "items-start gap-x-3 @min-[560px]:items-center @max-[560px]:flex-wrap @max-[560px]:px-2.5"
    : "items-start gap-x-3 @min-[560px]:items-center @max-[560px]:flex-wrap @max-[560px]:px-4";
};

const StackedLayout = ({ context }: { context: DocumentContext }) => {
  const { ctas, flags, iconNode, props, root, titleClass, wash } = context;

  return (
    <div className="@container w-full">
      <aside
        aria-live={props.ariaLive}
        className={cn(
          root,
          stackedRowClass(props, flags),
          flags.narrowStackCallout && NARROW_CALLOUT_ROW
        )}
        role={props.role}
      >
        {wash}
        {iconNode}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            flags.warningCallout && "gap-0.5"
          )}
        >
          {has(props.title) ? (
            <h3
              className={
                flags.stackedCtas
                  ? titleClass
                  : "text-sm font-semibold text-pretty"
              }
            >
              {props.title}
            </h3>
          ) : null}
          <DocumentDescription context={context} />
        </div>
        {ctas}
        {flags.stackedCtas && has(props.trailingAction) ? (
          <div className="flex shrink-0 items-start @min-[560px]:self-center">
            {props.trailingAction}
          </div>
        ) : null}
      </aside>
    </div>
  );
};

const defaultColumnClass = (flags: BannerFlags) => {
  if (flags.inline) {
    return "items-center justify-between gap-3";
  }

  if (flags.documentFamily) {
    return "flex-wrap items-center gap-x-8 gap-y-3";
  }

  return flags.attached
    ? "flex-col @min-[400px]:flex-row @min-[400px]:items-start @min-[400px]:justify-between @min-[400px]:gap-3"
    : "flex-col @min-[560px]:flex-row @min-[560px]:items-center @min-[560px]:justify-between @min-[560px]:gap-8";
};

const DefaultLayout = ({ context }: { context: DocumentContext }) => {
  const { ctas, flags, iconNode, props, root, titleClass, wash } = context;

  return (
    <aside
      aria-live={props.ariaLive}
      className={cn(root, "@container items-start gap-4")}
      role={props.role}
    >
      {wash}
      <div
        className={cn(
          "flex h-full w-full gap-3",
          flags.documentFamily
            ? "items-center"
            : "items-start @min-[560px]:items-center"
        )}
      >
        {isNode(iconNode) ? (
          <div
            className={cn(
              "flex items-start",
              !flags.documentFamily && "pt-0.5"
            )}
          >
            {iconNode}
          </div>
        ) : null}
        <div className={cn("flex min-w-0 grow", defaultColumnClass(flags))}>
          <div
            className={cn(
              "flex min-w-0 flex-col",
              flags.documentFamily ? "grow basis-64 wrap-break-word" : "flex-1"
            )}
          >
            {has(props.title) ? (
              <h3 className={titleClass}>{props.title}</h3>
            ) : null}
            <DocumentDescription context={context} />
          </div>
          {ctas}
        </div>
      </div>
      {has(props.trailingAction) ? (
        <div className="flex shrink-0 items-start @min-[560px]:self-center">
          {props.trailingAction}
        </div>
      ) : null}
    </aside>
  );
};

const documentIconClass = (props: BannerProps, flags: BannerFlags) =>
  cn(
    !flags.callout && !flags.documentFamily && "size-4.5 shrink-0",
    flags.documentFamily && "size-6 shrink-0 text-text-muted",
    ICON_TONE[props.type ?? "normal"],
    props.iconClassName
  );

const DocumentBanner = (props: BannerProps) => {
  const { Icon, icon, type = "normal", variant = "default" } = props;
  const flags = getFlags(props);

  const family: DocumentVariant = isDocumentVariant(variant)
    ? variant
    : "default";

  const ctas = renderCtas(props, flags);

  const context: DocumentContext = {
    ctas,
    family,
    flags,
    gap: flags.callout ? "gap-1" : "gap-1.5",
    iconNode: iconOrComponent(icon, Icon, documentIconClass(props, flags)),
    props,
    root: documentRootClass(props, family, flags),
    titleClass: titleClassFor(family, flags),
    wash: (
      <div
        aria-hidden
        className={cn("absolute inset-0 -z-10", washClass(type, family, flags))}
      />
    ),
  };

  if (flags.vertical) {
    return <VerticalLayout context={context} />;
  }

  if (flags.verticalIcon) {
    return <VerticalIconLayout context={context} />;
  }

  if (flags.warningCallout || (flags.stackedCtas && has(ctas))) {
    return <StackedLayout context={context} />;
  }

  return <DefaultLayout context={context} />;
};

// The variants that read the shared call-to-action row.
const CtaBanner = (props: BannerProps) => {
  const {
    ariaLive,
    content,
    Icon,
    icon,
    iconClassName,
    role,
    title,
    trailingAction,
    type,
    variant = "default",
  } = props;

  const aside: AsideProps = { ariaLive, role };
  const flags = getFlags(props);
  const ctas = renderCtas(props, flags);

  if (variant === "insetNotice") {
    return (
      <InsetNoticeBanner
        {...aside}
        content={content}
        ctas={ctas}
        trailingAction={trailingAction}
      />
    );
  }

  if (variant === "page") {
    return (
      <PageBanner
        {...aside}
        content={content}
        ctas={ctas}
        Icon={Icon}
        icon={icon}
        iconClassName={iconClassName}
        title={title}
        trailingAction={trailingAction}
      />
    );
  }

  if (variant === "pageNotice") {
    return (
      <PageNoticeBanner
        {...aside}
        content={content}
        ctas={ctas}
        flags={flags}
        Icon={Icon}
        icon={icon}
        trailingAction={trailingAction}
        type={type}
      />
    );
  }

  if (variant === "privacyNotice") {
    return (
      <PrivacyNoticeBanner
        {...aside}
        content={content}
        ctas={ctas}
        Icon={Icon}
        icon={icon}
        iconClassName={iconClassName}
        title={title}
        trailingAction={trailingAction}
      />
    );
  }

  if (flags.beaconSurface) {
    return (
      <BeaconBanner
        {...aside}
        attached={flags.attached}
        content={content}
        ctas={ctas}
        title={title}
        trailingAction={trailingAction}
        variant={variant}
      />
    );
  }

  return <DocumentBanner {...props} />;
};

/**
 * Banner: an inline notice, rendered as an `<aside>`. Roles and
 * `aria-live` are passed through as given; there is no default role.
 */
export const Banner = (props: BannerProps) => {
  const {
    ariaLive,
    content,
    customCtas,
    icon,
    role,
    title,
    trailingAction,
    type,
    variant = "default",
  } = props;

  const aside: AsideProps = { ariaLive, role };

  if (variant === "composerContext") {
    return <ComposerContextBanner {...aside} content={content} />;
  }

  if (variant === "recovery") {
    return (
      <RecoveryBanner
        content={content}
        customCtas={customCtas}
        icon={icon}
        title={title}
      />
    );
  }

  if (variant === "browserNotice") {
    return (
      <BrowserNoticeBanner
        {...aside}
        content={content}
        customCtas={customCtas}
        icon={icon}
        title={title}
        trailingAction={trailingAction}
      />
    );
  }

  if (variant === "status") {
    return <StatusBanner {...aside} content={content} icon={icon} />;
  }

  if (variant === "informationNotice") {
    return (
      <InformationNoticeBanner
        {...aside}
        content={content}
        Icon={props.Icon}
        icon={icon}
        iconClassName={props.iconClassName}
        title={title}
      />
    );
  }

  if (variant === "promotion") {
    return (
      <PromotionBanner
        {...aside}
        content={content}
        icon={icon}
        trailingAction={trailingAction}
      />
    );
  }

  if (variant === "strip") {
    return (
      <StripBanner
        {...aside}
        content={content}
        icon={icon}
        title={title}
        type={type}
      />
    );
  }

  return <CtaBanner {...props} />;
};

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

export type AlertLevel = "danger" | "info" | "success" | "warning";

export type AlertVariant =
  | "successSolid"
  | "dangerSolid"
  | "default"
  | "successNeutral";

const ALERT_ICONS = {
  danger: ExclamationCircle16Icon,
  info: InfoCircle16Icon,
  success: CheckCircle16Icon,
  warning: ExclamationCircle16Icon,
} as const;

export interface AlertBoxProps {
  actions?: ReactNode;
  actionsInline?: boolean;
  /** Adds `role="alert"`. */
  announce?: boolean;
  children?: ReactNode;
  className?: string;
  /** Accessible name of the close button. */
  closeLabel?: string;
  contentAlignment?: "center";
  fullWidth?: boolean;
  icon?: IconComponent;
  leading?: ReactNode;
  level?: AlertLevel;
  onRemove?: MouseEventHandler<HTMLButtonElement>;
  richColors?: boolean;
  testId?: string;
  variant?: AlertVariant;
}

const SOLID_SURFACE: Record<Exclude<AlertVariant, "default">, string> = {
  successSolid: "border-transparent bg-(--bn-success-solid) text-white",
  dangerSolid: "border-transparent bg-(--bn-danger-solid) text-white",
  successNeutral:
    "border-transparent bg-(--ck-palette-ink) text-(color:--theme-background-control-opaque)",
};

const LEVEL_SURFACE: Record<AlertLevel, string> = {
  danger: "border-(--bn-danger-outline) bg-(--bn-danger-surface)",
  info: "border-(--ck-palette-border) bg-panel-elevated-secondary",
  success: "border-(--ck-palette-border) bg-panel-elevated-secondary",
  warning: "border-(--bn-warning-outline) bg-(--bn-warning-surface)",
};

const RICH_SUCCESS_SURFACE = "border-(--bn-green)/20 bg-(--bn-success-surface)";

const RICH_TEXT: Record<Exclude<AlertLevel, "info">, string> = {
  danger: "text-(color:--bn-danger)",
  success: "text-(color:--bn-green)",
  warning: "text-(color:--bn-warning)",
};

const alertSurface = (
  level: AlertLevel,
  variant: AlertVariant,
  richColors: boolean
) => {
  if (variant !== "default") {
    return SOLID_SURFACE[variant];
  }

  const surface =
    level === "success" && richColors
      ? RICH_SUCCESS_SURFACE
      : LEVEL_SURFACE[level];

  return cn(
    surface,
    richColors && level !== "info" ? RICH_TEXT[level] : "text-text"
  );
};

const AlertLeading = ({
  alignSelf,
  Icon,
  leading,
  plain,
}: {
  alignSelf: string | false;
  Icon: IconComponent | undefined;
  leading: ReactNode;
  plain: boolean;
}) => {
  if (!(isNode(leading) || Icon)) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex size-6 shrink-0 grow-0 items-center justify-center",
        alignSelf,
        plain && "text-text"
      )}
    >
      {leading ?? (Icon ? <Icon className="size-3.5" /> : null)}
    </div>
  );
};

/**
 * The shared alert box: an inline notification surface that the toast
 * family reuses. `announce` adds `role="alert"` (default true).
 */
export const AlertBox = ({
  actions,
  actionsInline = false,
  announce = true,
  children,
  className,
  closeLabel = "Close",
  contentAlignment,
  fullWidth,
  icon,
  leading,
  level = "info",
  onRemove,
  richColors = false,
  testId,
  variant = "default",
}: AlertBoxProps) => {
  const centered = contentAlignment === "center";
  const alignSelf = !centered && "self-start";

  return (
    <div
      className={cn(
        STATUS_VARS,
        "pointer-events-auto inline-flex flex-col gap-2 rounded-xl border px-3 py-2 text-base leading-[1.4]",
        fullWidth === true && "flex",
        alertSurface(level, variant, richColors),
        className
      )}
      data-testid={testId}
      role={announce ? "alert" : undefined}
    >
      <div
        className={cn(
          "flex min-w-0",
          centered ? "items-center gap-3" : "items-start gap-1"
        )}
      >
        <AlertLeading
          alignSelf={alignSelf}
          Icon={icon}
          leading={leading}
          plain={variant === "default" && !richColors}
        />
        <div
          className={cn(
            "flex min-w-0 flex-1 gap-3",
            centered ? "items-center" : "items-start"
          )}
        >
          <div className="min-w-0 flex-1 justify-center gap-2 break-words">
            {typeof children === "string" ? (
              <div className="font-medium">{children}</div>
            ) : (
              children
            )}
          </div>
          {actionsInline && isNode(actions) ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
        {onRemove ? (
          <button
            aria-label={closeLabel}
            className={cn(
              "flex size-6 shrink-0 grow-0 cursor-(--ck-action-cursor) items-center justify-center rounded-full hover:bg-fill-primary-transparent-hover/5",
              alignSelf
            )}
            onClick={onRemove}
            type="button"
          >
            <Close16Icon aria-hidden={false} />
          </button>
        ) : null}
      </div>
      {!actionsInline && isNode(actions) ? (
        <div className="flex items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
};

export interface AlertAction {
  label: ReactNode;
  loading?: boolean;
  onClick: () => void;
}

export interface AlertProps {
  actionPlacement?: "inline";
  closeLabel?: string;
  description?: ReactNode;
  leading?: ReactNode;
  level: AlertLevel;
  onClose?: MouseEventHandler<HTMLButtonElement>;
  primaryAction?: AlertAction;
  secondaryAction?: AlertAction;
  testId?: string;
  title?: ReactNode;
  variant?: AlertVariant;
}

const LEVEL_DESCRIPTION: Record<AlertLevel, string> = {
  danger: "text-(color:--bn-danger)",
  info: "text-text-muted",
  success: "text-(color:--bn-green)",
  warning: "text-(color:--bn-warning)",
};

const SOLID_DESCRIPTION: Record<Exclude<AlertVariant, "default">, string> = {
  successSolid: "text-sm font-normal",
  dangerSolid: "text-white",
  successNeutral: "text-(color:--theme-background-control-opaque)/80",
};

const alertDescriptionTone = (level: AlertLevel, variant: AlertVariant) =>
  variant === "default" ? LEVEL_DESCRIPTION[level] : SOLID_DESCRIPTION[variant];

const primaryActionColor = (variant: AlertVariant): ButtonColor => {
  if (variant === "successSolid") {
    return "successOutline";
  }

  return variant === "successNeutral" ? "tinted" : "primary";
};

const AlertActions = ({
  primaryAction,
  secondaryAction,
  variant,
}: Pick<AlertProps, "primaryAction" | "secondaryAction"> & {
  variant: AlertVariant;
}) => {
  const size =
    variant === "successNeutral" || variant === "successSolid"
      ? "actionSm"
      : "compact";

  return (
    <>
      {secondaryAction === undefined ? null : (
        <Button
          color={variant === "successSolid" ? "successOutline" : "secondary"}
          loading={secondaryAction.loading}
          onClick={() => {
            secondaryAction.onClick();
          }}
          size={size}
        >
          {secondaryAction.label}
        </Button>
      )}
      {primaryAction === undefined ? null : (
        <Button
          color={primaryActionColor(variant)}
          loading={primaryAction.loading}
          onClick={() => {
            primaryAction.onClick();
          }}
          size={size}
        >
          {primaryAction.label}
        </Button>
      )}
    </>
  );
};

/**
 * Alert: the content of an inline alert or toast: level icon, title,
 * description, up to two actions and a close button when `onClose` is given.
 * It never sets `role="alert"` (`announce` is false).
 */
export const Alert = ({
  actionPlacement,
  closeLabel,
  description,
  leading,
  level,
  onClose,
  primaryAction,
  secondaryAction,
  testId,
  title,
  variant = "default",
}: AlertProps) => {
  const inline = actionPlacement === "inline";

  const hasActions =
    primaryAction !== undefined || secondaryAction !== undefined;

  const LevelIcon =
    variant === "successSolid" ? CheckCircle20Icon : ALERT_ICONS[level];

  return (
    <AlertBox
      actions={
        hasActions ? (
          <AlertActions
            primaryAction={primaryAction}
            secondaryAction={secondaryAction}
            variant={variant}
          />
        ) : undefined
      }
      actionsInline={inline || !isNode(description)}
      announce={false}
      className={cn(
        styles.alert,
        variant === "successSolid" && styles.successSolid,
        "leading-normal",
        inline && "w-max"
      )}
      closeLabel={closeLabel}
      contentAlignment={inline ? "center" : undefined}
      fullWidth
      leading={
        leading === undefined ? <LevelIcon aria-hidden={false} /> : leading
      }
      level={level}
      onRemove={onClose}
      richColors
      testId={testId}
      variant={variant}
    >
      <div className="min-w-0">
        <div
          className={cn(
            "flex min-h-6 items-center text-start whitespace-pre-wrap",
            variant === "successSolid"
              ? "text-base font-semibold"
              : "font-medium"
          )}
        >
          {title}
        </div>
        {isNode(description) ? (
          <div
            className={cn("text-start", alertDescriptionTone(level, variant))}
          >
            {description}
          </div>
        ) : null}
      </div>
    </AlertBox>
  );
};

// ---------------------------------------------------------------------------
// Eyebrow notice
// ---------------------------------------------------------------------------

export interface EyebrowNoticeProps {
  actions?: ReactNode;
  content?: ReactNode;
  title?: ReactNode;
}

/**
 * The eyebrow notice: a status `<aside>` that sits above the composer
 * and is overlapped by it.
 */
export const EyebrowNotice = ({
  actions,
  content,
  title,
}: EyebrowNoticeProps) => (
  <div className={styles.eyebrowContainer}>
    {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders an aside with role="status". */}
    <aside aria-live="polite" className={styles.eyebrow} role="status">
      <div className={styles.eyebrowCopy}>
        <h3 className={styles.eyebrowTitle}>{title}</h3>
        <div className={styles.eyebrowDescription}>{content}</div>
      </div>
      <div className={styles.eyebrowActions}>{actions}</div>
    </aside>
  </div>
);

// ---------------------------------------------------------------------------
// Composer-attached notice
// ---------------------------------------------------------------------------

export interface ComposerNoticeAction {
  ariaLabel?: string;
  disabled?: boolean;
  icon?: IconComponent;
  label?: ReactNode;
  loading?: boolean;
  onClick?: ButtonProps["onClick"];
}

type ComposerActionAppearance = "accent" | "dismiss" | "primary" | "secondary";

// The composer button; with an appearance it drops the button styling for
// the notice's own.
const ComposerActionButton = ({
  appearance,
  className,
  uniform,
  ...props
}: ButtonProps & { appearance?: ComposerActionAppearance }) => (
  <Button
    {...props}
    className={cn(
      appearance !== undefined && [
        "gap-1 rounded-full",
        appearance === "dismiss" || uniform === true
          ? styles.dismissButton
          : styles.action,
        appearance === "primary" && styles.primary,
        appearance === "secondary" && styles.secondary,
      ],
      className
    )}
    color={appearance === "accent" ? "upgrade" : props.color}
    uniform={uniform}
    unstyled={appearance !== undefined && appearance !== "accent"}
  />
);

const beaconAppearance = (
  kind: "dismiss" | "primary" | "secondary",
  iconOnly: boolean
): ComposerActionAppearance => {
  if (kind === "primary") {
    return "primary";
  }

  return iconOnly ? "dismiss" : "secondary";
};

const plainActionTone = (iconOnly: boolean) =>
  iconOnly
    ? "border-transparent text-(color:--ck-palette-ink-tertiary) hover:text-text"
    : "px-3 [@container_(max-width:400px)]:flex-1 [@container_(max-width:400px)]:justify-center";

const ComposerNoticeActionButton = ({
  action,
  buttonRef,
  kind,
  variant = "default",
}: {
  action: ComposerNoticeAction;
  buttonRef?: Ref<HTMLButtonElement>;
  kind: "dismiss" | "primary" | "secondary";
  variant?: "beacon" | "default";
}) => {
  const ActionIcon = action.icon;
  const beacon = variant === "beacon";
  const beaconDismiss = beacon && kind === "dismiss";

  const iconOnly =
    beaconDismiss ||
    (ActionIcon !== undefined &&
      (action.label === undefined || action.label === null));

  const handleClick = action.onClick;

  return (
    <ComposerActionButton
      appearance={beacon ? beaconAppearance(kind, iconOnly) : undefined}
      aria-label={action.ariaLabel}
      className={beacon ? undefined : plainActionTone(iconOnly)}
      color={kind === "primary" ? "primary" : "ghost"}
      disabled={action.disabled}
      loading={action.loading}
      onClick={handleClick}
      radius="full"
      ref={buttonRef}
      size="composerSm"
      uniform={iconOnly}
    >
      {beaconDismiss ? (
        <>
          <Close20Icon className={styles.desktopDismiss} />
          <span aria-hidden="true" className={styles.mobileDismiss}>
            <CrossedLargeIcon />
          </span>
        </>
      ) : null}
      {ActionIcon && !beaconDismiss ? (
        <ActionIcon className={beacon ? undefined : "size-3.5"} />
      ) : null}
      {action.label}
    </ComposerActionButton>
  );
};

export interface ComposerAttachedNoticeProps {
  actionsPlacement?: "aside" | "body" | "bodyOnNarrow";
  additionalActions?: ReactNode;
  attachedToComposer?: boolean;
  badge?: ReactNode;
  density?: BannerDensity;
  description?: ReactNode;
  dismissAction?: ComposerNoticeAction;
  leadingVisual?: ReactNode;
  primaryAction?: ComposerNoticeAction;
  primaryActionRef?: Ref<HTMLButtonElement>;
  secondaryAction?: ComposerNoticeAction;
  title?: ReactNode;
  variant?: "beacon" | "default";
}

const PLACEMENT_CLASS = {
  aside:
    "self-center [@container_(max-width:400px)]:w-full [@container_(max-width:400px)]:self-stretch [@container_(max-width:400px)]:justify-center",
  body: "mt-3 w-full justify-end",
  bodyOnNarrow: "justify-start [@container_(max-width:400px)]:mt-3",
} as const;

const NoticeActions = ({
  beaconSurface,
  extra,
  props,
}: {
  beaconSurface: boolean;
  extra?: string;
  props: ComposerAttachedNoticeProps;
}) => {
  const {
    actionsPlacement = "aside",
    additionalActions,
    dismissAction,
    primaryAction,
    primaryActionRef,
    secondaryAction,
    variant = "default",
  } = props;

  return (
    <div
      className={cn(
        beaconSurface ? styles.actions : "flex items-center gap-2",
        !beaconSurface && variant === "beacon" && "min-w-0 flex-wrap",
        beaconSurface && actionsPlacement === "aside"
          ? undefined
          : PLACEMENT_CLASS[actionsPlacement],
        extra
      )}
    >
      {secondaryAction ? (
        <ComposerNoticeActionButton
          action={secondaryAction}
          kind="secondary"
          variant={variant}
        />
      ) : null}
      {primaryAction ? (
        <ComposerNoticeActionButton
          action={primaryAction}
          buttonRef={primaryActionRef}
          kind="primary"
          variant={variant}
        />
      ) : null}
      {dismissAction && variant !== "beacon" ? (
        <ComposerNoticeActionButton action={dismissAction} kind="dismiss" />
      ) : null}
      {additionalActions}
    </div>
  );
};

const noticeTitleClass = (
  beaconSurface: boolean,
  variant: "beacon" | "default"
) => {
  if (beaconSurface) {
    return styles.title;
  }

  return cn(
    "min-w-0 text-text",
    variant === "beacon" ? "text-sm font-bold" : "text-base font-medium"
  );
};

const noticeDescriptionClass = (
  beaconSurface: boolean,
  variant: "beacon" | "default"
) => {
  if (beaconSurface) {
    return styles.description;
  }

  return cn(
    "text-sm text-pretty text-text-muted",
    variant === "beacon" ? "leading-5" : "leading-tight"
  );
};

const NoticeBody = ({
  bodyActions,
  beaconSurface,
  narrowBodyActions,
  props,
}: {
  beaconSurface: boolean;
  bodyActions: boolean;
  narrowBodyActions: boolean;
  props: ComposerAttachedNoticeProps;
}) => {
  const {
    actionsPlacement = "aside",
    badge,
    description,
    leadingVisual,
    title,
    variant = "default",
  } = props;

  const visualClass = beaconSurface
    ? styles.visual
    : "flex size-12 shrink-0 items-center justify-center self-center text-text-muted";

  return (
    <div
      className={cn(
        beaconSurface
          ? styles.body
          : "flex min-w-0 items-center gap-2 [@container_(max-width:400px)]:items-start",
        beaconSurface && !has(leadingVisual) && styles.noVisual
      )}
    >
      {has(leadingVisual) ? (
        <div
          className={cn(
            visualClass,
            actionsPlacement === "bodyOnNarrow" &&
              "[@container_(max-width:400px)]:self-start"
          )}
        >
          {leadingVisual}
        </div>
      ) : null}
      <div className={beaconSurface ? styles.copy : "min-w-0 flex-1"}>
        <div className="flex flex-wrap items-center gap-2">
          <div className={noticeTitleClass(beaconSurface, variant)}>
            {title}
          </div>
          {has(badge) ? (
            <span className="inline-flex items-center rounded-sm border border-border bg-transparent px-2 py-1 text-xs leading-none font-medium text-text-muted">
              {badge}
            </span>
          ) : null}
        </div>
        <div className={noticeDescriptionClass(beaconSurface, variant)}>
          {description}
        </div>
        {bodyActions ? (
          <NoticeActions beaconSurface={beaconSurface} props={props} />
        ) : null}
        {narrowBodyActions ? (
          <NoticeActions
            beaconSurface={beaconSurface}
            extra="hidden [@container_(max-width:400px)]:flex"
            props={props}
          />
        ) : null}
      </div>
    </div>
  );
};

/**
 * The composer-attached notice: title, description and up to three
 * actions, shown as a Banner that can tuck under the composer.
 */
export const ComposerAttachedNotice = (props: ComposerAttachedNoticeProps) => {
  const {
    actionsPlacement = "aside",
    additionalActions,
    attachedToComposer = false,
    density,
    dismissAction,
    primaryAction,
    secondaryAction,
    variant = "default",
  } = props;

  const beaconSurface =
    variant === "beacon" && !attachedToComposer && actionsPlacement === "aside";

  const hasActions =
    isNode(additionalActions) ||
    primaryAction !== undefined ||
    secondaryAction !== undefined ||
    (dismissAction !== undefined && variant !== "beacon");

  let customCtas: ReactNode;

  if (hasActions && actionsPlacement === "aside") {
    customCtas = <NoticeActions beaconSurface={beaconSurface} props={props} />;
  } else if (hasActions && actionsPlacement === "bodyOnNarrow") {
    customCtas = (
      <NoticeActions
        beaconSurface={beaconSurface}
        extra="[@container_(max-width:400px)]:hidden"
        props={props}
      />
    );
  }

  return (
    <Banner
      attachedToComposer={attachedToComposer}
      content={
        <NoticeBody
          beaconSurface={beaconSurface}
          bodyActions={hasActions && actionsPlacement === "body"}
          narrowBodyActions={hasActions && actionsPlacement === "bodyOnNarrow"}
          props={props}
        />
      }
      customCtas={customCtas}
      density={density}
      stackOnNarrow
      trailingAction={
        variant === "beacon" && dismissAction ? (
          <ComposerNoticeActionButton
            action={dismissAction}
            kind="dismiss"
            variant="beacon"
          />
        ) : undefined
      }
      variant={beaconSurface ? "beacon" : "default"}
      wrapCtas={variant === "beacon"}
    />
  );
};
