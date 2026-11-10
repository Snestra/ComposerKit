"use client";

import { cn } from "composerkit/lib/utils";
import { useSyncExternalStore } from "react";
import type { ComponentProps } from "react";

import styles from "composerkit/components/composer/composer.module.css";

/** Draws the overlay material with CSS. A host layer can replace it through the data-ck-overlay-* attributes. */

const CK_OVERLAY_ROUTE = "/ck-overlay";

/** The pathname, or the initialRoute query value without its own query, is the overlay window. */
const isAvatarOverlayLocation = ({
  initialRoute,
  pathname,
}: {
  initialRoute: string | null;
  pathname: string;
}) =>
  pathname === CK_OVERLAY_ROUTE ||
  initialRoute?.split("?")[0] === CK_OVERLAY_ROUTE;

/** The location the test reads; empty without a window. */
const readLocation = () => {
  if (typeof window === "undefined") {
    return { initialRoute: null, pathname: "" };
  }

  const url = new URL(window.location.href);

  return {
    initialRoute: url.searchParams.get("initialRoute"),
    pathname: url.pathname,
  };
};

const subscribeToLocation = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);

  return () => {
    window.removeEventListener("popstate", onChange);
  };
};

/** True on the overlay window. Server and first client render say false. */
const useIsAvatarOverlay = () =>
  useSyncExternalStore(
    subscribeToLocation,
    () => isAvatarOverlayLocation(readLocation()),
    () => false
  );

type AvatarOverlayMaterialTone = string;

interface AvatarOverlayMaterialProps extends ComponentProps<"div"> {
  nativeSurfaceId?: string;
  tone?: AvatarOverlayMaterialTone;
  /** Falls back to `nativeSurfaceId`. */
  variant?: string;
}

/** A div with the material class and the overlay material attributes. */
const AvatarOverlayMaterial = ({
  className,
  nativeSurfaceId,
  tone,
  variant,
  ...props
}: AvatarOverlayMaterialProps) => {
  const isQuickChat = variant === "quick" || variant === "quick-stash";

  return (
    <div
      {...props}
      className={cn(
        styles.material,
        isQuickChat && styles.quickChatMaterial,
        className
      )}
      data-ck-overlay-compact-tone={tone}
      data-ck-overlay-material="css"
      data-ck-overlay-variant={variant ?? nativeSurfaceId}
      data-ck-overlay-native-surface-id={nativeSurfaceId}
    />
  );
};

export { AvatarOverlayMaterial, isAvatarOverlayLocation, useIsAvatarOverlay };

export type { AvatarOverlayMaterialProps, AvatarOverlayMaterialTone };
