import { MagnifyingGlass24Icon } from "@workspace/react/components/empty-state/icons";
import { cn } from "@workspace/react/lib/utils";
import type { ComponentProps, ReactNode } from "react";

// Utility names follow the host stylesheet: text-default is
// --color-text (text-text here), text-secondary is --color-text-muted,
// border-default is --color-border, and bg-background-primary-soft-active and
// bg-fill-secondary-soft both resolve to
// --ck-palette-surface-button-secondary in the theme scope,
// so the library's bg-fill-secondary-soft token serves both.

type EmptyStateWidth = "compact" | "wide";

export interface EmptyStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "title"
> {
  actions?: ReactNode;
  contentClassName?: string;
  description?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  width?: EmptyStateWidth;
}

const widthClasses = {
  compact: "max-w-72",
  wide: "max-w-xl",
} as const satisfies Record<EmptyStateWidth, string>;

/**
 * Centered icon, title, description and actions. The icon slot is always rendered, so an empty
 * slot still takes one `gap-3` step. The description and the
 * actions row are omitted when they are `null` or `undefined`.
 */
export const EmptyState = ({
  actions,
  className,
  contentClassName,
  description,
  icon,
  title,
  width = "compact",
  ...props
}: EmptyStateProps) => (
  <div
    {...props}
    className={cn(
      "flex w-full flex-col items-center justify-center px-4 py-8 text-center",
      className
    )}
  >
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-3",
        widthClasses[width],
        contentClassName
      )}
    >
      <div className="flex items-center justify-center [&>svg]:size-8 [&>svg]:text-text-muted">
        {icon}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-2">
        <div className="text-lg leading-6 font-medium text-text">{title}</div>
        {description === null || description === undefined ? null : (
          <div className="w-full min-w-0 text-sm text-text-muted">
            {description}
          </div>
        )}
      </div>
      {actions === null || actions === undefined ? null : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  </div>
);

export type PageEmptyStateLayout =
  | "browse"
  | "default"
  | "outlined"
  | "page"
  | "popover"
  | "withPreview";

export type PageEmptyStateSpacing = "compact" | "default";

export type PageEmptyStateTone = "default" | "faded";

export type PageEmptyStateIllustrationSize =
  | "default"
  | "hero"
  | "icon"
  | "tile";

export interface PageEmptyStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "title"
> {
  actions?: ReactNode;
  contentClassName?: string;
  description?: ReactNode;
  illustration?: ReactNode;
  illustrationSize?: PageEmptyStateIllustrationSize;
  layout?: PageEmptyStateLayout;
  spacing?: PageEmptyStateSpacing;
  title?: ReactNode;
  tone?: PageEmptyStateTone;
}

// The page layouts are at least --ck-row-height-empty-state-page tall, which is
// 26.25rem in the :root theme.
const PAGE_MIN_HEIGHT = "min-h-[26.25rem]";

const isPresent = (value: ReactNode) =>
  // Truthiness: 0 is absent too.
  value !== null &&
  value !== undefined &&
  value !== false &&
  value !== "" &&
  value !== 0;

const rootLayoutClasses = (layout: PageEmptyStateLayout) =>
  cn(
    "w-full items-center",
    layout === "outlined" ? "px-6" : "px-3",
    layout === "browse"
      ? "grid grid-rows-2 justify-items-center"
      : "flex flex-col justify-center",
    layout !== "withPreview" && "py-6",
    layout === "popover" && "min-h-80",
    layout === "outlined" &&
      "min-h-80 rounded-2xl border border-dashed border-border",
    (layout === "page" || layout === "browse") && `${PAGE_MIN_HEIGHT} flex-1`,
    layout === "withPreview" && "min-h-0 flex-none pt-8 pb-0 sm:pt-2"
  );

const contentSpacingClasses = (
  layout: PageEmptyStateLayout,
  spacing: PageEmptyStateSpacing
) => {
  if (layout === "outlined") {
    return "gap-3.5";
  }

  return spacing === "compact" ? "gap-3" : "gap-4";
};

const illustrationClasses = (
  layout: PageEmptyStateLayout,
  size: PageEmptyStateIllustrationSize
) =>
  cn(
    "pointer-events-none flex items-center justify-center",
    layout === "browse" && size !== "tile" && "h-5",
    size === "tile" &&
      "size-12 shrink-0 rounded-xl bg-fill-secondary-soft text-text",
    size === "icon" && "[&>svg]:size-8 [&>svg]:text-text-muted",
    size === "hero" && "relative h-32 w-120 max-w-full overflow-visible"
  );

const PageIllustration = ({
  children,
  layout,
  size,
}: {
  children: ReactNode;
  layout: PageEmptyStateLayout;
  size: PageEmptyStateIllustrationSize;
}) => (
  <div className={illustrationClasses(layout, size)}>
    {size === "hero" ? (
      <div className="absolute top-1/2 left-1/2 size-120 max-h-[55vh] max-w-full -translate-x-1/2 -translate-y-1/2">
        {children}
      </div>
    ) : (
      children
    )}
  </div>
);

const PageText = ({
  browse,
  description,
  faded,
  outlined,
  title,
}: {
  browse: boolean;
  description: ReactNode;
  faded: boolean;
  outlined: boolean;
  title: ReactNode;
}) => (
  <div
    className={cn(
      "flex flex-col items-center",
      outlined ? "max-w-76.5 gap-1 text-balance" : "gap-2"
    )}
  >
    {title === null || title === undefined ? null : (
      <div
        className={cn(
          "leading-6 font-medium",
          faded ? "text-text-subtle" : "text-text",
          outlined ? "text-base" : "text-lg"
        )}
      >
        {title}
      </div>
    )}
    {isPresent(description) || browse ? (
      <div
        className={cn(
          "text-sm",
          faded ? "text-text-subtle" : "text-text-muted",
          browse && "min-h-10"
        )}
      >
        {description}
      </div>
    ) : null}
  </div>
);

/**
 * The page, browse, outlined, popover and preview empty state. Search results render it with the `page` layout.
 */
export const PageEmptyState = ({
  actions,
  className,
  contentClassName,
  description,
  illustration,
  illustrationSize = "default",
  layout = "default",
  spacing = "compact",
  title,
  tone = "default",
  ...props
}: PageEmptyStateProps) => {
  const browse = layout === "browse";
  const hasTitle = title !== null && title !== undefined;

  const showText =
    hasTitle || (description !== null && description !== undefined);

  return (
    <div {...props} className={cn(rootLayoutClasses(layout), className)}>
      <div
        className={cn(
          "flex w-full max-w-xl flex-col items-center text-center",
          browse ? "row-start-2 justify-start self-start" : "justify-center",
          contentSpacingClasses(layout, spacing),

          contentClassName
        )}
      >
        {isPresent(illustration) || browse ? (
          <PageIllustration layout={layout} size={illustrationSize}>
            {illustration}
          </PageIllustration>
        ) : null}
        {showText ? (
          <PageText
            browse={browse}
            description={description}
            faded={tone === "faded"}
            outlined={layout === "outlined"}
            title={title}
          />
        ) : null}
        {isPresent(actions) ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export interface SearchEmptyStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "title"
> {
  /** The text the user searched for. */
  query: string;
  /** Replaces the heading "No results found". */
  title?: ReactNode;
  /** Replaces the sentence before the guidance line. */
  noMatchesMessage?: ReactNode;
  /** Replaces the guidance line "Try a different search.". */
  guidanceMessage?: ReactNode;
}

/**
 * The no-results state of a content collection search (search-empty-state
 * b6133e5568d9 d): a 48px chip with the magnifying glass, the heading, and
 * the sentence naming the query with the guidance on its own line.
 */
export const SearchEmptyState = ({
  className,
  guidanceMessage = "Try a different search.",
  noMatchesMessage,
  query,
  title = "No results found",
  ...props
}: SearchEmptyStateProps) => (
  <PageEmptyState
    {...props}
    className={cn("max-w-80 self-center wrap-anywhere select-none", className)}
    description={
      <>
        {noMatchesMessage ?? `No matches for “${query}”.`}{" "}
        <span className="block">{guidanceMessage}</span>
      </>
    }
    illustration={
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-fill-secondary-soft">
        <MagnifyingGlass24Icon />
      </span>
    }
    layout="page"
    spacing="default"
    title={<h2>{title}</h2>}
  />
);
