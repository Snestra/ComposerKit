"use client";

import { useSyncExternalStore } from "react";

/*
 * The host zoom bridge. The desktop
 * menu cannot reach into a viewer, so the viewer registers with this module
 * while it is open: the host menu calls `dispatchImageViewerZoom`, and the
 * rest of the app asks `isImageViewerActive` to know a viewer is showing.
 */

export type ImageViewerZoomCommand =
  | { delta: number; type: "step-zoom" }
  | { type: "reset-zoom" };

type ZoomHandler = (command: ImageViewerZoomCommand) => void;

let openViewerCount = 0;
let zoomHandler: ZoomHandler | null = null;
const activeListeners = new Set<() => void>();

const notifyActive = () => {
  for (const listener of activeListeners) {
    listener();
  }
};

/** Listens for the active state changing; returns the unsubscribe. */
export const subscribeImageViewerActive = (listener: () => void) => {
  activeListeners.add(listener);

  return () => {
    activeListeners.delete(listener);
  };
};

/** Is any viewer open? */
export const isImageViewerActive = () => openViewerCount > 0;

/**
 * Counts an open viewer. The returned cleanup counts it out once,
 * however many times it is called, and the count never goes below zero.
 */
export const registerOpenImageViewer = () => {
  let registered = true;
  openViewerCount += 1;
  notifyActive();

  return () => {
    if (registered) {
      registered = false;
      openViewerCount = Math.max(0, openViewerCount - 1);
      notifyActive();
    }
  };
};

/**
 * Makes `handler` the one that receives zoom commands. A later
 * registration replaces it, and a cleanup only clears the handler it set.
 */
export const registerImageViewerZoomHandler = (handler: ZoomHandler) => {
  zoomHandler = handler;

  return () => {
    if (zoomHandler === handler) {
      zoomHandler = null;
    }
  };
};

/** The host menu sends a zoom command to the registered viewer. */
export const dispatchImageViewerZoom = (command: ImageViewerZoomCommand) => {
  zoomHandler?.(command);
};

/** Whether a viewer is open, as React state. */
export const useImageViewerActive = () =>
  useSyncExternalStore(
    subscribeImageViewerActive,
    isImageViewerActive,
    () => false
  );
