"use client";

/* oxlint-disable anti-slop/no-runtime-typeof -- React refs are either callbacks or objects. */
import {
  DirectionProvider,
  useDirection,
} from "@base-ui/react/direction-provider";
import { cn } from "@workspace/react/lib/utils";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
  RefObject,
} from "react";

/*
 * The group, its roving focus and the form input are based on the Radix
 * RadioGroup (MIT). Base UI cannot provide them: it always
 * renders a hidden input, keeps a "touched" flag that outlives the key press,
 * and does not send Tab into the checked item.
 */

type RadioGroupDirection = "row" | "col";

type RadioGroupVariant = "default" | "list";

type Orientation = "vertical" | undefined;

type FocusIntent = "first" | "last" | "next" | "prev";

type TextDirection = "ltr" | "rtl";

type CustomProperties = CSSProperties & {
  [name: `--${string}`]: string | undefined;
};

interface RadioGroupContextValue {
  /** True while an arrow key is held: focus that arrives then also selects. */
  arrowKeyDown: RefObject<boolean>;
  currentTabStop: string | null;
  dir: TextDirection;
  disabled: boolean;
  form: string | undefined;
  group: HTMLDivElement | null;
  name: string | undefined;
  onFocusableItemAdd: () => void;
  onFocusableItemRemove: () => void;
  onItemFocus: (value: string) => void;
  onItemShiftTab: () => void;
  onValueChange: (value: string) => void;
  orientation: Orientation;
  required: boolean;
  value: string | null;
  variant: RadioGroupVariant;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

const useRadioGroupContext = () => {
  const context = use(RadioGroupContext);

  if (!context) {
    throw new Error("Place radio choices under a RadioGroup root");
  }

  return context;
};

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const FOCUS_INTENTS = new Map<string, FocusIntent>([
  ["ArrowDown", "next"],
  ["ArrowLeft", "prev"],
  ["ArrowRight", "next"],
  ["ArrowUp", "prev"],
  ["End", "last"],
  ["Home", "first"],
  ["PageDown", "last"],
  ["PageUp", "first"],
]);

/** Merges refs and keeps the cleanup functions callback refs may return. */
const mergeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (node: T | null) => {
    const cleanups: (() => void)[] = [];

    for (const ref of refs) {
      if (typeof ref === "function") {
        const cleanup = ref(node);

        if (typeof cleanup === "function") {
          cleanups.push(() => {
            cleanup();
          });
        } else {
          cleanups.push(() => {
            ref(null);
          });
        }
      } else if (ref) {
        ref.current = node;
        cleanups.push(() => {
          ref.current = null;
        });
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

/** Radix swaps Left and Right in a right-to-left group. */
const getFocusIntent = (
  key: string,
  orientation: Orientation,
  dir: TextDirection
): FocusIntent | undefined => {
  let directed = key;

  if (dir === "rtl" && key === "ArrowLeft") {
    directed = "ArrowRight";
  } else if (dir === "rtl" && key === "ArrowRight") {
    directed = "ArrowLeft";
  }

  if (
    orientation === "vertical" &&
    (directed === "ArrowLeft" || directed === "ArrowRight")
  ) {
    return undefined;
  }

  return FOCUS_INTENTS.get(directed);
};

const wrapArray = <T,>(items: T[], start: number) =>
  items.map((_, index) => items[(start + index) % items.length]);

/** Focuses the first candidate that takes focus. */
const focusFirst = (candidates: (HTMLElement | undefined)[]) => {
  const previous = document.activeElement;

  for (const candidate of candidates) {
    if (candidate === previous) {
      return;
    }

    candidate?.focus();

    if (candidate && document.activeElement !== previous) {
      return;
    }
  }
};

const enabledRadios = (group: HTMLElement | null) =>
  group
    ? [
        ...group.querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
      ].filter((radio) => !radio.disabled)
    : [];

const useControllableValue = <Value extends string>(
  prop: Value | null | undefined,
  defaultProp: Value | undefined,
  onChange: ((value: Value | null) => void) | undefined
) => {
  const [uncontrolled, setUncontrolled] = useState<Value | null>(
    defaultProp ?? null
  );

  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolled;
  const latest = useRef({ isControlled, onChange, value });

  useLayoutEffect(() => {
    latest.current = { isControlled, onChange, value };
  });

  const setValue = useCallback((next: Value | null) => {
    const { current } = latest;

    if (next === current.value) {
      return;
    }

    if (!current.isControlled) {
      setUncontrolled(next);
    }

    current.onChange?.(next);
  }, []);

  return [value, setValue] as const;
};

const rowGroupClasses = {
  col: "flex-col gap-2.5",
  row: "gap-5",
} as const;

interface RadioGroupProps<Value extends string = string> extends Omit<
  ComponentProps<"div">,
  "className" | "defaultValue" | "dir" | "onChange" | "role"
> {
  className?: string;
  /** Marks the group as an embedded widget (`data-ck-w-component`). */
  __isWidget?: boolean;
  defaultValue?: Value;
  /** Layout of the items. A `list` variant is always a column. */
  direction?: RadioGroupDirection;
  /** Reading direction. Falls back to the surrounding DirectionProvider. */
  dir?: TextDirection;
  disabled?: boolean;
  /** Id of the form the hidden inputs belong to. */
  form?: string;
  name?: string;
  /** Called with the new value when the user selects an item. */
  /** Receives null when a form reset clears an initially empty group. */
  onChange?: (value: Value | null) => void;
  required?: boolean;
  /** Controlled value; null is controlled with nothing selected. */
  value?: Value | null;
  variant?: RadioGroupVariant;
}

function RadioGroup<Value extends string = string>({
  __isWidget,
  children,
  className,
  defaultValue,
  dir,
  direction = "row",
  disabled = false,
  form,
  name,
  onBlur,
  onChange,
  onFocus,
  onMouseDown,
  ref,
  required = false,
  value: valueProp,
  variant = "default",
  ...props
}: RadioGroupProps<Value>) {
  const inherited = useDirection();
  const resolvedDir = dir ?? inherited;
  const orientation: Orientation = variant === "list" ? "vertical" : undefined;

  const arrowKeyDown = useRef(false);
  const mouseDown = useRef(false);
  const [group, setGroup] = useState<HTMLDivElement | null>(null);
  const [currentTabStop, setCurrentTabStop] = useState<string | null>(null);
  const [isShiftTabbing, setIsShiftTabbing] = useState(false);
  const [focusableCount, setFocusableCount] = useState(0);

  const [value, setValue] = useControllableValue<Value>(
    valueProp,
    defaultValue,
    onChange
  );

  // oxlint-disable-next-line react/hook-use-state -- only the first value is kept; reset restores it.
  const [initialValue] = useState(value);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (ARROW_KEYS.has(event.key)) {
        arrowKeyDown.current = true;
      }
    };

    const onKeyUp = () => {
      arrowKeyDown.current = false;
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const element =
      form === undefined
        ? group?.closest("form")
        : // oxlint-disable-next-line unicorn/prefer-query-selector -- the form id is an arbitrary string, not a selector.
          group?.ownerDocument.getElementById(form);

    if (!(element instanceof HTMLFormElement)) {
      // oxlint-disable-next-line unicorn/no-useless-undefined
      return undefined;
    }

    const reset = () => {
      setValue(initialValue);
    };

    element.addEventListener("reset", reset);

    return () => {
      element.removeEventListener("reset", reset);
    };
  }, [group, form, initialValue, setValue]);

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      arrowKeyDown,
      currentTabStop,
      dir: resolvedDir,
      disabled,
      form,
      group,
      name,
      onFocusableItemAdd: () => {
        setFocusableCount((count) => count + 1);
      },
      onFocusableItemRemove: () => {
        setFocusableCount((count) => count - 1);
      },
      onItemFocus: setCurrentTabStop,
      onItemShiftTab: () => {
        setIsShiftTabbing(true);
      },
      onValueChange: (next) => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: items report the string values the consumer rendered for this group.
        setValue(next as Value);
      },
      orientation,
      required,
      value,
      variant,
    }),
    [
      currentTabStop,
      disabled,
      form,
      group,
      name,
      orientation,
      required,
      resolvedDir,
      setValue,
      value,
      variant,
    ]
  );

  const mergedRef = useMemo(
    () => mergeRefs<HTMLDivElement>(ref, setGroup),
    [ref]
  );

  return (
    <RadioGroupContext value={context}>
      <DirectionProvider direction={resolvedDir}>
        <div
          aria-orientation={orientation}
          aria-required={required}
          className={cn(
            "flex outline-none",
            variant === "list" ? "flex-col gap-0" : rowGroupClasses[direction],
            className
          )}
          data-direction={direction}
          data-disabled={disabled ? "" : undefined}
          data-orientation={orientation}
          data-variant={variant}
          data-ck-w-component={__isWidget === true ? "radio-group" : undefined}
          dir={resolvedDir}
          role="radiogroup"
          tabIndex={isShiftTabbing || focusableCount === 0 ? -1 : 0}
          {...props}
          onBlur={(event) => {
            onBlur?.(event);

            if (!event.defaultPrevented) {
              setIsShiftTabbing(false);
            }
          }}
          onFocus={(event) => {
            onFocus?.(event);

            if (event.defaultPrevented) {
              return;
            }

            if (
              event.target === event.currentTarget &&
              !mouseDown.current &&
              !isShiftTabbing
            ) {
              // Tab landed on the group itself. Hand focus to the checked
              // item, else the last focused one, else the first.
              const radios = enabledRadios(event.currentTarget);

              focusFirst([
                radios.find(
                  (radio) => radio.getAttribute("aria-checked") === "true"
                ),
                radios.find((radio) => radio.value === currentTabStop),
                ...radios,
              ]);
            }

            mouseDown.current = false;
          }}
          onMouseDown={(event) => {
            onMouseDown?.(event);

            if (!event.defaultPrevented) {
              mouseDown.current = true;
            }
          }}
          ref={mergedRef}
        >
          {children}
        </div>
      </DirectionProvider>
    </RadioGroupContext>
  );
}

const optionWrapperClasses = cn(
  "flex",
  "data-[variant=list]:relative data-[variant=list]:min-w-0",
  "[[data-variant=list]+&[data-variant=list]]:pt-px",
  "[[data-variant=list]+&[data-variant=list]]:before:absolute",
  "[[data-variant=list]+&[data-variant=list]]:before:inset-s-13",
  "[[data-variant=list]+&[data-variant=list]]:before:inset-e-4",
  "[[data-variant=list]+&[data-variant=list]]:before:top-0",
  "[[data-variant=list]+&[data-variant=list]]:before:h-px",
  "[[data-variant=list]+&[data-variant=list]]:before:bg-border",
  "[[data-variant=list]+&[data-variant=list]]:before:content-['']"
);

const labelClasses = cn(
  "inline-flex flex-row items-start gap-1.5 text-[0.875rem] leading-[1.25rem]",
  "cursor-(--ck-action-cursor,default)",
  "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  "data-block:w-full",
  "data-[variant=list]:w-full data-[variant=list]:min-w-0",
  "data-[variant=list]:items-center data-[variant=list]:gap-4",
  "data-[variant=list]:py-4 data-[variant=list]:ps-4 data-[variant=list]:pe-5"
);

const indicatorWrapperClasses = cn(
  "relative flex h-lh shrink-0 items-center justify-center",
  // The CSS pins the form input to the bottom edge of the control
  // so validation bubbles point at it.
  "[&>input]:right-0 [&>input]:bottom-0 [&>input]:left-0",
  "[&>input]:h-px! [&>input]:transform-none!"
);

const bubbleInputClasses = cn(
  "pointer-events-none absolute m-0 h-(--radio-control-height) w-(--radio-control-width) opacity-0",
  "[transform:translateX(-100%)]"
);

const itemClasses = cn(
  "relative flex shrink-0 items-center justify-center rounded-full border-none bg-transparent p-0",
  "size-4 group-data-[variant=list]/radio:size-5",
  "cursor-(--ck-action-cursor,default) data-disabled:cursor-not-allowed",
  "[box-shadow:inset_0_0_0_1px_var(--ck-palette-border-heavy)]",
  "transition-[box-shadow] duration-(--motion-duration-fast) ease-[ease]",
  "not-data-disabled:hover:[box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--ck-palette-ink)_25%,transparent)]",
  "focus:outline-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
);

const indicatorClasses = cn(
  "relative inline-grid size-full items-center justify-center",
  "before:col-start-1 before:row-start-1 before:block before:place-self-center before:will-change-transform before:content-['']",
  "after:col-start-1 after:row-start-1 after:block after:place-self-center after:will-change-transform after:content-['']",
  "before:size-4 group-data-[variant=list]/radio:before:size-5",
  "before:rounded-full before:bg-fill-primary-solid",
  "before:animate-in before:ease-enter before:[--tw-duration:600ms] before:fade-in",
  "after:size-1.5 after:rounded-full after:bg-text-strong-solid",
  "after:animate-in after:ease-enter after:[--tw-duration:600ms] after:zoom-in"
);

/** A double click on the label must not select its text. */
const preventDoubleClickSelection = (
  event: ReactMouseEvent<HTMLLabelElement>
) => {
  if (!event.defaultPrevented && event.detail > 1) {
    event.preventDefault();
  }
};

/** Tracks the border-box size of an element. */
const useSize = (element: HTMLElement | null) => {
  const [size, setSize] = useState<{ height: number; width: number }>();

  useLayoutEffect(() => {
    if (!element) {
      // oxlint-disable-next-line unicorn/no-useless-undefined
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.borderBoxSize?.[0];

      setSize({
        height: box?.blockSize ?? element.offsetHeight,
        width: box?.inlineSize ?? element.offsetWidth,
      });
    });

    observer.observe(element, { box: "border-box" });

    return () => {
      observer.unobserve(element);
    };
  }, [element]);

  return size;
};

interface BubbleInputProps {
  checked: boolean;
  consumerStoppedPropagation: RefObject<boolean>;
  control: HTMLButtonElement | null;
  disabled: boolean;
  element: HTMLInputElement | null;
  form: string | undefined;
  name: string | undefined;
  onElement: (element: HTMLInputElement | null) => void;
  required: boolean;
  userInteractionCount: number;
  value: string;
}

/**
 * The hidden radio Radix renders inside a form. Setting `checked` and
 * dispatching a `click` lets form-level listeners see the change.
 */
function BubbleInput({
  checked,
  consumerStoppedPropagation,
  control,
  disabled,
  element,
  form,
  name,
  onElement,
  required,
  userInteractionCount,
  value,
}: BubbleInputProps) {
  const size = useSize(control);
  const dispatching = useRef(false);
  const previousChecked = useRef(checked);
  const previousCount = useRef(userInteractionCount);
  // oxlint-disable-next-line react/hook-use-state -- only the first value is kept as the input's default.
  const [initialChecked] = useState(checked);

  useEffect(() => {
    if (!element) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "checked"
    );

    const fromUser = userInteractionCount !== previousCount.current;
    const changed = previousChecked.current !== checked;

    previousCount.current = userInteractionCount;
    previousChecked.current = checked;

    if (changed && descriptor?.set) {
      dispatching.current = !fromUser;
      descriptor.set.call(element, checked);
      element.dispatchEvent(
        new Event("click", {
          bubbles: !(fromUser && consumerStoppedPropagation.current),
        })
      );
      dispatching.current = false;
    }
  }, [element, checked, consumerStoppedPropagation, userInteractionCount]);

  const controlSize: CustomProperties = {
    "--radio-control-height": size ? `${size.height}px` : undefined,
    "--radio-control-width": size ? `${size.width}px` : undefined,
  };

  return (
    <input
      aria-hidden
      className={bubbleInputClasses}
      defaultChecked={initialChecked}
      disabled={disabled}
      form={form}
      name={name}
      onClick={(event) => {
        if (dispatching.current) {
          event.stopPropagation();
        }
      }}
      ref={onElement}
      required={required}
      style={controlSize}
      tabIndex={-1}
      type="radio"
      value={value}
    />
  );
}

interface RadioGroupItemProps extends Omit<
  ComponentProps<"div">,
  "children" | "id"
> {
  /** Makes the label fill the available width. */
  block?: boolean;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  value: string;
}

function RadioGroupItem({
  block = false,
  children,
  className,
  disabled = false,
  id,
  required,
  value,
  ...props
}: RadioGroupItemProps) {
  const context = useRadioGroupContext();
  const { onFocusableItemAdd, onFocusableItemRemove, variant } = context;
  const isDisabled = context.disabled || disabled;
  const checked = context.value === value;
  const generatedId = useId();
  const itemId = id ?? `${value}-${generatedId}`;

  const [control, setControl] = useState<HTMLButtonElement | null>(null);
  const [bubbleInput, setBubbleInput] = useState<HTMLInputElement | null>(null);
  const [userInteractionCount, setUserInteractionCount] = useState(0);
  const consumerStoppedPropagation = useRef(false);

  const isFormControl =
    !control || context.form !== undefined || control.closest("form") !== null;

  useLayoutEffect(() => {
    if (isDisabled) {
      // oxlint-disable-next-line unicorn/no-useless-undefined
      return undefined;
    }

    onFocusableItemAdd();

    return () => {
      onFocusableItemRemove();
    };
  }, [isDisabled, onFocusableItemAdd, onFocusableItemRemove]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    // A radio activates with Space only.
    if (event.key === "Enter") {
      event.preventDefault();
    }

    if (event.key === "Tab" && event.shiftKey) {
      context.onItemShiftTab();

      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    const intent = getFocusIntent(event.key, context.orientation, context.dir);

    if (
      intent === undefined ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();

    let candidates = enabledRadios(context.group);

    if (intent === "last") {
      candidates.reverse();
    } else if (intent === "prev" || intent === "next") {
      if (intent === "prev") {
        candidates.reverse();
      }

      // Radix groups loop.
      candidates = wrapArray(
        candidates,
        candidates.indexOf(event.currentTarget) + 1
      );
    }

    setTimeout(() => {
      focusFirst(candidates);
    }, 0);
  };

  return (
    <div className={optionWrapperClasses} data-variant={variant} {...props}>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the label swallows double-click mousedown. */}
      <label
        className={cn("group/radio", labelClasses, className)}
        data-block={block ? "" : undefined}
        data-disabled={isDisabled ? "" : undefined}
        data-variant={variant}
        htmlFor={itemId}
        onMouseDown={preventDoubleClickSelection}
      >
        <div className={indicatorWrapperClasses}>
          <button
            aria-checked={checked}
            className={itemClasses}
            data-disabled={isDisabled ? "" : undefined}
            data-orientation={context.orientation}
            data-state={checked ? "checked" : "unchecked"}
            disabled={isDisabled}
            id={itemId}
            onClick={(event) => {
              if (!checked) {
                setUserInteractionCount((count) => count + 1);
                context.onValueChange(value);
              }

              if (bubbleInput && isFormControl) {
                consumerStoppedPropagation.current =
                  event.isPropagationStopped();

                if (!consumerStoppedPropagation.current) {
                  event.stopPropagation();
                }
              }
            }}
            onFocus={(event) => {
              context.onItemFocus(value);

              // Focus that arrives while an arrow key is down selects.
              if (context.arrowKeyDown.current) {
                event.currentTarget.click();
              }
            }}
            onKeyDown={onKeyDown}
            onMouseDown={(event) => {
              if (isDisabled) {
                event.preventDefault();
              } else {
                context.onItemFocus(value);
              }
            }}
            ref={setControl}
            // Radix put `required` on the button as a bare attribute and never
            // read it, so only the group's `required` reaches the hidden input.
            {...{ required }}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Radix renders a button with role radio.
            role="radio"
            tabIndex={context.currentTabStop === value ? 0 : -1}
            type="button"
            value={value}
          >
            {checked ? (
              <span
                className={indicatorClasses}
                data-disabled={isDisabled ? "" : undefined}
                data-state="checked"
              />
            ) : null}
          </button>
          {isFormControl ? (
            <BubbleInput
              checked={checked}
              consumerStoppedPropagation={consumerStoppedPropagation}
              control={control}
              disabled={isDisabled}
              element={bubbleInput}
              form={context.form}
              name={context.name}
              onElement={setBubbleInput}
              required={context.required}
              userInteractionCount={userInteractionCount}
              value={value}
            />
          ) : null}
        </div>
        {children}
      </label>
    </div>
  );
}

export { RadioGroup, RadioGroupItem };

export type { RadioGroupItemProps, RadioGroupProps };
