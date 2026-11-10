"use client";

import {
  ButtonGroup,
  ButtonGroupDivider,
  ButtonGroupTitle,
  RoundIconToggleButton,
  ToolbarButton,
} from "@workspace/react/components/button/button-group";
import { DataButton } from "@workspace/react/components/button/data-button";
import type {
  DataButtonColor,
  DataButtonSize,
  DataButtonVariant,
} from "@workspace/react/components/button/data-button";
import { PlatformProvider } from "@workspace/react/components/platform-provider";
import { Button, ButtonLink } from "@workspace/react/components/ui/button";
import type {
  ButtonColor,
  ButtonFocusRing,
  ButtonRadius,
  ButtonSize,
} from "@workspace/react/components/ui/button";
import { Menu, MenuItem } from "@workspace/react/components/ui/menu";
import { TooltipProvider } from "@workspace/react/components/ui/tooltip";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";

const colorGroups = [
  [
    "Solid",
    [
      "primary",
      "solidPrimary",
      "accent",
      "accentAction",
      "accentInverse",
      "successSolid",
      "dangerSolid",
      "mediaSolid",
      "composerPrimary",
    ],
  ],
  [
    "Tinted",
    [
      "secondary",
      "accentSubtle",
      "conversationAccentSubtle",
      "danger",
      "upgrade",
      "upgradeAccent",
      "headerUpgrade",
      "tinted",
      "activity",
      "activityStop",
      "activitySuccess",
    ],
  ],
  [
    "Outline",
    [
      "outline",
      "outlineActive",
      "outlineSurface",
      "outlineSurfaceRaised",
      "outlineCard",
      "outlineGhost",
      "outlineGhostInset",
      "outlineGhostMuted",
      "outlineSubtle",
      "dangerOutline",
      "ghostOutline",
      "field",
      "selectTrigger",
      "secondarySurface",
      "elevatedSurface",
      "composerSurface",
      "conversationFollowup",
      "conversationPill",
      "imageSurface",
      "mapSurface",
    ],
  ],
  [
    "Ghost",
    [
      "ghost",
      "ghostActive",
      "ghostSecondary",
      "ghostAccent",
      "ghostDanger",
      "ghostSubtle",
      "ghostAccentSubtle",
      "ghostMuted",
      "ghostTertiary",
      "ghostUserMessage",
      "toolbar",
      "disclosure",
      "blockAction",
      "limited",
    ],
  ],
  [
    "Card, media and segmented",
    [
      "cardAction",
      "shareDestination",
      "surveyCard",
      "selectionTile",
      "segmentedSelected",
      "segmentedInsetSelected",
      "segmentedFormSelected",
      "segmentedFormUnselected",
    ],
  ],
] as const satisfies readonly (readonly [string, readonly ButtonColor[]])[];

const sizeNames = [
  "default",
  "compact",
  "composer",
  "composerSm",
  "composerPill",
  "composerAuxiliary",
  "cardAction",
  "actionSm",
  "sidebarOffer",
  "dialog",
  "dialogAction",
  "formAction",
  "entityAction",
  "pageAction",
  "addAction",
  "medium",
  "large",
  "field",
  "inputControl",
  "formField",
  "menuRow",
  "settingsSelect",
  "settingsAction",
  "auth",
  "onboardingAction",
  "giftCard",
  "floatingAction",
  "toolbar",
  "headerUpsell",
  "dialogGhost",
  "messageChip",
] as const satisfies readonly ButtonSize[];

const uniformSizes = [
  "icon",
  "iconCircleSm",
  "iconCircle",
  "iconCircleLg",
  "iconTouch",
  "iconLarge",
  "iconMd",
  "iconSm",
  "entityHeader",
  "compact",
  "toolbar",
  "medium",
  "dialogGhost",
] as const satisfies readonly ButtonSize[];

const radii = [
  "default",
  "full",
  "extraLarge",
  "large",
  "small",
  "messageBubble",
] as const satisfies readonly ButtonRadius[];

const focusRings = [
  "default",
  "surface",
  "native",
  "inset",
  "none",
] as const satisfies readonly ButtonFocusRing[];

const Section = ({
  children,
  id,
  note,
  title,
}: {
  children: ReactNode;
  id: string;
  note?: string;
  title: string;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="flex flex-col gap-3"
    data-testid={id}
  >
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {note === undefined ? null : (
      <p className="text-sm text-muted-foreground">{note}</p>
    )}
    {children}
  </section>
);

const Row = ({
  children,
  className,
  "data-testid": testId,
}: {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) => (
  <div
    className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}
    data-testid={testId}
  >
    {children}
  </div>
);

const Cell = ({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col items-start gap-1">
    {children}
    <code className="text-2xs text-muted-foreground">{caption}</code>
  </div>
);

const ColorsSection = () => (
  <Section
    id="button-colors"
    note="Every color of the app's button, on the default size. Hover or focus a button to see its states."
    title="Color variants"
  >
    {colorGroups.map(([group, colors]) => (
      <div className="flex flex-col gap-2" key={group}>
        <h3 className="text-sm font-medium">{group}</h3>
        <Row className="gap-x-4 gap-y-3 rounded-xl bg-panel-secondary p-3">
          {colors.map((color) => (
            <Cell caption={color} key={color}>
              <Button
                aria-pressed={color === "mapSurface" ? false : undefined}
                color={color}
              >
                Label
              </Button>
            </Cell>
          ))}
        </Row>
      </div>
    ))}
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Media</h3>
      <Row className="dark gap-x-4 gap-y-3 rounded-xl bg-(--color-media-surface) p-3">
        {(
          [
            "mediaSolid",
            "mediaSubtle",
            "mediaOverlay",
            "mediaTranslucent",
            "successOutline",
          ] as const
        ).map((color) => (
          <Cell caption={color} key={color}>
            <Button color={color}>Label</Button>
          </Cell>
        ))}
      </Row>
    </div>
  </Section>
);

const SizesSection = () => (
  <Section
    id="button-sizes"
    note="Each size name of the size scale, on the outline color."
    title="Sizes"
  >
    <Row className="gap-x-4 gap-y-3 rounded-xl bg-panel-secondary p-3">
      {sizeNames.map((size) => (
        <Cell caption={size} key={size}>
          <Button color="outline" size={size}>
            Label
          </Button>
        </Cell>
      ))}
    </Row>
    <h3 className="text-sm font-medium">Icon only (uniform)</h3>
    <Row className="gap-x-4 gap-y-3 rounded-xl bg-panel-secondary p-3">
      {uniformSizes.map((size) => (
        <Cell caption={`uniform ${size}`} key={size}>
          <Button
            aria-label={`Add (${size})`}
            color="outline"
            size={size}
            uniform
          >
            <Plus className="size-full" />
          </Button>
        </Cell>
      ))}
    </Row>
    <h3 className="text-sm font-medium">Radius</h3>
    <Row className="gap-x-4 gap-y-3 rounded-xl bg-panel-secondary p-3">
      {radii.map((radius) => (
        <Cell caption={`radius ${radius}`} key={radius}>
          <Button color="outline" radius={radius} size="formAction">
            Label
          </Button>
        </Cell>
      ))}
    </Row>
  </Section>
);

const StatesSection = () => {
  const [loading, setLoading] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <Section
      id="button-states"
      note="Disabled and loading buttons carry the native disabled attribute, so they are skipped by Tab and ignore clicks."
      title="Disabled, loading, invalid and open"
    >
      <Row>
        <Cell caption="disabled">
          <Button disabled size="formAction">
            Unavailable
          </Button>
        </Cell>
        <Cell caption="disabled outline">
          <Button color="outline" disabled size="formAction">
            Unavailable
          </Button>
        </Cell>
        <Cell caption="disabled cardAction (opacity 50)">
          <Button color="cardAction" disabled size="cardAction">
            Unavailable
          </Button>
        </Cell>
        <Cell caption="disabledAppearance none">
          <Button disabled disabledAppearance="none" size="formAction">
            Unavailable
          </Button>
        </Cell>
        <Cell caption="loading">
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
            }}
            size="formAction"
          >
            {loading ? "Working..." : "Start"}
          </Button>
        </Cell>
        <Cell caption="always loading">
          <Button loading size="formAction">
            Working...
          </Button>
        </Cell>
        <Cell caption="sizingLabels (keeps width)">
          <Button
            loading={loading}
            sizingLabels={["Save changes", "Saving..."]}
            size="formAction"
          >
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </Cell>
      </Row>
      <Row>
        <Button
          color="outline"
          data-testid="button-loading-reset"
          onClick={() => {
            setLoading(false);
          }}
          size="dialog"
        >
          Reset loading
        </Button>
        <Button
          color="outline"
          disabled={loading}
          onClick={() => {
            setClicks((count) => count + 1);
          }}
          size="dialog"
        >
          Count clicks
        </Button>
        <output className="text-sm" data-testid="button-click-count">
          Clicks: {clicks}
        </output>
      </Row>
      <Row>
        <Cell caption="formField aria-invalid">
          <Button aria-invalid color="field" size="formField">
            Invalid value
          </Button>
        </Cell>
        <Cell caption="data-state=open ghost">
          <Button color="ghost" data-state="open" size="dialog">
            Open
          </Button>
        </Cell>
        <Cell caption="data-state=open secondary">
          <Button color="secondary" data-state="open" size="dialog">
            Open
          </Button>
        </Cell>
        <Cell caption="data-state=open outline">
          <Button color="outline" data-state="open" size="dialog">
            Open
          </Button>
        </Cell>
        <Cell caption="menu trigger (opens a menu)">
          <Menu
            triggerButton={
              <Button color="outline" size="dialog">
                Options
              </Button>
            }
          >
            <MenuItem
              onSelect={(event) => {
                event.stopPropagation();
              }}
            >
              First choice
            </MenuItem>
            <MenuItem
              onSelect={(event) => {
                event.stopPropagation();
              }}
            >
              Second choice
            </MenuItem>
          </Menu>
        </Cell>
        <Cell caption="aria-pressed toggle (mapSurface)">
          <Button
            aria-pressed={pressed}
            color="mapSurface"
            onClick={() => {
              setPressed((value) => !value);
            }}
            size="dialog"
          >
            {pressed ? "Pressed" : "Not pressed"}
          </Button>
        </Cell>
        <Cell caption="aria-pressed toggle (activity)">
          <Button
            aria-pressed={pressed}
            color="activity"
            onClick={() => {
              setPressed((value) => !value);
            }}
            size="dialog"
          >
            {pressed ? "Pressed" : "Not pressed"}
          </Button>
        </Cell>
      </Row>
    </Section>
  );
};

const FocusSection = () => (
  <Section
    id="button-focus"
    note="Press Tab to move focus across these buttons. Enter and Space activate the focused button."
    title="Focus ring"
  >
    <Row>
      {focusRings.map((focusRing) => (
        <Cell caption={`focusRing ${focusRing}`} key={focusRing}>
          <Button color="outline" focusRing={focusRing} size="dialog">
            {focusRing}
          </Button>
        </Cell>
      ))}
    </Row>
  </Section>
);

// The platform link component for the router rows: Next.js Link, which takes
// the router options ButtonLink maps (replace, scroll and prefetch).
const NextAnchor = ({
  href = "",
  ...props
}: ComponentProps<"a"> & {
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
}) => <Link href={href} {...props} />;

const LinksSection = () => {
  const [clicks, setClicks] = useState(0);

  return (
    <Section
      id="button-links"
      note="A link button drops its href while disabled or loading, leaves the tab order and swallows click, auxclick, Enter and Space."
      title="Link rendering"
    >
      <Row>
        <Cell caption="as link">
          <ButtonLink
            color="outline"
            href="#button-links"
            onClick={() => {
              setClicks((count) => count + 1);
            }}
            size="dialog"
          >
            Link
          </ButtonLink>
        </Cell>
        <Cell caption="to (platform link)">
          <ButtonLink color="outline" size="dialog" to="#button-links">
            Router link
          </ButtonLink>
        </Cell>
        <Cell caption="disabled link">
          <ButtonLink
            color="outline"
            disabled
            href="#button-links"
            onClick={() => {
              setClicks((count) => count + 100);
            }}
            size="dialog"
          >
            Disabled link
          </ButtonLink>
        </Cell>
        <Cell caption="loading link">
          <ButtonLink
            color="outline"
            href="#button-links"
            loading
            size="dialog"
          >
            Loading link
          </ButtonLink>
        </Cell>
        <output className="text-sm" data-testid="button-link-count">
          Link clicks: {clicks}
        </output>
      </Row>
      <PlatformProvider linkComponent={NextAnchor}>
        <Row data-testid="button-router-links">
          <Cell caption="to string, replace">
            <ButtonLink
              color="outline"
              replace
              size="dialog"
              to="/gallery/button#button-links"
            >
              Replace link
            </ButtonLink>
          </Cell>
          <Cell caption="to parts, push">
            <ButtonLink
              color="outline"
              size="dialog"
              to={{ hash: "button-links", pathname: "/gallery/button" }}
            >
              Parts link
            </ButtonLink>
          </Cell>
          <Cell caption="to parts, hash only">
            <ButtonLink
              color="outline"
              size="dialog"
              to={{ hash: "button-links" }}
            >
              Hash-only link
            </ButtonLink>
          </Cell>
          <Cell caption="preventScrollReset">
            <ButtonLink
              color="outline"
              preventScrollReset
              size="dialog"
              to="/gallery/button#button-colors"
            >
              Keep scroll link
            </ButtonLink>
          </Cell>
          <Cell caption="to another route">
            <ButtonLink color="outline" size="dialog" to="/gallery">
              Client link
            </ButtonLink>
          </Cell>
          <Cell caption="reloadDocument">
            <ButtonLink
              color="outline"
              reloadDocument
              size="dialog"
              to="/gallery"
            >
              Reload link
            </ButtonLink>
          </Cell>
          <Cell caption="disabled to">
            <ButtonLink
              color="outline"
              disabled
              size="dialog"
              to="/gallery/button#button-links"
            >
              Disabled router link
            </ButtonLink>
          </Cell>
        </Row>
      </PlatformProvider>
    </Section>
  );
};

const GroupSection = () => {
  const [selected, setSelected] = useState("list");
  const [toggled, setToggled] = useState(false);

  return (
    <Section
      id="button-group"
      note="Groups are role=group with an accessible name. Dividers are hidden from assistive technology."
      title="Button group and toolbar"
    >
      <TooltipProvider>
        <Row className="gap-6">
          <ButtonGroup label="View">
            <ToolbarButton
              aria-label="List view"
              onClick={() => {
                setSelected("list");
              }}
              selected={selected === "list"}
              uniform
            >
              <Plus className="size-4" />
            </ToolbarButton>
            <ButtonGroupDivider />
            <ToolbarButton
              aria-label="Grid view"
              onClick={() => {
                setSelected("grid");
              }}
              selected={selected === "grid"}
              uniform
            >
              <Plus className="size-4" />
            </ToolbarButton>
          </ButtonGroup>
          <ButtonGroup label="Edit" variant="joined">
            <ToolbarButton>Undo</ToolbarButton>
            <ButtonGroupDivider variant="section" />
            <ToolbarButton variant="primary">Save</ToolbarButton>
          </ButtonGroup>
          <ButtonGroup label="Zoom" variant="zoom">
            <ToolbarButton aria-label="Zoom out" uniform>
              -
            </ToolbarButton>
            <ButtonGroupDivider />
            <ToolbarButton variant="zoom">100%</ToolbarButton>
            <ButtonGroupDivider />
            <ToolbarButton aria-label="Zoom in" uniform>
              +
            </ToolbarButton>
          </ButtonGroup>
          <ButtonGroup label="Unavailable">
            <ToolbarButton disabled>Disabled</ToolbarButton>
          </ButtonGroup>
          <ButtonGroupTitle title="A document title that is longer than the pill can show" />
          <RoundIconToggleButton
            aria-label="Toggle"
            aria-pressed={toggled}
            onClick={() => {
              setToggled((value) => !value);
            }}
            size="iconCircleLg"
            uniform
          >
            <Plus className="size-4" />
          </RoundIconToggleButton>
          <output className="text-sm" data-testid="button-group-state">
            View: {selected}. Toggle: {toggled ? "on" : "off"}
          </output>
        </Row>
      </TooltipProvider>
    </Section>
  );
};

const dataColors = [
  "primary",
  "secondary",
  "success",
  "danger",
  "warning",
  "caution",
  "info",
  "discovery",
] as const satisfies readonly DataButtonColor[];

const dataVariants = [
  "solid",
  "soft",
  "surface",
  "outline",
  "ghost",
  "transparent",
] as const satisfies readonly DataButtonVariant[];

const dataSizes = [
  "3xs",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
] as const satisfies readonly DataButtonSize[];

const DataButtonMatrix = ({ size = "md" }: { size?: DataButtonSize }) => (
  <div className="flex flex-col gap-2">
    {dataVariants.map((variant) => (
      <Row className="gap-2" key={variant}>
        <code className="w-24 text-2xs text-muted-foreground">{variant}</code>
        {dataColors.map((color) => (
          <DataButton color={color} key={color} size={size} variant={variant}>
            {color}
          </DataButton>
        ))}
      </Row>
    ))}
  </div>
);

const DataButtonSection = () => {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <Section
      id="data-button"
      note="The design system's data-attribute Button. Variants, colors and sizes are data attributes read by one CSS module. Hover, press and focus a button to see its states."
      title="Data-attribute button"
    >
      <div
        className="flex flex-col gap-3 rounded-xl bg-panel-secondary p-3"
        data-testid="data-button-matrix"
      >
        <DataButtonMatrix />
      </div>
      <h3 className="text-sm font-medium">Sizes</h3>
      <Row
        className="items-end gap-x-3 gap-y-3 rounded-xl bg-panel-secondary p-3"
        data-testid="data-button-sizes"
      >
        {dataSizes.map((size) => (
          <Cell caption={size} key={size}>
            <DataButton color="info" size={size}>
              Label
            </DataButton>
          </Cell>
        ))}
      </Row>
      <Row
        className="items-end gap-x-3 gap-y-3 rounded-xl bg-panel-secondary p-3"
        data-testid="data-button-uniform"
      >
        {dataSizes.map((size) => (
          <Cell caption={`uniform ${size}`} key={size}>
            <DataButton
              aria-label={`Add (${size})`}
              size={size}
              uniform
              variant="soft"
            >
              <Plus />
            </DataButton>
          </Cell>
        ))}
      </Row>
      <h3 className="text-sm font-medium">Shape, gutter and icon size</h3>
      <Row
        className="gap-x-4 gap-y-3 rounded-xl bg-panel-secondary p-3"
        data-testid="data-button-shape"
      >
        <Cell caption="pill (default)">
          <DataButton size="lg">Label</DataButton>
        </Cell>
        <Cell caption="pill={false}">
          <DataButton pill={false} size="lg">
            Label
          </DataButton>
        </Cell>
        <Cell caption="squircle">
          <DataButton size="lg" squircle>
            Label
          </DataButton>
        </Cell>
        <Cell caption="gutterSize xl">
          <DataButton gutterSize="xl" size="lg">
            Label
          </DataButton>
        </Cell>
        <Cell caption="iconSize xl">
          <DataButton iconSize="xl" size="lg" variant="outline">
            <Plus />
            Label
          </DataButton>
        </Cell>
        <Cell caption="opticallyAlign start">
          <div className="rounded-md bg-panel p-1">
            <DataButton opticallyAlign="start" size="lg" variant="ghost">
              <Plus />
              Label
            </DataButton>
          </div>
        </Cell>
        <Cell caption="block">
          <div className="w-48">
            <DataButton block size="lg" variant="outline">
              Label
            </DataButton>
          </div>
        </Cell>
      </Row>
      <h3 className="text-sm font-medium">Disabled, selected and open</h3>
      <Row
        className="gap-x-4 gap-y-3 rounded-xl bg-panel-secondary p-3"
        data-testid="data-button-states"
      >
        <Cell caption="disabled">
          <DataButton
            disabled
            onClick={() => {
              setClicks((count) => count + 1);
            }}
            size="lg"
          >
            Label
          </DataButton>
        </Cell>
        <Cell caption="disabled, dimmed">
          <DataButton disabled disabledTone="dimmed" size="lg" variant="soft">
            Label
          </DataButton>
        </Cell>
        <Cell caption="disabled, relaxed">
          <DataButton disabled disabledTone="relaxed" size="lg" variant="soft">
            Label
          </DataButton>
        </Cell>
        <Cell caption="disabled ghost">
          <DataButton disabled size="lg" variant="ghost">
            Label
          </DataButton>
        </Cell>
        <Cell caption="selected toggle">
          <DataButton
            onClick={() => {
              setSelected((value) => !value);
            }}
            selected={selected}
            size="lg"
            variant="ghost"
          >
            {selected ? "Selected" : "Select"}
          </DataButton>
        </Cell>
        <Cell caption="data-state=open">
          <DataButton data-state="open" size="lg" variant="outline">
            Open
          </DataButton>
        </Cell>
        <Cell caption="aria-expanded">
          <DataButton aria-expanded size="lg" variant="soft">
            Expanded
          </DataButton>
        </Cell>
        <Cell caption="data-popup-open">
          <DataButton data-popup-open="" size="lg" variant="solid">
            Popup open
          </DataButton>
        </Cell>
        <output className="text-sm" data-testid="data-button-clicks">
          Disabled clicks: {clicks}
        </output>
      </Row>
      <h3 className="text-sm font-medium">Loading</h3>
      <Row
        className="gap-x-4 gap-y-3 rounded-xl bg-panel-secondary p-3"
        data-testid="data-button-loading"
      >
        <DataButton
          data-testid="data-button-loader"
          loading={loading}
          onClick={() => {
            setClicks((count) => count + 1);
          }}
          size="lg"
        >
          Save changes
        </DataButton>
        <DataButton
          loading={loading}
          size="lg"
          variant="outline"
          color="secondary"
        >
          Save changes
        </DataButton>
        <DataButton
          aria-label="Save"
          loading={loading}
          size="lg"
          uniform
          variant="soft"
        >
          <Plus />
        </DataButton>
        <DataButton
          data-testid="data-button-loading-toggle"
          onClick={() => {
            setLoading((value) => !value);
          }}
          size="lg"
          variant="surface"
        >
          {loading ? "Stop loading" : "Start loading"}
        </DataButton>
        <DataButton loading size="lg" variant="ghost">
          Always loading
        </DataButton>
      </Row>
    </Section>
  );
};

const NestedScopesSection = () => (
  <Section
    id="data-button-scopes"
    note="A light panel inside a dark panel, and a dark panel inside that light panel. Each button follows the nearest scope."
    title="Nested theme scopes"
  >
    <div
      className="dark flex flex-col gap-3 rounded-xl bg-background p-4 text-foreground"
      data-testid="data-button-scope-dark"
    >
      <p className="text-sm">Dark scope</p>
      <DataButtonMatrix size="sm" />
      <Row>
        <Button size="formAction">primary</Button>
        <Button color="outline" size="formAction">
          outline
        </Button>
        <Button color="danger" size="formAction">
          danger
        </Button>
      </Row>
      <div
        className="light flex flex-col gap-3 rounded-xl bg-background p-4 text-foreground"
        data-testid="data-button-scope-light"
      >
        <p className="text-sm">Light scope inside dark</p>
        <DataButtonMatrix size="sm" />
        <Row>
          <Button size="formAction">primary</Button>
          <Button color="outline" size="formAction">
            outline
          </Button>
          <Button color="danger" size="formAction">
            danger
          </Button>
        </Row>
        <div
          className="dark flex flex-col gap-3 rounded-xl bg-background p-4 text-foreground"
          data-testid="data-button-scope-dark-inner"
        >
          <p className="text-sm">Dark scope inside light inside dark</p>
          <DataButtonMatrix size="sm" />
          <Row>
            <Button size="formAction">primary</Button>
            <Button color="danger" size="formAction">
              danger
            </Button>
          </Row>
        </div>
      </div>
    </div>
  </Section>
);

const DirectionSection = ({
  dir,
  title,
}: {
  dir: "ltr" | "rtl";
  title: string;
}) => (
  <Section id={`button-${dir}`} title={title}>
    <div
      className="flex flex-col gap-3 rounded-xl bg-panel-secondary p-3"
      dir={dir}
    >
      <Row>
        <Button color="primary" size="formAction">
          <Plus className="size-4" />
          Add item
        </Button>
        <Button color="outline" size="formAction">
          Cancel
          <Plus className="size-4" />
        </Button>
        <Button color="outline" size="actionChip">
          Chip
        </Button>
      </Row>
      <ButtonGroup label="Direction example" variant="joined">
        <ToolbarButton>First</ToolbarButton>
        <ButtonGroupDivider />
        <ToolbarButton>Second</ToolbarButton>
      </ButtonGroup>
    </div>
  </Section>
);

const DarkSection = () => (
  <Section
    id="button-dark"
    note="The same buttons inside a dark theme scope, whatever the page appearance is."
    title="Dark appearance"
  >
    <div className="dark flex flex-col gap-3 rounded-xl bg-background p-4 text-foreground">
      <Row>
        <Button size="formAction">primary</Button>
        <Button color="secondary" size="formAction">
          secondary
        </Button>
        <Button color="outline" size="formAction">
          outline
        </Button>
        <Button color="ghostActive" size="formAction">
          ghost
        </Button>
        <Button color="accent" size="formAction">
          accent
        </Button>
        <Button color="dangerSolid" size="formAction">
          dangerSolid
        </Button>
        <Button color="danger" size="formAction">
          danger
        </Button>
        <Button disabled size="formAction">
          disabled
        </Button>
        <Button loading size="formAction">
          loading
        </Button>
        <Button color="mapSurface" aria-pressed size="formAction">
          pressed
        </Button>
        <Button color="activity" size="formAction">
          activity
        </Button>
      </Row>
      <ButtonGroup label="Dark group">
        <ToolbarButton selected>Selected</ToolbarButton>
        <ButtonGroupDivider />
        <ToolbarButton>Other</ToolbarButton>
      </ButtonGroup>
    </div>
  </Section>
);

/** Every state of the button family. */
export const ButtonGalleryExample = () => (
  <section className="flex flex-col gap-8" data-testid="button-gallery">
    <ColorsSection />
    <SizesSection />
    <StatesSection />
    <FocusSection />
    <LinksSection />
    <GroupSection />
    <DirectionSection dir="ltr" title="Left to right" />
    <DirectionSection dir="rtl" title="Right to left" />
    <DarkSection />
    <DataButtonSection />
    <NestedScopesSection />
  </section>
);
