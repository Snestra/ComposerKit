"use client";

import { cn } from "composerkit/lib/utils";
import { createElement, useSyncExternalStore } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";

import styles from "./responsive-icon.module.css";

type IconSvgProps = Omit<SVGProps<SVGSVGElement>, "ref">;

export type IconComponent = ComponentType<IconSvgProps>;

/** leading shows both sources and lets CSS pick, inline is 20px, secondary is 16px. */
export type IconSize = "inline" | "leading" | "secondary";

export interface IconSizePair {
  16: IconComponent;
  20: IconComponent;
}

export interface AssetIcon {
  ariaHidden?: boolean;
  assets: IconSizePair;
}

export interface ArtworkIcon {
  artwork: { dark?: IconSpec; light: IconSpec };
  secondary?: IconComponent;
}

export type IconSpec = ArtworkIcon | AssetIcon | IconComponent | IconSizePair;

const isAssetIcon = (icon: IconSpec): icon is AssetIcon => "assets" in icon;

const isArtworkIcon = (icon: IconSpec): icon is ArtworkIcon =>
  "artwork" in icon;

const isSizePair = (icon: IconSpec): icon is IconSizePair => 16 in icon;

const THEME_ATTRIBUTES = ["class", "data-theme"];

const themeListeners = new Set<() => void>();

let themeObserver: MutationObserver | null = null;

const subscribeToTheme = (onChange: () => void) => {
  themeListeners.add(onChange);

  if (themeObserver === null) {
    themeObserver = new MutationObserver(() => {
      for (const listener of themeListeners) {
        listener();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: THEME_ATTRIBUTES,
      attributes: true,
    });
  }

  return () => {
    themeListeners.delete(onChange);

    if (themeListeners.size === 0) {
      themeObserver?.disconnect();
      themeObserver = null;
    }
  };
};

/**
 * The theme is read from data-theme on the root element. This app marks dark
 * with the dark class, so the class counts when data-theme is absent. Null means
 * the theme is not known yet, which picks the light artwork.
 */
const readIsDark = () => {
  const root = document.documentElement;
  const { theme } = root.dataset;

  if (theme !== undefined) {
    return theme === "dark";
  }

  return root.classList.contains("dark") ? true : null;
};

const readIsDarkOnServer = () => null;

export const useIsDarkTheme = () =>
  useSyncExternalStore(subscribeToTheme, readIsDark, readIsDarkOnServer);

interface ResponsiveIconSourcesProps {
  "aria-hidden"?: boolean | "false" | "true";
  compact: ReactNode;
  leading: ReactNode;
}

/**
 * Renders the 16px and 20px sources in sibling spans. The container chooses
 * the density with --icon-compact-display and --icon-start-display.
 */
export const ResponsiveIconSources = ({
  "aria-hidden": ariaHidden,
  compact,
  leading,
}: ResponsiveIconSourcesProps) => (
  <>
    <span aria-hidden={ariaHidden} className={styles.compactSource}>
      {compact}
    </span>
    <span aria-hidden={ariaHidden} className={styles.leadingSource}>
      {leading}
    </span>
  </>
);

export interface ResponsiveIconProps extends IconSvgProps {
  icon: IconSpec;
  legacyClassName?: string;
  size?: IconSize;
}

export const ResponsiveIcon = ({
  className,
  icon,
  legacyClassName = "icon-xs shrink-0",
  size = "leading",
  ...props
}: ResponsiveIconProps) => {
  const isDark = useIsDarkTheme();

  if (isAssetIcon(icon)) {
    const ariaHidden = props["aria-hidden"] ?? icon.ariaHidden;

    if (size !== "leading") {
      return createElement(icon.assets[size === "inline" ? 20 : 16], {
        "aria-hidden": ariaHidden,
        className,
      });
    }

    return (
      <ResponsiveIconSources
        aria-hidden={ariaHidden}
        compact={createElement(icon.assets[16], {
          "aria-hidden": ariaHidden,
          className,
        })}
        leading={createElement(icon.assets[20], {
          "aria-hidden": ariaHidden,
          className,
        })}
      />
    );
  }

  if (isArtworkIcon(icon)) {
    if (size === "secondary" && icon.secondary !== undefined) {
      return createElement(icon.secondary, {
        ...props,
        "aria-hidden": true,
        className: cn(legacyClassName, className),
      });
    }

    const { dark, light } = icon.artwork;

    return (
      <ResponsiveIcon
        aria-hidden
        className={className}
        icon={isDark === true ? (dark ?? light) : light}
        legacyClassName={
          size === "inline" ? "icon-base shrink-0" : "icon-leading shrink-0"
        }
        size={size}
      />
    );
  }

  if (isSizePair(icon)) {
    if (size === "inline") {
      return createElement(icon[20], {
        ...props,
        "aria-hidden": true,
        className,
      });
    }

    if (size !== "leading") {
      return createElement(icon[16], {
        ...props,
        "aria-hidden": true,
        className,
      });
    }

    return (
      <ResponsiveIconSources
        aria-hidden
        compact={createElement(icon[16], {
          ...props,
          "aria-hidden": true,
          className,
        })}
        leading={createElement(icon[20], {
          ...props,
          "aria-hidden": true,
          className,
        })}
      />
    );
  }

  return createElement(icon, {
    ...props,
    className: cn(legacyClassName, className),
  });
};

export interface CompactIconProps extends IconSvgProps {
  asset16?: IconComponent;
  icon16: IconComponent;
  legacyClassName?: string;
  legacyIcon: IconComponent;
}

/** The compact variant: a legacy icon in the compact span and a 16px asset in the leading span. */
export const CompactIcon = ({
  asset16,
  className,
  icon16,
  legacyClassName = "icon-2xs shrink-0",
  legacyIcon,
  ...props
}: CompactIconProps) => (
  <ResponsiveIconSources
    compact={createElement(legacyIcon, {
      className: cn(legacyClassName, className),
      ...props,
    })}
    leading={createElement(asset16 ?? icon16, { className, ...props })}
  />
);
