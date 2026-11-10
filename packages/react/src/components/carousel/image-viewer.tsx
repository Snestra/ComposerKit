"use client";

/* oxlint-disable eslint/complexity, react/refs, shadcn/no-restyle, shadcn/no-arbitrary-values, anti-slop/no-runtime-typeof -- The viewer restyles one frame and its own round controls with measured values that have no theme token, and probes pointer-capture methods the way the component does. */

import {
  ViewerArrowLeftIcon,
  ViewerCloseIcon,
  ViewerDownloadIcon,
  ViewerMinusIcon,
  ViewerPlusIcon,
} from "@workspace/react/components/carousel/icons";
import { blobForObjectUrl } from "@workspace/react/components/carousel/image-source";
import {
  registerImageViewerZoomHandler,
  registerOpenImageViewer,
} from "@workspace/react/components/carousel/zoom-bridge";
import type { ImageViewerZoomCommand } from "@workspace/react/components/carousel/zoom-bridge";
import { Button } from "@workspace/react/components/ui/button";
import { Dialog, DialogTitle } from "@workspace/react/components/ui/dialog";
import type { LayerEvent } from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactEventHandler,
  ReactNode,
  RefObject,
} from "react";
import { flushSync } from "react-dom";

import styles from "../ui/carousel.module.css";

/*
 * The full-size image viewer: the dialog shell, close,
 * previous and next buttons, ArrowLeft and ArrowRight, the zoom ramp and zoom
 * controls, ctrl+wheel zoom, touch pan and pinch, the host zoom bridge,
 * download, toolbar, edit and content slots, inline rendering, portal
 * containment and the overlay presentation.
 */

/** The zoom ramp in percent. */
const ZOOM_RAMP = [
  25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500,
] as const;

/** The ctrl+wheel divisor. */
const WHEEL_ZOOM_DIVISOR = 220;

const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 768;

interface Size {
  height: number;
  width: number;
}

interface Point {
  clientX: number;
  clientY: number;
}

interface ZoomState {
  src: string;
  zoomPercent: number;
}

interface NaturalSize extends Size {
  src: string;
}

interface PanState extends Point {
  pointerId: number;
  scrollLeft: number;
  scrollTop: number;
}

interface PinchState {
  distance: number;
  zoomPercent: number;
}

/** The percent at which the whole image fits (never above 100). */
const fitPercent = (
  naturalSize: Size | null,
  viewportSize: Size | null
): number | null => {
  if (viewportSize === null || naturalSize === null) {
    return null;
  }

  const width = viewportSize.width / naturalSize.width;
  const height = viewportSize.height / naturalSize.height;
  const fit = Math.min(1, width, height);

  return !Number.isFinite(fit) || fit <= 0 ? null : fit * 100;
};

/** The ramp with the fit percent inserted in order. */
const zoomRampFor = (fit: number | null): number[] => {
  const ramp: number[] = [...ZOOM_RAMP];

  if (fit !== null && !ramp.includes(fit)) {
    ramp.push(fit);
    ramp.sort((a, b) => a - b);
  }

  return ramp;
};

/** The next ramp step above or below the current percent. */
const stepZoom = (
  current: number,
  direction: "in" | "out",
  ramp: number[]
): number => {
  if (direction === "in") {
    return ramp.find((step) => step > current) ?? ramp.at(-1) ?? current;
  }

  return ramp.findLast((step) => step < current) ?? ramp[0] ?? current;
};

const clampZoom = (
  maximum: number | null,
  minimum: number | null,
  zoomPercent: number
): number | null =>
  minimum === null || maximum === null || !Number.isFinite(zoomPercent)
    ? null
    : Math.min(maximum, Math.max(minimum, zoomPercent));

/** Wheel delta in pixels. */
const wheelDeltaPixels = (event: WheelEvent): number => {
  if (event.deltaMode === 1) {
    return event.deltaY * LINE_HEIGHT_PX;
  }

  return event.deltaMode === 2 ? event.deltaY * PAGE_HEIGHT_PX : event.deltaY;
};

const insideRect = (point: Point, rect: DOMRect) =>
  point.clientX >= rect.left &&
  point.clientX <= rect.right &&
  point.clientY >= rect.top &&
  point.clientY <= rect.bottom;

/** The zoom anchor for a wheel event. */
const wheelAnchor = (
  event: WheelEvent,
  fallbackPoint: Point | null,
  viewport: HTMLElement | null
): Point => {
  const point = { clientX: event.clientX, clientY: event.clientY };

  if (viewport === null) {
    return point;
  }

  const rect = viewport.getBoundingClientRect();

  if ((point.clientX !== 0 || point.clientY !== 0) && insideRect(point, rect)) {
    return point;
  }

  if (fallbackPoint !== null && insideRect(fallbackPoint, rect)) {
    return fallbackPoint;
  }

  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };
};

/** The midpoint and distance of the first two touches. */
const pinchOf = (pointers: Map<number, Point>) => {
  const [first, second] = [...pointers.values()];

  if (first === undefined || second === undefined) {
    return null;
  }

  const distance = Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY
  );

  return distance <= 0
    ? null
    : {
        clientX: (first.clientX + second.clientX) / 2,
        clientY: (first.clientY + second.clientY) / 2,
        distance,
      };
};

/** A ratio clamped to 0..1, 0.5 when not finite. */
const unitRatio = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;

/** Arrow keys do not navigate from editable or widget elements. */
const NAVIGATION_BLOCKERS =
  'input, textarea, select, [role="slider"], [role="spinbutton"], [role="combobox"], [role="listbox"], [role="grid"], [role="tree"], [role="tablist"], [role="menu"]';

const allowsArrowNavigation = (target: EventTarget): boolean => {
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  const editable = target.closest("[contenteditable]");

  return (
    !target.isContentEditable &&
    (editable === null ||
      editable.getAttribute("contenteditable") === "false") &&
    target.closest(NAVIGATION_BLOCKERS) === null
  );
};

/** An effect cleanup for the paths that set nothing up. */
const noCleanup = () => {
  // Nothing was set up, so there is nothing to undo.
};

const pointOf = (event: ReactPointerEvent): Point => ({
  clientX: event.clientX,
  clientY: event.clientY,
});

/* ------------------------------------------------------------------ zoom --- */

/**
 * The zoom state of the viewer: the viewport node and size, the
 * image's natural size, the zoom percent and every way to change it.
 */
const useImageZoom = (
  src: string,
  viewportRef: RefObject<HTMLDivElement | null>,
  lastPointerRef: RefObject<Point | null>,
  givenSize: Size | null
) => {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<Size | null>(null);
  const [zoomState, setZoomState] = useState<ZoomState | null>(null);
  const [naturalState, setNaturalState] = useState<NaturalSize | null>(null);
  const imageRef = useRef<HTMLElement | null>(null);

  const onWheelRef = useRef<(event: WheelEvent) => void>(() => {
    // Replaced on every render below.
  });

  // The size the caller gives, else the size the image reported.
  const naturalSize =
    givenSize ?? (naturalState?.src === src ? naturalState : null);

  const fit = fitPercent(naturalSize, viewportSize);
  const explicitZoom = zoomState?.src === src ? zoomState.zoomPercent : null;
  const zoomPercent = explicitZoom ?? fit;
  const ramp = zoomRampFor(fit);
  const minimumZoom = ramp[0] ?? zoomPercent;
  const maximumZoom = ramp.at(-1) ?? zoomPercent;

  const canZoomOut =
    zoomPercent !== null && minimumZoom !== null && zoomPercent > minimumZoom;

  const canZoomIn =
    zoomPercent !== null && maximumZoom !== null && zoomPercent < maximumZoom;

  const measureViewport = useCallback((node: HTMLElement) => {
    const rect = node.getBoundingClientRect();
    const zoom = node.currentCSSZoom || 1;
    const width = rect.width / zoom;
    const height = rect.height / zoom;

    setViewportSize((previous) =>
      previous?.width === width && previous.height === height
        ? previous
        : { height, width }
    );
  }, []);

  const readNaturalSize = useCallback(
    (image: HTMLImageElement) => {
      const { naturalHeight, naturalWidth } = image;

      if (naturalWidth === 0 || naturalHeight === 0) {
        return;
      }

      if (viewportRef.current !== null) {
        measureViewport(viewportRef.current);
      }

      setNaturalState({ height: naturalHeight, src, width: naturalWidth });
    },
    [measureViewport, src, viewportRef]
  );

  const decodeThenRead = useCallback(
    async (image: HTMLImageElement) => {
      try {
        await image.decode();
      } catch {
        return;
      }

      if (image.isConnected && image.getAttribute("src") === src) {
        readNaturalSize(image);
      }
    },
    [readNaturalSize, src]
  );

  const attachImage = useCallback(
    (image: HTMLImageElement | null) => {
      imageRef.current = image;

      if (image?.decode !== undefined) {
        void decodeThenRead(image);
      }
    },
    [decodeThenRead]
  );

  const attachContent = useCallback((node: HTMLDivElement | null) => {
    imageRef.current = node;
  }, []);

  const attachViewport = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node;
      setViewport(node);
    },
    [viewportRef]
  );

  const zoomAround = ({
    clientX,
    clientY,
    zoomPercent: nextPercent,
  }: Point & { zoomPercent: number }) => {
    const node = viewportRef.current;
    const image = imageRef.current;

    if (node === null || image === null) {
      setZoomState({ src, zoomPercent: nextPercent });

      return;
    }

    const before = image.getBoundingClientRect();

    const ratioX =
      before.width > 0
        ? unitRatio((clientX - before.left) / before.width)
        : 0.5;

    const ratioY =
      before.height > 0
        ? unitRatio((clientY - before.top) / before.height)
        : 0.5;

    flushSync(() => {
      setZoomState({ src, zoomPercent: nextPercent });
    });

    if (!node.isConnected || !image.isConnected) {
      return;
    }

    const after = image.getBoundingClientRect();
    node.scrollLeft += after.left + after.width * ratioX - clientX;
    node.scrollTop += after.top + after.height * ratioY - clientY;
  };

  const step = (direction: "in" | "out") => {
    const node = viewportRef.current;

    if (zoomPercent === null) {
      return;
    }

    const next = stepZoom(zoomPercent, direction, ramp);

    if (node === null) {
      setZoomState({ src, zoomPercent: next });

      return;
    }

    const rect = node.getBoundingClientRect();

    zoomAround({
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      zoomPercent: next,
    });
  };

  // The wheel listener is native and non-passive so ctrl+wheel can cancel the
  // browser page zoom; it reads the latest state through this ref.
  useEffect(() => {
    onWheelRef.current = (event) => {
      if (!event.ctrlKey || zoomPercent === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const next = clampZoom(
        maximumZoom,
        minimumZoom,
        zoomPercent * Math.exp(-wheelDeltaPixels(event) / WHEEL_ZOOM_DIVISOR)
      );

      if (next === null || next === zoomPercent) {
        return;
      }

      const anchor = wheelAnchor(
        event,
        lastPointerRef.current,
        viewportRef.current
      );

      zoomAround({ ...anchor, zoomPercent: next });
    };
  });

  useEffect(() => {
    if (viewport === null) {
      return noCleanup;
    }

    const handler = (event: WheelEvent) => {
      onWheelRef.current(event);
    };

    viewport.addEventListener("wheel", handler, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handler);
    };
  }, [viewport]);

  // ResizeObserver reports the size once on observe, which sets the first size.
  useEffect(() => {
    if (viewport === null || typeof ResizeObserver === "undefined") {
      return noCleanup;
    }

    const observer = new ResizeObserver(() => {
      measureViewport(viewport);
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [measureViewport, viewport]);

  return [
    {
      canZoomIn,
      canZoomOut,
      maximumZoom,
      minimumZoom,
      naturalSize,
      zoomPercent,
    },
    {
      attachContent,
      attachImage,
      attachViewport,
      clearZoom: () => {
        setZoomState(null);
      },
      readNaturalSize,
      // Back to fit, and both scroll offsets to zero.
      resetZoom: () => {
        setZoomState(null);

        const node = viewportRef.current;

        if (node !== null) {
          node.scrollLeft = 0;
          node.scrollTop = 0;
        }
      },
      step,
      zoomAround,
    },
  ] as const;
};

/* -------------------------------------------------------------- touch --- */

type ZoomView = ReturnType<typeof useImageZoom>[0];

type ZoomActions = ReturnType<typeof useImageZoom>[1];

/** Touch pan and pinch of the viewport. */
const useTouchGestures = (
  zoomView: ZoomView,
  zoomActions: ZoomActions,
  viewportRef: RefObject<HTMLDivElement | null>,
  lastPointerRef: RefObject<Point | null>
) => {
  const touchesRef = useRef(new Map<number, Point>());
  const panRef = useRef<PanState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);

  const { maximumZoom, minimumZoom, zoomPercent } = zoomView;

  const panFrom = (pointerId: number, point: Point): PanState | null => {
    const node = viewportRef.current;

    return node === null
      ? null
      : {
          ...point,
          pointerId,
          scrollLeft: node.scrollLeft,
          scrollTop: node.scrollTop,
        };
  };

  const pinchFromTouches = (): PinchState | null => {
    const pinch = pinchOf(touchesRef.current);

    return pinch === null || zoomPercent === null
      ? null
      : { distance: pinch.distance, zoomPercent };
  };

  const reset = () => {
    touchesRef.current.clear();
    panRef.current = null;
    pinchRef.current = null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    lastPointerRef.current = pointOf(event);

    if (event.pointerType !== "touch") {
      return;
    }

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    touchesRef.current.set(event.pointerId, pointOf(event));

    if (touchesRef.current.size === 1 && viewportRef.current !== null) {
      panRef.current = panFrom(event.pointerId, pointOf(event));

      return;
    }

    panRef.current = null;
    pinchRef.current = pinchFromTouches();
  };

  const onPinchMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    panRef.current = null;

    const start = pinchRef.current;
    const pinch = pinchOf(touchesRef.current);

    if (start === null || pinch === null) {
      return;
    }

    const next = clampZoom(
      maximumZoom,
      minimumZoom,
      start.zoomPercent * (pinch.distance / start.distance)
    );

    if (next !== null && next !== zoomPercent) {
      zoomActions.zoomAround({
        clientX: pinch.clientX,
        clientY: pinch.clientY,
        zoomPercent: next,
      });
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    lastPointerRef.current = pointOf(event);

    if (
      event.pointerType !== "touch" ||
      !touchesRef.current.has(event.pointerId)
    ) {
      return;
    }

    touchesRef.current.set(event.pointerId, pointOf(event));

    if (touchesRef.current.size > 1) {
      onPinchMove(event);

      return;
    }

    const node = viewportRef.current;
    const pan = panRef.current;

    if (node !== null && pan !== null && pan.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      node.scrollLeft = pan.scrollLeft - (event.clientX - pan.clientX);
      node.scrollTop = pan.scrollTop - (event.clientY - pan.clientY);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }

    touchesRef.current.delete(event.pointerId);

    const target = event.currentTarget;

    if (
      typeof target.hasPointerCapture === "function" &&
      typeof target.releasePointerCapture === "function" &&
      target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId);
    }

    if (touchesRef.current.size === 0) {
      panRef.current = null;
      pinchRef.current = null;

      return;
    }

    const remaining = touchesRef.current.entries().next().value;

    if (touchesRef.current.size === 1 && remaining !== undefined) {
      panRef.current = panFrom(remaining[0], remaining[1]);
      pinchRef.current = null;

      return;
    }

    panRef.current = null;
    pinchRef.current = pinchFromTouches();
  };

  return { onPointerDown, onPointerMove, onPointerUp, reset };
};

/* ------------------------------------------------------------ download --- */

/** A file name the host file system accepts, at most 254 bytes. */
const safeFileName = (name: string): string => {
  const cleaned = name
    .replaceAll(/[<>:"/\\|?*\p{Cc}]/gu, "_")
    .replaceAll(/[. ]+$/gu, "");

  const extension =
    /(?: \([\d.]{1,10}x\))?(?:-\d{1,10})?\.[a-z0-9]{1,10}$/iu.exec(
      cleaned
    )?.[0] ?? "";

  const base = cleaned.slice(0, cleaned.length - extension.length);
  const encoder = new TextEncoder();

  const { read } = encoder.encodeInto(
    base,
    new Uint8Array(254 - encoder.encode(extension).length)
  );

  const trimmed = base.slice(0, read).replaceAll(/[. ]+$/gu, "") || "_";

  const reserved =
    /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(trimmed);

  return `${reserved ? "_" : ""}${trimmed}${extension}`;
};

/** The file extension a source names. */
const extensionOf = (src: string): string | null => {
  const dataType = /^data:image\/[a-z0-9.+-]+(?=[;,])/iu
    .exec(src)?.[0]
    ?.slice("data:image/".length);

  const path = src.split(/[?#]/u, 1)[0] ?? "";
  const dot = path.lastIndexOf(".");
  const suffix = dot === -1 ? "" : path.slice(dot + 1);
  const found = dataType ?? (/^[a-z0-9]+$/iu.test(suffix) ? suffix : undefined);

  if (found === undefined) {
    return null;
  }

  const lower = found.toLowerCase();

  if (lower === "svg+xml") {
    return "svg";
  }

  return lower === "jpeg" ? "jpg" : lower;
};

/** "Image <date>.<extension>". */
const generatedFileName = (extension: string): string => {
  const date = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    year: "numeric",
  }).format(new Date());

  return safeFileName(`Image ${date}.${extension}`);
};

/** The name a link download suggests. */
const linkFileName = (src: string, alt: string): string => {
  if (alt.trim().length > 0) {
    return alt.trim();
  }

  if (src.startsWith("data:")) {
    return "image";
  }

  const last = (src.split(/[?#]/u, 1)[0] ?? "").split(/[\\/]/u).at(-1);

  if (last === undefined || last.length === 0) {
    return "image";
  }

  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

/** A data URL as a blob. */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(5, comma);
  const body = dataUrl.slice(comma + 1);
  const type = /^[^;]+/u.exec(header)?.[0] ?? "application/octet-stream";

  if (/;base64/iu.test(header)) {
    return new Blob(
      [Uint8Array.from(atob(body), (c) => c.codePointAt(0) ?? 0)],
      {
        type,
      }
    );
  }

  return new Blob([decodeURIComponent(body)], { type });
};

/** Saves a blob through a temporary link. */
const saveBlobThroughLink = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};

/** The bytes behind a download source. */
const imageBlobFor = async (
  src: string,
  image: HTMLImageElement | null
): Promise<Blob | null> => {
  if (/^https?:/iu.test(src)) {
    const response = await fetch(src);

    return await response.blob();
  }

  if (src.startsWith("data:")) {
    return dataUrlToBlob(src);
  }

  if (src.startsWith("blob:")) {
    const known = blobForObjectUrl(src);

    if (known !== undefined) {
      return known;
    }
  }

  try {
    const response = await fetch(src);

    if (response.ok) {
      return await response.blob();
    }
  } catch (error) {
    if (!src.startsWith("blob:") || image === null) {
      throw error;
    }
  }

  if (src.startsWith("blob:") && image !== null) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");

    if (context === null) {
      return null;
    }

    context.drawImage(image, 0, 0);

    return dataUrlToBlob(canvas.toDataURL("image/png"));
  }

  return null;
};

/** What the host provides for saving a file. */
export interface ImageViewerHost {
  saveFile:
    | ((request: {
        fileName: string;
        source: Blob;
      }) => Promise<{ path?: string | null } | null | undefined>)
    | null;
}

export const ImageViewerHostContext = createContext<ImageViewerHost>({
  saveFile: null,
});

/** Saves the image through the host; false when it could not. */
const downloadThroughHost = async ({
  downloadSrc,
  host,
  image,
  onDownloaded,
  suggestedFileName,
}: {
  downloadSrc: string;
  host: ImageViewerHost;
  image: HTMLImageElement | null;
  onDownloaded?: () => void;
  suggestedFileName: string;
}): Promise<boolean> => {
  try {
    const blob = await imageBlobFor(downloadSrc, image);

    if (blob === null) {
      return false;
    }

    const extension =
      extensionOf(downloadSrc) === null
        ? extensionOf(`data:${blob.type};base64,`)
        : null;

    const fileName = safeFileName(
      extension === null
        ? suggestedFileName
        : suggestedFileName.replace(/\.[a-z0-9]+$/iu, `.${extension}`)
    );

    if (host.saveFile === null) {
      return false;
    }

    const saved = await host.saveFile({ fileName, source: blob });

    if (saved?.path !== null && saved?.path !== undefined) {
      onDownloaded?.();
    }

    return true;
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------- context --- */

/** The element a contained viewer renders into. */
export const ImageViewerPortalContext = createContext<HTMLElement | null>(null);

/** How far the host window controls reach into the right side. */
export const WindowControlsInsetContext = createContext<{ right: number }>({
  right: 0,
});

/* ---------------------------------------------------------------- view --- */

const CONTROL_SURFACE =
  "pointer-events-auto flex cursor-(--ck-action-cursor) items-center justify-center rounded-full text-text shadow-md ring-1 ring-black/5 transition-transform [-webkit-app-region:no-drag] hover:bg-panel-elevated hover:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

const ZOOM_BUTTON_CLASS =
  "flex size-9 cursor-(--ck-action-cursor) items-center justify-center rounded-full bg-text/10 [-webkit-app-region:no-drag] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const CLASSIC_CONTENT_CLASS =
  "pointer-events-none inset-0 !left-0 !top-0 max-w-none !translate-x-0 !translate-y-0 overflow-visible rounded-none bg-transparent p-0 shadow-none ring-0 backdrop-blur-none";

export interface ImageViewerAction {
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
}

export interface ImageViewerLeadingAction {
  active?: boolean;
  ariaLabel: string;
  label: ReactNode;
  onClick: () => void;
}

export interface ImageViewerZoomableContent {
  content: ReactNode;
  height: number;
  width: number;
}

export interface ImageViewerDialogProps {
  alt: string;
  /** Rendered below the image, under the caption. */
  bottomContent?: ReactNode;
  caption?: string;
  closeAriaLabel?: string;
  /** Which edges of a contained viewer's frame leave room. */
  containerResizeEdges?: "all" | "top-and-sides";
  /** Render into the portal context's element instead of the page. */
  containedInPortal?: boolean;
  controlsSurface?: "opaque" | "translucent";
  dialogAriaLabel?: string;
  disableOpenAnimation?: boolean;
  downloadAriaLabel?: string;
  downloadFileName?: string;
  /** What a download saves; the image source when absent. */
  downloadSrc?: string;
  editButton?: ImageViewerAction;
  headerContent?: ReactNode;
  imageDecoding?: "async" | "auto" | "sync";
  imageDisplaySize?: Size;
  imageDraggable?: boolean;
  imageFetchPriority?: "auto" | "high" | "low";
  imageLoading?: "eager" | "lazy";
  imageReferrerPolicy?: ReferrerPolicy;
  imageSurface?: "card" | "plain";
  /** Render the content in place with no dialog. */
  inline?: boolean;
  modal?: boolean;
  nextAriaLabel?: string;
  nextDisabled?: boolean;
  onCloseAutoFocus?: (event: LayerEvent) => void;
  onDownload?: () => void;
  onDownloadClick?: () => void;
  onDownloaded?: () => void;
  onDownloadFailure?: () => void;
  onImageError?: ReactEventHandler<HTMLImageElement>;
  onImageLoad?: ReactEventHandler<HTMLImageElement>;
  onNextImage?: () => void;
  onOpenAutoFocus?: (event: LayerEvent) => void;
  onOpenChange: (open: boolean) => void;
  onPreviousImage?: () => void;
  open: boolean;
  portalContainer?: HTMLElement | null;
  presentation?: "classic" | "overlay";
  /** Replaces the image and its zoom with your own preview. */
  previewContent?: ReactNode;
  previousAriaLabel?: string;
  previousDisabled?: boolean;
  /** Draws the preview yourself; `imageRef` reports its element. */
  renderPreview?: (props: {
    imageRef: (element: HTMLElement | null) => void;
  }) => ReactNode;
  renderBottomAction?: (className: string) => ReactNode;
  showDownload?: boolean;
  showZoomControls?: boolean;
  src: string;
  toolbarActions?: readonly ImageViewerAction[];
  toolbarContent?: ReactNode;
  toolbarLeadingAction?: ImageViewerLeadingAction;
  triggerContent?: ReactNode;
  zoomableContent?: ImageViewerZoomableContent;
}

/** A press that moves further than this is not a click. */
const CLICK_SLOP_PX = 6;

/** The element the picture is drawn by (the first image or zoomable block). */
const imageNode = (
  viewportRef: RefObject<HTMLDivElement | null>
): HTMLElement | null =>
  viewportRef.current?.querySelector<HTMLElement>("img, [class~='m-auto']") ??
  null;

/** The classic frame leaves room for the window title bar. */
const FrameElement = ({
  children,
  className,
  onPointerDown,
  plain,
  windowControlsRight,
}: {
  children: ReactNode;
  className: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  plain: boolean;
  windowControlsRight: number;
}) => (
  <div
    className={cn(
      !plain &&
        cn(
          styles.windowContent,
          "[--window-titlebar-height:env(titlebar-area-height,0px)]"
        ),
      className
    )}
    data-ck-right-window-controls={
      !plain && windowControlsRight > 0 ? true : undefined
    }
    onPointerDown={onPointerDown}
  >
    {children}
  </div>
);

/** The download control: a custom handler, the host save button or a link. */
const DownloadControl = ({
  alt,
  ariaLabel,
  className,
  downloadSrc,
  fileName,
  host,
  isLink,
  onDownload,
  onDownloadClick,
  onDownloaded,
  onDownloadFailure,
  previewImage,
  src,
  swallowPointer,
}: {
  alt: string;
  ariaLabel: string;
  className: string;
  downloadSrc: string;
  fileName?: string;
  host: ImageViewerHost;
  isLink: boolean;
  onDownload?: () => void;
  onDownloadClick?: () => void;
  onDownloaded?: () => void;
  onDownloadFailure?: () => void;
  previewImage: () => HTMLElement | null;
  src: string;
  swallowPointer: (event: ReactPointerEvent) => void;
}) => {
  const saveThroughHost = async () => {
    const image = previewImage();

    const saved = await downloadThroughHost({
      downloadSrc,
      host,
      image: image instanceof HTMLImageElement ? image : null,
      onDownloaded,
      suggestedFileName:
        fileName ?? generatedFileName(extensionOf(downloadSrc) ?? "png"),
    });

    if (!saved) {
      onDownloadFailure?.();
    }
  };

  if (onDownload !== undefined) {
    return (
      <Button
        aria-label={ariaLabel}
        className={className}
        disabledAppearance="none"
        focusRing="none"
        onClick={(event) => {
          event.stopPropagation();
          onDownloadClick?.();
          onDownload();
        }}
        onPointerDown={swallowPointer}
        unstyled
      >
        <ViewerDownloadIcon className="size-3.5" />
      </Button>
    );
  }

  if (isLink) {
    return (
      <a
        aria-label={ariaLabel}
        className={className}
        download={fileName ?? linkFileName(src, alt)}
        href={downloadSrc}
        onClick={(event) => {
          onDownloadClick?.();

          if (downloadSrc.startsWith("data:")) {
            event.preventDefault();

            saveBlobThroughLink(
              dataUrlToBlob(downloadSrc),
              fileName ?? linkFileName(src, alt)
            );
          }
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <ViewerDownloadIcon className="size-3.5" />
      </a>
    );
  }

  return (
    <Button
      aria-label={ariaLabel}
      className={className}
      disabledAppearance="none"
      focusRing="none"
      onClick={(event) => {
        event.stopPropagation();
        onDownloadClick?.();

        saveThroughHost().catch(() => {
          onDownloadFailure?.();
        });
      }}
      onPointerDown={swallowPointer}
      unstyled
    >
      <ViewerDownloadIcon className="size-3.5" />
    </Button>
  );
};

/** A callback with a stable identity that always runs the latest closure. */
const useStableCallback = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result
) => {
  const latest = useRef(handler);

  useInsertionEffect(() => {
    latest.current = handler;
  });

  return useCallback((...args: Args) => latest.current(...args), []);
};

const swallowPointer = (event: ReactPointerEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const CLOSEST_INTERACTIVE =
  'button, a, input, textarea, select, [role="menu"], [role="menuitem"], [contenteditable="true"]';

/**
 * The photo viewer dialog. `presentation` is classic (a dimmed
 * full-screen dialog) or overlay (an image frame whose backdrop and chrome the
 * caller styles), `inline` renders the content without a dialog, and
 * `containedInPortal` renders it into the portal context's element.
 */
export const ImageViewerDialog = ({
  alt,
  bottomContent,
  caption,
  closeAriaLabel = "Close image preview",
  containedInPortal,
  containerResizeEdges,
  controlsSurface = "opaque",
  dialogAriaLabel = "Image preview",
  disableOpenAnimation = false,
  downloadAriaLabel = "Download image",
  downloadFileName,
  downloadSrc,
  editButton,
  headerContent,
  imageDecoding,
  imageDisplaySize,
  imageDraggable,
  imageFetchPriority,
  imageLoading,
  imageReferrerPolicy,
  imageSurface = "plain",
  inline = false,
  modal = true,
  nextAriaLabel = "Next image",
  nextDisabled = false,
  onCloseAutoFocus,
  onDownload,
  onDownloadClick,
  onDownloaded,
  onDownloadFailure,
  onImageError,
  onImageLoad,
  onNextImage,
  onOpenAutoFocus,
  onOpenChange,
  onPreviousImage,
  open,
  portalContainer,
  presentation = "classic",
  previewContent,
  previousAriaLabel = "Previous image",
  previousDisabled = false,
  renderBottomAction,
  renderPreview,
  showDownload = true,
  showZoomControls = true,
  src,
  toolbarActions,
  toolbarContent,
  toolbarLeadingAction,
  triggerContent,
  zoomableContent,
}: ImageViewerDialogProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastPointerRef = useRef<Point | null>(null);
  const previewNodeRef = useRef<HTMLElement | null>(null);
  const clickStartRef = useRef<Point | null>(null);
  const contextPortal = useContext(ImageViewerPortalContext);
  const host = useContext(ImageViewerHostContext);
  const windowControls = useContext(WindowControlsInsetContext);

  const overlay = presentation === "overlay";
  const container = portalContainer ?? contextPortal;
  const contained = containedInPortal ?? contextPortal !== null;
  const surface = downloadSrc ?? src;

  const [zoomView, zoomActions] = useImageZoom(
    src,
    viewportRef,
    lastPointerRef,
    zoomableContent ?? imageDisplaySize ?? null
  );

  const touch = useTouchGestures(
    zoomView,
    zoomActions,
    viewportRef,
    lastPointerRef
  );

  const { naturalSize, zoomPercent } = zoomView;

  const hasNavigation =
    onPreviousImage !== undefined || onNextImage !== undefined;

  const percentLabel = useMemo(
    () =>
      zoomPercent === null
        ? null
        : new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 0,
            style: "percent",
          }).format(zoomPercent / 100),
    [zoomPercent]
  );

  // The zoomed size reaches the stylesheet through custom properties.
  const contentSize:
    | (CSSProperties & Record<`--${string}`, string>)
    | undefined =
    zoomPercent !== null && naturalSize !== null
      ? {
          "--ck-viewer-image-height": `${naturalSize.height * (zoomPercent / 100)}px`,
          "--ck-viewer-image-width": `${naturalSize.width * (zoomPercent / 100)}px`,
        }
      : undefined;

  // Leaving an image drops the touch state and the zoom.
  const resetGestures = () => {
    touch.reset();
    zoomActions.clearZoom();
  };

  const showPrevious = () => {
    if (onPreviousImage === undefined || previousDisabled) {
      return;
    }

    resetGestures();
    onPreviousImage();
  };

  const showNext = () => {
    if (onNextImage === undefined || nextDisabled) {
      return;
    }

    resetGestures();
    onNextImage();
  };

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetGestures();
    }

    onOpenChange(nextOpen);
  };

  // The host's zoom menu commands.
  const onHostZoom = useStableCallback((command: ImageViewerZoomCommand) => {
    if (command.type === "step-zoom") {
      zoomActions.step(command.delta > 0 ? "in" : "out");
    } else {
      zoomActions.resetZoom();
    }
  });

  useEffect(() => {
    if (!open) {
      return noCleanup;
    }

    const unregisterOpen = registerOpenImageViewer();

    const unregisterZoom = showZoomControls
      ? registerImageViewerZoomHandler(onHostZoom)
      : undefined;

    return () => {
      unregisterZoom?.();
      unregisterOpen();
    };
  }, [onHostZoom, open, showZoomControls]);

  /** A click on the backdrop, outside every control and the picture. */
  const isBackdropClick = (event: {
    clientX: number;
    clientY: number;
    currentTarget: EventTarget & Element;
    target: EventTarget;
  }) => {
    const { target } = event;

    if (
      !(target instanceof Element) ||
      !event.currentTarget.contains(target) ||
      target.closest(CLOSEST_INTERACTIVE) !== null
    ) {
      return false;
    }

    const preview =
      renderPreview === undefined
        ? imageNode(viewportRef)
        : previewNodeRef.current;

    const rect = preview?.getBoundingClientRect();

    return (
      rect === undefined ||
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  const closeOnBackdrop = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!inline && !overlay && event.target === event.currentTarget) {
      changeOpen(false);
    }
  };

  const downloadButtonClass = cn(
    CONTROL_SURFACE,
    controlsSurface === "opaque" ? "bg-panel-tertiary" : "bg-panel-tertiary/95",
    "h-10 min-w-10 px-3"
  );

  const roundSurface = cn(
    controlsSurface === "opaque" ? "bg-panel-tertiary" : "bg-panel-tertiary/95"
  );

  const trimmed = caption?.trim();

  const trimmedCaption =
    trimmed === undefined || trimmed === "" ? null : trimmed;

  const linkDownload = /^https?:/iu.test(surface);

  const download = showDownload ? (
    <DownloadControl
      alt={alt}
      ariaLabel={downloadAriaLabel}
      className={downloadButtonClass}
      downloadSrc={surface}
      fileName={downloadFileName}
      host={host}
      isLink={linkDownload}
      onDownload={onDownload}
      onDownloadClick={onDownloadClick}
      onDownloaded={onDownloaded}
      onDownloadFailure={onDownloadFailure}
      previewImage={() => imageNode(viewportRef)}
      swallowPointer={swallowPointer}
      src={src}
    />
  ) : null;

  const zoomControlsBottom = showZoomControls;

  const bottomVisible =
    !inline ||
    bottomContent !== undefined ||
    trimmedCaption !== null ||
    renderBottomAction !== undefined ||
    zoomControlsBottom;

  const preview =
    previewContent ??
    renderPreview?.({
      imageRef: (element) => {
        previewNodeRef.current = element;
      },
    }) ??
    (zoomableContent === undefined ? (
      // oxlint-disable-next-line nextjs/no-img-element -- the viewer shows an arbitrary photo at its natural size and zooms it by sizing the element.
      <img
        alt={alt}
        className={cn(
          "m-auto object-contain",
          imageDisplaySize !== undefined &&
            contentSize === undefined &&
            "invisible",
          imageSurface === "card" ? "shrink-0" : "rounded-lg",
          imageSurface === "card" &&
            contentSize !== undefined &&
            "max-h-none! max-w-none!",
          contentSize === undefined
            ? "max-h-full max-w-full"
            : "block h-(--ck-viewer-image-height) w-(--ck-viewer-image-width) max-w-none"
        )}
        decoding={imageDecoding}
        draggable={imageDraggable}
        fetchPriority={imageFetchPriority}
        height={imageDisplaySize?.height}
        key={src}
        loading={imageLoading}
        onError={onImageError}
        onLoad={(event) => {
          zoomActions.readNaturalSize(event.currentTarget);
          onImageLoad?.(event);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        // A stable ref callback: a new function each render would run decode again each render.
        // oxlint-disable-next-line react/refs
        ref={zoomActions.attachImage}
        referrerPolicy={imageReferrerPolicy}
        src={src}
        style={contentSize}
        width={imageDisplaySize?.width}
      />
    ) : (
      <div
        className={cn(
          "m-auto shrink-0 select-text",
          contentSize !== undefined &&
            "h-(--ck-viewer-image-height) w-(--ck-viewer-image-width)"
        )}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        ref={zoomActions.attachContent}
        style={contentSize}
      >
        {zoomableContent.content}
      </div>
    ));

  const gestures = previewContent === undefined && renderPreview === undefined;

  const frame = (
    <FrameElement
      className={cn(
        "pointer-events-auto flex flex-col justify-center",
        overlay ? "items-stretch" : "items-center",
        contained && containerResizeEdges === "all" && "absolute inset-2",
        contained &&
          containerResizeEdges === "top-and-sides" &&
          "absolute inset-x-2 top-2 bottom-0",
        !(contained && containerResizeEdges !== undefined) &&
          "relative size-full",
        !overlay && "pb-8",
        !(inline || overlay) && contained && "pt-12",
        !(inline || overlay || contained) &&
          "in-data-[ui-titlebar-inset]:pt-24",
        !(inline || overlay) &&
          (hasNavigation ? "px-16 sm:px-20" : "px-4 sm:px-8")
      )}
      onPointerDown={closeOnBackdrop}
      plain={inline || contained || overlay}
      windowControlsRight={windowControls.right}
    >
      {headerContent}
      {inline || overlay ? null : (
        <div
          className={cn(
            "absolute right-3 z-10 flex items-center gap-2",
            contained
              ? "top-3"
              : cn(styles.windowActions, "in-data-[ui-titlebar-inset]:top-12")
          )}
        >
          {toolbarLeadingAction === undefined ? null : (
            <Button
              aria-label={toolbarLeadingAction.ariaLabel}
              aria-pressed={toolbarLeadingAction.active}
              className={cn(
                downloadButtonClass,
                "relative",
                toolbarLeadingAction.active === true
                  ? "h-9 min-w-0 p-1"
                  : "h-9 min-w-10 px-3"
              )}
              disabledAppearance="none"
              focusRing="none"
              onClick={(event) => {
                event.stopPropagation();
                toolbarLeadingAction.onClick();
              }}
              onPointerDown={swallowPointer}
              unstyled
            >
              <span
                className={cn(
                  "pointer-events-none rounded-full text-sm font-medium whitespace-nowrap",
                  toolbarLeadingAction.active === true &&
                    "bg-text-notice px-3 py-1 text-white",
                  toolbarLeadingAction.active !== true && "p-1"
                )}
              >
                {toolbarLeadingAction.label}
              </span>
            </Button>
          )}
          {editButton === undefined ? null : (
            <Button
              aria-label={editButton.ariaLabel}
              className={downloadButtonClass}
              disabledAppearance="none"
              focusRing="none"
              onClick={(event) => {
                event.stopPropagation();
                editButton.onClick();
              }}
              onPointerDown={swallowPointer}
              unstyled
            >
              {editButton.icon}
            </Button>
          )}
          {download}
          {toolbarContent}
          {toolbarActions?.map((action) => (
            <Button
              aria-label={action.ariaLabel}
              className={downloadButtonClass}
              disabledAppearance="none"
              focusRing="none"
              key={action.ariaLabel}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick();
              }}
              onPointerDown={swallowPointer}
              unstyled
            >
              {action.icon}
            </Button>
          ))}
          <Button
            aria-label={closeAriaLabel}
            className={downloadButtonClass}
            disabledAppearance="none"
            focusRing="none"
            onClick={(event) => {
              event.stopPropagation();
              changeOpen(false);
            }}
            onPointerDown={swallowPointer}
            unstyled
          >
            <ViewerCloseIcon className="size-4.5" />
          </Button>
        </div>
      )}
      {onPreviousImage === undefined ? null : (
        <Button
          aria-label={previousAriaLabel}
          className={cn(
            downloadButtonClass,
            "absolute top-1/2 left-3 z-10 -translate-y-1/2 p-0"
          )}
          disabled={previousDisabled}
          disabledAppearance="none"
          focusRing="none"
          onClick={(event) => {
            event.stopPropagation();
            showPrevious();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          unstyled
        >
          <ViewerArrowLeftIcon className="size-4.5" />
        </Button>
      )}
      {onNextImage === undefined ? null : (
        <Button
          aria-label={nextAriaLabel}
          className={cn(
            downloadButtonClass,
            "absolute top-1/2 right-3 z-10 -translate-y-1/2 p-0"
          )}
          disabled={nextDisabled}
          disabledAppearance="none"
          focusRing="none"
          onClick={(event) => {
            event.stopPropagation();
            showNext();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          unstyled
        >
          <ViewerArrowLeftIcon className="size-4.5 rotate-180" />
        </Button>
      )}
      <div
        className={cn(
          imageSurface === "card" &&
            "flex min-h-0 w-full flex-1 overflow-hidden rounded-2xl bg-panel-elevated-secondary p-4",
          imageSurface !== "card" &&
            (overlay ? "flex min-h-0 w-full flex-1 px-18" : "contents")
        )}
      >
        <div
          className={cn(
            "flex min-h-0 w-full min-w-0 flex-1 items-start justify-start overflow-auto",
            overlay && "relative items-stretch self-stretch overflow-hidden",
            previewContent === undefined && "touch-none"
          )}
          data-testid="image-viewer-dismiss-region"
          onPointerCancelCapture={gestures ? touch.onPointerUp : undefined}
          onPointerDown={(event) => {
            if (
              !inline &&
              !overlay &&
              imageSurface !== "card" &&
              event.target === event.currentTarget
            ) {
              changeOpen(false);
            }
          }}
          onPointerDownCapture={gestures ? touch.onPointerDown : undefined}
          onPointerMoveCapture={gestures ? touch.onPointerMove : undefined}
          onPointerUpCapture={gestures ? touch.onPointerUp : undefined}
          ref={zoomActions.attachViewport}
        >
          {inline ? null : (
            <DialogTitle className="sr-only">{dialogAriaLabel}</DialogTitle>
          )}
          {preview}
        </div>
      </div>
      {bottomVisible ? (
        <div
          className={
            overlay
              ? "z-10 flex min-w-0 shrink-0 items-center justify-center gap-3 p-4 text-sm"
              : "z-10 mt-5 flex max-w-[min(48rem,calc(100vw-2rem))] flex-col items-center gap-3 text-text"
          }
        >
          {renderBottomAction?.(
            cn(
              CONTROL_SURFACE,
              roundSurface,
              "gap-1 px-4 py-2 text-sm no-underline"
            )
          )}
          {bottomContent}
          {trimmedCaption === null ? null : (
            <div
              className={cn(
                roundSurface,
                "max-w-full rounded-2xl px-4 py-2 text-center text-sm shadow-md ring-1 ring-black/5"
              )}
            >
              {trimmedCaption}
            </div>
          )}
          {zoomControlsBottom ? (
            <div
              className={cn(
                roundSurface,
                "flex items-center gap-1 rounded-full p-1 shadow-md ring-1 ring-black/5"
              )}
            >
              <Button
                aria-label="Zoom out image"
                className={ZOOM_BUTTON_CLASS}
                disabled={!zoomView.canZoomOut}
                disabledAppearance="none"
                focusRing="none"
                onClick={() => {
                  zoomActions.step("out");
                }}
                unstyled
              >
                <ViewerMinusIcon className="size-3.5" />
              </Button>
              <div className="flex min-w-16 items-center justify-center px-2 text-center text-sm tabular-nums [-webkit-app-region:no-drag]">
                <span>{percentLabel}</span>
              </div>
              <Button
                aria-label="Zoom in image"
                className={ZOOM_BUTTON_CLASS}
                disabled={!zoomView.canZoomIn}
                disabledAppearance="none"
                focusRing="none"
                onClick={() => {
                  zoomActions.step("in");
                }}
                unstyled
              >
                <ViewerPlusIcon className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </FrameElement>
  );

  if (inline) {
    return frame;
  }

  return (
    <Dialog
      contentClassName={
        overlay
          ? undefined
          : cn(
              CLASSIC_CONTENT_CLASS,
              contained ? "h-full w-full" : "fixed h-[100dvh] w-screen",
              (contained || !modal) && "!bg-black/90",
              disableOpenAnimation && "!animate-none"
            )
      }
      contentProps={{
        "aria-describedby": undefined,
        "aria-label": dialogAriaLabel,
        onAuxClick: (event) => {
          event.stopPropagation();
        },
        onClick: (event) => {
          event.stopPropagation();

          if (overlay) {
            const pressed = clickStartRef.current !== null;
            clickStartRef.current = null;

            if (
              pressed &&
              event.detail > 0 &&
              !event.defaultPrevented &&
              isBackdropClick(event)
            ) {
              changeOpen(false);
            }
          } else if (event.target === event.currentTarget) {
            changeOpen(false);
          }
        },
        onCloseAutoFocus,
        onEscapeKeyDown: (event) => {
          if (event.composedPath()[0] instanceof HTMLInputElement) {
            event.preventDefault();
          } else {
            event.stopPropagation();
          }
        },
        onInteractOutside:
          contained || !modal
            ? (event) => {
                event.preventDefault();
              }
            : undefined,
        onKeyDown: (event) => {
          const modified =
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.nativeEvent.isComposing;

          if (modified || !allowsArrowNavigation(event.target)) {
            return;
          }

          if (event.key === "ArrowLeft" && onPreviousImage !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            showPrevious();
          }

          if (event.key === "ArrowRight" && onNextImage !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            showNext();
          }
        },
        onOpenAutoFocus,
        onPointerCancelCapture: overlay
          ? () => {
              clickStartRef.current = null;
            }
          : undefined,
        onPointerDownCapture: overlay
          ? (event) => {
              clickStartRef.current =
                event.isPrimary && event.button === 0 && isBackdropClick(event)
                  ? pointOf(event)
                  : null;
            }
          : undefined,
        onPointerMoveCapture: overlay
          ? (event) => {
              const start = clickStartRef.current;

              if (
                start !== null &&
                Math.hypot(
                  event.clientX - start.clientX,
                  event.clientY - start.clientY
                ) > CLICK_SLOP_PX
              ) {
                clickStartRef.current = null;
              }
            }
          : undefined,
      }}
      modal={modal && !contained}
      onOpenChange={changeOpen}
      open={open}
      overlayClassName={
        overlay
          ? undefined
          : cn(
              "!bg-black/90",
              contained &&
                containerResizeEdges !== undefined &&
                "pointer-events-none",
              disableOpenAnimation && "!animate-none"
            )
      }
      portalContainer={container}
      showDialogClose={false}
      triggerContent={triggerContent}
      unstyledContent={!overlay}
      variant={overlay ? "image" : undefined}
      viewportSized={!contained}
    >
      {frame}
    </Dialog>
  );
};
