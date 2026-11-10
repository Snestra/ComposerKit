"use client";

/* oxlint-disable react/no-react-children -- the group walks its children with React.Children to find the keyed elements, so loose and nested children behave as they do there */

import {
  afterFrames,
  useMediaQuery,
} from "@workspace/react/components/dialog/dialog-layer";
import { useLatest } from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
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
import type { CSSProperties, ReactElement, ReactNode } from "react";

import styles from "./date-picker.module.css";

/*
 * A TransitionGroup: keeps a child
 * mounted after it leaves `children`, runs the entering and exiting phases as
 * data attributes on a wrapper span, and removes the child when the exit
 * duration ends. With reduced motion the group renders its children directly.
 */

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

const initialPhase = (preventMountTransition: boolean): Phase => ({
  ...IDLE,
  enter: !preventMountTransition,
});

const reducePhase = (state: Phase, action: PhaseAction): Phase => {
  switch (action) {
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

    case "done": {
      return IDLE;
    }

    default: {
      return state;
    }
  }
};

const flag = (on: boolean) => (on ? "" : undefined);

interface TransitionChildProps {
  children: ReactNode;
  className?: string;
  enterDuration: number;
  exitDuration: number;
  itemKey: string;
  onRemove: (key: string) => void;
  preventMountTransition: boolean;
  shouldRender: boolean;
  style?: CSSProperties;
}

const TransitionChild = ({
  children,
  className,
  enterDuration,
  exitDuration,
  itemKey,
  onRemove,
  preventMountTransition,
  shouldRender,
  style,
}: TransitionChildProps) => {
  // Stable per item, as the `removeChild`: a new function would restart the phase timers on every render.
  const removeChild = useCallback(() => {
    onRemove(itemKey);
  }, [onRemove, itemKey]);

  const [phase, dispatch] = useReducer(
    reducePhase,
    preventMountTransition,
    initialPhase
  );

  const mounted = useRef(false);
  const enterMs = useLatest(enterDuration);
  const exitMs = useLatest(exitDuration);

  useLayoutEffect(() => {
    let timer: number | undefined;

    if (shouldRender) {
      if (preventMountTransition && !mounted.current) {
        mounted.current = true;

        return;
      }

      dispatch("enter-before");
    } else {
      dispatch("exit-before");
    }

    const cancel = afterFrames(() => {
      if (shouldRender) {
        dispatch("enter-active");
        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        timer = window.setTimeout(() => {
          dispatch("done");
        }, enterMs.current);
      } else {
        dispatch("exit-active");
        timer = window.setTimeout(removeChild, exitMs.current);
      }
    });

    // oxlint-disable-next-line consistent-return -- the first branch returns early when there is nothing to undo
    return () => {
      cancel();

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [shouldRender, preventMountTransition, removeChild, enterMs, exitMs]);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  return (
    <span
      className={cn(className, styles.transitionChild)}
      data-entering={flag(phase.enter)}
      data-entering-active={flag(phase.enterActive)}
      data-exiting={flag(phase.exit)}
      data-exiting-active={flag(phase.exitActive)}
      data-interrupted={flag(phase.interrupted)}
      style={style}
    >
      {children}
    </span>
  );
};

interface Item {
  element: ReactElement;
  key: string;
  preventMountTransition: boolean;
  shouldRender: boolean;
}

const keyedChildren = (children: ReactNode): ReactElement[] => {
  const elements: ReactElement[] = [];

  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.key !== null) {
      elements.push(child);
    }
  }

  return elements;
};

/** The child list with the default `append` insert method. */
const mergeItems = (children: ReactElement[], items: Item[]): Item[] => {
  const incoming = new Set(children.map((child) => String(child.key)));
  const existing = new Set(items.map((item) => item.key));
  const added: Item[] = [];

  for (const child of children) {
    const key = String(child.key);

    if (!existing.has(key)) {
      added.push({
        element: child,
        key,
        preventMountTransition: false,
        shouldRender: true,
      });
    }
  }

  const updated = items.map((item) => ({
    ...item,
    element:
      children.find((child) => String(child.key) === item.key) ?? item.element,
    shouldRender: incoming.has(item.key),
  }));

  return [...updated, ...added];
};

export interface TransitionGroupProps {
  children?: ReactNode;
  className?: string;
  enterDuration?: number;
  exitDuration?: number;
  /** Children present on the first render do not animate in (default true). */
  preventInitialTransition?: boolean;
  style?: CSSProperties;
}

/** The TransitionGroup: every keyed child gets a `span` wrapper. */
export const TransitionGroup = ({
  children,
  className,
  enterDuration = 0,
  exitDuration = 0,
  preventInitialTransition = true,
  style,
}: TransitionGroupProps) => {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const elements = keyedChildren(children);

  const [items, setItems] = useState<Item[]>(() =>
    elements.map((element) => ({
      element,
      key: String(element.key),
      preventMountTransition: preventInitialTransition,
      shouldRender: true,
    }))
  );

  const [seenChildren, setSeenChildren] = useState(children);

  // The component merges in a layout effect. Merging while rendering commits the
  // same state before paint without an extra render.
  if (children !== seenChildren) {
    setSeenChildren(children);
    setItems((current) => mergeItems(elements, current));
  }

  const removeChild = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  if (reducedMotion) {
    return (
      <>
        {elements.map((element) => (
          <span className={className} key={element.key} style={style}>
            {element}
          </span>
        ))}
      </>
    );
  }

  const latest = new Map(
    elements.map((element) => [String(element.key), element])
  );

  return (
    <>
      {items.map((item) => (
        <TransitionChild
          className={className}
          enterDuration={enterDuration}
          exitDuration={exitDuration}
          itemKey={item.key}
          key={item.key}
          onRemove={removeChild}
          preventMountTransition={item.preventMountTransition}
          shouldRender={item.shouldRender}
          style={style}
        >
          {latest.get(item.key) ?? item.element}
        </TransitionChild>
      ))}
    </>
  );
};
