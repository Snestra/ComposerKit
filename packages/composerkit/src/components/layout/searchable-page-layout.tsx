"use client";

/* oxlint-disable complexity, max-statements -- SearchablePageLayout is one function with one branch per header, search and content option. */
/* oxlint-disable typescript/consistent-return -- The layout effects return a cleanup only when they set something up, as the effects do. */
/* oxlint-disable unicorn/prefer-number-coercion -- The component reads computed lengths such as "12px" with parseFloat; Number of that string is NaN. */
/* oxlint-disable shadcn/no-arbitrary-values -- The utilities px-panel, pt-panel and pb-panel read --ck-panel-padding, and the directory scope redefines the surface token; they carry the Electron window value as fallback. */

import {
  animateMotion,
  MotionDiv,
  Presence,
} from "composerkit/components/layout/motion";
import type { MotionTransition } from "composerkit/components/layout/motion";
import { TitlebarLeftInsetContext } from "composerkit/components/layout/titlebar-inset";
import { useMergedRef } from "composerkit/components/ui/text-field";
import { isNil, isPresent } from "composerkit/lib/present";
import { useReducedMotion } from "composerkit/lib/reduced-motion";
import { cn } from "composerkit/lib/utils";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, Ref, UIEvent } from "react";

import styles from "./layout.module.css";

/*
 * SearchablePageLayout, its header shell, toolbar, sticky band and toolbar
 * row, and the shell rules. The toolbar and scroll header placements publish
 * their row to the app-shell pane header; with no app shell here, PaneHeader draws that row above the scroll host. The page
 * search input is PageSearchInput; the layout takes it through `searchContent`.
 */

/* ------------------------------------------------------------------ */
/* Header shell. */
/* ------------------------------------------------------------------ */

interface SearchableHeaderShellProps {
  actions?: ReactNode;
  className?: string;
  collapseOnScroll?: boolean;
  expandSearchWhenWrapped?: boolean;
  horizontalPaddingClassName?: string;
  navigation?: ReactNode;
  presentation?: "default" | "directory";
  ref?: Ref<HTMLDivElement>;
  showDivider?: boolean;
  sticky?: boolean;
  title?: ReactNode;
  wrapActionsAtNarrowWidth?: boolean;
}

const flag = (value: boolean | undefined) =>
  value === true ? true : undefined;

const SearchableHeaderShell = ({
  actions,
  className,
  collapseOnScroll = false,
  expandSearchWhenWrapped = false,
  horizontalPaddingClassName = "px-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
  navigation,
  presentation = "default",
  ref,
  showDivider,
  sticky = true,
  title,
  wrapActionsAtNarrowWidth,
}: SearchableHeaderShellProps) => {
  const shell = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const titlebarLeftInset = useContext(TitlebarLeftInsetContext);

  const attachShell = useMergedRef(ref, shell);

  useLayoutEffect(() => {
    const element = shell.current;
    const row = content.current;

    if (!element || !row) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const start =
        row.offsetLeft +
        Number.parseFloat(getComputedStyle(row).paddingInlineStart);

      element.style.setProperty("--ck-header-content-start", `${start}px`);

      const toolbar = row.querySelector(`.${styles.toolbar}`);

      if (!collapseOnScroll || toolbar === null) {
        delete element.dataset.collapsible;

        return;
      }

      const titleContent = row.querySelector(`.${styles.titleContent}`);

      if (titleContent === null) {
        return;
      }

      element.style.setProperty(
        "--ck-header-collapse-offset",
        `${(titleContent.parentElement?.offsetHeight ?? 0) + Number.parseFloat(getComputedStyle(element).paddingTop)}px`
      );
      element.toggleAttribute("data-collapsible", true);
    });

    const observe = () => {
      observer.disconnect();

      for (const target of [row, ...row.querySelectorAll(`.${styles.title}`)]) {
        observer.observe(target);
      }
    };

    const mutations = new MutationObserver(observe);

    mutations.observe(row, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    observe();

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [collapseOnScroll]);

  const shellStyle: CSSProperties & Record<`--${string}`, string> = {
    "--ck-shell-titlebar-left-inset": `${titlebarLeftInset}px`,
  };

  return (
    <div
      ref={attachShell}
      className={cn(
        styles.shell,
        presentation === "directory" && styles.directoryShell,
        showDivider === true ? "border-stroke-subtle" : "border-transparent"
      )}
      data-ck-expand-search={flag(expandSearchWhenWrapped)}
      data-ck-scroll-collapse={flag(collapseOnScroll)}
      data-scrolled={flag(showDivider)}
      data-sticky={flag(sticky)}
      data-ck-wrap-actions={flag(wrapActionsAtNarrowWidth)}
      style={shellStyle}
    >
      <div
        ref={content}
        className={cn(
          styles.content,
          "mx-auto w-full",
          horizontalPaddingClassName,
          className
        )}
      >
        <div className={styles.headerRow}>
          {isNil(title) ? null : (
            <div className={styles.title}>
              <div className={styles.titleContent}>{title}</div>
            </div>
          )}
          <div className={styles.actions}>{actions}</div>
        </div>
        <div className={styles.navigation}>{navigation}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Toolbar. */
/* ------------------------------------------------------------------ */

interface SearchableHeaderToolbarProps {
  actions?: ReactNode;
  controls?: ReactNode;
  filterTags?: ReactNode;
  fixedSearchWidth?: boolean;
  search?: ReactNode;
}

const SearchableHeaderToolbar = ({
  actions,
  controls,
  filterTags,
  fixedSearchWidth,
  search,
}: SearchableHeaderToolbarProps) => (
  <div className={styles.toolbar}>
    <div className={styles.filterTags}>
      <div className={styles.filterTagsContent}>{filterTags}</div>
    </div>
    <div className={styles.viewControls}>{controls}</div>
    {isNil(search) ? null : (
      <div
        className={styles.search}
        data-ck-fixed-width={flag(fixedSearchWidth)}
      >
        {search}
      </div>
    )}
    <div className={styles.pageActions}>{actions}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Sticky band and toolbar row. */
/* ------------------------------------------------------------------ */

interface StickyHeaderBandProps {
  children?: ReactNode;
  className?: string;
  fadeSize?: "compact" | "default";
  showScrollFade?: boolean;
  sticky?: boolean;
}

const StickyHeaderBand = ({
  children,
  className,
  fadeSize = "default",
  showScrollFade = true,
  sticky = true,
}: StickyHeaderBandProps) => (
  <div
    className={cn(
      "bg-panel",
      sticky &&
        "sticky z-30 after:pointer-events-none after:absolute after:top-full after:right-0 after:left-0 after:bg-linear-to-b after:from-panel after:to-transparent after:content-['']",
      sticky && (fadeSize === "compact" ? "after:h-2" : "after:h-8"),
      sticky && !showScrollFade && "after:hidden",
      className
    )}
  >
    {children}
  </div>
);

interface PageToolbarRowProps {
  children?: ReactNode;
  inset?: boolean;
  variant?: "default" | "directory";
  wrap?: boolean;
}

const PageToolbarRow = ({
  children,
  inset = true,
  variant = "default",
  wrap = false,
}: PageToolbarRowProps) => (
  <div
    className={cn(
      "flex items-center justify-between gap-4",
      variant === "directory" ? "pb-4" : "pb-2",
      wrap && "flex-wrap",
      inset && "px-3"
    )}
  >
    {children}
  </div>
);

interface PaneHeaderProps {
  children?: ReactNode;
  divider?: boolean;
  inset?: boolean;
}

// HeaderToolbar: a full-width row of the toolbar height, inset by 2 spacing units.
const PaneHeader = ({
  children,
  divider = true,
  inset = true,
}: PaneHeaderProps) => (
  <div
    className={cn(
      "@container/app-shell-header-toolbar flex h-[var(--ck-shell-header-height,var(--height-bar,46px))] w-full min-w-0 shrink-0 items-center justify-between gap-2 border-b select-none",
      inset && "px-2",
      divider ? "border-stroke-subtle" : "border-transparent"
    )}
    data-ck-shell-header-toolbar
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* SearchablePageLayout. */
/* ------------------------------------------------------------------ */

type ContentWidth =
  | "default"
  | "directory"
  | "extraWide"
  | "medium"
  | "profile"
  | "wide";

type HeaderVariant =
  | "catalog"
  | "compact"
  | "default"
  | "directory"
  | "hero"
  | "inset"
  | "profile";

type SearchablePlacement = "inline" | "page" | "scroll" | "sticky" | "toolbar";

const contentWidthClasses = {
  default: "max-w-[var(--ck-chat-content-max-width,48rem)]",
  directory:
    "max-w-[calc(768px+var(--ck-panel-padding,calc(var(--spacing)*5))*2)]",
  extraWide: "max-w-[1440px]",
  medium: "max-w-[960px]",
  profile: "max-w-4xl",
  wide: "max-w-5xl",
} as const satisfies Record<ContentWidth, string>;

// The top inset and the title style of each header variant.
const headerVariantClasses = {
  catalog: {
    inset: "pt-4",
    title: "text-title-app leading-[1.2] font-semibold",
  },
  compact: {
    inset: "pt-6",
    title: "text-title-lg leading-[1.2] font-medium",
  },
  default: {
    inset: "pt-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
    title: "text-title-app leading-[1.2] font-medium",
  },
  directory: {
    inset: "pt-24",
    title: "text-[28px] leading-9 font-semibold",
  },
  hero: { inset: "pt-4", title: "text-3xl font-bold md:text-5xl" },
  inset: {
    inset: "pt-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
    title: "text-title-app leading-[1.2] font-medium",
  },
  profile: {
    inset: "pt-8 md:pt-13",
    title: "text-title-app leading-8.5 font-normal tracking-[0.4px]",
  },
} as const satisfies Record<HeaderVariant, { inset: string; title: string }>;

// Reduced motion makes the header spring duration zero.
const headerTransition = {
  bounce: 0.12,
  duration: 0.48,
  kind: "spring",
} as const satisfies MotionTransition;

const searchBarDuration = 0.25;
const searchBarOffset = 22;
const headerOffset = 3;
const toolbarHeadingOffset = 3;

interface SearchablePageLayoutProps {
  animateContentLayout?: boolean;
  balanceScrollbarGutter?: boolean;
  banner?: ReactNode;
  bannerAfterHeader?: boolean;
  bannerPlacement?: string;
  children?: ReactNode;
  collapseHeaderOnScroll?: boolean;
  contentClassName?: string;
  contentInset?: boolean;
  contentWidth?: ContentWidth;
  controls?: ReactNode;
  expandSearchWhenWrapped?: boolean;
  headerAction?: ReactNode;
  headerFade?: "always" | "when-scrolled";
  headerPlacement?: SearchablePlacement;
  headerVariant?: HeaderVariant;
  horizontalPaddingClassName?: string;
  navigation?: ReactNode;
  newSlateLayout?: boolean;
  pageActions?: ReactNode;
  reserveSelectionGutter?: boolean;
  scrollContainerRef?: Ref<HTMLDivElement>;
  searchContent?: ReactNode;
  searchPlacement?: "bottom-on-scroll" | "sticky";
  searchToolbar?: ReactNode;
  stickyControls?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
  titleRef?: Ref<HTMLHeadingElement>;
  toolbarActions?: ReactNode;
  toolbarInset?: boolean;
  wrapActionsAtNarrowWidth?: boolean;
}

const horizontalPadding = (
  width: ContentWidth,
  variant: HeaderVariant,
  reserveSelectionGutter: boolean,
  override: string | undefined,
  slate: boolean
) => {
  let base = "px-[var(--ck-panel-padding,calc(var(--spacing)*5))]";

  if (width === "profile") {
    base = "px-5 md:px-16";
  } else if (width === "directory") {
    base = "px-4 md:px-[var(--ck-panel-padding,calc(var(--spacing)*5))]";
  }

  let padding: string | undefined;

  if (reserveSelectionGutter) {
    padding = "px-18";
  } else if (override === undefined) {
    padding = cn(
      base,
      (width === "medium" || width === "extraWide") &&
        variant === "compact" &&
        "px-6 lg:px-12"
    );
  } else {
    padding = override;
  }

  return cn(
    padding,
    slate &&
      (reserveSelectionGutter
        ? "[[data-ck-shell-compact-page-gutter=true]_&]:px-14"
        : override === undefined &&
          width !== "profile" &&
          "[[data-ck-shell-compact-page-gutter=true]_&]:px-7.5")
  );
};

const updateBackgroundInset = (scroller: HTMLElement, header: HTMLElement) => {
  header.style.setProperty(
    "--ck-header-background-top-inset",
    `${Math.max(0, scroller.getBoundingClientRect().top - header.getBoundingClientRect().top)}px`
  );
};

const SearchablePageLayout = ({
  animateContentLayout = true,
  balanceScrollbarGutter = false,
  banner,
  bannerAfterHeader = false,
  bannerPlacement = "inset",
  children,
  collapseHeaderOnScroll = false,
  contentClassName,
  contentInset = true,
  contentWidth = "default",
  controls,
  expandSearchWhenWrapped = false,
  headerAction,
  headerFade = "always",
  headerPlacement = "page",
  headerVariant = "default",
  horizontalPaddingClassName,
  navigation,
  newSlateLayout = false,
  pageActions,
  reserveSelectionGutter = false,
  scrollContainerRef,
  searchContent,
  searchPlacement = "sticky",
  searchToolbar,
  stickyControls,
  subtitle,
  title,
  titleRef,
  toolbarActions,
  toolbarInset = true,
  wrapActionsAtNarrowWidth,
}: SearchablePageLayoutProps) => {
  const reducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [searchPinned, setSearchPinned] = useState(false);
  const [searchBarHeight, setSearchBarHeight] = useState<number>();
  const [headingScrolledAway, setHeadingScrolledAway] = useState(false);

  const [actionSize, setActionSize] = useState<{
    height: number;
    width: number;
  }>();

  const host = useRef<HTMLDivElement | null>(null);
  const searchWrapper = useRef<HTMLDivElement | null>(null);
  const searchBar = useRef<HTMLDivElement | null>(null);
  const headerShell = useRef<HTMLDivElement | null>(null);
  const contentBox = useRef<HTMLDivElement | null>(null);
  const previousTop = useRef<number | null>(null);
  const pageHeading = useRef<HTMLDivElement | null>(null);
  const actionBox = useRef<HTMLDivElement | null>(null);

  const attachHost = useMergedRef(scrollContainerRef, host);

  const hasSearch = isPresent(searchContent);
  const isDirectory = headerVariant === "directory";
  const isCompact = headerVariant === "compact";
  const isProfile = headerVariant === "profile";
  const isSticky = headerPlacement === "sticky";
  const collapsing = isSticky && collapseHeaderOnScroll;
  const isStickyOrInline = isSticky || headerPlacement === "inline";
  const isToolbar = headerPlacement === "toolbar";
  const isScroll = headerPlacement === "scroll";
  const overlay = isScroll && headingScrolledAway;
  const titleInToolbar = isToolbar || overlay;
  const hasToolbarActions = isPresent(toolbarActions);
  const showPaneHeader = titleInToolbar || hasToolbarActions || isProfile;

  const bottomSearch =
    searchPlacement === "bottom-on-scroll" && hasSearch && !isStickyOrInline;

  const searchBarStyle: CSSProperties & Record<`--${string}`, string> =
    bottomSearch && searchBarHeight !== undefined
      ? { "--search-bar-height": `${searchBarHeight}px` }
      : {};

  const actionBoxStyle: CSSProperties & Record<`--${string}`, string> =
    actionSize === undefined
      ? {}
      : {
          "--page-action-height": `${actionSize.height}px`,
          "--page-action-width": `${actionSize.width}px`,
        };

  const variantClasses = headerVariantClasses[headerVariant];
  const widthClass = contentWidthClasses[contentWidth];

  const transition: MotionTransition = reducedMotion
    ? { bounce: 0, duration: 0, kind: "spring" }
    : headerTransition;

  const padding = horizontalPadding(
    contentWidth,
    headerVariant,
    reserveSelectionGutter,
    horizontalPaddingClassName,
    newSlateLayout
  );

  useLayoutEffect(() => {
    const scroller = host.current;
    const wrapper = searchWrapper.current;
    const bar = searchBar.current;

    if (!bottomSearch || !scroller || !wrapper || !bar) {
      return;
    }

    const intersection = new IntersectionObserver(
      ([entry]) => {
        if (entry !== undefined) {
          setSearchPinned(
            !entry.isIntersecting &&
              entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0)
          );
        }
      },
      { root: scroller }
    );

    const resize = new ResizeObserver(([entry]) => {
      const height = entry?.borderBoxSize[0]?.blockSize ?? bar.offsetHeight;

      if (height) {
        setSearchBarHeight(height);
      }
    });

    intersection.observe(wrapper);
    resize.observe(bar, { box: "border-box" });

    return () => {
      intersection.disconnect();
      resize.disconnect();
    };
  }, [bottomSearch]);

  useLayoutEffect(() => {
    const bar = searchBar.current;

    if (!bottomSearch || !bar) {
      return;
    }

    const running = animateMotion(
      bar,
      { opacity: 0, y: searchBarOffset },
      { opacity: 1, y: 0 },
      {
        duration: reducedMotion ? 0 : searchBarDuration,
        easing: "ease-in-out",
        kind: "tween",
      },
      "backwards"
    );

    return () => {
      running?.cancel();
    };
    // searchPinned replays the entrance when the bar pins, as the dependency list does (N, [Y, He, Q]).
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [bottomSearch, searchPinned, reducedMotion]);

  useLayoutEffect(() => {
    const heading = pageHeading.current;
    const scroller = host.current;

    if (!isScroll || !heading || !scroller) {
      return;
    }

    const intersection = new IntersectionObserver(
      ([entry]) => {
        if (entry !== undefined) {
          setHeadingScrolledAway(
            !entry.isIntersecting &&
              entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0)
          );
        }
      },
      { root: scroller, threshold: 0 }
    );

    intersection.observe(heading);

    return () => {
      intersection.disconnect();
    };
  }, [isScroll]);

  useLayoutEffect(() => {
    const box = actionBox.current;

    if (!isScroll || overlay || !box) {
      return;
    }

    const resize = new ResizeObserver(() => {
      setActionSize({ height: box.offsetHeight, width: box.offsetWidth });
    });

    resize.observe(box);

    return () => {
      resize.disconnect();
    };
  }, [isScroll, overlay]);

  useLayoutEffect(() => {
    const scroller = host.current;
    const header = headerShell.current;

    if (!newSlateLayout || !isSticky || !scroller || !header) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateBackgroundInset(scroller, header);
    });

    observer.observe(scroller);
    observer.observe(header);

    return () => {
      observer.disconnect();
      header.style.removeProperty("--ck-header-background-top-inset");
    };
  }, [newSlateLayout, isSticky]);

  // layout="position": the content box moves from where it was drawn to where it is now.
  useLayoutEffect(() => {
    const element = contentBox.current;

    if (!element) {
      return;
    }

    const top = element.offsetTop;
    const from = previousTop.current;

    previousTop.current = top;

    if (!animateContentLayout || from === null || from === top) {
      return;
    }

    const running = animateMotion(
      element,
      { opacity: 1, y: from - top },
      { opacity: 1, y: 0 },
      transition,
      "none"
    );

    return () => {
      running?.cancel();
    };
  });

  const handleScroll =
    isStickyOrInline ||
    (headerFade === "when-scrolled" &&
      searchPlacement === "sticky" &&
      (hasSearch || isPresent(stickyControls)))
      ? (event: UIEvent<HTMLDivElement>) => {
          const scroller = event.currentTarget;
          const header = headerShell.current;
          const content = contentBox.current;

          if (collapsing && !newSlateLayout && header && content) {
            header.style.setProperty(
              "--ck-header-scroll-position",
              `${scroller.scrollTop}px`
            );

            const box = header.getBoundingClientRect();

            header.style.setProperty(
              "--ck-header-scroll-overlap",
              `${Math.max(
                0,
                ((box.bottom - content.getBoundingClientRect().top) *
                  header.offsetHeight) /
                  box.height +
                  Number.parseFloat(getComputedStyle(header).marginBottom)
              )}px`
            );
          }

          setScrolled(
            newSlateLayout && isSticky && header
              ? scroller.scrollTop > 0 &&
                  header.getBoundingClientRect().top <=
                    scroller.getBoundingClientRect().top +
                      Number.parseFloat(getComputedStyle(header).top)
              : scroller.scrollTop > 0
          );

          if (newSlateLayout && isSticky && header) {
            updateBackgroundInset(scroller, header);
          }
        }
      : undefined;

  const bannerNode = isNil(banner) ? null : (
    <div
      className={cn(
        "w-full empty:hidden",
        bannerPlacement === "inset" && [
          "mx-auto pt-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
          widthClass,
          padding,
        ]
      )}
    >
      {banner}
    </div>
  );

  const searchNode = hasSearch ? (
    <SearchableHeaderToolbar
      actions={headerAction}
      controls={searchToolbar}
      search={searchContent}
    />
  ) : null;

  const shellHeader = isStickyOrInline ? (
    <SearchableHeaderShell
      ref={headerShell}
      actions={hasSearch ? searchNode : headerAction}
      className={widthClass}
      collapseOnScroll={collapsing}
      expandSearchWhenWrapped={expandSearchWhenWrapped}
      horizontalPaddingClassName={padding}
      navigation={newSlateLayout ? undefined : stickyControls}
      presentation={isDirectory ? "directory" : "default"}
      showDivider={isSticky && scrolled}
      sticky={isSticky}
      title={
        isNil(title) ? null : (
          <>
            <h1
              ref={titleRef}
              className={cn(
                "flex min-h-9 items-center text-text",
                variantClasses.title
              )}
            >
              {title}
            </h1>
            {isNil(subtitle) || (newSlateLayout && !isDirectory) ? null : (
              <div
                className={cn(
                  "text-base leading-6 text-text-muted",
                  collapsing && "max-w-lg"
                )}
              >
                {subtitle}
              </div>
            )}
          </>
        )
      }
      wrapActionsAtNarrowWidth={wrapActionsAtNarrowWidth}
    />
  ) : null;

  const slateSubtitle =
    isStickyOrInline &&
    newSlateLayout &&
    !isDirectory &&
    isPresent(subtitle) ? (
      <div
        className={
          wrapActionsAtNarrowWidth === true
            ? "@container/searchable-header"
            : "contents"
        }
      >
        <div
          className={cn(
            styles.pageSubtitle,
            "mx-auto w-full text-base leading-6 text-text-muted",
            widthClass,
            padding
          )}
          data-ck-page-subtitle={flag(wrapActionsAtNarrowWidth)}
        >
          <div className="max-w-lg -translate-y-1.5">{subtitle}</div>
        </div>
      </div>
    ) : null;

  const slateControls =
    isStickyOrInline && newSlateLayout && isPresent(stickyControls) ? (
      <div
        className={cn(
          "mx-auto flex min-h-15 w-full min-w-0 items-center",
          widthClass,
          padding
        )}
      >
        {stickyControls}
      </div>
    ) : null;

  const pageHeadingNode =
    isStickyOrInline || isToolbar ? null : (
      <MotionDiv
        key="page-heading"
        ref={pageHeading}
        animate={{ opacity: 1, y: 0 }}
        aria-hidden={overlay || undefined}
        exit={{ opacity: 0, y: -headerOffset }}
        initial={{ opacity: 0, y: -headerOffset }}
        inert={overlay}
        popLayout
        transition={transition}
      >
        <div
          className={cn(
            "mx-auto w-full",
            widthClass,
            variantClasses.inset,
            !hasSearch && (isCompact || isProfile ? "pb-6" : "pb-4"),
            padding
          )}
        >
          <div
            className={cn(
              "flex justify-between gap-4",
              isCompact && "flex-wrap items-center",
              isProfile && "items-center px-1",
              !isCompact && !isProfile && "items-start",
              headerVariant === "hero" && "justify-center text-center",
              headerVariant === "inset" ? "px-2" : null
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-col",
                headerVariant === "inset" || headerVariant === "hero"
                  ? "gap-2"
                  : "gap-1"
              )}
            >
              <h1
                ref={overlay ? undefined : titleRef}
                className={cn("text-text", variantClasses.title)}
              >
                {title}
              </h1>
              {isNil(subtitle) ? null : (
                <div
                  className={cn(
                    "text-base text-text-muted",
                    isProfile ? "leading-6.5 tracking-[-0.3px]" : "leading-6"
                  )}
                >
                  {subtitle}
                </div>
              )}
            </div>
            {isNil(headerAction) ? null : (
              <div
                ref={actionBox}
                className={cn(
                  "min-w-0",
                  isCompact ? "max-w-full" : "shrink-0",
                  overlay && "h-(--page-action-height) w-(--page-action-width)"
                )}
                style={overlay ? actionBoxStyle : undefined}
              >
                {overlay ? null : headerAction}
              </div>
            )}
          </div>
        </div>
      </MotionDiv>
    );

  const searchBand =
    !hasSearch || isStickyOrInline ? null : (
      <div
        ref={searchWrapper}
        className={bottomSearch ? "h-(--search-bar-height)" : "contents"}
        style={searchBarStyle}
      >
        <div
          ref={searchBar}
          className={cn(
            !bottomSearch && "contents",
            bottomSearch && searchPinned && "absolute inset-x-0 bottom-0 z-30"
          )}
        >
          <StickyHeaderBand
            className="top-0"
            showScrollFade={headerFade === "always" || scrolled}
            sticky={searchPlacement === "sticky"}
          >
            <div
              className={cn(
                "mx-auto flex w-full items-center gap-2 pb-2",
                widthClass,
                headerVariant === "hero" && "pt-6",
                headerVariant === "catalog" && "pt-4",
                headerVariant !== "hero" &&
                  headerVariant !== "catalog" &&
                  "pt-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
                padding
              )}
            >
              {searchContent}
              {searchToolbar}
            </div>
            {isNil(stickyControls) ? null : (
              <div
                className={cn(
                  "mx-auto w-full",
                  widthClass,
                  headerVariant === "hero" && "pt-12",
                  padding
                )}
              >
                {stickyControls}
              </div>
            )}
          </StickyHeaderBand>
        </div>
      </div>
    );

  const controlsBand =
    !hasSearch && isPresent(stickyControls) && !isStickyOrInline ? (
      <StickyHeaderBand
        className="top-0"
        showScrollFade={headerFade === "always" || scrolled}
        sticky={searchPlacement === "sticky"}
      >
        <div
          className={cn(
            "mx-auto w-full",
            !isCompact && "py-2",
            widthClass,
            padding
          )}
        >
          {stickyControls}
        </div>
      </StickyHeaderBand>
    ) : null;

  const showRow =
    (!isToolbar && isPresent(navigation)) || isPresent(pageActions);

  const hasHeaderBand = hasSearch || isPresent(stickyControls);

  const contentClasses = cn(
    "mx-auto flex min-h-0 w-full flex-1 flex-col",
    newSlateLayout && isCompact
      ? "pb-4"
      : "pb-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
    widthClass,
    contentInset && isCompact && !isStickyOrInline && "pt-3.5",
    contentInset &&
      !isCompact &&
      !hasSearch &&
      isNil(stickyControls) &&
      "pt-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
    contentInset &&
      !isCompact &&
      hasHeaderBand &&
      (isDirectory ? "pt-3 md:pt-5" : "pt-5"),
    contentClassName,
    padding
  );

  const hostClasses = cn(
    "h-full min-h-0 flex-1 overflow-x-hidden overflow-y-auto",
    contentWidth === "profile" &&
      "bg-(--ck-palette-surface-card,var(--ck-palette-surface-surface))",
    isDirectory &&
      "bg-[var(--ck-palette-surface-surface)] [--ck-palette-ink:light-dark(var(--color-light-ink),var(--color-dark-ink))] [--ck-palette-surface-surface:var(--ck-palette-surface-surface)]",
    balanceScrollbarGutter
      ? "md:[scrollbar-gutter:stable_both-edges]"
      : "[scrollbar-gutter:stable]",
    !bottomSearch && "relative",
    overlay && styles.scrollFadeMaskTop
  );

  const toolbarHeading = titleInToolbar ? (
    <MotionDiv
      key="toolbar-heading"
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 flex-1 overflow-hidden"
      data-ck-shell-overlay-page-header={
        overlay && !hasToolbarActions ? true : undefined
      }
      exit={{ opacity: 0, y: toolbarHeadingOffset }}
      initial={{ opacity: 0, y: toolbarHeadingOffset }}
      transition={transition}
    >
      {!isToolbar || isNil(navigation) ? (
        <h1
          ref={titleRef}
          className={cn(
            "min-w-0 truncate text-base font-medium text-text",
            headerVariant === "inset" ? "px-2" : null
          )}
        >
          {title}
        </h1>
      ) : (
        <>
          <h1 ref={titleRef} className="sr-only">
            {title}
          </h1>
          {navigation}
        </>
      )}
    </MotionDiv>
  ) : null;

  const paneHeader = showPaneHeader ? (
    <PaneHeader divider={!isProfile} inset={toolbarInset}>
      <Presence initial={false}>{toolbarHeading}</Presence>
      {hasToolbarActions || overlay ? (
        <div className="ms-auto flex min-w-0 items-center justify-end gap-2">
          {overlay ? headerAction : null}
          {toolbarActions}
        </div>
      ) : null}
    </PaneHeader>
  ) : null;

  return (
    <div
      className={
        bottomSearch || showPaneHeader
          ? cn(
              "flex h-full min-h-0 flex-1 flex-col",
              bottomSearch && "relative"
            )
          : "contents"
      }
    >
      {paneHeader}
      <div
        ref={attachHost}
        className={hostClasses}
        data-ck-shell-inline-page-header={
          isToolbar || isProfile || hasToolbarActions ? undefined : true
        }
        data-ck-shell-page-scrolled={
          headerPlacement === "inline" ? scrolled : undefined
        }
        data-ck-new-slate-layout={flag(newSlateLayout)}
        onScroll={handleScroll}
      >
        <div
          className={cn(
            "flex min-h-full w-full flex-col",
            bottomSearch && "pb-(--search-bar-height)"
          )}
          style={searchBarStyle}
        >
          {!bannerAfterHeader || !isStickyOrInline ? bannerNode : null}
          {shellHeader}
          {slateSubtitle}
          {slateControls}
          {bannerAfterHeader && isStickyOrInline ? bannerNode : null}
          <Presence initial={false}>{pageHeadingNode}</Presence>
          {searchBand}
          {controlsBand}
          <div ref={contentBox} className={contentClasses}>
            {showRow ? (
              <PageToolbarRow>
                {isToolbar ? null : navigation}
                {isNil(pageActions) ? null : (
                  <div className="ms-auto">{pageActions}</div>
                )}
              </PageToolbarRow>
            ) : null}
            {controls}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export {
  PageToolbarRow,
  PaneHeader,
  SearchableHeaderShell,
  SearchableHeaderToolbar,
  SearchablePageLayout,
  StickyHeaderBand,
};

export type {
  ContentWidth,
  HeaderVariant,
  PageToolbarRowProps,
  PaneHeaderProps,
  SearchableHeaderShellProps,
  SearchableHeaderToolbarProps,
  SearchablePageLayoutProps,
  SearchablePlacement,
  StickyHeaderBandProps,
};
