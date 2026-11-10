"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { ReactNode } from "react";

/*
 * Shared ResizeObserver: the provider creates the one observer, helpers add
 * and remove an element's listeners, and a hook subscribes.
 * One observer serves every descendant: each observed element keeps a set of
 * listeners and its last entry, which a late subscriber receives at once.
 */

type ResizeListener = (entry: ResizeObserverEntry) => void;

interface ObservedElement extends Element {
  [listenersKey]?: Set<ResizeListener>;
  [entryKey]?: ResizeObserverEntry;
}

const listenersKey = Symbol("resizeObserverCallbacks");
const entryKey = Symbol("resizeObserverLastEntry");

const createSharedResizeObserver = (): ResizeObserver | null =>
  typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver((entries) => {
        for (const entry of entries) {
          const target: ObservedElement = entry.target;
          const listeners = target[listenersKey];

          if (listeners) {
            target[entryKey] = entry;

            for (const listener of listeners) {
              listener(entry);
            }
          }
        }
      });

interface Subscription {
  listener: ResizeListener;
  element: ObservedElement;
  observer: ResizeObserver | null;
}

const subscribe = ({ listener, element, observer }: Subscription) => {
  const listeners = element[listenersKey];

  if (listeners) {
    listeners.add(listener);

    const last = element[entryKey];

    if (last) {
      listener(last);
    }

    return;
  }

  element[listenersKey] = new Set([listener]);
  observer?.observe(element);
};

const unsubscribe = ({ listener, element, observer }: Subscription) => {
  const listeners = element[listenersKey];

  if (!listeners) {
    return;
  }

  listeners.delete(listener);

  if (listeners.size === 0) {
    element[listenersKey] = undefined;
    element[entryKey] = undefined;
    observer?.unobserve(element);
  }
};

const ResizeObserverContext = createContext<ResizeObserver | null>(null);

interface ResizeObserverProviderProps {
  children?: ReactNode;
}

/** Supplies one ResizeObserver to descendants and disconnects it on unmount. */
const ResizeObserverProvider = ({ children }: ResizeObserverProviderProps) => {
  const observer = useMemo(() => createSharedResizeObserver(), []);

  useEffect(
    () => () => {
      observer?.disconnect();
    },
    [observer]
  );

  return (
    <ResizeObserverContext value={observer}>{children}</ResizeObserverContext>
  );
};

/**
 * Returns a ref listener that observes the element it is attached
 * to and passes each entry and the element to `onResize`.
 */
const useResizeObserver = (
  onResize: (entry: ResizeObserverEntry, element: Element) => void
) => {
  const observer = useContext(ResizeObserverContext);
  const element = useRef<Element | null>(null);
  const latest = useRef(onResize);

  useEffect(() => {
    latest.current = onResize;
  }, [onResize]);

  const listener = useCallback<ResizeListener>((entry) => {
    const { current } = element;

    if (current) {
      latest.current(entry, current);
    }
  }, []);

  return useCallback(
    (next: Element | null) => {
      if (!observer) {
        throw new Error(
          "ResizeObserverProvider is required before calling useResizeObserver."
        );
      }

      if (element.current === next) {
        return;
      }

      if (element.current) {
        unsubscribe({ element: element.current, listener, observer });
      }

      element.current = next;

      if (next) {
        subscribe({ element: next, listener, observer });
      }
    },
    [listener, observer]
  );
};

export { ResizeObserverProvider, useResizeObserver };

export type { ResizeObserverProviderProps };
