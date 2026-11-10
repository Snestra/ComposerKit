"use client";

import { Button } from "composerkit/components/ui/button";
import {
  dismissTooltips,
  Tooltip,
  TooltipDefaultsProvider,
  TooltipHint,
  TooltipOverlayOwnerProvider,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
  TooltipTriggerDecorator,
  TooltipZoomProvider,
} from "composerkit/components/ui/tooltip";
import type {
  TooltipProviderProps,
  TooltipColor,
} from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

const colors = [
  "default",
  "surface",
  "inverse",
  "classicLight",
] as const satisfies readonly TooltipColor[];

const gutterSizes = ["sm", "md", "lg"] as const;

const sides = ["top", "right", "bottom", "left"] as const;

const aligns = ["start", "center", "end"] as const;

const Group = ({
  children,
  id,
  provider = true,
  providerProps,
  spread = false,
  title,
}: {
  children: ReactNode;
  id?: string;
  /** Without a provider the tooltips use their own default delay. */
  provider?: boolean;
  /** Delay settings for the group's provider. */
  providerProps?: Omit<TooltipProviderProps, "children">;
  spread?: boolean;
  title: string;
}) => {
  const section = (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="text-base font-semibold" id={id}>
        {title}
      </h2>
      <div
        className={`flex flex-wrap items-center gap-4 ${spread ? "gap-x-56" : ""}`}
      >
        {children}
      </div>
    </section>
  );

  return provider ? (
    <TooltipProvider {...providerProps}>{section}</TooltipProvider>
  ) : (
    section
  );
};

const Trigger = ({
  children,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button color="outline" {...props}>
    {children}
  </Button>
);

const BasicStates = () => (
  <Group title="Opening and closing">
    <TooltipHint content="Save the document">
      <Trigger>Hover me</Trigger>
    </TooltipHint>
    <TooltipHint content="Open search" shortcut="Ctrl+K">
      <Trigger>With shortcut</Trigger>
    </TooltipHint>
    <TooltipHint content="Shown below" side="bottom">
      <Trigger>Bottom tip</Trigger>
    </TooltipHint>
    <TooltipHint content="Opens after 240ms" delayOpen>
      <Trigger>Delayed open</Trigger>
    </TooltipHint>
    <TooltipHint content="Never shown" disabled>
      <Trigger>Disabled</Trigger>
    </TooltipHint>
    <TooltipHint content={null}>
      <Trigger>Missing content</Trigger>
    </TooltipHint>
    <TooltipHint
      content="Ignore the press for 380ms"
      preventUnintentionalClickToClose
    >
      <Trigger>Press guard</Trigger>
    </TooltipHint>
  </Group>
);

const Standalone = () => (
  <Group provider={false} title="Standalone, no provider">
    <TooltipHint content="Opens after the default 180ms">
      <Trigger>Standalone hover</Trigger>
    </TooltipHint>
    <Tooltip>
      <TooltipTrigger render={<Trigger />}>Standalone parts</TooltipTrigger>
      <TooltipPopup>Also 180ms, from the trigger</TooltipPopup>
    </Tooltip>
    <TooltipHint content="Opens after 1000ms" openDelay={1000}>
      <Trigger>Own delay 1000ms</Trigger>
    </TooltipHint>
  </Group>
);

const Controlled = () => {
  const [forced, setForced] = useState(true);

  return (
    <Group title="Controlled open">
      <TooltipHint content="Open from outside" forceOpen={forced} side="bottom">
        <Trigger className="mb-12">Forced tooltip</Trigger>
      </TooltipHint>
      <Button
        color="outlineSurface"
        aria-pressed={forced}
        onClick={() => {
          setForced((value) => !value);
        }}
      >
        {forced ? "Hide forced tooltip" : "Show forced tooltip"}
      </Button>
    </Group>
  );
};

const Interactive = () => (
  <Group id="tooltip-interactive" title="Interactive, dialog and keyboard">
    <Tooltip interactive selectable>
      <TooltipTrigger render={<Trigger />}>Interactive</TooltipTrigger>
      <TooltipPopup side="bottom">
        Select this text or move the pointer onto it
      </TooltipPopup>
    </Tooltip>
    <Tooltip interactive selectable>
      <TooltipTrigger render={<Trigger />}>Handoff gap</TooltipTrigger>
      <TooltipPopup side="bottom" sideOffset={6}>
        A 6px gap separates this popup from its trigger
      </TooltipPopup>
    </Tooltip>
    <TooltipHint
      content={
        <span>
          More details in{" "}
          <a className="underline" href="#tooltip-interactive">
            this link
          </a>
        </span>
      }
      closeButtonLabel="Close"
      side="bottom"
    >
      <Trigger>Keyboard navigation</Trigger>
    </TooltipHint>
    <TooltipHint
      content="Dialog content"
      dialogLabel="Details"
      interactive
      keyboardNavigation
      side="bottom"
    >
      <Trigger>Dialog tooltip</Trigger>
    </TooltipHint>
    <TooltipHint content="Follows the pointer" followPointer>
      <Trigger className="h-20 w-64">Move over this area</Trigger>
    </TooltipHint>
    <Button color="ghost">Next focusable after the trigger</Button>
  </Group>
);

const OpenOnClick = () => (
  <Group title="Open on click">
    <TooltipHint
      content="Opened by the press, not by the 5s hover delay"
      openDelay={5000}
      openOnClick
      side="bottom"
    >
      <Trigger>Click to open</Trigger>
    </TooltipHint>
    <TooltipHint content="Pressing closes it" side="bottom">
      <Trigger>Press closes (default)</Trigger>
    </TooltipHint>
  </Group>
);

/**
 * Keeps the tooltip open when the pointer leaves, so only the outside press
 * (when `closeOnInteractOutside` is set) or Escape closes it. The trigger is
 * not focusable, so no blur closes it either.
 */
const OutsidePressTooltip = ({
  closeOnInteractOutside,
  label,
}: {
  closeOnInteractOutside: boolean;
  label: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <TooltipHint
      closeOnInteractOutside={closeOnInteractOutside}
      content={`${label}: ${open ? "open" : "closed"}`}
      forceOpen={open}
      openOnClick
      side="bottom"
      onOpenChange={setOpen}
    >
      <span
        className="inline-flex cursor-pointer rounded-md border border-border px-3 py-2 text-sm"
        data-testid={`outside-${closeOnInteractOutside ? "closes" : "ignored"}`}
      >
        {label}
      </span>
    </TooltipHint>
  );
};

const OutsidePress = () => (
  <Group title="Outside press">
    <div className="flex gap-6 pb-12">
      <OutsidePressTooltip
        closeOnInteractOutside
        label="Click, then press elsewhere: closes"
      />
      <OutsidePressTooltip
        closeOnInteractOutside={false}
        label="Click, then press elsewhere: stays"
      />
    </div>
  </Group>
);

const OpenConditions = () => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Group title="Open conditions">
      <TooltipHint content="Always opens" openWhen="always">
        <Trigger>always</Trigger>
      </TooltipHint>
      <TooltipHint
        content="Quarterly report final draft version three.docx"
        openWhen="trigger-overflows"
      >
        <Trigger className="w-40 justify-start">
          <span
            className="block w-full truncate"
            data-ck-tooltip-overflow-target
          >
            Quarterly report final draft version three.docx
          </span>
        </Trigger>
      </TooltipHint>
      <TooltipHint content="Fits, so no tooltip" openWhen="trigger-overflows">
        <Trigger className="w-40 justify-start">
          <span
            className="block w-full truncate"
            data-ck-tooltip-overflow-target
          >
            Short.docx
          </span>
        </Trigger>
      </TooltipHint>
      <TooltipHint
        content="Rename the project"
        openWhen="visibility-target-hidden"
      >
        <Trigger>
          <span
            className={collapsed ? "hidden" : undefined}
            data-ck-tooltip-visibility-target
          >
            Rename the project
          </span>
          <span aria-hidden={!collapsed}>{collapsed ? "R" : "|"}</span>
        </Trigger>
      </TooltipHint>
      <Button
        color="outlineSurface"
        aria-pressed={collapsed}
        onClick={() => {
          setCollapsed((value) => !value);
        }}
      >
        {collapsed ? "Show the label" : "Hide the label"}
      </Button>
    </Group>
  );
};

/** Stays open after the pointer leaves, so only the options under test close it. */
const sticky = { closeOnPointerLeave: false, openOnClick: true } as const;

const CloseOptions = () => (
  <Group title="Close and open options">
    <TooltipHint
      closeOnPointerLeave={false}
      content="Stays after the pointer leaves"
      side="bottom"
    >
      <Trigger>closeOnPointerLeave off</Trigger>
    </TooltipHint>
    <TooltipHint
      closeOnPointerLeave={false}
      content="The popup also stays when the pointer leaves it"
      interactive
      side="bottom"
    >
      <Trigger>interactive, pointer leave off</Trigger>
    </TooltipHint>
    <TooltipHint
      closeOnTriggerBlur={false}
      content="Stays when focus moves away"
      side="bottom"
    >
      <Trigger>closeOnTriggerBlur off</Trigger>
    </TooltipHint>
    <TooltipHint
      cloneCustomTrigger
      closeOnTriggerBlur={false}
      content={<a href="#close-options">A link in the popup</a>}
      interactive
      keyboardNavigation
      side="bottom"
    >
      <Trigger>keyboard nav, blur close off</Trigger>
    </TooltipHint>
    <TooltipHint
      content="Hover never opens this"
      disableHoverOpen
      side="bottom"
    >
      <Trigger>disableHoverOpen</Trigger>
    </TooltipHint>
    <TooltipHint content="Only focus opens this" requiresFocus side="bottom">
      <Trigger>requiresFocus</Trigger>
    </TooltipHint>
    <Button color="ghost" id="close-options">
      Next focusable
    </Button>
  </Group>
);

const WindowAndProvider = () => (
  <Group title="Window blur, one at a time, dismiss all">
    <TooltipHint
      {...sticky}
      content="Closes when the window blurs"
      side="bottom"
    >
      <Trigger>closeOnWindowBlur on</Trigger>
    </TooltipHint>
    <TooltipHint
      {...sticky}
      closeOnWindowBlur={false}
      content="Survives a window blur"
      side="bottom"
    >
      <Trigger>closeOnWindowBlur off</Trigger>
    </TooltipHint>
    <TooltipHint {...sticky} content="First of three" side="bottom">
      <Trigger>one</Trigger>
    </TooltipHint>
    <TooltipHint {...sticky} content="Second of three" side="bottom">
      <Trigger>two</Trigger>
    </TooltipHint>
    <TooltipHint
      {...sticky}
      content={<div className="p-3 text-sm">A rich popup</div>}
      side="bottom"
      variant="rich"
    >
      <Trigger>rich (tooltips do not close it)</Trigger>
    </TooltipHint>
    <Button color="outlineSurface" onClick={dismissTooltips}>
      Dismiss all tooltips
    </Button>
  </Group>
);

const DelayOptions = () => (
  <Group
    providerProps={{ delayDuration: 500, skipDelayDuration: 300 }}
    title="Delay options (provider 500ms)"
  >
    <TooltipHint content="Provider delay, 500ms" side="bottom">
      <Trigger>provider 500ms</Trigger>
    </TooltipHint>
    <TooltipHint
      content="delayDuration 1000ms"
      delayDuration={1000}
      side="bottom"
    >
      <Trigger>delayDuration 1000</Trigger>
    </TooltipHint>
    <TooltipHint
      content="300ms made 900ms by getDelayDuration"
      delayDuration={300}
      getDelayDuration={(_event, delay) => delay * 3}
      side="bottom"
    >
      <Trigger>getDelayDuration x3</Trigger>
    </TooltipHint>
    <TooltipHint content="delayOpen, 240ms" delayOpen side="bottom">
      <Trigger>delayOpen</Trigger>
    </TooltipHint>
  </Group>
);

const SkipWindow = () => (
  <Group
    providerProps={{ delayDuration: 800, skipDelayDuration: 1500 }}
    title="Skip window (hover 800ms, skip 1500ms)"
  >
    <TooltipHint content="Key alpha, first" side="bottom" skipDelayKey="alpha">
      <Trigger>alpha 1</Trigger>
    </TooltipHint>
    <TooltipHint content="Key alpha, second" side="bottom" skipDelayKey="alpha">
      <Trigger>alpha 2</Trigger>
    </TooltipHint>
    <TooltipHint content="Key beta" side="bottom" skipDelayKey="beta">
      <Trigger>beta</Trigger>
    </TooltipHint>
    <TooltipHint content="Default key" side="bottom">
      <Trigger>default key</Trigger>
    </TooltipHint>
  </Group>
);

const GatedOpening = () => {
  const [allowed, setAllowed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Group title="onBeforeOpen and triggerPopupOpen">
      <TooltipHint
        content="The veto allowed this"
        side="bottom"
        onBeforeOpen={() => {
          setAttempts((count) => count + 1);

          return allowed;
        }}
      >
        <Trigger>onBeforeOpen</Trigger>
      </TooltipHint>
      <Button
        aria-pressed={allowed}
        color="outlineSurface"
        onClick={() => {
          setAllowed((value) => !value);
        }}
      >
        {allowed ? "Veto off" : "Veto on"}
      </Button>
      <output data-testid="before-open-attempts">Attempts: {attempts}</output>
      <TooltipHint
        content="Hidden while its popup is open"
        side="bottom"
        triggerPopupOpen={menuOpen}
      >
        <Trigger
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((value) => !value);
          }}
        >
          {menuOpen ? "Menu open" : "Menu closed"}
        </Trigger>
      </TooltipHint>
    </Group>
  );
};

const FieldGroup = ({ label }: { label: string }) => (
  <label className="flex items-center gap-2 text-sm">
    {label}
    <input className="rounded-md border border-border px-2 py-1" type="text" />
  </label>
);

const TriggerStructure = () => {
  const [ownRef, setOwnRef] = useState("none");

  const readTrigger = useCallback((element: HTMLElement | null) => {
    setOwnRef(element?.tagName ?? "cleared");
  }, []);

  return (
    <Group title="Trigger structure and focus within">
      <TooltipHint content="Text child" data-case="text" side="bottom">
        Plain text
      </TooltipHint>
      <TooltipHint content="DOM element child" data-case="dom" side="bottom">
        <button
          className="rounded-md border border-border px-3 py-2 text-sm"
          type="button"
        >
          DOM button
        </button>
      </TooltipHint>
      <TooltipHint
        content="Component child"
        data-case="component"
        side="bottom"
      >
        <Trigger>Component</Trigger>
      </TooltipHint>
      <TooltipHint
        cloneCustomTrigger
        content="Cloned component"
        data-case="clone"
        side="bottom"
        triggerRef={readTrigger}
      >
        <Trigger>cloneCustomTrigger</Trigger>
      </TooltipHint>
      <output data-testid="trigger-ref">triggerRef: {ownRef}</output>
      <TooltipHint
        content="Wrapped in a button"
        data-case="button"
        side="bottom"
        triggerAsChild={false}
      >
        triggerAsChild off
      </TooltipHint>
      <TooltipHint
        content="Opens on focus anywhere inside"
        data-case="within-on"
        interactive
        openOnFocusWithin
        side="bottom"
      >
        <FieldGroup label="focus within on" />
      </TooltipHint>
      <TooltipHint
        content="Never opens: the wrapper is not focused"
        data-case="within-off"
        interactive
        side="bottom"
      >
        <FieldGroup label="focus within off" />
      </TooltipHint>
    </Group>
  );
};

const ElementOptions = () => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Group title="Elements: triggerElement, positioningElement">
      <button
        ref={setTarget}
        className="rounded-md border border-border px-3 py-2 text-sm"
        data-testid="native-trigger"
        type="button"
      >
        Native button
      </button>
      {target === null ? null : (
        <TooltipHint
          content="Opened by listeners on the native button"
          side="bottom"
          triggerElement={target}
        />
      )}
      <TooltipHint
        content="Anchored to the dashed box"
        positioningElement={anchor}
        side="bottom"
      >
        <Trigger>Anchored elsewhere</Trigger>
      </TooltipHint>
      <div
        ref={setAnchor}
        className="mb-12 rounded-md border border-dashed border-border px-8 py-3 text-sm"
        data-testid="anchor-box"
      >
        Anchor box
      </div>
    </Group>
  );
};

const IdsAndClasses = () => (
  <Group title="Ids and classes">
    <TooltipHint
      className="mx-2"
      content="Own id, popup and body classes"
      forceOpen
      side="bottom"
      tooltipBodyClassName="w-40"
      tooltipClassName="max-h-40"
      tooltipId="demo-tooltip-id"
    >
      <button
        className="mb-14 rounded-md border border-border px-3 py-2 text-sm"
        data-testid="ids-trigger"
        type="button"
      >
        tooltipId
      </button>
    </TooltipHint>
  </Group>
);

const PointerFollowing = () => (
  <Group title="Follow the pointer, desktop">
    <TooltipHint content='followPointer="desktop"' followPointer="desktop">
      <Trigger className="h-20 w-64" data-testid="desktop-follow">
        Move, then Tab here
      </Trigger>
    </TooltipHint>
  </Group>
);

const EnabledWhen = () => (
  <Group title="Radix enabledWhen">
    <TooltipHint
      content="Quarterly report final draft version three.docx"
      enabledWhen="overflow"
      side="bottom"
    >
      <Trigger className="w-40 justify-start">
        <span
          className="block w-full truncate"
          data-ck-tooltip-enablement-target
        >
          Quarterly report final draft version three.docx
        </span>
      </Trigger>
    </TooltipHint>
    <TooltipHint
      content="Fits, so no tooltip"
      enabledWhen="overflow"
      side="bottom"
    >
      <Trigger className="w-40 justify-start">
        <span
          className="block w-full truncate"
          data-ck-tooltip-enablement-target
        >
          Short.docx
        </span>
      </Trigger>
    </TooltipHint>
    <TooltipHint
      content="Shown while the label is hidden"
      enabledWhen="target-hidden"
      side="bottom"
    >
      <Trigger>
        <span className="hidden" data-ck-tooltip-enablement-target>
          Label
        </span>
        <span>L</span>
      </Trigger>
    </TooltipHint>
  </Group>
);

const DefaultSide = () => (
  <Group title="Default side (DefaultsProvider)">
    <TooltipDefaultsProvider side="bottom">
      <TooltipHint content="Below, from the provider">
        <Trigger>No side</Trigger>
      </TooltipHint>
      <TooltipHint content="Above, its own side" side="top">
        <Trigger>Own side</Trigger>
      </TooltipHint>
    </TooltipDefaultsProvider>
  </Group>
);

const PageZoom = () => {
  const [panel, setPanel] = useState<HTMLElement | null>(null);

  return (
    <Group spread title="Page zoom, portal container and overlay owner">
      <TooltipHint content="No zoom" forceOpen side="bottom">
        <Trigger className="mb-24">zoom 1</Trigger>
      </TooltipHint>
      <TooltipZoomProvider zoom={1.25}>
        <TooltipHint content="Zoom 1.25 on the body" forceOpen side="bottom">
          <Trigger className="mb-24" data-testid="zoom-trigger">
            zoom 1.25
          </Trigger>
        </TooltipHint>
        <TooltipHint
          coachmarkArrow="curved"
          content="Coachmark at zoom 1.25"
          forceOpen
          side="bottom"
          variant="coachmark"
        >
          <Trigger className="mb-24">coachmark 1.25</Trigger>
        </TooltipHint>
        <TooltipHint
          container={panel}
          content="In a container: no zoom compensation"
          forceOpen
          side="bottom"
        >
          <Trigger className="mb-24">container</Trigger>
        </TooltipHint>
      </TooltipZoomProvider>
      <div
        ref={setPanel}
        className="relative rounded-2xl border border-border p-4"
        data-testid="owner-panel"
      >
        <TooltipProvider portalContainer={panel ?? undefined}>
          <TooltipOverlayOwnerProvider id="owner-demo">
            <TooltipHint
              content="Portalled by the provider"
              forceOpen
              side="bottom"
            >
              <Trigger className="mb-14">provider container</Trigger>
            </TooltipHint>
          </TooltipOverlayOwnerProvider>
        </TooltipProvider>
      </div>
    </Group>
  );
};

const Appearance = () => (
  <Group spread title="Colours with shortcut">
    {colors.map((color) => (
      <TooltipHint
        key={color}
        color={color}
        content={`Colour ${color}`}
        shortcut="Ctrl+K"
        forceOpen
        side="bottom"
      >
        <Trigger className="mb-14">{color}</Trigger>
      </TooltipHint>
    ))}
  </Group>
);

const GutterSizes = () => (
  <Group spread title="Gutter sizes">
    {gutterSizes.map((size) => (
      <TooltipHint
        key={size}
        content={`Gutter ${size}`}
        forceOpen
        gutterSize={size}
        side="bottom"
      >
        <Trigger className="mb-14">{size}</Trigger>
      </TooltipHint>
    ))}
  </Group>
);

const Placement = () => (
  <Group title="Placement">
    {sides.map((side) => (
      <TooltipHint key={side} content={`Side ${side}`} side={side}>
        <Trigger>{side}</Trigger>
      </TooltipHint>
    ))}
    {aligns.map((align) => (
      <TooltipHint
        key={align}
        align={align}
        content={`Align ${align}`}
        side="bottom"
      >
        <Trigger className="w-40">{align}</Trigger>
      </TooltipHint>
    ))}
    <span className="[--ck-tooltip-side:bottom]">
      <TooltipHint content="Theme side bottom">
        <Trigger>Theme bottom</Trigger>
      </TooltipHint>
    </span>
    <TooltipHint content="Offset 12px" sideOffset={12}>
      <Trigger>Offset</Trigger>
    </TooltipHint>
    <TooltipHint
      content="A long tooltip that wraps before it reaches the maximum width of twenty rem and keeps balanced lines"
      side="bottom"
    >
      <Trigger>Long content</Trigger>
    </TooltipHint>
  </Group>
);

const longText =
  "A long tooltip that wraps before it reaches the maximum width and keeps balanced lines";

const MaxWidths = () => (
  <Group spread title="Maximum width">
    <TooltipHint content={longText} forceOpen maxWidth={160} side="bottom">
      <Trigger className="mb-24">Number 160</Trigger>
    </TooltipHint>
    <TooltipHint
      content={longText}
      forceOpen
      maxWidth="min(14rem, 50vw)"
      side="bottom"
    >
      <Trigger className="mb-24">CSS min(14rem, 50vw)</Trigger>
    </TooltipHint>
    <TooltipHint content={longText} forceOpen maxWidth="none" side="bottom">
      <Trigger className="mb-24">none</Trigger>
    </TooltipHint>
  </Group>
);

const Motion = () => (
  <Group title="Motion and text trigger">
    <TooltipHint content="No entry animation">
      <Trigger>App wrapper</Trigger>
    </TooltipHint>
    <TooltipHint content="Scale in and out" motion="scale" maxWidth={300}>
      <Trigger>Scale motion</Trigger>
    </TooltipHint>
    <Tooltip>
      <TooltipTrigger render={<TooltipTriggerDecorator />}>
        Text trigger
      </TooltipTrigger>
      <TooltipPopup motion="scale">Underline follows the tooltip</TooltipPopup>
    </Tooltip>
  </Group>
);

const Detached = () => (
  <Group title="Hidden when detached">
    <div
      className="h-16 w-72 overflow-y-auto rounded-lg border border-border"
      data-testid="detached-scroll"
    >
      <div className="h-24" />
      <TooltipHint
        content="Follows its trigger"
        forceOpen
        hideWhenDetached
        side="right"
      >
        <Trigger>Scrolled trigger</Trigger>
      </TooltipHint>
      <div className="h-24" />
    </div>
  </Group>
);

const Hidden = () => (
  <Group title="Mounted while closed">
    <Tooltip>
      <TooltipTrigger render={<Trigger />}>Always mounted</TooltipTrigger>
      <TooltipPopup forceMount side="bottom">
        Hidden until opened
      </TooltipPopup>
    </Tooltip>
  </Group>
);

const Cell = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="flex h-44 w-64 flex-col items-center gap-1">
    <span className="text-xs text-text-muted">{label}</span>
    {children}
  </div>
);

const fileCitation = (
  <div className="flex w-full flex-col gap-1 p-3">
    <span className="text-sm font-medium">Quarterly report.pdf</span>
    <span className="text-sm text-text-muted">Page 4, 2 matches</span>
    <span className="text-sm text-text-subtle">Last edited today</span>
  </div>
);

const entityPreview = (
  <div className="flex w-full flex-col gap-1 p-4">
    <span className="text-sm font-medium">Ada Lovelace</span>
    <span className="text-sm text-text-muted">Analyst, Engines team</span>
  </div>
);

const railItems = (
  <div className="flex w-full flex-col gap-1 rounded-xl bg-panel-elevated-secondary p-2 text-sm shadow-lg">
    <span>Overview</span>
    <span>Activity</span>
  </div>
);

const richContent = (
  <div className="flex w-full flex-col gap-1 p-3">
    <span className="text-sm font-medium">Rich preview</span>
    <span className="text-sm text-text-muted">Surface, ring and shadow</span>
  </div>
);

const coachmarkBody = "Press the button to start";

const scrollingLines = Array.from(
  { length: 8 },
  (_, index) => `Scrollable line ${index + 1}`
);

/** Every colour, variant and option the app wrapper offers, forced open. */
const VariantCells = ({ container }: { container: HTMLElement | null }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-2">
    <Cell label="tooltip, text colours">
      <TooltipHint
        container={container}
        content={
          <span>
            Primary <span className="text-text-muted">secondary</span>{" "}
            <span className="text-text-subtle">tertiary</span>{" "}
            <span className="text-text-notice">info</span>
          </span>
        }
        forceOpen
        shortcut="Ctrl+K"
        side="bottom"
      >
        <Trigger>tooltip</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="disablePadding">
      <TooltipHint
        container={container}
        content="No padding"
        disablePadding
        forceOpen
        side="bottom"
      >
        <Trigger>disablePadding</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="scrollable">
      <TooltipHint
        container={container}
        content={
          <div className="flex flex-col">
            {scrollingLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        }
        forceOpen
        scrollable
        side="bottom"
        tooltipClassName="max-h-24"
      >
        <Trigger>scrollable</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="coachmark">
      <TooltipHint
        container={container}
        content={coachmarkBody}
        forceOpen
        side="bottom"
        variant="coachmark"
      >
        <Trigger>coachmark</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="coachmark curved">
      <TooltipHint
        coachmarkArrow="curved"
        container={container}
        content={coachmarkBody}
        forceOpen
        side="bottom"
        variant="coachmark"
      >
        <Trigger>curved arrow</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="coachmark accent">
      <TooltipHint
        color="accent"
        container={container}
        content={coachmarkBody}
        forceOpen
        side="bottom"
        variant="coachmark"
      >
        <Trigger>accent</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="coachmark surface, no padding">
      <TooltipHint
        color="surface"
        container={container}
        content={<span className="p-2 text-sm">{coachmarkBody}</span>}
        disablePadding
        forceOpen
        side="top"
        variant="coachmark"
      >
        <Trigger className="mt-20">surface above</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="rich">
      <TooltipHint
        container={container}
        content={richContent}
        forceOpen
        side="bottom"
        variant="rich"
      >
        <Trigger>rich</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="fileCitation">
      <TooltipHint
        container={container}
        content={fileCitation}
        forceOpen
        side="bottom"
        variant="fileCitation"
      >
        <Trigger>fileCitation</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="entityPreview">
      <TooltipHint
        container={container}
        content={entityPreview}
        forceOpen
        side="bottom"
        variant="entityPreview"
      >
        <Trigger>entityPreview</Trigger>
      </TooltipHint>
    </Cell>
    <Cell label="floating-navigation-rail">
      <TooltipHint
        container={container}
        content={railItems}
        forceOpen
        side="bottom"
        variant="floating-navigation-rail"
      >
        <Trigger>rail</Trigger>
      </TooltipHint>
    </Cell>
  </div>
);

const Variants = () => (
  <Group title="Variants">
    <VariantCells container={null} />
  </Group>
);

/** Pointer behaviours inside a theme panel: handoff, open on click and an open condition. */
const BehaviourCells = ({
  container,
  label,
}: {
  container: HTMLElement | null;
  label: string;
}) => (
  <div className="flex flex-wrap items-start gap-4 pb-16">
    <Tooltip interactive selectable>
      <TooltipTrigger render={<Trigger />}>{label} handoff</TooltipTrigger>
      <TooltipPopup container={container} side="bottom" sideOffset={6}>
        {label} popup, 6px gap
      </TooltipPopup>
    </Tooltip>
    <TooltipHint
      container={container}
      content={`${label} opened by the press`}
      openDelay={5000}
      openOnClick
      side="bottom"
    >
      <Trigger>{label} click to open</Trigger>
    </TooltipHint>
    <TooltipHint
      container={container}
      content={`${label} overflowing name`}
      openWhen="trigger-overflows"
      side="bottom"
    >
      <Trigger className="w-40 justify-start">
        <span className="block w-full truncate" data-ck-tooltip-overflow-target>
          {label} overflowing name of a long file.docx
        </span>
      </Trigger>
    </TooltipHint>
  </div>
);

type Scheme = "dark" | "light";

const ThemePanel = ({
  children,
  scheme,
  testId,
}: {
  children: (container: HTMLElement | null) => ReactNode;
  scheme: Scheme;
  testId: string;
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      ref={setContainer}
      className={cn(
        scheme,
        "relative flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 text-foreground"
      )}
      data-testid={testId}
    >
      {container === null ? null : children(container)}
    </div>
  );
};

/**
 * Light inside dark and dark inside light: each tooltip is portalled into its
 * own panel and follows that panel's theme scope.
 */
const NestedPanels = () => (
  <Group title="Nested theme panels">
    <div className="flex w-full flex-col gap-4">
      <ThemePanel scheme="dark" testId="dark-panel">
        {(darkContainer) => (
          <>
            <VariantCells container={darkContainer} />
            <BehaviourCells container={darkContainer} label="dark-panel" />
            <ThemePanel scheme="light" testId="light-in-dark-panel">
              {(lightContainer) => (
                <>
                  <VariantCells container={lightContainer} />
                  <BehaviourCells
                    container={lightContainer}
                    label="light-in-dark"
                  />
                </>
              )}
            </ThemePanel>
          </>
        )}
      </ThemePanel>
      <ThemePanel scheme="light" testId="light-panel">
        {(lightContainer) => (
          <>
            <VariantCells container={lightContainer} />
            <BehaviourCells container={lightContainer} label="light-panel" />
            <ThemePanel scheme="dark" testId="dark-in-light-panel">
              {(darkContainer) => (
                <>
                  <VariantCells container={darkContainer} />
                  <BehaviourCells
                    container={darkContainer}
                    label="dark-in-light"
                  />
                </>
              )}
            </ThemePanel>
          </>
        )}
      </ThemePanel>
    </div>
  </Group>
);

const Scoped = ({ title }: { title: string }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      ref={setContainer}
      className="relative rounded-2xl border border-border p-4"
      data-testid="rtl-scope"
      dir="rtl"
    >
      <Group title={title}>
        {sides.map((side) => (
          <TooltipHint
            key={side}
            container={container}
            content="Save the document"
            shortcut="Ctrl+K"
            side={side}
          >
            <Trigger>{side}</Trigger>
          </TooltipHint>
        ))}
        <TooltipHint
          container={container}
          content="Open search"
          forceOpen
          side="bottom"
        >
          <Trigger className="mb-14">Open</Trigger>
        </TooltipHint>
      </Group>
    </div>
  );
};

const DarkScope = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      ref={setContainer}
      className="dark relative rounded-2xl border border-border bg-background p-4 text-foreground"
      data-testid="dark-scope"
    >
      <Group title="Dark">
        {sides.map((side) => (
          <TooltipHint
            key={side}
            container={container}
            content="Save the document"
            shortcut="Ctrl+K"
            side={side}
          >
            <Trigger>{side}</Trigger>
          </TooltipHint>
        ))}
        <TooltipHint
          container={container}
          content="Open search"
          forceOpen
          side="bottom"
        >
          <Trigger className="mb-14">Open</Trigger>
        </TooltipHint>
      </Group>
    </div>
  );
};

const TooltipGalleryExample = () => (
  <main className="mx-auto flex max-w-4xl flex-col gap-10 bg-background p-6 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <h1 className="text-xl font-semibold">Tooltip</h1>
      <AppearanceControl id="tooltip-appearance" />
    </header>
    <BasicStates />
    <Standalone />
    <Controlled />
    <Interactive />
    <OpenOnClick />
    <OutsidePress />
    <OpenConditions />
    <CloseOptions />
    <WindowAndProvider />
    <DelayOptions />
    <SkipWindow />
    <GatedOpening />
    <TriggerStructure />
    <ElementOptions />
    <IdsAndClasses />
    <PointerFollowing />
    <EnabledWhen />
    <DefaultSide />
    <PageZoom />
    <Appearance />
    <GutterSizes />
    <Placement />
    <MaxWidths />
    <Motion />
    <Detached />
    <Hidden />
    <Variants />
    <NestedPanels />
    <DarkScope />
    <Scoped title="Right to left" />
  </main>
);

export { TooltipGalleryExample };
