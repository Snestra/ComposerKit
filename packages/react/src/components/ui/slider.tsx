"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { cn } from "@workspace/react/lib/utils";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
} from "react";

// Native range input. Classes are the ones.
// `cursor-interaction` is `default` on the Electron desktop window.
function Slider({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-0.5 min-w-0 flex-1 cursor-default appearance-none rounded-full bg-border text-text [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-transparent [&::-moz-range-thumb]:bg-current [&::-moz-range-thumb]:shadow-sm [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:mt-[-9px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-transparent [&::-webkit-slider-thumb]:bg-current [&::-webkit-slider-thumb]:shadow-sm",
        className
      )}
      {...props}
      type="range"
    />
  );
}

// Radix-style slider parts (SliderRoot, SliderTrack, SliderRange, SliderThumb),
// built on plain elements because the geometry of the Radix Slider read from
// (956474-959504) cannot be had from Base UI:
// the pointer fraction is taken over the full root width, the range ends are
// the raw value percentages, and a thumb is kept inside the track by an
// offset of half its size.

const LARGE_STEP_MULTIPLIER = 10;
const PERCENT_SCALE = 10;
const KEY_HOME = "Home";
const KEY_END = "End";
const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const PAGE_KEYS = new Set(["PageUp", "PageDown"]);

// Keys that lower the value, by the side the track starts from.
const DECREMENT_KEYS = {
  "from-bottom": [KEY_HOME, "PageDown", "ArrowDown", "ArrowLeft"],
  "from-left": [KEY_HOME, "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": [KEY_HOME, "PageDown", "ArrowDown", "ArrowRight"],
  "from-top": [KEY_HOME, "PageDown", "ArrowUp", "ArrowLeft"],
} as const;

type Direction = "ltr" | "rtl";

type Orientation = "horizontal" | "vertical";

type Edge = "bottom" | "left" | "right" | "top";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

// Which side each edge pins. The percentages arrive as custom properties,
// because the style rule only allows custom properties.
const RANGE_EDGE_CLASSES: Record<Edge, string> = {
  bottom: "bottom-(--slider-range-start) top-(--slider-range-end)",
  left: "left-(--slider-range-start) right-(--slider-range-end)",
  right: "right-(--slider-range-start) left-(--slider-range-end)",
  top: "top-(--slider-range-start) bottom-(--slider-range-end)",
};

const THUMB_EDGE_CLASSES: Record<Edge, string> = {
  bottom: "bottom-(--slider-thumb-position)",
  left: "left-(--slider-thumb-position)",
  right: "right-(--slider-thumb-position)",
  top: "top-(--slider-thumb-position)",
};

interface SliderContextValue {
  disabled: boolean;
  form: string | undefined;
  max: number;
  min: number;
  name: string | undefined;
  orientation: Orientation;
  registerThumb: (thumb: HTMLElement) => () => void;
  setActiveIndex: (index: number) => void;
  thumbIndex: (thumb: HTMLElement) => number;
  values: readonly number[];
}

interface EdgeContextValue {
  direction: 1 | -1;
  endEdge: Edge;
  size: "height" | "width";
  startEdge: Edge;
}

const SliderContext = createContext<SliderContextValue | null>(null);
const EdgeContext = createContext<EdgeContextValue | null>(null);

const useSliderContext = (part: string) => {
  const context = use(SliderContext);
  const edges = use(EdgeContext);

  if (!(context && edges)) {
    throw new Error(`${part} needs a SliderRoot ancestor`);
  }

  return { context, edges };
};

const decimalCount = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const text = value.toString();

  if (text.includes("e")) {
    const [mantissa = "", exponent = "0"] = text.split("e");
    const fraction = mantissa.split(".")[1] ?? "";

    return Math.max(0, fraction.length - Number(exponent));
  }

  return text.split(".")[1]?.length ?? 0;
};

const roundTo = (value: number, decimals: number) => {
  const factor = PERCENT_SCALE ** decimals;

  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const linearScale =
  (input: readonly [number, number], output: readonly [number, number]) =>
  (value: number) => {
    if (input[0] === input[1] || output[0] === output[1]) {
      return output[0];
    }

    const ratio = (output[1] - output[0]) / (input[1] - input[0]);

    return output[0] + ratio * (value - input[0]);
  };

const valueToPercent = (value: number, min: number, max: number) =>
  clamp((100 / (max - min)) * (value - min), 0, 100);

// Half the thumb size, moved with the percent, keeps the thumb inside the track.
const thumbInBoundsOffset = (
  width: number,
  percent: number,
  direction: 1 | -1
) => {
  const halfWidth = width / 2;
  const halfPercent = linearScale([0, 50], [0, halfWidth])(percent);

  return (halfWidth - halfPercent * direction) * direction;
};

const nextStepValue = (
  value: number,
  options: {
    min: number;
    step: number;
    direction: 1 | -1;
    multiplier: number;
  }
) => {
  const { min, step, direction, multiplier } = options;
  const decimals = decimalCount(step);
  const steps = (value - min) / step;
  const nearest = Math.round(steps);

  const onGrid =
    roundTo(nearest * step + min, decimals) === roundTo(value, decimals);

  let target = nearest + multiplier * direction;

  if (!onGrid) {
    target = direction > 0 ? Math.ceil(steps) : Math.floor(steps);
  }

  return roundTo(target * step + min, decimals);
};

const withValueAt = (values: readonly number[], value: number, index: number) =>
  values.with(index, value).toSorted((a, b) => a - b);

const hasMinimumGap = (values: readonly number[], gap: number) => {
  if (gap <= 0) {
    return true;
  }

  return values.every(
    (value, index) =>
      index === values.length - 1 || (values[index + 1] ?? value) - value >= gap
  );
};

const closestValueIndex = (values: readonly number[], target: number) => {
  if (values.length === 1) {
    return 0;
  }

  const distances = values.map((value) => Math.abs(value - target));

  return distances.indexOf(Math.min(...distances));
};

const fallbackLabel = (index: number, count: number) => {
  if (count > 2) {
    return `Value ${index + 1} of ${count}`;
  }

  return count === 2 ? ["Minimum", "Maximum"][index] : undefined;
};

// Thumbs in document order, which is also the order of their indices.
const orderedThumbs = (thumbs: ReadonlySet<HTMLElement>) =>
  [...thumbs].toSorted((a, b) =>
    a.compareDocumentPosition(b) === Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );

const edgesFor = (
  orientation: Orientation,
  direction: Direction,
  inverted: boolean
): EdgeContextValue => {
  if (orientation === "vertical") {
    const fromBottom = !inverted;

    return {
      direction: fromBottom ? 1 : -1,
      endEdge: fromBottom ? "top" : "bottom",
      size: "height",
      startEdge: fromBottom ? "bottom" : "top",
    };
  }

  const fromLeft = (direction === "ltr") !== inverted;

  return {
    direction: fromLeft ? 1 : -1,
    endEdge: fromLeft ? "right" : "left",
    size: "width",
    startEdge: fromLeft ? "left" : "right",
  };
};

const decrementKeysFor = (
  orientation: Orientation,
  edges: EdgeContextValue
) => {
  if (orientation === "vertical") {
    return DECREMENT_KEYS[
      edges.startEdge === "bottom" ? "from-bottom" : "from-top"
    ];
  }

  return DECREMENT_KEYS[
    edges.startEdge === "left" ? "from-left" : "from-right"
  ];
};

type SliderRootProps = Omit<
  ComponentProps<"span">,
  "defaultValue" | "dir" | "onChange" | "ref"
> & {
  defaultValue?: number[];
  dir?: Direction;
  disabled?: boolean;
  form?: string;
  inverted?: boolean;
  max?: number;
  min?: number;
  minStepsBetweenThumbs?: number;
  name?: string;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  orientation?: Orientation;
  step?: number;
  value?: number[];
};

function SliderRoot({
  className,
  defaultValue,
  dir,
  disabled = false,
  form,
  inverted = false,
  max = 100,
  min = 0,
  minStepsBetweenThumbs = 0,
  name,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onValueChange,
  onValueCommit,
  orientation = "horizontal",
  step = 1,
  value,
  ...props
}: SliderRootProps) {
  const contextDirection = useDirection();
  const direction: Direction = dir ?? contextDirection;
  const edges = edgesFor(orientation, direction, inverted);

  const [root, setRoot] = useState<HTMLSpanElement | null>(null);
  const thumbs = useRef(new Set<HTMLElement>());

  const registerThumb = useCallback((thumb: HTMLElement) => {
    thumbs.current.add(thumb);

    return () => {
      thumbs.current.delete(thumb);
    };
  }, []);

  const thumbIndex = useCallback(
    (thumb: HTMLElement) => orderedThumbs(thumbs.current).indexOf(thumb),
    []
  );

  const [internalValues, setInternalValues] = useState<readonly number[]>(
    defaultValue ?? [min]
  );

  const values = value ?? internalValues;
  const initialValues = useRef(values);
  const valuesAtPointerDown = useRef(values);
  const valueIndexToChange = useRef(0);
  const pointerRect = useRef<DOMRect | undefined>(undefined);

  const setActiveIndex = useCallback((index: number) => {
    valueIndexToChange.current = index;
  }, []);

  // The value change callback focuses the thumb that now holds the value.
  const setValues = (next: readonly number[]) => {
    if (String(next) === String(values)) {
      return;
    }

    if (value === undefined) {
      setInternalValues(next);
    }

    orderedThumbs(thumbs.current)[valueIndexToChange.current]?.focus({
      preventScroll: true,
    });
    onValueChange?.([...next]);
  };

  const resetToInitial = useEffectEvent(() => {
    setValues(initialValues.current);
  });

  useEffect(() => {
    const found =
      form === undefined
        ? root?.closest("form")
        : root?.ownerDocument.querySelector(`#${CSS.escape(form)}`);

    const formElement = found instanceof HTMLFormElement ? found : null;

    formElement?.addEventListener("reset", resetToInitial);

    return () => formElement?.removeEventListener("reset", resetToInitial);
  }, [root, form]);

  const updateValues = (rawValue: number, atIndex: number, commit: boolean) => {
    const decimals = decimalCount(step);

    const snapped = clamp(
      roundTo(Math.round((rawValue - min) / step) * step + min, decimals),
      min,
      max
    );

    const next = withValueAt(values, snapped, atIndex);

    if (!hasMinimumGap(next, minStepsBetweenThumbs * step)) {
      return;
    }

    valueIndexToChange.current = next.indexOf(snapped);

    if (String(next) === String(values)) {
      return;
    }

    if (commit) {
      onValueCommit?.(next);
    }

    setValues(next);
  };

  const valueFromPointer = (
    element: HTMLElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = pointerRect.current ?? element.getBoundingClientRect();

    pointerRect.current = rect;

    if (orientation === "vertical") {
      return linearScale(
        [0, rect.height],
        inverted ? [min, max] : [max, min]
      )(clientY - rect.top);
    }

    return linearScale(
      [0, rect.width],
      edges.startEdge === "left" ? [min, max] : [max, min]
    )(clientX - rect.left);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(event);

    // A handler on the thumb or the root that prevents the default cancels stepping.
    if (event.defaultPrevented) {
      return;
    }

    const { key } = event;

    if (key === KEY_HOME) {
      if (!disabled) {
        updateValues(min, 0, true);
      }

      event.preventDefault();

      return;
    }

    if (key === KEY_END) {
      if (!disabled) {
        updateValues(max, values.length - 1, true);
      }

      event.preventDefault();

      return;
    }

    if (!(PAGE_KEYS.has(key) || ARROW_KEYS.has(key))) {
      return;
    }

    if (!disabled) {
      const decrement = decrementKeysFor(orientation, edges).some(
        (candidate) => candidate === key
      );

      const multiplier =
        PAGE_KEYS.has(key) || (event.shiftKey && ARROW_KEYS.has(key))
          ? LARGE_STEP_MULTIPLIER
          : 1;

      const index = valueIndexToChange.current;

      updateValues(
        nextStepValue(values[index] ?? min, {
          direction: decrement ? -1 : 1,
          min,
          multiplier,
          step,
        }),
        index,
        true
      );
    }

    event.preventDefault();
  };

  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    onPointerDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!disabled) {
      valuesAtPointerDown.current = values;
    }

    const { target } = event;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.setPointerCapture(event.pointerId);
    event.preventDefault();

    if (thumbs.current.has(target)) {
      target.focus({ preventScroll: true });

      return;
    }

    if (!disabled) {
      const pointerValue = valueFromPointer(
        event.currentTarget,
        event.clientX,
        event.clientY
      );

      updateValues(
        pointerValue,
        closestValueIndex(values, pointerValue),
        false
      );
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    onPointerMove?.(event);

    if (
      event.defaultPrevented ||
      disabled ||
      !(event.target instanceof HTMLElement) ||
      !event.target.hasPointerCapture(event.pointerId)
    ) {
      return;
    }

    updateValues(
      valueFromPointer(event.currentTarget, event.clientX, event.clientY),
      valueIndexToChange.current,
      false
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    onPointerUp?.(event);

    const { target } = event;

    if (
      event.defaultPrevented ||
      !(target instanceof HTMLElement) ||
      !target.hasPointerCapture(event.pointerId)
    ) {
      return;
    }

    target.releasePointerCapture(event.pointerId);
    pointerRect.current = undefined;

    if (!disabled && String(values) !== String(valuesAtPointerDown.current)) {
      onValueCommit?.([...values]);
    }
  };

  const sliderContext = useMemo(
    () => ({
      disabled,
      form,
      max,
      min,
      name,
      orientation,
      registerThumb,
      setActiveIndex,
      thumbIndex,
      values,
    }),
    [
      disabled,
      form,
      max,
      min,
      name,
      orientation,
      registerThumb,
      setActiveIndex,
      thumbIndex,
      values,
    ]
  );

  return (
    <SliderContext value={sliderContext}>
      <EdgeContext value={edges}>
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Key and pointer events of the thumbs bubble up to the root, as in the Radix Slider. */}
        <span
          aria-disabled={disabled}
          className={cn(
            "relative flex w-full touch-none items-center pb-[6px] select-none [--slider-fill-color:var(--ck-palette-ink-secondary)] [--slider-rail-color:var(--ck-palette-border-heavy)] [--slider-thumb-color:var(--ck-palette-surface-surface)] data-[orientation=horizontal]:[--radix-slider-thumb-transform:translateX(-50%)] data-[orientation=vertical]:[--radix-slider-thumb-transform:translateY(50%)] dark:[--slider-fill-color:var(--ck-palette-ink-secondary)] dark:[--slider-rail-color:var(--ck-palette-border-heavy)] dark:[--slider-thumb-color:var(--ck-palette-surface-surface)]",
            className
          )}
          data-disabled={disabled ? "" : undefined}
          data-orientation={orientation}
          dir={orientation === "horizontal" ? direction : dir}
          {...props}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={setRoot}
        />
      </EdgeContext>
    </SliderContext>
  );
}

function SliderTrack({ className, ...props }: ComponentProps<"span">) {
  const { context } = useSliderContext("SliderTrack");

  return (
    <span
      className={cn(
        "relative h-[4px] w-full grow rounded-2xs bg-(--slider-rail-color)",
        className
      )}
      data-disabled={context.disabled ? "" : undefined}
      data-orientation={context.orientation}
      {...props}
    />
  );
}

function SliderRange({
  className,
  ...props
}: Omit<ComponentProps<"span">, "style">) {
  const { context, edges } = useSliderContext("SliderRange");

  const percentages = context.values.map((value) =>
    valueToPercent(value, context.min, context.max)
  );

  const offsetStart = context.values.length > 1 ? Math.min(...percentages) : 0;
  const offsetEnd = 100 - Math.max(...percentages);

  const rangeStyle: CustomStyle = {
    "--slider-range-end": `${offsetEnd}%`,
    "--slider-range-start": `${offsetStart}%`,
  };

  return (
    <span
      className={cn(
        "absolute h-full rounded-2xs bg-(--slider-fill-color)",
        RANGE_EDGE_CLASSES[edges.startEdge],
        className
      )}
      data-disabled={context.disabled ? "" : undefined}
      data-orientation={context.orientation}
      {...props}
      style={rangeStyle}
    />
  );
}

// Dispatches an input event when the value changes, so a form sees it.
function SliderBubbleInput({
  form,
  name,
  value,
}: {
  form: string | undefined;
  name: string | undefined;
  value: number | undefined;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const input = ref.current;

    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    );

    if (input && value !== undefined && previous.current !== value) {
      descriptor?.set?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    previous.current = value;
  }, [value]);

  return (
    <input defaultValue={value} form={form} name={name} ref={ref} hidden />
  );
}

// The index of a thumb is its place among the thumbs in the document.
function SliderThumb({
  "aria-label": ariaLabel,
  className,
  name,
  onFocus,
  ...props
}: Omit<ComponentProps<"span">, "ref" | "style"> & { name?: string }) {
  const { context, edges } = useSliderContext("SliderThumb");
  const [thumb, setThumb] = useState<HTMLSpanElement | null>(null);

  const [size, setSize] = useState<{ height: number; width: number } | null>(
    null
  );

  const index = thumb ? context.thumbIndex(thumb) : -1;

  const value = context.values[index];

  const percent =
    value === undefined ? 0 : valueToPercent(value, context.min, context.max);

  const offset = thumbInBoundsOffset(
    size?.[edges.size] ?? 0,
    percent,
    edges.direction
  );

  const inForm =
    !thumb || context.form !== undefined || !!thumb.closest("form");

  let inputName = name;

  if (inputName === undefined && context.name !== undefined) {
    inputName = context.name + (context.values.length > 1 ? "[]" : "");
  }

  // The thumb is known to the root as soon as it is attached, so every thumb
  // is in the set before any of them reads its index.
  // The size is measured now and again whenever the thumb is resized. The
  // callback is stable, so React attaches the thumb once.
  const { registerThumb } = context;

  const attachThumb = useCallback(
    (node: HTMLSpanElement) => {
      const unregister = registerThumb(node);

      const observer = new ResizeObserver((entries) => {
        const box = entries[0]?.borderBoxSize[0];

        if (box !== undefined) {
          setSize({ height: box.blockSize, width: box.inlineSize });
        }
      });

      setThumb(node);
      setSize({ height: node.offsetHeight, width: node.offsetWidth });
      observer.observe(node, { box: "border-box" });

      return () => {
        observer.disconnect();
        unregister();
      };
    },
    [registerThumb]
  );

  const positionStyle: CustomStyle = {
    "--slider-thumb-position": `calc(${percent}% + ${offset}px)`,
  };

  return (
    <>
      <span
        className={cn(
          "absolute transform-(--radix-slider-thumb-transform)",
          THUMB_EDGE_CLASSES[edges.startEdge]
        )}
        style={positionStyle}
      >
        <span
          aria-label={
            ariaLabel === undefined || ariaLabel === ""
              ? fallbackLabel(index, context.values.length)
              : ariaLabel
          }
          aria-orientation={context.orientation}
          aria-valuemax={context.max}
          aria-valuemin={context.min}
          aria-valuenow={value}
          className={cn(
            "relative block size-[14px] cursor-grab rounded-full bg-(--slider-thumb-color) shadow-[inset_0_0_0_2px_var(--slider-fill-color)] outline-none active:cursor-grabbing",
            value === undefined && "hidden",
            className
          )}
          data-disabled={context.disabled ? "" : undefined}
          data-orientation={context.orientation}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The thumb is a span with role slider, not an input.
          role="slider"
          tabIndex={context.disabled ? undefined : 0}
          {...props}
          onFocus={(event) => {
            onFocus?.(event);
            context.setActiveIndex(index);
          }}
          ref={attachThumb}
        />
      </span>
      {inForm ? (
        <SliderBubbleInput form={context.form} name={inputName} value={value} />
      ) : null}
    </>
  );
}

export { Slider, SliderRange, SliderRoot, SliderThumb, SliderTrack };
