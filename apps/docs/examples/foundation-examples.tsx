import {
  defaultThemeVariables,
  resolveStaticVariables,
} from "@workspace/react/lib/theme-variables";
import type { ThemeVariant } from "@workspace/react/lib/theme-variables";
import Link from "next/link";

import { ClipboardExample } from "@/examples/clipboard-examples";
import {
  DarkModeExample,
  MotionExample,
  RtlExample,
  ViewportExample,
} from "@/examples/device-examples";
import { IconExample } from "@/examples/icon-examples";
import { ProviderExample } from "@/examples/provider-examples";

const swatches = [
  ["--ck-palette-surface-surface", "bg-(--ck-palette-surface-surface)"],
  [
    "--ck-palette-surface-surface-under",
    "bg-(--ck-palette-surface-surface-under)",
  ],
  [
    "--ck-palette-surface-editor-opaque",
    "bg-(--ck-palette-surface-editor-opaque)",
  ],
  [
    "--ck-palette-surface-elevated-primary-opaque",
    "bg-(--ck-palette-surface-elevated-primary-opaque)",
  ],
  ["--ck-palette-surface-control", "bg-(--ck-palette-surface-control)"],
  ["--ck-palette-ink", "bg-(--ck-palette-ink)"],
  ["--ck-palette-ink-secondary", "bg-(--ck-palette-ink-secondary)"],
  ["--ck-palette-ink-tertiary", "bg-(--ck-palette-ink-tertiary)"],
  ["--ck-palette-border", "bg-(--ck-palette-border)"],
  ["--ck-palette-border-heavy", "bg-(--ck-palette-border-heavy)"],
  ["--ck-palette-border-focus", "bg-(--ck-palette-border-focus)"],
  ["--ck-palette-label-accent", "bg-(--ck-palette-label-accent)"],
  ["--ck-palette-surface-accent", "bg-(--ck-palette-surface-accent)"],
  [
    "--ck-palette-surface-button-secondary",
    "bg-(--ck-palette-surface-button-secondary)",
  ],
  ["--ck-palette-decoration-added", "bg-(--ck-palette-decoration-added)"],
  ["--ck-palette-decoration-deleted", "bg-(--ck-palette-decoration-deleted)"],
  ["--ck-palette-accent-purple", "bg-(--ck-palette-accent-purple)"],
] as const;

const roleClasses = [
  ["background", "bg-background text-foreground"],
  ["card", "bg-card text-card-foreground"],
  ["popover", "bg-popover text-popover-foreground"],
  ["primary", "bg-primary text-primary-foreground"],
  ["secondary", "bg-secondary text-secondary-foreground"],
  ["muted", "bg-muted text-muted-foreground"],
  ["accent", "bg-accent text-accent-foreground"],
  ["surface", "bg-panel text-text"],
  ["surface-secondary", "bg-panel-secondary text-text"],
  ["surface-elevated", "bg-panel-elevated text-text"],
] as const;

const textSizes = [
  ["text-2xs", "text-2xs"],
  ["text-xs", "text-xs"],
  ["text-sm", "text-sm"],
  ["text-base", "text-base"],
  ["text-lg", "text-lg"],
  ["text-title-md", "text-title-md"],
  ["text-xl", "text-xl"],
  ["text-2xl", "text-2xl"],
  ["text-3xl", "text-3xl"],
] as const;

const spacings = [1, 2, 3, 4, 6, 8, 12] as const;

const radii = [
  ["rounded-2xs", "rounded-2xs"],
  ["rounded-xs", "rounded-xs"],
  ["rounded-sm", "rounded-sm"],
  ["rounded-md", "rounded-md"],
  ["rounded-lg", "rounded-lg"],
  ["rounded-xl", "rounded-xl"],
  ["rounded-2xl", "rounded-2xl"],
  ["rounded-3xl", "rounded-3xl"],
  ["rounded-4xl", "rounded-4xl"],
  ["rounded-full", "rounded-full"],
] as const;

const shadows = [
  ["shadow-xs", "shadow-xs"],
  ["shadow-sm", "shadow-sm"],
  ["shadow-md", "shadow-md"],
  ["shadow-lg", "shadow-lg"],
  ["shadow-xl", "shadow-xl"],
  ["shadow-2xl", "shadow-2xl"],
] as const;

const durations = [
  [
    "duration-(--motion-duration-fast)",
    "160ms",
    "duration-(--motion-duration-fast)",
  ],
  [
    "duration-(--motion-duration-normal)",
    "200ms",
    "duration-(--motion-duration-normal)",
  ],
  [
    "duration-(--motion-duration-slow)",
    "300ms",
    "duration-(--motion-duration-slow)",
  ],
] as const;

const spacingClasses: Record<(typeof spacings)[number], string> = {
  1: "w-1",
  12: "w-12",
  2: "w-2",
  3: "w-3",
  4: "w-4",
  6: "w-6",
  8: "w-8",
};

const ColorPanel = ({ variant }: { variant: ThemeVariant }) => {
  const variables = resolveStaticVariables(defaultThemeVariables[variant]);

  return (
    <section
      aria-labelledby={`colors-${variant}`}
      className={`${variant} min-w-0 rounded-2xl border bg-background p-4 text-foreground`}
    >
      <h3 className="mb-3 text-title-sm font-semibold" id={`colors-${variant}`}>
        {variant === "dark" ? "Dark" : "Light"} colors
      </h3>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 p-0">
        {swatches.map(([name, swatchClass]) => (
          <li className="flex min-w-0 items-center gap-3" key={name}>
            <span
              aria-hidden="true"
              className={`${swatchClass} size-10 shrink-0 rounded-lg border`}
            />
            <span className="min-w-0 text-xs">
              <span className="block font-medium break-words">
                {name.replace("--ck-palette-", "")}
              </span>
              <span className="block break-words text-muted-foreground">
                {variables[name]}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <h4 className="mt-4 mb-2 text-sm font-semibold">Tailwind roles</h4>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 p-0">
        {roleClasses.map(([label, className]) => (
          <li
            className={`${className} min-w-0 rounded-lg border px-2 py-3 text-xs`}
            key={label}
          >
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
};

const FoundationsGalleryExample = () => (
  <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Foundations</h1>
    </header>

    <ProviderExample />
    <IconExample />
    <MotionExample />
    <DarkModeExample />
    <RtlExample />
    <ClipboardExample />
    <ViewportExample />

    <section aria-labelledby="color-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="color-heading">
        Color
      </h2>
      <p className="text-sm text-muted-foreground">
        Values are generated from the default desktop theme settings. Each
        swatch paints the CSS variable the library ships, next to the value the
        generator returns.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <ColorPanel variant="light" />
        <ColorPanel variant="dark" />
      </div>
    </section>

    <section aria-labelledby="type-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="type-heading">
        Type scale
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {textSizes.map(([label, className]) => (
          <li
            className="flex flex-wrap items-baseline gap-4 border-b pb-2"
            key={label}
          >
            <code className="w-40 shrink-0 text-xs text-muted-foreground">
              {label}
            </code>
            <span className={className}>Sample text for the type scale</span>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="space-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="space-heading">
        Spacing
      </h2>
      <p className="text-sm text-muted-foreground">
        One spacing unit is 0.25rem.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {spacings.map((step) => (
          <li className="flex items-center gap-4" key={step}>
            <code className="w-16 shrink-0 text-xs text-muted-foreground">
              {step} unit{step === 1 ? "" : "s"}
            </code>
            <span
              className={`${spacingClasses[step]} h-3 rounded-xs bg-primary`}
            />
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="radius-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="radius-heading">
        Radii
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
        {radii.map(([label, className]) => (
          <li className="flex flex-col items-center gap-2" key={label}>
            <span
              className={`${className} size-16 border-2 border-primary bg-secondary`}
            />
            <code className="text-xs text-muted-foreground">{label}</code>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="shadow-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="shadow-heading">
        Shadows
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-6 p-4">
        {shadows.map(([label, className]) => (
          <li className="flex flex-col items-center gap-2" key={label}>
            <span className={`${className} size-16 rounded-xl bg-card`} />
            <code className="text-xs text-muted-foreground">{label}</code>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="motion-heading" className="flex flex-col gap-3">
      <h2 className="text-title-md font-semibold" id="motion-heading">
        Motion
      </h2>
      <p className="text-sm text-muted-foreground">
        Hover or focus a row to run its duration. Rows stay still when reduced
        motion is requested.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {durations.map(([label, time, className]) => (
          <li key={label}>
            <button
              className="group flex w-full max-w-md items-center gap-4 rounded-lg border bg-card p-3 text-left text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              type="button"
            >
              <code className="w-44 shrink-0 text-xs">
                {label} ({time})
              </code>
              <span className="relative block h-4 w-56 shrink-0 rounded-full bg-muted">
                <span
                  className={`${className} absolute top-0 left-0 size-4 rounded-full bg-primary transition-transform ease-out group-hover:translate-x-52 group-focus-visible:translate-x-52 motion-reduce:transition-none`}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  </main>
);

export { FoundationsGalleryExample };
