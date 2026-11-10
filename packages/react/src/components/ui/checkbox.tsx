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
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
} from "react";

type CheckedState = boolean | "indeterminate";

const isIndeterminate = (checked: CheckedState) => checked === "indeterminate";

const getState = (checked: CheckedState) => {
  if (isIndeterminate(checked)) {
    return "indeterminate";
  }

  return checked ? "checked" : "unchecked";
};

const nextChecked = (checked: CheckedState) =>
  isIndeterminate(checked) ? true : !checked;

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

interface CheckboxContextValue {
  checked: CheckedState;
  control: HTMLButtonElement | null;
  defaultChecked: boolean | undefined;
  disabled: boolean | undefined;
  form: string | undefined;
  hasConsumerStoppedPropagationRef: { current: boolean };
  name: string | undefined;
  required: boolean | undefined;
  userInteractionCount: number;
  value: string;
}

const CheckboxContext = createContext<CheckboxContextValue | null>(null);

const useCheckboxContext = (part: string) => {
  const context = useContext(CheckboxContext);

  if (context === null) {
    throw new Error(`${part} needs a CheckboxRoot ancestor`);
  }

  return context;
};

function useControllableChecked({
  defaultProp,
  onChange,
  prop,
}: {
  defaultProp: CheckedState;
  onChange: ((checked: CheckedState) => void) | undefined;
  prop: CheckedState | undefined;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultProp);
  const onChangeRef = useRef(onChange);
  const previous = useRef(uncontrolled);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (previous.current !== uncontrolled) {
      onChangeRef.current?.(uncontrolled);
      previous.current = uncontrolled;
    }
  }, [uncontrolled]);

  const set = useCallback(
    (next: CheckedState) => {
      if (prop === undefined) {
        setUncontrolled(next);
      } else if (next !== prop) {
        onChangeRef.current?.(next);
      }
    },
    [prop]
  );

  const toggle = useCallback(() => {
    if (prop === undefined) {
      setUncontrolled(nextChecked);
    } else {
      set(nextChecked(prop));
    }
  }, [prop, set]);

  return { checked: prop ?? uncontrolled, set, toggle };
}

function CheckboxBubbleInput() {
  const {
    checked,
    control,
    defaultChecked,
    disabled,
    form,
    hasConsumerStoppedPropagationRef,
    name,
    required,
    userInteractionCount,
    value,
  } = useCheckboxContext("CheckboxBubbleInput");

  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreClickRef = useRef(false);
  const previousChecked = useRef(checked);
  const previousInteractionCount = useRef(userInteractionCount);
  // oxlint-disable-next-line react/hook-use-state -- Only the first value is read.
  const [initialChecked] = useState(() => !isIndeterminate(checked) && checked);

  // Mirror the control's width onto the input. The observer reports the first
  // size as soon as it starts observing.
  useLayoutEffect(() => {
    const input = inputRef.current;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize[0];

      if (input !== null && box !== undefined) {
        input.style.setProperty("--checkbox-width", `${box.inlineSize}px`);
      }
    });

    if (control !== null) {
      observer.observe(control, { box: "border-box" });
    }

    return () => {
      observer.disconnect();
    };
  }, [control]);

  useEffect(() => {
    const input = inputRef.current;

    if (input === null) {
      return;
    }

    const interacted =
      userInteractionCount !== previousInteractionCount.current;

    previousInteractionCount.current = userInteractionCount;

    const changed = previousChecked.current !== checked;

    previousChecked.current = checked;

    // Setting `checked` through the prototype setter keeps React's own value
    // tracker from swallowing the click event dispatched below.
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "checked"
    );

    if (changed && descriptor?.set !== undefined) {
      ignoreClickRef.current = !interacted;
      input.indeterminate = isIndeterminate(checked);
      descriptor.set.call(input, !isIndeterminate(checked) && checked);
      input.dispatchEvent(
        new Event("click", {
          bubbles: !(interacted && hasConsumerStoppedPropagationRef.current),
        })
      );
      ignoreClickRef.current = false;
    }
  }, [checked, hasConsumerStoppedPropagationRef, userInteractionCount]);

  return (
    <input
      aria-hidden
      className="pointer-events-none absolute m-0 w-(--checkbox-width) -translate-x-full opacity-0"
      defaultChecked={defaultChecked ?? initialChecked}
      disabled={disabled}
      form={form}
      name={name}
      onClick={(event) => {
        if (ignoreClickRef.current) {
          event.stopPropagation();
        }
      }}
      ref={inputRef}
      required={required}
      tabIndex={-1}
      type="checkbox"
      value={value}
    />
  );
}

interface CheckboxRootProps extends Omit<
  ComponentProps<"button">,
  "defaultChecked" | "form" | "onChange" | "value"
> {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  form?: string;
  name?: string;
  onCheckedChange?: (checked: CheckedState) => void;
  required?: boolean;
  value?: string;
}

function CheckboxRoot({
  checked: checkedProp,
  children,
  defaultChecked,
  disabled,
  form,
  name,
  onCheckedChange,
  onClick,
  onKeyDown,
  ref,
  required,
  value = "on",
  ...props
}: CheckboxRootProps) {
  const { checked, set, toggle } = useControllableChecked({
    defaultProp: defaultChecked ?? false,
    onChange: onCheckedChange,
    prop: checkedProp,
  });

  const [control, setControl] = useState<HTMLButtonElement | null>(null);
  const hasConsumerStoppedPropagationRef = useRef(false);
  // oxlint-disable-next-line react/hook-use-state -- Only the first value is read.
  const [initialChecked] = useState(checked);

  const [userInteractionCount, onUserInteraction] = useReducer(
    (count: number) => count + 1,
    0
  );

  // The bubble input renders until the control mounts, then only inside a form.
  const isFormControl =
    control === null || form !== undefined || control.closest("form") !== null;

  const bubbleDefaultChecked =
    defaultChecked === "indeterminate" ? false : defaultChecked;

  useEffect(() => {
    const owner = control?.form ?? null;

    const onReset = () => {
      set(initialChecked);
    };

    owner?.addEventListener("reset", onReset);

    return () => {
      owner?.removeEventListener("reset", onReset);
    };
  }, [control, initialChecked, set]);

  const composedRef = useMemo(() => mergeRefs(setControl, ref), [ref]);

  const context = useMemo<CheckboxContextValue>(
    () => ({
      checked,
      control,
      defaultChecked: bubbleDefaultChecked,
      disabled,
      form,
      hasConsumerStoppedPropagationRef,
      name,
      required,
      userInteractionCount,
      value,
    }),
    [
      bubbleDefaultChecked,
      checked,
      control,
      disabled,
      form,
      hasConsumerStoppedPropagationRef,
      name,
      required,
      userInteractionCount,
      value,
    ]
  );

  return (
    <CheckboxContext value={context}>
      <button
        aria-checked={isIndeterminate(checked) ? "mixed" : checked}
        aria-required={required}
        data-disabled={disabled === true ? "" : undefined}
        data-state={getState(checked)}
        disabled={disabled}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The checkbox renders <button role="checkbox">.
        role="checkbox"
        type="button"
        value={value}
        {...props}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          // The consumer handler runs first and may cancel the built-in one.
          onClick?.(event);

          if (event.defaultPrevented) {
            return;
          }

          onUserInteraction();
          toggle();

          if (isFormControl) {
            hasConsumerStoppedPropagationRef.current =
              event.isPropagationStopped();

            if (!hasConsumerStoppedPropagationRef.current) {
              event.stopPropagation();
            }
          }
        }}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          onKeyDown?.(event);

          // Enter is cancelled so only Space toggles.
          if (!event.defaultPrevented && event.key === "Enter") {
            event.preventDefault();
          }
        }}
        ref={composedRef}
      >
        {children}
      </button>
      {isFormControl ? <CheckboxBubbleInput /> : null}
    </CheckboxContext>
  );
}

interface CheckboxIndicatorProps extends ComponentProps<"span"> {
  forceMount?: boolean;
}

function CheckboxIndicator({
  className,
  forceMount,
  ...props
}: CheckboxIndicatorProps) {
  const { checked, disabled } = useCheckboxContext("CheckboxIndicator");

  if (forceMount !== true && checked === false) {
    return null;
  }

  return (
    <span
      className={cn("pointer-events-none", className)}
      data-disabled={disabled === true ? "" : undefined}
      data-state={getState(checked)}
      {...props}
    />
  );
}

// The colors the box uses, from the gray scale. Each is a light-dark pair, so it resolves at the nearest
// theme scope (the scopes set color-scheme) at any nesting depth.
const boxColors = [
  // --gray-200 / --gray-500
  "[--checkbox-border:var(--ck-palette-border-heavy)]",
  // --gray-300 / --gray-600
  "[--checkbox-border-hover:color-mix(in_oklab,var(--ck-palette-ink)_55%,transparent)]",
  // --gray-900
  "[--checkbox-fill:var(--color-fill-primary-solid)]",
  // --gray-0
  "[--checkbox-mark:var(--ck-palette-surface-surface)]",
  // Disabled unchecked: --gray-150 / --gray-300 border, --gray-25 / --gray-200 fill.
  "[--checkbox-off-border:var(--ck-palette-border)]",
  "[--checkbox-off-fill:var(--ck-palette-surface-surface)]",
  // Disabled checked: --gray-300 / --gray-500 border and fill.
  "[--checkbox-off-on:var(--ck-palette-ink-tertiary)]",
  // Disabled mark: --gray-0 in light, --gray-100 in dark.
  "[--checkbox-off-mark:var(--ck-palette-surface-surface)]",
];

const boxClass = cn(
  boxColors,
  "relative inline-flex size-[18px] max-w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-xs border border-(--checkbox-border) bg-transparent p-0 [transition:border-color_.15s,background-color_.15s]",
  // Hover with a fine pointer, only while unchecked and enabled.
  "[@media(hover:hover)_and_(pointer:fine)]:not-data-disabled:data-[state=unchecked]:hover:border-(--checkbox-border-hover)",
  "not-data-disabled:[&:is([data-state=checked],[data-state=indeterminate])]:border-(--checkbox-fill) not-data-disabled:[&:is([data-state=checked],[data-state=indeterminate])]:bg-(--checkbox-fill)",
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
  "data-disabled:cursor-not-allowed data-disabled:not-data-[state=checked]:border-(--checkbox-off-border) data-disabled:not-data-[state=checked]:bg-(--checkbox-off-fill)",
  "data-disabled:data-[state=checked]:border-(--checkbox-off-on) data-disabled:data-[state=checked]:bg-(--checkbox-off-on)",
  "[[data-ck-has-label]_&]:top-px"
);

const strokeClass =
  "before:absolute before:block before:bg-(--checkbox-mark) before:will-change-transform before:content-[''] after:absolute after:block after:bg-(--checkbox-mark) after:will-change-transform after:content-['']";

const markClass = cn(
  "checkbox-mark",
  strokeClass,
  "absolute top-0 left-0 h-[32%] w-[64%] origin-center [transform:rotate(-45deg)_translate(-10%,100%)] [transition:opacity_.15s,transform_.15s] data-[state=indeterminate]:[transform:translate(30%,80%)] starting:opacity-0",
  // Vertical stroke.
  "before:top-0 before:bottom-0 before:left-0 before:w-[2px] before:origin-top-left before:[transition:transform_.1s_80ms,opacity_.2s] data-[state=indeterminate]:before:opacity-0 before:starting:[transform:scale(0)]",
  // Horizontal stroke.
  "after:right-0 after:bottom-0 after:left-0 after:h-[2px] after:origin-bottom-left after:[transition:transform_.1s_.16s] after:starting:[transform:scale(0)]",
  "data-disabled:before:bg-(--checkbox-off-mark) data-disabled:after:bg-(--checkbox-off-mark)"
);

const labelClass =
  "flex min-h-[20px] cursor-pointer items-center text-[14px] leading-[20px] group-data-[disabled]/checkbox:cursor-not-allowed group-data-[orientation=left]/checkbox:pl-[8px] group-data-[orientation=right]/checkbox:pr-[8px]";

interface CheckboxProps extends Omit<
  CheckboxRootProps,
  "children" | "className"
> {
  className?: string;
  label?: ReactNode;
  labelClassName?: string;
  orientation?: "left" | "right";
}

function Checkbox({
  className,
  disabled,
  id,
  label,
  labelClassName,
  orientation = "left",
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hasLabel = label !== undefined && label !== null && label !== "";

  return (
    <div
      className={cn(
        "group/checkbox relative flex data-[has-label]:items-start data-[orientation=right]:flex-row-reverse [&>input]:right-0 [&>input]:bottom-0 [&>input]:left-0 [&>input]:h-px! [&>input]:translate-none! [&>input]:transform-none!",
        className
      )}
      data-disabled={disabled === true ? "" : undefined}
      data-ck-has-label={hasLabel ? "" : undefined}
      data-orientation={orientation}
    >
      <CheckboxRoot
        className={boxClass}
        disabled={disabled}
        id={controlId}
        {...props}
      >
        <CheckboxIndicator className={markClass} />
      </CheckboxRoot>
      {hasLabel ? (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- The label guards double-click text selection on mousedown.
        <label
          className={cn(labelClass, labelClassName)}
          htmlFor={controlId}
          onMouseDown={(event) => {
            if (!event.defaultPrevented && event.detail > 1) {
              event.preventDefault();
            }
          }}
        >
          {label}
        </label>
      ) : null}
    </div>
  );
}

export { Checkbox, CheckboxIndicator, CheckboxRoot };

export type { CheckboxProps, CheckboxRootProps, CheckedState };
