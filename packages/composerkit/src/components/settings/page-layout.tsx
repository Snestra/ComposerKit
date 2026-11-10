"use client";

/* oxlint-disable complexity -- The layout composes its classes and slots with one branch per option (embedded, fullWidth, density, slate, sticky controls, footer), so the branch count is high. */

/* oxlint-disable shadcn/no-arbitrary-values -- The utilities px-panel, p-panel, gap-[var(--ck-preferences-section-gap)] and the heading classes read host tokens (--ck-panel-padding, --ck-preferences-section-gap, --text-title-lg) that have no theme utility here; they carry the Electron window value as fallback. */

/* oxlint-disable typescript/strict-boolean-expressions -- The layout tests optional slots the way the component does: a subtitle or title that is "" renders nothing. */

import {
  SearchableHeaderShell,
  SearchableHeaderToolbar,
} from "composerkit/components/layout/searchable-page-layout";
import { PageHeader } from "composerkit/components/ui/layout";
import type { PageHeaderVariant } from "composerkit/components/ui/layout";
import { isNil, isPresent } from "composerkit/lib/present";
import { cn } from "composerkit/lib/utils";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { ComponentProps, ReactNode, Ref, RefObject } from "react";

/*
 * Settings page layout, its navigation target provider and context, and the
 * page header it renders.
 *
 * Window-type variants (`electron:`) apply unconditionally: the Electron
 * desktop values are the defaults.
 * --ck-panel-padding is 20px (spacing 5) on the Electron window body and --height-bar 46px, so both carry that value as fallback
 * for a page with no token layer around it.
 */

/* ------------------------------------------------------------------ */
/* Navigation target context and provider. */
/* ------------------------------------------------------------------ */

interface SettingsNavigationTargetValue {
  navigationKey?: string | number | null;
  slateLayout: boolean;
  targetId?: string | null;
  targetText: string | null;
}

const SettingsNavigationTargetContext =
  createContext<SettingsNavigationTargetValue | null>(null);

interface SettingsNavigationTargetProps {
  children?: ReactNode;
  navigationKey?: string | number | null;
  /** Moves the page header into the scroll area. */
  slateLayout?: boolean;
  /** Element id to scroll to the centre. */
  targetId?: string | null;
  /** Text to find, scroll to the centre and flash. */
  targetText?: string | null;
}

const SettingsNavigationTarget = ({
  children,
  navigationKey,
  slateLayout = false,
  targetId,
  targetText = null,
}: SettingsNavigationTargetProps) => {
  const value = useMemo(
    () =>
      isNil(targetId) && isNil(targetText) && !slateLayout
        ? null
        : { navigationKey, slateLayout, targetId, targetText },
    [navigationKey, slateLayout, targetId, targetText]
  );

  return (
    <SettingsNavigationTargetContext.Provider value={value}>
      {children}
    </SettingsNavigationTargetContext.Provider>
  );
};

/* ------------------------------------------------------------------ */
/* Deep link scroll and flash                                          */
/* ------------------------------------------------------------------ */

// Easing for the highlight flash.
const FLASH_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";
const FLASH_DURATION_MS = 450;
const FLASH_COLOR = "var(--ck-palette-surface-button-secondary-hover)";
const WHITESPACE = /\s+/u;

const CONTROL_SELECTOR =
  'button, input, select, textarea, [role="switch"], [role="checkbox"], [role="combobox"]';

const HIDDEN_SELECTOR = '[hidden], [aria-hidden="true"]';
const USER_INPUT_EVENTS = ["wheel", "pointerdown", "keydown"] as const;

interface TextMatch {
  element: Element;
  isContiguous: boolean;
  text: string;
}

const findByText = (container: Element, targetText: string) => {
  const needle = targetText.trim().toLocaleLowerCase();
  const words = needle.split(WHITESPACE);
  let best: TextMatch | null = null;

  for (const element of container.querySelectorAll("*")) {
    const text = (element.getAttribute("placeholder") ?? element.textContent)
      ?.trim()
      .toLocaleLowerCase();

    if (
      isNil(text) ||
      !words.every((word) => text.includes(word)) ||
      element.closest(HIDDEN_SELECTOR) !== null
    ) {
      continue;
    }

    const isContiguous = text.includes(needle);

    if (
      isNil(best) ||
      (isContiguous && !best.isContiguous) ||
      (isContiguous === best.isContiguous && text.length <= best.text.length)
    ) {
      best = { element, isContiguous, text };
    }
  }

  return best?.element ?? null;
};

// The element whose background flashes: the parent of the button that holds
// the match, else the nearest ancestor (below the section) that has a control
// beside the match, else the match itself.
const flashTarget = (element: Element, container: Element) => {
  const button = element.closest("button");

  if (isPresent(button)) {
    return button.parentElement ?? element;
  }

  const section = element.closest("section");

  for (
    let parent = element.parentElement;
    isPresent(parent) && parent !== section && parent !== container;
    parent = parent.parentElement
  ) {
    const hasControl = [...parent.children].some(
      (child) =>
        !child.contains(element) &&
        (child.matches(CONTROL_SELECTOR) ||
          child.querySelector(CONTROL_SELECTOR) !== null)
    );

    if (hasControl) {
      return parent;
    }
  }

  return element;
};

const flash = (element: Element) => {
  const reduced = document.documentElement.dataset.ckReducedMotion === "true";

  return element.animate?.(
    reduced
      ? [{ backgroundColor: FLASH_COLOR }, { backgroundColor: FLASH_COLOR }]
      : [
          { backgroundColor: FLASH_COLOR },
          { backgroundColor: FLASH_COLOR, offset: 0.35 },
          { backgroundColor: "transparent" },
        ],
    { duration: FLASH_DURATION_MS, easing: FLASH_EASING }
  );
};

const NO_CLEANUP = () => {
  /* No target, so there is nothing to undo. */
};

const useNavigationTarget = (
  container: RefObject<HTMLDivElement | null>,
  target: SettingsNavigationTargetValue | null
) => {
  const targetId = target?.targetId ?? null;
  const targetText = target?.targetText ?? null;
  const navigationKey = target?.navigationKey ?? null;

  useLayoutEffect(() => {
    if (isNil(targetId) && isNil(targetText)) {
      return NO_CLEANUP;
    }

    const root = container.current;

    if (isNil(root)) {
      return NO_CLEANUP;
    }

    const find = () => {
      if (isNil(targetText)) {
        // oxlint-disable-next-line unicorn/prefer-query-selector -- the component looks the id up with getElementById, which needs no selector escaping.
        return isNil(targetId) ? null : document.getElementById(targetId);
      }

      return findByText(root, targetText);
    };

    let animation: Animation | undefined;

    const reveal = (element: Element) => {
      element.scrollIntoView?.({ block: "center" });

      if (isPresent(targetText)) {
        animation = flash(flashTarget(element, root));
      }
    };

    let mutations: MutationObserver | undefined;

    const resizes = isNil(targetText)
      ? new ResizeObserver(() => {
          const element = find();

          if (isPresent(element)) {
            reveal(element);
          }
        })
      : null;

    const stop = () => {
      mutations?.disconnect();
      resizes?.disconnect();

      for (const type of USER_INPUT_EVENTS) {
        root.ownerDocument.removeEventListener(type, stop);
      }
    };

    if (isPresent(resizes)) {
      resizes.observe(root);

      for (const type of USER_INPUT_EVENTS) {
        root.ownerDocument.addEventListener(type, stop, { passive: true });
      }
    }

    const found = find();

    if (isNil(found)) {
      mutations = new MutationObserver(() => {
        const element = find();

        if (isPresent(element)) {
          reveal(element);
          mutations?.disconnect();
        }
      });
      mutations.observe(isNil(targetText) ? document.body : root, {
        childList: true,
        subtree: true,
      });
    } else {
      reveal(found);
    }

    return () => {
      stop();
      animation?.cancel();
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- navigationKey runs the lookup again when the same target is opened again.
  }, [container, navigationKey, targetId, targetText]);
};

/* ------------------------------------------------------------------ */
/* Sticky controls bar. */
/* ------------------------------------------------------------------ */

const StickyControls = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "sticky z-30 bg-panel after:pointer-events-none after:absolute after:top-full after:right-0 after:left-0 after:h-8 after:bg-linear-to-b after:from-panel after:to-transparent after:content-['']",
      className
    )}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* SettingsContentLayout. */
/* ------------------------------------------------------------------ */

type SettingsDensity = "compact" | "default";

interface SettingsContentLayoutProps extends Omit<
  ComponentProps<"div">,
  "title"
> {
  /** Page header actions. */
  action?: ReactNode;
  asset?: ReactNode;
  backSlot?: ReactNode;
  contentClassName?: string;
  /**
   * Accepted for API compatibility. The component gates the touch overscroll hook
   * with a constant false, so the prop has no effect there either.
   */
  containTouchOverscroll?: boolean;
  /** Sets data-density, which the rows, cards and groups below read. */
  density?: SettingsDensity;
  embedded?: boolean;
  footer?: ReactNode;
  fullWidth?: boolean;
  ref?: Ref<HTMLDivElement>;
  /** Scrolls the page to the top whenever the key changes. */
  scrollResetKey?: string | number | null;
  stickyControls?: ReactNode;
  subtitle?: ReactNode;
  subtitleClassName?: string;
  title?: ReactNode;
  toolbarActions?: ReactNode;
}

const SettingsContentLayout = ({
  action,
  asset,
  backSlot,
  children,
  className,
  contentClassName,
  containTouchOverscroll: _containTouchOverscroll,
  density,
  embedded = false,
  footer,
  fullWidth = false,
  ref,
  scrollResetKey,
  stickyControls,
  subtitle,
  subtitleClassName,
  title,
  toolbarActions,
  ...rest
}: SettingsContentLayoutProps) => {
  const resolvedDensity = density ?? "default";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const target = useContext(SettingsNavigationTargetContext);
  const slate = Boolean(target?.slateLayout) && !embedded;

  useLayoutEffect(() => {
    if (isPresent(scrollResetKey) && isPresent(scrollRef.current)) {
      scrollRef.current.scrollTop = 0;
    }
  }, [scrollResetKey]);

  useNavigationTarget(contentRef, target);

  const toolbar =
    isNil(backSlot) && isNil(toolbarActions) ? null : (
      <>
        {backSlot}
        {isNil(toolbarActions) ? null : (
          <div className="ms-auto flex min-w-0 items-center justify-end gap-2 [-webkit-app-region:no-drag]">
            {toolbarActions}
          </div>
        )}
      </>
    );

  let headerVariant: PageHeaderVariant = embedded ? "default" : "settings";

  if (resolvedDensity === "compact") {
    headerVariant = "settingsCompact";
  }

  // The component compares the density prop itself, not its default, so an
  // omitted density sets no --ck-preferences-section-gap.
  const sectionGap =
    (density === "compact" &&
      "[--ck-preferences-section-gap:--spacing(5.5)]") ||
    (density === "default" &&
      (embedded && !fullWidth
        ? "[--ck-preferences-section-gap:var(--ck-panel-padding,calc(var(--spacing)*5))]"
        : "[--ck-preferences-section-gap:--spacing(10)]"));

  let maxWidth: string | false =
    "max-w-3xl min-w-[min(100%,calc(320px*var(--ui-display-scale,1)))]";

  if (fullWidth) {
    maxWidth = false;
  } else if (embedded) {
    maxWidth = "max-w-2xl";
  }

  const content = (
    <div
      className={cn(
        "group/settings mx-auto flex w-full flex-col",
        sectionGap,
        maxWidth,
        slate && [
          "px-[var(--ck-panel-padding,calc(var(--spacing)*5))] pb-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
          isNil(stickyControls) &&
            "pt-[var(--ck-panel-padding,calc(var(--spacing)*5))]",
        ],
        contentClassName
      )}
      data-density={resolvedDensity}
      ref={contentRef}
    >
      {isNil(title) || slate ? null : (
        <div
          className={cn(
            resolvedDensity === "compact" && "pb-5.5",
            resolvedDensity === "default" &&
              (embedded
                ? "pb-[var(--ck-panel-padding,calc(var(--spacing)*5))]"
                : "pb-8")
          )}
        >
          <PageHeader
            actions={action}
            asset={asset}
            subtitle={subtitle}
            subtitleClassName={subtitleClassName}
            subtitleWrap="balance"
            title={title}
            variant={headerVariant}
          />
        </div>
      )}
      {isNil(stickyControls) ? null : (
        <StickyControls className="top-0 pt-[var(--ck-panel-padding,calc(var(--spacing)*5))] pb-2">
          {stickyControls}
        </StickyControls>
      )}
      <div
        className={cn(
          "flex flex-col",
          embedded && !fullWidth
            ? "gap-[var(--ck-preferences-section-gap,var(--ck-panel-padding,calc(var(--spacing)*5)))]"
            : "gap-[var(--ck-preferences-section-gap,--spacing(10))]",
          isPresent(stickyControls) && "pt-5"
        )}
      >
        {children}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div
        {...rest}
        className={cn("flex min-h-0 flex-col", className)}
        ref={ref}
      >
        {isNil(toolbar) ? null : (
          <div className="flex items-center pb-[var(--ck-panel-padding,calc(var(--spacing)*5))]">
            {toolbar}
          </div>
        )}
        {content}
      </div>
    );
  }

  return (
    <div
      {...rest}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-panel in-[:root[data-ui-platform=win32]]:rounded-tl-lg",
        className
      )}
      ref={ref}
    >
      {!slate || isPresent(toolbar) ? (
        <div className="flex h-[var(--height-bar,46px)] items-center px-[var(--ck-panel-padding,calc(var(--spacing)*5))] select-none [-webkit-app-region:drag]">
          {toolbar}
        </div>
      ) : null}
      <div
        className={cn(
          "flex-1 [scrollbar-gutter:stable] overflow-y-auto",
          !slate && "p-[var(--ck-panel-padding,calc(var(--spacing)*5))]"
        )}
        ref={scrollRef}
      >
        {slate && isPresent(title) ? (
          <SearchableHeaderShell
            actions={
              isNil(action) ? null : (
                <SearchableHeaderToolbar actions={action} />
              )
            }
            className={fullWidth ? undefined : "max-w-3xl"}
            showDivider={false}
            sticky={false}
            title={
              <>
                {isNil(asset) ? null : <div className="flex">{asset}</div>}
                <h1
                  className={cn(
                    "font-medium text-text",
                    resolvedDensity === "compact"
                      ? "text-title-lg leading-[1.2]"
                      : "text-title-app leading-[1.2]"
                  )}
                >
                  {title}
                </h1>
                {isNil(subtitle) ? null : (
                  <div
                    className={cn(
                      "text-base leading-6 text-balance text-secondary",
                      subtitleClassName
                    )}
                  >
                    {subtitle}
                  </div>
                )}
              </>
            }
          />
        ) : null}
        {content}
      </div>
      {isNil(footer) ? null : (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-token-border-heavy bg-panel px-[var(--ck-panel-padding,calc(var(--spacing)*5))] py-3">
          {footer}
        </div>
      )}
    </div>
  );
};

export { SettingsContentLayout, SettingsNavigationTarget };

export type {
  SettingsContentLayoutProps,
  SettingsDensity,
  SettingsNavigationTargetProps,
};
