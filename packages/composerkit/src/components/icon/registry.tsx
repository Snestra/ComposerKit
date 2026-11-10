"use client";

import { BlankGlyph } from "composerkit/components/icon/glyphs";
import iconAliases from "composerkit/components/icon/icon-aliases.json";
import { dynamicIconImports } from "lucide-react/dynamic";
import { createElement, lazy, Suspense } from "react";
import type { ComponentType, LazyExoticComponent, SVGProps } from "react";

type IconSvgProps = Omit<SVGProps<SVGSVGElement>, "ref">;

export interface NamedIconProps extends IconSvgProps {
  name: string;
  weight?: "light";
}

const VENDOR_PREFIX = "vendor:";
const LUCIDE_PREFIX = "lucide:";
const iconNames = new Map(Object.entries(iconAliases));

const EvernoteIcon = lazy(
  async () => await import("composerkit/components/icon/vendor/evernote")
);

const lucideLoaders = new Map(Object.entries(dynamicIconImports));

const lucideModules = new Map<
  string,
  LazyExoticComponent<ComponentType<IconSvgProps>>
>();

const toPascalCase = (name: string) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/** A lucide icon loads on first use, so the bundle holds only the icons a page names. */
const lucideModule = (name: string) => {
  const cached = lucideModules.get(name);

  if (cached !== undefined) {
    return cached;
  }

  const load = lucideLoaders.get(name);

  if (load === undefined) {
    return null;
  }

  const component = lazy(load);

  lucideModules.set(name, component);

  return component;
};

const LucideIcon = ({
  height = "1em",
  name,
  width = "1em",
  ...props
}: IconSvgProps & { name: string }) => {
  const component = lucideModule(name);

  if (component === null) {
    return <BlankGlyph height={height} width={width} {...props} />;
  }

  return (
    <Suspense
      fallback={<BlankGlyph height={height} width={width} {...props} />}
    >
      {createElement(component, { ...props, height, width })}
    </Suspense>
  );
};

const VendorIcon = ({ name, ...props }: IconSvgProps & { name: string }) => {
  const [, vendor, iconName = ""] = name.split(":");

  if (vendor !== "evernote") {
    return <BlankGlyph {...props} />;
  }

  return (
    <Suspense fallback={<BlankGlyph {...props} />}>
      <EvernoteIcon name={toPascalCase(iconName)} {...props} />
    </Suspense>
  );
};

/** Resolves registry aliases, "lucide:<name>", and supported vendor names. */
export const NamedIcon = ({ name, weight, ...props }: NamedIconProps) => {
  if (name.startsWith(VENDOR_PREFIX)) {
    return <VendorIcon name={name} {...props} />;
  }

  if (name.startsWith(LUCIDE_PREFIX)) {
    return <LucideIcon name={name.slice(LUCIDE_PREFIX.length)} {...props} />;
  }

  const iconName =
    (weight === "light" ? iconNames.get(`${name}-light`) : undefined) ??
    iconNames.get(name);

  if (iconName === undefined) {
    // An unknown name warns in the console and renders nothing.
    // oxlint-disable-next-line no-console
    console.warn(`Icon "${name}" not found.`);

    return null;
  }

  return (
    <LucideIcon
      name={iconName}
      strokeWidth={weight === "light" || name.endsWith("-light") ? 1.5 : 2}
      {...props}
    />
  );
};
