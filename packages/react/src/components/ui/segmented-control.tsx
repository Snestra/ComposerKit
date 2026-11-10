"use client";

import { cn } from "@workspace/react/lib/utils";
/* oxlint-disable anti-slop/no-runtime-typeof -- Refs are callbacks or objects. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  Ref,
} from "react";

type SegmentedControlSize =
  | "3xs"
  | "2xs"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl";

type SegmentedControlGutterSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl";

type SegmentedControlDirection = "ltr" | "rtl";

type SegmentedControlOrientation = "horizontal" | "vertical";

type RefCleanup = () => void;

// Ref merging:
// callback refs may return a cleanup function (React 19).
const setRef = <T,>(
  ref: Ref<T> | undefined,
  node: T | null
): RefCleanup | undefined => {
  if (typeof ref === "function") {
    const cleanup = ref(node);

    return typeof cleanup === "function" ? cleanup : undefined;
  }

  if (ref !== null && ref !== undefined) {
    ref.current = node;
  }

  return undefined;
};

// When any ref returns a cleanup, React calls the merged cleanup instead of
// the merged ref with null. The cleanup runs each returned cleanup and
// clears the refs that returned none.
const mergeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (node: T | null): RefCleanup | undefined => {
    const cleanups = refs.map((ref) => setRef(ref, node));

    if (!cleanups.some((cleanup) => cleanup !== undefined)) {
      return undefined;
    }

    return () => {
      for (const [index, ref] of refs.entries()) {
        const cleanup = cleanups[index];

        if (cleanup === undefined) {
          setRef(ref, null);
        } else {
          cleanup();
        }
      }
    };
  };

// Radix composeEventHandlers: the second handler is skipped
// when the first one prevented the default.
const composeHandlers =
  <E extends { defaultPrevented: boolean }>(
    original: ((event: E) => void) | undefined,
    ours: (event: E) => void
  ) =>
  (event: E) => {
    original?.(event);

    if (!event.defaultPrevented) {
      ours(event);
    }
  };

// --- Sizes ---
// Each size sets height, font size, radius and the default option gutter.
// Values come from the --ck-control-* scale
// and the font sizes at (--text-xs/--text-sm/--text-base).
const sizeClasses = {
  "2xl":
    "[--ck-segments-size:2.75rem] [--ck-segments-font-size:var(--text-base)] [--ck-segments-radius:var(--radius-xl)]",
  "2xs":
    "[--ck-segments-size:1.5rem] [--ck-segments-font-size:var(--text-xs)] [--ck-segments-radius:var(--radius-sm)]",
  "3xl":
    "[--ck-segments-size:3rem] [--ck-segments-font-size:var(--text-base)] [--ck-segments-radius:var(--radius-xl)]",
  "3xs":
    "[--ck-segments-size:1.375rem] [--ck-segments-font-size:var(--text-xs)] [--ck-segments-radius:var(--radius-sm)]",
  lg: "[--ck-segments-size:2.25rem] [--ck-segments-font-size:var(--text-sm)] [--ck-segments-radius:var(--radius-md)]",
  md: "[--ck-segments-size:2rem] [--ck-segments-font-size:var(--text-sm)] [--ck-segments-radius:var(--radius-md)]",
  sm: "[--ck-segments-size:1.75rem] [--ck-segments-font-size:var(--text-sm)] [--ck-segments-radius:var(--radius-md)]",
  xl: "[--ck-segments-size:2.5rem] [--ck-segments-font-size:var(--text-sm)] [--ck-segments-radius:var(--radius-lg)]",
  xs: "[--ck-segments-size:1.625rem] [--ck-segments-font-size:var(--text-sm)] [--ck-segments-radius:var(--radius-sm)]",
} as const satisfies Record<SegmentedControlSize, string>;

const sizeGutters = {
  "2xl": "xl",
  "2xs": "xs",
  "3xl": "xl",
  "3xs": "xs",
  lg: "md",
  md: "md",
  sm: "sm",
  xl: "lg",
  xs: "xs",
} as const satisfies Record<SegmentedControlSize, SegmentedControlGutterSize>;

const gutterClasses = {
  "2xs": "[--ck-segments-option-gutter:.375rem]",
  lg: "[--ck-segments-option-gutter:.875rem]",
  md: "[--ck-segments-option-gutter:.75rem]",
  sm: "[--ck-segments-option-gutter:.625rem]",
  xl: "[--ck-segments-option-gutter:1rem]",
  xs: "[--ck-segments-option-gutter:.5rem]",
} as const satisfies Record<SegmentedControlGutterSize, string>;

// --- Colors ---
const defaultVariantClasses =
  "[--ck-segments-track-padding-inline:var(--ck-segments-gutter)] [--ck-segments-background:var(--ck-palette-surface-control)] [--ck-segments-thumb-background:light-dark(var(--color-light-app-background-elevated-primary-opaque),var(--color-dark-app-background-elevated-primary-opaque))] [--ck-segments-thumb-shadow:var(--shadow-sm)] [--ck-segments-option-highlight-background-color:color-mix(in_oklab,var(--ck-palette-ink)_18%,transparent)]";

// --color-panel-tertiary is --ck-palette-surface-editor-opaque. The app
// variable is read directly because a custom property that refers to another
// is resolved where it is declared, so a nested theme scope would keep the
// page's value.
const ghostVariantClasses =
  "[--ck-segments-track-padding-inline:0px] [--ck-segments-background:transparent] [--ck-segments-thumb-background:var(--ck-palette-surface-editor-opaque)] [--ck-segments-thumb-shadow:none] [--ck-segments-option-highlight-background-color:var(--ck-palette-surface-editor-opaque)]";

const rootBaseClasses =
  "relative align-middle [--ck-segments-gap:2px] [--ck-segments-gutter:2px] [--ck-segments-font-weight:var(--font-weight-semibold)] [--ck-segments-option-highlight-gutter:1px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent flex-nowrap h-(--ck-segments-size) gap-(--ck-segments-gap) rounded-(--ck-segments-radius) [background:var(--ck-segments-background)] text-(length:--ck-segments-font-size) font-(weight:--ck-segments-font-weight) py-(--ck-segments-gutter) px-(--ck-segments-track-padding-inline)";

const thumbClasses =
  "pointer-events-none absolute top-(--ck-segments-gutter) bottom-(--ck-segments-gutter) left-0 rounded-(--ck-segments-option-radius) [background:var(--ck-segments-thumb-background)] [box-shadow:var(--ck-segments-thumb-shadow)] will-change-transform";

// The hover rules only apply for a fine hovering pointer. The classes are
// spelled out so Tailwind can see them.
const optionBaseClasses =
  "relative cursor-pointer rounded-(--ck-segments-option-radius) py-0 leading-none transition-[opacity,background-color,color] duration-(--motion-duration-fast) ease-[ease] focus:outline-0 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring [&_svg]:block before:pointer-events-none before:absolute before:inset-(--ck-segments-option-highlight-gutter) before:rounded-(--ck-segments-option-radius) before:[background:var(--ck-segments-option-highlight-background-color)] before:opacity-0 before:transition-[opacity,transform] before:duration-(--motion-duration-fast) before:ease-[ease] before:will-change-transform before:[transform:scale(1)] active:before:[transform:scale(var(--scale),0.97)]";

// Text colors by variant and state; the off state reacts to hover and focus.
const optionColorClasses = {
  default: {
    off: "text-text-muted focus-visible:text-text [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:text-text [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:before:opacity-50",
    on: "text-text",
  },
  ghost: {
    off: "text-text-subtle focus-visible:text-text [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:text-text [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:before:opacity-50 focus-visible:-outline-offset-2",
    on: "text-text focus-visible:-outline-offset-2",
  },
} as const;

const disabledClasses = "cursor-not-allowed opacity-50 before:opacity-0!";

// --- Roving focus ---
type FocusIntent = "first" | "last" | "next" | "prev";

const focusIntents = new Map<string, FocusIntent>([
  ["ArrowDown", "next"],
  ["ArrowLeft", "prev"],
  ["ArrowRight", "next"],
  ["ArrowUp", "prev"],
  ["End", "last"],
  ["Home", "first"],
  ["PageDown", "last"],
  ["PageUp", "first"],
]);

const getDirectionAwareKey = (key: string, dir: SegmentedControlDirection) => {
  if (dir !== "rtl") {
    return key;
  }

  if (key === "ArrowLeft") {
    return "ArrowRight";
  }

  return key === "ArrowRight" ? "ArrowLeft" : key;
};

const getFocusIntent = (
  event: KeyboardEvent,
  orientation: SegmentedControlOrientation | undefined,
  dir: SegmentedControlDirection
): FocusIntent | undefined => {
  const key = getDirectionAwareKey(event.key, dir);

  if (
    orientation === "vertical" &&
    (key === "ArrowLeft" || key === "ArrowRight")
  ) {
    return undefined;
  }

  if (
    orientation === "horizontal" &&
    (key === "ArrowUp" || key === "ArrowDown")
  ) {
    return undefined;
  }

  return focusIntents.get(key);
};

const focusFirst = (candidates: HTMLElement[], preventScroll = false) => {
  const previous = document.activeElement;

  for (const candidate of candidates) {
    if (candidate === previous) {
      return;
    }

    candidate.focus({ preventScroll });

    if (document.activeElement !== previous) {
      return;
    }
  }
};

// Radix wrapArray: the items from startIndex on, then the ones before it.
const wrapArray = <T,>(array: T[], startIndex: number) => {
  const offset = startIndex % array.length;

  return [...array.slice(offset), ...array.slice(0, offset)];
};

interface RovingItem {
  active: boolean;
  focusable: boolean;
  id: string;
  ref: { current: HTMLButtonElement | null };
}

interface SegmentedControlContextValue {
  block: boolean;
  currentTabStopId: string | null;
  disabled: boolean;
  dir: SegmentedControlDirection;
  getItems: () => RovingItem[];
  loop: boolean;
  onFocusableItemAdd: () => void;
  onFocusableItemRemove: () => void;
  onItemFocus: (id: string) => void;
  onItemShiftTab: () => void;
  orientation: SegmentedControlOrientation | undefined;
  pill: boolean;
  registerItem: (item: RovingItem) => () => void;
  rovingFocus: boolean;
  setValue: (value: string) => void;
  value: string;
  variant: "default" | "ghost";
}

const SegmentedControlContext =
  createContext<SegmentedControlContextValue | null>(null);

const useSegmentedControlContext = () => {
  const context = useContext(SegmentedControlContext);

  if (!context) {
    throw new Error("Place each SegmentedItem under a SegmentedControl root");
  }

  return context;
};

const noCleanup = () => {
  /* An effect with nothing to undo. */
};

// --- Thumb geometry ---
const THUMB_TRANSITION =
  "width 300ms var(--ck-curve-enter), transform 300ms var(--ck-curve-enter)";

const SCROLL_MARGIN_RATIO = 0.15;
const ENTER_FRAMES = 2;

// Wait two animation frames (a timeout while
// the document is hidden or without requestAnimationFrame).
const afterFrames = (onFrame: () => void) => {
  if (
    typeof window === "undefined" ||
    typeof window.requestAnimationFrame !== "function" ||
    document.visibilityState === "hidden"
  ) {
    const timeout = setTimeout(onFrame, 0);

    return () => {
      clearTimeout(timeout);
    };
  }

  let remaining = ENTER_FRAMES;

  let frame = window.requestAnimationFrame(function step() {
    remaining -= 1;

    if (remaining === 0) {
      onFrame();
    } else {
      frame = window.requestAnimationFrame(step);
    }
  });

  return () => {
    if (typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(frame);
    }
  };
};

const placeThumb = (
  track: HTMLElement,
  thumb: HTMLElement,
  animate: boolean
) => {
  const selected = track.querySelector<HTMLElement>('[data-state="on"]');

  if (!selected) {
    return;
  }

  const trackWidth = track.clientWidth;
  let selectedWidth = Math.floor(selected.clientWidth);
  const { offsetLeft } = selected;
  // parseFloat reads the leading number of a length such as "2px".
  // oxlint-disable-next-line unicorn/prefer-number-coercion
  const paddingRight = Number.parseFloat(getComputedStyle(track).paddingRight);

  if (trackWidth - (selectedWidth + offsetLeft) < (paddingRight || 0)) {
    selectedWidth -= 1;
  }

  thumb.style.width = `${Math.floor(selectedWidth)}px`;
  thumb.style.transform = `translateX(${offsetLeft}px)`;

  if (track.scrollWidth <= trackWidth) {
    return;
  }

  const margin = trackWidth * SCROLL_MARGIN_RATIO;
  const trackRect = track.getBoundingClientRect();
  const selectedRect = selected.getBoundingClientRect();

  if (
    selectedRect.left < trackRect.left + margin ||
    selectedRect.right > trackRect.right - margin
  ) {
    const left =
      selectedRect.left +
      selectedRect.width / 2 -
      (trackRect.left + trackRect.width / 2);

    track.scrollBy({ behavior: animate ? "smooth" : "instant", left });
  }
};

const useResizeObserver = (
  ref: { current: HTMLElement | null },
  onResize: () => void
) => {
  const callback = useRef(onResize);

  useEffect(() => {
    callback.current = onResize;
  });

  useEffect(() => {
    const element = ref.current;

    if (element === null || typeof ResizeObserver === "undefined") {
      return noCleanup;
    }

    let width: number | undefined;
    let height: number | undefined;

    const observer = new ResizeObserver(([entry]) => {
      const size = entry?.contentBoxSize?.[0];

      const nextWidth =
        size === undefined ? entry?.contentRect.width : size.inlineSize;

      const nextHeight =
        size === undefined ? entry?.contentRect.height : size.blockSize;

      if (width !== nextWidth || height !== nextHeight) {
        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        width = nextWidth;
        height = nextHeight;
        callback.current();
      }
    });

    observer.observe(element, { box: "content-box" });

    return () => {
      observer.disconnect();
    };
  }, [ref]);
};

interface SegmentedControlProps<Value extends string = string> extends Omit<
  ComponentProps<"div">,
  "defaultValue" | "dir" | "onChange"
> {
  /** Fill the available width and share it between the options. */
  block?: boolean;
  /** Disables every option. */
  disabled?: boolean;
  dir?: SegmentedControlDirection;
  gutterSize?: SegmentedControlGutterSize;
  /** The component passes `loop={false}`; a prop can still override it. */
  loop?: boolean;
  /** Called with the new value. It is never called for an empty value. */
  onChange?: (value: Value) => void;
  orientation?: SegmentedControlOrientation;
  pill?: boolean;
  rovingFocus?: boolean;
  size?: SegmentedControlSize;
  value?: Value;
  variant?: "ghost";
}

// The thumb is placed from the selected option and moves with a transition
// only after its first placement.
const useThumb = (
  trackRef: { current: HTMLElement | null },
  placementKey: string
) => {
  const thumbRef = useRef<HTMLDivElement | null>(null);

  const place = useCallback(
    (animate: boolean) => {
      const track = trackRef.current;
      const thumb = thumbRef.current;

      if (track && thumb) {
        placeThumb(track, thumb, animate);
      }
    },
    [trackRef]
  );

  useResizeObserver(trackRef, () => {
    const thumb = thumbRef.current;

    if (!thumb) {
      return;
    }

    const { transition } = thumb.style;

    thumb.style.transition = "";
    place(false);
    thumb.style.transition = transition;
  });

  // The component re-places the thumb when value, size, gutterSize, pill or
  // variant change; placementKey joins them.
  useLayoutEffect(() => {
    const thumb = thumbRef.current;

    if (!(trackRef.current && thumb)) {
      return noCleanup;
    }

    place(Boolean(thumb.style.transition));

    if (thumb.style.transition) {
      return noCleanup;
    }

    return afterFrames(() => {
      thumb.style.transition = THUMB_TRANSITION;
    });
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [place, trackRef, placementKey]);

  return thumbRef;
};

// ToggleGroupImplSingle: the value is controlled when a value prop is given.
// The group value is "" until an option is pressed, and pressing the pressed
// option sets "", which is never reported.
const useGroupValue = <Value extends string>(
  valueProp: Value | undefined,
  onChange: ((value: Value) => void) | undefined
) => {
  const [internalValue, setInternalValue] = useState<string>("");
  const onChangeRef = useRef(onChange);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internalValue;

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const setValue = useCallback(
    (next: string) => {
      if (next === value) {
        return;
      }

      if (!isControlled) {
        setInternalValue(next);
      }

      if (next) {
        // SAFETY: only the options of this control set a value, and the
        // consumer types their values as Value.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        onChangeRef.current?.(next as Value);
      }
    },
    [isControlled, value]
  );

  return { setValue, value };
};

interface RovingHandlers {
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onMouseDown?: (event: MouseEvent<HTMLDivElement>) => void;
}

// RovingFocusGroupImpl: the group is the tab stop until an item is focused,
// and entry focus moves to the pressed item.
const useRovingGroup = (
  rovingFocus: boolean,
  getItems: () => RovingItem[],
  handlers: RovingHandlers
) => {
  const isClickFocusRef = useRef(false);
  const [currentTabStopId, setCurrentTabStopId] = useState<string | null>(null);
  const [isTabbingBackOut, setIsTabbingBackOut] = useState(false);
  const [focusableItemCount, setFocusableItemCount] = useState(0);

  const onItemFocus = useCallback((id: string) => {
    setCurrentTabStopId(id);
  }, []);

  const onItemShiftTab = useCallback(() => {
    setIsTabbingBackOut(true);
  }, []);

  const onFocusableItemAdd = useCallback(() => {
    setFocusableItemCount((count) => count + 1);
  }, []);

  const onFocusableItemRemove = useCallback(() => {
    setFocusableItemCount((count) => count - 1);
  }, []);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    handlers.onBlur?.(event);

    if (!event.defaultPrevented) {
      setIsTabbingBackOut(false);
    }
  };

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    handlers.onMouseDown?.(event);

    if (!event.defaultPrevented) {
      isClickFocusRef.current = true;
    }
  };

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    handlers.onFocus?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const isKeyboardFocus = !isClickFocusRef.current;

    if (
      event.target === event.currentTarget &&
      isKeyboardFocus &&
      !isTabbingBackOut
    ) {
      const items = getItems().filter((item) => item.focusable);

      const candidates = [
        items.find((item) => item.active),
        items.find((item) => item.id === currentTabStopId),
        ...items,
      ];

      focusFirst(
        candidates.flatMap((item) =>
          item?.ref.current ? [item.ref.current] : []
        )
      );
    }

    isClickFocusRef.current = false;
  };

  let tabIndex: number | undefined;

  if (rovingFocus) {
    tabIndex = isTabbingBackOut || focusableItemCount === 0 ? -1 : 0;
  }

  return {
    currentTabStopId,
    onFocusableItemAdd,
    onFocusableItemRemove,
    onItemFocus,
    onItemShiftTab,
    rootHandlers: rovingFocus
      ? { onBlur, onFocus, onMouseDown }
      : {
          onBlur: handlers.onBlur,
          onFocus: handlers.onFocus,
          onMouseDown: handlers.onMouseDown,
        },
    tabIndex,
  };
};

const useItemRegistry = () => {
  const itemsRef = useRef(new Map<string, RovingItem>());

  const getItems = useCallback(
    () =>
      [...itemsRef.current.values()].toSorted((a, b) => {
        const left = a.ref.current;
        const right = b.ref.current;

        if (left === null || right === null) {
          return 0;
        }

        const position = left.compareDocumentPosition(right);

        // Same test as the Radix collection: does right follow left?
        // oxlint-disable-next-line eslint/no-bitwise
        const follows = position & Node.DOCUMENT_POSITION_FOLLOWING;

        return follows === 0 ? 1 : -1;
      }),
    []
  );

  const registerItem = useCallback((item: RovingItem) => {
    itemsRef.current.set(item.id, item);

    return () => {
      itemsRef.current.delete(item.id);
    };
  }, []);

  return { getItems, registerItem };
};

function SegmentedControl<Value extends string = string>({
  block,
  children,
  className,
  disabled = false,
  dir: dirProp,
  gutterSize,
  loop = false,
  onBlur,
  onChange,
  onFocus,
  onMouseDown,
  orientation,
  pill = false,
  ref,
  rovingFocus = true,
  size = "md",
  style,
  value: valueProp,
  variant,
  ...props
}: SegmentedControlProps<Value>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dir = dirProp ?? "ltr";
  const { value, setValue } = useGroupValue(valueProp, onChange);
  const { getItems, registerItem } = useItemRegistry();

  const roving = useRovingGroup(rovingFocus, getItems, {
    onBlur,
    onFocus,
    onMouseDown,
  });

  const isBlock = block === true;

  const context = useMemo<SegmentedControlContextValue>(
    () => ({
      block: isBlock,
      currentTabStopId: roving.currentTabStopId,
      dir,
      disabled,
      getItems,
      loop,
      onFocusableItemAdd: roving.onFocusableItemAdd,
      onFocusableItemRemove: roving.onFocusableItemRemove,
      onItemFocus: roving.onItemFocus,
      onItemShiftTab: roving.onItemShiftTab,
      orientation,
      pill,
      registerItem,
      rovingFocus,
      setValue,
      value,
      variant: variant ?? "default",
    }),
    [
      isBlock,
      roving.currentTabStopId,
      roving.onFocusableItemAdd,
      roving.onFocusableItemRemove,
      roving.onItemFocus,
      roving.onItemShiftTab,
      dir,
      disabled,
      getItems,
      loop,
      orientation,
      pill,
      registerItem,
      variant,
      rovingFocus,
      setValue,
      value,
    ]
  );

  const thumbRef = useThumb(
    trackRef,
    [valueProp, size, gutterSize, pill, variant].join("|")
  );

  const optionGutterClass = gutterClasses[gutterSize ?? sizeGutters[size]];

  const pillClass = pill
    ? "[--ck-segments-radius:var(--radius-pill)] [--ck-segments-option-radius:var(--radius-pill)]"
    : "[--ck-segments-option-radius:calc(var(--ck-segments-radius)_-_var(--ck-segments-gutter))]";

  const setTrack = useCallback((node: HTMLDivElement | null) => {
    trackRef.current = node;
  }, []);

  const composedRef = useMemo(() => mergeRefs(setTrack, ref), [ref, setTrack]);

  const rootProps = {
    "data-block": isBlock ? "" : undefined,
    "data-gutter-size": gutterSize,
    "data-orientation": orientation,
    "data-pill": pill ? "" : undefined,
    "data-size": size,
    "data-variant": variant,
    dir,
  };

  const track = (
    <div
      {...rootProps}
      className={cn(
        rootBaseClasses,
        rovingFocus && "outline-none",
        isBlock
          ? "flex w-full overflow-hidden whitespace-normal"
          : "inline-flex overflow-auto whitespace-nowrap",
        sizeClasses[size],
        optionGutterClass,
        variant === "ghost" ? ghostVariantClasses : defaultVariantClasses,
        pillClass,
        className
      )}
      ref={composedRef}
      role="radiogroup"
      tabIndex={roving.tabIndex}
      {...props}
      {...roving.rootHandlers}
      style={style}
    >
      <div className={thumbClasses} ref={thumbRef} />
      {children}
    </div>
  );

  return (
    <SegmentedControlContext.Provider value={context}>
      {track}
    </SegmentedControlContext.Provider>
  );
}

// Press feedback scale from the option width.
const PRESS_SCALE_SMALL = 0.96;
const PRESS_SCALE_MEDIUM = 0.97;
const PRESS_SCALE_LARGE = 0.98;
const PRESS_SCALE_WIDE = 0.995;
const PRESS_SCALE_DEFAULT = 0.985;
const WIDTH_SMALL = 80;
const WIDTH_MEDIUM = 150;
const WIDTH_LARGE = 220;
const WIDTH_WIDE = 600;

// The platform default config has pressableScaleMultiplier 1.
const PRESS_SCALE_MULTIPLIER = 1;

const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
  const target = event.currentTarget;
  const { offsetWidth } = target;
  let scale = PRESS_SCALE_DEFAULT;

  if (offsetWidth <= WIDTH_SMALL) {
    scale = PRESS_SCALE_SMALL;
  } else if (offsetWidth <= WIDTH_MEDIUM) {
    scale = PRESS_SCALE_MEDIUM;
  } else if (offsetWidth <= WIDTH_LARGE) {
    scale = PRESS_SCALE_LARGE;
  } else if (offsetWidth > WIDTH_WIDE) {
    scale = PRESS_SCALE_WIDE;
  }

  target.style.setProperty(
    "--scale",
    (1 + (scale - 1) * PRESS_SCALE_MULTIPLIER).toString()
  );
};

interface SegmentedItemProps extends Omit<
  ComponentProps<"button">,
  "onPointerEnter" | "value"
> {
  value: string;
}

// ToggleGroupItem inside RovingFocusGroupItem. Like the
// option, a className replaces the base option classes.
function SegmentedItem({
  children,
  className,
  disabled: disabledProp,
  onClick,
  onFocus,
  onKeyDown,
  onMouseDown,
  ref,
  value,
  ...props
}: SegmentedItemProps) {
  const context = useSegmentedControlContext();
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pressed = context.value === value;
  const disabled = context.disabled || (disabledProp ?? false);
  const focusable = !disabled;
  const isCurrentTabStop = context.currentTabStopId === id;
  const { onFocusableItemAdd, onFocusableItemRemove, registerItem } = context;

  useLayoutEffect(() => {
    if (!(context.rovingFocus && focusable)) {
      return noCleanup;
    }

    onFocusableItemAdd();

    return () => {
      onFocusableItemRemove();
    };
  }, [
    context.rovingFocus,
    focusable,
    onFocusableItemAdd,
    onFocusableItemRemove,
  ]);

  useLayoutEffect(() => {
    if (!context.rovingFocus) {
      return noCleanup;
    }

    return registerItem({
      active: pressed,
      focusable,
      id,
      ref: buttonRef,
    });
  }, [context.rovingFocus, focusable, id, pressed, registerItem]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      context.onItemShiftTab();

      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    const intent = getFocusIntent(event, context.orientation, context.dir);

    if (intent === undefined) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }

    event.preventDefault();

    let candidates = context
      .getItems()
      .flatMap((item) =>
        item.focusable && item.ref.current ? [item.ref.current] : []
      );

    if (intent === "last") {
      candidates.reverse();
    } else if (intent === "prev" || intent === "next") {
      if (intent === "prev") {
        candidates.reverse();
      }

      const index = candidates.indexOf(event.currentTarget);

      candidates = context.loop
        ? wrapArray(candidates, index + 1)
        : candidates.slice(index + 1);
    }

    setTimeout(() => {
      focusFirst(candidates);
    }, 0);
  };

  const setButton = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
  }, []);

  const composedRef = useMemo(
    () => mergeRefs(setButton, ref),
    [ref, setButton]
  );

  const rovingHandlers = context.rovingFocus
    ? {
        onFocus: composeHandlers(onFocus, () => {
          context.onItemFocus(id);
        }),
        onKeyDown: composeHandlers(onKeyDown, handleKeyDown),
        onMouseDown: composeHandlers(
          onMouseDown,
          (event: MouseEvent<HTMLButtonElement>) => {
            if (focusable) {
              context.onItemFocus(id);
            } else {
              event.preventDefault();
            }
          }
        ),
      }
    : { onFocus, onKeyDown, onMouseDown };

  let itemTabIndex: number | undefined;

  if (context.rovingFocus) {
    itemTabIndex = isCurrentTabStop ? 0 : -1;
  }

  const colorClasses =
    optionColorClasses[context.variant][pressed ? "on" : "off"];

  return (
    // The option is <button role="radio"> inside a radiogroup.
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    <button
      aria-checked={pressed}
      aria-pressed={undefined}
      className={
        className ??
        cn(
          optionBaseClasses,
          context.pill
            ? "px-[calc(var(--ck-segments-option-gutter)*1.33)]"
            : "px-(--ck-segments-option-gutter)",
          context.block && "flex-1",
          colorClasses,
          disabled && disabledClasses
        )
      }
      data-disabled={disabled ? "" : undefined}
      data-orientation={context.orientation}
      data-state={pressed ? "on" : "off"}
      disabled={disabled}
      // The option is <button role="radio"> inside a radiogroup.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="radio"
      tabIndex={itemTabIndex}
      type="button"
      {...props}
      onClick={composeHandlers(onClick, () => {
        if (disabled) {
          return;
        }

        // Toggle: pressing the pressed option clears the group value, which
        // the root never reports.
        context.setValue(pressed ? "" : value);
      })}
      onPointerEnter={handlePointerEnter}
      ref={composedRef}
      {...rovingHandlers}
    >
      <span className="relative">{children}</span>
    </button>
  );
}

export { SegmentedControl, SegmentedItem };

export type {
  SegmentedControlDirection,
  SegmentedControlGutterSize,
  SegmentedControlOrientation,
  SegmentedControlProps,
  SegmentedControlSize,
  SegmentedItemProps,
};
