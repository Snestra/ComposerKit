"use client";

import { cn } from "@workspace/react/lib/utils";
import { CircleX as LucideCircleX } from "lucide-react";
/* oxlint-disable anti-slop/no-runtime-typeof -- Refs are callbacks or objects. */
/* oxlint-disable unicorn/prefer-number-coercion -- The component reads CSS pixel strings with parseFloat; Number would give NaN. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions -- The tag is a div with role group that takes arrow and delete keys. */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AnimationEvent,
  ComponentProps,
  ComponentType,
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
} from "react";

import "./text-field-autofill.css";

type RefCleanup = () => void;

// A cleanup-aware ref merge. React 19 callback refs may return a cleanup:
// it is kept, and a ref that returns none is called with null instead. The
// merged ref returns one cleanup, so React never calls it with null.
const isCleanup = (value: unknown): value is RefCleanup =>
  typeof value === "function";

const assignRef = <T,>(
  ref: Ref<T> | undefined,
  value: T | null
): RefCleanup | undefined => {
  if (typeof ref === "function") {
    const result: unknown = ref(value);

    return isCleanup(result) ? result : undefined;
  }

  if (ref !== null && ref !== undefined) {
    ref.current = value;
  }

  return undefined;
};

const mergeRefs =
  <T,>(...refs: (Ref<T> | undefined)[]) =>
  (node: T | null): RefCleanup | undefined => {
    if (node === null) {
      for (const ref of refs) {
        assignRef(ref, null);
      }

      return undefined;
    }

    const cleanups = refs.map((ref): RefCleanup => {
      const cleanup = assignRef(ref, node);

      return (
        cleanup ??
        (() => {
          assignRef(ref, null);
        })
      );
    });

    if (cleanups.length === 0) {
      return undefined;
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

// The merged ref is memoized on the consumer ref, so a consumer ref is not
// called again on every render.
const useMergedRef = <T,>(
  first: Ref<T> | undefined,
  second: Ref<T> | undefined
) => useMemo(() => mergeRefs(first, second), [first, second]);

type ControlSize =
  | "3xs"
  | "2xs"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl";

type GutterSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl";

type FieldVariant = "outline" | "soft";

// Control sizes, fonts, radii and gutters are the Electron values of the
// --ck-control-* tokens. The text
// sizes and radii come from the library theme, the same tokens the component reads.
const inputSizeClass: Record<ControlSize, string> = {
  "3xs":
    "[--ck-field-size:1.375rem] [--ck-field-font-size:var(--text-xs)] [--ck-field-radius:var(--radius-sm)] [--ck-field-gutter:.5rem] [--ck-field-gap:4px] [--ck-field-adornment-offset:-1px]",
  "2xs":
    "[--ck-field-size:1.5rem] [--ck-field-font-size:var(--text-xs)] [--ck-field-radius:var(--radius-sm)] [--ck-field-gutter:.5rem] [--ck-field-gap:4px] [--ck-field-adornment-offset:-1px]",
  xs: "[--ck-field-size:1.625rem] [--ck-field-font-size:var(--text-sm)] [--ck-field-radius:var(--radius-sm)] [--ck-field-gutter:.5rem] [--ck-field-gap:6px] [--ck-field-adornment-offset:-1px]",
  sm: "[--ck-field-size:1.75rem] [--ck-field-font-size:var(--text-sm)] [--ck-field-radius:var(--radius-md)] [--ck-field-gutter:.625rem] [--ck-field-gap:8px] [--ck-field-adornment-offset:-1px]",
  md: "[--ck-field-size:2rem] [--ck-field-font-size:var(--text-sm)] [--ck-field-radius:var(--radius-md)] [--ck-field-gutter:.75rem] [--ck-field-gap:8px]",
  lg: "[--ck-field-size:2.25rem] [--ck-field-font-size:var(--text-sm)] [--ck-field-radius:var(--radius-md)] [--ck-field-gutter:.75rem] [--ck-field-gap:8px]",
  xl: "[--ck-field-size:2.5rem] [--ck-field-font-size:var(--text-base)] [--ck-field-radius:var(--radius-lg)] [--ck-field-gutter:.875rem] [--ck-field-gap:10px]",
  "2xl":
    "[--ck-field-size:2.75rem] [--ck-field-font-size:var(--text-base)] [--ck-field-radius:var(--radius-xl)] [--ck-field-gutter:1rem] [--ck-field-gap:10px] [--ck-field-adornment-offset:-4px]",
  "3xl":
    "[--ck-field-size:3rem] [--ck-field-font-size:var(--text-base)] [--ck-field-radius:var(--radius-xl)] [--ck-field-gutter:1rem] [--ck-field-gap:10px] [--ck-field-adornment-offset:-4px]",
};

const inputGutterClass: Record<GutterSize, string> = {
  "2xs": "[--ck-field-gutter:.375rem] [--ck-field-adornment-offset:-1px]",
  xs: "[--ck-field-gutter:.5rem] [--ck-field-adornment-offset:-1px]",
  sm: "[--ck-field-gutter:.625rem] [--ck-field-adornment-offset:-2px]",
  md: "[--ck-field-gutter:.75rem] [--ck-field-adornment-offset:-2px]",
  lg: "[--ck-field-gutter:.875rem] [--ck-field-adornment-offset:-2px]",
  xl: "[--ck-field-gutter:1rem] [--ck-field-adornment-offset:-4px]",
};

const textareaSizeClass: Record<ControlSize, string> = {
  "3xs":
    "[--ck-multiline-base-height:1.375rem] [--ck-multiline-font-size:var(--text-xs)] [--ck-multiline-radius:var(--radius-sm)] [--ck-multiline-gutter-x:.5rem]",
  "2xs":
    "[--ck-multiline-base-height:1.5rem] [--ck-multiline-font-size:var(--text-xs)] [--ck-multiline-radius:var(--radius-sm)] [--ck-multiline-gutter-x:.5rem]",
  xs: "[--ck-multiline-base-height:1.625rem] [--ck-multiline-font-size:var(--text-sm)] [--ck-multiline-radius:var(--radius-sm)] [--ck-multiline-gutter-x:.5rem]",
  sm: "[--ck-multiline-base-height:1.75rem] [--ck-multiline-font-size:var(--text-sm)] [--ck-multiline-radius:var(--radius-md)] [--ck-multiline-gutter-x:.625rem]",
  md: "[--ck-multiline-base-height:2rem] [--ck-multiline-font-size:var(--text-sm)] [--ck-multiline-radius:var(--radius-md)] [--ck-multiline-gutter-x:.75rem]",
  lg: "[--ck-multiline-base-height:2.25rem] [--ck-multiline-font-size:var(--text-sm)] [--ck-multiline-radius:var(--radius-md)] [--ck-multiline-gutter-x:.75rem]",
  xl: "[--ck-multiline-base-height:2.5rem] [--ck-multiline-font-size:var(--text-base)] [--ck-multiline-radius:var(--radius-lg)] [--ck-multiline-gutter-x:.875rem]",
  "2xl":
    "[--ck-multiline-base-height:2.75rem] [--ck-multiline-font-size:var(--text-base)] [--ck-multiline-radius:var(--radius-xl)] [--ck-multiline-gutter-x:1rem]",
  "3xl":
    "[--ck-multiline-base-height:3rem] [--ck-multiline-font-size:var(--text-base)] [--ck-multiline-radius:var(--radius-xl)] [--ck-multiline-gutter-x:1rem]",
};

const textareaGutterClass: Record<GutterSize, string> = {
  "2xs": "[--ck-multiline-gutter-x:.375rem]",
  xs: "[--ck-multiline-gutter-x:.5rem]",
  sm: "[--ck-multiline-gutter-x:.625rem]",
  md: "[--ck-multiline-gutter-x:.75rem]",
  lg: "[--ck-multiline-gutter-x:.875rem]",
  xl: "[--ck-multiline-gutter-x:1rem]",
};

// The input colors. Each is a light-dark
// pair or a theme token, so it resolves at the nearest theme scope. The alpha
// steps mix --alpha-base, which the Electron sheet sets to --color-text.
const inputColors = [
  "[--ck-field-text-color:var(--ck-palette-ink)]",
  "[--ck-field-placeholder-text-color:var(--ck-palette-ink-tertiary)]",
  "[--ck-field-outline-border-color:var(--ck-palette-border-heavy)]",
  "[--ck-field-outline-border-color-hover:light-dark(color-mix(in_oklab,var(--ck-palette-ink)_25%,transparent),color-mix(in_oklab,var(--ck-palette-ink)_30%,transparent))]",
  "[--ck-field-outline-border-color-focus:color-mix(in_oklab,var(--ck-palette-ink)_50%,transparent)]",
  "[--ck-field-soft-background-color:var(--ck-palette-surface-elevated-secondary)]",
  "[--ck-field-soft-border-color-focus:color-mix(in_oklab,var(--ck-palette-ink)_20%,transparent)]",
  "[--ck-field-border-color-invalid:var(--color-status-danger)]",
  "[--ck-control-gutter-pill-scaling:1.3]",
];

const ringOutline =
  "[box-shadow:0_0_0_1px_var(--ck-field-outline-border-color)_inset]";

const ringOutlineHover =
  "[@media(hover:hover)_and_(pointer:fine)]:hover:[box-shadow:0_0_0_1px_var(--ck-field-outline-border-color-hover)_inset]";

const ringTextareaOutlineHover =
  "[@media(hover:hover)]:hover:[box-shadow:0_0_0_1px_var(--ck-field-outline-border-color-hover)_inset]";

const ringOutlineFocus =
  "[box-shadow:0_0_0_1px_var(--ck-field-outline-border-color-focus)_inset]";

const ringSoftFocus =
  "[box-shadow:0_0_0_1px_var(--ck-field-soft-border-color-focus)_inset]";

const ringInvalid =
  "[box-shadow:0_0_0_1px_var(--ck-field-border-color-invalid)_inset]";

// Variant, focus and invalid rings share one specificity, so
// the last rule wins: invalid, then focused, then hover. The state decides
// the ring here, which keeps that order.
const ringClass = ({
  variant,
  disabled,
  focused,
  invalid,
  hover,
}: {
  variant: FieldVariant;
  disabled: boolean;
  focused: boolean;
  invalid: boolean;
  hover: string;
}) => {
  const active = !disabled;

  const stateRing = (focus: string) => {
    if (active && invalid) {
      return ringInvalid;
    }

    return active && focused ? focus : undefined;
  };

  if (variant === "outline") {
    const state = stateRing(ringOutlineFocus);

    return cn(ringOutline, state ?? (active && hover));
  }

  return cn("bg-(--ck-field-soft-background-color)", stateRing(ringSoftFocus));
};

const transitionClass =
  "[transition:color_.15s_ease,box-shadow_.15s_ease,background-color_.15s_ease]";

const invalidSelectionClass =
  "data-invalid:[&_*::selection]:bg-[color-mix(in_oklab,#e5484d_16%,transparent)]";

// Autofill keeps the field colors. The first line is inherited
// in the input and 16px in the textarea.
const autofillFirstLine = {
  input:
    "[&:-webkit-autofill:first-line]:text-[length:inherit]! [&:-webkit-autofill:first-line]:[transition:font-size_0s_50000s]!",
  textarea:
    "[&:-webkit-autofill:first-line]:text-[16px]! [&:-webkit-autofill:first-line]:[transition:font-size_0s_50000s]!",
} as const;

// The component runs a 1ms keyframe animation while the field is autofilled
// so that animationstart reaches onAnimationStart. The rules
// and keyframes keep the animation names in
// text-field-autofill.css; these class names carry the rules.
const autofillAnimationClass = {
  input: "text-field-autofill-input",
  textarea: "text-field-autofill-textarea",
} as const;

const autofillClass = (animation: string) =>
  cn(
    animation,
    "[&:-webkit-autofill]:text-(--ck-palette-ink)!",
    "[&:-webkit-autofill]:[-webkit-text-fill-color:var(--ck-palette-ink)]!",
    "[&:-webkit-autofill]:[transition:background-color_0s_50000s,box-shadow_0s_50000s,filter_0s_50000s]!",
    "[&:-webkit-autofill:focus]:[transition:background-color_0s_50000s,box-shadow_0s_50000s,filter_0s_50000s]!",
    "[&:-webkit-autofill:hover]:[transition:background-color_0s_50000s,box-shadow_0s_50000s,filter_0s_50000s]!"
  );

const wordPattern = /\w+|[^\w\s]/gu;

const placeCaret = (
  input: HTMLInputElement,
  event: MouseEvent<HTMLElement>
) => {
  const { left, top } = input.getBoundingClientRect();
  const before = event.clientY < top || event.clientX < left;

  if (event.detail === 1) {
    const position = before ? 0 : input.value.length;

    input.setSelectionRange(position, position);
  } else if (event.detail === 2) {
    const words = input.value.match(wordPattern) ?? [];
    const word = before ? words.at(0) : words.at(-1);

    if (word !== undefined) {
      const index = before
        ? input.value.indexOf(word)
        : input.value.lastIndexOf(word);

      input.setSelectionRange(index, index + word.length);
    }
  } else {
    input.select();
  }
};

interface FieldChromeProps {
  /** Ring and fill style. */
  variant?: FieldVariant;
  /** Control size, 3xs to 3xl. */
  size?: ControlSize;
  /** Horizontal gutter, independent of the size. */
  gutterSize?: GutterSize;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  /** Keep password-manager extensions active. */
  allowAutofillExtensions?: boolean;
  onAnimationStart?: (event: AnimationEvent<HTMLElement>) => void;
  onAutofill?: () => void;
  /** Select the text on mount. */
  autoSelect?: boolean;
  /** Marks the container as a widget field. */
  __isWidget?: boolean;
}

interface InputProps
  extends
    FieldChromeProps,
    Omit<
      ComponentProps<"input">,
      "size" | "ref" | "onAnimationStart" | "disabled" | "readOnly"
    > {
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  inputClassName?: string;
  /** Fully rounded container; the gutter grows by 1.33. */
  pill?: boolean;
  /** Pull the container outward by one gutter. */
  opticallyAlign?: "start" | "end";
  ref?: Ref<HTMLInputElement>;
}

const containerBaseClass = cn(
  inputColors,
  "flex w-full cursor-text items-center gap-(--ck-field-gap) [border-radius:var(--ck-field-radius)] [font-size:var(--ck-field-font-size)] font-normal text-(--ck-field-text-color)",
  transitionClass,
  "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  "data-[optically-align=end]:me-[calc(var(--ck-field-gutter)*-1)] data-[optically-align=start]:ms-[calc(var(--ck-field-gutter)*-1)]",
  "[&>:first-child:not(input)]:[margin-inline-start:var(--ck-field-adornment-offset,-2px)] [&>:last-child:not(input)]:[margin-inline-end:var(--ck-field-adornment-offset,-2px)]",
  invalidSelectionClass
);

const inputBaseClass = cn(
  "block h-(--ck-field-size) w-full rounded-none border-0 bg-transparent [font-size:inherit] [line-height:inherit] [font-weight:inherit] text-inherit shadow-none outline-0 focus:outline-0",
  "placeholder:text-(--ck-field-placeholder-text-color) disabled:cursor-not-allowed",
  autofillFirstLine.input,
  "[&[type=number]]:[appearance:textfield] [&[type=number]::-webkit-inner-spin-button]:m-0 [&[type=number]::-webkit-inner-spin-button]:appearance-none [&[type=number]::-webkit-outer-spin-button]:m-0 [&[type=number]::-webkit-outer-spin-button]:appearance-none",
  autofillClass(autofillAnimationClass.input)
);

const sideClasses = {
  pe: {
    pill: "pe-[calc(var(--ck-field-gutter)*var(--ck-control-gutter-pill-scaling))]",
    plain: "pe-(--ck-field-gutter)",
  },
  ps: {
    pill: "ps-[calc(var(--ck-field-gutter)*var(--ck-control-gutter-pill-scaling))]",
    plain: "ps-(--ck-field-gutter)",
  },
} as const;

const sideClass = (
  side: "ps" | "pe",
  adornment: boolean,
  pill: boolean,
  ownsPadding: boolean
) => {
  if (ownsPadding && adornment) {
    return `${side}-0`;
  }

  if (!ownsPadding && !adornment) {
    return "";
  }

  return pill ? sideClasses[side].pill : sideClasses[side].plain;
};

const autofillExtensionsDefault = (
  name: string | undefined,
  autoComplete: string | undefined,
  type?: string
) =>
  type === "password" ||
  Boolean(name) ||
  (Boolean(autoComplete) && autoComplete !== "off");

interface FieldElementOptions<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  id: string | undefined;
  allowExtensions: boolean;
  autoSelect: boolean | undefined;
  onFocus: ((event: FocusEvent<T>) => void) | undefined;
  onBlur: ((event: FocusEvent<T>) => void) | undefined;
  onAnimationStart: ((event: AnimationEvent<HTMLElement>) => void) | undefined;
  onAutofill: (() => void) | undefined;
}

// What Input and Textarea share: the focused flag, the generated id, the
// select-on-mount effect and the autofill hooks.
const useFieldElement = <T extends HTMLInputElement | HTMLTextAreaElement>({
  id,
  allowExtensions,
  autoSelect,
  onFocus,
  onBlur,
  onAnimationStart,
  onAutofill,
}: FieldElementOptions<T>) => {
  const elementRef = useRef<T>(null);
  const generatedId = `search-ui-input-${useId()}`;
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoSelect === true) {
      elementRef.current?.select();
    }
  }, [autoSelect]);

  const fallbackId = allowExtensions ? undefined : generatedId;

  const elementProps = {
    "data-1p-ignore": allowExtensions ? undefined : true,
    "data-lpignore": allowExtensions ? undefined : true,
    id: id === undefined || id === "" ? fallbackId : id,
    onAnimationStart: (event: AnimationEvent<HTMLElement>) => {
      onAnimationStart?.(event);

      if (event.animationName === "ui-autofill") {
        onAutofill?.();
      }
    },
    onBlur: (event: FocusEvent<T>) => {
      setFocused(false);
      onBlur?.(event);
    },
    onFocus: (event: FocusEvent<T>) => {
      setFocused(true);
      onFocus?.(event);
    },
  };

  return { elementProps, elementRef, focused };
};

interface InputContainerState {
  variant: FieldVariant;
  size: ControlSize;
  gutterSize: GutterSize | undefined;
  pill: boolean;
  hasStart: boolean;
  hasEnd: boolean;
  disabled: boolean;
  focused: boolean;
  invalid: boolean;
}

const inputContainerClass = ({
  variant,
  size,
  gutterSize,
  pill,
  hasStart,
  hasEnd,
  disabled,
  focused,
  invalid,
}: InputContainerState) =>
  cn(
    containerBaseClass,
    inputSizeClass[size],
    gutterSize === undefined ? undefined : inputGutterClass[gutterSize],
    pill && "[--ck-field-radius:var(--radius-pill)]",
    sideClass("ps", hasStart, pill, false),
    sideClass("pe", hasEnd, pill, false),
    ringClass({
      disabled,
      focused,
      hover: ringOutlineHover,
      invalid,
      variant,
    })
  );

const Input = ({
  id,
  name,
  type = "text",
  variant = "outline",
  size = "md",
  gutterSize,
  className,
  autoComplete,
  disabled = false,
  readOnly = false,
  invalid = false,
  allowAutofillExtensions,
  onFocus,
  onBlur,
  onAnimationStart,
  onAutofill,
  autoSelect,
  startAdornment,
  endAdornment,
  inputClassName,
  pill = false,
  opticallyAlign,
  ref,
  __isWidget = false,
  ...props
}: InputProps) => {
  const { elementProps, elementRef, focused } =
    useFieldElement<HTMLInputElement>({
      allowExtensions:
        allowAutofillExtensions ??
        autofillExtensionsDefault(name, autoComplete, type),
      autoSelect,
      id,
      onAnimationStart,
      onAutofill,
      onBlur,
      onFocus,
    });

  const hasStart = Boolean(startAdornment);
  const hasEnd = Boolean(endAdornment);
  const inputMergedRef = useMergedRef(ref, elementRef);

  // Mouse down on the container (not on the input or a button) focuses the
  // input and places the caret.
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const input = elementRef.current;
    const { target } = event;

    if (
      !(target instanceof Element) ||
      input === null ||
      input.contains(target) ||
      target.closest(
        "button, [type='button'], [role='button'], [role='menuitem']"
      ) !== null
    ) {
      return;
    }

    event.preventDefault();

    if (document.activeElement !== input) {
      input.focus();
    }

    const placesCaret = event.detail === 1 || event.detail === 2;

    if (placesCaret && input.selectionStart === null) {
      return;
    }

    placeCaret(input, event);
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The container forwards presses to the input.
    <div
      className={cn(
        inputContainerClass({
          disabled,
          focused,
          gutterSize,
          hasEnd,
          hasStart,
          invalid,
          pill,
          size,
          variant,
        }),
        className
      )}
      data-ck-w-component={__isWidget ? "input" : ""}
      data-variant={variant}
      data-size={size}
      data-gutter-size={gutterSize}
      data-focused={focused}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-pill={pill ? "" : undefined}
      data-ck-optically-align={opticallyAlign}
      data-ck-has-start-adornment={hasStart ? "" : undefined}
      data-ck-has-end-adornment={hasEnd ? "" : undefined}
      onMouseDown={handleMouseDown}
    >
      {startAdornment}
      <input
        {...props}
        {...elementProps}
        ref={inputMergedRef}
        className={cn(
          inputBaseClass,
          sideClass("ps", hasStart, pill, true),
          sideClass("pe", hasEnd, pill, true),
          inputClassName
        )}
        type={type}
        name={name}
        autoComplete={autoComplete}
        readOnly={readOnly}
        disabled={disabled}
      />
      {endAdornment}
    </div>
  );
};

interface TextareaProps
  extends
    FieldChromeProps,
    Omit<
      ComponentProps<"textarea">,
      "ref" | "onAnimationStart" | "disabled" | "readOnly"
    > {
  /** Lines of height before content scrolls. Default 3. */
  rows?: number;
  /** Largest line count while auto-resizing. Default 10, never below rows. */
  maxRows?: number;
  /** Grow to the content on every change, up to maxRows or maxHeight. */
  autoResize?: boolean;
  /** CSS max-height; takes the place of the maxRows height. */
  maxHeight?: string;
  /** CSS resize handle. */
  resize?: "none" | "both" | "horizontal" | "vertical" | "block" | "inline";
  ref?: Ref<HTMLTextAreaElement>;
}

const textareaBaseClass = cn(
  inputColors,
  "[--ck-multiline-gutter-y:calc(.5*(var(--ck-multiline-base-height)-var(--ck-multiline-line-height)))] [--ck-multiline-line-height:20px] [--ck-multiline-max-height:calc((var(--ck-multiline-gutter-y)*2)+(var(--ck-multiline-line-height)*var(--ck-multiline-max-rows)))] [--ck-multiline-min-height:calc((var(--ck-multiline-gutter-y)*2)+(var(--ck-multiline-line-height)*var(--ck-multiline-min-rows)))]",
  "relative flex w-full cursor-text overflow-hidden [border-radius:var(--ck-multiline-radius)] [font-size:var(--ck-multiline-font-size)] font-normal text-(--ck-palette-ink)",
  transitionClass,
  "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  invalidSelectionClass
);

const textareaElementClass = cn(
  "block max-h-(--ck-multiline-max-height) min-h-(--ck-multiline-min-height) w-full max-w-full [resize:var(--ck-multiline-resize,none)] [appearance:none] rounded-none border-0 bg-transparent px-(--ck-multiline-gutter-x) py-(--ck-multiline-gutter-y) [font-size:inherit] [line-height:var(--ck-multiline-line-height)] [font-weight:inherit] text-inherit shadow-none outline-0 [filter:none] focus:outline-0",
  "placeholder:text-(--ck-field-placeholder-text-color) placeholder:opacity-100 disabled:cursor-not-allowed",
  "[&::-webkit-resizer]:[visibility:var(--ck-multiline-resizer-visibility,hidden)]",
  autofillFirstLine.textarea,
  autofillClass(autofillAnimationClass.textarea)
);

type CustomStyle = CSSProperties & Record<`--${string}`, string | undefined>;

const Textarea = ({
  id,
  name,
  variant = "outline",
  size = "md",
  gutterSize,
  className,
  autoComplete,
  disabled = false,
  readOnly = false,
  invalid = false,
  allowAutofillExtensions,
  onFocus,
  onBlur,
  onAnimationStart,
  onAutofill,
  autoSelect,
  rows = 3,
  maxRows,
  autoResize = false,
  maxHeight,
  resize = "none",
  ref,
  onChange,
  __isWidget = false,
  ...props
}: TextareaProps) => {
  const { elementProps, elementRef, focused } =
    useFieldElement<HTMLTextAreaElement>({
      allowExtensions:
        allowAutofillExtensions ??
        autofillExtensionsDefault(name, autoComplete),
      autoSelect,
      id,
      onAnimationStart,
      onAutofill,
      onBlur,
      onFocus,
    });

  const effectiveMaxRows = autoResize ? Math.max(maxRows ?? 10, rows) : rows;
  const textareaMergedRef = useMergedRef(elementRef, ref);
  const resizable = resize !== "none";
  const { value } = props;

  const resizeToContent = useCallback(() => {
    const element = elementRef.current;

    if (!autoResize || element === null) {
      return;
    }

    element.style.height = "0px";

    const { scrollHeight } = element;

    element.style.height = `${scrollHeight}px`;
  }, [autoResize, elementRef]);

  // The component re-measures when the value or the row count changes.
  /* oxlint-disable react/exhaustive-effect-dependencies -- value and rows are the triggers, not inputs of the measure. */
  useEffect(() => {
    resizeToContent();
  }, [value, rows, resizeToContent]);
  /* oxlint-enable react/exhaustive-effect-dependencies */

  const containerStyle: CustomStyle = {
    "--ck-multiline-max-height": maxHeight,
    "--ck-multiline-max-rows": `${effectiveMaxRows}`,
    "--ck-multiline-min-rows": `${rows}`,
    "--ck-multiline-resize": resizable ? resize : undefined,
    "--ck-multiline-resizer-visibility": resizable ? "visible" : undefined,
  };

  return (
    <div
      className={cn(
        textareaBaseClass,
        textareaSizeClass[size],
        gutterSize === undefined ? undefined : textareaGutterClass[gutterSize],
        ringClass({
          disabled,
          focused,
          hover: ringTextareaOutlineHover,
          invalid,
          variant,
        }),
        className
      )}
      data-ck-w-component={__isWidget ? "textarea" : ""}
      data-variant={variant}
      data-size={size}
      data-gutter-size={gutterSize}
      data-focused={focused}
      data-disabled={disabled ? "" : undefined}
      data-readonly={readOnly ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      style={containerStyle}
    >
      <textarea
        {...props}
        {...elementProps}
        onChange={(event) => {
          onChange?.(event);
          resizeToContent();
        }}
        ref={textareaMergedRef}
        className={textareaElementClass}
        name={name}
        autoComplete={autoComplete}
        readOnly={readOnly}
        disabled={disabled}
        rows={rows}
      />
    </div>
  );
};

interface Tag {
  value: string;
  label: string;
}

interface TagInputProps extends InputProps {
  tags: readonly Tag[];
  onRemoveTag: (tag: Tag) => void;
  /** Renders a tag label; mounted as a component with the tag as props. */
  TagView?: ComponentType<Tag>;
  getRemoveLabel?: (tag: Tag) => string;
}

const defaultTagView = ({ label }: Tag) => label;
const defaultRemoveLabel = (tag: Tag) => `Remove ${tag.label}`;

// Close glyph of the remove button.
const CloseGlyph = ({ size }: { size: number }) => (
  <LucideCircleX
    aria-hidden="true"
    width={size}
    height={size}
    strokeWidth={1.5}
  />
);

const tagContainerClass = cn(
  "[--ck-field-adornment-offset:0px] [--ck-tag-field-gap:calc(var(--spacing,.25rem)*1.5)]",
  "data-[size=2xs]:[--ck-tag-field-gap:var(--spacing,.25rem)] data-[size=3xs]:[--ck-tag-field-gap:var(--spacing,.25rem)] data-[size=sm]:[--ck-tag-field-gap:var(--spacing,.25rem)] data-[size=xs]:[--ck-tag-field-gap:var(--spacing,.25rem)]",
  "data-[size=2xl]:[--ck-tag-field-gap:calc(var(--spacing,.25rem)*2)] data-[size=3xl]:[--ck-tag-field-gap:calc(var(--spacing,.25rem)*2)] data-[size=xl]:[--ck-tag-field-gap:calc(var(--spacing,.25rem)*2)]",
  "min-h-(--ck-field-size) flex-wrap gap-(--ck-tag-field-gap) p-(--ck-tag-field-gap)",
  "[&:not(:has([data-tag]))]:px-(--ck-field-gutter)",
  "focus-within:not-data-disabled:[box-shadow:0_0_0_1px_var(--ck-field-outline-border-color-focus)_inset]"
);

const tagInputClass =
  "h-[calc(var(--ck-field-size)-2*var(--ck-tag-field-gap))] w-auto min-w-5 max-w-full flex-auto p-0 [field-sizing:content]";

const tagClass = cn(
  "inline-flex h-[calc(var(--ck-field-size)-2*var(--ck-tag-field-gap))] max-w-full cursor-(--ck-action-cursor,pointer) items-center gap-(--spacing,.25rem) rounded-md bg-(--ck-palette-surface-button-secondary) ps-2 pe-1 text-(--ck-palette-ink) outline-none",
  "focus:bg-(--ck-palette-surface-button-secondary-hover) focus:outline-2 focus:outline-offset-1 focus:outline-(--ck-field-outline-border-color-focus) focus:outline-solid",
  "[@media(hover:hover)]:hover:bg-(--ck-palette-surface-button-secondary-hover)"
);

const tagRemoveClass =
  "flex shrink-0 cursor-(--ck-action-cursor,pointer) items-center justify-center p-0 text-inherit opacity-70 [@media(hover:hover)]:hover:opacity-100";

const TagInput = ({
  tags,
  onRemoveTag,
  TagView = defaultTagView,
  getRemoveLabel = defaultRemoveLabel,
  ref,
  className,
  inputClassName,
  disabled,
  placeholder,
  onKeyDown,
  startAdornment,
  ...props
}: TagInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const tagRefs = useRef(new Map<string, HTMLDivElement>());
  const tagMergedRef = useMergedRef(inputRef, ref);

  const focusTag = (index: number) => {
    const tag = tags.at(index);

    if (tag === undefined) {
      inputRef.current?.focus({ preventScroll: true });
    } else {
      tagRefs.current.get(tag.value)?.focus({ preventScroll: true });
    }
  };

  const removeTag = (tag: Tag) => {
    onRemoveTag(tag);
    inputRef.current?.focus({ preventScroll: true });
  };

  const handleTagKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    tag: Tag,
    index: number
  ) => {
    if (
      disabled === true ||
      event.target !== event.currentTarget ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    switch (event.key) {
      case "ArrowLeft": {
        event.preventDefault();
        focusTag(Math.max(0, index - 1));
        break;
      }

      case "ArrowRight": {
        event.preventDefault();
        focusTag(index + 1);
        break;
      }

      case "Backspace":
      case "Delete": {
        event.preventDefault();
        removeTag(tag);
        break;
      }

      default: {
        break;
      }
    }
  };

  return (
    <Input
      {...props}
      ref={tagMergedRef}
      className={cn(tagContainerClass, className)}
      inputClassName={cn(tagInputClass, inputClassName)}
      disabled={disabled}
      placeholder={tags.length === 0 ? placeholder : undefined}
      startAdornment={
        <>
          {startAdornment}
          {tags.map((tag, index) => (
            // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- The tag is a focusable group with arrow and delete keys.
            <div
              key={tag.value}
              ref={(node) => {
                if (node) {
                  tagRefs.current.set(tag.value, node);
                } else {
                  tagRefs.current.delete(tag.value);
                }
              }}
              className={tagClass}
              data-tag=""
              tabIndex={-1}
              role="group"
              aria-label={tag.label}
              onClick={() => {
                if (disabled !== true) {
                  focusTag(index);
                }
              }}
              onKeyDown={(event) => {
                handleTagKeyDown(event, tag, index);
              }}
            >
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                <TagView {...tag} />
              </span>
              <button
                className={tagRemoveClass}
                type="button"
                tabIndex={-1}
                disabled={disabled}
                aria-label={getRemoveLabel(tag)}
                onClick={(event) => {
                  event.stopPropagation();
                  removeTag(tag);
                }}
              >
                <CloseGlyph size={14} />
              </button>
            </div>
          ))}
        </>
      }
      onKeyDown={(event) => {
        const { currentTarget } = event;

        if (
          !event.nativeEvent.isComposing &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          tags.length > 0 &&
          currentTarget.selectionStart === 0 &&
          currentTarget.selectionEnd === 0 &&
          (event.key === "ArrowLeft" || event.key === "Backspace")
        ) {
          event.preventDefault();
          focusTag(tags.length - 1);
        } else {
          onKeyDown?.(event);
        }
      }}
    />
  );
};

type TextInputVariant =
  | "amount"
  | "auth"
  | "code"
  | "compact"
  | "plain"
  | "default"
  | "field"
  | "form"
  | "onboarding"
  | "outlined"
  | "grouped"
  | "ghost"
  | "heading"
  | "display"
  | "displayName"
  | "settings"
  | "inline"
  | "rounded"
  | "segmented"
  | "search"
  | "searchFilter"
  | "tags"
  | "transparent";

type TagDensity = "compact" | "comfortable" | "multiline";

// The class sets of TextInput. The utilities resolve to the Electron tokens:
// text-default is --color-text, border-default --color-border, bg-primary-soft
// --color-fill-primary-soft, bg-panel --color-panel and so on, each
// written here as the theme variable the utility reads. text-danger is
// --ck-palette-label-error, which is red-500 in light and red-300 in dark.
const fieldBase = cn(
  "[--field-danger:var(--color-status-danger)]",
  "min-w-0 border text-(--ck-palette-ink) outline-none placeholder:text-(--ck-palette-ink-tertiary) disabled:cursor-not-allowed disabled:text-(--ck-palette-ink-secondary) aria-invalid:border-(--field-danger) aria-invalid:ring-2 aria-invalid:ring-[color-mix(in_oklab,var(--field-danger)_20%,transparent)]"
);

const forcedHighlight =
  "forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText] forced-colors:focus:[forced-color-adjust:none] forced-colors:focus:placeholder:text-[HighlightText]";

const ghostHover =
  "border-transparent enabled:hover:bg-(--ck-palette-surface-button-secondary-hover) focus:bg-(--ck-palette-surface-button-secondary-hover)";

const textInputVariantClass: Record<TextInputVariant, string> = {
  amount:
    "h-10 rounded-lg bg-(--ck-palette-surface-surface) px-3 text-sm font-normal tabular-nums",
  auth: "h-14 rounded-full bg-transparent px-5 text-base focus:ring-1 focus:ring-(--ck-palette-border-focus)",
  code: "h-9 rounded-md bg-(--ck-palette-surface-control) px-2.5 font-mono text-sm",
  compact: "h-7 rounded-md bg-(--ck-palette-surface-control) px-2 text-sm",
  plain: "h-7 rounded-md border-transparent bg-transparent p-0 text-sm",
  default: "h-9 rounded-md bg-(--ck-palette-surface-control) px-2.5 text-sm",
  field:
    "h-8 rounded-lg bg-(--ck-palette-surface-control) px-2 text-sm focus-within:bg-(--ck-palette-surface-button-secondary-hover) forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-solid",
  form: "h-12 rounded-2xl border-(--ck-palette-border) bg-transparent px-5 text-[length:.875rem] leading-5 tracking-[-0.15px] font-normal",
  onboarding:
    "h-10 rounded-lg border-(--ck-palette-border) bg-transparent px-3 text-sm font-normal",
  outlined:
    "h-9.5 rounded-lg border-(--ck-palette-border) bg-(--ck-palette-surface-surface) px-3 py-2 text-sm leading-5",
  grouped:
    "h-10 rounded-[inherit] border-transparent bg-transparent px-3 text-sm",
  ghost: "h-7 rounded-md bg-transparent px-2 text-sm",
  heading:
    "h-9 rounded-sm bg-(--ck-palette-surface-surface) px-2 text-lg font-medium",
  display:
    "h-14 rounded-sm border-transparent bg-transparent px-2 text-center font-semibold text-[length:var(--text-3xl)] leading-none tracking-[inherit] focus:ring-1 focus:ring-(--ck-palette-border-focus)",
  displayName:
    "h-11 rounded-sm border-transparent bg-transparent px-2 text-center text-3xl leading-11 font-normal forced-colors:focus:outline-2 forced-colors:focus:outline-solid",
  settings:
    "rounded-2xl border-(--ck-palette-border) bg-transparent px-4 py-2 text-base",
  inline:
    "h-11 rounded-xl bg-(--ck-palette-surface-surface) px-3 py-2 text-title-lg leading-7 font-medium",
  rounded:
    "h-12 rounded-2xl bg-[light-dark(var(--ck-palette-surface-surface),color-mix(in_oklab,var(--ck-palette-surface-surface-under)_92%,transparent))] px-4 text-base",
  segmented:
    "h-10 overflow-hidden rounded-xl bg-(--ck-palette-surface-control) text-sm",
  search:
    "h-11.5 rounded-none border-x-0 border-t-0 bg-transparent px-4 pb-1.5 text-lg",
  searchFilter: "h-7 rounded-md bg-transparent px-2 text-sm",
  tags: "max-h-40 overflow-y-auto bg-(--ck-palette-surface-control) text-sm",
  transparent:
    "h-7 rounded-md border-transparent bg-transparent px-2 text-sm focus:ring-1 focus:ring-(--ck-palette-border-focus)",
};

const tagDensityClass: Record<TagDensity, string> = {
  compact: "min-h-9 gap-1 rounded-md px-2 py-1",
  comfortable: "min-h-12 gap-1 rounded-lg px-2 py-1",
  multiline: "relative min-h-30 content-start gap-2 rounded-lg p-3",
};

const noBorderOutline = new Set<TextInputVariant>([
  "ghost",
  "plain",
  "rounded",
  "outlined",
  "field",
  "form",
  "onboarding",
  "settings",
  "search",
  "segmented",
  "grouped",
  "transparent",
  "display",
  "displayName",
]);

const noDisabledFill = new Set<TextInputVariant>([
  "ghost",
  "plain",
  "displayName",
  "transparent",
  "grouped",
]);

interface TextInputProps extends Omit<
  ComponentProps<"input">,
  "ref" | "className"
> {
  /** Size to the content. */
  autoSize?: boolean;
  variant?: TextInputVariant;
  leadingControl?: ReactNode;
  valueSuffix?: ReactNode;
  trailingInlineControl?: ReactNode;
  trailingControl?: ReactNode;
  /** Shows the placeholder in the default text color. */
  mixed?: boolean;
  tagDensity?: TagDensity;
  /** Draw the focus border. Default true except for field and displayName. */
  focusRing?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const isPresent = (node: ReactNode) => node !== undefined && node !== null;

interface TextInputLayout {
  variant: TextInputVariant;
  hasLeading: boolean;
  hasSuffix: boolean;
  hasTrailing: boolean;
  hasControls: boolean;
  showFocus: boolean;
  disabled: boolean;
}

const wrapperBorderClass = (variant: TextInputVariant, disabled: boolean) =>
  cn(
    variant === "rounded" && "border-(--ck-palette-border-light)",
    !noBorderOutline.has(variant) && "border-(--ck-palette-border-heavy)",
    (variant === "field" || variant === "search") &&
      (disabled ? "border-transparent" : "border-(--ck-palette-border)"),
    variant === "segmented" && "border-(--ck-palette-border)"
  );

const disabledFillClass =
  "disabled:bg-[color-mix(in_oklab,var(--ck-palette-ink)_5%,transparent)]";

const textInputFocusClass = ({
  variant,
  showFocus,
  hasControls,
}: TextInputLayout) => {
  if (!showFocus) {
    return "";
  }

  let ring = "focus:border-(--ck-palette-border-focus)";

  if (variant === "plain") {
    ring =
      "focus-visible:ring-1 focus-visible:ring-(--ck-palette-border-focus)";
  } else if (variant === "ghost") {
    ring = "";
  }

  return cn(
    variant === "form" &&
      !hasControls && [
        "focus:bg-(--ck-palette-surface-button-secondary-hover)",
        forcedHighlight,
      ],
    ring
  );
};

const textInputChromeClass = (
  layout: TextInputLayout,
  {
    autoSize,
    tagDensity,
    type,
  }: { autoSize: boolean; tagDensity: TagDensity; type: string | undefined }
) => {
  const { variant, hasLeading, hasTrailing, disabled } = layout;

  return cn(
    fieldBase,
    autoSize ? "[field-sizing:content] max-w-full" : "w-full",
    textInputVariantClass[variant],
    variant === "tags" && tagDensityClass[tagDensity],
    variant === "ghost" && ghostHover,
    textInputFocusClass(layout),
    !noDisabledFill.has(variant) && disabledFillClass,
    wrapperBorderClass(variant, disabled),
    variant === "segmented" && (hasLeading ? "ps-0" : "ps-3"),
    variant === "segmented" && (hasTrailing ? "pe-0" : "pe-3"),
    variant === "field" && hasTrailing && "overflow-hidden pe-0",
    (variant === "compact" || variant === "field") &&
      type === "number" &&
      "tabular-nums"
  );
};

const fieldNumberClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none";

// The input inside the wrapper when a control is supplied.
const textInputInnerClass = ({
  variant,
  hasSuffix,
  showFocus,
}: TextInputLayout) =>
  cn(
    "min-w-0 bg-transparent outline-none placeholder:text-(--ck-palette-ink-tertiary) focus:outline-none! disabled:cursor-not-allowed disabled:text-(--ck-palette-ink-secondary)",
    hasSuffix ? "[field-sizing:content] flex-initial" : "flex-1",
    variant === "tags" ? "h-6" : "h-full",
    variant === "tags" && !hasSuffix && "basis-32",
    showFocus && variant === "form" && forcedHighlight
  );

const textInputWrapperClass = (
  chrome: string,
  { variant, showFocus }: TextInputLayout,
  disabled: boolean
) =>
  cn(
    chrome,
    "flex items-center",
    showFocus && "focus-within:border-(--ck-palette-border-focus)",
    variant === "form"
      ? showFocus &&
          "focus-within:bg-(--ck-palette-surface-button-secondary-hover)"
      : "forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-solid",
    variant === "tags" ? "flex-wrap" : "gap-2",
    variant === "tags" && (disabled ? "cursor-not-allowed" : "cursor-text"),
    variant === "auth" &&
      "focus-within:ring-1 focus-within:ring-(--ck-palette-border-focus)",
    disabled &&
      variant !== "grouped" &&
      "bg-[color-mix(in_oklab,var(--ck-palette-ink)_5%,transparent)]"
  );

const FramedTrailing = ({
  variant,
  children,
}: {
  variant: TextInputVariant;
  children: ReactNode;
}) => (
  <div
    className={cn(
      "flex h-full shrink-0 items-center",
      variant === "segmented" && "border-s border-(--ck-palette-border)"
    )}
  >
    {children}
  </div>
);

const framesTrailing = (variant: TextInputVariant) =>
  variant === "segmented" || variant === "field";

const textInputLayout = ({
  disabled,
  focusRing,
  leadingControl,
  trailingControl,
  trailingInlineControl,
  valueSuffix,
  variant,
}: {
  disabled: boolean;
  focusRing: boolean | undefined;
  leadingControl: ReactNode;
  trailingControl: ReactNode;
  trailingInlineControl: ReactNode;
  valueSuffix: ReactNode;
  variant: TextInputVariant;
}): TextInputLayout => ({
  disabled,
  hasControls:
    isPresent(leadingControl) ||
    isPresent(valueSuffix) ||
    isPresent(trailingInlineControl) ||
    isPresent(trailingControl),
  hasLeading: isPresent(leadingControl),
  hasSuffix: isPresent(valueSuffix),
  hasTrailing: isPresent(trailingControl),
  showFocus: focusRing ?? (variant !== "field" && variant !== "displayName"),
  variant,
});

const TextInput = ({
  autoSize = false,
  id,
  ref,
  type,
  leadingControl,
  valueSuffix,
  trailingInlineControl,
  trailingControl,
  variant = "default",
  mixed = false,
  tagDensity = "compact",
  focusRing,
  ...props
}: TextInputProps) => {
  const tagsRef = useRef<HTMLInputElement>(null);
  const textInputMergedRef = useMergedRef(ref, tagsRef);
  const disabled = props.disabled === true;

  const layout = textInputLayout({
    disabled,
    focusRing,
    leadingControl,
    trailingControl,
    trailingInlineControl,
    valueSuffix,
    variant,
  });

  const { hasControls, hasSuffix, hasTrailing } = layout;
  const chrome = textInputChromeClass(layout, { autoSize, tagDensity, type });

  const input = (
    <input
      {...props}
      id={id}
      ref={textInputMergedRef}
      data-mixed={mixed || undefined}
      className={cn(
        "data-[mixed=true]:placeholder:text-(--ck-palette-ink)",
        variant === "field" && type === "number" && fieldNumberClass,
        hasControls
          ? textInputInnerClass(layout)
          : cn(chrome, variant === "segmented" && "focus:outline-none!"),
        hasControls &&
          variant === "segmented" &&
          "placeholder:text-(--ck-palette-ink-tertiary)"
      )}
      type={type}
    />
  );

  if (!hasControls) {
    return input;
  }

  const body = hasSuffix ? (
    <label
      className={cn(
        "flex h-full min-w-0 flex-1 cursor-text items-center",
        variant === "tags" ? "basis-32" : "gap-0.5"
      )}
    >
      {input}
      {!mixed && valueSuffix}
    </label>
  ) : (
    input
  );

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- The tag container focuses the input when pressed.
    <div
      className={textInputWrapperClass(chrome, layout, disabled)}
      aria-invalid={props["aria-invalid"]}
      onClick={
        variant === "tags"
          ? (event) => {
              if (event.target === event.currentTarget) {
                tagsRef.current?.focus();
              }
            }
          : undefined
      }
    >
      {leadingControl}
      {body}
      {trailingInlineControl}
      {hasTrailing && framesTrailing(variant) ? (
        <FramedTrailing variant={variant}>{trailingControl}</FramedTrailing>
      ) : (
        trailingControl
      )}
    </div>
  );
};

const inputGroupClass =
  "divide-y divide-(--ck-palette-border) overflow-hidden rounded-xl border border-(--ck-palette-border) text-sm text-(--ck-palette-ink) [&>:first-child]:rounded-tl-[calc(var(--radius-xl)-1px)] [&>:first-child]:rounded-tr-[calc(var(--radius-xl)-1px)] [&>:last-child]:rounded-br-[calc(var(--radius-xl)-1px)] [&>:last-child]:rounded-bl-[calc(var(--radius-xl)-1px)]";

const InputGroup = ({ children }: { children?: ReactNode }) => (
  <div className={inputGroupClass}>{children}</div>
);

type TextareaFieldVariant =
  | "default"
  | "display"
  | "segmented"
  | "plain"
  | "feedback"
  | "outlined"
  | "editor"
  | "comparison"
  | "rounded"
  | "settings"
  | "dialog"
  | "compact"
  | "ghost"
  | "code";

interface TextareaFieldProps extends Omit<ComponentProps<"textarea">, "ref"> {
  /** Grow to the content on every input. */
  autoResize?: boolean;
  /** "default" draws the focus ring on the variants that have one. */
  focusIndicator?: string;
  variant?: TextareaFieldVariant;
  trailingControl?: ReactNode;
  footer?: ReactNode;
  ref?: Ref<HTMLTextAreaElement>;
}

const autoResizeLimit = 120;

const resizeCapped = (element: HTMLTextAreaElement) => {
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight + 2, autoResizeLimit)}px`;
};

// Fits the display text to the width:
// the font shrinks from its size to the base size, then the height follows.
const fitDisplayText = (element: HTMLTextAreaElement) => {
  const context = document.createElement("canvas").getContext("2d");

  if (context === null || element.clientWidth === 0) {
    return;
  }

  element.style.fontSize = "var(--text-base)";

  const baseSize = Number.parseFloat(getComputedStyle(element).fontSize);

  element.style.fontSize = "";

  const style = getComputedStyle(element);
  const fontSize = Number.parseFloat(style.fontSize);

  context.font = style.font;
  context.letterSpacing = style.letterSpacing;

  const widest = Math.max(
    ...element.value.split("\n").map((line) => context.measureText(line).width)
  );

  const available =
    element.clientWidth -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight);

  const fitted = Math.max(
    baseSize,
    Math.min(fontSize, Math.floor((fontSize * available) / (widest || 1)))
  );

  element.style.fontSize = `${fitted}px`;
  element.style.whiteSpace = fitted > baseSize ? "pre" : "pre-wrap";
  element.style.paddingBlock = "";
  element.style.minHeight = "0";
  element.style.height = "auto";

  const paddingTop = Number.parseFloat(style.paddingTop);
  const contentHeight = element.scrollHeight - paddingTop * 2;

  element.style.minHeight = "";

  const padding = Math.max(
    paddingTop,
    (element.clientHeight - contentHeight) / 2
  );

  element.style.paddingBlock = `${padding}px`;
  element.style.height = `${
    contentHeight +
    padding * 2 +
    Number.parseFloat(style.borderTopWidth) +
    Number.parseFloat(style.borderBottomWidth)
  }px`;
};

const disabledFill =
  "disabled:bg-[color-mix(in_oklab,var(--ck-palette-ink)_5%,transparent)]";

const basicTextareaClass = (variant: TextareaFieldVariant) => {
  if (variant === "settings") {
    return cn(
      fieldBase,
      "max-h-30 min-h-9 w-full resize-none overflow-y-auto rounded-lg border-(--ck-palette-border-heavy) bg-(--ck-palette-surface-surface) px-3 py-2 text-sm leading-5 focus:border-(--ck-palette-border-focus)",
      disabledFill
    );
  }

  const ghost = variant === "ghost";

  return cn(
    fieldBase,
    "w-full rounded-md",
    variant === "dialog" ? "text-base" : "text-sm",
    variant === "compact"
      ? "max-h-30 min-h-9 resize-none overflow-y-auto"
      : "min-h-24 resize-y",
    ghost
      ? cn(ghostHover, "bg-transparent px-2 py-0.5")
      : cn(
          "border-(--ck-palette-border-heavy) bg-(--ck-palette-surface-control) px-2.5 py-2 focus:border-(--ck-palette-border-focus)",
          disabledFill
        )
  );
};

const textareaFieldVariantClasses: Record<
  TextareaFieldVariant,
  (hasFooter: boolean) => string
> = {
  code: () => basicTextareaClass("code"),
  compact: () => basicTextareaClass("compact"),
  comparison: () =>
    cn(
      fieldBase,
      "min-h-45 w-full resize-none rounded-3xl border-(--ck-palette-border) bg-(--ck-palette-surface-surface) px-6 py-3 text-base leading-7 shadow-sm focus:border-(--ck-palette-border-focus) focus:ring-1 focus:ring-(--ck-palette-border-focus)"
    ),
  default: () => basicTextareaClass("default"),
  dialog: () => basicTextareaClass("dialog"),
  display: () =>
    cn(
      fieldBase,
      ghostHover,
      "min-h-20 w-full resize-none overflow-hidden rounded-sm bg-transparent px-2 py-1 text-center text-[length:var(--text-3xl)] leading-none font-semibold tracking-[inherit]"
    ),
  editor: () =>
    cn(
      fieldBase,
      "min-h-24 w-full resize-y rounded-md border-(--ck-palette-border-heavy) bg-(--ck-palette-surface-control) px-2.5 py-2 text-sm focus:border-(--ck-palette-border-focus) md:h-33 md:min-h-33 md:rounded-lg md:border-(--ck-palette-border) md:bg-(--ck-palette-surface-surface) md:p-3",
      disabledFill
    ),
  feedback: (hasFooter) =>
    cn(
      "min-h-20 w-full min-w-0 resize-y bg-transparent text-sm text-(--ck-palette-ink) outline-none placeholder:text-(--ck-palette-ink-tertiary)",
      hasFooter
        ? "border-0 p-0"
        : "rounded-xl border border-(--ck-palette-border) px-3 py-2 focus:border-(--ck-palette-border-focus)"
    ),
  ghost: () => basicTextareaClass("ghost"),
  outlined: () =>
    cn(
      fieldBase,
      "[field-sizing:content] max-h-80 min-h-28 w-full resize-none rounded-3xl border-(--ck-palette-border-light) bg-transparent p-5 text-base leading-6 focus:border-(--ck-palette-border-focus)"
    ),
  plain: () =>
    cn(
      fieldBase,
      "min-h-24 w-full resize-y rounded-md border-transparent bg-transparent p-0 text-sm focus-visible:ring-1 focus-visible:ring-(--ck-palette-border-focus)"
    ),
  rounded: () =>
    cn(
      fieldBase,
      "min-h-26 w-full resize-none rounded-3xl border-(--ck-palette-border-light) bg-[color-mix(in_oklab,var(--ck-palette-surface-surface-under)_92%,transparent)] px-4 py-4 text-base leading-5 focus:border-(--ck-palette-border-focus)",
      disabledFill
    ),
  segmented: () =>
    "w-full min-w-0 min-h-24 resize-y bg-transparent px-3 py-2 text-sm text-(--ck-palette-ink) outline-none placeholder:text-(--ck-palette-ink-tertiary) focus:outline-none! disabled:cursor-not-allowed disabled:text-(--ck-palette-ink-secondary)",
  settings: () => basicTextareaClass("settings"),
};

const textareaFieldVariantClass = (
  variant: TextareaFieldVariant,
  hasFooter: boolean
) => textareaFieldVariantClasses[variant](hasFooter);

const noCleanup = () => {
  // Nothing to undo for this variant.
};

const ringFocusVariants = new Set<TextareaFieldVariant>([
  "feedback",
  "settings",
  "compact",
]);

const TextareaField = ({
  autoResize = false,
  focusIndicator = "default",
  id,
  onInput,
  ref,
  value,
  variant = "default",
  trailingControl,
  footer,
  ...props
}: TextareaFieldProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldMergedRef = useMergedRef(ref, textareaRef);

  // The component re-fits when the value changes.
  /* oxlint-disable react/exhaustive-effect-dependencies -- value is the trigger, not an input of the fit. */
  useLayoutEffect(() => {
    const element = textareaRef.current;

    if (element === null) {
      return noCleanup;
    }

    if (variant !== "display") {
      if (autoResize) {
        resizeCapped(element);
      }

      return noCleanup;
    }

    const fit = () => {
      fitDisplayText(element);
    };

    fit();

    const observer = new ResizeObserver(fit);

    observer.observe(element);
    document.fonts?.addEventListener("loadingdone", fit);

    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [autoResize, value, variant]);
  /* oxlint-enable react/exhaustive-effect-dependencies */

  const hasFooter = isPresent(footer);

  const hasRing =
    ringFocusVariants.has(variant) &&
    !hasFooter &&
    focusIndicator === "default";

  const invalid = props["aria-invalid"];
  const disabled = props.disabled === true;

  const textarea = (
    <textarea
      {...props}
      id={id}
      ref={fieldMergedRef}
      className={cn(
        textareaFieldVariantClass(variant, hasFooter),
        hasRing && "focus:ring-1 focus:ring-(--ck-palette-border-focus)",
        variant === "code" && "font-mono"
      )}
      value={value}
      onInput={(event) => {
        if (variant === "display") {
          fitDisplayText(event.currentTarget);
        } else if (autoResize) {
          resizeCapped(event.currentTarget);
        }

        onInput?.(event);
      }}
    />
  );

  if (variant === "feedback" && hasFooter) {
    return (
      <div
        className={cn(
          fieldBase,
          "flex w-full flex-col rounded-xl border-(--ck-palette-border) bg-transparent p-3 focus-within:border-(--ck-palette-border-focus)",
          focusIndicator === "default" &&
            "focus-within:ring-1 focus-within:ring-(--ck-palette-border-focus)"
        )}
        aria-invalid={invalid}
      >
        {textarea}
        {footer}
      </div>
    );
  }

  if (variant === "segmented") {
    return (
      <div
        className={cn(
          fieldBase,
          "flex w-full items-start overflow-hidden rounded-xl border-(--ck-palette-border) bg-(--ck-palette-surface-control) focus-within:border-(--ck-palette-border-focus) forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-solid",
          disabled &&
            "bg-[color-mix(in_oklab,var(--ck-palette-ink)_5%,transparent)]"
        )}
        aria-invalid={invalid}
      >
        {textarea}
        {isPresent(trailingControl) ? (
          <div className="shrink-0 self-stretch border-s border-(--ck-palette-border)">
            <div className="flex h-10 items-center">{trailingControl}</div>
          </div>
        ) : null}
      </div>
    );
  }

  return textarea;
};

interface FieldErrorProps extends Omit<ComponentProps<"p">, "role"> {
  /** "compact" is the text-xs row size; the default is text-sm. */
  size?: "default" | "compact";
  /** The component uses p and div. */
  as?: "p" | "div";
}

// Inline field error. Render it only while the
// error exists: the role=alert element is announced when it appears.
const FieldError = ({
  as: Tag = "p",
  size = "default",
  className,
  ...props
}: FieldErrorProps) => (
  <Tag
    role="alert"
    className={cn(
      "text-(--field-danger) [--field-danger:var(--color-status-danger)]",
      size === "compact" ? "text-xs" : "text-sm",
      className
    )}
    {...props}
  />
);

export {
  FieldError,
  Input,
  InputGroup,
  TagInput,
  Textarea,
  TextareaField,
  TextInput,
  useMergedRef,
};

export type {
  ControlSize,
  FieldVariant,
  GutterSize,
  InputProps,
  Tag,
  TagDensity,
  TagInputProps,
  TextareaFieldProps,
  TextareaFieldVariant,
  TextareaProps,
  TextInputProps,
  TextInputVariant,
};
