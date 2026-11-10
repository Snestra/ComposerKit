"use client";

import {
  PlatformLink,
  PlatformProvider,
  resolveWidgets,
  useWidgets,
  useHydrationSafe,
  useLinkComponent,
  usePlatform,
  usePortalContainer,
} from "@workspace/react/components/platform-provider";
import type {
  PlatformWidgets,
  PlatformLinkProps,
} from "@workspace/react/components/platform-provider";
import { Button } from "@workspace/react/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/react/components/ui/popover";
import {
  SegmentedControl,
  SegmentedItem,
} from "@workspace/react/components/ui/segmented-control";
import { Switch } from "@workspace/react/components/ui/switch";
import { useState } from "react";
import type { ReactElement } from "react";

type ProviderMode = "custom" | "default" | "none";

type WidgetChoice = "all" | "core" | "list";

const widgetSets = {
  all: ["text", "list", "card", "chart", "map", "table"],
  core: ["text", "list", "card"],
} as const;

const widgetLists: Record<WidgetChoice, PlatformWidgets> = {
  all: "all",
  core: "core",
  list: ["chart", "table"],
};

const ExampleLink = (props: PlatformLinkProps) => (
  // oxlint-disable-next-line jsx-a11y/anchor-has-content -- Children arrive in props.
  <a
    {...props}
    className="rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
    data-platform-link="example"
  />
);

// Function names change when the server and client bundles are minified, so
// the readout uses an explicit display name.
ExampleLink.displayName = "ExampleLink";

const describeLinkComponent = (
  component: ReturnType<typeof useLinkComponent>
) => (component === "a" ? "a" : (component.displayName ?? "component"));

const ProviderReadout = () => {
  const context = usePlatform();
  const link = useLinkComponent();
  const widgetSetting = useWidgets();
  const hydrationSafe = useHydrationSafe();
  const container = usePortalContainer();
  const widgets = resolveWidgets(widgetSetting, widgetSets);
  const [popup, setPopup] = useState<HTMLElement | null>(null);

  let popupLocation = "closed";

  if (popup) {
    popupLocation =
      container?.contains(popup) === true
        ? "inside the provider container"
        : "in the document body";
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Context value</dt>
        <dd className="m-0" data-testid="provider-context">
          {context === null ? "null (no provider)" : "set by the provider"}
        </dd>
        <dt className="text-muted-foreground">linkComponent</dt>
        <dd className="m-0" data-testid="provider-link">
          {describeLinkComponent(link)}
        </dd>
        <dt className="text-muted-foreground">widgets</dt>
        <dd className="m-0" data-testid="provider-widget-setting">
          {Array.isArray(widgetSetting)
            ? `[${widgetSetting.join(", ")}]`
            : String(widgetSetting)}
        </dd>
        <dt className="text-muted-foreground">hydrationSafe</dt>
        <dd className="m-0" data-testid="provider-hydration">
          {String(hydrationSafe)}
        </dd>
        <dt className="text-muted-foreground">radixPortalContainer</dt>
        <dd className="m-0" data-testid="provider-container">
          {container ? `#${container.id}` : "undefined"}
        </dd>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">Widgets allowed:</span>
        <ul
          aria-label="Widget types"
          className="m-0 flex list-none flex-wrap gap-1 p-0"
        >
          {widgets.map((widget) => (
            <li
              className="rounded-full border bg-muted px-2 py-0.5 text-xs"
              key={widget}
            >
              {widget}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <PlatformLink href="#provider" id="provider-link">
          Link through the provider
        </PlatformLink>
        <Popover>
          <PopoverTrigger render={<Button color="outline" size="dialog" />}>
            Open popover
          </PopoverTrigger>
          <PopoverContent
            portalContainer={container}
            ref={setPopup}
            sideOffset={4}
          >
            <div className="p-3">
              <PopoverTitle>Portal target</PopoverTitle>
              <p className="m-0 text-sm">Rendered where the provider says.</p>
            </div>
          </PopoverContent>
        </Popover>
        <span data-testid="provider-popup">Popup: {popupLocation}</span>
      </div>
    </div>
  );
};

const modes = [
  ["none", "No provider"],
  ["default", "Defaults"],
  ["custom", "Custom values"],
] as const;

const WithProvider = ({
  children,
  container,
  hydrationSafe,
  mode,
  widgets,
}: {
  children: ReactElement;
  container: HTMLElement | null;
  hydrationSafe: boolean;
  mode: ProviderMode;
  widgets: WidgetChoice;
}) => {
  if (mode === "none") {
    return children;
  }

  if (mode === "default") {
    return <PlatformProvider>{children}</PlatformProvider>;
  }

  return (
    <PlatformProvider
      widgets={widgetLists[widgets]}
      hydrationSafe={hydrationSafe}
      linkComponent={ExampleLink}
      radixPortalContainer={container}
    >
      {children}
    </PlatformProvider>
  );
};

const ProviderExample = () => {
  const [mode, setMode] = useState<ProviderMode>("custom");
  const [widgets, setWidgets] = useState<WidgetChoice>("list");
  const [hydrationSafe, setHydrationSafe] = useState(true);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <section
      aria-labelledby="provider-heading"
      className="flex flex-col gap-3"
      id="provider"
    >
      <h2 className="text-title-md font-semibold" id="provider-heading">
        Platform provider
      </h2>
      <p className="text-sm text-muted-foreground">
        PlatformProvider hands a link component, a widget setting, a portal
        container and a hydration flag to everything below it. Without a
        provider the context is null and consumers use the defaults.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl<ProviderMode>
          aria-label="Provider"
          onChange={setMode}
          value={mode}
        >
          {modes.map(([key, label]) => (
            <SegmentedItem key={key} value={key}>
              {label}
            </SegmentedItem>
          ))}
        </SegmentedControl>
        <SegmentedControl<WidgetChoice>
          aria-label="widgets"
          onChange={setWidgets}
          value={widgets}
        >
          <SegmentedItem disabled={mode !== "custom"} value="core">
            core
          </SegmentedItem>
          <SegmentedItem disabled={mode !== "custom"} value="all">
            all
          </SegmentedItem>
          <SegmentedItem disabled={mode !== "custom"} value="list">
            List
          </SegmentedItem>
        </SegmentedControl>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="provider-hydration-safe"
        >
          hydrationSafe
          <Switch
            checked={hydrationSafe}
            disabled={mode !== "custom"}
            id="provider-hydration-safe"
            onChange={setHydrationSafe}
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <div className="rounded-2xl border bg-card p-4 text-card-foreground">
          <WithProvider
            container={container}
            hydrationSafe={hydrationSafe}
            mode={mode}
            widgets={widgets}
          >
            <ProviderReadout />
          </WithProvider>
        </div>
        <div
          className="relative min-h-40 rounded-2xl border border-dashed p-3 text-xs text-muted-foreground has-data-open:border-solid has-data-open:border-primary"
          id="provider-portal-container"
          ref={setContainer}
        >
          Provider portal container (radixPortalContainer). With custom values
          the popover is rendered inside this box in the page structure, and the
          border turns solid while it holds an open popover. The popover still
          positions itself next to its button.
        </div>
      </div>
    </section>
  );
};

export { ProviderExample };
