"use client";

/* oxlint-disable shadcn/no-inline-styles -- The examples pass `style` to PopoverContent to show its overflow behaviour; the component accepts a style prop there. */

import { Coachmark } from "composerkit/components/popover/coachmark";
import type {
  CoachmarkAlign,
  CoachmarkSide,
  CoachmarkSize,
} from "composerkit/components/popover/coachmark";
import { Button } from "composerkit/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverFocusRestoreContext,
  PopoverOverlayOwnerContext,
  PopoverTitle,
  PopoverTrigger,
  PopoverUiScaleContext,
} from "composerkit/components/ui/popover";
import type {
  PopoverAlign,
  PopoverSide,
  PopoverSize,
  PopoverVariant,
} from "composerkit/components/ui/popover";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const noop = () => {
  /* nothing to clean up */
};

const exampleText = "A short note shown in the floating panel.";

const sizeNames = [
  "default",
  "menuWide",
  "workspace",
  "large",
  "extraLarge",
  "wide",
  "content",
  "anchor",
  "railMenu",
] as const satisfies readonly PopoverSize[];

const sides = [
  "top",
  "right",
  "bottom",
  "left",
] as const satisfies readonly PopoverSide[];

const aligns = [
  "start",
  "center",
  "end",
] as const satisfies readonly PopoverAlign[];

const variants = [
  "default",
  "comment",
  "menu",
] as const satisfies readonly PopoverVariant[];

const TriggerButton = ({ children }: { children: ReactNode }) => (
  <PopoverTrigger render={<Button color="outline" size="dialog" />}>
    {children}
  </PopoverTrigger>
);

const Section = ({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="flex flex-col gap-3"
    id={id}
  >
    <h3 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h3>
    {children}
  </section>
);

const Row = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

const Readout = ({ label, value }: { label: string; value: string }) => (
  <p className="m-0 text-sm text-muted-foreground">
    {label} <output className="font-medium text-foreground">{value}</output>
  </p>
);

const Note = ({ children }: { children: ReactNode }) => (
  <p className="m-0 max-w-prose text-sm text-muted-foreground">{children}</p>
);

const BasicPanel = ({ title = "Details" }: { title?: string }) => (
  <div className="flex flex-col gap-1 p-3 text-sm">
    <PopoverTitle>{title}</PopoverTitle>
    <p className="m-0">{exampleText}</p>
  </div>
);

const StateExample = () => {
  const [open, setOpen] = useState(false);

  return (
    <Section id="popover-state" title="Open state">
      <Row>
        <Popover>
          <TriggerButton>Uncontrolled</TriggerButton>
          <PopoverContent>
            <BasicPanel />
          </PopoverContent>
        </Popover>
        <Popover defaultOpen>
          <TriggerButton>Open by default</TriggerButton>
          <PopoverContent>
            <BasicPanel title="Open by default" />
          </PopoverContent>
        </Popover>
        <Popover onOpenChange={setOpen} open={open}>
          <TriggerButton>Controlled</TriggerButton>
          <PopoverContent>
            <BasicPanel title="Controlled" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger
            disabled
            render={<Button color="outline" size="dialog" />}
          >
            Disabled
          </PopoverTrigger>
          <PopoverContent>
            <BasicPanel />
          </PopoverContent>
        </Popover>
        <Readout
          label="Controlled popover is"
          value={open ? "open" : "closed"}
        />
      </Row>
    </Section>
  );
};

const SizesExample = () => (
  <Section id="popover-sizes" title="Sizes">
    <Row>
      {sizeNames.map((size) => (
        <Popover key={size}>
          <TriggerButton>{size}</TriggerButton>
          <PopoverContent size={size}>
            <BasicPanel title={`size="${size}"`} />
          </PopoverContent>
        </Popover>
      ))}
    </Row>
  </Section>
);

const VariantsExample = () => (
  <Section id="popover-variants" title="Surface">
    <Row>
      {variants.map((variant) => (
        <Popover key={variant}>
          <TriggerButton>{`variant ${variant}`}</TriggerButton>
          <PopoverContent variant={variant}>
            <BasicPanel title={`variant="${variant}"`} />
          </PopoverContent>
        </Popover>
      ))}
      <Popover>
        <TriggerButton>No padding</TriggerButton>
        <PopoverContent disablePadding>
          <BasicPanel title="disablePadding" />
        </PopoverContent>
      </Popover>
      <Popover>
        <TriggerButton>Translucent</TriggerButton>
        <PopoverContent opaque={false}>
          <BasicPanel title="opaque={false}" />
        </PopoverContent>
      </Popover>
      <Popover>
        <TriggerButton>Unstyled</TriggerButton>
        <PopoverContent unstyled>
          <div className="rounded-md border border-border bg-background p-3 text-sm">
            unstyled
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <TriggerButton>Scrolls</TriggerButton>
        <PopoverContent style={{ maxHeight: 96 }}>
          <BasicPanel title="contentOverflow auto" />
          <BasicPanel title="Second block" />
          <BasicPanel title="Third block" />
        </PopoverContent>
      </Popover>
      <Popover>
        <TriggerButton>Overflow visible</TriggerButton>
        <PopoverContent contentOverflow="visible" style={{ maxHeight: 48 }}>
          <BasicPanel title="contentOverflow visible" />
        </PopoverContent>
      </Popover>
    </Row>
    <div className="rounded-lg bg-linear-to-r from-blue to-purple p-6">
      <Popover defaultOpen>
        <TriggerButton>Over stripes, translucent</TriggerButton>
        <PopoverContent opaque={false}>
          <BasicPanel title="opaque={false}" />
        </PopoverContent>
      </Popover>
    </div>
  </Section>
);

const PlacementExample = () => {
  const [side, setSide] = useState<PopoverSide>("bottom");
  const [align, setAlign] = useState<PopoverAlign>("start");

  return (
    <Section id="popover-placement" title="Placement">
      <Row>
        <fieldset className="m-0 flex gap-2 border-0 p-0">
          <legend className="sr-only">Side</legend>
          {sides.map((name) => (
            <Button
              aria-pressed={side === name}
              color={side === name ? "secondary" : "outline"}
              key={name}
              onClick={() => {
                setSide(name);
              }}
              size="dialog"
            >
              {name}
            </Button>
          ))}
        </fieldset>
        <fieldset className="m-0 flex gap-2 border-0 p-0">
          <legend className="sr-only">Align</legend>
          {aligns.map((name) => (
            <Button
              aria-pressed={align === name}
              color={align === name ? "secondary" : "outline"}
              key={name}
              onClick={() => {
                setAlign(name);
              }}
              size="dialog"
            >
              {name}
            </Button>
          ))}
        </fieldset>
      </Row>
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border">
        <Popover>
          <TriggerButton>{`${side} / ${align}`}</TriggerButton>
          <PopoverContent align={align} side={side}>
            <BasicPanel title={`${side} / ${align}`} />
          </PopoverContent>
        </Popover>
      </div>
      <Row>
        <Popover>
          <TriggerButton>sideOffset 24</TriggerButton>
          <PopoverContent sideOffset={24}>
            <BasicPanel title="sideOffset 24" />
          </PopoverContent>
        </Popover>
        <Popover>
          <TriggerButton>alignOffset 20</TriggerButton>
          <PopoverContent alignOffset={20}>
            <BasicPanel title="alignOffset 20" />
          </PopoverContent>
        </Popover>
        <Popover>
          <TriggerButton>No collision avoidance</TriggerButton>
          <PopoverContent avoidCollisions={false} side="top">
            <BasicPanel title="avoidCollisions false" />
          </PopoverContent>
        </Popover>
      </Row>
      <div className="flex justify-end">
        <Popover>
          <TriggerButton>At the right edge</TriggerButton>
          <PopoverContent size="large">
            <BasicPanel title="Shifted to stay in view" />
          </PopoverContent>
        </Popover>
      </div>
    </Section>
  );
};

const ScrollExample = () => {
  const [boundary, setBoundary] = useState<HTMLElement | null>(null);

  return (
    <Section id="popover-scroll" title="Scrolling container">
      <div
        className="flex h-32 flex-col gap-3 overflow-y-auto rounded-lg border border-dashed border-border p-3"
        data-testid="popover-scroll-box"
        ref={setBoundary}
      >
        <Row>
          <Popover>
            <TriggerButton>Hides when detached</TriggerButton>
            <PopoverContent hideWhenDetached>
              <BasicPanel title="hideWhenDetached" />
            </PopoverContent>
          </Popover>
          <Popover>
            <TriggerButton>Sticky always</TriggerButton>
            <PopoverContent sticky="always">
              <BasicPanel title="sticky always" />
            </PopoverContent>
          </Popover>
          <Popover>
            <TriggerButton>Boundary box</TriggerButton>
            <PopoverContent collisionBoundary={boundary ?? undefined}>
              <BasicPanel title="collisionBoundary" />
            </PopoverContent>
          </Popover>
          <Popover>
            <TriggerButton>Padding 40</TriggerButton>
            <PopoverContent collisionPadding={40}>
              <BasicPanel title="collisionPadding 40" />
            </PopoverContent>
          </Popover>
        </Row>
        <p className="m-0 text-sm text-muted-foreground">
          Scroll this box with a popover open: the first one hides when its
          trigger leaves view.
        </p>
        <div className="h-48 shrink-0" />
      </div>
    </Section>
  );
};

const AnchorExample = () => (
  <Section id="popover-anchor" title="Anchor">
    <Popover>
      <Row>
        <TriggerButton>Trigger</TriggerButton>
        <div className="rounded-md border border-dashed border-border px-4 py-2 text-sm">
          <PopoverAnchor>Popover opens against this box</PopoverAnchor>
        </div>
      </Row>
      <PopoverContent>
        <BasicPanel title="Anchored" />
      </PopoverContent>
    </Popover>
  </Section>
);

type ReducedMotionSetting = "false" | "system" | "true";

const reducedMotionSettings = [
  "system",
  "false",
  "true",
] as const satisfies readonly ReducedMotionSetting[];

const MotionExample = () => {
  const [setting, setSetting] = useState<ReducedMotionSetting>("system");

  useEffect(() => {
    const root = document.documentElement;

    if (setting === "system") {
      delete root.dataset.ckReducedMotion;
    } else {
      root.dataset.ckReducedMotion = setting;
    }

    return () => {
      delete root.dataset.ckReducedMotion;
    };
  }, [setting]);

  return (
    <Section id="popover-motion" title="Motion">
      <Row>
        <Popover>
          <TriggerButton>No animation</TriggerButton>
          <PopoverContent>
            <BasicPanel title="No animation" />
          </PopoverContent>
        </Popover>
        <Popover>
          <TriggerButton>slide-in-left</TriggerButton>
          <PopoverContent animation="slide-in-left">
            <BasicPanel title="slide-in-left" />
          </PopoverContent>
        </Popover>
      </Row>
      <fieldset className="m-0 flex items-center gap-2 border-0 p-0">
        <legend className="sr-only">Root data-ck-reduced-motion</legend>
        {reducedMotionSettings.map((name) => (
          <Button
            aria-pressed={setting === name}
            color={setting === name ? "secondary" : "outline"}
            key={name}
            onClick={() => {
              setSetting(name);
            }}
            size="dialog"
          >
            {name === "system" ? "Follow system" : `reduced-motion ${name}`}
          </Button>
        ))}
      </fieldset>
    </Section>
  );
};

const trackingStrategies = ["always", "optimized"] as const satisfies readonly (
  | "always"
  | "optimized"
)[];

const TrackingExample = () => {
  const [strategy, setStrategy] =
    useState<(typeof trackingStrategies)[number]>("always");

  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(0);
  const [gap, setGap] = useState("0px");
  const [variables, setVariables] = useState({ origin: "", triggerWidth: "" });
  const anchorRef = useRef<HTMLDivElement>(null);

  // The anchor slides back and forth with a transform, which no scroll or
  // resize event reports.
  useEffect(() => {
    const animation = anchorRef.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(240px)" }],
      {
        direction: "alternate",
        duration: 2000,
        easing: "linear",
        iterations: Infinity,
      }
    );

    return () => {
      animation?.cancel();
    };
  }, []);

  // Reads how far the panel's left edge is from the anchor's, once per frame.
  useEffect(() => {
    if (!open) {
      return noop;
    }

    let frame = 0;

    const measure = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();

      const panelElement = document.querySelector(
        "[data-testid=popover-tracking-panel]"
      );

      const panel = panelElement?.getBoundingClientRect();

      if (panelElement) {
        const computed = getComputedStyle(panelElement);

        setVariables({
          origin: computed
            .getPropertyValue("--radix-popover-content-transform-origin")
            .trim(),
          triggerWidth: computed
            .getPropertyValue("--radix-popover-trigger-width")
            .trim(),
        });
      }

      if (anchor && panel) {
        setGap(`${Math.round((panel.left - anchor.left) * 10) / 10}px`);
      }

      frame = requestAnimationFrame(measure);
    };

    frame = requestAnimationFrame(measure);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open]);

  return (
    <Section id="popover-tracking" title="Position tracking">
      <Note>
        The panel is anchored to a box that slides with a transform. With
        updatePositionStrategy always the position is measured every frame.
        onPlaced runs once each time the panel gets its first position.
      </Note>
      <Popover onOpenChange={setOpen} open={open}>
        <Row>
          <TriggerButton>Open panel</TriggerButton>
          {trackingStrategies.map((name) => (
            <Button
              aria-pressed={strategy === name}
              color={strategy === name ? "secondary" : "outline"}
              key={name}
              onClick={() => {
                setStrategy(name);
              }}
              size="dialog"
            >
              {name}
            </Button>
          ))}
        </Row>
        <Row>
          <Readout label="Strategy" value={strategy} />
          <Readout label="onPlaced calls" value={String(placed)} />
          <Readout
            label="Panel left minus anchor left"
            value={open ? gap : "closed"}
          />
          <Readout
            label="--radix-popover-content-transform-origin"
            value={open ? variables.origin : "closed"}
          />
          <Readout
            label="--radix-popover-trigger-width"
            value={open ? variables.triggerWidth : "closed"}
          />
        </Row>
        <div className="mb-40">
          <Row>
            <div
              className="w-28 rounded-md border border-dashed border-border px-2 py-1 text-sm"
              ref={anchorRef}
            >
              <PopoverAnchor>Moving anchor</PopoverAnchor>
            </div>
          </Row>
        </div>
        <PopoverContent
          data-testid="popover-tracking-panel"
          onPlaced={() => {
            setPlaced((count) => count + 1);
          }}
          updatePositionStrategy={strategy}
        >
          <BasicPanel title="Follows the anchor" />
        </PopoverContent>
      </Popover>
    </Section>
  );
};

const PortalExample = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <Section id="popover-portal" title="Portal">
      <Row>
        <Popover>
          <TriggerButton>Into document.body</TriggerButton>
          <PopoverContent>
            <BasicPanel title="Portalled to body" />
          </PopoverContent>
        </Popover>
        <Popover>
          <TriggerButton>Into the box</TriggerButton>
          <PopoverContent portalContainer={container}>
            <BasicPanel title="portalContainer" />
          </PopoverContent>
        </Popover>
        <Popover>
          <TriggerButton>Rendered inline</TriggerButton>
          <PopoverContent disablePortal>
            <BasicPanel title="disablePortal" />
          </PopoverContent>
        </Popover>
        <Popover>
          <TriggerButton>Kept mounted</TriggerButton>
          <PopoverContent forceMount>
            <BasicPanel title="forceMount" />
          </PopoverContent>
        </Popover>
      </Row>
      <div
        className="rounded-lg border border-dashed border-border p-3 text-sm"
        data-testid="popover-portal-box"
        ref={setContainer}
      >
        Portal container box
      </div>
    </Section>
  );
};

const ScaleExample = () => (
  <Section id="popover-scale" title="UI scale">
    <PopoverUiScaleContext value={1.25}>
      <Popover>
        <TriggerButton>Scale 1.25</TriggerButton>
        <PopoverContent>
          <BasicPanel title="Scaled panel" />
        </PopoverContent>
      </Popover>
    </PopoverUiScaleContext>
  </Section>
);

const MenuOffsetExample = () => (
  <Section id="popover-menu-offset" title="Inside a menu surface">
    <div
      className="w-64 rounded-2xl border border-border p-2"
      data-ck-menu-overlay-surface=""
    >
      <Popover>
        <PopoverTrigger render={<Button color="ghostActive" size="dialog" />}>
          Submenu
        </PopoverTrigger>
        <PopoverContent align="start" side="right">
          <BasicPanel title="Beside the menu" />
        </PopoverContent>
      </Popover>
    </div>
  </Section>
);

const FocusExample = () => {
  const [log, setLog] = useState("none");
  const restore = useRef<Element | null | undefined>(undefined);
  const [owned, setOwned] = useState(0);
  const [pinnedOpen, setPinnedOpen] = useState(false);

  return (
    <Section id="popover-focus" title="Focus and dismissal">
      <Row>
        <Popover>
          <TriggerButton>Focus moves inside</TriggerButton>
          <PopoverContent
            onCloseAutoFocus={() => {
              setLog("onCloseAutoFocus");
            }}
            onEscapeKeyDown={() => {
              setLog("onEscapeKeyDown");
            }}
            onInteractOutside={() => {
              setLog("onInteractOutside");
            }}
            onOpenAutoFocus={() => {
              setLog("onOpenAutoFocus");
            }}
          >
            <div className="flex flex-col gap-2 p-3 text-sm">
              <PopoverTitle>Focusable content</PopoverTitle>
              <Button size="dialog">First action</Button>
              <Button color="outline" size="dialog">
                Second action
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <TriggerButton>Focus stays put</TriggerButton>
          <PopoverContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <BasicPanel title="Open and close autofocus prevented" />
          </PopoverContent>
        </Popover>
        <Popover onOpenChange={setPinnedOpen} open={pinnedOpen}>
          <TriggerButton>Cannot be dismissed outside</TriggerButton>
          <PopoverContent
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
          >
            <div className="flex flex-col gap-2 p-3 text-sm">
              <PopoverTitle>
                Escape and outside presses are ignored
              </PopoverTitle>
              <Button
                onClick={() => {
                  setPinnedOpen(false);
                }}
                size="dialog"
              >
                Close
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Popover modal>
          <TriggerButton>Modal</TriggerButton>
          <PopoverContent>
            <div className="flex flex-col gap-2 p-3 text-sm">
              <PopoverTitle>modal</PopoverTitle>
              <Button size="dialog">Inside modal</Button>
            </div>
          </PopoverContent>
        </Popover>
      </Row>
      <Readout label="Last handler:" value={log} />
      <PopoverFocusRestoreContext value={restore}>
        <Row>
          <Popover>
            <TriggerButton>Restores focus</TriggerButton>
            <PopoverContent>
              <BasicPanel title="Focus restoration context" />
            </PopoverContent>
          </Popover>
        </Row>
      </PopoverFocusRestoreContext>
      <PopoverOverlayOwnerContext
        value={{
          id: "gallery-owner",
          registerOpen: () => {
            setOwned((count) => count + 1);

            return () => {
              setOwned((count) => count - 1);
            };
          },
        }}
      >
        <Row>
          <Popover>
            <TriggerButton>Overlay owner</TriggerButton>
            <PopoverContent>
              <BasicPanel title="data-ck-overlay-owner" />
            </PopoverContent>
          </Popover>
          <Readout label="Registered while open:" value={String(owned)} />
        </Row>
      </PopoverOverlayOwnerContext>
    </Section>
  );
};

const CoachmarkSample = ({
  align,
  side,
  size,
  title,
  direction,
}: {
  align: CoachmarkAlign;
  direction?: "ltr" | "rtl";
  side: CoachmarkSide;
  size: CoachmarkSize;
  title?: string;
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(true);
  const id = `coachmark-${side}-${align}-${size}${direction ? `-${direction}` : ""}`;

  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4">
      <Button
        onClick={() => {
          setShown(true);
        }}
        ref={setAnchor}
        size="dialog"
      >
        {`${side} ${align} ${size}`}
      </Button>
      {anchor && shown && (
        <Coachmark
          align={align}
          anchor={anchor}
          body="Try this shortcut."
          direction={direction}
          id={id}
          onDismiss={() => {
            setShown(false);
          }}
          side={side}
          size={size}
          title={title}
        />
      )}
    </div>
  );
};

const coachmarkSides = [
  "top",
  "bottom",
  "start",
  "end",
] as const satisfies readonly CoachmarkSide[];

const CoachmarkExample = () => {
  const [pick, setPick] = useState<CoachmarkSide>("bottom");
  const [align, setAlign] = useState<CoachmarkAlign>("center");
  const [size, setSize] = useState<CoachmarkSize>("default");
  const [titled, setTitled] = useState(true);
  const [language, setLanguage] = useState("en");

  // A Coachmark without a direction prop reads it from the document language.
  useEffect(() => {
    const root = document.documentElement;
    const original = root.lang;
    root.lang = language;

    return () => {
      root.lang = original;
    };
  }, [language]);

  return (
    <Section id="popover-coachmark" title="Coachmark">
      <Row>
        {coachmarkSides.map((name) => (
          <Button
            aria-pressed={pick === name}
            color={pick === name ? "secondary" : "outline"}
            key={name}
            onClick={() => {
              setPick(name);
            }}
            size="dialog"
          >
            {`side ${name}`}
          </Button>
        ))}
        {(["start", "center", "end"] as const).map((name) => (
          <Button
            aria-pressed={align === name}
            color={align === name ? "secondary" : "outline"}
            key={name}
            onClick={() => {
              setAlign(name);
            }}
            size="dialog"
          >
            {`align ${name}`}
          </Button>
        ))}
        {(["default", "wide", "large"] as const).map((name) => (
          <Button
            aria-pressed={size === name}
            color={size === name ? "secondary" : "outline"}
            key={name}
            onClick={() => {
              setSize(name);
            }}
            size="dialog"
          >
            {`size ${name}`}
          </Button>
        ))}
        <Button
          aria-pressed={titled}
          color={titled ? "secondary" : "outline"}
          onClick={() => {
            setTitled((value) => !value);
          }}
          size="dialog"
        >
          Title
        </Button>
        {(["en", "ar"] as const).map((name) => (
          <Button
            aria-pressed={language === name}
            color={language === name ? "secondary" : "outline"}
            key={name}
            onClick={() => {
              setLanguage(name);
            }}
            size="dialog"
          >
            {`lang ${name}`}
          </Button>
        ))}
      </Row>
      <Readout label="Document language" value={language} />
      <CoachmarkSample
        align={align}
        key={`${pick}-${align}-${size}-${titled}`}
        side={pick}
        size={size}
        title={titled ? "Quick tip" : undefined}
      />
    </Section>
  );
};

const ThemeScopes = () => {
  const [lightInDark, setLightInDark] = useState<HTMLElement | null>(null);
  const [darkInLight, setDarkInLight] = useState<HTMLElement | null>(null);
  const [rtl, setRtl] = useState<HTMLElement | null>(null);

  return (
    <Section id="popover-scopes" title="Theme scope and direction">
      <div className="dark rounded-lg bg-background p-4 text-foreground">
        <div
          className="light rounded-lg bg-background p-4 text-foreground"
          data-testid="popover-light-in-dark"
          ref={setLightInDark}
        >
          <Popover>
            <TriggerButton>Light panel in dark</TriggerButton>
            <PopoverContent portalContainer={lightInDark}>
              <BasicPanel title="Light in dark" />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="light rounded-lg bg-background p-4 text-foreground">
        <div
          className="dark rounded-lg bg-background p-4 text-foreground"
          data-testid="popover-dark-in-light"
          ref={setDarkInLight}
        >
          <Popover>
            <TriggerButton>Dark panel in light</TriggerButton>
            <PopoverContent portalContainer={darkInLight}>
              <BasicPanel title="Dark in light" />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div
        className="rounded-lg border border-dashed border-border p-4"
        dir="rtl"
        ref={setRtl}
      >
        <Popover>
          <TriggerButton>Right to left</TriggerButton>
          <PopoverContent portalContainer={rtl}>
            <BasicPanel title="Right to left" />
          </PopoverContent>
        </Popover>
        <CoachmarkSample
          align="start"
          direction="rtl"
          side="start"
          size="default"
          title="Right to left"
        />
      </div>
    </Section>
  );
};

const PopoverGalleryExample = () => (
  <div className="flex flex-col gap-8 p-6">
    <h2 className="text-title-lg font-semibold">Popover</h2>
    <Note>
      Panels open from their triggers. Escape or a press outside closes them and
      focus returns to the trigger.
    </Note>
    <StateExample />
    <SizesExample />
    <VariantsExample />
    <PlacementExample />
    <AnchorExample />
    <ScrollExample />
    <MotionExample />
    <TrackingExample />
    <PortalExample />
    <ScaleExample />
    <MenuOffsetExample />
    <FocusExample />
    <CoachmarkExample />
    <ThemeScopes />
  </div>
);

export { PopoverGalleryExample };
