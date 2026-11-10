"use client";

import {
  readPreferredLocales,
  readSafeAreaInsets,
  readPixelRatio,
  readViewportHeight,
  readViewportWidth,
  readDarkAppearance,
  isDesktopPlatform,
  watchDarkAppearance,
  watchSafeArea,
  watchViewportSize,
  watchReducedMotion,
  hasReducedMotion,
} from "composerkit/lib/device";
import type { SafeAreaInsets } from "composerkit/lib/device";
import { useEffect, useState, useSyncExternalStore } from "react";

export interface Viewport {
  desktop: boolean;
  height: number;
  insets: SafeAreaInsets;
  scale: number;
  width: number;
}

const readViewport = (): Viewport => ({
  desktop: isDesktopPlatform(),
  height: readViewportHeight(),
  insets: readSafeAreaInsets(),
  scale: readPixelRatio(),
  width: readViewportWidth(),
});

/** Follows the reduced-motion setting. It is `true` while rendering on the server. */
export const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    (onChange) => {
      const subscription = watchReducedMotion(onChange);

      return subscription.cancel;
    },
    hasReducedMotion,
    () => true
  );

/** Follows `readDarkAppearance`, including the override set with `setAppearancePreference`. */
export const useDarkMode = () =>
  useSyncExternalStore(
    (onChange) => {
      const subscription = watchDarkAppearance(onChange);

      return subscription.cancel;
    },
    readDarkAppearance,
    () => false
  );

/** The device locale list. It is empty until the page is hydrated. */
export const useDeviceLocales = () => {
  const [locales, setLocales] = useState<string[]>([]);

  useEffect(() => {
    const update = () => {
      setLocales(readPreferredLocales());
    };

    update();
    window.addEventListener("languagechange", update);

    return () => {
      window.removeEventListener("languagechange", update);
    };
  }, []);

  return locales;
};

/** Window size, scale and insets, measured again on resize and rotation. `null` until hydrated. */
export const useViewport = () => {
  const [viewport, setViewport] = useState<Viewport | null>(null);

  useEffect(() => {
    const update = () => {
      setViewport(readViewport());
    };

    update();
    const size = watchViewportSize(update);
    const insets = watchSafeArea(update);

    return () => {
      size.cancel();
      insets.cancel();
    };
  }, []);

  return viewport;
};
