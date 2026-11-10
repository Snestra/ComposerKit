"use client";

/* oxlint-disable react/no-react-children, react/no-clone-element, anti-slop/no-runtime-typeof -- the text wrapper walks and clones arbitrary children to put loose text in a span. */

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@workspace/react/lib/utils";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from "react";

import styles from "./data-button.module.css";

// The design-system Button, its LoadingIndicator, the transition group with
// its child state machine, and the text wrapper. The CSS module is
// data-button.module.css. There is no `pressable` mode, so `--scale` is never
// set and the pressed transform stays `none`. The root is Base UI's
// Button (a native `<button>` that blocks click and pointer down while
// disabled). Its own `data-disabled` follows `disabled` only, on purpose: a loading or inert button is natively disabled but not styled as such.

export type DataButtonColor =
  | "caution"
  | "danger"
  | "discovery"
  | "info"
  | "primary"
  | "secondary"
  | "success"
  | "warning";

export type DataButtonVariant =
  | "ghost"
  | "outline"
  | "soft"
  | "solid"
  | "surface"
  | "transparent";

export type DataButtonSize =
  | "2xl"
  | "2xs"
  | "3xl"
  | "3xs"
  | "4xl"
  | "lg"
  | "md"
  | "sm"
  | "xl"
  | "xs";

export type DataButtonGutterSize = "2xs" | "lg" | "md" | "sm" | "xl" | "xs";

export type DataButtonIconSize = "2xl" | "lg" | "md" | "sm" | "xl" | "xs";

export interface DataButtonProps extends Omit<
  ComponentProps<"button">,
  "color" | "ref"
> {
  /** Moves the button out by its gutter so its content lines up. */
  opticallyAlign?: "end" | "start";
  /** Width 100%. */
  block?: boolean;
  color?: DataButtonColor;
  /** `relaxed` keeps the default cursor, `dimmed` fades the disabled look. */
  disabledTone?: "dimmed" | "relaxed";
  gutterSize?: DataButtonGutterSize;
  iconSize?: DataButtonIconSize;
  /** Disables the button like `loading` does. Defaults to `loading`. */
  inert?: boolean;
  /** Shows the loader over the faded content and disables the button. */
  loading?: boolean;
  /** Fully rounded (default). Ignored when `squircle` is set. */
  pill?: boolean;
  ref?: Ref<HTMLButtonElement>;
  /** `false` suppresses the pressed look while the button is selected. */
  selected?: boolean;
  size?: DataButtonSize;
  squircle?: boolean;
  /** Square, icon-only button. */
  uniform?: boolean;
  variant?: DataButtonVariant;
}

// Loose text next to other children gets its own span so the
// content flex row keeps the text as one item.
const mergeText = (children: ReactNode) => {
  const merged: ReactNode[] = [];
  let text = "";

  for (const child of Children.toArray(children)) {
    if (typeof child === "string" || typeof child === "number") {
      text += String(child);
    } else {
      if (text !== "") {
        merged.push(text);
        text = "";
      }

      merged.push(child);
    }
  }

  if (text !== "") {
    merged.push(text);
  }

  return merged;
};

const wrapText = (children: ReactNode): ReactNode => {
  const merged = mergeText(children);

  // oxlint-disable-next-line typescript/promise-function-async -- ReactNode includes promises, but these callbacks return content synchronously.
  return merged.map((child, index) => {
    if (typeof child === "string" && child.trim() !== "") {
      return merged.length > 1 ? <span key={index}>{child}</span> : child;
    }

    if (isValidElement<{ children?: ReactNode }>(child)) {
      const { children: inner, ...rest } = child.props;

      if (inner !== null && inner !== undefined) {
        return cloneElement(child, rest, wrapText(inner));
      }
    }

    return child;
  });
};

const noop = () => {
  /* nothing to clean up */
};

// Loader entry and exit durations.
const ENTER_DURATION = 240;
const EXIT_DURATION = 160;
const TRANSITION_FRAMES = 2;

interface Phase {
  enter: boolean;
  enterActive: boolean;
  exit: boolean;
  exitActive: boolean;
  interrupted: boolean;
}

type PhaseAction =
  | "done"
  | "enter-active"
  | "enter-before"
  | "exit-active"
  | "exit-before";

const IDLE: Phase = {
  enter: false,
  enterActive: false,
  exit: false,
  exitActive: false,
  interrupted: false,
};

const nextPhase = (phase: Phase, action: PhaseAction): Phase => {
  if (action === "enter-before") {
    return {
      enter: true,
      enterActive: false,
      exit: false,
      exitActive: false,
      interrupted: phase.interrupted || phase.exit,
    };
  }

  if (action === "enter-active") {
    return { ...IDLE, enter: true, enterActive: true };
  }

  if (action === "exit-before") {
    return {
      enter: false,
      enterActive: false,
      exit: true,
      exitActive: false,
      interrupted: phase.interrupted || phase.enter,
    };
  }

  return action === "exit-active"
    ? { ...IDLE, exit: true, exitActive: true }
    : IDLE;
};

// Run after two animation frames, or on a timeout when the page is hidden.
const afterFrames = (run: () => void) => {
  if (
    typeof window.requestAnimationFrame !== "function" ||
    document.visibilityState === "hidden"
  ) {
    const timer = setTimeout(run, 0);

    return () => {
      clearTimeout(timer);
    };
  }

  let frames = TRANSITION_FRAMES;
  let handle = 0;

  const tick = () => {
    frames -= 1;

    if (frames === 0) {
      run();
    } else {
      handle = window.requestAnimationFrame(tick);
    }
  };

  handle = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(handle);
  };
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);

  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
};

const reducedMotionSnapshot = () => window.matchMedia(REDUCED_MOTION).matches;

const serverReducedMotion = () => false;

export interface LoadingIndicatorProps extends ComponentProps<"div"> {
  /** The spinner's width and height (`--progress-ring-size`). */
  size?: string;
  /** The ring's thickness (`--progress-ring-width`). */
  strokeWidth?: string;
}

/**
 * The loader: a spinning
 * ring sized by `size` and `strokeWidth`. SelectControl shows it for `loading`.
 */
export const LoadingIndicator = ({
  className,
  size,
  strokeWidth,
  style,
  ...props
}: LoadingIndicatorProps) => (
  <div
    {...props}
    className={cn(styles.indicator, className)}
    style={
      style ??
      // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: both keys are `--name` custom properties with string values, which CSSProperties accepts
      ({
        "--progress-ring-size": size,
        "--progress-ring-width": strokeWidth,
      } as CSSProperties)
    }
  />
);

interface LoaderChildProps {
  children: ReactNode;
  onExited: () => void;
  preventMountTransition: boolean;
  shouldRender: boolean;
}

// The entering and exiting states set data attributes the CSS fades on.
const LoaderChild = ({
  children,
  onExited,
  preventMountTransition,
  shouldRender,
}: LoaderChildProps) => {
  const [phase, dispatch] = useReducer(nextPhase, undefined, () => ({
    ...IDLE,
    enter: !preventMountTransition,
  }));

  const mounted = useRef(false);

  useLayoutEffect(() => {
    let timer: number | undefined;
    let cancel: () => void;

    if (shouldRender) {
      if (preventMountTransition && !mounted.current) {
        mounted.current = true;

        return noop;
      }

      dispatch("enter-before");
      cancel = afterFrames(() => {
        dispatch("enter-active");
        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        timer = window.setTimeout(() => {
          dispatch("done");
        }, ENTER_DURATION);
      });
    } else {
      dispatch("exit-before");
      cancel = afterFrames(() => {
        dispatch("exit-active");
        timer = window.setTimeout(onExited, EXIT_DURATION);
      });
    }

    return () => {
      cancel();

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [shouldRender, preventMountTransition, onExited]);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  return (
    <span
      className={cn(styles.loader, styles.transitionChild)}
      data-entering={phase.enter ? "" : undefined}
      data-entering-active={phase.enterActive ? "" : undefined}
      data-exiting={phase.exit ? "" : undefined}
      data-exiting-active={phase.exitActive ? "" : undefined}
      data-interrupted={phase.interrupted ? "" : undefined}
    >
      {children}
    </span>
  );
};

interface LoaderEntry {
  preventMountTransition: boolean;
  shouldRender: boolean;
}

const ButtonLoader = ({ loading }: { loading: boolean }) => {
  // Reduced motion turns animations off, so the loader appears
  // and disappears without the entering and exiting states.
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    serverReducedMotion
  );

  const [entry, setEntry] = useState<LoaderEntry | null>(
    loading ? { preventMountTransition: true, shouldRender: true } : null
  );

  const [wasLoading, setWasLoading] = useState(loading);

  // The transition group merges the children into its list in a layout effect. Doing it while
  // rendering commits the same state before paint without an extra render.
  if (loading !== wasLoading) {
    setWasLoading(loading);
    setEntry(
      loading
        ? {
            preventMountTransition: entry?.preventMountTransition ?? false,
            shouldRender: true,
          }
        : entry && { ...entry, shouldRender: false }
    );
  }

  const remove = useCallback(() => {
    setEntry((current) => (current?.shouldRender === true ? current : null));
  }, []);

  if (reduced) {
    return loading ? (
      <span className={styles.loader}>
        <LoadingIndicator />
      </span>
    ) : null;
  }

  if (!entry) {
    return null;
  }

  return (
    <LoaderChild
      onExited={remove}
      preventMountTransition={entry.preventMountTransition}
      shouldRender={entry.shouldRender}
    >
      <LoadingIndicator />
    </LoaderChild>
  );
};

// Boolean data attributes are present, with an empty value, or absent.
const flag = (on: boolean | undefined) => (on === true ? "" : undefined);

/**
 * The design-system Button: a Base UI Button (a native `<button>`)
 * whose look comes from data attributes. `loading` fades the content out, fades the loader in and
 * disables the button.
 */
export const DataButton = ({
  block,
  children,
  className,
  color = "primary",
  disabled,
  disabledTone,
  gutterSize,
  iconSize,
  inert,
  loading,
  onClick,
  opticallyAlign,
  pill = true,
  ref,
  selected,
  size = "xs",
  squircle,
  type = "button",
  uniform = false,
  variant = "solid",
  ...props
}: DataButtonProps): ReactElement => {
  const isSquircle = squircle ?? !pill;
  const isInert = inert ?? loading;
  const isDisabled = disabled === true ? true : isInert;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled !== true) {
      onClick?.(event);
    }
  };

  return (
    <ButtonPrimitive
      aria-disabled={isDisabled}
      className={cn(styles.button, className)}
      data-block={flag(block)}
      data-color={color}
      data-disabled={flag(disabled)}
      data-disabled-tone={disabled === true ? disabledTone : undefined}
      data-gutter-size={gutterSize}
      data-icon-size={iconSize}
      data-loading={flag(loading)}
      data-ck-optically-align={opticallyAlign}
      data-pill={flag(pill && !isSquircle)}
      data-selected={flag(selected)}
      data-size={size}
      data-ck-squircle={flag(isSquircle)}
      data-ck-suppress-active-style={flag(selected === false)}
      data-uniform={flag(uniform)}
      data-variant={variant}
      disabled={isDisabled}
      onClick={handleClick}
      ref={ref}
      tabIndex={isDisabled === true ? -1 : undefined}
      type={type}
      {...props}
    >
      <ButtonLoader loading={loading === true} />
      <span className={styles.inner}>{wrapText(children)}</span>
    </ButtonPrimitive>
  );
};
