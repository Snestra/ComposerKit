"use client";

import { Button } from "@workspace/react/components/ui/button";
import type {
  ButtonColor,
  ButtonRadius,
  ButtonSize,
} from "@workspace/react/components/ui/button";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
/* oxlint-disable anti-slop/no-runtime-typeof -- Refs are callbacks or objects. */
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  CSSProperties,
  ElementType,
  FocusEvent,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  Ref,
  WheelEvent,
} from "react";

const isNil = <T,>(value: T): value is T & (null | undefined) =>
  value === null || value === undefined;

/* ---------------------------------------------------------------------------
 * Tab list
 * ------------------------------------------------------------------------ */

type TabsVariant =
  | "text"
  | "segmented"
  | "toolbar"
  | "settings"
  | "search"
  | "inset"
  | "page"
  | "pill"
  | "choice"
  | "filter"
  | "editor"
  | "browse"
  | "directory"
  | "segmentedPill"
  | "profile"
  | "icon"
  | "underline";

type TabsActivationMode = "automatic" | "manual";

interface TabItem {
  ariaLabel?: string;
  closeLabel?: string;
  icon?: ReactNode;
  key: string;
  name: ReactNode;
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  panelId?: string;
}

interface TabsProps {
  activationMode?: TabsActivationMode;
  animateSelection?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  fill?: boolean;
  onSelect: (key: string) => void;
  onTabClick?: (key: string) => void;
  onTabHover?: (key: string) => void;
  scrollable?: boolean;
  selectedKey: string;
  tabListRef?: Ref<HTMLDivElement>;
  tabs: readonly TabItem[];
  variant?: TabsVariant;
}

interface VariantStyle {
  closeButtonClassName: string;
  itemClassName: string;
  listClassName: string;
  segmentedEdges: boolean;
  selectedClassName: string;
  selectionIndicator: "underline" | null;
  tabButtonClassName: string;
  unselectedClassName: string;
}

const baseTabButton = "flex min-w-0 gap-1.5 rounded-md py-1 font-medium";

const baseVariant = {
  closeButtonClassName: "flex h-7 w-5 items-center justify-center",
  itemClassName: "shrink-0",
  listClassName: "flex min-w-0 items-center gap-0.5",
  segmentedEdges: false,
  selectedClassName: "bg-panel-secondary text-text",
  selectionIndicator: null,
  tabButtonClassName: "flex min-w-0 gap-1.5 rounded-md py-1 font-medium px-2",
  unselectedClassName: "text-text-muted hover:bg-panel-secondary",
} as const satisfies VariantStyle;

// Utility names follow the host stylesheet:
// text-default is --color-text, text-secondary and text-tertiary are
// --color-text-muted and --color-text-subtle, and bg-text-emphasized is
// --color-text-emphasized, which the Electron window sets to
// --ck-palette-ink like --color-text.
const variantStyles = {
  browse: {
    ...baseVariant,
    listClassName: "flex min-w-0 items-center gap-1",
    selectedClassName: "bg-fill-primary-transparent-hover text-text",
    tabButtonClassName:
      "flex h-9 min-w-0 rounded-full border border-transparent px-4 py-0 font-medium ring-inset",
    unselectedClassName:
      "text-text-muted hover:bg-fill-primary-transparent-hover/50 hover:text-text",
  },
  choice: {
    ...baseVariant,
    listClassName: "flex min-w-0 flex-wrap items-center gap-2",
  },
  directory: {
    ...baseVariant,
    listClassName: "flex min-w-0 max-w-full items-center gap-0 p-px",
    selectedClassName: "bg-fill-primary-transparent-hover text-text",
    tabButtonClassName:
      "flex h-9 min-w-0 rounded-full border border-transparent px-4 py-0 text-sm leading-5 font-medium ring-inset",
    unselectedClassName:
      "text-text-muted hover:bg-fill-primary-transparent-hover",
  },
  editor: {
    ...baseVariant,
    listClassName: "-ms-3 flex min-w-0 items-center gap-1 md:ms-0 md:gap-0",
    selectedClassName: "bg-text/5 text-text",
    tabButtonClassName:
      "flex min-h-9 min-w-0 gap-1.5 rounded-full px-3 leading-5 font-normal ring-inset md:min-h-9.5 md:px-4",
    unselectedClassName:
      "text-text-muted hover:bg-fill-primary-transparent-hover",
  },
  filter: {
    ...baseVariant,
    listClassName: "-ms-3 flex min-w-0 items-center gap-1",
    selectedClassName: "bg-text/5 text-text",
    tabButtonClassName:
      "flex min-h-9 min-w-0 gap-1.5 rounded-full px-3 leading-5 font-normal ring-inset",
    unselectedClassName:
      "text-text-muted hover:bg-fill-primary-transparent-hover",
  },
  icon: {
    ...baseVariant,
    listClassName:
      "flex max-w-full min-w-0 flex-wrap items-start justify-center gap-x-8 gap-y-2",
  },
  inset: {
    ...baseVariant,
    listClassName:
      "inline-flex min-w-0 max-w-full items-center gap-0.5 rounded-[10px] bg-panel-secondary/92 p-0.5",
  },
  page: {
    ...baseVariant,
    listClassName: "-ms-2 flex min-w-0 items-center gap-2",
    tabButtonClassName:
      "flex min-w-0 gap-1.5 rounded-md py-1 font-medium px-2 ring-inset",
  },
  pill: {
    ...baseVariant,
    listClassName: "flex min-w-0 items-center gap-1",
    selectedClassName: "bg-text/5 text-text ring-1 ring-stroke-strong",
    tabButtonClassName:
      "flex min-w-0 gap-1.5 rounded-full border border-transparent px-4 py-2 font-medium ring-inset",
    unselectedClassName:
      "text-text-subtle hover:bg-fill-primary-transparent-hover",
  },
  profile: {
    ...baseVariant,
    itemClassName: "flex-1",
    listClassName: "flex min-w-0 items-center",
    selectedClassName: "bg-fill-primary-transparent-hover text-text",
    tabButtonClassName:
      "flex h-9 w-full min-w-0 justify-center rounded-full border border-transparent px-3 py-0 font-medium",
    unselectedClassName: "text-text-muted hover:text-text",
  },
  search: {
    ...baseVariant,
    listClassName: "flex min-w-0 items-center gap-px",
    selectedClassName: "bg-fill-primary-transparent-hover text-text",
    tabButtonClassName:
      "flex h-8 min-w-0 gap-1.5 rounded-[calc(var(--radius-2xl)-var(--spacing)-1px)] px-3 font-medium",
    unselectedClassName:
      "text-text-subtle hover:bg-fill-primary-transparent-hover",
  },
  segmented: {
    closeButtonClassName: "px-1",
    itemClassName: "flex-1",
    listClassName: "flex items-center rounded-lg border border-border",
    segmentedEdges: true,
    selectedClassName: "bg-text/25 text-text",
    selectionIndicator: null,
    tabButtonClassName: "relative flex-1 rounded-none px-4 py-1.5 font-medium",
    unselectedClassName: "text-text-muted hover:bg-text/5",
  },
  segmentedPill: {
    ...baseVariant,
    listClassName: "flex min-w-0 items-center",
    selectedClassName:
      "bg-fill-primary-transparent-hover text-text font-medium",
    tabButtonClassName:
      "flex min-w-0 rounded-full px-4 py-2.25 leading-5 ring-inset",
    unselectedClassName:
      "text-text-muted font-normal hover:bg-fill-primary-transparent-hover hover:text-text",
  },
  settings: {
    ...baseVariant,
    // `button-toolbar` in the host stylesheet sets the height and the inline
    // padding only, so the radius stays rounded-md.
    tabButtonClassName: `${baseTabButton} h-7 px-2`,
  },
  text: {
    ...baseVariant,
    listClassName: "flex min-w-0 items-center justify-center gap-5",
    selectedClassName: "text-text font-semibold",
    tabButtonClassName: "flex min-h-9 min-w-0 items-center font-medium",
    unselectedClassName: "text-text-subtle hover:text-text",
  },
  toolbar: baseVariant,
  underline: {
    closeButtonClassName: "px-1",
    itemClassName: "shrink-0 pb-2",
    listClassName: "flex min-w-0 items-start gap-8 border-b border-border",
    segmentedEdges: false,
    selectedClassName: "text-text",
    selectionIndicator: "underline",
    tabButtonClassName: "flex min-w-0 gap-1.5 font-medium",
    unselectedClassName: "text-text-muted hover:text-text",
  },
} as const satisfies Record<TabsVariant, VariantStyle>;

// The inset and choice variants render each tab with the library Button
//: inset uses
// color segmentedInsetSelected or ghost with size compact, choice uses
// solidPrimary or outlineGhost with size dialogAction and radius full.
interface ButtonVariantProps {
  color: ButtonColor;
  radius?: ButtonRadius;
  size: ButtonSize;
}

const buttonVariantProps = (
  variant: TabsVariant,
  selected: boolean
): ButtonVariantProps => {
  if (variant === "inset") {
    return {
      color: selected ? "segmentedInsetSelected" : "ghost",
      size: "compact",
    };
  }

  return {
    color: selected ? "solidPrimary" : "outlineGhost",
    radius: "full",
    size: "dialogAction",
  };
};

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
};

const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false
  );

// Shared-layout indicator: a motion.span with layoutId, initial
// false and the spring { type spring, duration .25, bounce 0 } (duration 0 under
// reduced motion). Motion animates a layout change of such an element by
// projecting it: it keeps the element at its new layout and animates a
// transform (translate and scale, origin 0 0) from the box it left to identity
// with one progress value driven by the spring, and, when the box comes from
// another element (a swap between tabs), fades the new element in with
// `easeCrossfadeIn` (circOut over the first half of the progress; the old
// element is already gone). The WAAPI animations below do the same.
//
// - Mount without a previous indicator: no animation (initial false).
// - Swap between tabs: from the box the old indicator had at that moment, which
//   is its in-flight box when the swap interrupts a running animation.
// - Re-render that changes the box of the same indicator (a width change): from
//   the box it showed to the new box, without the fade.
const indicatorDuration = 250;
const indicatorSettle = 0.001;
const indicatorSamples = 100;
const springSearchSteps = 60;
const springSearchLimit = 100;
const crossfadeEnd = 0.5;
const minimumBoxChange = 0.5;

interface Box {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface InFlight {
  animation: Animation;
  from: Box;
  to: Box;
}

const departedIndicators = new Map<string, Box>();

// Critically damped spring (bounce 0, damping ratio 1) resolved from the
// duration: the envelope (1 + u) e^-u falls to
// `indicatorSettle` at the duration, so u is the root below. The progress is
// x(t) = 1 - (1 + u t / d) e^(-u t / d), set to 1 at the duration.
const springExponent = (() => {
  let low = 0;
  let high = springSearchLimit;

  for (let step = 0; step < springSearchSteps; step += 1) {
    const mid = (low + high) / 2;

    if ((1 + mid) * Math.exp(-mid) > indicatorSettle) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
})();

const springProgress = (fraction: number) => {
  if (fraction >= 1) {
    return 1;
  }

  const u = fraction * springExponent;

  return 1 - (1 + u) * Math.exp(-u);
};

// EaseCrossfadeIn = circOut compressed to the first half.
const crossfadeIn = (progress: number) => {
  if (progress >= crossfadeEnd) {
    return 1;
  }

  const x = progress / crossfadeEnd;

  return Math.sqrt(1 - (1 - x) ** 2);
};

const linearEasing = (map: (progress: number) => number) => {
  const points = Array.from({ length: indicatorSamples + 1 }, (_, index) =>
    map(springProgress(index / indicatorSamples)).toFixed(4)
  );

  points[points.length - 1] = "1";

  return `linear(${points.join(", ")})`;
};

const springEasing = linearEasing((progress) => progress);
const crossfadeEasing = linearEasing(crossfadeIn);

// Boxes are measured in the coordinates of the tab list's content, so a scroll
// of the page or of the list between two renders is not a change.
const measureBox = (element: Element): Box => {
  const rect = element.getBoundingClientRect();
  const list = element.closest('[role="tablist"]');
  const origin = list?.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left - (origin?.left ?? 0) + (list?.scrollLeft ?? 0),
    top: rect.top - (origin?.top ?? 0) + (list?.scrollTop ?? 0),
    width: rect.width,
  };
};

const sameBox = (a: Box, b: Box) =>
  Math.abs(a.left - b.left) < minimumBoxChange &&
  Math.abs(a.top - b.top) < minimumBoxChange &&
  Math.abs(a.width - b.width) < minimumBoxChange &&
  Math.abs(a.height - b.height) < minimumBoxChange;

const mixBox = (from: Box, to: Box, progress: number): Box => ({
  height: from.height + (to.height - from.height) * progress,
  left: from.left + (to.left - from.left) * progress,
  top: from.top + (to.top - from.top) * progress,
  width: from.width + (to.width - from.width) * progress,
});

// The box an in-flight animation shows now, from its eased progress.
const inFlightBox = ({ animation, from, to }: InFlight) => {
  const progress = animation.effect?.getComputedTiming().progress;

  return mixBox(from, to, progress ?? 1);
};

// Transform that puts the element, laid out at `to`, over `from`.
const projection = (from: Box, to: Box) =>
  `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;

function SelectionIndicator({ layoutId }: { layoutId: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const settled = useRef<Box | null>(null);
  const inFlight = useRef<InFlight | null>(null);
  const reducedMotion = useReducedMotion();

  // Every commit: compare the box of the tab with the box the indicator last
  // showed (the layout snapshot before the update and the new layout).
  useLayoutEffect(() => {
    const element = ref.current;
    const tab = element?.parentElement;

    if (!element || !tab) {
      return;
    }

    const layout = measureBox(tab);
    const departed = departedIndicators.get(layoutId);
    const previous = settled.current;
    const running = inFlight.current;
    const shared = departed !== undefined;
    const layoutChanged = previous !== null && !sameBox(previous, layout);

    departedIndicators.delete(layoutId);
    settled.current = layout;

    // Nothing moved: leave a running animation alone.
    if (!(shared || layoutChanged)) {
      return;
    }

    const from = departed ?? (running ? inFlightBox(running) : previous);

    if (!from || sameBox(from, layout) || reducedMotion) {
      running?.animation.cancel();
      inFlight.current = null;

      return;
    }

    running?.animation.cancel();

    const geometry = element.animate(
      [{ transform: projection(from, layout) }, { transform: "none" }],
      { duration: indicatorDuration, easing: springEasing }
    );

    inFlight.current = { animation: geometry, from, to: layout };

    geometry.addEventListener("finish", () => {
      if (inFlight.current?.animation === geometry) {
        inFlight.current = null;
      }
    });

    if (shared) {
      element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: indicatorDuration,
        easing: crossfadeEasing,
      });
    }
  });

  // On leaving, hand over the box the indicator shows at that moment.
  useLayoutEffect(() => {
    const element = ref.current;

    return () => {
      if (element) {
        departedIndicators.set(layoutId, measureBox(element));
      }
    };
  }, [layoutId]);

  return (
    <span
      aria-hidden
      className="absolute inset-0 -z-10 origin-top-left rounded-full bg-fill-primary-transparent-hover"
      ref={ref}
    />
  );
}

const scrollHorizontally = (event: WheelEvent<HTMLDivElement>) => {
  const delta = event.deltaX || event.deltaY;

  if (delta !== 0) {
    event.currentTarget.scrollLeft += delta;
  }
};

const navigationKeys = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

const hasModifier = (event: KeyboardEvent) =>
  event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

const targetIndex = (
  key: string,
  index: number,
  count: number,
  rtl: boolean
) => {
  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  const forward = key === (rtl ? "ArrowLeft" : "ArrowRight");

  return (index + (forward ? 1 : -1) + count) % count;
};

interface TabButtonOptions {
  activationMode: TabsActivationMode;
  onSelectTab: (key: string) => void;
  onTabClick?: (key: string) => void;
  onTabHover?: (key: string) => void;
  selected: boolean;
  tab: TabItem;
}

// The props shared by every `role=tab` button of the list.
const tabButtonProps = ({
  activationMode,
  onSelectTab,
  onTabClick,
  onTabHover,
  selected,
  tab,
}: TabButtonOptions) =>
  ({
    "aria-controls": tab.panelId,
    "aria-label": tab.ariaLabel,
    "aria-selected": selected,
    id: isNil(tab.panelId) ? undefined : `${tab.panelId}-tab`,
    onClick: () => {
      if (!selected || activationMode === "manual") {
        onSelectTab(tab.key);
      }

      onTabClick?.(tab.key);
    },
    onPointerEnter: isNil(onTabHover)
      ? undefined
      : () => {
          onTabHover(tab.key);
        },
    role: "tab",
    tabIndex: selected ? 0 : -1,
    type: "button",
  }) as const;

interface TabClassOptions {
  fill: boolean;
  first: boolean;
  last: boolean;
  scrollable: boolean;
  selected: boolean;
  slidingSelection: boolean;
  variant: TabsVariant;
}

// Class list of a plain (not Button based) tab.
const plainTabClass = ({
  fill,
  first,
  last,
  scrollable,
  selected,
  slidingSelection,
  variant,
}: TabClassOptions) => {
  const style: VariantStyle = variantStyles[variant];

  const selectedClassName = slidingSelection
    ? "text-text font-medium"
    : style.selectedClassName;

  return cn(
    fill && "min-w-0 flex-1 justify-center",
    slidingSelection && "relative isolate",
    "cursor-(--ck-action-cursor) items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
    variant === "search" ? "text-base" : "text-sm",
    style.tabButtonClassName,
    scrollable && "ring-inset",
    style.segmentedEdges && first && "rounded-l-md",
    style.segmentedEdges && last && "rounded-r-md",
    selected ? selectedClassName : style.unselectedClassName
  );
};

interface TabEntryProps {
  activationMode: TabsActivationMode;
  fill: boolean;
  first: boolean;
  last: boolean;
  layoutId: string;
  onSelectTab: (key: string) => void;
  onTabClick?: (key: string) => void;
  onTabHover?: (key: string) => void;
  scrollable: boolean;
  selected: boolean;
  slidingSelection: boolean;
  tab: TabItem;
  variant: TabsVariant;
}

function TabEntryButton(props: TabEntryProps) {
  const { fill, layoutId, selected, slidingSelection, tab, variant } = props;

  const buttonProps = tabButtonProps({
    activationMode: props.activationMode,
    onSelectTab: props.onSelectTab,
    onTabClick: props.onTabClick,
    onTabHover: props.onTabHover,
    selected,
    tab,
  });

  // Icon tab: the Button ghostTertiary with
  // size inline and no focus ring, size large, labels visible, elevated surface.
  if (variant === "icon") {
    return (
      <Button
        {...buttonProps}
        className="group/labeled-icon flex-col gap-1.5 pb-1.5"
        color="ghostTertiary"
        focusRing="none"
        size="inline"
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-border bg-panel text-text shadow-xs group-not-aria-selected/labeled-icon:group-not-disabled/labeled-icon:group-not-aria-disabled/labeled-icon:group-hover/labeled-icon:bg-fill-primary-transparent-hover group-focus-visible/labeled-icon:ring-2 group-focus-visible/labeled-icon:ring-ring group-aria-selected/labeled-icon:border-transparent group-aria-selected/labeled-icon:bg-fill-info-solid group-aria-selected/labeled-icon:text-(--ck-palette-label-button-primary)">
          {tab.icon}
        </span>
        <span className="w-10 text-center text-sm leading-4 whitespace-normal">
          {tab.name}
        </span>
      </Button>
    );
  }

  const content = (
    <>
      {slidingSelection && selected ? (
        <SelectionIndicator layoutId={layoutId} />
      ) : null}
      {isNil(tab.icon) ? null : (
        <span
          aria-hidden="true"
          className="flex size-4 shrink-0 items-center justify-center"
        >
          {tab.icon}
        </span>
      )}
      {fill ? <span className="truncate">{tab.name}</span> : tab.name}
    </>
  );

  if (variant === "inset" || variant === "choice") {
    return (
      <Button
        {...buttonProps}
        {...buttonVariantProps(variant, selected)}
        className={cn(
          fill && "min-w-0 flex-1 justify-center",
          slidingSelection && "relative isolate"
        )}
      >
        {content}
      </Button>
    );
  }

  return (
    <button {...buttonProps} className={plainTabClass(props)} type="button">
      {content}
    </button>
  );
}

function TabEntry(props: TabEntryProps) {
  const { last, selected, tab, variant } = props;
  const style: VariantStyle = variantStyles[variant];
  const handleClose = tab.onClose;

  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center",
        style.itemClassName,
        props.fill && "flex-1",
        !isNil(handleClose) && "group/tab"
      )}
    >
      <TabEntryButton {...props} />
      {style.selectionIndicator === "underline" && selected ? (
        <div className="absolute inset-x-0 bottom-[-1px] h-px bg-fill-primary-solid" />
      ) : null}
      {isNil(handleClose) ? null : (
        <button
          aria-label={tab.closeLabel}
          className={cn(
            "cursor-(--ck-action-cursor) text-text-subtle hover:text-text",
            style.closeButtonClassName
          )}
          onClick={handleClose}
          type="button"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
      {style.segmentedEdges && !last ? (
        <div className="h-full w-px self-stretch bg-border" />
      ) : null}
    </div>
  );
}

function Tabs({
  activationMode = "automatic",
  animateSelection = false,
  ariaLabel,
  ariaLabelledBy,
  className,
  fill = false,
  onSelect,
  onTabClick,
  onTabHover,
  scrollable = false,
  selectedKey,
  tabListRef,
  tabs,
  variant = "segmented",
}: TabsProps) {
  const layoutId = useId();
  const style: VariantStyle = variantStyles[variant];
  const slidingSelection = animateSelection && variant === "segmentedPill";

  useEffect(
    () => () => {
      departedIndicators.delete(layoutId);
    },
    [layoutId]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (hasModifier(event) || !navigationKeys.has(event.key)) {
      return;
    }

    const elements = [
      ...event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
    ];

    const index =
      event.target instanceof HTMLElement ? elements.indexOf(event.target) : -1;

    if (index < 0 || elements.length === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const target = targetIndex(event.key, index, elements.length, rtl);
    elements[target]?.focus();

    if (scrollable) {
      elements[target]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    const next = tabs[target];

    if (!isNil(next) && activationMode === "automatic") {
      onSelect(next.key);
    }
  };

  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- the tab list is a div with role tablist, tabIndex -1 and key handlers.
    <div
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        style.listClassName,
        fill && "w-full",
        scrollable &&
          "[scrollbar-width:none] overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      onKeyDown={handleKeyDown}
      onWheel={scrollable ? scrollHorizontally : undefined}
      ref={tabListRef}
      role="tablist"
      tabIndex={-1}
    >
      {tabs.map((tab, index) => (
        <TabEntry
          activationMode={activationMode}
          fill={fill}
          first={index === 0}
          key={tab.key}
          last={index === tabs.length - 1}
          layoutId={layoutId}
          onSelectTab={onSelect}
          onTabClick={onTabClick}
          onTabHover={onTabHover}
          scrollable={scrollable}
          selected={tab.key === selectedKey}
          slidingSelection={slidingSelection}
          tab={tab}
          variant={variant}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * App-shell tab strip
 * ------------------------------------------------------------------------ */

const doubleClickWindow = 500;

interface DoubleClickRecord {
  action?: () => void;
  timeStamp: number | null;
}

let doubleClicks = new WeakMap<EventTarget, DoubleClickRecord>();

const isMacPlatform = () =>
  typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

const isContextClick = (event: MouseEvent | PointerEvent) =>
  event.button !== 0 || (event.ctrlKey && isMacPlatform());

const withinDoubleClick = (event: MouseEvent) => {
  const stamp = doubleClicks.get(event.currentTarget)?.timeStamp;
  const elapsed = isNil(stamp) ? null : event.timeStamp - stamp;

  return elapsed !== null && elapsed >= 0 && elapsed <= doubleClickWindow;
};

const rememberDoubleClickAction = (event: MouseEvent, action: () => void) => {
  if (!withinDoubleClick(event)) {
    doubleClicks = new WeakMap();
    doubleClicks.set(event.currentTarget, { action, timeStamp: null });
  }
};

const runDoubleClickAction = (event: MouseEvent, action?: () => void) => {
  if (isNil(action) || isContextClick(event)) {
    return false;
  }

  const record = doubleClicks.get(event.currentTarget);

  if (withinDoubleClick(event)) {
    doubleClicks.delete(event.currentTarget);
    event.preventDefault();
    (record?.action ?? action)();

    return true;
  }

  doubleClicks.set(event.currentTarget, {
    action: isNil(record?.timeStamp) ? record?.action : undefined,
    timeStamp: event.timeStamp,
  });

  return false;
};

const stopPropagation = (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
};

const preventAndStop = (event: {
  preventDefault: () => void;
  stopPropagation: () => void;
}) => {
  event.preventDefault();
  event.stopPropagation();
};

// Marks the title as truncated.
function useOverflow() {
  const [overflowing, setOverflowing] = useState(false);

  const ref = useCallback((element: HTMLSpanElement | null) => {
    const measure = () => {
      setOverflowing(
        element !== null && element.scrollWidth > element.clientWidth
      );
    };

    const observer = new ResizeObserver(measure);

    measure();

    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return [overflowing, ref] as const;
}

/**
 * Sets one ref and returns how to undo it: a callback ref's own cleanup when
 * it returns one, else a call with `null`.
 */
const assignRef = <T,>(
  ref: Ref<T> | undefined,
  value: T | null
): (() => void) | undefined => {
  if (typeof ref === "function") {
    const cleanup = ref(value);

    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      } else {
        ref(null);
      }
    };
  }

  if (isNil(ref)) {
    return undefined;
  }

  ref.current = value;

  return () => {
    ref.current = null;
  };
};

/** Merges refs into one callback ref that keeps each ref's cleanup. */
const mergeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (value: T | null) => {
    const cleanups = refs.map((ref) => assignRef(ref, value));

    return () => {
      for (const cleanup of cleanups) {
        cleanup?.();
      }
    };
  };

interface AppShellTabRename {
  onFinishRenaming: () => void;
  onRename: (value: string | null) => void;
  renamePlaceholder?: string;
  renameValue?: string;
}

type TabActivatorElement = ElementType;

// The props the tab destructures. Every other prop is
// spread onto the wrapper div, then `activatorProps`.
interface AppShellTabOwnProps {
  accessibleStatus?: string;
  activateOnClick?: boolean;
  /** Drag activator props, spread on the wrapper after the remaining props. */
  activatorProps?: HTMLAttributes<HTMLDivElement>;
  /** Drag activator ref of the wrapper, merged with `ref`. */
  activatorRef?: Ref<HTMLDivElement>;
  className?: string;
  closeButtonTabIndex?: number;
  disabled?: boolean;
  highlightedIcon?: ReactNode;
  icon?: ReactNode;
  id?: string;
  isActive?: boolean;
  isClosable?: boolean;
  isClosing?: boolean;
  isDragging?: boolean;
  isHighlighted?: boolean;
  isLabel?: boolean;
  isPresented?: boolean;
  isPreview?: boolean;
  isSuspended?: boolean;
  onActivate?: () => void;
  onBeginRename?: () => void;
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  onDoubleClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onDoubleClickAction?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onTabClick?: () => void;
  ref?: Ref<HTMLDivElement>;
  rename?: AppShellTabRename;
  shortcutHint?: ReactNode;
  showCloseButton?: boolean;
  showsPresentedTabChrome?: boolean;
  showsTabChrome?: boolean;
  style?: CSSProperties;
  /** The element of the tab button. Default `button`. */
  tabActivator?: TabActivatorElement;
  /** Drag activator props of the tab button, spread before its own props. */
  tabActivatorProps?: HTMLAttributes<HTMLElement>;
  tabActivatorRef?: Ref<HTMLElement>;
  title: string;
  titleContent?: ReactNode;
  tooltip?: ReactNode;
  trailingActions?: ReactNode;
  trailingActionsRef?: Ref<HTMLDivElement>;
  trailingContent?: ReactNode;
}

type AppShellTabProps = AppShellTabOwnProps &
  Omit<HTMLAttributes<HTMLDivElement>, keyof AppShellTabOwnProps>;

// Every own prop. The record fails to compile when a prop is added to
// AppShellTabOwnProps and not listed here.
const ownPropKeys: Record<keyof AppShellTabOwnProps, true> = {
  accessibleStatus: true,
  activateOnClick: true,
  activatorProps: true,
  activatorRef: true,
  className: true,
  closeButtonTabIndex: true,
  disabled: true,
  highlightedIcon: true,
  icon: true,
  id: true,
  isActive: true,
  isClosable: true,
  isClosing: true,
  isDragging: true,
  isHighlighted: true,
  isLabel: true,
  isPresented: true,
  isPreview: true,
  isSuspended: true,
  onActivate: true,
  onBeginRename: true,
  onClose: true,
  onDoubleClick: true,
  onDoubleClickAction: true,
  onPointerDown: true,
  onTabClick: true,
  ref: true,
  rename: true,
  shortcutHint: true,
  showCloseButton: true,
  showsPresentedTabChrome: true,
  showsTabChrome: true,
  style: true,
  tabActivator: true,
  tabActivatorProps: true,
  tabActivatorRef: true,
  title: true,
  titleContent: true,
  tooltip: true,
  trailingActions: true,
  trailingActionsRef: true,
  trailingContent: true,
};

const isOwnProp = (key: string): key is keyof AppShellTabOwnProps =>
  Object.hasOwn(ownPropKeys, key);

const splitShellTabProps = (props: AppShellTabProps) => ({
  own: props,
  rest: Object.fromEntries(
    Object.entries(props).filter(([key]) => !isOwnProp(key))
  ),
});

interface ShellTabState {
  chrome: boolean;
  closeAlwaysShown: boolean;
  closeOnHover: boolean;
  doubleAction?: () => void;
  fadeOnHover: boolean;
  hasClose: boolean;
  hasIcon: boolean;
  hasTrailingActions: boolean;
  hasTrailingContent: boolean;
  presentedLook: boolean;
  selectedLook: boolean;
  showsHighlightedIcon: boolean;
}

const closeState = (props: AppShellTabOwnProps) => {
  const chromeShown = props.showsTabChrome ?? true;
  const closeVisible = props.showCloseButton ?? chromeShown;
  const closing = props.isClosing ?? false;

  const hasClose =
    closeVisible &&
    isNil(props.rename) &&
    (props.isClosable ?? false) &&
    !isNil(props.onClose) &&
    !closing;

  const hasTrailingActions = !isNil(props.trailingActions) && !closing;

  const closeAlwaysShown =
    hasClose && ((props.isActive ?? false) || hasTrailingActions);

  return {
    closeAlwaysShown,
    closeOnHover: hasClose && !closeAlwaysShown,
    hasClose,
    hasTrailingActions,
    hasTrailingContent: !isNil(props.trailingContent) && !closing,
  };
};

const lookState = (props: AppShellTabOwnProps) => {
  const chromeShown = props.showsTabChrome ?? true;
  const closing = props.isClosing ?? false;
  const live = chromeShown && !closing;

  const showsHighlightedIcon =
    (props.isHighlighted ?? false) && !isNil(props.highlightedIcon);

  return {
    chrome: !(props.isLabel ?? false) && chromeShown,
    hasIcon: !isNil(props.icon) || showsHighlightedIcon,
    presentedLook:
      live &&
      (props.showsPresentedTabChrome ?? false) &&
      (props.isPresented ?? false),
    selectedLook:
      live && ((props.isActive ?? false) || (props.isDragging ?? false)),
    showsHighlightedIcon,
  };
};

const shellTabState = (props: AppShellTabOwnProps): ShellTabState => {
  const close = closeState(props);

  return {
    ...close,
    ...lookState(props),
    doubleAction: props.onDoubleClickAction ?? props.onBeginRename,
    fadeOnHover:
      close.closeOnHover &&
      isNil(props.trailingContent) &&
      !close.hasTrailingActions,
  };
};

function RenameInput({
  onFinishRenaming,
  onRename,
  renamePlaceholder,
  renameValue,
}: AppShellTabRename) {
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (event.currentTarget.dataset.cancelRename === "true") {
      return;
    }

    onFinishRenaming();
    const value = event.currentTarget.value.trim();

    if (value !== (renameValue ?? "").trim()) {
      onRename(value.length === 0 ? null : value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.dataset.cancelRename = "true";
      onFinishRenaming();
    }
  };

  return (
    <input
      aria-label="Tab title"
      autoFocus
      className="h-full w-0 min-w-0 flex-1 rounded-[calc(var(--radius-md)-var(--spacing))] border border-stroke-strong bg-fill-primary-soft px-1.5 text-sm text-text outline-none select-text placeholder:text-text-subtle focus:border-ring"
      defaultValue={renameValue ?? ""}
      dir="auto"
      onBlur={handleBlur}
      onDoubleClick={stopPropagation}
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={stopPropagation}
      placeholder={renamePlaceholder}
    />
  );
}

// A mask fading the
// last 1rem to the right, flipped to the left for the listed right-to-left
// languages. The stylesheet defines the same mask, and the same flip, for the
// base class and for its group-hover/tab and group-focus-within/tab variants,
// so each state below has its own right-to-left rule.
const fadeMask =
  "w-full min-w-0 overflow-hidden text-clip whitespace-nowrap [mask-image:linear-gradient(to_right,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)] [&:is(:lang(ae),:lang(ar),:lang(arc),:lang(bcc),:lang(bqi),:lang(ckb),:lang(dv),:lang(fa),:lang(glk),:lang(he),:lang(ku),:lang(mzn),:lang(nqo),:lang(pnb),:lang(ps),:lang(sd),:lang(ug),:lang(ur),:lang(yi))]:[mask-image:linear-gradient(to_left,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)]";

const hoverFadeMask =
  "group-hover/tab:w-full group-hover/tab:min-w-0 group-hover/tab:overflow-hidden group-hover/tab:text-clip group-hover/tab:whitespace-nowrap group-hover/tab:[mask-image:linear-gradient(to_right,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)] group-hover/tab:[&:is(:lang(ae),:lang(ar),:lang(arc),:lang(bcc),:lang(bqi),:lang(ckb),:lang(dv),:lang(fa),:lang(glk),:lang(he),:lang(ku),:lang(mzn),:lang(nqo),:lang(pnb),:lang(ps),:lang(sd),:lang(ug),:lang(ur),:lang(yi))]:[mask-image:linear-gradient(to_left,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)]";

const focusFadeMask =
  "group-focus-within/tab:w-full group-focus-within/tab:min-w-0 group-focus-within/tab:overflow-hidden group-focus-within/tab:text-clip group-focus-within/tab:whitespace-nowrap group-focus-within/tab:[mask-image:linear-gradient(to_right,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)] group-focus-within/tab:[&:is(:lang(ae),:lang(ar),:lang(arc),:lang(bcc),:lang(bqi),:lang(ckb),:lang(dv),:lang(fa),:lang(glk),:lang(he),:lang(ku),:lang(mzn),:lang(nqo),:lang(pnb),:lang(ps),:lang(sd),:lang(ug),:lang(ur),:lang(yi))]:[mask-image:linear-gradient(to_left,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)]";

// Class `text-cap-trim`.
const capTrim =
  "[text-box:trim-both_cap_alphabetic] before:mb-[calc(.55cap-.55lh)] before:table before:content-[''] after:mt-[calc(.45cap-.45lh)] after:table after:content-['']";

const tooltipMaxWidth =
  "min(32rem, var(--radix-tooltip-content-available-width), calc(100vw - 16px))";

function ShellTabTitle({
  fadeOnHover,
  isDragging,
  isPreview,
  title,
  titleContent,
  tooltip,
}: {
  fadeOnHover: boolean;
  isDragging: boolean;
  isPreview: boolean;
  title: string;
  titleContent?: ReactNode;
  tooltip?: ReactNode;
}) {
  const [overflowing, titleRef] = useOverflow();

  const titleNode = (
    <span
      className={cn(
        "block w-full min-w-0 py-1 text-start whitespace-nowrap",
        capTrim,
        overflowing && fadeMask,
        fadeOnHover && hoverFadeMask,
        fadeOnHover && focusFadeMask,
        isPreview && "italic"
      )}
      dir="auto"
      key={title}
      ref={titleRef}
    >
      {titleContent ?? title}
    </span>
  );

  // A tooltip with delayOpen, side bottom and tooltipMaxWidth; disabled
  // while the tab is dragged.
  return (
    <TooltipHint
      content={tooltip}
      delayOpen
      disabled={isDragging}
      maxWidth={tooltipMaxWidth}
      side="bottom"
    >
      {titleNode}
    </TooltipHint>
  );
}

function ShellTabCloseButton({
  closeButtonTabIndex,
  closeOnHover,
  dimmed,
  hasTrailingActions,
  onClose,
  title,
}: {
  closeButtonTabIndex?: number;
  closeOnHover: boolean;
  dimmed: boolean;
  hasTrailingActions: boolean;
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  title: string;
}) {
  // The library Button, color ghost and size iconMd.
  return (
    <Button
      aria-label={`Close ${title} tab`}
      className={cn(
        "z-30",
        hasTrailingActions
          ? "relative"
          : "absolute end-1.75 top-1/2 -translate-y-1/2",
        closeOnHover &&
          "pointer-events-none opacity-0 group-focus-within/tab:pointer-events-auto group-focus-within/tab:opacity-100 group-hover/tab:pointer-events-auto group-hover/tab:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
      )}
      color="ghost"
      data-ck-shell-tab-close-button
      onClick={onClose}
      onMouseDown={preventAndStop}
      onPointerDown={stopPropagation}
      size="iconMd"
      tabIndex={closeButtonTabIndex}
    >
      <X aria-hidden className={cn("size-3.5", dimmed && "opacity-50")} />
    </Button>
  );
}

// `icon-xs relative flex shrink-0 items-center justify-center
// overflow-visible`, 16px.
function ShellTabIcon({
  highlightedIcon,
  icon,
  isSuspended,
  showsHighlightedIcon,
}: {
  highlightedIcon?: ReactNode;
  icon?: ReactNode;
  isSuspended: boolean;
  showsHighlightedIcon: boolean;
}) {
  return (
    <span
      aria-hidden
      className="relative flex size-4 shrink-0 items-center justify-center overflow-visible"
    >
      {isNil(icon) ? null : (
        <span
          className={cn(
            "flex size-full items-center justify-center",
            isSuspended && !showsHighlightedIcon && "opacity-70",
            showsHighlightedIcon && "opacity-30"
          )}
        >
          {icon}
        </span>
      )}
      {showsHighlightedIcon ? (
        <span className="pointer-events-none absolute inset-0 z-10 flex size-full items-center justify-center">
          {highlightedIcon}
        </span>
      ) : null}
    </span>
  );
}

function ShellTabChrome({
  chrome,
  isDragging,
  presentedLook,
  selectedLook,
}: {
  chrome: boolean;
  isDragging: boolean;
  presentedLook: boolean;
  selectedLook: boolean;
}) {
  const raised = selectedLook || presentedLook;

  // `data-ck-shell-tab-capture` is the element the drag preview captures for
  // the label presentation, set while dragging.
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 rounded-md",
        chrome && "border-(length:--ck-hairline-width)",
        chrome &&
          raised &&
          "border-border bg-[light-dark(var(--theme-background-control-opaque),var(--ck-palette-surface-button-secondary-hover))]",
        chrome && selectedLook && "shadow-sm",
        chrome &&
          !raised &&
          "border-transparent group-hover/tab:bg-fill-primary-transparent-hover"
      )}
      data-ck-shell-tab-capture={isDragging && chrome ? "" : undefined}
    />
  );
}

function ShellTabRename({
  disabled,
  icon,
  rename,
}: {
  disabled: boolean;
  icon?: ReactNode;
  rename: AppShellTabRename;
}) {
  return (
    <div
      className={cn(
        "relative z-10 flex h-full min-w-0 flex-1 items-center gap-2 px-2 py-1 ps-2.5 pe-1 text-sm text-text [-webkit-app-region:no-drag]",
        disabled && "opacity-50"
      )}
    >
      {isNil(icon) ? null : (
        <span
          aria-hidden
          className="relative flex size-4 shrink-0 items-center justify-center"
        >
          {icon}
        </span>
      )}
      <RenameInput {...rename} />
    </div>
  );
}

const shellTabButtonClass = (
  props: AppShellTabOwnProps,
  state: ShellTabState
) => {
  const closing = props.isClosing ?? false;
  const active = props.isActive ?? false;
  const presented = props.isPresented ?? false;

  return cn(
    "disabled:opacity-50",
    isNil(props.rename)
      ? "relative z-10 flex h-full min-w-0 flex-1 items-center rounded-md px-2 py-1 ps-2.5 text-sm [-webkit-app-region:no-drag]"
      : "hidden",
    state.hasTrailingActions && "pe-0",
    !state.hasTrailingActions && (state.hasClose ? "pe-1.75" : "pe-1"),
    !closing && (active || presented) && "text-text",
    (closing || !(active || presented)) && "text-text-subtle"
  );
};

// The `focusVisible` focus option is a browser behaviour the DOM typings lack.
const focusWithoutRing = (element: HTMLElement) => {
  const options: FocusOptions & { focusVisible: boolean } = {
    focusVisible: false,
    preventScroll: true,
  };

  element.focus(options);
};

const shellTabHandlers = (props: AppShellTabOwnProps, state: ShellTabState) => {
  const {
    activateOnClick = false,
    activatorProps,
    isClosable = false,
    onActivate,
    onClose,
    onDoubleClick,
    onDoubleClickAction,
    onPointerDown,
    onTabClick,
    tabActivatorProps,
  } = props;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (
      event.detail !== 0 &&
      (runDoubleClickAction(event, state.doubleAction) ||
        (activateOnClick && event.ctrlKey && isMacPlatform()))
    ) {
      return;
    }

    if (activateOnClick) {
      onActivate?.();

      if (event.detail !== 0) {
        focusWithoutRing(event.currentTarget);
      }
    }

    onTabClick?.();
  };

  // The mousedown records only `onDoubleClickAction`; the click falls back to
  // `onBeginRename` by itself.
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (isClosable && event.button === 1) {
      preventAndStop(event);
    } else if (isContextClick(event)) {
      event.preventDefault();
    } else {
      if (!isNil(onDoubleClickAction)) {
        rememberDoubleClickAction(event, onDoubleClickAction);
      }

      if (activateOnClick) {
        event.preventDefault();
      } else {
        onActivate?.();
      }
    }
  };

  const handleMiddleButton = (event: MouseEvent<HTMLButtonElement>) => {
    if (isClosable && event.button === 1) {
      preventAndStop(event);
    }
  };

  const handleAuxClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isClosable && event.button === 1) {
      preventAndStop(event);
      onClose?.(event);
    }
  };

  // onDoubleClickAction prevents the rename callback without running the action.
  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isNil(onDoubleClickAction)) {
      return;
    }

    if (isNil(props.onBeginRename)) {
      onDoubleClick?.(event);
    } else {
      props.onBeginRename();
    }
  };

  // The activator's pointerdown, then the caller's, for the
  // primary button only.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isContextClick(event)) {
      event.stopPropagation();
    } else {
      activatorProps?.onPointerDown?.(event);
      onPointerDown?.(event);
    }
  };

  const handleTabPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isContextClick(event)) {
      event.stopPropagation();
    } else {
      tabActivatorProps?.onPointerDown?.(event);
    }
  };

  return {
    handleAuxClick,
    handleClick,
    handleDoubleClick,
    handleMiddleButton,
    handleMouseDown,
    handlePointerDown,
    handleTabPointerDown,
  };
};

function ShellTabContent({
  props,
  state,
  trailingId,
}: {
  props: AppShellTabOwnProps;
  state: ShellTabState;
  trailingId: string;
}) {
  const { isClosing = false, isDragging = false, title } = props;

  // The end padding and margin follow the always-shown close button
  // and appear on hover or focus when the button shows on hover.
  const reservesClose = state.closeAlwaysShown && !state.hasTrailingActions;
  const reservesCloseOnHover = state.closeOnHover && !state.hasTrailingActions;

  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        reservesClose && "pe-5",
        reservesCloseOnHover &&
          "group-focus-within/tab:pe-5 group-hover/tab:pe-5"
      )}
    >
      {state.hasIcon ? (
        <ShellTabIcon
          highlightedIcon={props.highlightedIcon}
          icon={props.icon}
          isSuspended={props.isSuspended ?? false}
          showsHighlightedIcon={state.showsHighlightedIcon}
        />
      ) : null}
      <span
        className={cn(
          "relative min-w-0 flex-1 overflow-hidden",
          state.hasIcon && "-ms-1"
        )}
      >
        <ShellTabTitle
          fadeOnHover={state.fadeOnHover}
          isDragging={isDragging}
          isPreview={props.isPreview ?? false}
          title={title}
          titleContent={props.titleContent}
          tooltip={props.tooltip}
        />
      </span>
      {isClosing ? null : props.shortcutHint}
      {state.hasTrailingContent ? (
        <span
          className={cn(
            "-ms-1.5 flex min-w-0 shrink-0 items-center overflow-hidden",
            reservesClose && "me-1.75",
            reservesCloseOnHover &&
              "group-focus-within/tab:me-1.75 group-hover/tab:me-1.75",
            state.closeOnHover &&
              "group-focus-within/tab:shrink group-hover/tab:shrink"
          )}
          id={trailingId}
        >
          {props.trailingContent}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The app-shell tab. The drag controller of the app is not part
 * of the tab: it passes `activatorRef` and `activatorProps` (wrapper) or
 * `tabActivatorRef` and `tabActivatorProps` (tab button), `style`, and any
 * other wrapper attribute. The tab owns what the controller reads from it:
 * the `data-ck-tab-id` of the wrapper, the `data-ck-shell-tab-capture` marker
 * while dragging, the dragging look, the disabled tooltip, the regions that
 * opt out of window dragging, and the close button that never starts a drag.
 */
function AppShellTab(allProps: AppShellTabProps) {
  const statusId = useId();
  const trailingId = useId();
  const { own: props, rest } = splitShellTabProps(allProps);
  const state = shellTabState(props);
  const handlers = shellTabHandlers(props, state);

  const {
    accessibleStatus,
    activatorProps,
    activatorRef,
    className,
    disabled = false,
    id,
    isActive = false,
    isClosing = false,
    isDragging = false,
    onClose,
    ref,
    rename,
    style,
    tabActivator: Activator = "button",
    tabActivatorProps,
    tabActivatorRef,
    title,
    trailingActions,
    trailingActionsRef,
  } = props;

  const wrapperRef = mergeRefs(activatorRef, ref);

  const describedBy =
    [
      state.hasTrailingContent ? trailingId : null,
      isNil(accessibleStatus) ? null : statusId,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const closeButton = state.hasClose ? (
    <ShellTabCloseButton
      closeButtonTabIndex={props.closeButtonTabIndex}
      closeOnHover={state.closeOnHover}
      dimmed={disabled && !state.hasTrailingActions}
      hasTrailingActions={state.hasTrailingActions}
      onClose={onClose}
      title={title}
    />
  ) : null;

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the wrapper handles pointer and double-click events for the tab it contains.
    <div
      data-ck-tab-id={id}
      className={cn(
        "group/tab relative flex h-8 shrink-0 items-center rounded-lg select-none",
        state.hasTrailingActions && "pe-1.75",
        isClosing && "overflow-hidden",
        className
      )}
      ref={wrapperRef}
      // oxlint-disable-next-line shadcn/no-inline-styles -- the tab forwards the style prop of its caller to the wrapper.
      style={style}
      {...rest}
      {...activatorProps}
      onDoubleClick={handlers.handleDoubleClick}
      onPointerDown={handlers.handlePointerDown}
    >
      <ShellTabChrome
        chrome={state.chrome}
        isDragging={isDragging}
        presentedLook={state.presentedLook}
        selectedLook={state.selectedLook}
      />
      {isNil(rename) ? null : (
        <ShellTabRename disabled={disabled} icon={props.icon} rename={rename} />
      )}
      <Activator
        ref={tabActivatorRef}
        {...tabActivatorProps}
        aria-describedby={describedBy}
        aria-label={title}
        aria-selected={isActive && !isClosing}
        className={shellTabButtonClass(props, state)}
        disabled={disabled}
        onAuxClick={handlers.handleAuxClick}
        onClick={handlers.handleClick}
        onMouseDown={handlers.handleMouseDown}
        onMouseUp={handlers.handleMiddleButton}
        onPointerDown={handlers.handleTabPointerDown}
        role="tab"
        type="button"
      >
        {isNil(accessibleStatus) ? null : (
          <span className="sr-only" id={statusId}>
            {accessibleStatus}
          </span>
        )}
        <ShellTabContent props={props} state={state} trailingId={trailingId} />
      </Activator>
      {state.hasTrailingActions ? (
        <div
          className={cn(
            "relative z-10 flex shrink-0 items-center gap-1.5 [-webkit-app-region:no-drag]",
            disabled && "opacity-50"
          )}
          onDoubleClick={stopPropagation}
          onPointerDown={stopPropagation}
          ref={trailingActionsRef}
        >
          {trailingActions}
          {closeButton}
        </div>
      ) : (
        closeButton
      )}
    </div>
  );
}

// `div` with className contents, aria-orientation horizontal, role tablist.
function AppShellTabList({
  ariaLabel,
  children,
}: {
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className="contents"
      role="tablist"
    >
      {children}
    </div>
  );
}

// The new tab button has the
// default size `toolbar`: h-7 py-0, square when uniform, and rounded-lg (28px).
// The tooltip opens after 250ms.
function NewTabButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  title: string;
}) {
  return (
    <TooltipHint content={title} openDelay={250}>
      <Button
        aria-label={title}
        color="ghost"
        onClick={onClick}
        size="toolbar"
        uniform
      >
        {children}
      </Button>
    </TooltipHint>
  );
}

export { AppShellTab, AppShellTabList, NewTabButton, Tabs };

export type {
  AppShellTabOwnProps,
  AppShellTabProps,
  AppShellTabRename,
  TabItem,
  TabsActivationMode,
  TabsProps,
  TabsVariant,
};
