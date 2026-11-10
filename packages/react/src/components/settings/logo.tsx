"use client";

import { HOST_ORIGIN } from "@workspace/react/lib/host";
import { isNil, isPresent } from "@workspace/react/lib/present";
import { cn } from "@workspace/react/lib/utils";
import {
  cloneElement,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement } from "react";

import { knownAppIcon, knownAppImage } from "./known-apps";

/*
 * The plugin logo follows the element's nearest theme scope, so a dark panel
 * in a light page shows the dark logo. Remote URLs and fallback artwork are
 * chosen separately from the known-app icon registry.
 */

const COLOR_SCHEME_ATTRIBUTES = ["class", "data-theme", "style"];

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

const subscribeToSchemeChanges = (onChange: () => void) => {
  listeners.add(onChange);

  if (isNil(observer)) {
    observer = new MutationObserver(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    observer.observe(document.documentElement, {
      attributeFilter: COLOR_SCHEME_ATTRIBUTES,
      attributes: true,
      subtree: true,
    });
  }

  return () => {
    listeners.delete(onChange);

    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
};

/** True when the element's nearest theme scope is dark. */
const useIsDarkScope = () => {
  const [element, setElement] = useState<Element | null>(null);

  const isDark = useSyncExternalStore(
    subscribeToSchemeChanges,
    () =>
      isPresent(element) && getComputedStyle(element).colorScheme === "dark",
    () => false
  );

  return [isDark, setElement] as const;
};

// Trim; an empty URL is no URL; dark prefers the dark URL.
const trimmed = (url: string | null | undefined) => {
  const value = url?.trim();

  return isNil(value) || value.length === 0 ? null : value;
};

/**
 * A /images/ URL resolves against the app origin, and the
 * flight-search app icon maps to the packaged asset (879db7229155.png).
 */
const PACKAGED_ICONS = new Map([
  [
    "/images/ecosystem/apps/flight_search/icon.png",
    "/images/ecosystem/apps/flight_search/icon.png",
  ],
]);

const resolveLogoUrl = (url: string) => {
  // A /images/ URL resolves against the app origin before mapping.
  const resolved = url.startsWith("/images/")
    ? new URL(url, HOST_ORIGIN).href
    : url;

  let parsed: URL;

  try {
    parsed = new URL(resolved, HOST_ORIGIN);
  } catch {
    return resolved;
  }

  if (parsed.origin !== HOST_ORIGIN) {
    return resolved;
  }

  const packaged = PACKAGED_ICONS.get(parsed.pathname);

  return packaged === undefined
    ? resolved
    : `${packaged}${parsed.search}${parsed.hash}`;
};

const chooseLogoUrl = ({
  isDark,
  logoDarkUrl,
  logoUrl,
}: {
  isDark: boolean;
  logoDarkUrl?: string | null;
  logoUrl?: string | null;
}) => {
  const light = trimmed(logoUrl);
  const dark = trimmed(logoDarkUrl);

  const chosen = isDark ? (dark ?? light) : (light ?? dark);

  return chosen === null ? null : resolveLogoUrl(chosen);
};

interface SettingsPluginLogoProps {
  alt?: string;
  className?: string;
  /** The known-app registry lookup, before a remote logo. */
  knownAppId?: string;
  connectorId?: string;
  /** Shown when there is no URL or the image fails to load. */
  fallback: ReactElement<{ className?: string }>;
  logoDarkUrl?: string | null;
  logoUrl?: string | null;
}

const SettingsPluginLogo = ({
  alt = "",
  className,
  connectorId,
  fallback,
  knownAppId,
  logoDarkUrl,
  logoUrl,
}: SettingsPluginLogoProps) => {
  const [isDark, scopeRef] = useIsDarkScope();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = chooseLogoUrl({ isDark, logoDarkUrl, logoUrl });
  const failed = isPresent(src) && failedSrc === src;

  const markFailed = useCallback(() => {
    setFailedSrc(src);
  }, [src]);

  // The caller's className reaches the fallback as well.
  // oxlint-disable-next-line react/no-clone-element -- the component clones the fallback element to add the rounded class.
  const fallbackElement = cloneElement(fallback, {
    className: cn("rounded-2xs", className, fallback.props.className),
  });

  // oxlint-disable-next-line react/static-components -- this is a registry lookup of an existing component, not a component created during render
  const KnownIcon = knownAppIcon(knownAppId ?? connectorId);
  const knownImage = knownAppImage(knownAppId ?? connectorId);

  return (
    <span className="contents" ref={scopeRef}>
      {(() => {
        if (KnownIcon) {
          // oxlint-disable-next-line react/static-components -- a registry lookup, not a component created during render
          return <KnownIcon className={className} />;
        }

        if (knownImage !== null) {
          return (
            // oxlint-disable-next-line next/no-img-element -- the registry's iconUrl image
            <img alt={alt} className={className} src={knownImage} />
          );
        }

        if (isNil(src) || failed) {
          return fallbackElement;
        }

        return (
          // oxlint-disable-next-line next/no-img-element -- the logo is a remote or app URL of unknown size, loaded as the img with an error fallback
          <img
            alt={alt}
            className={cn("rounded-2xs object-contain", className)}
            key={src}
            onError={markFailed}
            src={src}
          />
        );
      })()}
    </span>
  );
};

export { SettingsPluginLogo };

export type { SettingsPluginLogoProps };
