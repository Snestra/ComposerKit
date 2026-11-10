"use client";

/* oxlint-disable shadcn/no-arbitrary-values -- The utilities read host tokens (--ck-detail-page-inline-inset, --ck-detail-page-section-gap, --ck-chat-content-max-width, --ck-row-padding-x, --ck-compose-button-spacing) and set heading line-height 1.2; none has a theme utility here, so each carries the Electron window value as fallback. */

import { MotionDiv, useIsPresent } from "composerkit/components/layout/motion";
import { Button, ButtonLink } from "composerkit/components/ui/button";
import type { ButtonLinkProps } from "composerkit/components/ui/button";
import { isNil, isPresent } from "composerkit/lib/present";
import { useReducedMotion } from "composerkit/lib/reduced-motion";
import { cn } from "composerkit/lib/utils";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import type { ComponentProps, ReactElement, ReactNode, Ref } from "react";

/* ------------------------------------------------------------------ */
/* Layout slot composer                         */
/* ------------------------------------------------------------------ */

type HeaderPlacement = "inline" | "page" | "scroll" | "sticky" | "toolbar";

interface LayoutSlots {
  content?: ReactNode;
  header?: ReactNode;
  headerPlacement?: HeaderPlacement;
  panels?: ReactNode;
}

interface LayoutProps extends LayoutSlots {
  renderLayout?: (slots: LayoutSlots) => ReactNode;
}

/** The header then the content, unless renderLayout takes the slots over. */
const Layout = ({
  content,
  header,
  headerPlacement,
  panels,
  renderLayout,
}: LayoutProps) =>
  renderLayout ? (
    <>{renderLayout({ content, header, headerPlacement, panels })}</>
  ) : (
    <>
      {header}
      {content}
    </>
  );

/* ------------------------------------------------------------------ */
/* PageHeader                              */
/* ------------------------------------------------------------------ */

type PageHeaderVariant = "default" | "page" | "settings" | "settingsCompact";

// .heading-lg (24px), .heading-xl (28px) and .heading-base. The Electron window applies electron:heading-lg in place of
// heading-base and electron:heading-xl in place of heading-lg for the page
// variant, so those are the values here.
const HEADING_LG = "text-title-lg leading-[1.2] font-medium";

const HEADING_XL = "text-title-app leading-[1.2] font-medium";

const pageHeaderTitleClasses = {
  default: HEADING_LG,
  page: HEADING_XL,
  settings: cn(HEADING_LG, "font-normal"),
  settingsCompact: cn(HEADING_LG, "leading-7 font-semibold"),
} as const satisfies Record<PageHeaderVariant, string>;

interface PageHeaderProps {
  actions?: ReactNode;
  asset?: ReactNode;
  subtitle?: ReactNode;
  subtitleClassName?: string;
  subtitleWrap?: "balance";
  title?: ReactNode;
  variant?: PageHeaderVariant;
}

const PageHeader = ({
  actions,
  asset,
  subtitle,
  subtitleClassName,
  subtitleWrap,
  title,
  variant = "default",
}: PageHeaderProps) => (
  <header className="flex flex-col gap-4 px-[var(--ck-detail-page-inline-inset,0px)]">
    {isNil(asset) ? null : <div className="flex">{asset}</div>}
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-4",
        variant === "page" ? "flex-nowrap" : "flex-wrap"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 basis-64 flex-col",
          variant === "settingsCompact" ? "gap-1.25" : "gap-1.5"
        )}
      >
        <h1
          className={cn(
            "min-w-0 break-words text-text",
            pageHeaderTitleClasses[variant]
          )}
        >
          {title}
        </h1>
        {isNil(subtitle) ? null : (
          <div
            className={cn(
              "text-base text-text-muted",
              subtitleWrap === "balance" && "text-balance",
              subtitleClassName
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
      {isNil(actions) ? null : (
        <div className="flex max-w-full shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  </header>
);

/* ------------------------------------------------------------------ */
/* ContentSection                      */
/* ------------------------------------------------------------------ */

interface ContentSectionProps {
  actions?: ReactNode;
  ariaLabel?: string;
  children?: ReactNode;
  compact?: boolean;
  ref?: Ref<HTMLElement>;
  tabIndex?: number;
  title?: ReactNode;
}

const ContentSection = ({
  actions,
  ariaLabel,
  children,
  compact = false,
  ref,
  tabIndex,
  title,
}: ContentSectionProps) => (
  <section
    ref={ref}
    aria-label={ariaLabel}
    className={cn("flex min-h-0 flex-col gap-2", !compact && "flex-1")}
    tabIndex={tabIndex}
  >
    {isPresent(title) || isPresent(actions) ? (
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    ) : null}
    {children}
  </section>
);

/* ------------------------------------------------------------------ */
/* ContentGrid                            */
/* ------------------------------------------------------------------ */

interface ContentGridProps {
  children?: ReactNode;
}

/** One column, two from the @md container width and three from @2xl. The parent must be an @container. */
const ContentGrid = ({ children }: ContentGridProps) => (
  <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* DetailPage                              */
/* ------------------------------------------------------------------ */

// The shared section stack class.
const detailPageSectionClassName =
  "flex flex-col gap-[var(--ck-detail-page-section-gap)]";

interface DetailPageProps {
  children?: ReactNode;
}

// --ck-row-padding-x is 8px in most themes (2 spacing steps) and
// --ck-chat-content-max-width is 48rem on the Electron window body
//; an embed can set it to none.
const DetailPage = ({ children }: DetailPageProps) => (
  <div
    className={cn(
      detailPageSectionClassName,
      "@container mx-auto w-full max-w-[var(--ck-chat-content-max-width,48rem)] [--ck-detail-page-inline-inset:var(--ck-row-padding-x,calc(var(--spacing)*2))] [--ck-detail-page-section-gap:calc(var(--spacing)*6)]"
    )}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* BulletSeparator                    */
/* ------------------------------------------------------------------ */

interface BulletSeparatorProps {
  className?: string;
}

/** The middle dot between inline items, hidden on the last one. */
const BulletSeparator = ({ className }: BulletSeparatorProps) => (
  <span aria-hidden="true" className={cn("last:hidden", className)}>
    ·
  </span>
);

/* ------------------------------------------------------------------ */
/* ToolbarBreadcrumb                */
/* ------------------------------------------------------------------ */

type BreadcrumbLinkProps = Omit<
  ButtonLinkProps,
  "children" | "className" | "color" | "size" | "to"
> & { to: NonNullable<ButtonLinkProps["to"]> };

type BreadcrumbAncestor = { id: string } & (
  | { content: ReactElement }
  | (BreadcrumbLinkProps & { label: ReactNode })
  | {
      label: ReactNode;
      onClick?: ComponentProps<typeof Button>["onClick"];
      to?: undefined;
    }
);

interface ToolbarBreadcrumbProps {
  ancestors: readonly BreadcrumbAncestor[];
  current?: ReactNode;
  textSm?: boolean;
}

const BreadcrumbSeparator = () => (
  <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
);

const BreadcrumbAncestorItem = ({
  ancestor,
  textSm,
}: {
  ancestor: BreadcrumbAncestor;
  textSm: boolean;
}) => {
  if ("content" in ancestor) {
    return ancestor.content;
  }

  const { id: _id, label, ...rest } = ancestor;
  const labelNode = <span className="min-w-0 truncate">{label}</span>;
  const className = cn("min-w-0", textSm && "text-sm");

  if (rest.to === undefined) {
    const handleClick = rest.onClick;

    return (
      <Button
        className={className}
        color="ghost"
        size="toolbar"
        onClick={handleClick}
      >
        {labelNode}
      </Button>
    );
  }

  return (
    <ButtonLink {...rest} className={className} color="ghost" size="toolbar">
      {labelNode}
    </ButtonLink>
  );
};

const ToolbarBreadcrumb = ({
  ancestors,
  current,
  textSm = false,
}: ToolbarBreadcrumbProps) => (
  <nav
    aria-label="Breadcrumb"
    className={cn(
      "flex min-w-0 items-center gap-1 text-(--color-description,var(--ck-palette-ink-tertiary))",
      textSm ? "text-sm" : "text-base"
    )}
  >
    {ancestors.map((ancestor, index) => (
      <Fragment key={ancestor.id}>
        {index > 0 ? <BreadcrumbSeparator /> : null}
        <BreadcrumbAncestorItem ancestor={ancestor} textSm={textSm} />
      </Fragment>
    ))}
    {isNil(current) ? null : (
      <>
        {ancestors.length > 0 ? <BreadcrumbSeparator /> : null}
        <span
          aria-current="page"
          className="flex h-(--ck-compose-button-spacing,calc(var(--spacing)*7)) min-w-0 flex-auto items-center truncate px-2 text-text"
        >
          {current}
        </span>
      </>
    )}
  </nav>
);

/* ------------------------------------------------------------------ */
/* OnboardingPage                      */
/* ------------------------------------------------------------------ */

interface OnboardingPageProps {
  children?: ReactNode;
  className?: string;
}

const ONBOARDING_DURATION_SECONDS = 0.2;
const ONBOARDING_OFFSET = 7;

/** Fades and slides its children in and out; inert while it is not present. */
const OnboardingPage = ({ children, className }: OnboardingPageProps) => {
  const reducedMotion = useReducedMotion();
  const present = useIsPresent();

  return (
    <MotionDiv
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full flex-col items-center", className)}
      exit={
        reducedMotion
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: -ONBOARDING_OFFSET }
      }
      inert={!present}
      initial={reducedMotion ? false : { opacity: 0, y: ONBOARDING_OFFSET }}
      transition={{
        duration: reducedMotion ? 0 : ONBOARDING_DURATION_SECONDS,
        easing: "ease-out",
        kind: "tween",
      }}
    >
      {children}
    </MotionDiv>
  );
};

export {
  BulletSeparator,
  ContentGrid,
  ContentSection,
  DetailPage,
  detailPageSectionClassName,
  Layout,
  OnboardingPage,
  PageHeader,
  ToolbarBreadcrumb,
};

export type {
  BreadcrumbAncestor,
  BulletSeparatorProps,
  ContentGridProps,
  ContentSectionProps,
  DetailPageProps,
  HeaderPlacement,
  LayoutProps,
  LayoutSlots,
  OnboardingPageProps,
  PageHeaderProps,
  PageHeaderVariant,
  ToolbarBreadcrumbProps,
};
