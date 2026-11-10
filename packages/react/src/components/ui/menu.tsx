"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useFocusScope } from "@workspace/react/components/dialog/dialog-layer";
import { formatAccelerator } from "@workspace/react/components/ui/keyboard-shortcut";
import {
  TooltipHint,
  dismissTooltips,
} from "@workspace/react/components/ui/tooltip";
import type { TooltipHintProps } from "@workspace/react/components/ui/tooltip";
import { useDismissableLayer } from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import {
  Check as LucideCheck,
  ChevronRight as LucideChevronRight,
  Search as LucideSearch,
} from "lucide-react";
import {
  Children,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
  Ref,
  SVGProps,
} from "react";

/* ------------------------------------------------------------------ helpers */

type RefCleanup = (() => void) | undefined;

const assignRef = <T,>(
  ref: Ref<T> | undefined,
  value: T | null
): RefCleanup => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a ref is a callback or an object, and a callback may return a cleanup
  if (typeof ref === "function") {
    // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: a ref callback may return a cleanup, which React's ref types model as void
    const cleanup = ref(value) as unknown;

    // oxlint-disable-next-line anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- a ref is a callback or an object, and a callback may return a cleanup; SAFETY: the value was checked to be a function on this line
    return typeof cleanup === "function" ? (cleanup as () => void) : undefined;
  }

  if (ref !== null && ref !== undefined) {
    ref.current = value;

    return () => {
      ref.current = null;
    };
  }

  return undefined;
};

/** One callback ref that keeps every merged ref's cleanup. */
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

const isNil = <T,>(value: T): value is T & (null | undefined) =>
  value === null || value === undefined;

const ITEM_SELECTOR =
  '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

type Dir = "ltr" | "rtl";

interface Point {
  x: number;
  y: number;
}

/* ------------------ constants */

/** Hover-open delay of the dropdown trigger (ms). */
const HOVER_OPEN_DELAY = 200;

/** Close delay after the pointer leaves (ms). */
const HOVER_CLOSE_DELAY = 100;

/** Padding of the handoff triangle's far edge. */
const TRIANGLE_PADDING = 8;

/** Radix typeahead reset (ms). */
const TYPEAHEAD_RESET = 1000;

/** Radix pointer grace timer (ms). */
const GRACE_TIMER = 300;

const OPPOSITE_SIDE = {
  bottom: "top",
  left: "right",
  right: "left",
  top: "bottom",
} as const;

type Side = keyof typeof OPPOSITE_SIDE;

const isSide = (value: string | undefined): value is Side =>
  value === "top" ||
  value === "right" ||
  value === "bottom" ||
  value === "left";

const widthClasses = {
  icon: "min-w-[120px]",
  menu: "min-w-[var(--ck-popup-min-width,220px)]",
  menuBounded: "min-w-[200px] max-w-[320px]",
  menuFixed: "w-[220px]",
  menuNarrow: "w-52",
  menuReadout: "w-65",
  menuWide: "w-[240px]",
  panel: "w-[280px]",
  panelExtraWide: "w-[408px]",
  panelWide: "w-[360px]",
  railMenu: "w-57",
  sidebar: "min-w-[172px] max-w-[240px]",
  sm: "min-w-[180px]",
  workspace: "min-w-[260px]",
  xs: "min-w-[160px]",
} as const;

type MenuContentWidth = keyof typeof widthClasses;

const heightPresets = {
  compact: "200px",
  composerPlugins: "var(--ck-compose-height-plugins-menu, 250px)",
  list: "250px",
  listWithPeek:
    "calc(round(nearest, 250px, var(--ck-popup-item-height)) + var(--ck-popup-item-height) / 2 + var(--ck-popup-gutter, var(--spacing)))",
  tall: "350px",
} as const;

type MenuContentMaxHeight = keyof typeof heightPresets | "available";

const maxHeightFor = (
  preset: MenuContentMaxHeight | undefined,
  available: string,
  viewport = "calc(100vh - 16px)"
) => {
  if (isNil(preset)) {
    return;
  }

  const base = preset === "available" ? viewport : heightPresets[preset];

  // oxlint-disable-next-line typescript/consistent-return -- no preset gives no limit
  return `min(${base}, ${available}, ${viewport})`;
};

const contentLimits: CSSProperties = {
  // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets this size limit through a style prop from computed values
  maxHeight: "min(var(--available-height), calc(100vh - 16px))",
  maxWidth: "min(var(--available-width), calc(100vw - 16px))",
};

/* ---------------------------------------------------------- surfaces */

type MenuSurface =
  | "bare"
  | "rounded"
  | "glass"
  | "menu"
  | "opaque"
  | "panel"
  | "reaction";

const ringShadow =
  "ring-[0.5px] ring-border shadow-[0_0_0_0.5px_var(--border),var(--shadow-xl)]";

const surfaceClasses = (surface: MenuSurface) => {
  if (surface === "reaction") {
    return `rounded-full bg-panel-elevated-secondary/90 text-text backdrop-blur-sm ${ringShadow}`;
  }

  if (surface === "rounded") {
    return "min-w-40 rounded-3xl bg-panel-elevated-secondary py-2.5 text-text shadow-[0_0_0_0.5px_var(--border),var(--shadow-xl)]";
  }

  const base =
    surface === "opaque"
      ? "bg-panel-elevated-secondary text-text shadow-[0_0_0_0.5px_var(--border),var(--shadow-xl)]"
      : `bg-panel-elevated-secondary/90 text-text backdrop-blur-sm ${ringShadow}`;

  return surface === "panel"
    ? `${base} rounded-2xl p-4 shadow-2xl backdrop-blur-lg`
    : `${base} rounded-2xl p-[var(--ck-popup-gutter,var(--spacing))]`;
};

/**
 * The glass surface uses the ordinary menu surface (translucent fill, ring,
 * shadow, blur, padding) with the radii below.
 */
const glassClasses = [
  "[--ck-popup-item-radius:calc(var(--spacing)*3)] !rounded-[calc(var(--ck-popup-item-radius)+var(--ck-popup-gutter,var(--spacing)))]",
  "[&>:is([role=menuitem],[role=menuitemcheckbox],[role=menuitemradio])]:!rounded-[var(--ck-popup-item-radius)]",
].join(" ");

/* Row density. */

type MenuSize =
  | "action"
  | "compact"
  | "default"
  | "descriptive"
  | "inset"
  | "large"
  | "select";

const sizeClasses = {
  action:
    "[--ck-popup-gutter:calc(var(--spacing)*2)] [--icon-start-size:calc(var(--spacing)*5)] [--ck-popup-item-height:calc(var(--spacing)*9)] [--ck-popup-item-padding:calc(var(--spacing)*2)] [--ck-popup-item-font-size:calc(var(--spacing)*3.5)] [--ck-popup-item-line-height:calc(var(--spacing)*5)] [--spacing-menu-content-gap:calc(var(--spacing)*3)] [--ck-popup-separator-gutter:calc(var(--spacing)*2)] [--ck-popup-separator-inset:calc(var(--spacing)*2.5)]",
  compact:
    "[--ck-popup-gutter:var(--spacing)] [--ck-popup-item-height:calc(var(--spacing)*7.75)] [--ck-popup-item-padding:calc(var(--spacing)*1.25)_calc(var(--spacing)*2)] [--ck-popup-item-font-size:calc(var(--spacing)*3.25)] [--ck-popup-item-line-height:calc(var(--spacing)*5)] [--ck-popup-title-padding:var(--spacing)_calc(var(--spacing)*2)] [--ck-popup-title-line-height:var(--ck-popup-item-line-height)] [--ck-popup-separator-gutter:calc(var(--spacing)*1.5)] [--ck-popup-separator-inset:calc(var(--spacing)*2)]",
  default: "",
  descriptive:
    "[--ck-popup-gutter:calc(var(--spacing)*2)] [--icon-start-size:calc(var(--spacing)*5)] [--ck-popup-item-height:calc(var(--spacing)*14)] [--ck-popup-item-padding:calc(var(--spacing)*2)] [--ck-popup-item-font-size:var(--text-base)] [--ck-popup-item-line-height:calc(var(--spacing)*5)] [--spacing-menu-content-gap:calc(var(--spacing)*3)]",
  inset:
    "[--ck-popup-gutter:calc(var(--spacing)*3)] [--ck-popup-item-height:calc(var(--spacing)*9)] [--ck-popup-item-padding:calc(var(--spacing)*2)_calc(var(--spacing)*2.5)] [--ck-popup-separator-gutter:calc(var(--spacing)*1.5)] [--ck-popup-separator-inset:calc(var(--spacing)*2.5)]",
  large: `[--icon-start-size:calc(var(--spacing)*5)] [--ck-popup-separator-gutter:calc(var(--spacing)*2)] [--ck-popup-item-height:calc(var(--spacing)*10)] [--spacing-menu-content-gap:calc(var(--spacing)*2)] [--ck-popup-item-padding:calc(var(--spacing)*1.5)_calc(var(--spacing)*2)] [&_:is([role=menuitem],[role=menuitemcheckbox],[role=menuitemradio])]:mx-2.5 [&_[data-ck-menu-section-label]]:px-5 [&_[data-ck-menu-section-label]]:py-1 [&_[data-ck-menu-section-label]]:text-[length:var(--text-sm)] [&_[data-ck-menu-section-label]]:leading-5 [&_[data-ck-menu-section-label]]:text-text-subtle [&_[data-ck-menu-section-label]:first-child]:pt-3 [&_[data-ck-menu-row-content]]:gap-2`,
  select:
    "[--ck-popup-gutter:var(--spacing)] [--icon-start-size:calc(var(--spacing)*4)] [--ck-popup-item-height:calc(var(--spacing)*10)] [--ck-popup-item-padding:calc(var(--spacing)*1.5)_calc(var(--spacing)*3)] [--spacing-menu-content-gap:calc(var(--spacing)*2)]",
} as const satisfies Record<MenuSize, string>;

const singleLineClasses = `[&_:is([role=menuitem],[role=menuitemcheckbox],[role=menuitemradio])]:h-[var(--ck-choice-menu-item-height,calc(max(1lh,var(--icon-start-size,16px))+var(--ck-row-padding-y,5px)*2))] [&_:is([role=menuitem],[role=menuitemcheckbox],[role=menuitemradio])]:shrink-0 [&_:is([role=menuitem],[role=menuitemcheckbox],[role=menuitemradio])]:overflow-hidden [&_[data-ck-menu-row-content]]:max-h-[max(1lh,var(--icon-start-size,16px))] [&_[data-ck-menu-row-content]]:overflow-hidden [&_[data-ck-menu-row-content]>*]:max-h-[max(1lh,var(--icon-start-size,16px))] [&_[data-ck-menu-row-content]>*]:overflow-hidden [&_[data-ck-leading-icon-slot=menu]]:overflow-hidden`;

type MenuRowLayout = "single-line";

/** Class `text-fade-truncate`, as in the tabs family. */
const fadeTruncate =
  "w-full min-w-0 overflow-hidden text-clip whitespace-nowrap [mask-image:linear-gradient(to_right,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)] [&:is(:lang(ae),:lang(ar),:lang(arc),:lang(bcc),:lang(bqi),:lang(ckb),:lang(dv),:lang(fa),:lang(glk),:lang(he),:lang(ku),:lang(mzn),:lang(nqo),:lang(pnb),:lang(ps),:lang(sd),:lang(ug),:lang(ur),:lang(yi))]:[mask-image:linear-gradient(to_left,#000_calc(100%-var(--ck-truncation-fade,1rem)),transparent)]";

/* ------------------------------------------------------ item base */

const itemBase =
  "flex min-h-[var(--ck-popup-item-height,0px)] shrink-0 items-center justify-center p-[var(--ck-popup-item-padding,var(--ck-row-padding-y,5px)_var(--ck-row-padding-x,8px))] text-[length:var(--ck-popup-item-font-size,var(--text-sm))] leading-[var(--ck-popup-item-line-height,var(--text-sm--line-height))] outline-hidden";

const itemInteractive =
  "group cursor-(--ck-action-cursor) hover:bg-fill-primary-transparent-hover focus:bg-fill-primary-transparent-hover";

const itemIconClasses =
  "shrink-0 opacity-75 group-hover:opacity-100 group-focus:opacity-100";

const rowContentClasses =
  "flex w-full items-center gap-[var(--spacing-menu-content-gap,calc(var(--spacing)*1.5))]";

/** Literal class names: Tailwind reads class names from source text, so they are not built from parts. */
const dangerTextClass = "text-[color:var(--color-status-danger)]";
const dangerTextImportant = "!text-[color:var(--color-status-danger)]";
const warningTextClass = "text-[color:var(--color-status-warning)]";
const warningTextImportant = "!text-[color:var(--color-status-warning)]";

const destructiveRow =
  "group cursor-(--ck-action-cursor) hover:bg-[color-mix(in_oklab,#e5484d_16%,transparent)] focus:bg-[color-mix(in_oklab,#e5484d_16%,transparent)]";

/* ---------------------------------------------------------------- icons */

/** 17px checkmark. */
const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <LucideCheck
    aria-hidden
    height={17}
    width={17}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    strokeWidth={1.5}
  />
);

/** 20px chevron-right. */
const ChevronIcon = (props: SVGProps<SVGSVGElement>) => (
  <LucideChevronRight
    aria-hidden
    height={20}
    width={20}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    strokeWidth={1.5}
  />
);

/** Chevron-right-md-light-16 (flyout trigger). */
const FlyoutChevronIcon = (props: SVGProps<SVGSVGElement>) => (
  <LucideChevronRight
    aria-hidden
    height={16}
    width={16}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    strokeWidth={1.5}
  />
);

/** Magnifying-glass-lg-light-16. */
const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <LucideSearch
    aria-hidden
    height={16}
    width={16}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    strokeWidth={1.5}
  />
);

/** Checkmark-md-light-16 (rounded radio item). */
const MenuCheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <LucideCheck
    aria-hidden
    height={16}
    width={16}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    strokeWidth={1.5}
  />
);

/* -------------------------------------------------------------- scale */

const MenuZoomContext = createContext(1);

/** The window zoom the app supplies; 1 without a provider. */
function MenuZoomProvider({
  children,
  zoom,
}: {
  children?: ReactNode;
  zoom: number;
}) {
  return <MenuZoomContext value={zoom}>{children}</MenuZoomContext>;
}

const useMenuZoom = () => use(MenuZoomContext);

const defaultSideOffset = (zoom: number) => 5 - zoom;

/* Open state. */

interface OpenStateOptions {
  disabled?: boolean;
  dismissOnWindowBlur?: boolean;
}

/** Controlled or uncontrolled open state with disabled and window-blur dismissal. */
const useMenuOpenState = (
  controlled: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
  { disabled = false, dismissOnWindowBlur = true }: OpenStateOptions = {}
) => {
  const [internal, setInternal] = useState(false);

  if (disabled && internal) {
    setInternal(false);
  }

  const open = !disabled && (controlled ?? internal);

  const handleOpenChange = (next: boolean) => {
    if (disabled && next) {
      return;
    }

    if (next) {
      dismissTooltips();
    }

    if (controlled === undefined) {
      setInternal(next);
    }

    onOpenChange?.(next);
  };

  const latest = useRef(handleOpenChange);

  useLayoutEffect(() => {
    latest.current = handleOpenChange;
  });

  useEffect(() => {
    if (!open || !dismissOnWindowBlur) {
      return;
    }

    const onBlur = () => {
      latest.current(false);
    };

    window.addEventListener("blur", onBlur);

    // oxlint-disable-next-line typescript/consistent-return -- the effect returns a cleanup only on the paths that set something up
    return () => {
      window.removeEventListener("blur", onBlur);
    };
  }, [dismissOnWindowBlur, open]);

  return { handleOpenChange, open };
};

/* ------------------------------------------------- Radix menu mechanics */

/** Radix `getNextMatch`. */
const getNextMatch = (
  values: readonly string[],
  search: string,
  currentMatch: string | undefined
) => {
  // oxlint-disable-next-line typescript/no-misused-spread -- Radix tests the repeat per code point, like Array.from.
  const characters = [...search];

  const normalized =
    search.length > 1 && characters.every((char) => char === search[0])
      ? search[0]
      : search;

  const index = isNil(currentMatch) ? -1 : values.indexOf(currentMatch);
  const start = Math.max(index, 0);
  let wrapped = values.map((_, at) => values[(start + at) % values.length]);

  if (normalized.length === 1) {
    wrapped = wrapped.filter((value) => value !== currentMatch);
  }

  const match = wrapped.find((value) =>
    value.toLowerCase().startsWith(normalized.toLowerCase())
  );

  return match === currentMatch ? undefined : match;
};

/** Radix `isPointInPolygon`. */
const isPointInPolygon = (point: Point, polygon: readonly Point[]) => {
  let inside = false;

  for (
    let at = 0, prev = polygon.length - 1;
    at < polygon.length;
    prev = at, at += 1
  ) {
    const current = polygon[at];
    const previous = polygon[prev];

    if (
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x
    ) {
      inside = !inside;
    }
  }

  return inside;
};

interface GraceIntent {
  area: Point[];
  side: Side;
}

/** Radix `whenMouse`. */
const whenMouse =
  <E extends { pointerType: string }>(handler: (event: E) => void) =>
  (event: E) => {
    if (event.pointerType === "mouse") {
      handler(event);
    }
  };

/** Radix focusFirst. */
const focusFirst = (candidates: readonly HTMLElement[]) => {
  const previous = document.activeElement;

  for (const candidate of candidates) {
    if (candidate === previous) {
      return;
    }

    candidate.focus();

    if (document.activeElement !== previous) {
      return;
    }
  }
};

/** Radix roving-group entry focus: the first enabled row of the menu. */
const entryRow = (content: HTMLElement) =>
  [...content.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].find(
    (row) =>
      !Object.hasOwn(row.dataset, "disabled") &&
      row.closest('[role="menu"]') === content
  );

/** The focusable rows after `element` inside its menu. */
const rowsAfter = (element: HTMLElement) => {
  const menu = element.closest('[role="menu"]');

  if (!menu) {
    return [];
  }

  const rows = [
    ...menu.querySelectorAll<HTMLElement>(`input, ${ITEM_SELECTOR}`),
  ];

  return rows.slice(rows.indexOf(element) + 1).filter((row) => {
    const role = row.getAttribute("role");

    return (
      (role === "menuitem" ||
        role === "menuitemcheckbox" ||
        role === "menuitemradio") &&
      !Object.hasOwn(row.dataset, "disabled") &&
      row.getAttribute("aria-disabled") !== "true"
    );
  });
};

/** Moves focus to the next or previous enabled row. */
const focusMenuItem = (
  element: HTMLElement,
  direction: "next" | "previous"
) => {
  const rows = rowsAfter(element);
  const target = direction === "next" ? rows[0] : rows.at(-1);

  target?.focus();

  return !isNil(target);
};

/* --------------------------------------------------------- contexts */

interface MenuRootContextValue {
  close: () => void;
  dir: Dir;
  isUsingKeyboard: { current: boolean };
  open: boolean;
}

const MenuRootContext = createContext<MenuRootContextValue | null>(null);

const useMenuRoot = () => {
  const context = use(MenuRootContext);

  if (!context) {
    throw new Error("Place menu parts under a Menu root.");
  }

  return context;
};

interface MenuContentContextValue {
  contentRef: { current: HTMLElement | null };
  onItemEnter: (event: ReactPointerEvent) => void;
  onItemLeave: (event: ReactPointerEvent) => void;
  onPointerGraceIntentChange: (intent: GraceIntent | null) => void;
  onTriggerLeave: (event: ReactPointerEvent) => void;
  pointerGraceTimer: { current: number };
  searchRef: { current: string };
}

const MenuContentContext = createContext<MenuContentContextValue | null>(null);

const useMenuContent = () => {
  const context = use(MenuContentContext);

  if (!context) {
    throw new Error("MenuContent must contain each menu item.");
  }

  return context;
};

/** Preserves the trigger as a focus target. */
const MenuFocusTargetContext = createContext<{
  current: Element | null | undefined;
} | null>(null);

/** Remembers the focused element across a loading to loaded content swap. */
const createFocusTarget = (
  shared: { current: Element | null | undefined } | null
) => {
  let previous: HTMLElement | null = null;
  let target: HTMLElement | null = null;
  let interacted = false;

  return {
    onCloseAutoFocus(event: Event) {
      if (shared === null || event.defaultPrevented) {
        return;
      }

      shared.current = undefined;

      if (!document.hasFocus()) {
        event.preventDefault();

        return;
      }

      const active = document.activeElement;

      if (
        active !== document.body &&
        active !== previous &&
        // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
        !target?.contains(active)
      ) {
        event.preventDefault();
      } else if (
        !interacted &&
        // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
        previous?.isConnected &&
        previous !== document.body &&
        previous.closest("[inert]") === null
      ) {
        event.preventDefault();
        previous.focus({ preventScroll: true });
      }
    },
    onInteractOutside(event: Event) {
      if (!event.defaultPrevented) {
        interacted = true;
      }
    },
    onOpenAutoFocus(event: Event, preserve = false) {
      if (shared === null) {
        return;
      }

      const active = shared.current ?? document.activeElement;

      shared.current = preserve ? active : undefined;
      previous = active instanceof HTMLElement ? active : null;
      target = event.target instanceof HTMLElement ? event.target : null;
      interacted = false;
    },
  };
};

/** The container the menu and its flyout submenus portal into (the body when unset). */
const MenuPortalContainerContext = createContext<HTMLElement | null>(null);

/* ------------------------------------------------------------ Menu */

interface MenuPlacement {
  align?: "center" | "end" | "start";
  alignOffset?: number;
  side?: Side;
  sideOffset?: number;
}

interface FocusEventLike extends Event {
  preventDefault: () => void;
}

interface MenuProps {
  align?: "center" | "end" | "start";
  alignOffset?: number;
  children?: ReactNode;
  contentAriaLabelledBy?: string;
  contentClassName?: string;
  contentMaxHeight?: MenuContentMaxHeight;
  contentMaxWidth?: "default" | "wide";
  /** Data attributes for the content, such as a host layer's `data-ck-overlay-*` markers. */
  contentProps?: Record<`data-${string}`, string | undefined>;
  contentRef?: Ref<HTMLDivElement>;
  contentRole?: string;
  contentStyle?: CSSProperties;
  contentVariant?: "default" | "inset" | "picker";
  contentWidth?: MenuContentWidth;
  dir?: Dir;
  disabled?: boolean;
  getPlacement?: (
    trigger: HTMLElement,
    zoom: number,
    contentWidth: number | undefined
  ) => MenuPlacement;
  loadingContent?: ReactNode;
  matchTriggerWidth?: boolean;
  modal?: boolean;
  onCloseAutoFocus?: (event: FocusEventLike) => void;
  onContentFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onContentKeyDownCapture?: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onContentPointerDownCapture?: (
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
  onContentPointerEnter?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onContentPointerLeave?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onInteractOutside?: (event: Event) => void;
  onOpenAutoFocus?: (event: FocusEventLike) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  openOnHover?: boolean;
  portalContainer?: HTMLElement | null;
  rowLayout?: MenuRowLayout;
  scrollFade?: boolean;
  scrollPeek?: boolean;
  side?: Side;
  sideOffset?: number;
  size?: MenuSize;
  surface?: MenuSurface;
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the child element's props are the caller's, so their keys are open
  triggerButton: ReactElement<Record<string, unknown>>;
}

interface TrackerInput {
  destinationElement: HTMLElement;
  destinationSide: Side;
  onEnterDestination: () => void;
  onMoveInsideTriangle: () => void;
  onMoveOutsideTriangle: () => void;
  pointer: Point;
  sourceElement: HTMLElement;
}

const isEmptyRect = (rect: DOMRect) => rect.width <= 0 || rect.height <= 0;

const triangleFor = ({
  destinationRect,
  destinationSide,
  pointer,
}: {
  destinationRect: DOMRect;
  destinationSide: Side;
  pointer: Point;
}) => {
  if (destinationSide === "left" || destinationSide === "right") {
    const x =
      destinationSide === "right"
        ? destinationRect.left
        : destinationRect.right;

    return {
      endA: { x, y: destinationRect.top - TRIANGLE_PADDING },
      endB: { x, y: destinationRect.bottom + TRIANGLE_PADDING },
      start: pointer,
    };
  }

  const y =
    destinationSide === "bottom" ? destinationRect.top : destinationRect.bottom;

  return {
    endA: { x: destinationRect.left - TRIANGLE_PADDING, y },
    endB: { x: destinationRect.right + TRIANGLE_PADDING, y },
    start: pointer,
  };
};

const cross = (point: Point, a: Point, b: Point) =>
  (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y);

const insideTriangle = (
  point: Point,
  triangle: { endA: Point; endB: Point; start: Point }
) => {
  const first = cross(point, triangle.start, triangle.endA);
  const second = cross(point, triangle.endA, triangle.endB);
  const third = cross(point, triangle.endB, triangle.start);

  return !(
    (first < 0 || second < 0 || third < 0) &&
    (first > 0 || second > 0 || third > 0)
  );
};

/** Tracks the pointer between two elements until it enters the destination or leaves the triangle. */
const trackHoverTriangle = ({
  destinationElement,
  destinationSide,
  onEnterDestination,
  onMoveInsideTriangle,
  onMoveOutsideTriangle,
  pointer,
  sourceElement,
}: TrackerInput) => {
  if (
    isEmptyRect(destinationElement.getBoundingClientRect()) ||
    isEmptyRect(sourceElement.getBoundingClientRect())
  ) {
    return null;
  }

  const doc = destinationElement.ownerDocument;

  const onMove = (event: PointerEvent) => {
    const path = event.composedPath();

    if (path.includes(destinationElement) || path.includes(sourceElement)) {
      onEnterDestination();

      return;
    }

    const triangle = triangleFor({
      destinationRect: destinationElement.getBoundingClientRect(),
      destinationSide,
      pointer,
    });

    if (insideTriangle({ x: event.clientX, y: event.clientY }, triangle)) {
      onMoveInsideTriangle();
    } else {
      onMoveOutsideTriangle();
    }
  };

  doc.addEventListener("pointermove", onMove, true);

  return () => {
    doc.removeEventListener("pointermove", onMove, true);
  };
};

/** How far the trigger sits inside the enclosing menu overlay surface. */
const measureTriggerInset = (
  start: HTMLElement,
  side: Side,
  onChange: (inset: number) => void
) => {
  let element: HTMLElement | null = start;

  while (element && getComputedStyle(element).display === "contents") {
    const child: Element | null = element.firstElementChild;

    element = child instanceof HTMLElement ? child : null;
  }

  const surface = element?.closest("[data-ck-menu-overlay-surface]");

  if (!element || !surface) {
    onChange(0);

    return;
  }

  const target = element;

  const measure = () => {
    const rect = target.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const edge = side === "top" || side === "left" ? side : side;

    const inset =
      side === "top" || side === "left"
        ? rect[edge] - surfaceRect[edge]
        : surfaceRect[edge] - rect[edge];

    onChange(Math.max(0, inset));
  };

  measure();

  const observer = new ResizeObserver(measure);

  observer.observe(target);
  observer.observe(surface);
  target.ownerDocument.defaultView?.addEventListener("resize", measure);

  // oxlint-disable-next-line typescript/consistent-return -- the effect returns a cleanup only on the paths that set something up
  return () => {
    observer.disconnect();
    target.ownerDocument.defaultView?.removeEventListener("resize", measure);
  };
};

const overlaySideOf = (element: HTMLElement | null) => {
  const surface = element?.closest<HTMLElement>(
    "[data-ck-dropdown-overlay-side]"
  );

  const side = surface?.dataset.ckDropdownOverlaySide;

  return side === "bottom" || side === "top" ? side : undefined;
};

/** Whether the last input was the keyboard (Radix `isUsingKeyboardRef`). */
const useKeyboardIntent = () => {
  const ref = useRef(false);

  useEffect(() => {
    const onPointer = () => {
      ref.current = false;
    };

    const onKeyDown = () => {
      ref.current = true;
      document.addEventListener("pointerdown", onPointer, {
        capture: true,
        once: true,
      });
      document.addEventListener("pointermove", onPointer, {
        capture: true,
        once: true,
      });
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("pointerdown", onPointer, { capture: true });
      document.removeEventListener("pointermove", onPointer, { capture: true });
    };
  }, []);

  return ref;
};

interface MenuShellContextValue {
  anchor:
    | { current: HTMLElement | null }
    | { getBoundingClientRect: () => DOMRect }
    | null;
  onOpenAutoFocus?: (event: FocusEventLike) => void;
  onCloseAutoFocus?: (event: FocusEventLike) => void;
  handleInteractOutside?: (event: Event) => void;
  handleEscapeKeyDown?: (event: KeyboardEvent) => void;
  triggerRef: { current: HTMLElement | null };
  zoom: number;
}

const MenuShellContext = createContext<MenuShellContextValue | null>(null);

/** The `data-side` placement the content rendered with. */
const readSide = (element: HTMLElement | null) => {
  const side = element?.dataset.side;

  return isSide(side) ? side : undefined;
};

/* ----------------------------------------------------------- Root shell */

interface MenuRootProps {
  /** Radix dismisses in document capture; the list menu keeps its own bubbling stack. */
  escapePhase?: "capture" | "bubble";
  children?: ReactNode;
  dir?: Dir;
  isUsingKeyboard: { current: boolean };
  modal?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onInteractOutside?: (event: Event) => void;
  onOpenChange: (
    open: boolean,
    details?: {
      allowPropagation: () => void;
      cancel: () => void;
      reason: string;
    }
  ) => void;
  open: boolean;
}

/** The controlled open state, direction and keyboard-intent context. */
function MenuRoot({
  children,
  dir,
  isUsingKeyboard,
  modal = false,
  escapePhase = "capture",
  onEscapeKeyDown,
  onInteractOutside,
  onOpenChange,
  open,
}: MenuRootProps) {
  const resolved: Dir = dir ?? "ltr";

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const value: MenuRootContextValue = {
    close,
    dir: resolved,
    isUsingKeyboard,
    open,
  };

  /*
   * Radix's DismissableLayer dismisses in the document capture phase, before a
   * search input stops propagation. Base UI dismisses during bubbling,
   * which MenuInput blocks. Cancel Base UI's escape close, allow propagation,
   * and dismiss on the layer instead. The layer is the shared one (the
   * dialog family's `useDismissableLayer`): only the newest layer answers
   * Escape, so a dialog, popover, tooltip, submenu or menu opened above this
   * one keeps the key. Outside presses stay with Base UI. A menu that
   * dismisses in the bubble phase (ListMenu) is a layer through the ListMenu
   * escape stack instead.
   */
  useDismissableLayer({
    active: open && escapePhase === "capture",
    modal: false,
    onDismiss: () => {
      onOpenChange(false);
    },
    onEscapeKeyDown,
    onInteractOutside: (event) => {
      event.preventDefault();
    },
  });

  return (
    <DirectionProvider direction={resolved}>
      {/* oxlint-disable-next-line react/jsx-no-constructed-context-values -- the value closes over this render's handlers and state, as the Radix context does */}
      <MenuRootContext value={value}>
        <MenuPrimitive.Root
          highlightItemOnHover={false}
          loopFocus={false}
          modal={modal}
          onOpenChange={(next, details) => {
            const alreadyPrevented = details.event.defaultPrevented;

            if (details.reason === "escape-key") {
              // The document capture listener owns Escape; Base UI's bubble
              // close is cancelled and never forwarded (a caller's preventDefault
              // there keeps the menu open).
              details.cancel();
              details.allowPropagation();

              return;
            } else if (details.reason === "outside-press") {
              onInteractOutside?.(details.event);
            }

            // Only a veto from the caller's handler keeps the menu open.
            if (!alreadyPrevented && details.event.defaultPrevented) {
              details.cancel();

              return;
            }

            onOpenChange(next, {
              allowPropagation: () => {
                details.allowPropagation();
              },
              cancel: () => {
                details.cancel();
              },
              reason: details.reason,
            });
          }}
          open={open}
        >
          {children}
        </MenuPrimitive.Root>
      </MenuRootContext>
    </DirectionProvider>
  );
}

/* Content. */

interface MenuContentProps extends Omit<
  React.ComponentProps<"div">,
  "children" | "style"
> {
  align?: "center" | "end" | "start";
  alignOffset?: number;
  children?: ReactNode;
  /** Radix `collisionPadding`: the gap kept to the viewport edges. Default 6. */
  collisionPadding?: number | Partial<Record<Side, number>>;
  maxWidth?: "default" | "wide";
  onCloseAutoFocus?: (event: FocusEventLike) => void;
  onOpenAutoFocus?: (event: FocusEventLike) => void;
  preserveFocusTargetOnOpen?: boolean;
  rowLayout?: MenuRowLayout;
  scrollFade?: boolean;
  scrollPeek?: boolean;
  side?: Side;
  sideOffset?: number;
  size?: MenuSize;
  style?: CSSProperties;
  surface?: MenuSurface;
  /** Skips the shared surface, so the caller styles the popup entirely. */
  unstyled?: boolean;
  variant?: "default" | "inset" | "picker";
  /** `sub` is the flyout submenu content (Radix `MenuSubContent`). */
  kind?: "root" | "sub";
}

const menuKeys = {
  first: ["ArrowDown", "PageUp", "Home"],
  last: ["ArrowUp", "PageDown", "End"],
} as const;

/** Scroll fade and peek container. */
function MenuScrollArea({
  children,
  fade,
  peek,
}: {
  children?: ReactNode;
  fade: "none" | "overlay";
  peek: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const scroll = scrollRef.current;
    const inner = innerRef.current;

    if (!root || !scroll || !inner) {
      return;
    }

    const update = () => {
      const overflow =
        (fade === "overlay" ? inner : scroll).scrollHeight >
        scroll.clientHeight + 1;

      const below =
        scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1;

      root.dataset.ckHasOverflow = overflow ? "true" : "false";
      root.dataset.ckCanScrollUp = scroll.scrollTop > 1 ? "true" : "false";
      root.dataset.ckCanScrollDown = overflow && below ? "true" : "false";
    };

    const original = scroll.style.maxHeight;
    let applied: string | undefined;

    const measure = () => {
      if (peek) {
        const top = scroll.scrollTop;

        scroll.style.maxHeight = original;
        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        applied = undefined;

        const height = scroll.clientHeight;

        if (scroll.scrollHeight > height + 1) {
          const rect = scroll.getBoundingClientRect();
          const scale = rect.height / scroll.offsetHeight;
          let furthest = 0;

          if (scale > 0) {
            for (const row of inner.querySelectorAll(ITEM_SELECTOR)) {
              const box = row.getBoundingClientRect();

              const middle =
                (box.top - rect.top + box.height / 2) / scale -
                scroll.clientTop +
                scroll.scrollTop;

              if (box.height > 0 && middle <= height) {
                furthest = Math.max(furthest, middle);
              }
            }
          }

          if (furthest > 0) {
            applied = `${furthest}px`;
            scroll.style.maxHeight = applied;
          }
        }

        scroll.scrollTop = top;
      }

      update();
    };

    measure();
    scroll.addEventListener("scroll", update, { passive: true });

    const resize = new ResizeObserver(measure);

    resize.observe(scroll);
    resize.observe(inner);

    const mutation = peek ? new MutationObserver(measure) : undefined;

    mutation?.observe(inner, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    if (peek) {
      window.addEventListener("resize", measure);
    }

    // oxlint-disable-next-line typescript/consistent-return -- the effect returns a cleanup only on the paths that set something up
    return () => {
      scroll.removeEventListener("scroll", update);
      resize.disconnect();
      mutation?.disconnect();
      window.removeEventListener("resize", measure);

      if (scroll.style.maxHeight === applied) {
        scroll.style.maxHeight = original;
      }
    };
  }, [fade, peek]);

  return (
    <div
      className="group relative flex min-h-0 flex-col"
      data-ck-can-scroll-down="false"
      data-ck-can-scroll-up="false"
      data-ck-has-overflow="false"
      ref={rootRef}
    >
      <div className="min-h-0 overflow-y-auto" ref={scrollRef}>
        <div ref={innerRef}>{children}</div>
      </div>
      {fade === "overlay" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-10 bg-linear-to-b from-transparent to-panel-elevated-secondary/90 group-data-[can-scroll-down=true]:block"
        />
      ) : null}
    </div>
  );
}

/** The menu content surface with roving focus, typeahead and pointer grace. */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
function MenuContent({
  align = "start",
  alignOffset,
  children,
  className,
  collisionPadding = 6,
  kind = "root",
  maxWidth = "default",
  onCloseAutoFocus,
  onKeyDownCapture,
  onKeyDown,
  onOpenAutoFocus,
  onPointerMove,
  onBlur,
  preserveFocusTargetOnOpen = false,
  ref,
  rowLayout,
  scrollFade = false,
  scrollPeek = false,
  side,
  sideOffset,
  size = "default",
  style,
  surface = "menu",
  unstyled = false,
  variant = "default",
  ...props
}: MenuContentProps) {
  const zoom = useMenuZoom();
  const root = useMenuRoot();
  const shell = use(MenuShellContext);
  const sharedFocus = use(MenuFocusTargetContext);

  const focusTarget = useMemo(
    () => createFocusTarget(sharedFocus),
    [sharedFocus]
  );

  const contentRef = useRef<HTMLDivElement | null>(null);
  // Every menu and submenu content mounts a FocusScope, so it
  // pauses the trap of a modal popover (or dialog) below it while it is open.
  const { ref: focusScopeRef } = useFocusScope();
  const searchRef = useRef("");
  const searchTimer = useRef(0);
  const pointerGraceTimer = useRef(0);
  const graceIntent = useRef<GraceIntent | null>(null);
  const pointerDir = useRef<"left" | "right">("right");
  const lastX = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(searchTimer.current);
    },
    []
  );

  const rows = () =>
    [
      ...(contentRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ??
        []),
    ].filter(
      (row) =>
        !Object.hasOwn(row.dataset, "disabled") &&
        row.closest('[role="menu"]') === contentRef.current
    );

  const inGrace = (event: { clientX: number; clientY: number }) =>
    pointerDir.current === graceIntent.current?.side &&
    !isNil(graceIntent.current) &&
    isPointInPolygon(
      { x: event.clientX, y: event.clientY },
      graceIntent.current.area
    );

  const typeahead = (key: string) => {
    const next = searchRef.current + key;

    const candidates = rows().filter(
      (row) => row.getAttribute("aria-disabled") !== "true"
    );

    const values = candidates.map((row) => (row.textContent ?? "").trim());
    const active = document.activeElement;
    const current = candidates.find((row) => row === active);

    const match = getNextMatch(
      values,
      next,
      current ? (current.textContent ?? "").trim() : undefined
    );

    const target = candidates.find(
      (row) => (row.textContent ?? "").trim() === match
    );

    const update = (value: string) => {
      searchRef.current = value;
      window.clearTimeout(searchTimer.current);

      if (value !== "") {
        searchTimer.current = window.setTimeout(() => {
          update("");
        }, TYPEAHEAD_RESET);
      }
    };

    update(next);

    if (target) {
      setTimeout(() => {
        target.focus();
      }, 0);
    }
  };

  /**
   * Radix runs the open auto focus once, when the content mounts, and only when focus is not
   * already inside it (an autofocused search input keeps focus). Base UI's focus manager owns
   * the focus move, so the same decision is handed to it as its `initialFocus`: `false`
   * keeps focus where it is (the hover veto), an element receives it.
   */
  const initialFocus = () => {
    const element = contentRef.current;

    if (!element || element.contains(document.activeElement)) {
      return false;
    }

    const isKeyboard = root.isUsingKeyboard.current;
    const event = new Event("openAutoFocus", { cancelable: true });

    Object.defineProperty(event, "target", { value: element });

    if (kind === "sub") {
      onOpenAutoFocus?.(event);

      return isKeyboard ? (entryRow(element) ?? element) : false;
    }

    shell?.onOpenAutoFocus?.(event);
    onOpenAutoFocus?.(event);
    focusTarget.onOpenAutoFocus(event, preserveFocusTargetOnOpen);

    if (event.defaultPrevented) {
      return false;
    }

    return isKeyboard ? (entryRow(element) ?? element) : element;
  };

  // `Menu.Popup` forwards `initialFocus` to its focus manager (MenuPopupPlain in
  // @base-ui/react 1.9.0) but its props type does not declare it.
  const focusProps = { initialFocus };

  const content: MenuContentContextValue = {
    contentRef,
    onItemEnter: (event) => {
      if (inGrace(event)) {
        event.preventDefault();
      }
    },
    onItemLeave: (event) => {
      if (!inGrace(event)) {
        contentRef.current?.focus();
      }
    },
    onPointerGraceIntentChange: (intent) => {
      graceIntent.current = intent;
    },
    onTriggerLeave: (event) => {
      if (inGrace(event)) {
        event.preventDefault();
      }
    },
    pointerGraceTimer,
    searchRef,
  };

  const surfaceName: MenuSurface = surface;

  let maxWidthValue = contentLimits.maxWidth;

  if (maxWidth === "wide") {
    maxWidthValue =
      "min(var(--container-sm), var(--available-width), calc(100vw - 16px))";
  } else if (surfaceName === "rounded") {
    maxWidthValue =
      "min(var(--container-xs), var(--available-width), calc(100vw - 16px))";
  }

  const clipped = scrollFade || scrollPeek;

  const inner = clipped ? (
    <MenuScrollArea fade={scrollPeek ? "none" : "overlay"} peek={scrollPeek}>
      {children}
    </MenuScrollArea>
  ) : (
    children
  );

  const popupClassName = unstyled
    ? cn("z-50", className)
    : cn(
        "z-50 flex flex-col select-none [-webkit-app-region:no-drag]",
        surfaceName === "bare" ? "m-0 p-0" : "m-px",
        clipped ? "overflow-hidden" : "overflow-y-auto",
        variant === "picker"
          ? "w-65 [--ck-popup-gutter:0px]"
          : surfaceName === "panel" && "px-1 py-1",
        surfaceName !== "bare" && surfaceClasses(surfaceName),
        variant === "inset" && "px-2.5",
        surfaceName === "glass" && glassClasses,
        sizeClasses[size],
        rowLayout === "single-line" && singleLineClasses,
        className
      );

  const handleKeyDownCapture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDownCapture?.(event);

    if (
      event.defaultPrevented ||
      (event.key !== "ArrowUp" && !(event.key === "Tab" && event.shiftKey))
    ) {
      return;
    }

    const input = event.currentTarget.querySelector("input");
    const first = input ? rowsAfter(input)[0] : undefined;

    if (
      event.target instanceof HTMLElement &&
      event.target.closest(ITEM_SELECTOR) === first
    ) {
      input?.focus();
      event.preventDefault();
      event.stopPropagation();
    }
  };

  /**
   * Radix owns arrow, Home, End and typeahead keys inside its menu. The Base UI popup
   * would also move its own highlight, so these keys are handled and stopped on capture.
   */
  // oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: key events inside the popup come from elements
    const target = event.target as HTMLElement;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      return;
    }

    onKeyDown?.(event);
    const direct = target.closest('[role="menu"]') === event.currentTarget;
    const modified = event.ctrlKey || event.altKey || event.metaKey;

    if (direct) {
      if (event.key === "Tab") {
        event.preventDefault();
      }

      if (
        !modified &&
        event.key.length === 1 &&
        !(event.key === " " && searchRef.current === "")
      ) {
        typeahead(event.key);
      }
    }

    if (event.defaultPrevented || modified) {
      return;
    }

    const list = rows();
    const active = document.activeElement;

    if (target === contentRef.current) {
      // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: the key lists are string tuples; the cast only allows `includes(event.key)`
      const first = (menuKeys.first as readonly string[]).includes(event.key);
      // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: the key lists are string tuples; the cast only allows `includes(event.key)`
      const last = (menuKeys.last as readonly string[]).includes(event.key);

      if (first || last) {
        event.preventDefault();
        focusFirst(last ? list.toReversed() : list);
      }

      return;
    }

    if (!direct) {
      return;
    }

    const index = active instanceof HTMLElement ? list.indexOf(active) : -1;

    if (index === -1) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      list[index + 1]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      list[index - 1]?.focus();
    } else if (event.key === "Home" || event.key === "PageUp") {
      event.preventDefault();
      list[0]?.focus();
    } else if (event.key === "End" || event.key === "PageDown") {
      event.preventDefault();
      list.at(-1)?.focus();
    }
  };

  return (
    // oxlint-disable-next-line react/jsx-no-constructed-context-values -- the value closes over this render's handlers and state, as the Radix context does
    <MenuContentContext value={content}>
      <MenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="z-50 outline-hidden"
        collisionPadding={collisionPadding}
        positionMethod="fixed"
        side={side}
        sideOffset={sideOffset ?? defaultSideOffset(zoom)}
        anchor={shell?.anchor ?? undefined}
      >
        <MenuPrimitive.Popup
          {...props}
          {...focusProps}
          aria-orientation="vertical"
          className={popupClassName}
          data-state={root.open ? "open" : "closed"}
          dir={root.dir}
          finalFocus={() => {
            const event = new Event("closeAutoFocus", { cancelable: true });

            if (kind === "sub") {
              onCloseAutoFocus?.(event);

              return false;
            }

            shell?.onCloseAutoFocus?.(event);
            onCloseAutoFocus?.(event);
            focusTarget.onCloseAutoFocus(event);

            return event.defaultPrevented
              ? false
              : (shell?.triggerRef.current ?? true);
          }}
          onBlur={(event) => {
            onBlur?.(event);

            if (!event.currentTarget.contains(event.relatedTarget)) {
              window.clearTimeout(searchTimer.current);
              searchRef.current = "";
            }
          }}
          onKeyDownCapture={(event) => {
            handleKeyDownCapture(event);

            if (event.isPropagationStopped()) {
              return;
            }

            handleKeyDown(event);

            // Escape is prevented by the dismissable layer before it gets here;
            // it must still reach Base UI and the ListMenu Escape stack.
            if (
              (event.defaultPrevented && event.key !== "Escape") ||
              (event.key.length === 1 &&
                !(event.key === " " && searchRef.current === "") &&
                !event.ctrlKey &&
                !event.altKey &&
                !event.metaKey)
            ) {
              event.stopPropagation();
            }
          }}
          onPointerMove={(event) => {
            onPointerMove?.(event);

            if (event.pointerType !== "mouse") {
              return;
            }

            if (
              // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: pointer events inside the popup target nodes
              event.currentTarget.contains(event.target as Node) &&
              lastX.current !== event.clientX
            ) {
              pointerDir.current =
                event.clientX > lastX.current ? "right" : "left";
              lastX.current = event.clientX;
            }
          }}
          ref={mergeRefs(ref, contentRef, focusScopeRef)}
          role="menu"
          style={
            unstyled
              ? style
              : // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets this size limit through a style prop from computed values
                { ...contentLimits, maxWidth: maxWidthValue, ...style }
          }
          tabIndex={-1}
        >
          {inner}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuContentContext>
  );
}

/** The dropdown menu with a trigger button and a content surface. */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
function Menu({
  align,
  alignOffset,
  children,
  contentAriaLabelledBy,
  contentClassName,
  contentMaxHeight,
  contentMaxWidth,
  contentProps: contentDataProps,
  contentRef,
  contentRole = "menu",
  contentStyle,
  contentVariant,
  contentWidth,
  dir,
  disabled = false,
  getPlacement,
  loadingContent,
  matchTriggerWidth = false,
  modal = false,
  onCloseAutoFocus,
  onContentFocus,
  onContentKeyDownCapture,
  onContentPointerDownCapture,
  onContentPointerEnter,
  onContentPointerLeave,
  onEscapeKeyDown,
  onInteractOutside,
  onOpenAutoFocus,
  onOpenChange,
  open: controlledOpen,
  openOnHover = false,
  portalContainer,
  rowLayout,
  scrollFade,
  scrollPeek,
  side,
  sideOffset,
  size,
  surface = "menu",
  triggerButton,
}: MenuProps) {
  const zoom = useMenuZoom();
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentElementRef = useRef<HTMLElement | null>(null);

  const [contentElement, setContentElement] = useState<HTMLElement | null>(
    null
  );

  const hoverOpened = useRef(false);
  const stillOpen = useRef(false);
  const openTimer = useRef(0);
  const stopTracking = useRef<(() => void) | null>(null);
  const [placement, setPlacement] = useState<MenuPlacement>();
  const [overlaySide, setOverlaySide] = useState<Side>();
  const isUsingKeyboard = useKeyboardIntent();

  const { handleOpenChange, open } = useMenuOpenState(
    controlledOpen,
    onOpenChange,
    { disabled, dismissOnWindowBlur: false }
  );

  useLayoutEffect(() => {
    stillOpen.current = open;
  });

  if (!open && placement !== undefined) {
    setPlacement(undefined);
  }

  const clearHover = useCallback(() => {
    window.clearTimeout(openTimer.current);
    stopTracking.current?.();
    stopTracking.current = null;
  }, []);

  const resetHover = () => {
    clearHover();
    hoverOpened.current = false;
  };

  const requestOpen = (next: boolean) => {
    clearHover();

    if (next) {
      hoverOpened.current = false;
    }

    handleOpenChange(next);
  };

  // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the cleanup must also run when the open or disabled state changes
  useEffect(() => clearHover, [clearHover, disabled, open, openOnHover]);

  /** Pointer left the trigger or the content. */
  const onHoverLeave = (event: {
    clientX: number;
    clientY: number;
    currentTarget: EventTarget;
    pointerType: string;
  }) => {
    if (!openOnHover || event.pointerType !== "mouse") {
      return;
    }

    clearHover();

    if (!open || !hoverOpened.current) {
      return;
    }

    const close = () => {
      clearHover();
      handleOpenChange(false);
    };

    const arm = () => {
      window.clearTimeout(openTimer.current);
      openTimer.current = window.setTimeout(close, HOVER_CLOSE_DELAY);
    };

    const fromTrigger = event.currentTarget === triggerRef.current;

    const destination = fromTrigger
      ? contentElementRef.current
      : triggerRef.current;

    const contentSide = readSide(contentElementRef.current);

    if (
      destination &&
      contentSide &&
      event.currentTarget instanceof HTMLElement
    ) {
      stopTracking.current = trackHoverTriangle({
        destinationElement: destination,
        destinationSide: fromTrigger ? contentSide : OPPOSITE_SIDE[contentSide],
        onEnterDestination: clearHover,
        onMoveInsideTriangle: arm,
        onMoveOutsideTriangle: close,
        pointer: { x: event.clientX, y: event.clientY },
        sourceElement: event.currentTarget,
      });
    }

    arm();
  };

  useLayoutEffect(() => {
    const trigger = triggerRef.current;

    if (!open || !trigger) {
      return;
    }

    if (!getPlacement) {
      if (!isNil(sideOffset)) {
        return;
      }

      // oxlint-disable-next-line typescript/consistent-return -- the effect returns a cleanup only on the paths that set something up
      return measureTriggerInset(
        trigger,
        overlaySide ?? side ?? "bottom",
        (inset) => {
          const next = defaultSideOffset(zoom) + inset;

          setPlacement((current) =>
            current?.sideOffset === next ? current : { sideOffset: next }
          );
        }
      );
    }

    const update = () => {
      const next = getPlacement(trigger, zoom, contentElement?.offsetWidth);

      setPlacement((current) =>
        current?.side === next.side &&
        current?.align === next.align &&
        current?.sideOffset === next.sideOffset &&
        current?.alignOffset === next.alignOffset
          ? current
          : next
      );
    };

    update();

    const observer = contentElement ? new ResizeObserver(update) : null;

    if (contentElement) {
      observer?.observe(contentElement);
    }

    const abort = new AbortController();
    const view = trigger.ownerDocument.defaultView;

    view?.addEventListener("resize", update, { signal: abort.signal });
    view?.addEventListener("scroll", update, {
      capture: true,
      signal: abort.signal,
    });
    view?.visualViewport?.addEventListener("resize", update, {
      signal: abort.signal,
    });
    view?.visualViewport?.addEventListener("scroll", update, {
      signal: abort.signal,
    });

    // oxlint-disable-next-line typescript/consistent-return -- the effect returns a cleanup only on the paths that set something up
    return () => {
      observer?.disconnect();
      abort.abort();
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the placement is recomputed on these values and the helpers read are module constants
  }, [contentElement, getPlacement, open, overlaySide, side, sideOffset, zoom]);

  // oxlint-disable-next-line react/no-clone-element -- the component clones its trigger or row child (Radix `asChild`) to merge props, handlers and ref
  const trigger = cloneElement(triggerButton, {
    ref: mergeRefs(
      // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: the trigger element may carry a `ref` prop, which `ReactElement` props leave open
      (triggerButton.props as { ref?: Ref<HTMLElement> }).ref,
      // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
      (element: HTMLElement | null) => {
        triggerRef.current = element;

        if (element && open) {
          setOverlaySide(overlaySideOf(element));
        }
      }
    ),
  });

  const content = children;

  const effectiveSide = overlaySide ?? placement?.side ?? side;
  const effectiveAlign = placement?.align ?? align;

  const effectiveSideOffset = isNil(getPlacement)
    ? (sideOffset ?? placement?.sideOffset)
    : (placement?.sideOffset ?? sideOffset);

  const effectiveAlignOffset = placement?.alignOffset ?? alignOffset;

  const widthStyle: CSSProperties | undefined = matchTriggerWidth
    ? {
        minWidth: `calc(var(--anchor-width) / ${zoom})`,
        width: `calc(var(--anchor-width) / ${zoom})`,
      }
    : undefined;

  const available = "var(--available-height)";

  const maxHeight =
    maxHeightFor(
      contentMaxHeight,
      isNil(portalContainer) ? `calc(${available} / ${zoom})` : available,
      isNil(portalContainer) ? `calc((100vh - 16px) / ${zoom})` : undefined
    ) ?? contentLimits.maxHeight;

  const styles: CSSProperties = {
    // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets the menu variables and scale through a style prop
    ...contentStyle,
    // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets the menu variables and scale through a style prop
    ...widthStyle,
    // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets this size limit through a style prop from computed values
    maxHeight,
    // oxlint-disable-next-line shadcn/no-inline-styles -- the component applies the page zoom through a style prop
    zoom: isNil(portalContainer) && zoom !== 1 ? zoom : undefined,
  };

  const shell: MenuShellContextValue = {
    anchor: triggerRef,
    onCloseAutoFocus: (event) => {
      if (hoverOpened.current) {
        event.preventDefault();
      }

      onCloseAutoFocus?.(event);
      hoverOpened.current = false;
    },
    handleEscapeKeyDown: onEscapeKeyDown,
    handleInteractOutside: (event) => {
      if (
        openOnHover &&
        event.target instanceof Node &&
        // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
        triggerRef.current?.contains(event.target)
      ) {
        event.preventDefault();
      }

      onInteractOutside?.(event);
    },
    onOpenAutoFocus: (event) => {
      if (hoverOpened.current) {
        event.preventDefault();
      }

      onOpenAutoFocus?.(event);
    },
    triggerRef,
    zoom,
  };

  const triggerProps = {
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (
        openOnHover &&
        !disabled &&
        !event.defaultPrevented &&
        event.button === 0 &&
        !event.ctrlKey &&
        event.detail !== 0
      ) {
        const next = !open || hoverOpened.current;

        requestOpen(next);

        if (next) {
          contentElementRef.current?.focus({ preventScroll: true });
        }
      }
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (openOnHover && !event.defaultPrevented) {
        resetHover();

        if (
          open &&
          ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)
        ) {
          event.preventDefault();

          const items =
            contentElementRef.current?.querySelectorAll<HTMLElement>(
              '[role^="menuitem"]:not([data-disabled])'
            );

          (event.key === "ArrowUp"
            ? items?.[(items?.length ?? 1) - 1]
            : items?.[0]
          )?.focus();
        }
      }
    },
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (
        openOnHover &&
        !event.defaultPrevented &&
        event.button === 0 &&
        !event.ctrlKey
      ) {
        clearHover();
        event.preventDefault();
      }
    },
    onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
      if (
        !openOnHover ||
        disabled ||
        event.defaultPrevented ||
        event.pointerType !== "mouse"
      ) {
        return;
      }

      clearHover();

      if (!open) {
        openTimer.current = window.setTimeout(() => {
          hoverOpened.current = true;
          handleOpenChange(true);
        }, HOVER_OPEN_DELAY);
      }
    },
    onPointerLeave: onHoverLeave,
  };

  const contentProps = {
    onKeyDownCapture: (event: ReactKeyboardEvent<HTMLDivElement>) => {
      resetHover();
      onContentKeyDownCapture?.(event);
    },
    onPointerDownCapture: (event: ReactPointerEvent<HTMLDivElement>) => {
      resetHover();
      onContentPointerDownCapture?.(event);
    },
    onPointerEnter: (event: ReactPointerEvent<HTMLDivElement>) => {
      clearHover();
      onContentPointerEnter?.(event);
    },
    onPointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => {
      onContentPointerLeave?.(event);

      if (!event.defaultPrevented) {
        onHoverLeave(event);
      }
    },
  };

  const surfaceContent = (
    <MenuContent
      {...contentDataProps}
      {...contentProps}
      aria-labelledby={contentAriaLabelledBy}
      align={effectiveAlign}
      alignOffset={effectiveAlignOffset}
      className={cn(
        contentWidth ? widthClasses[contentWidth] : undefined,
        contentClassName
      )}
      maxWidth={contentMaxWidth}
      onFocus={onContentFocus}
      ref={mergeRefs(contentRef, (element: HTMLDivElement | null) => {
        contentElementRef.current = element;
        setContentElement(element);
      })}
      role={contentRole}
      rowLayout={rowLayout}
      scrollFade={scrollFade}
      scrollPeek={scrollPeek}
      side={effectiveSide}
      sideOffset={effectiveSideOffset}
      size={size}
      style={styles}
      surface={surface}
      variant={contentVariant}
    >
      {content}
    </MenuContent>
  );

  const loadingFallback =
    loadingContent === undefined ? null : (
      <MenuContent
        {...contentProps}
        onCloseAutoFocus={(event) => {
          // While the menu is open the swap to the loaded rows keeps focus.
          if (stillOpen.current) {
            event.preventDefault();
          }
        }}
        preserveFocusTargetOnOpen
        className={cn(
          contentWidth ? widthClasses[contentWidth] : undefined,
          contentClassName
        )}
        rowLayout={rowLayout}
        size={size}
        style={styles}
        surface={surface}
        variant={contentVariant}
      >
        {loadingContent}
      </MenuContent>
    );

  return (
    <MenuRoot
      dir={dir}
      isUsingKeyboard={isUsingKeyboard}
      modal={modal}
      onEscapeKeyDown={shell.handleEscapeKeyDown}
      // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
      onInteractOutside={shell.handleInteractOutside}
      onOpenChange={(next, details) => {
        if (openOnHover && details?.reason === "trigger-press") {
          details.cancel();

          return;
        }

        requestOpen(next);
      }}
      open={open}
    >
      {/* oxlint-disable-next-line react/jsx-no-constructed-context-values -- the value closes over this render's handlers and state, as the Radix context does */}
      <MenuShellContext value={shell}>
        <MenuPortalContainerContext value={portalContainer ?? null}>
          <MenuPrimitive.Trigger
            nativeButton={
              !(
                // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a trigger element type is a tag name or a component
                typeof triggerButton.type === "string" &&
                triggerButton.type !== "button"
              )
            }
            render={trigger}
            disabled={disabled}
            {...triggerProps}
          />
          {!disabled && modal && open ? (
            <MenuPrimitive.Portal container={portalContainer ?? undefined}>
              <div aria-hidden className="pointer-events-auto fixed inset-0" />
            </MenuPrimitive.Portal>
          ) : null}
          {disabled ? null : (
            <MenuPrimitive.Portal container={portalContainer ?? undefined}>
              {loadingFallback === null ? (
                surfaceContent
              ) : (
                <Suspense fallback={loadingFallback}>{surfaceContent}</Suspense>
              )}
            </MenuPrimitive.Portal>
          )}
        </MenuPortalContainerContext>
      </MenuShellContext>
    </MenuRoot>
  );
}

/* ------------------------------------------------------ tooltip wrapper */

interface MenuTooltipProps {
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the child element's props are the caller's, so their keys are open
  children: ReactElement<Record<string, unknown>>;
  color?: "default" | "surface";
  tooltipAlign?: "center" | "end" | "start";
  tooltipDisabled?: boolean;
  tooltipHoverDelayMs?: number;
  tooltipInteractive?: boolean;
  tooltipOnBeforeOpen?: () => boolean | undefined;
  tooltipOpenWhen?: TooltipHintProps["openWhen"];
  tooltipSide?: Side;
  tooltipSideOffset?: number;
  tooltipText?: ReactNode;
  tooltipTextClassName?: string;
  tooltipVariant?: string;
}

/** Wraps a menu row in the app tooltip. */
function MenuTooltip({
  children,
  color = "default",
  tooltipAlign,
  tooltipDisabled,
  tooltipHoverDelayMs,
  tooltipInteractive,
  tooltipOnBeforeOpen,
  tooltipOpenWhen,
  tooltipSide,
  tooltipSideOffset,
  tooltipText,
  tooltipTextClassName,
  tooltipVariant,
}: MenuTooltipProps) {
  // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
  if (!tooltipText) {
    return children;
  }

  let defaultOffset: number | undefined;

  if (tooltipVariant === "description") {
    defaultOffset = 16;
  } else if (color === "surface") {
    defaultOffset = 12;
  }

  return (
    <TooltipHint
      align={tooltipAlign}
      cloneCustomTrigger
      // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
      closeOnTriggerBlur={!tooltipInteractive}
      color={color}
      content={
        <div
          className={cn(
            "max-w-64 text-pretty",
            tooltipVariant === "description" && "text-start",
            tooltipTextClassName
          )}
        >
          {tooltipText}
        </div>
      }
      disabled={tooltipDisabled}
      getDelayDuration={
        isNil(tooltipHoverDelayMs) ? undefined : () => tooltipHoverDelayMs
      }
      interactive={tooltipInteractive}
      keyboardNavigation={tooltipInteractive}
      onBeforeOpen={tooltipOnBeforeOpen}
      openWhen={tooltipOpenWhen}
      side={tooltipSide ?? "right"}
      sideOffset={tooltipSideOffset ?? defaultOffset}
    >
      {children}
    </TooltipHint>
  );
}

/* ----------------------------------------------------- icon slot */

/** The leading icon slot. */
function MenuIconSlot({
  children,
  layout,
}: {
  children?: ReactNode;
  layout: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center",
        layout === "menu"
          ? "size-[var(--icon-start-size,16px)]"
          : "h-5 w-4 text-text-subtle"
      )}
      data-ck-leading-icon-slot={layout}
    >
      {children}
    </span>
  );
}

type IconComponent = ComponentType<{ className?: string }>;

/** The icon, label and trailing row of an item. */
function MenuItemContent({
  allowWrap = false,
  children,
  iconSize = 16,
  LeftIcon,
  leftIcon,
  textOverflow = "ellipsis",
  tooltipOverflowTarget = false,
  trailingContent,
}: {
  allowWrap?: boolean;
  children?: ReactNode;
  iconSize?: 16 | 20;
  LeftIcon?: IconComponent;
  leftIcon?: ReactNode;
  textOverflow?: "ellipsis" | "fade";
  tooltipOverflowTarget?: boolean;
  trailingContent?: ReactNode;
}) {
  const icon =
    leftIcon ??
    (LeftIcon ? (
      <LeftIcon
        className={cn("shrink-0", iconSize === 20 ? "size-5" : "size-4")}
      />
    ) : null);

  return (
    <div
      className="flex w-full min-w-0 items-center gap-[var(--spacing-menu-content-gap,calc(var(--spacing)*1.5))]"
      data-ck-menu-row-content
    >
      {isNil(icon) ? null : <MenuIconSlot layout="menu">{icon}</MenuIconSlot>}
      <span
        className={cn(
          "min-w-0 flex-1",
          allowWrap && "whitespace-normal",
          !allowWrap && (textOverflow === "fade" ? fadeTruncate : "truncate")
        )}
        data-ck-tooltip-enablement-target={
          tooltipOverflowTarget ? "" : undefined
        }
        data-ck-tooltip-overflow-target={tooltipOverflowTarget ? "" : undefined}
      >
        {children}
      </span>
      {trailingContent}
    </div>
  );
}

/** An icon that a row's first child can supply. */
function MenuItemIcon({
  children,
  className,
  size = "sm",
}: {
  children?: ReactNode;
  className?: string;
  size?: "base" | "md" | "sm" | "xs";
}) {
  const sizes = {
    base: "size-5",
    md: "size-6",
    sm: "size-[18px]",
    xs: "size-4",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center leading-none",
        sizes[size],
        itemIconClasses,
        className
      )}
    >
      {children}
    </span>
  );
}

/* Item behaviour. */

const SELECT_EVENT = "menu.itemSelect";

/** Radix `Slot` handler merge: the child's handler first, then the slot's unless it prevented the event. */
const composeHandlers =
  <E extends { defaultPrevented: boolean }>(
    own: ((event: E) => void) | undefined,
    slot: (event: E) => void
  ) =>
  (event: E) => {
    own?.(event);

    if (!event.defaultPrevented) {
      slot(event);
    }
  };

interface ItemShellProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  asChild?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
  role?: string;
}

/**
 * Radix `MenuItem`: select event, pointerup completion, Enter and Space, focus on pointer
 * move and the grace-area guard.
 */
function MenuItemShell({
  asChild = false,
  children,
  disabled = false,
  onBlur,
  onClick,
  onFocus,
  onKeyDown,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  onSelect,
  ref,
  role = "menuitem",
  ...props
}: ItemShellProps) {
  const root = use(MenuRootContext);
  const content = use(MenuContentContext);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const pointerDownHere = useRef(false);
  const [highlighted, setHighlighted] = useState(false);

  const select = () => {
    const element = elementRef.current;

    if (disabled || !element) {
      return;
    }

    const event = new CustomEvent(SELECT_EVENT, {
      bubbles: true,
      cancelable: true,
    });

    element.addEventListener(SELECT_EVENT, (selected) => onSelect?.(selected), {
      once: true,
    });
    element.dispatchEvent(event);

    if (event.defaultPrevented) {
      pointerDownHere.current = false;
    } else {
      root?.close();
    }
  };

  const itemProps = {
    "aria-disabled": disabled || undefined,
    "data-disabled": disabled ? "" : undefined,
    "data-highlighted": highlighted ? "" : undefined,
    ...props,
    onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
      setHighlighted(false);
    },
    onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        select();
      }
    },
    onFocus: (event: React.FocusEvent<HTMLDivElement>) => {
      onFocus?.(event);
      setHighlighted(true);
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);

      if (
        event.defaultPrevented ||
        disabled ||
        event.target !== event.currentTarget
      ) {
        return;
      }

      if (
        (content?.searchRef.current === "" || event.key !== " ") &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.currentTarget.click();
        event.preventDefault();
      }
    },
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);
      pointerDownHere.current = true;
    },
    onPointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);

      if (!event.defaultPrevented) {
        whenMouse((mouse: ReactPointerEvent<HTMLDivElement>) =>
          content?.onItemLeave(mouse)
        )(event);
      }
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);

      if (event.defaultPrevented) {
        return;
      }

      whenMouse((mouse: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled) {
          content?.onItemLeave(mouse);

          return;
        }

        content?.onItemEnter(mouse);

        if (!mouse.defaultPrevented) {
          mouse.currentTarget.focus({ preventScroll: true });
        }
      })(event);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerUp?.(event);

      if (!event.defaultPrevented && !pointerDownHere.current) {
        event.currentTarget.click();
      }
    },
    // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
    ref: mergeRefs(ref, elementRef),
    role,
    tabIndex: disabled ? undefined : -1,
  };

  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the child element's props are the caller's, so their keys are open
  if (asChild && isValidElement<Record<string, unknown>>(children)) {
    const child = children;

    // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: the child is a caller element; only the handler and ref props read here are typed
    const childProps = child.props as {
      onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void;
      onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
      onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
      onKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
      onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
      onPointerLeave?: (event: ReactPointerEvent<HTMLDivElement>) => void;
      onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
      onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    };

    // oxlint-disable-next-line react/no-clone-element, react/refs -- the component clones its trigger or row child (Radix `asChild`) to merge props, handlers and ref; refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
    return cloneElement(child, {
      ...itemProps,
      className: cn(
        // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: the child is a caller element; only the handler and ref props read here are typed
        (child.props as { className?: string }).className,
        props.className
      ),
      // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
      onBlur: composeHandlers(childProps.onBlur, itemProps.onBlur),
      // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
      onClick: composeHandlers(childProps.onClick, itemProps.onClick),
      // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
      onFocus: composeHandlers(childProps.onFocus, itemProps.onFocus),
      // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
      onKeyDown: composeHandlers(childProps.onKeyDown, itemProps.onKeyDown),
      onPointerDown: composeHandlers(
        childProps.onPointerDown,
        // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
        itemProps.onPointerDown
      ),
      onPointerLeave: composeHandlers(
        childProps.onPointerLeave,
        // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
        itemProps.onPointerLeave
      ),
      onPointerMove: composeHandlers(
        childProps.onPointerMove,
        // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
        itemProps.onPointerMove
      ),
      onPointerUp: composeHandlers(
        childProps.onPointerUp,
        // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
        itemProps.onPointerUp
      ),
    });
  }

  return <div {...itemProps}>{children}</div>;
}

/* Item. */

type MenuTone = "danger" | "default" | "destructive" | "muted" | "warning";

type MenuItemVariant =
  | "default"
  | "detail"
  | "display"
  | "hint"
  | "label"
  | "unstyled";

interface MenuItemProps
  extends
    Omit<
      React.ComponentProps<"div">,
      "children" | "onClick" | "onSelect" | "title"
    >,
    Omit<MenuTooltipProps, "children" | "color" | "tooltipText"> {
  allowWrap?: boolean;
  asChild?: boolean;
  children?: ReactNode;
  disabled?: boolean;
  focusableWhenDisabled?: boolean;
  href?: string;
  isActive?: boolean;
  keyboardShortcut?: ReactNode;
  LeftIcon?: IconComponent;
  leftIcon?: ReactNode;
  leftIconClassName?: string;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onSelect?: (event: Event) => void;
  RightIcon?: IconComponent;
  rightIcon?: ReactNode;
  rightIconClassName?: string;
  rightText?: ReactNode;
  SubText?: ReactNode;
  subTextAllowWrap?: boolean;
  textOverflow?: "ellipsis" | "fade";
  tone?: MenuTone;
  tooltipColor?: "default" | "surface";
  tooltipText?: ReactNode;
  variant?: MenuItemVariant;
}

const hintRowClasses =
  "[--ck-popup-item-font-size:11px] [--icon-start-size:calc(var(--spacing)*3)] [--spacing-menu-content-gap:var(--spacing)]";

const preventDefault = (event: { preventDefault: () => void }) => {
  event.preventDefault();
};

/** A menu row. */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
function MenuItem({
  allowWrap = false,
  asChild,
  children,
  className,
  disabled,
  focusableWhenDisabled = false,
  href,
  isActive = false,
  keyboardShortcut,
  LeftIcon,
  leftIcon,
  leftIconClassName,
  onClick,
  onSelect,
  RightIcon,
  rightIcon,
  rightIconClassName,
  rightText,
  SubText,
  subTextAllowWrap = false,
  textOverflow = "ellipsis",
  tone = "default",
  tooltipAlign,
  tooltipColor,
  tooltipDisabled,
  tooltipHoverDelayMs,
  tooltipInteractive,
  tooltipOnBeforeOpen,
  tooltipOpenWhen,
  tooltipSide,
  tooltipSideOffset,
  tooltipText,
  tooltipTextClassName,
  tooltipVariant,
  variant = "default",
  ...props
}: MenuItemProps) {
  const danger = tone === "danger" || tone === "destructive";

  const child =
    // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type, typescript/strict-boolean-expressions -- the child element's props are the caller's, so their keys are open; the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
    asChild && isValidElement<Record<string, unknown>>(children)
      ? children
      : null;

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: the child is an anchor-like element whose `href` is a string when set
  const resolvedHref = (child?.props.href as string | undefined) ?? href;
  // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
  const Tag = resolvedHref ? "a" : "div";
  const focusableDisabled = Boolean(disabled) && focusableWhenDisabled;
  const display = variant === "display";
  const surfaceRow = display || variant === "detail";

  const interactive =
    variant !== "label" &&
    !display &&
    // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
    !disabled &&
    (Boolean(resolvedHref) || Boolean(onClick) || Boolean(onSelect));

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: element children are a ReactNode
  const rowChildren = child ? (child.props.children as ReactNode) : children;
  // oxlint-disable-next-line react/no-react-children -- the component reads the first child with `Children.toArray` to find an icon slot
  const parts = Children.toArray(rowChildren);

  const slotIcon =
    isValidElement(parts[0]) && parts[0].type === MenuItemIcon
      ? parts[0]
      : null;

  const label = slotIcon ? parts.slice(1) : rowChildren;

  const iconClass =
    leftIconClassName ?? (isNil(SubText) ? "size-4" : "size-[18px]");

  const leading =
    leftIcon ??
    slotIcon ??
    (LeftIcon ? <LeftIcon className={cn(iconClass, itemIconClasses)} /> : null);

  const trailingIcon =
    rightIcon ??
    (RightIcon ? (
      <RightIcon
        className={cn(rightIconClassName ?? "size-4", itemIconClasses)}
      />
    ) : null);

  const trailing =
    // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
    keyboardShortcut || trailingIcon || !isNil(rightText) ? (
      <>
        {/* oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent */}
        {keyboardShortcut ? (
          <span className="ms-2 shrink-0 text-xs text-text-subtle">
            {keyboardShortcut}
          </span>
        ) : null}
        {isNil(rightText) ? null : (
          // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
          <span className={cn("shrink-0", !trailingIcon && "pe-1")}>
            {rightText}
          </span>
        )}
        {trailingIcon}
      </>
    ) : null;

  const row = isNil(SubText) ? (
    <MenuItemContent
      allowWrap={allowWrap}
      leftIcon={leading}
      textOverflow={textOverflow}
      tooltipOverflowTarget={tooltipOpenWhen === "trigger-overflows"}
      trailingContent={trailing}
    >
      {label}
    </MenuItemContent>
  ) : (
    <div className={rowContentClasses} data-ck-menu-row-content>
      {isNil(leading) ? null : (
        <MenuIconSlot layout="menu">{leading}</MenuIconSlot>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "min-w-0",
            allowWrap && "whitespace-normal",
            !allowWrap && (textOverflow === "fade" ? fadeTruncate : "truncate")
          )}
          data-ck-tooltip-overflow-target={
            tooltipOpenWhen === "trigger-overflows" ? "" : undefined
          }
        >
          {label}
        </span>
        <span
          className={cn(
            "min-w-0 text-xs leading-[calc(7/6)] text-text-subtle",
            subTextAllowWrap ? "whitespace-normal" : "truncate"
          )}
        >
          {SubText}
        </span>
      </div>
      {trailing}
    </div>
  );

  const toneLinkClasses =
    // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
    variant === "default" && resolvedHref
      ? [
          danger && dangerTextImportant,
          tone === "warning" && warningTextImportant,
          tone === "muted" && "!text-text-subtle",
          tone === "default" && "!text-text",
        ]
      : [];

  const inner = {
    children: row,
    className: cn(
      // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: the child is a caller element whose `className` is a string when set
      child?.props.className as string | undefined,
      // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
      variant === "default" && resolvedHref && "focus:!outline-none",
      toneLinkClasses,
      (variant === "default" || variant === "hint") && "flex flex-col"
    ),
  };

  const linkProps = { href: resolvedHref, ...inner };

  const element = child ? (
    // oxlint-disable-next-line react/no-clone-element -- the component clones its trigger or row child (Radix `asChild`) to merge props, handlers and ref
    cloneElement(child, {
      ...inner,
      // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
      onAuxClick: disabled || display ? preventDefault : child.props.onAuxClick,
      // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
      onClick: disabled || display ? preventDefault : child.props.onClick,
    })
  ) : (
    <Tag {...linkProps} />
  );

  let toneClasses: (string | false)[] = [];

  if (variant === "default" || variant === "hint") {
    let interactiveClasses: string | false = false;

    // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
    if (disabled) {
      interactiveClasses = "cursor-default opacity-50";
    } else if (interactive) {
      interactiveClasses =
        tone === "destructive" ? destructiveRow : itemInteractive;
    }

    toneClasses = [
      danger && dangerTextClass,
      tone === "warning" && warningTextClass,
      tone === "muted" && "text-text-subtle",
      tone === "default" &&
        (variant === "hint" ? "text-text-subtle" : "text-text"),
      isActive && "bg-fill-primary-transparent-hover",
      interactiveClasses,
    ];
  }

  const rowClassName = cn(
    "[-webkit-app-region:no-drag]",
    variant !== "unstyled" && [
      itemBase,
      surfaceRow ? "rounded-md" : "rounded-xl",
    ],
    variant === "label" && "cursor-default text-text-subtle select-text",
    surfaceRow && [
      "select-none",
      // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
      disabled ? "text-text-subtle" : "text-text",
      interactive ? "cursor-(--ck-action-cursor)" : "cursor-default",
      // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
      !disabled &&
        "hover:bg-fill-primary-transparent-hover focus:bg-fill-primary-transparent-hover",
    ],
    toneClasses,
    variant === "hint" && [hintRowClasses, "select-none"],
    variant === "unstyled" &&
      // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
      (disabled
        ? "cursor-default"
        : interactive && "group cursor-(--ck-action-cursor)"),
    className
  );

  const wrapSelect = focusableDisabled || variant === "label" || display;
  // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
  const selectHandler = disabled ? undefined : onSelect;

  return (
    <MenuTooltip
      color={tooltipColor ?? (surfaceRow ? "surface" : "default")}
      tooltipAlign={tooltipAlign}
      tooltipDisabled={tooltipDisabled}
      tooltipHoverDelayMs={tooltipHoverDelayMs}
      tooltipInteractive={tooltipInteractive}
      tooltipOnBeforeOpen={tooltipOnBeforeOpen}
      tooltipOpenWhen={tooltipOpenWhen}
      tooltipSide={tooltipSide}
      tooltipSideOffset={tooltipSideOffset}
      tooltipText={tooltipText}
      tooltipTextClassName={tooltipTextClassName}
      tooltipVariant={tooltipVariant}
    >
      <MenuItemShell
        {...props}
        aria-current={isActive ? "true" : undefined}
        aria-disabled={disabled === true || display ? true : undefined}
        asChild
        className={rowClassName}
        disabled={Boolean(disabled) && !focusableWhenDisabled}
        onClick={(event) => {
          if (display) {
            event.preventDefault();
            // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
          } else if (!disabled) {
            onClick?.(event);
          }
        }}
        onSelect={wrapSelect ? preventDefault : selectHandler}
      >
        {element}
      </MenuItemShell>
    </MenuTooltip>
  );
}

/* Switch visual. */

/** The switch picture at size `sm`, used by checkbox items. */
function MenuSwitchVisual({ checked }: { checked: boolean }) {
  const state = checked ? "checked" : "unchecked";

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-(--motion-duration-fast) ease-out",
        checked ? "bg-blue" : "bg-text/10"
      )}
      data-state={state}
    >
      <span
        className="size-3 rounded-full border border-white bg-white shadow-sm transition-transform duration-(--motion-duration-fast) ease-out data-[state=checked]:translate-x-[14px] data-[state=unchecked]:translate-x-0 data-[state=unchecked]:translate-x-[2px] rtl:data-[state=checked]:-translate-x-[14px] rtl:data-[state=unchecked]:-translate-x-[2px]"
        data-state={state}
      />
    </span>
  );
}

const ItemIndicatorContext = createContext<boolean>(false);

/** Radix `MenuItemIndicator`: children render only while checked. */
function MenuItemIndicator({ children }: { children?: ReactNode }) {
  const checked = use(ItemIndicatorContext);

  return checked ? <span data-state="checked">{children}</span> : null;
}

/* CheckboxItem. */

interface MenuCheckboxItemProps extends Omit<
  React.ComponentProps<"div">,
  "children" | "onSelect"
> {
  checked?: boolean;
  children?: ReactNode;
  closeOnSelect?: boolean;
  disabled?: boolean;
  href?: string;
  indicator?: "checkmark" | "switch";
  leftIcon?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
  SubText?: ReactNode;
  tooltipText?: ReactNode;
}

/** A checkable row with a check or a switch at the trailing edge. */
function MenuCheckboxItem({
  checked = false,
  children,
  className,
  closeOnSelect = false,
  disabled = false,
  href,
  indicator = "checkmark",
  leftIcon,
  onCheckedChange,
  onSelect,
  SubText,
  tooltipText,
  ...props
}: MenuCheckboxItemProps) {
  // oxlint-disable-next-line react/no-react-children -- the component reads the first child with `Children.toArray` to find an icon slot
  const parts = Children.toArray(children);

  const slotIcon =
    isValidElement(parts[0]) && parts[0].type === MenuItemIcon
      ? parts[0]
      : null;

  const label = slotIcon ? parts.slice(1) : children;
  const leading = leftIcon ?? slotIcon;

  const body = (
    <div className={rowContentClasses} data-ck-menu-row-content>
      {isNil(leading) ? null : (
        <MenuIconSlot layout="menu">{leading}</MenuIconSlot>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {isNil(SubText) ? null : (
          <span className="text-xs leading-[calc(7/6)] whitespace-normal text-text-subtle">
            {SubText}
          </span>
        )}
      </div>
      {indicator === "switch" ? (
        <MenuSwitchVisual checked={checked} />
      ) : (
        <span className="size-4 shrink-0">
          <MenuItemIndicator>
            <CheckIcon className="size-4" />
          </MenuItemIndicator>
        </span>
      )}
    </div>
  );

  const hasHref = !isNil(href);

  return (
    <MenuTooltip tooltipText={tooltipText}>
      <ItemIndicatorContext value={checked}>
        <MenuItemShell
          {...props}
          aria-checked={checked}
          asChild={hasHref}
          className={cn(
            "flex flex-col [-webkit-app-region:no-drag]",
            itemBase,
            "rounded-xl text-text",
            hasHref && "!text-text focus:!outline-none",
            disabled ? "cursor-default opacity-50" : itemInteractive,
            className
          )}
          data-state={checked ? "checked" : "unchecked"}
          disabled={disabled}
          onClick={(event) => {
            props.onClick?.(event);

            if (!disabled && !event.defaultPrevented) {
              onCheckedChange?.(!checked);
            }
          }}
          onSelect={(event) => {
            if (!hasHref && !closeOnSelect) {
              event.preventDefault();
            }

            onSelect?.(event);
          }}
          role="menuitemcheckbox"
        >
          {hasHref ? (
            <a
              href={href}
              onAuxClick={disabled ? preventDefault : undefined}
              onClick={disabled ? preventDefault : undefined}
            >
              {body}
            </a>
          ) : (
            body
          )}
        </MenuItemShell>
      </ItemIndicatorContext>
    </MenuTooltip>
  );
}

/* ----------------------------------------- RadioGroup and RadioItem */

interface RadioGroupContextValue {
  onValueChange?: (value: string) => void;
  value?: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue>({});

/** A group whose items pick one value. */
function MenuRadioGroup({
  children,
  onValueChange,
  value,
  ...props
}: React.ComponentProps<"div"> & RadioGroupContextValue) {
  return (
    // oxlint-disable-next-line react/jsx-no-constructed-context-values -- the value closes over this render's handlers and state, as the Radix context does
    <RadioGroupContext value={{ onValueChange, value }}>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a div with this role */}
      <div role="group" {...props}>
        {children}
      </div>
    </RadioGroupContext>
  );
}

type MenuRadioItemVariant =
  | "rounded"
  | "default"
  | "descriptive"
  | "icon"
  | "swatch";

interface MenuRadioItemProps extends Omit<
  React.ComponentProps<"div">,
  "onSelect"
> {
  asChild?: boolean;
  disabled?: boolean;
  href?: string;
  icon?: ReactNode;
  onSelect?: (event: Event) => void;
  SubText?: ReactNode;
  value: string;
  variant?: MenuRadioItemVariant;
}

/** A radio row with a check icon on the chosen item. */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
function MenuRadioItem({
  children,
  className,
  disabled = false,
  href,
  icon,
  onSelect,
  SubText,
  value,
  variant = "default",
  ...props
}: MenuRadioItemProps) {
  const group = use(RadioGroupContext);
  const checked = group.value === value;
  const bareVariant = variant === "icon" || variant === "swatch";
  const roundedVariant = variant === "rounded";
  const hasHref = !isNil(href);

  const description =
    !isNil(SubText) && variant !== "descriptive" ? (
      <span
        className={cn(
          "text-xs whitespace-normal",
          roundedVariant
            ? "leading-4 text-text-muted"
            : "leading-[calc(7/6)] text-text-subtle"
        )}
      >
        {SubText}
      </span>
    ) : null;

  const body = bareVariant ? (
    children
  ) : (
    <div
      className={
        roundedVariant ? "flex items-center gap-1.5" : rowContentClasses
      }
    >
      {icon}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          variant === "default" && "gap-1"
        )}
      >
        <span
          className={cn(
            "whitespace-normal",
            variant === "default" && "font-medium"
          )}
        >
          {children}
        </span>
        {description}
      </div>
      <span
        className={roundedVariant ? "size-4 shrink-0" : "size-[18px] shrink-0"}
      >
        <MenuItemIndicator>
          {roundedVariant ? (
            <MenuCheckIcon />
          ) : (
            <CheckIcon className="size-[18px]" />
          )}
        </MenuItemIndicator>
      </span>
    </div>
  );

  const wrapped =
    variant === "descriptive" ? (
      <div className="flex w-full min-w-0 flex-col gap-1">
        {body}
        {isNil(SubText) ? null : (
          <span className="text-xs leading-[calc(7/6)] whitespace-normal text-text-subtle">
            {SubText}
          </span>
        )}
      </div>
    ) : (
      body
    );

  const classes = bareVariant
    ? [
        "flex size-9 items-center justify-center rounded-full p-0 text-text outline-hidden focus-visible:ring-2 focus-visible:ring-ring [-webkit-app-region:no-drag]",
        disabled ? "cursor-default opacity-50" : "cursor-(--ck-action-cursor)",
        variant === "icon" &&
          "data-highlighted:bg-fill-primary-transparent-hover data-[state=checked]:bg-fill-primary-transparent-hover data-[state=checked]:ring-1 data-[state=checked]:ring-border",
      ]
    : [
        "[-webkit-app-region:no-drag]",
        roundedVariant
          ? "mx-1.5 rounded-lg px-2.5 py-2 text-sm leading-5 outline-none"
          : [itemBase, "rounded-xl"],
        "text-text",
        disabled && "cursor-default opacity-50",
        !disabled &&
          (roundedVariant
            ? "cursor-(--ck-action-cursor) data-[highlighted]:bg-fill-primary-transparent-hover"
            : itemInteractive),
      ];

  return (
    <ItemIndicatorContext value={checked}>
      <MenuItemShell
        {...props}
        aria-checked={checked}
        asChild={hasHref}
        className={cn(classes, className)}
        data-state={checked ? "checked" : "unchecked"}
        disabled={disabled}
        onSelect={(event) => {
          group.onValueChange?.(value);
          onSelect?.(event);
        }}
        role="menuitemradio"
      >
        {hasHref ? (
          <a
            href={href}
            onAuxClick={disabled ? preventDefault : undefined}
            onClick={disabled ? preventDefault : undefined}
          >
            {wrapped}
          </a>
        ) : (
          wrapped
        )}
      </MenuItemShell>
    </ItemIndicatorContext>
  );
}

/* ----------------------------------------------- Input and SearchInput */

function MenuInput({
  className,
  onKeyDown,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      autoFocus
      className={cn(
        "w-full min-w-0 rounded-sm border border-none px-[var(--ck-row-padding-x,8px)] py-[var(--ck-row-padding-y,5px)] text-sm !outline-none",
        className
      )}
      onKeyDown={(event) => {
        event.stopPropagation();

        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "a"
        ) {
          event.preventDefault();
          event.currentTarget.select();
        } else {
          onKeyDown?.(event);
        }
      }}
      {...props}
    />
  );
}

interface MenuSearchInputProps extends React.ComponentProps<"input"> {
  inputClassName?: string;
  sticky?: boolean;
  trailingContent?: ReactNode;
  variant?: "default" | "inset";
}

/** The search field at the top of a menu. */
function MenuSearchInput({
  className,
  inputClassName,
  onKeyDown,
  sticky = false,
  trailingContent,
  variant = "default",
  ...props
}: MenuSearchInputProps) {
  const field = (
    <div
      className={cn(
        rowContentClasses,
        "p-[var(--ck-popup-item-padding,var(--ck-row-padding-y,5px)_var(--ck-row-padding-x,8px))]",
        variant === "inset" &&
          "m-2 !w-auto rounded-lg border border-stroke-strong",
        className
      )}
    >
      <MenuIconSlot layout="menu">
        <SearchIcon className="text-text-subtle" />
      </MenuIconSlot>
      <MenuInput
        className={cn(
          "!w-auto flex-1 appearance-none !rounded-none !border-none bg-transparent !px-0 !py-0 text-text placeholder:text-text-subtle",
          inputClassName
        )}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (
            !event.defaultPrevented &&
            (event.key === "ArrowDown" || event.key === "ArrowUp") &&
            focusMenuItem(
              event.currentTarget,
              event.key === "ArrowDown" ? "next" : "previous"
            )
          ) {
            event.preventDefault();
          }
        }}
        {...props}
      />
      {/* oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent */}
      {trailingContent ? (
        <div className="shrink-0">{trailingContent}</div>
      ) : null}
    </div>
  );

  return sticky ? (
    <div className="sticky top-0 z-10 -mx-1 -mt-1 bg-panel-elevated-secondary p-1 before:pointer-events-none before:absolute before:inset-x-0 before:-top-1 before:h-1 before:bg-panel-elevated-secondary before:content-['']">
      {field}
    </div>
  ) : (
    field
  );
}

/* ----------------------- Separator, SectionLabel, Message, Title, Group */

/** A separator line (a plain element, not `role=separator`). */
function MenuSeparator({
  className,
  paddingClassName = "py-[var(--ck-popup-separator-gutter,var(--spacing))]",
  variant = "default",
}: {
  className?: string;
  paddingClassName?: string;
  variant?: "rounded" | "default";
}) {
  return (
    <div
      className={cn(
        "w-full",
        variant === "rounded"
          ? "px-4 py-1"
          : [
              "px-[var(--ck-popup-separator-inset,var(--ck-row-padding-x,8px))]",
              paddingClassName,
            ],
        className
      )}
    >
      <div
        className={cn(
          "h-px w-full",
          variant === "rounded" ? "bg-stroke-subtle" : "bg-border"
        )}
      />
    </div>
  );
}

function MenuSectionLabel({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-[var(--ck-row-padding-x,8px)] py-1 text-[length:var(--text-sm)] leading-[var(--text-sm--line-height)] text-text-subtle",
        className
      )}
      data-ck-menu-section-label
    >
      {children}
    </div>
  );
}

function MenuMessage({
  centered = false,
  children,
  className,
  compact = false,
  role,
  tone = "muted",
  variant = "default",
}: {
  centered?: boolean;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  role?: string;
  tone?: "error" | "muted";
  variant?: "rounded" | "default" | "inset";
}) {
  return (
    <div
      className={cn(
        variant === "inset" &&
          "m-1 flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 text-center text-sm",
        variant === "rounded" && "mx-1.5 px-2.5 py-2.5 text-xs leading-4",
        variant === "default" && [
          "px-[var(--ck-row-padding-x,8px)] text-sm",
          compact ? "py-2" : "py-3",
        ],
        tone === "error" && dangerTextClass,
        tone === "muted" && "text-text-subtle",
        centered && "self-center text-center",
        className
      )}
      role={role}
    >
      {children}
    </div>
  );
}

/** A heading row, optionally with a trailing circle, description and actions. */
function MenuTitle({
  actions,
  children,
  className,
  description,
  trailingCircle,
  wrap = false,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  trailingCircle?: ReactNode;
  wrap?: boolean;
}) {
  if (
    wrap ||
    !isNil(trailingCircle) ||
    !isNil(description) ||
    !isNil(actions)
  ) {
    return (
      <div
        className={cn(
          "p-[var(--ck-popup-title-padding,var(--ck-row-padding-y,5px)_var(--ck-row-padding-x,8px))]",
          !isNil(trailingCircle) &&
            "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2",
          className
        )}
      >
        <div
          className={cn(
            "min-w-0 text-[length:var(--ck-popup-item-font-size,var(--text-sm))] leading-[var(--ck-popup-title-line-height,calc(var(--spacing)*4))]",
            wrap ? "whitespace-normal" : "truncate",
            isNil(description) ? "text-text-subtle" : "text-text"
          )}
        >
          {children}
        </div>
        {isNil(trailingCircle) ? null : (
          <span className="inline-flex size-5 items-center justify-center">
            {trailingCircle}
          </span>
        )}
        {isNil(description) ? null : (
          <div className="col-span-full mt-1 text-sm text-text-subtle">
            {description}
          </div>
        )}
        {isNil(actions) ? null : (
          <div className="col-span-full mt-2">{actions}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-6 items-center truncate px-[var(--ck-row-padding-x,8px)] py-[var(--ck-row-padding-y,5px)] text-sm leading-4 text-text-subtle",
        className
      )}
    >
      {children}
    </div>
  );
}

/** A group that hides when it has no rows, with a divider before it. */
function MenuGroup({ children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className="before:mx-4 before:my-1 before:block before:h-px before:bg-border first:before:hidden empty:hidden [&:not(:has(div:not([role=group])))]:hidden [&:nth-child(1_of_:has(div:not([role=group])))]:before:hidden"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a div with this role
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}

/** A scrollable section of rows. */
function MenuSection({
  children,
  className,
  onScrollCapture,
  ref,
  size,
}: {
  children?: ReactNode;
  className?: string;
  onScrollCapture?: React.UIEventHandler<HTMLDivElement>;
  ref?: Ref<HTMLDivElement>;
  size?: "five-rows" | "seven-rows" | "up-to-seven-rows";
}) {
  const sized = !isNil(size);

  return (
    <div
      className={cn(
        sized &&
          "flex max-h-(--ck-dropdown-section-height) min-h-0 flex-col overflow-y-auto text-sm [--ck-dropdown-section-height:calc(var(--ck-choice-menu-item-height,var(--ck-popup-item-height,calc(max(1lh,var(--icon-start-size,16px))+var(--ck-row-padding-y,5px)*2)))*var(--ck-dropdown-section-row-count))] [--ck-dropdown-section-row-count:5]",
        (size === "seven-rows" || size === "up-to-seven-rows") &&
          "[--ck-dropdown-section-row-count:7] *:shrink-0",
        (size === "five-rows" || size === "seven-rows") &&
          "h-(--ck-dropdown-section-height)",
        className
      )}
      onScrollCapture={onScrollCapture}
      ref={ref}
    >
      {children}
    </div>
  );
}

/* Accordion SubmenuItem. */

/** The inline submenu transition. */
const INLINE_SUBMENU_TIMING = {
  duration: 300,
  easing: "cubic-bezier(.19, 1, .22, 1)",
  fill: "forwards",
} as const satisfies KeyframeAnimationOptions;

/** Runs `done` when `animation` finishes; a cancelled animation (the row reopened) runs nothing. */
const settle = async (animation: Animation, done: () => void) => {
  try {
    await animation.finished;
  } catch {
    return;
  }

  animation.cancel();
  done();
};

/**
 * A row that expands its children inline.
 *
 * The wrapper is `pointer-events-none invisible h-0 overflow-hidden` whenever the row is
 * closed. The body (a framer-motion `div` with `initial: false`) mounts at its final height
 * and opacity, so opening has no enter animation. On close, `AnimatePresence` keeps the
 * body mounted while height 0 and opacity 0 animate over 300ms, then removes it. If the row
 * reopens during the exit, the body animates back from where it is.
 */
function MenuSubmenuItem({
  children,
  isDefaultOpen = false,
  onOpenChange,
  trigger,
}: {
  children?: ReactNode;
  isDefaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: ReactElement<MenuItemProps>;
}) {
  const disabled = trigger.props.disabled ?? false;
  const [openState, setOpenState] = useState(!disabled && isDefaultOpen);
  const open = openState && !disabled;
  const [mounted, setMounted] = useState(open);
  const bodyRef = useRef<HTMLDivElement>(null);
  const exit = useRef<Animation | null>(null);
  const wasOpen = useRef(open);

  if (open && !mounted) {
    setMounted(true);
  }

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const previous = wasOpen.current;

    wasOpen.current = open;

    if (!body || previous === open) {
      return;
    }

    if (open) {
      // Reopened during the exit: animate from the current frame to the open size.
      const running = exit.current;

      if (running) {
        const style = getComputedStyle(body);
        const from = { height: style.height, opacity: style.opacity };

        exit.current = null;
        running.cancel();

        const to = { height: `${body.scrollHeight}px`, opacity: "1" };

        void settle(body.animate([from, to], INLINE_SUBMENU_TIMING), () => {
          // The enter animation ends at the open size, which is the natural size.
        });
      }

      return;
    }

    const animation = body.animate(
      [
        { height: `${body.offsetHeight}px`, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      INLINE_SUBMENU_TIMING
    );

    exit.current = animation;
    void settle(animation, () => {
      if (exit.current === animation) {
        exit.current = null;
        setMounted(false);
      }
    });
  }, [open]);

  const handleSelect = (event: Event) => {
    trigger.props.onSelect?.(event);

    if (!event.defaultPrevented) {
      event.preventDefault();
      event.stopPropagation();

      if (!disabled) {
        setOpenState(!open);
        onOpenChange?.(!open);
      }
    }
  };

  const rightIcon = (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center text-text-subtle",
        open && "rotate-90"
      )}
    >
      <ChevronIcon
        className={cn(
          trigger.props.rightIconClassName ?? "size-4",
          itemIconClasses
        )}
      />
    </span>
  );

  return (
    <div className="flex flex-col" data-state={open ? "open" : "closed"}>
      {/* oxlint-disable-next-line react/no-clone-element -- the component clones its trigger or row child (Radix `asChild`) to merge props, handlers and ref */}
      {cloneElement(trigger, { onSelect: handleSelect, rightIcon })}
      <div
        className={
          open ? undefined : "pointer-events-none invisible h-0 overflow-hidden"
        }
      >
        {mounted ? (
          <div
            className="overflow-hidden"
            data-inline-submenu-body=""
            ref={bodyRef}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Radix `SubTrigger` pointer leave: the grace area toward the submenu, or the parent's trigger-leave guard. */
const leaveSubTrigger = (
  parent: MenuContentContextValue | null,
  event: ReactPointerEvent,
  popup: HTMLElement | null
) => {
  if (!parent) {
    return;
  }

  const rect = popup?.getBoundingClientRect();

  if (rect && popup) {
    const { side } = popup.dataset;
    const toRight = side === "right";
    const bias = toRight ? -5 : 5;
    const near = rect[toRight ? "left" : "right"];
    const far = rect[toRight ? "right" : "left"];

    if (isSide(side)) {
      parent.onPointerGraceIntentChange({
        area: [
          { x: event.clientX + bias, y: event.clientY },
          { x: near, y: rect.top },
          { x: far, y: rect.top },
          { x: far, y: rect.bottom },
          { x: near, y: rect.bottom },
        ],
        side,
      });
      window.clearTimeout(parent.pointerGraceTimer.current);
      parent.pointerGraceTimer.current = window.setTimeout(() => {
        parent.onPointerGraceIntentChange(null);
      }, GRACE_TIMER);
    }

    return;
  }

  parent.onTriggerLeave(event);

  if (!event.defaultPrevented) {
    parent.onPointerGraceIntentChange(null);
  }
};

/* FlyoutSubmenuItem. */

interface MenuFlyoutSubmenuItemProps extends Omit<
  MenuTooltipProps,
  "children" | "color" | "tooltipText"
> {
  "aria-current"?: React.AriaAttributes["aria-current"];
  ariaLabel?: string;
  allowWrap?: boolean;
  align?: "center" | "end" | "start";
  alignToParentBottom?: boolean;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  contentSurface?: MenuSurface;
  contentWidth?: MenuContentWidth;
  disabled?: boolean;
  label?: ReactNode;
  LeftIcon?: IconComponent;
  leftIcon?: ReactNode;
  leftIconClassName?: string;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onOpenChange?: (open: boolean) => void;
  onSelect?: () => void;
  open?: boolean;
  ref?: Ref<HTMLElement>;
  rightIcon?: ReactNode;
  tooltipText?: ReactNode;
  triggerContent?: ReactNode;
  variant?: "default" | "unstyled";
}

/** A row that opens a submenu beside it (hover intent, grace area, Escape and arrow keys). */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
function MenuFlyoutSubmenuItem({
  align = "start",
  allowWrap = false,
  ariaLabel,
  children,
  className,
  contentClassName,
  contentSurface = "menu",
  contentWidth,
  disabled = false,
  label,
  LeftIcon,
  leftIcon,
  leftIconClassName,
  onEscapeKeyDown,
  onOpenChange,
  onSelect,
  open: controlled,
  ref,
  rightIcon,
  tooltipAlign,
  tooltipDisabled,
  tooltipOpenWhen,
  tooltipSide,
  tooltipSideOffset,
  tooltipText,
  tooltipTextClassName,
  triggerContent,
  variant = "default",
  ...props
}: MenuFlyoutSubmenuItemProps) {
  const zoom = useMenuZoom();
  const root = useMenuRoot();
  const parent = use(MenuContentContext);
  const portalContainer = use(MenuPortalContainerContext);
  const [internal, setInternal] = useState(false);
  const open = !disabled && (controlled ?? internal);
  const openTimer = useRef<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const skipNextOpen = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const subContentRef = useRef<HTMLDivElement | null>(null);

  const sideOffset = contentSurface === "bare" ? 5 : defaultSideOffset(zoom);

  const clear = useCallback(() => {
    if (openTimer.current !== null) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }

    abort.current?.abort();
    abort.current = null;
  }, []);

  // oxlint-disable-next-line react/exhaustive-effect-dependencies -- the cleanup must also run when the open or disabled state changes
  useEffect(() => clear, [clear, disabled, open]);

  const setOpen = (next: boolean) => {
    if (next && (disabled || openTimer.current !== null)) {
      return;
    }

    clear();

    if (next && skipNextOpen.current) {
      skipNextOpen.current = false;

      return;
    }

    skipNextOpen.current = !next;
    setInternal(next);
    onOpenChange?.(next);
  };

  // The submenu content is its own DismissableLayer: while it is the newest layer it answers Escape.
  // After the caller's handler, which may veto, it closes the whole menu.
  useDismissableLayer({
    active: open,
    modal: false,
    onDismiss: () => {
      setOpen(false);
      root.close();
    },
    onEscapeKeyDown,
    onInteractOutside: (event) => {
      event.preventDefault();
    },
  });

  /** Hover intent: open 200ms after the mouse rests on the row unless a key is pressed. */
  const onPointerIntent = (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || open || event.pointerType !== "mouse") {
      return;
    }

    if (openTimer.current === null) {
      const element = event.currentTarget;
      const controller = new AbortController();

      abort.current = controller;
      element.ownerDocument.addEventListener(
        "keydown",
        () => {
          clear();
          skipNextOpen.current = true;
        },
        { capture: true, signal: controller.signal }
      );
      openTimer.current = window.setTimeout(() => {
        clear();
        element.focus({ preventScroll: true });
        skipNextOpen.current = false;
        setOpen(true);
      }, HOVER_OPEN_DELAY);
    }

    const timer = openTimer.current;

    queueMicrotask(() => {
      if (event.defaultPrevented && openTimer.current === timer) {
        clear();
        skipNextOpen.current = true;
      }
    });
  };

  const iconNode =
    leftIcon ??
    (LeftIcon ? (
      <LeftIcon
        className={cn(leftIconClassName ?? "size-4", itemIconClasses)}
      />
    ) : null);

  const rowBody = triggerContent ?? (
    <div className={rowContentClasses} data-ck-menu-row-content>
      {isNil(iconNode) ? null : (
        <MenuIconSlot layout="menu">{iconNode}</MenuIconSlot>
      )}
      <span
        className={cn(
          "min-w-0 flex-1",
          allowWrap ? "whitespace-normal" : "truncate"
        )}
      >
        {label}
      </span>
      {rightIcon}
      <FlyoutChevronIcon className="text-text-subtle" data-ck-rtl-flip="" />
    </div>
  );

  const triggerClassName = cn(
    variant === "default"
      ? [itemBase, "flex w-full items-center rounded-xl text-text"]
      : "outline-hidden [-webkit-app-region:no-drag]",
    disabled
      ? "cursor-default opacity-50"
      : "group cursor-(--ck-action-cursor)",
    !disabled &&
      variant === "default" &&
      "hover:bg-fill-primary-transparent-hover focus-visible:bg-fill-primary-transparent-hover data-[highlighted]:bg-fill-primary-transparent-hover data-[state=open]:bg-fill-primary-transparent-hover",
    className
  );

  return (
    <MenuPrimitive.SubmenuRoot
      closeParentOnEsc
      onOpenChange={(next, details) => {
        if (details.reason === "escape-key") {
          // The document capture listener above owns Escape.
          details.cancel();
          details.allowPropagation();

          return;
        }

        setOpen(next);
      }}
      open={open}
    >
      <MenuTooltip
        tooltipAlign={tooltipAlign}
        tooltipDisabled={tooltipDisabled}
        tooltipOpenWhen={tooltipOpenWhen}
        tooltipSide={tooltipSide}
        tooltipSideOffset={tooltipSideOffset}
        tooltipText={tooltipText}
        tooltipTextClassName={tooltipTextClassName}
      >
        <MenuPrimitive.SubmenuTrigger
          {...props}
          aria-label={ariaLabel}
          className={triggerClassName}
          closeDelay={0}
          delay={0}
          disabled={disabled}
          nativeButton={false}
          onClick={() => {
            clear();
            skipNextOpen.current = false;

            if (!disabled && onSelect) {
              onSelect();
            }
          }}
          onKeyDown={(event) => {
            clear();
            skipNextOpen.current = true;

            const openKey = root.dir === "rtl" ? "ArrowLeft" : "ArrowRight";

            if (
              event.key === openKey ||
              event.key === "Enter" ||
              event.key === " "
            ) {
              skipNextOpen.current = false;
            }
          }}
          onPointerLeave={(event) => {
            clear();

            if (event.pointerType === "mouse") {
              leaveSubTrigger(parent, event, subContentRef.current);
            }
          }}
          onPointerMove={(event) => {
            parent?.onItemEnter(event);

            if (!event.defaultPrevented) {
              parent?.onPointerGraceIntentChange(null);
            }

            onPointerIntent(event);
          }}
          openOnHover={false}
          ref={mergeRefs(ref, triggerRef)}
          render={<div />}
        >
          {rowBody}
        </MenuPrimitive.SubmenuTrigger>
      </MenuTooltip>
      <MenuShellContext value={null}>
        <MenuPrimitive.Portal container={portalContainer ?? undefined}>
          <MenuContent
            align={align}
            alignOffset={contentSurface === "bare" ? -4 : undefined}
            className={cn(
              "min-w-[180px] overflow-y-auto",
              contentSurface === "bare" ? "m-0 p-0" : undefined,
              contentWidth ? widthClasses[contentWidth] : undefined,
              contentClassName
            )}
            kind="sub"
            ref={subContentRef}
            side={root.dir === "rtl" ? "left" : "right"}
            sideOffset={sideOffset}
            // oxlint-disable-next-line shadcn/no-inline-styles -- the component applies the page zoom through a style prop
            style={{ zoom: zoom === 1 ? undefined : zoom }}
            surface={contentSurface === "bare" ? "bare" : contentSurface}
          >
            <div>{children}</div>
          </MenuContent>
        </MenuPrimitive.Portal>
      </MenuShellContext>
    </MenuPrimitive.SubmenuRoot>
  );
}

/* Context menu. */

interface MenuMessageDescriptor {
  defaultMessage: string;
  id: string;
}

/**
 * An icon component. The native menu serialises one through its `createElement(document)`
 * (the icon objects have it); without it the native entry has no icon.
 */
interface MenuIconComponent {
  (props: { className?: string }): ReactNode;
  createElement?: (doc: Document) => Element;
}

interface MenuContextItem {
  accelerator?: string;
  checked?: boolean;
  closeOnSelect?: boolean;
  enabled?: boolean;
  href?: string;
  icon?: MenuIconComponent | ReactNode;
  id: string;
  message?: MenuMessageDescriptor;
  messageValues?: Record<string, ReactNode>;
  /** The native menu's icon, in place of `icon`: a URL or data URI string, or an icon component. */
  nativeIcon?: MenuIconComponent | string;
  /** The native menu's role for the entry; an entry with a role runs no `onSelect`. */
  nativeRole?: string;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onSelect?: () => void;
  selectAfterClose?: boolean;
  submenu?: readonly MenuContextItem[];
  tone?: "danger";
  tooltipMessage?: MenuMessageDescriptor;
  tooltipMessageValues?: Record<string, ReactNode>;
  type?: "checkbox" | "label" | "radio" | "separator";
}

/** The message's default text with its `{name}` values filled in. */
const renderMessage = (
  message: MenuMessageDescriptor,
  values: Record<string, ReactNode> | undefined
) => {
  if (!values) {
    return message.defaultMessage;
  }

  // oxlint-disable-next-line eslint/prefer-named-capture-group -- the group is read by index and the project's target predates named groups
  return message.defaultMessage.split(/(\{\w+\})/u).map((part, index) => {
    // oxlint-disable-next-line eslint/prefer-named-capture-group -- the group is read by index and the project's target predates named groups
    const name = /^\{(\w+)\}$/u.exec(part)?.[1];

    return name !== undefined && name in values ? (
      <span key={`${name}-${index}`}>{values[name]}</span>
    ) : (
      part
    );
  });
};

/** An item with the strings the native menu needs. */
interface MenuContextEntry extends Omit<MenuContextItem, "submenu"> {
  nativeLabel: string;
  nativeTooltip?: string;
  submenu?: readonly MenuContextEntry[];
}

type MenuFormatMessage = (
  message: MenuMessageDescriptor,
  values?: Record<string, ReactNode>
) => string;

/** The default message formatter: the default text with `{name}` filled from plain values. */
const formatDefaultMessage: MenuFormatMessage = (message, values) =>
  message.defaultMessage.replaceAll(
    // oxlint-disable-next-line eslint/prefer-named-capture-group -- the group is read by index and the project's target predates named groups
    /\{(\w+)\}/gu,
    (placeholder, name: string) => {
      const value = values?.[name];

      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a message value is text, a number or a node
      return typeof value === "string" || typeof value === "number"
        ? String(value)
        : placeholder;
    }
  );

/** Translates the message of every item and submenu item. */
const translateItems = (
  items: readonly MenuContextItem[],
  format: MenuFormatMessage
): MenuContextEntry[] =>
  items.map((item) => {
    if (item.type === "separator") {
      return { ...item, nativeLabel: "", submenu: undefined };
    }

    return {
      ...item,
      nativeLabel: item.message
        ? format(item.message, item.messageValues)
        : item.id,
      nativeTooltip: item.tooltipMessage
        ? format(item.tooltipMessage, item.tooltipMessageValues)
        : undefined,
      submenu: item.submenu ? translateItems(item.submenu, format) : undefined,
    };
  });

/** One entry of the template `window.electronBridge.showContextMenu` receives. */
interface NativeMenuTemplateItem {
  accelerator?: string;
  checked?: boolean;
  enabled: boolean;
  icon?: string;
  id: string;
  label: string;
  role?: string;
  submenu?: NativeMenuTemplateItem[];
  toolTip?: string;
  type?: "radio" | "separator";
}

declare global {
  interface Window {
    /** The desktop shell's bridge; absent in a browser. */
    electronBridge?: {
      showContextMenu?: (
        template: NativeMenuTemplateItem[],
        point: Point
      ) => Promise<{ id?: string } | null | undefined>;
    };
  }
}

const nativeIconUrls = new WeakMap<object, string>();

/** A string stays as is, an icon component becomes an SVG data URI. */
const nativeIconUrl = (
  icon: MenuIconComponent | ReactNode | string
): string | undefined => {
  let url: string | undefined;

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- an icon is a URL string, a component or a node
  if (typeof icon === "string") {
    url = icon;
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- an icon is a URL string, a component or a node
  } else if (typeof icon === "function") {
    url = nativeIconUrls.get(icon);

    if (url === undefined && icon.createElement !== undefined) {
      url = `data:image/svg+xml;utf8,${encodeURIComponent(
        new XMLSerializer().serializeToString(icon.createElement(document))
      )}`;
      nativeIconUrls.set(icon, url);
    }
  }

  return url;
};

/** The native menu template of the translated entries. */
const toNativeTemplate = (
  entries: readonly MenuContextEntry[]
): NativeMenuTemplateItem[] =>
  entries.map((entry) => {
    let label = entry.nativeLabel;

    if (entry.type === "separator") {
      label = "";
    } else if (entry.type !== "radio" && entry.checked === true) {
      label = `\u2713 ${entry.nativeLabel}`;
    }

    return {
      accelerator: entry.accelerator,
      checked: entry.type === "radio" ? entry.checked === true : undefined,
      enabled: entry.type === "label" ? false : (entry.enabled ?? true),
      icon: nativeIconUrl(entry.nativeIcon ?? entry.icon),
      id: entry.id,
      label,
      role: entry.nativeRole,
      submenu: entry.submenu ? toNativeTemplate(entry.submenu) : undefined,
      toolTip: entry.nativeTooltip,
      type:
        entry.type === "separator" || entry.type === "radio"
          ? entry.type
          : undefined,
    };
  });

/** The selectable entry with `id`, searched through the submenus. */
const findEntry = (
  entries: readonly MenuContextEntry[],
  id: string
): MenuContextEntry | undefined => {
  let found: MenuContextEntry | undefined;

  for (const entry of entries) {
    if (
      found === undefined &&
      entry.type !== "separator" &&
      entry.type !== "label"
    ) {
      found =
        entry.id === id ? entry : entry.submenu && findEntry(entry.submenu, id);
    }
  }

  return found;
};

/** The bridge is a global that never notifies; the snapshot is read on every render. */
const unsubscribeNothing = () => {
  // Nothing was subscribed.
};

const subscribeNever = () => unsubscribeNothing;

const hasNativeBridge = () =>
  window.electronBridge?.showContextMenu !== undefined;

const noNativeBridge = () => false;

const itemLabel = (item: MenuContextItem) =>
  item.message ? renderMessage(item.message, item.messageValues) : item.id;

/** A callback with a stable identity that always runs the latest function. */
const useStableCallback = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result
) => {
  const latest = useRef(handler);

  useLayoutEffect(() => {
    latest.current = handler;
  });

  return useCallback((...args: Args) => latest.current(...args), []);
};

const isThenable = <T,>(value: Promise<T> | T): value is Promise<T> =>
  typeof value === "object" && value !== null && "then" in value;

const isMacPlatform = () =>
  typeof navigator !== "undefined" &&
  (navigator.platform ?? "").startsWith("Mac");

/** An accelerator as `aria-keyshortcuts`. */
const keyShortcutsOf = (accelerator: string | undefined) =>
  accelerator
    ?.split("+")
    .map((part) => {
      if (part === "CmdOrCtrl" || part === "CommandOrControl") {
        return isMacPlatform() ? "Meta" : "Control";
      }

      if (part === "Command" || part === "Cmd") {
        return "Meta";
      }

      if (part === "Ctrl") {
        return "Control";
      }

      return part === "Option" ? "Alt" : part;
    })
    .join("+");

/** The icon, label and shortcut row of a context menu item. */
function ContextRow({
  checked,
  icon,
  label,
  reserveIcon,
  shortcutLabel,
  showCheckbox,
  showChevron,
}: {
  checked?: boolean;
  icon?: MenuIconComponent | ReactNode;
  label: ReactNode;
  reserveIcon?: boolean;
  shortcutLabel?: string;
  showCheckbox?: boolean;
  showChevron?: boolean;
}) {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- an icon is a URL string, a component or a node
  if (typeof icon === "function") {
    return (
      <ContextRow
        checked={checked}
        icon={createElement(icon)}
        label={label}
        reserveIcon={reserveIcon}
        shortcutLabel={shortcutLabel}
        showCheckbox={showCheckbox}
        showChevron={showChevron}
      />
    );
  }

  const mask =
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- an icon is a URL string, a component or a node
    typeof icon === "string" &&
    icon !== "" &&
    !icon.startsWith("data:image/svg+xml");

  let iconNode: ReactNode = icon;

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- an icon is a URL string, a component or a node
  if (typeof icon === "string" && icon !== "") {
    iconNode = mask ? (
      // oxlint-disable-next-line nextjs/no-img-element -- The component renders a plain img for string icons.
      <img alt="" className="size-[18px] shrink-0 object-contain" src={icon} />
    ) : (
      <span
        aria-hidden
        className="size-[18px] shrink-0 bg-current"
        style={{
          // oxlint-disable-next-line shadcn/no-inline-styles -- the mask URL is the icon string the caller passes, which a class cannot express
          maskImage: `url("${icon}")`,
          // oxlint-disable-next-line shadcn/no-inline-styles -- the mask URL is the icon string the caller passes, which a class cannot express
          maskPosition: "center",
          // oxlint-disable-next-line shadcn/no-inline-styles -- the mask URL is the icon string the caller passes, which a class cannot express
          maskRepeat: "no-repeat",
          // oxlint-disable-next-line shadcn/no-inline-styles -- the mask URL is the icon string the caller passes, which a class cannot express
          maskSize: "contain",
        }}
      />
    );
  }

  return (
    <span className="flex w-full items-center gap-1.5">
      {/* oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent */}
      {showCheckbox ? (
        <MenuIconSlot layout="menu">
          {/* oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent */}
          {checked ? <CheckIcon className="size-4" aria-hidden /> : null}
        </MenuIconSlot>
      ) : null}
      {/* oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent */}
      {icon || (reserveIcon && !showCheckbox) ? (
        <MenuIconSlot layout="menu">
          {isNil(iconNode) || iconNode === "" ? (
            <span aria-hidden className="size-[18px] shrink-0" />
          ) : (
            iconNode
          )}
        </MenuIconSlot>
      ) : null}
      <span className="truncate">{label}</span>
      {isNil(shortcutLabel) ? null : (
        <span aria-hidden className="ms-auto shrink-0 text-xs text-text-subtle">
          {shortcutLabel}
        </span>
      )}
      {/* oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent */}
      {showChevron ? (
        <ChevronIcon
          className="ms-auto size-4 opacity-50"
          data-ck-rtl-flip=""
        />
      ) : null}
    </span>
  );
}

const contextRowClasses =
  "flex min-h-[var(--ck-popup-item-height,0px)] cursor-(--ck-action-cursor) items-center justify-center rounded-xl p-[var(--ck-popup-item-padding,calc(var(--spacing)*1.5))] text-sm outline-hidden hover:bg-fill-primary-transparent-hover focus:bg-fill-primary-transparent-hover";

const contextSurfaceClasses =
  "z-50 m-px flex min-w-[180px] flex-col rounded-2xl bg-panel-elevated-secondary p-[var(--ck-popup-gutter,var(--spacing))] text-text shadow-lg ring-[0.5px] ring-border select-none";

type ContextMenuTrigger = "click" | "contextmenu";

type ContextState = "dropdown" | "native" | null;

interface MenuContextMenuProps {
  align?: "center" | "end" | "start";
  awaitBeforeOpen?: boolean;
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the child element's props are the caller's, so their keys are open
  children: ReactElement<Record<string, unknown>>;
  /** Portals the menu and its submenus into this element instead of the body. */
  container?: HTMLElement | null;
  contentWidth?: MenuContentWidth;
  /** Always use the in-page menu, even when the desktop bridge exists. */
  disableNative?: boolean;
  /** Turns a message descriptor into the string the native menu shows. */
  formatMessage?: MenuFormatMessage;
  getItems?: () => MenuContextItem[] | Promise<MenuContextItem[]>;
  items?: readonly MenuContextItem[];
  loadingMessage?: MenuMessageDescriptor;
  onAfterClose?: () => void;
  onBeforeOpen?: () => Promise<void> | undefined;
  onCloseAutoFocus?: (event: FocusEventLike) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  renderItem?: (
    item: MenuContextEntry,
    onSelect: (item: MenuContextEntry, event: Event) => void
  ) => ReactNode;
  shortcuts?: Record<string, string | undefined>;
  trigger?: ContextMenuTrigger;
}

/**
 * A menu opened by the context menu gesture (right click, ContextMenu or
 * Shift+F10) or by a click, from an items array.
 *
 * When `window.electronBridge.showContextMenu` exists the items become a native template and
 * the operating system draws the menu; otherwise the in-page menu is used. Preparing the
 * items can be asynchronous: each open owns an `AbortController`, and while a native
 * preparation (or an in-page one with nothing to show) is pending, a press, Escape, the
 * ContextMenu key, Shift+F10 or a window blur aborts it.
 */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
function MenuContextMenu({
  align,
  awaitBeforeOpen = true,
  children,
  container,
  contentWidth,
  disableNative = false,
  formatMessage = formatDefaultMessage,
  getItems,
  items,
  loadingMessage,
  onAfterClose,
  onBeforeOpen,
  onCloseAutoFocus,
  onOpenChange,
  open: controlled,
  renderItem,
  shortcuts,
  trigger = "contextmenu",
}: MenuContextMenuProps) {
  const zoom = useMenuZoom();

  const bridge = useSyncExternalStore(
    subscribeNever,
    hasNativeBridge,
    noNativeBridge
  );

  const native = !disableNative && bridge;

  const [resolved, setResolved] = useState<readonly MenuContextEntry[]>();
  const [state, setState] = useState<ContextState>(null);
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const preparation = useRef<AbortController | null>(null);
  const after = useRef<(() => void) | undefined>(undefined);
  const isUsingKeyboard = useKeyboardIntent();

  const list =
    getItems && resolved
      ? resolved
      : translateItems(items ?? [], formatMessage);

  const dropdownOpen = controlled ?? state === "dropdown";

  /** The preparation `controller` ended; runs `onAfterClose` once. */
  const finish = useStableCallback((controller: AbortController | null) => {
    if (controller !== null && preparation.current === controller) {
      preparation.current = null;
      onAfterClose?.();
    }
  });

  useEffect(
    () => () => {
      const controller = preparation.current;

      controller?.abort();
      after.current = undefined;
      finish(controller);
    },
    [finish]
  );

  /** Starts a new preparation and aborts the previous one. */
  const startPreparation = () => {
    preparation.current?.abort();
    after.current = undefined;

    const controller = new AbortController();

    preparation.current = controller;

    return controller;
  };

  const inPage = !native && trigger === "contextmenu";

  /** A preparation failed; an aborted one is ignored. */
  const fail = useStableCallback(
    // oxlint-disable-next-line anti-slop/no-unknown-parameters -- the error is only logged, not read
    (controller: AbortController, error: unknown) => {
      if (controller.signal.aborted) {
        return;
      }

      // The component logs the failure and dismisses the menu.
      reportError(error);
      controller.abort();

      if (inPage || (trigger === "click" && loadingMessage !== undefined)) {
        setResolved([]);
        setState(null);
        onOpenChange?.(false);
      }
    }
  );

  /** The items arrived. */
  const apply = useStableCallback(
    (entries: readonly MenuContextItem[], controller: AbortController) => {
      if (controller.signal.aborted) {
        return [];
      }

      const translated = translateItems(entries, formatMessage);

      if (getItems) {
        setResolved(translated);
      }

      if (
        inPage ||
        (trigger === "click" &&
          loadingMessage !== undefined &&
          entries.length === 0)
      ) {
        setState(entries.length > 0 ? "dropdown" : null);

        if (entries.length === 0) {
          onOpenChange?.(false);
        }
      }

      return translated;
    }
  );

  /** The pending items arrived or failed; `done` then removes the temporary listeners. */
  const settleItems = useStableCallback(
    async (
      source: Promise<MenuContextItem[]>,
      controller: AbortController,
      done: () => void
    ) => {
      try {
        apply(await source, controller);
      } catch (error) {
        fail(controller, error);
        // oxlint-disable-next-line react/todo -- the React Compiler lint cannot lower try/finally; this is an event handler, not render code
      } finally {
        done();
      }
    }
  );

  /**
   * Reads the items. A promise shows the loading entry (or the items already
   * given) and, for an in-page menu with nothing to show, installs the temporary dismissal
   * listeners until the promise settles or the preparation aborts.
   */
  const read = useStableCallback(
    async (
      controller: AbortController,
      wait?: boolean
    ): Promise<MenuContextEntry[]> => {
      if (controller.signal.aborted) {
        return [];
      }

      const source = getItems ? getItems() : (items ?? []);

      if (!isThenable(source)) {
        return apply(source, controller);
      }

      if (wait === true) {
        return apply(await source, controller);
      }

      const seed = !native && items && items.length > 0 ? items : undefined;

      const placeholder: readonly MenuContextItem[] =
        loadingMessage === undefined
          ? []
          : [
              {
                enabled: false,
                id: "context-menu-loading",
                message: loadingMessage,
              },
            ];

      setResolved(translateItems(seed ?? placeholder, formatMessage));

      if (seed !== undefined) {
        setState("dropdown");
      }

      const listeners = new AbortController();

      const stop = () => {
        listeners.abort();
      };

      controller.signal.addEventListener("abort", stop, { once: true });

      if (inPage && loadingMessage === undefined && seed === undefined) {
        const dismiss = () => {
          controller.abort();
          setState(null);
          onOpenChange?.(false);
        };

        const options = { capture: true, signal: listeners.signal };

        document.addEventListener("pointerdown", dismiss, options);
        document.addEventListener("contextmenu", dismiss, options);
        document.addEventListener(
          "keydown",
          (event) => {
            if (event.key === "Escape") {
              dismiss();
            }
          },
          options
        );
        window.addEventListener("blur", dismiss, { signal: listeners.signal });
      }

      void settleItems(source, controller, () => {
        controller.signal.removeEventListener("abort", stop);
        listeners.abort();
      });

      return [];
    }
  );

  /** `onBeforeOpen` finished: reads the items again. */
  const rereadAfter = useStableCallback(
    async (
      pending: Promise<void> | undefined,
      controller: AbortController,
      wait: boolean
    ) => {
      if (pending !== undefined) {
        try {
          await pending;
          await read(controller, wait);
        } catch (error) {
          fail(controller, error);
        }
      }
    }
  );

  /** Runs `onBeforeOpen` and reads the items, in the order `awaitBeforeOpen` sets. */
  const prepare = useStableCallback(
    async (
      controller: AbortController,
      wait?: boolean
    ): Promise<MenuContextEntry[]> => {
      if (!awaitBeforeOpen) {
        const first = read(controller, wait === true);

        void rereadAfter(onBeforeOpen?.(), controller, wait === true);

        return await first;
      }

      void rereadAfter(onBeforeOpen?.(), controller, wait === true);

      return await read(controller, wait === true);
    }
  );

  /** The native path awaits `onBeforeOpen`, then the items. */
  const prepareNative = async (controller: AbortController) => {
    await onBeforeOpen?.();

    if (controller.signal.aborted) {
      return [];
    }

    return apply(await (getItems ? getItems() : (items ?? [])), controller);
  };

  /** A failing preparation dismisses the menu. */
  const runPreparation = useStableCallback(
    async (controller: AbortController) => {
      try {
        await prepare(controller);
      } catch (error) {
        fail(controller, error);
      }
    }
  );

  /** The in-page menu opens or closes. */
  const changeOpen = useStableCallback((next: boolean) => {
    if (next) {
      const controller = startPreparation();

      setState("dropdown");
      onOpenChange?.(true);

      void runPreparation(controller);
    } else {
      setState(null);
      onOpenChange?.(false);
      preparation.current?.abort();
    }
  });

  /** A row was selected. */
  const select = useStableCallback((item: MenuContextEntry, event: Event) => {
    if (item.enabled === false) {
      event.preventDefault();
    } else if (item.selectAfterClose === true) {
      after.current = item.onSelect;
    } else {
      item.onSelect?.();
    }
  });

  /** Focus returns after the in-page menu closed. */
  const closeAutoFocus = useStableCallback((event: FocusEventLike) => {
    if (state === "native") {
      event.preventDefault();

      return;
    }

    const pending = after.current;

    after.current = undefined;

    if (pending) {
      event.preventDefault();
      pending();
    }

    onCloseAutoFocus?.(event);

    if (!dropdownOpen) {
      finish(preparation.current);
    }
  });

  /** The native menu opens at the pointer or the bottom left of the element. */
  const openNative = useStableCallback(
    // oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
    async (
      event: ReactKeyboardEvent<HTMLElement> | ReactMouseEvent<HTMLElement>
    ) => {
      if (!native) {
        return;
      }

      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();

      const at =
        event.type === "contextmenu" && "clientX" in event
          ? { x: event.clientX, y: event.clientY }
          : { x: rect.left, y: rect.bottom };

      document.dispatchEvent(new PointerEvent("pointercancel"));

      const previousFocus = document.activeElement;
      const controller = startPreparation();
      const listeners = new AbortController();
      let shown = false;

      const reset = () => {
        if (shown) {
          // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
          shown = false;
          setState(null);
          onOpenChange?.(false);
        }
      };

      const cancel = () => {
        listeners.abort();
        reset();
      };

      controller.signal.addEventListener("abort", cancel, { once: true });

      const abort = () => {
        controller.abort();
      };

      document.addEventListener("pointerdown", abort, {
        capture: true,
        signal: listeners.signal,
      });
      document.addEventListener("contextmenu", abort, {
        capture: true,
        signal: listeners.signal,
      });
      document.addEventListener(
        "keydown",
        (key) => {
          if (
            key.key === "Escape" ||
            key.key === "ContextMenu" ||
            (key.key === "F10" && key.shiftKey)
          ) {
            abort();
          }
        },
        { capture: true, signal: listeners.signal }
      );
      window.addEventListener("blur", abort, { signal: listeners.signal });

      try {
        const entries = await (awaitBeforeOpen
          ? prepareNative(controller)
          : prepare(controller, true));

        listeners.abort();

        if (controller.signal.aborted || entries.length === 0) {
          return;
        }

        dismissTooltips();
        shown = true;
        setState("native");
        onOpenChange?.(true);

        const chosen = await window.electronBridge?.showContextMenu?.(
          toNativeTemplate(entries),
          at
        );

        if (controller.signal.aborted) {
          return;
        }

        const entry =
          chosen?.id === undefined || chosen.id === ""
            ? undefined
            : findEntry(entries, chosen.id);

        reset();

        const closeEvent = new Event("closeAutoFocus", { cancelable: true });

        if (entry?.selectAfterClose === true) {
          closeEvent.preventDefault();
        }

        onCloseAutoFocus?.(closeEvent);

        if (
          !closeEvent.defaultPrevented &&
          previousFocus instanceof HTMLElement &&
          previousFocus.isConnected
        ) {
          previousFocus.focus();
        }

        if (entry?.enabled !== false && entry?.nativeRole === undefined) {
          entry?.onSelect?.();
        }
      } catch (error) {
        fail(controller, error);
        // oxlint-disable-next-line react/todo -- the React Compiler lint cannot lower try/finally; this is an event handler, not render code
      } finally {
        listeners.abort();
        controller.signal.removeEventListener("abort", cancel);
        reset();
        controller.abort();
        finish(controller);
      }
    }
  );

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: the child is a caller element; only the handler and ref props read here are typed
  const childProps = children.props as {
    onContextMenu?: (event: ReactMouseEvent<HTMLElement>) => void;
    onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
    ref?: Ref<HTMLElement>;
  };

  const handleKeyDown = useStableCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      childProps.onKeyDown?.(event);

      if (
        event.defaultPrevented ||
        event.target !== event.currentTarget ||
        (event.key !== "ContextMenu" &&
          !(event.key === "F10" && event.shiftKey)) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (native) {
        void openNative(event);
      } else if (trigger === "click") {
        changeOpen(true);
      } else {
        const rect = event.currentTarget.getBoundingClientRect();

        event.currentTarget.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: rect.left,
            clientY: rect.bottom,
          })
        );
      }
    }
  );

  const handleContextMenu = useStableCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      childProps.onContextMenu?.(event);
      event.stopPropagation();

      if (event.defaultPrevented) {
        return;
      }

      if (native) {
        void openNative(event);

        return;
      }

      event.preventDefault();

      if (trigger !== "click") {
        setPoint({ x: event.clientX, y: event.clientY });
      }

      changeOpen(true);
    }
  );

  const gestureProps = {
    onContextMenu: handleContextMenu,
    onKeyDown: handleKeyDown,
    // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
    ref: mergeRefs(childProps.ref, (element: HTMLElement | null) => {
      triggerRef.current = element;
    }),
  };

  // With the native bridge a contextmenu trigger is only the gesture; no in-page menu exists.
  if (native && trigger === "contextmenu") {
    // oxlint-disable-next-line react/no-clone-element -- the component clones its trigger or row child (Radix `asChild`) to merge props, handlers and ref
    return cloneElement(children, gestureProps);
  }

  // oxlint-disable-next-line react/no-clone-element -- the component clones its trigger or row child (Radix `asChild`) to merge props, handlers and ref
  const triggerElement = cloneElement(children, {
    ...gestureProps,
    "aria-expanded": state === "native" || dropdownOpen,
  });

  const shortcutOf = (item: MenuContextEntry) => {
    if (shortcuts && Object.hasOwn(shortcuts, item.id)) {
      return shortcuts[item.id];
    }

    return item.accelerator === undefined
      ? undefined
      : formatAccelerator(item.accelerator);
  };

  const rows = (entries: readonly MenuContextEntry[]): ReactNode =>
    entries.map((item) => {
      const tooltip = item.tooltipMessage
        ? renderMessage(item.tooltipMessage, item.tooltipMessageValues)
        : undefined;

      const shortcut = shortcutOf(item);

      const reserve = entries.some((entry) => !isNil(entry.icon));

      if (item.type === "separator") {
        return (
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a separator is not a control and has no label
          <div
            className="mx-1 my-[var(--ck-popup-separator-gutter,var(--spacing))] border-t border-border/60"
            key={item.id}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a div with this role
            role="separator"
          />
        );
      }

      if (item.type === "label") {
        return <MenuTitle key={item.id}>{itemLabel(item)}</MenuTitle>;
      }

      if (item.submenu) {
        return (
          <MenuFlyoutSubmenuItem
            className={cn(
              contextRowClasses,
              "justify-between gap-1.5 text-text data-[state=open]:bg-fill-primary-transparent-hover"
            )}
            contentClassName="min-w-[200px] shadow-lg"
            contentSurface="menu"
            disabled={item.enabled === false}
            key={item.id}
            label={itemLabel(item)}
            tooltipText={tooltip}
            triggerContent={
              <ContextRow
                icon={item.icon}
                label={itemLabel(item)}
                reserveIcon={reserve}
                showChevron
              />
            }
            variant="unstyled"
          >
            {rows(item.submenu)}
          </MenuFlyoutSubmenuItem>
        );
      }

      if (item.type === "checkbox") {
        return (
          <MenuTooltip key={item.id} tooltipText={tooltip}>
            <MenuCheckboxItem
              aria-keyshortcuts={keyShortcutsOf(item.accelerator)}
              checked={item.checked ?? false}
              className={cn(
                contextRowClasses,
                item.enabled === false && "cursor-default opacity-50"
              )}
              closeOnSelect={item.closeOnSelect}
              disabled={item.enabled === false}
              onSelect={(event) => {
                select(item, event);
              }}
            >
              <ContextRow
                checked={item.checked === true}
                label={itemLabel(item)}
                reserveIcon={reserve}
                shortcutLabel={shortcut}
                showCheckbox
              />
            </MenuCheckboxItem>
          </MenuTooltip>
        );
      }

      const handleClick = item.onClick;

      return (
        <MenuTooltip key={item.id} tooltipText={tooltip}>
          <MenuItemShell
            aria-checked={
              item.type === "radio" ? item.checked === true : undefined
            }
            aria-keyshortcuts={keyShortcutsOf(item.accelerator)}
            className={cn(
              contextRowClasses,
              item.tone === "danger" ? dangerTextClass : "text-text",
              item.enabled === false && "cursor-default opacity-50"
            )}
            disabled={item.enabled === false}
            onClick={handleClick}
            onSelect={(event) => {
              select(item, event);
            }}
            role={item.type === "radio" ? "menuitemradio" : "menuitem"}
          >
            <ContextRow
              checked={item.checked === true}
              icon={item.icon}
              label={itemLabel(item)}
              reserveIcon={reserve}
              shortcutLabel={shortcut}
              showCheckbox={item.type === "radio"}
            />
          </MenuItemShell>
        </MenuTooltip>
      );
    });

  /** Click mode: the same items as standard dropdown rows. */
  const clickRows = (entries: readonly MenuContextEntry[]): ReactNode =>
    entries.map((item) => {
      const custom = renderItem?.(item, select);

      if (!isNil(custom)) {
        return <span key={item.id}>{custom}</span>;
      }

      if (item.type === "separator") {
        return <MenuSeparator key={item.id} />;
      }

      if (item.type === "label") {
        return <MenuTitle key={item.id}>{itemLabel(item)}</MenuTitle>;
      }

      const tooltip = item.tooltipMessage
        ? renderMessage(item.tooltipMessage, item.tooltipMessageValues)
        : undefined;

      const reserve = entries.some((entry) => !isNil(entry.icon));

      const shortcut = shortcutOf(item);

      if (item.submenu) {
        return (
          <MenuFlyoutSubmenuItem
            disabled={item.enabled === false}
            key={item.id}
            label={
              <ContextRow
                icon={item.icon}
                label={itemLabel(item)}
                reserveIcon={reserve}
              />
            }
            tooltipText={tooltip}
          >
            {clickRows(item.submenu)}
          </MenuFlyoutSubmenuItem>
        );
      }

      if (item.type === "checkbox") {
        return (
          <MenuCheckboxItem
            aria-keyshortcuts={keyShortcutsOf(item.accelerator)}
            checked={item.checked}
            closeOnSelect={item.closeOnSelect}
            disabled={item.enabled === false}
            key={item.id}
            onSelect={(event) => {
              select(item, event);
            }}
            tooltipText={tooltip}
          >
            {item.accelerator === undefined ? (
              itemLabel(item)
            ) : (
              <ContextRow label={itemLabel(item)} shortcutLabel={shortcut} />
            )}
          </MenuCheckboxItem>
        );
      }

      const handleClick = item.onClick;

      return (
        <MenuItem
          aria-checked={
            item.type === "radio" ? item.checked === true : undefined
          }
          aria-keyshortcuts={
            shortcut === undefined
              ? undefined
              : keyShortcutsOf(item.accelerator)
          }
          disabled={item.enabled === false}
          href={item.href}
          key={item.id}
          onClick={handleClick}
          onSelect={
            item.onClick === undefined
              ? (event) => {
                  select(item, event);
                }
              : undefined
          }
          RightIcon={item.checked === true ? CheckIcon : undefined}
          role={item.type === "radio" ? "menuitemradio" : "menuitem"}
          tone={item.tone}
          tooltipText={tooltip}
        >
          <ContextRow
            icon={item.icon}
            label={itemLabel(item)}
            reserveIcon={reserve}
            shortcutLabel={shortcut}
          />
        </MenuItem>
      );
    });

  if (trigger === "click") {
    const shown =
      controlled === true && items
        ? translateItems(items, formatMessage)
        : list;

    return (
      <Menu
        align={align}
        contentWidth={contentWidth ?? "menu"}
        onCloseAutoFocus={closeAutoFocus}
        onOpenChange={changeOpen}
        open={state !== "native" && dropdownOpen}
        portalContainer={container}
        triggerButton={triggerElement}
      >
        {clickRows(shown)}
      </Menu>
    );
  }

  const shell: MenuShellContextValue = {
    anchor: {
      getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0),
    },
    onCloseAutoFocus: closeAutoFocus,
    triggerRef,
    zoom,
  };

  return (
    <>
      {triggerElement}
      <MenuRoot
        isUsingKeyboard={isUsingKeyboard}
        onOpenChange={(next) => {
          if (!next) {
            changeOpen(false);
          }
        }}
        open={dropdownOpen}
      >
        {/* oxlint-disable-next-line react/jsx-no-constructed-context-values -- the value closes over this render's handlers and state, as the Radix context does */}
        <MenuShellContext value={shell}>
          <MenuPortalContainerContext value={container ?? null}>
            {list.length > 0 ? (
              <MenuPrimitive.Portal container={container ?? undefined}>
                <MenuContent
                  align={align}
                  className={cn(
                    contextSurfaceClasses,
                    contentWidth ? widthClasses[contentWidth] : undefined
                  )}
                  collisionPadding={6}
                  side="bottom"
                  // oxlint-disable-next-line shadcn/no-inline-styles -- the component applies the page zoom through a style prop
                  style={{ zoom: zoom === 1 ? undefined : zoom }}
                  unstyled
                >
                  {rows(list)}
                </MenuContent>
              </MenuPrimitive.Portal>
            ) : null}
          </MenuPortalContainerContext>
        </MenuShellContext>
      </MenuRoot>
    </>
  );
}

export {
  ItemIndicatorContext,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuFlyoutSubmenuItem,
  MenuGroup,
  MenuInput,
  MenuItem,
  MenuItemContent,
  MenuItemIcon,
  MenuContextMenu,
  MenuItemShell,
  MenuMessage,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSearchInput,
  MenuSection,
  MenuSectionLabel,
  MenuSeparator,
  MenuSubmenuItem,
  MenuTitle,
  MenuTooltip,
  MenuZoomProvider,
  assignRef,
  focusMenuItem,
  leaveSubTrigger,
  mergeRefs,
  useKeyboardIntent,
  useMenuContent,
  useMenuRoot,
  useMenuZoom,
};

export { formatAccelerator } from "@workspace/react/components/ui/keyboard-shortcut";

export type {
  MenuContextEntry,
  MenuContextItem,
  MenuContextMenuProps,
  MenuFormatMessage,
  MenuIconComponent,
  MenuCheckboxItemProps,
  MenuContentProps,
  MenuContentContextValue,
  MenuContentWidth,
  MenuFlyoutSubmenuItemProps,
  MenuItemProps,
  MenuProps,
  MenuRadioItemProps,
  MenuRowLayout,
  MenuSize,
  MenuSurface,
};
