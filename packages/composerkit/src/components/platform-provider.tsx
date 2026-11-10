"use client";

import { createContext, createElement, useContext, useMemo } from "react";
import type { ComponentProps, ComponentType, ReactNode } from "react";

export type PlatformLinkProps = ComponentProps<"a">;

export type PlatformLinkComponent = "a" | ComponentType<PlatformLinkProps>;

/** `"core"` and `"all"` name the built-in widget sets. A list is used as given. */
export type PlatformWidgets = "all" | "core" | readonly string[];

export interface PlatformValue {
  widgets: PlatformWidgets;
  hydrationSafe: boolean;
  linkComponent: PlatformLinkComponent;
  radixPortalContainer: HTMLElement | null | undefined;
}

export interface PlatformProviderProps {
  widgets?: PlatformWidgets;
  children?: ReactNode;
  hydrationSafe?: boolean;
  linkComponent?: PlatformLinkComponent;
  radixPortalContainer?: HTMLElement | null;
}

/** Without a provider the context is `null`. */
export const PlatformContext = createContext<PlatformValue | null>(null);

export const PlatformProvider = ({
  widgets = "core",
  children,
  hydrationSafe = false,
  linkComponent = "a",
  radixPortalContainer,
}: PlatformProviderProps) => {
  const value = useMemo(
    () => ({
      hydrationSafe,
      linkComponent,
      radixPortalContainer,
      widgets,
    }),
    [widgets, hydrationSafe, linkComponent, radixPortalContainer]
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => useContext(PlatformContext);

/** The provider's link component, or `"a"` outside a provider. */
export const useLinkComponent = (): PlatformLinkComponent =>
  useContext(PlatformContext)?.linkComponent ?? "a";

/** The element portals should render into. `undefined` means the default. */
export const usePortalContainer = () =>
  useContext(PlatformContext)?.radixPortalContainer;

export const useHydrationSafe = () =>
  useContext(PlatformContext)?.hydrationSafe ?? false;

/** The provider's widget setting, or `"core"` outside a provider. */
export const useWidgets = (): PlatformWidgets =>
  useContext(PlatformContext)?.widgets ?? "core";

/** Picks the widget types a setting allows from the two built-in sets. */
export const resolveWidgets = (
  allowed: PlatformWidgets,
  sets: { all: readonly string[]; core: readonly string[] }
): readonly string[] => {
  if (allowed === "core") {
    return sets.core;
  }

  return allowed === "all" ? sets.all : allowed;
};

/** An anchor that renders through the provider's link component. */
export const PlatformLink = (props: PlatformLinkProps) =>
  createElement(useLinkComponent(), props);
