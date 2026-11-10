"use client";

/* oxlint-disable eslint/complexity, shadcn/no-inline-styles, shadcn/no-arbitrary-values, jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- The panel resizer is one component per half that branches on edge, hit area, indicator and keyboard mode. It positions a top-layer overlay with CSS anchor names and puts role=separator, a tab stop and key handlers on a div. */

import { cn } from "@workspace/react/lib/utils";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

import styles from "@workspace/react/components/panes/panes.module.css";

type ResizerEdge = "bottom" | "left" | "right" | "top";

type ResizerHitArea = "after" | "centered" | "inside" | "outside";

type ResizerIndicator = "gradient" | "inset-solid" | "solid";

type ResizerIndicatorVisibility = "always" | "hover";

interface PanelResizerProps {
  action?: ReactNode;
  allowPointerOverflow?: boolean;
  ariaLabel?: string;
  currentSize?: number;
  defaultSize?: number;
  edge?: ResizerEdge;
  extendIntoToolbar?: boolean | "titlebar";
  getCurrentSize: () => number;
  hitArea?: ResizerHitArea;
  indicator?: ResizerIndicator;
  indicatorVisibility?: ResizerIndicatorVisibility;
  keyboardStep?: number;
  maximumSize?: number;
  minimumSize?: number;
  onResizeEnd?: (size: number) => void;
  onResizingChange?: (resizing: boolean) => void;
  renderInTopLayer?: boolean;
  setSize: (size: number) => void;
}

interface DragState {
  actionTarget: HTMLElement | null;
  captureTarget: HTMLElement;
  didMove: boolean;
  lastSize: number;
  pointerId: number;
  startPointer: { x: number; y: number };
  startSize: number;
}

const ACTION_DRAG_THRESHOLD = 6;
const DEFAULT_KEYBOARD_STEP = 10;

const OPEN_LAYER_SELECTOR =
  '[role="menu"][data-state="open"], [role="dialog"][data-state="open"]:not([aria-modal="false"])';

const LAYER_SELECTOR = '[role="menu"], [role="dialog"]';

const clampSize = (size: number, minimum?: number, maximum?: number) =>
  Math.min(
    Math.max(size, minimum ?? Number.NEGATIVE_INFINITY),
    maximum ?? Number.POSITIVE_INFINITY
  );

const isHorizontal = (edge: ResizerEdge) => edge === "left" || edge === "right";

const draggedSize = (
  edge: ResizerEdge,
  pointer: { x: number; y: number },
  drag: DragState
) => {
  const delta = isHorizontal(edge)
    ? pointer.x - drag.startPointer.x
    : pointer.y - drag.startPointer.y;

  return edge === "bottom" || edge === "right"
    ? drag.startSize + delta
    : drag.startSize - delta;
};

interface KeyResizeOptions {
  currentSize: number;
  edge: ResizerEdge;
  key: string;
  keyboardStep: number;
  maximumSize?: number;
  minimumSize?: number;
}

const horizontalDelta = (edge: ResizerEdge, key: string, step: number) => {
  if (key === "ArrowLeft") {
    return edge === "left" ? step : -step;
  }

  if (key === "ArrowRight") {
    return edge === "right" ? step : -step;
  }

  return null;
};

const verticalDelta = (edge: ResizerEdge, key: string, step: number) => {
  if (key === "ArrowUp") {
    return edge === "top" ? step : -step;
  }

  if (key === "ArrowDown") {
    return edge === "bottom" ? step : -step;
  }

  return null;
};

const arrowDelta = (edge: ResizerEdge, key: string, step: number) =>
  isHorizontal(edge)
    ? horizontalDelta(edge, key, step)
    : verticalDelta(edge, key, step);

const keyboardSize = ({
  currentSize,
  edge,
  key,
  keyboardStep,
  maximumSize,
  minimumSize,
}: KeyResizeOptions) => {
  if (key === "Home") {
    return minimumSize ?? null;
  }

  if (key === "End") {
    return maximumSize ?? null;
  }

  const delta = arrowDelta(edge, key, keyboardStep);

  return delta === null
    ? null
    : clampSize(currentSize + delta, minimumSize, maximumSize);
};

const layerIsOpen = () => document.querySelector(OPEN_LAYER_SELECTOR) !== null;

const observeLayers = (onChange: () => void) => {
  const observer = new MutationObserver((records) => {
    const touched = records.some((record) => {
      if (record.type === "attributes") {
        return (
          record.target instanceof Element &&
          (record.target.matches(LAYER_SELECTOR) ||
            (record.attributeName === "role" &&
              (record.oldValue === "menu" || record.oldValue === "dialog")))
        );
      }

      return [...record.addedNodes, ...record.removedNodes].some(
        (node) =>
          node instanceof Element &&
          (node.matches(LAYER_SELECTOR) ||
            node.querySelector(LAYER_SELECTOR) !== null)
      );
    });

    if (touched) {
      onChange();
    }
  });

  observer.observe(document.body, {
    attributeFilter: ["role", "data-state", "aria-modal"],
    attributeOldValue: true,
    attributes: true,
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
  };
};

const noCleanup = () => {
  // There is nothing to undo when the element is missing.
};

const overlayRef = (element: HTMLDivElement | null) => {
  if (element === null || !("showPopover" in element)) {
    return noCleanup;
  }

  const sync = () => {
    const visibility = layerIsOpen() ? "hidden" : "";

    if (element.style.visibility !== visibility) {
      element.style.visibility = visibility;
    }
  };

  const stopObserving = observeLayers(sync);

  sync();
  element.setAttribute("popover", "manual");
  element.showPopover();

  return () => {
    stopObserving();
    element.style.visibility = "";

    if (element.matches(":popover-open")) {
      element.hidePopover();
    }

    element.removeAttribute("popover");
  };
};

const wrapperClassName = (
  edge: ResizerEdge,
  hitArea: ResizerHitArea,
  hasAction: boolean,
  extendIntoToolbar: boolean | "titlebar"
) => {
  const horizontal = isHorizontal(edge);
  const outside = hitArea !== "inside";

  return cn(
    "group/panel-resizer absolute flex touch-none select-none",
    (hitArea === "outside" || hitArea === "after") && "pointer-events-none",
    hasAction && "z-50",
    !hasAction && (edge === "left" ? "z-40" : "z-20"),
    edge === "right" && "right-0 bottom-0 w-4",
    edge === "right" && outside && "translate-x-2",
    horizontal &&
      extendIntoToolbar === "titlebar" &&
      styles.extendsIntoTitlebar,
    horizontal &&
      extendIntoToolbar !== "titlebar" &&
      (edge === "right" && extendIntoToolbar ? "-top-(--height-bar)" : "top-0"),
    edge === "left" && "bottom-0 left-0 w-4",
    edge === "left" && outside && "-translate-x-2",
    edge === "top" && "top-0 right-0 left-0 h-4",
    edge === "top" && outside && "-translate-y-2",
    edge === "bottom" && "right-0 bottom-0 left-0 h-4",
    edge === "bottom" && outside && "translate-y-2"
  );
};

const handleClassName = (
  edge: ResizerEdge,
  hitArea: ResizerHitArea,
  keyboard: boolean
) => {
  const horizontal = isHorizontal(edge);

  return cn(
    "absolute inset-0 flex focus:outline-none",
    styles.noDrag,
    hitArea === "inside" && (horizontal ? "py-2" : "px-2"),
    horizontal
      ? "cursor-col-resize active:cursor-col-resize"
      : "cursor-row-resize active:cursor-row-resize",
    keyboard &&
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    hitArea === "outside" && [
      "after:pointer-events-auto after:absolute after:inset-0",
      edge === "right" && "after:left-1/2",
      edge === "left" && "after:right-1/2",
      edge === "top" && "after:bottom-1/2",
      edge === "bottom" && "after:top-1/2",
    ],
    hitArea === "after" && [
      "after:pointer-events-auto after:absolute after:inset-0",
      horizontal
        ? "ltr:after:translate-x-1/2 rtl:after:-translate-x-1/2"
        : "after:translate-y-1/2",
    ]
  );
};

const lineSizeClassName = (edge: ResizerEdge, indicator: ResizerIndicator) => {
  const horizontal = isHorizontal(edge);

  if (indicator === "inset-solid") {
    return horizontal
      ? "mx-auto my-(--radius-base-2xl) w-px"
      : "mx-(--radius-base-2xl) my-auto h-px flex-1";
  }

  return horizontal ? "m-auto h-full w-px" : "m-auto h-px w-full";
};

const linePaintClassName = (edge: ResizerEdge, indicator: ResizerIndicator) => {
  if (indicator !== "gradient") {
    return "bg-stroke-strong";
  }

  return isHorizontal(edge)
    ? "bg-linear-to-b from-transparent via-text/25 to-transparent"
    : "bg-linear-to-r from-transparent via-text/25 to-transparent";
};

const lineClassName = (
  edge: ResizerEdge,
  indicator: ResizerIndicator,
  visibility: ResizerIndicatorVisibility,
  resizing: boolean
) =>
  cn(
    "pointer-events-none",
    lineSizeClassName(edge, indicator),
    linePaintClassName(edge, indicator),
    resizing
      ? "opacity-100"
      : [
          visibility === "always" ? "opacity-50" : "opacity-0",
          "group-hover/panel-resizer:opacity-100 group-active/panel-resizer:opacity-100 group-has-focus-visible/panel-resizer:opacity-100",
        ]
  );

const pointerOf = (event: { clientX: number; clientY: number }) => ({
  x: event.clientX,
  y: event.clientY,
});

const anchorStyle = (name: string): CSSProperties => ({ anchorName: name });

const overlayStyle = (name: string): CSSProperties => ({
  positionAnchor: name,
});

const PanelResizer = ({
  action,
  allowPointerOverflow = false,
  ariaLabel,
  currentSize,
  defaultSize,
  edge = "right",
  extendIntoToolbar = true,
  getCurrentSize,
  hitArea = "centered",
  indicator = "gradient",
  indicatorVisibility = "hover",
  keyboardStep = DEFAULT_KEYBOARD_STEP,
  maximumSize,
  minimumSize,
  onResizeEnd,
  onResizingChange,
  renderInTopLayer,
  setSize,
}: PanelResizerProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const anchorName = `--ck-resize-anchor-${useId()}`;

  const horizontal = isHorizontal(edge);
  const topLayer = renderInTopLayer ?? action !== undefined;

  const keyboardResizable =
    ariaLabel !== undefined &&
    minimumSize !== undefined &&
    maximumSize !== undefined;

  const bounds = allowPointerOverflow
    ? { max: undefined, min: undefined }
    : { max: maximumSize, min: minimumSize };

  const stopDragging = () => {
    drag.current = null;
    setIsResizing(false);
    onResizingChange?.(false);
  };

  const endDrag = () => {
    const state = drag.current;

    if (state === null) {
      return;
    }

    drag.current = null;
    suppressClick.current = state.didMove;

    if (state.didMove) {
      onResizeEnd?.(state.lastSize);
    }

    if (state.captureTarget.hasPointerCapture(state.pointerId)) {
      state.captureTarget.releasePointerCapture(state.pointerId);
    }

    setIsResizing(false);
    onResizingChange?.(false);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const state = drag.current;

    if (state?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const pointer = pointerOf(event);

    if (state.actionTarget !== null && !state.didMove) {
      const distance = Math.hypot(
        pointer.x - state.startPointer.x,
        pointer.y - state.startPointer.y
      );

      if (distance < ACTION_DRAG_THRESHOLD) {
        return;
      }

      state.actionTarget.setPointerCapture(event.pointerId);
      state.didMove = true;
    } else if (
      horizontal
        ? pointer.x !== state.startPointer.x
        : pointer.y !== state.startPointer.y
    ) {
      state.didMove = true;
    }

    state.lastSize = clampSize(
      draggedSize(edge, pointer, state),
      bounds.min,
      bounds.max
    );
    setSize(state.lastSize);
  };

  const handlePointerUp = (event: PointerEvent) => {
    const state = drag.current;

    if (state?.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    if (state.didMove) {
      state.lastSize = clampSize(
        draggedSize(edge, pointerOf(event), state),
        bounds.min,
        bounds.max
      );
      setSize(state.lastSize);
    }

    endDrag();
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (drag.current?.pointerId === event.pointerId) {
      endDrag();
    }
  };

  const handleLostCapture = (event: PointerEvent) => {
    if (event.target === drag.current?.captureTarget) {
      handlePointerCancel(event);
    }
  };

  const onMove = useEffectEvent(handlePointerMove);
  const onUp = useEffectEvent(handlePointerUp);
  const onCancel = useEffectEvent(handlePointerCancel);
  const onLostCapture = useEffectEvent(handleLostCapture);

  const onLayerChange = useEffectEvent(() => {
    if (layerIsOpen()) {
      endDrag();
    }
  });

  useEffect(() => {
    if (!isResizing) {
      return noCleanup;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("lostpointercapture", onLostCapture);

    const stopObserving = topLayer ? observeLayers(onLayerChange) : noCleanup;

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("lostpointercapture", onLostCapture);
      stopObserving();
    };
  }, [isResizing, topLayer]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    fromAction = false
  ) => {
    if (event.button !== 0 || drag.current !== null) {
      return;
    }

    if (!fromAction) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    suppressClick.current = false;

    const size = getCurrentSize();

    drag.current = {
      actionTarget: fromAction ? event.currentTarget : null,
      captureTarget: event.currentTarget,
      didMove: false,
      lastSize: size,
      pointerId: event.pointerId,
      startPointer: pointerOf(event),
      startSize: size,
    };
    setIsResizing(true);
    onResizingChange?.(true);
  };

  const handleDoubleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.detail !== 2 || defaultSize === undefined) {
      return;
    }

    event.preventDefault();
    stopDragging();

    const size = clampSize(defaultSize, minimumSize, maximumSize);

    setSize(size);
    onResizeEnd?.(size);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const size = keyboardSize({
      currentSize: getCurrentSize(),
      edge,
      key: event.key,
      keyboardStep,
      maximumSize,
      minimumSize,
    });

    if (size === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSize(size);
    onResizeEnd?.(size);
  };

  const handleActionClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (suppressClick.current && event.detail !== 0) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const shownSize = clampSize(
    currentSize ?? getCurrentSize(),
    minimumSize,
    maximumSize
  );

  const content = (
    <>
      <div
        aria-label={keyboardResizable ? ariaLabel : undefined}
        aria-orientation={horizontal ? "vertical" : "horizontal"}
        aria-valuemax={keyboardResizable ? maximumSize : undefined}
        aria-valuemin={keyboardResizable ? minimumSize : undefined}
        aria-valuenow={keyboardResizable ? shownSize : undefined}
        className={handleClassName(edge, hitArea, keyboardResizable)}
        onClick={handleDoubleClick}
        onKeyDown={keyboardResizable ? handleKeyDown : undefined}
        onPointerDown={handlePointerDown}
        role="separator"
        tabIndex={keyboardResizable ? 0 : undefined}
      >
        <div
          className={lineClassName(
            edge,
            indicator,
            indicatorVisibility,
            isResizing
          )}
        />
      </div>
      {action === undefined ? null : (
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            isResizing
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0 group-hover/panel-resizer:pointer-events-auto group-hover/panel-resizer:opacity-100 group-has-focus-visible/panel-resizer:pointer-events-auto group-has-focus-visible/panel-resizer:opacity-100"
          )}
          onClickCapture={handleActionClickCapture}
          onPointerDown={(event) => {
            handlePointerDown(event, true);
          }}
        >
          {action}
        </div>
      )}
    </>
  );

  return (
    <div
      className={wrapperClassName(
        edge,
        hitArea,
        action !== undefined,
        extendIntoToolbar
      )}
      style={topLayer ? anchorStyle(anchorName) : undefined}
    >
      {topLayer ? (
        <div
          className={cn(
            "group/panel-resizer fixed m-0 h-auto w-auto touch-none overflow-visible border-0 bg-transparent p-0 text-inherit select-none",
            styles.noDrag,
            styles.overlay
          )}
          ref={overlayRef}
          style={overlayStyle(anchorName)}
        >
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
};

export { PanelResizer };

export type {
  PanelResizerProps,
  ResizerEdge,
  ResizerHitArea,
  ResizerIndicator,
  ResizerIndicatorVisibility,
};
