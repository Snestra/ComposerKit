"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

/* Reduced motion preferences shared by the progress and avatar components. */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const noCleanup = () => {
  // There is nothing to undo when the element is missing or cannot be observed.
};

const subscribeNothing = () => noCleanup;

const subscribeSystemReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
};

const readSystemReducedMotion = () =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

const readNoReducedMotion = () => false;

/** ReducedMotionPreference setting: `off`, `on` or `system`. */
type ReducedMotionPreference = "off" | "on" | "system";

/**
 * The two app stores that the reduced-motion code reads: the
 * reducedMotionPreference setting (whose default is `system`) and the
 * settings-loaded flag.
 */
interface ReducedMotionSettings {
  preference: ReducedMotionPreference;
  settingsReady: boolean;
}

/*
 * Without a provider the preference is the store default, `system`. The
 * settings-loaded flag is true there: a host with no settings to wait for
 * (the flag is false only while its settings query is a placeholder).
 */
const ReducedMotionContext = createContext<ReducedMotionSettings>({
  preference: "system",
  settingsReady: true,
});

interface ReducedMotionProviderProps extends Partial<ReducedMotionSettings> {
  children?: ReactNode;
}

/** Supplies the preference and the settings-loaded flag to useReducedMotion and ReducedMotionAttribute. */
const ReducedMotionProvider = ({
  children,
  preference = "system",
  settingsReady = true,
}: ReducedMotionProviderProps) => {
  const value = useMemo(
    () => ({ preference, settingsReady }),
    [preference, settingsReady]
  );

  return (
    <ReducedMotionContext.Provider value={value}>
      {children}
    </ReducedMotionContext.Provider>
  );
};

/** `off` is false, `on` is true and `system` is the media query. */
const resolveReducedMotion = (
  preference: ReducedMotionPreference,
  systemPrefersReducedMotion: boolean
): boolean => {
  switch (preference) {
    case "off": {
      return false;
    }

    case "on": {
      return true;
    }

    case "system": {
      return systemPrefersReducedMotion;
    }

    default: {
      return systemPrefersReducedMotion;
    }
  }
};

/**
 * The answer derived from the preference and
 * the (prefers-reduced-motion: reduce) query. It never reads the root
 * data-ck-reduced-motion attribute, which is the host's output (see
 * ReducedMotionAttribute), so it keeps answering from the preference while
 * the settings load. `enabled` (default true) false returns false without
 * looking at the preference or the query.
 */
const useReducedMotion = (enabled = true): boolean => {
  const { preference } = useContext(ReducedMotionContext);

  const systemPrefersReducedMotion = useSyncExternalStore(
    enabled ? subscribeSystemReducedMotion : subscribeNothing,
    enabled ? readSystemReducedMotion : readNoReducedMotion,
    readNoReducedMotion
  );

  return (
    enabled && resolveReducedMotion(preference, systemPrefersReducedMotion)
  );
};

/**
 * The host component writes
 * documentElement.dataset.ckReducedMotion as String(!settingsReady || reduced)
 * in a layout effect and deletes it on unmount. While the settings load the
 * attribute is "true" although useReducedMotion already answers from the
 * preference. Every non-React reader (CSS variants, cannon,
 * content) reads this attribute: unset follows the media query.
 */
const ReducedMotionAttribute = () => {
  const { settingsReady } = useContext(ReducedMotionContext);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.ckReducedMotion = String(!settingsReady || reduced);

    return () => {
      delete root.dataset.ckReducedMotion;
    };
  }, [settingsReady, reduced]);

  return null;
};

export {
  ReducedMotionAttribute,
  ReducedMotionProvider,
  resolveReducedMotion,
  useReducedMotion,
};

export type {
  ReducedMotionPreference,
  ReducedMotionProviderProps,
  ReducedMotionSettings,
};
