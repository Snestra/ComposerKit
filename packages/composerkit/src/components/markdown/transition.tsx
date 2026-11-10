"use client";

/* oxlint-disable anti-slop/no-array-filter-map -- Stylistic. */
/* oxlint-disable anti-slop/no-runtime-typeof -- A value may be a string or a list, or a value or a function, as in the components. */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: custom properties in style objects, children props read after an element check, and regex matches checked before use. */
/* oxlint-disable eslint/complexity -- The parsers are single-pass state machines that follow the reference algorithms branch for branch. */
/* oxlint-disable node/callback-return, promise/prefer-await-to-callbacks -- The frame helper calls the caller's callback. */
/* oxlint-disable react/no-react-children -- The renderer reads and maps text children. */
/* oxlint-disable react/refs -- The component keeps the latest props in refs during render so timers read current values. */
/* oxlint-disable react/set-state-in-effect -- The group child reconciles its keyed children in a layout effect. */
/* oxlint-disable typescript/consistent-return -- Effects and ref callbacks return a cleanup only when they registered something. */
/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional flags, regex groups and empty strings by truthiness, as react-markdown and the component do. */
/* oxlint-disable typescript/switch-exhaustiveness-check -- The reducer and decoration switches end in a default that returns the idle state. */

import { cn } from "composerkit/lib/utils";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  ElementType,
  ReactElement,
  ReactNode,
} from "react";

/**
 * A keyed presence transition. A keyed child
 * that leaves stays mounted until its exit duration passes; a child that
 * arrives enters on the second frame after it mounts.
 */

const DEFAULT_ENTER_DURATION = 480;
const DEFAULT_EXIT_DURATION = 320;
const DEFAULT_PLAIN_ENTER_DURATION = 420;
const DEFAULT_PLAIN_EXIT_DURATION = 220;
const FRAMES_BEFORE_ACTIVE = 2;

/** Runs `callback` after `frames` animation frames. */
const afterFrames = (callback: () => void, frames = FRAMES_BEFORE_ACTIVE) => {
  const viaTimeout = () => {
    const id = setTimeout(callback, 0);

    return () => {
      clearTimeout(id);
    };
  };

  if (
    typeof window.requestAnimationFrame !== "function" ||
    document.visibilityState === "hidden"
  ) {
    return viaTimeout();
  }

  let remaining = frames;
  let handle = 0;

  const tick = () => {
    remaining -= 1;

    if (remaining === 0) {
      callback();
    } else {
      handle = window.requestAnimationFrame(tick);
    }
  };

  handle = window.requestAnimationFrame(tick);

  return () => {
    if (typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(handle);
    }
  };
};

/** The raw prefers-reduced-motion query. */
const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface PhaseState {
  enter: boolean;
  enterActive: boolean;
  exit: boolean;
  exitActive: boolean;
  interrupted: boolean;
}

type PhaseAction =
  | { type: "enter-before" }
  | { type: "enter-active" }
  | { type: "exit-before" }
  | { type: "exit-active" }
  | { type: "done" };

const IDLE: PhaseState = {
  enter: false,
  enterActive: false,
  exit: false,
  exitActive: false,
  interrupted: false,
};

const phaseReducer = (state: PhaseState, action: PhaseAction): PhaseState => {
  switch (action.type) {
    case "enter-before": {
      return {
        enter: true,
        enterActive: false,
        exit: false,
        exitActive: false,
        interrupted: state.interrupted || state.exit,
      };
    }

    case "enter-active": {
      return {
        enter: true,
        enterActive: true,
        exit: false,
        exitActive: false,
        interrupted: false,
      };
    }

    case "exit-before": {
      return {
        enter: false,
        enterActive: false,
        exit: true,
        exitActive: false,
        interrupted: state.interrupted || state.enter,
      };
    }

    case "exit-active": {
      return {
        enter: false,
        enterActive: false,
        exit: true,
        exitActive: true,
        interrupted: false,
      };
    }

    default: {
      return IDLE;
    }
  }
};

const flag = (on: boolean) => (on ? "" : undefined);

interface ChildItem {
  element: ReactElement;
  preventMountTransition?: boolean;
  shouldRender: boolean;
}

interface TransitionChildProps {
  as: ElementType;
  children: ReactNode;
  className?: string;
  enterDuration: number;
  exitDuration: number;
  onExited: () => void;
  preventMountTransition?: boolean;
  shouldRender: boolean;
  style?: CSSProperties;
}

const TransitionChild = ({
  as: Tag,
  children,
  className,
  enterDuration,
  exitDuration,
  onExited,
  preventMountTransition,
  shouldRender,
  style,
}: TransitionChildProps) => {
  const [phase, dispatch] = useReducer(
    phaseReducer,
    undefined,
    (): PhaseState => ({ ...IDLE, enter: !preventMountTransition })
  );

  const mounted = useRef(false);
  const enterRef = useRef(enterDuration);
  enterRef.current = enterDuration;
  const exitRef = useRef(exitDuration);
  exitRef.current = exitDuration;
  const exitedRef = useRef(onExited);
  exitedRef.current = onExited;

  useLayoutEffect(() => {
    let timer: number | undefined;

    if (!shouldRender) {
      dispatch({ type: "exit-before" });

      const cancel = afterFrames(() => {
        dispatch({ type: "exit-active" });
        timer = window.setTimeout(() => {
          exitedRef.current();
        }, exitRef.current);
      });

      return () => {
        cancel();

        if (timer !== undefined) {
          clearTimeout(timer);
        }
      };
    }

    if (preventMountTransition && !mounted.current) {
      mounted.current = true;

      return;
    }

    dispatch({ type: "enter-before" });

    const cancel = afterFrames(() => {
      dispatch({ type: "enter-active" });
      timer = window.setTimeout(() => {
        dispatch({ type: "done" });
      }, enterRef.current);
    });

    return () => {
      cancel();

      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [shouldRender, preventMountTransition]);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  return (
    <Tag
      className={cn(className, "block")}
      data-entering={flag(phase.enter)}
      data-entering-active={flag(phase.enterActive)}
      data-exiting={flag(phase.exit)}
      data-exiting-active={flag(phase.exitActive)}
      data-interrupted={flag(phase.interrupted)}
      style={style}
    >
      {children}
    </Tag>
  );
};

const keyedChildren = (children: ReactNode): ReactElement[] => {
  const keyed: ReactElement[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.key !== null) {
      keyed.push(child);
    } else if (child) {
      throw new Error("Give each TransitionGroup child its own React key");
    }
  });

  return keyed;
};

const mergeItems = (
  next: ReactElement[],
  previous: ChildItem[],
  insertMethod: "append" | "prepend"
): ChildItem[] => {
  const nextKeys = new Set(next.map((child) => child.key));
  const previousKeys = new Set(previous.map((item) => item.element.key));

  const added = next
    .filter((child) => !previousKeys.has(child.key))
    .map((element): ChildItem => ({ element, shouldRender: true }));

  const kept = previous.map((item): ChildItem => ({
    ...item,
    element:
      next.find((child) => child.key === item.element.key) ?? item.element,
    shouldRender: nextKeys.has(item.element.key),
  }));

  return insertMethod === "append" ? [...kept, ...added] : [...added, ...kept];
};

export interface TransitionGroupProps {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  /** Skips the transitions. Default: the reduced-motion query. */
  disableAnimations?: boolean;
  enterDuration?: number;
  exitDuration?: number;
  insertMethod?: "append" | "prepend";
  preventInitialTransition?: boolean;
  style?: CSSProperties;
}

export const TransitionGroup = ({
  as = "span",
  children,
  className,
  disableAnimations,
  enterDuration = 0,
  exitDuration = 0,
  insertMethod = "append",
  preventInitialTransition = true,
  style,
}: TransitionGroupProps) => {
  const [items, setItems] = useState<ChildItem[]>(() =>
    keyedChildren(children).map((element) => ({
      element,
      preventMountTransition: preventInitialTransition,
      shouldRender: true,
    }))
  );

  const Tag = as;

  useLayoutEffect(() => {
    setItems((previous) =>
      mergeItems(keyedChildren(children), previous, insertMethod)
    );
  }, [children, insertMethod]);

  const removeChild = useCallback((key: ReactElement["key"]) => {
    setItems((previous) => previous.filter((item) => item.element.key !== key));
  }, []);

  if (disableAnimations ?? prefersReducedMotion()) {
    return (
      <>
        {keyedChildren(children).map((element) => (
          <Tag className={className} key={element.key} style={style}>
            {element}
          </Tag>
        ))}
      </>
    );
  }

  const current = new Map(
    keyedChildren(children).map((element) => [element.key, element])
  );

  return (
    <>
      {items.map((item) => {
        const element = current.get(item.element.key) ?? item.element;

        return (
          <TransitionChild
            as={as}
            className={className}
            enterDuration={enterDuration}
            exitDuration={exitDuration}
            key={element.key}
            onExited={() => {
              removeChild(element.key);
            }}
            preventMountTransition={item.preventMountTransition}
            shouldRender={item.shouldRender}
            style={style}
          >
            {element}
          </TransitionChild>
        );
      })}
    </>
  );
};

export interface TransitionMotion {
  /** Milliseconds. */
  delay?: number;
  duration?: number;
  opacity?: number;
  scale?: number;
  timingFunction?: string;
}

export interface TransitionItemProps {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  enter?: TransitionMotion;
  exit?: TransitionMotion;
  forceCompositeLayer?: boolean;
  initial?: TransitionMotion;
  insertMethod?: "append" | "prepend";
  preventInitialTransition?: boolean;
  /** Where entering and leaving items sit. Default `absolute`. */
  transitionPosition?: "absolute" | "static";
}

/**
 * States exclude each other so Tailwind variant order cannot change the result.
 */
const ITEM_STATE_CLASSES = [
  // [data-entering]: the initial values, no transition yet.
  "[&[data-entering]:not([data-entering-active]):not([data-interrupted])]:opacity-(--ck-presence-initial-opacity) [&[data-entering]:not([data-entering-active]):not([data-interrupted])]:[filter:var(--ck-presence-initial-filter)] [&[data-entering]:not([data-entering-active]):not([data-interrupted])]:transform-(--ck-presence-initial-transform)",
  // [data-exiting]: the enter values, no transition yet.
  "[&[data-exiting]:not([data-exiting-active]):not([data-interrupted])]:opacity-(--ck-presence-enter-opacity) [&[data-exiting]:not([data-exiting-active]):not([data-interrupted])]:[filter:var(--ck-presence-enter-filter)] [&[data-exiting]:not([data-exiting-active]):not([data-interrupted])]:transform-(--ck-presence-enter-transform)",
  // [data-entering-active]: the enter values with the enter transition.
  "[&[data-entering-active]]:opacity-(--ck-presence-enter-opacity) [&[data-entering-active]]:[filter:var(--ck-presence-enter-filter)] [&[data-entering-active]]:transform-(--ck-presence-enter-transform) [&[data-entering-active]]:[transition:opacity_var(--ck-presence-enter-duration)_var(--ck-presence-enter-timing-function)_var(--ck-presence-enter-delay),transform_var(--ck-presence-enter-duration)_var(--ck-presence-enter-timing-function)_var(--ck-presence-enter-delay),filter_var(--ck-presence-enter-duration)_var(--ck-presence-enter-timing-function)_var(--ck-presence-enter-delay)]",
  // [data-entering][data-interrupted]: the same, without the delay.
  "[&[data-entering][data-interrupted]]:opacity-(--ck-presence-enter-opacity) [&[data-entering][data-interrupted]]:[filter:var(--ck-presence-enter-filter)] [&[data-entering][data-interrupted]]:transform-(--ck-presence-enter-transform) [&[data-entering][data-interrupted]]:[transition:opacity_var(--ck-presence-enter-duration)_var(--ck-presence-enter-timing-function)_0s,transform_var(--ck-presence-enter-duration)_var(--ck-presence-enter-timing-function)_0s,filter_var(--ck-presence-enter-duration)_var(--ck-presence-enter-timing-function)_0s]",
  // [data-exiting-active]: the exit values with the exit transition.
  "[&[data-exiting-active]]:opacity-(--ck-presence-exit-opacity) [&[data-exiting-active]]:[filter:var(--ck-presence-exit-filter)] [&[data-exiting-active]]:transform-(--ck-presence-exit-transform) [&[data-exiting-active]]:[transition:opacity_var(--ck-presence-exit-duration)_var(--ck-presence-exit-timing-function)_var(--ck-presence-exit-delay),transform_var(--ck-presence-exit-duration)_var(--ck-presence-exit-timing-function)_var(--ck-presence-exit-delay),filter_var(--ck-presence-exit-duration)_var(--ck-presence-exit-timing-function)_var(--ck-presence-exit-delay)]",
  // [data-exiting][data-interrupted]: the same, without the delay.
  "[&[data-exiting][data-interrupted]]:opacity-(--ck-presence-exit-opacity) [&[data-exiting][data-interrupted]]:[filter:var(--ck-presence-exit-filter)] [&[data-exiting][data-interrupted]]:transform-(--ck-presence-exit-transform) [&[data-exiting][data-interrupted]]:[transition:opacity_var(--ck-presence-exit-duration)_var(--ck-presence-exit-timing-function)_0s,transform_var(--ck-presence-exit-duration)_var(--ck-presence-exit-timing-function)_0s,filter_var(--ck-presence-exit-duration)_var(--ck-presence-exit-timing-function)_0s]",
].join(" ");

// [data-ck-transition-position=absolute] rules: a leaving item, and an entering
// item that follows a sibling which is not leaving, stack over the others.
const ITEM_ABSOLUTE_CLASSES =
  "data-exiting:absolute data-exiting:top-0 data-exiting:left-0 data-exiting:w-full [:not([data-exiting])+&[data-entering]]:absolute [:not([data-exiting])+&[data-entering]]:top-0 [:not([data-exiting])+&[data-entering]]:left-0 [:not([data-exiting])+&[data-entering]]:w-full";

const transformOf = (motion?: TransitionMotion): string =>
  motion?.scale === undefined ? "none" : `scale(${motion.scale})`;

/**
 * Keyed presence with the enter, exit and initial motion held in
 * `--ck-presence-*` custom properties. The states use
 * Tailwind data-attribute variants on the group child.
 */
export const TransitionItem = ({
  as = "span",
  children,
  className,
  enter,
  exit,
  forceCompositeLayer,
  initial,
  insertMethod,
  preventInitialTransition,
  transitionPosition = "absolute",
}: TransitionItemProps) => {
  const initialTransform = transformOf(initial);
  const enterTransform = transformOf(enter);
  const exitTransform = transformOf(exit);

  const moving = [initialTransform, exitTransform, enterTransform].some(
    (value) => value !== "none"
  );

  const enterDuration =
    enter?.duration ??
    (moving ? DEFAULT_ENTER_DURATION : DEFAULT_PLAIN_ENTER_DURATION);

  const exitDuration =
    exit?.duration ??
    (moving ? DEFAULT_EXIT_DURATION : DEFAULT_PLAIN_EXIT_DURATION);

  const enterTiming =
    enter?.timingFunction ?? (moving ? "var(--ck-curve-enter)" : "ease");

  const exitTiming =
    exit?.timingFunction ?? (moving ? "var(--ck-curve-exit)" : "ease");

  const variables = {
    "--ck-presence-enter-delay": `${enter?.delay ?? 0}ms`,
    "--ck-presence-enter-duration": `${enterDuration}ms`,
    "--ck-presence-enter-filter": "none",
    "--ck-presence-enter-opacity": String(enter?.opacity ?? 1),
    "--ck-presence-enter-timing-function": enterTiming,
    "--ck-presence-enter-transform": enterTransform,
    "--ck-presence-exit-delay": `${exit?.delay ?? 0}ms`,
    "--ck-presence-exit-duration": `${exitDuration}ms`,
    "--ck-presence-exit-filter": "none",
    "--ck-presence-exit-opacity": String(exit?.opacity ?? 0),
    "--ck-presence-exit-timing-function": exitTiming,
    "--ck-presence-exit-transform": exitTransform,
    "--ck-presence-initial-filter": "none",
    "--ck-presence-initial-opacity": String(
      initial?.opacity ?? exit?.opacity ?? 0
    ),
    "--ck-presence-initial-transform":
      initialTransform === "none" ? exitTransform : initialTransform,
    "--ck-presence-will-change": forceCompositeLayer
      ? "transform, opacity"
      : "auto",
  } as CSSProperties;

  const Tag = as;

  return (
    <Tag
      className={cn(
        "block",
        transitionPosition === "absolute" && "relative",
        className
      )}
      data-ck-transition-position={transitionPosition}
      style={variables}
    >
      <TransitionGroup
        as={as}
        className={cn(
          "will-change-(--ck-presence-will-change)",
          ITEM_STATE_CLASSES,
          transitionPosition === "absolute" && ITEM_ABSOLUTE_CLASSES
        )}
        enterDuration={
          enter?.delay === undefined
            ? enterDuration
            : enter.delay + enterDuration
        }
        exitDuration={(exit?.delay ?? 0) + exitDuration}
        insertMethod={insertMethod}
        preventInitialTransition={preventInitialTransition}
      >
        {children}
      </TransitionGroup>
    </Tag>
  );
};
