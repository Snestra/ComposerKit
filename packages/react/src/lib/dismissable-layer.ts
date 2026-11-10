"use client";

/*
 * The Radix-style DismissableLayer stack, based on Radix UI. Dialogs, menus,
 * popovers and tooltips share it, so Escape and outside presses close only the
 * highest layer.
 */

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  FocusEventHandler,
  PointerEventHandler,
  RefCallback,
  RefObject,
} from "react";

/** An effect cleanup that does nothing, for effects that have nothing to undo. */
const noCleanup = () => {
  // Nothing was set up, so there is nothing to undo.
};

/* ------------------------------------------------------- cancelable event --- */

/** The Radix custom event: a type, the original DOM event and `preventDefault`. */
class LayerEvent {
  /** The content element the event is dispatched on (set by the content). */
  currentTarget: EventTarget | null = null;

  defaultPrevented = false;

  readonly detail: { originalEvent: Event } | undefined;

  readonly target: EventTarget | null;

  readonly type: string;

  constructor(type: string, originalEvent?: Event) {
    this.type = type;
    this.detail = originalEvent ? { originalEvent } : undefined;
    this.target = originalEvent?.target ?? null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

/** The event type names Radix uses; the Modal root guard tests them. */
const POINTER_DOWN_OUTSIDE = "dismissableLayer.pointerDownOutside";
const FOCUS_OUTSIDE = "dismissableLayer.focusOutside";

/* --------------------------------------------------------- dismiss layers --- */

interface Layer {
  readonly modal: boolean;
}

const layers: Layer[] = [];
let highestModalIndex = -1;
let originalBodyPointerEvents = "";

const layerListeners = new Set<() => void>();

const subscribeLayers = (listener: () => void) => {
  layerListeners.add(listener);

  return () => {
    layerListeners.delete(listener);
  };
};

const notifyLayers = () => {
  for (const listener of layerListeners) {
    listener();
  }
};

const syncHighestModal = () => {
  highestModalIndex = layers.findLastIndex((layer) => layer.modal);
};

/**
 * The shared `dismissableSurfaces` set (the default value of its
 * layer context, which no provider replaces). A press on one of these
 * elements, such as a dialog overlay, does not count as intercepted.
 */
const dismissableSurfaces = new Set<Element>();

/**
 * Returns a ref callback that
 * registers the element it receives as a dismissable surface.
 */
const useDismissableLayerSurface = (): RefCallback<HTMLElement> => {
  const [surface, setSurface] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!surface) {
      return noCleanup;
    }

    dismissableSurfaces.add(surface);

    return () => {
      dismissableSurfaces.delete(surface);
    };
  }, [surface]);

  return setSurface;
};

/** The events whose interception cancels a pending outside press. */
const PRESS_EVENT_TYPES = [
  "pointerup",
  "mousedown",
  "mouseup",
  "touchstart",
  "touchend",
  "click",
] as const;

interface DismissableLayerOptions {
  /** Whether the layer is mounted and listening. */
  active: boolean;
  /** Radix `disableOutsidePointerEvents`: the body ignores the pointer. */
  modal: boolean;
  onDismiss: () => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onFocusOutside?: (event: LayerEvent) => void;
  onInteractOutside?: (event: LayerEvent) => void;
  onPointerDownOutside?: (event: LayerEvent) => void;
}

interface DismissableLayerProps {
  handleBlurCapture: FocusEventHandler<HTMLElement>;
  handleFocusCapture: FocusEventHandler<HTMLElement>;
  handlePointerDownCapture: PointerEventHandler<HTMLElement>;
  style: { pointerEvents: "auto" | "none" } | undefined;
}

const useLatest = <T>(value: T): RefObject<T> => {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
};

/**
 * Radix DismissableLayer: Escape (document, capture phase) closes only the
 * highest layer; a pointer press outside (document, registered after a
 * timeout) and focus moving outside run the handlers, then dismiss unless one
 * prevented the default. The dialog sets `deferPointerDownOutside`, so
 * a left-button press waits for its click, and a press whose pointerup,
 * mousedown, mouseup, touchstart, touchend or click is stopped before it
 * reaches the document does not dismiss.
 * While such a press is pending, focus moving outside is ignored. A modal
 * layer turns the body's pointer events off and restores them.
 */
const useDismissableLayer = (
  options: DismissableLayerOptions
): DismissableLayerProps => {
  const latest = useLatest(options);
  const { active, modal } = options;
  const layer = useMemo<Layer>(() => ({ modal }), [modal]);
  const insidePointer = useRef(false);
  const insideFocus = useRef(false);
  const deferredPress = useRef(false);

  const version = useSyncExternalStore(
    subscribeLayers,
    () => highestModalIndex,
    () => -1
  );

  useEffect(() => {
    if (!active) {
      return noCleanup;
    }

    layers.push(layer);

    if (modal && layers.filter((entry) => entry.modal).length === 1) {
      originalBodyPointerEvents = document.body.style.pointerEvents;
      document.body.style.pointerEvents = "none";
    }

    syncHighestModal();
    notifyLayers();

    const isPointerEventsEnabled = () =>
      layers.indexOf(layer) >= highestModalIndex;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (layers.indexOf(layer) !== layers.length - 1) {
        return;
      }

      latest.current.onEscapeKeyDown?.(event);

      if (!event.defaultPrevented) {
        event.preventDefault();
        latest.current.onDismiss();
      }
    };

    const dispatch = (event: LayerEvent) => {
      if (event.type === POINTER_DOWN_OUTSIDE) {
        latest.current.onPointerDownOutside?.(event);
      } else {
        latest.current.onFocusOutside?.(event);
      }

      latest.current.onInteractOutside?.(event);

      if (!event.defaultPrevented) {
        latest.current.onDismiss();
      }
    };

    /* The press being followed: tracked from pointerdown until it is resolved. */
    let following = false;
    let clickHandler: () => void = noCleanup;
    const intercepted = new Map<string, boolean>();

    const resolve = () => {
      following = false;
      deferredPress.current = false;
      intercepted.clear();
    };

    const isIntercepted = () => [...intercepted.values()].some(Boolean);

    /* Capture phase: the event exists. Bubble phase: it reached the document. */
    const onPressCapture = (event: Event) => {
      if (!following) {
        return;
      }

      const { target } = event;

      if (
        !(
          target instanceof Node &&
          [...dismissableSurfaces].some((surface) => surface.contains(target))
        )
      ) {
        intercepted.set(event.type, true);
      }

      if (event.type === "click") {
        window.setTimeout(() => {
          if (following) {
            clickHandler();
          }
        }, 0);
      }
    };

    const onPressBubble = (event: Event) => {
      if (following) {
        intercepted.set(event.type, false);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.target && !insidePointer.current) {
        const fire = () => {
          document.removeEventListener("click", clickHandler);
          const wasIntercepted = isIntercepted();
          resolve();

          if (!wasIntercepted) {
            dispatch(new LayerEvent(POINTER_DOWN_OUTSIDE, event));
          }
        };

        if (!(event.target instanceof Node && isPointerEventsEnabled())) {
          document.removeEventListener("click", clickHandler);
          resolve();
          insidePointer.current = false;

          return;
        }

        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        following = true;
        deferredPress.current = event.button === 0;
        intercepted.clear();

        if (event.button === 0) {
          document.removeEventListener("click", clickHandler);
          clickHandler = fire;
          document.addEventListener("click", fire, { once: true });
        } else {
          fire();
        }
      } else {
        document.removeEventListener("click", clickHandler);
        resolve();
      }

      insidePointer.current = false;
    };

    const onFocusIn = (event: FocusEvent) => {
      if (event.target && !insideFocus.current && !deferredPress.current) {
        dispatch(new LayerEvent(FOCUS_OUTSIDE, event));
      }
    };

    for (const type of PRESS_EVENT_TYPES) {
      document.addEventListener(type, onPressCapture, true);
      document.addEventListener(type, onPressBubble);
    }

    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);

    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("focusin", onFocusIn);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("click", clickHandler);

      for (const type of PRESS_EVENT_TYPES) {
        document.removeEventListener(type, onPressCapture, true);
        document.removeEventListener(type, onPressBubble);
      }

      const index = layers.indexOf(layer);

      if (index !== -1) {
        layers.splice(index, 1);
      }

      if (modal && !layers.some((entry) => entry.modal)) {
        document.body.style.pointerEvents = originalBodyPointerEvents;
      }

      syncHighestModal();
      notifyLayers();
    };
  }, [active, modal, latest, layer]);

  const index = useSyncExternalStore(
    subscribeLayers,
    () => layers.indexOf(layer),
    () => -1
  );

  const bodyDisabled = version >= 0;
  let pointerEvents: "auto" | "none" | undefined;

  if (bodyDisabled) {
    pointerEvents = index >= version ? "auto" : "none";
  }

  return {
    handleBlurCapture: () => {
      insideFocus.current = false;
    },
    handleFocusCapture: () => {
      insideFocus.current = true;
    },
    handlePointerDownCapture: () => {
      insidePointer.current = true;
    },
    style: pointerEvents === undefined ? undefined : { pointerEvents },
  };
};

export {
  FOCUS_OUTSIDE,
  LayerEvent,
  POINTER_DOWN_OUTSIDE,
  noCleanup,
  useDismissableLayer,
  useDismissableLayerSurface,
  useLatest,
};

export type { DismissableLayerOptions, DismissableLayerProps };
