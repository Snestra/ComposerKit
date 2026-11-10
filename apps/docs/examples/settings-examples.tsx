"use client";

/* oxlint-disable react/no-unstable-nested-components -- A row control is a render function of the label and description ids. */

import {
  SettingsNavigationRequestContext,
  SettingsPageFrame,
} from "@workspace/react/components/settings/page-frame";
import {
  SettingsContentLayout,
  SettingsNavigationTarget,
} from "@workspace/react/components/settings/page-layout";
import { Button } from "@workspace/react/components/ui/button";
import {
  DetailPropertyRow,
  PluginSettingsRow,
  PreferenceRow,
  SettingsCard,
  SettingsGroup,
  SettingsInteractiveRow,
  SettingsLabelValueRow,
  SettingsRadioRow,
  SettingsRow,
  SettingsRowDisclosure,
  SettingsRows,
  SettingsSecondaryText,
  SettingsTertiaryText,
} from "@workspace/react/components/ui/settings";
import type { SettingsCardVariant } from "@workspace/react/components/ui/settings";
import { Switch } from "@workspace/react/components/ui/switch";
import { Bell, Globe } from "lucide-react";
import Link from "next/link";
import { useContext, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

type Choice = "a" | "b" | "gone";

const choices = [
  { label: "Option A", value: "a" },
  { label: "Option B", value: "b" },
] as const satisfies readonly { label: string; value: Choice }[];

// Local example logos: one per theme, so the row shows which scope it is in.
const logoSvg = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" fill="${fill}"/><circle cx="18" cy="18" r="9" fill="white"/></svg>`
  )}`;

const LIGHT_LOGO = logoSvg("#339cff");
const DARK_LOGO = logoSvg("#1a1c1f");

const cardVariants = [
  "default",
  "secondary",
  "muted",
  "form",
  "outlined",
  "outlinedLarge",
  "input",
  "recommendation",
  "metered",
  "flat",
  "rows",
] as const satisfies readonly SettingsCardVariant[];

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  id: string;
  title: string;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="flex flex-col gap-3"
    id={id}
  >
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {description === undefined ? null : (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {children}
  </section>
);

const Frame = ({
  children,
  className,
  label,
  testId,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  testId: string;
}) => (
  <figure className="flex min-w-0 flex-col gap-1" data-testid={testId}>
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    <div
      className={`min-w-0 rounded-xl border bg-background p-2 ${className ?? ""}`}
    >
      {children}
    </div>
  </figure>
);

const Toggle = ({
  aria,
  defaultChecked = false,
  disabled,
  id,
}: {
  aria?: { "aria-describedby"?: string; "aria-labelledby"?: string };
  defaultChecked?: boolean;
  disabled?: boolean;
  id?: string;
}) => {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <Switch
      {...aria}
      checked={checked}
      disabled={disabled}
      id={id}
      onChange={setChecked}
    />
  );
};

/* ------------------------------------------------------------------ */

const RowExamples = () => (
  <Section
    description="Each variant, size, layout and alignment of the row, with the control sizing options. Rows sit in a card; a function control receives the label and description ids."
    id="rows"
    title="Rows"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <Frame label="Default, compact, featured" testId="rows-default">
        <SettingsCard>
          <SettingsRow
            control={(aria) => <Toggle aria={aria} defaultChecked id="row-a" />}
            description="Show alerts for new activity"
            label="Notifications"
          />
          <SettingsRow
            control={(aria) => <Toggle aria={aria} />}
            label="Compact size"
            size="compact"
          />
          <SettingsRow
            control={(aria) => <Toggle aria={aria} defaultChecked />}
            description="Featured label text"
            label="Featured"
            variant="featured"
          />
          <SettingsRow
            control={(aria) => <Toggle aria={aria} />}
            label="Featured compact"
            size="compact"
            variant="featured"
          />
          <SettingsRow
            control={(aria) => <Toggle aria={aria} disabled />}
            description="This control is disabled"
            label="Disabled control"
          />
        </SettingsCard>
      </Frame>
      <Frame label="Nested, stacked, recommendation" testId="rows-variants">
        <SettingsCard>
          <SettingsRow
            control={<SettingsTertiaryText>Value</SettingsTertiaryText>}
            label="Nested row (label not bold)"
            variant="nested"
          />
          <SettingsRow
            control={
              <div className="w-full rounded-md border p-2 text-sm">
                Full width control
              </div>
            }
            description="Control below the label"
            label="Stacked row"
            variant="stacked"
          />
          <SettingsRow
            control={(aria) => <Toggle aria={aria} defaultChecked />}
            label="Recommendation row"
            variant="recommendation"
          />
        </SettingsCard>
      </Frame>
      <Frame label="Split layout and alignment" testId="rows-split">
        <SettingsCard>
          <SettingsRow
            control={<Button color="outline">Action</Button>}
            description="Label in the first column, control across two"
            label="Split layout"
            layout="split"
          />
          <SettingsRow
            control={<Toggle />}
            description="A longer description that wraps onto several lines so the vertical alignment shows"
            label="Start aligned"
            verticalAlignment="start"
          />
          <SettingsRow
            control={<Toggle />}
            description="A longer description that wraps onto several lines so the vertical alignment shows"
            label="Centre aligned"
          />
          <SettingsRow
            description="A row with a label and no control"
            label="No control"
          />
        </SettingsCard>
      </Frame>
      <Frame label="Icon, weight, sizing and controls" testId="rows-label">
        <SettingsCard>
          <SettingsRow
            control={<Toggle />}
            icon={<Bell aria-hidden="true" className="size-5" />}
            label="Row with an icon"
          />
          <SettingsRow
            control={<Toggle />}
            label="Normal weight label"
            labelWeight="normal"
          />
          <SettingsRow
            control={<Button color="outline">Grow</Button>}
            controlSizing="grow"
            label="Control grows"
          />
          <SettingsRow
            control={<Button color="outline">Content</Button>}
            controlSizing="content"
            label="Control sized to content"
            labelSizing="content"
          />
          <SettingsRow
            control={<Toggle />}
            inset={false}
            label="Row without inset"
          />
          <SettingsRow
            control={<Toggle />}
            description="Break words in a very long unbroken description: Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious"
            label="Averyveryveryverylonglabelthatcannotbreakanywhereunlessthebreakwordsruleapplies_averyveryveryverylonglabel"
          />
        </SettingsCard>
      </Frame>
    </div>
  </Section>
);

const InteractiveRowExamples = () => {
  const [log, setLog] = useState("Nothing pressed yet.");
  const [expanded, setExpanded] = useState(false);
  const [radio, setRadio] = useState("one");

  const press = (name: string) => () => {
    setLog(`${name} pressed`);
  };

  return (
    <Section
      description="Interactive rows highlight on hover and focus. The radio rows, the label and value rows and the disclosure are the other row components."
      id="interactive"
      title="Interactive rows and disclosure"
    >
      <p aria-live="polite" className="text-sm" data-testid="interactive-log">
        {log}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Frame
          label="Button, link, disabled, actions"
          testId="interactive-rows"
        >
          <SettingsCard>
            <SettingsRows variant="interactive">
              <SettingsInteractiveRow
                description="A button row"
                label="Button row"
                onClick={press("Button row")}
                trailing={<SettingsTertiaryText>Value</SettingsTertiaryText>}
              />
              <SettingsInteractiveRow
                actions={
                  <Button
                    color="outline"
                    onClick={press("Row action")}
                    size="toolbar"
                  >
                    Action
                  </Button>
                }
                description="Large with an action"
                label="Row with action"
                onClick={press("Action row")}
                size="large"
              />
              <SettingsInteractiveRow
                description="Link row, no navigation away"
                label="Link row"
                onClick={press("Link row")}
                to="#interactive"
              />
              <SettingsInteractiveRow
                description="Disabled"
                disabled
                label="Disabled row"
                onClick={press("Disabled row")}
              />
              <SettingsInteractiveRow
                label="Nested row"
                onClick={press("Nested row")}
                variant="nested"
              />
              <SettingsInteractiveRow
                label="Recommendation row"
                onClick={press("Recommendation row")}
                variant="recommendation"
              />
              <SettingsInteractiveRow
                icon={<Globe aria-hidden="true" className="size-6" />}
                label="Nothing here yet"
                onClick={press("Empty row")}
                variant="empty"
              />
            </SettingsRows>
          </SettingsCard>
        </Frame>
        <Frame
          label="Plain rows with inset or edge dividers"
          testId="rows-dividers"
        >
          <div className="flex flex-col gap-3">
            <SettingsCard>
              <SettingsRows>
                <SettingsRow label="Inset divider" />
                <SettingsRow label="Inset divider" />
              </SettingsRows>
            </SettingsCard>
            <SettingsCard>
              <SettingsRows dividerInset="none">
                <SettingsRow label="Full width divider" />
                <SettingsRow label="Full width divider" />
              </SettingsRows>
            </SettingsCard>
          </div>
        </Frame>
        <Frame label="Disclosure" testId="disclosure">
          <SettingsCard>
            <SettingsRowDisclosure
              content={
                <SettingsRow
                  description="Rendered only while expanded"
                  label="Hidden detail"
                  variant="nested"
                />
              }
              contentId="disclosure-content"
              expanded={expanded}
            >
              <SettingsInteractiveRow
                ariaControls="disclosure-content"
                ariaExpanded={expanded}
                label={expanded ? "Hide details" : "Show details"}
                onClick={() => {
                  setExpanded((value) => !value);
                }}
              />
            </SettingsRowDisclosure>
          </SettingsCard>
        </Frame>
        <Frame label="Label and value, radio rows" testId="label-value">
          <div className="flex flex-col gap-3">
            <SettingsCard>
              <SettingsLabelValueRow label="Default">
                Value text
              </SettingsLabelValueRow>
              <SettingsLabelValueRow label="End aligned" valueAlignment="end">
                Value text
              </SettingsLabelValueRow>
            </SettingsCard>
            <SettingsCard variant="outlined">
              <SettingsLabelValueRow label="Compact" variant="compact">
                <SettingsSecondaryText>Value</SettingsSecondaryText>
              </SettingsLabelValueRow>
            </SettingsCard>
            <SettingsCard>
              <SettingsRows variant="interactive">
                {(["one", "two"] as const).map((value) => (
                  <SettingsRadioRow
                    ariaLabel={`Radio ${value}`}
                    checked={radio === value}
                    description={`Description of ${value}`}
                    id={`radio-${value}`}
                    key={value}
                    label={`Radio ${value}`}
                    name="radio-demo"
                    onChange={() => {
                      setRadio(value);
                    }}
                    value={value}
                  />
                ))}
              </SettingsRows>
            </SettingsCard>
            <SettingsCard>
              <SettingsRows variant="interactive">
                {(["one", "two"] as const).map((value) => (
                  <SettingsRadioRow
                    ariaLabel={`Checkmark ${value}`}
                    checked={radio === value}
                    id={`check-${value}`}
                    indicator="checkmark"
                    key={value}
                    label={`Checkmark ${value}`}
                    name="check-demo"
                    onChange={() => {
                      setRadio(value);
                    }}
                    value={value}
                  />
                ))}
              </SettingsRows>
            </SettingsCard>
          </div>
        </Frame>
      </div>
    </Section>
  );
};

const CardExamples = () => (
  <Section
    description="Every card variant, then dividers off, visible overflow and the daybreak decoration."
    id="cards"
    title="Cards"
  >
    <div className="grid gap-4 md:grid-cols-2">
      {cardVariants.map((variant) => (
        <Frame key={variant} label={variant} testId={`card-${variant}`}>
          <SettingsCard variant={variant}>
            <SettingsRow label={`${variant} row`} />
            <SettingsRow label="Second row" />
          </SettingsCard>
        </Frame>
      ))}
      <Frame label="dividers off" testId="card-no-dividers">
        <SettingsCard dividers={false}>
          <SettingsRow label="No divider" />
          <SettingsRow label="No divider" />
        </SettingsCard>
      </Frame>
      <Frame label="contentOverflow visible" testId="card-overflow">
        <SettingsCard contentOverflow="visible">
          <SettingsRow label="Overflow visible" />
          <div className="relative h-0">
            <div className="absolute end-2 -top-4 rounded-md border bg-background px-2 py-1 text-xs">
              Overflows
            </div>
          </div>
        </SettingsCard>
      </Frame>
      <Frame label="decoration daybreak" testId="card-daybreak">
        <SettingsCard decoration="daybreak">
          <SettingsRow
            description="Gradient at the inline end"
            label="Daybreak"
          />
        </SettingsCard>
      </Frame>
    </div>
  </Section>
);

const GroupExamples = () => (
  <Section
    description="Group header sizes, spacing, subtitle placement and wrap, actions, title gap, and both footer variants."
    id="groups"
    title="Groups"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <Frame
        label="Default with subtitle, description footer"
        testId="group-default"
      >
        <SettingsGroup>
          <SettingsGroup.Header
            actions={
              <Button color="outline" size="toolbar">
                Add
              </Button>
            }
            subtitle="A short subtitle that explains the group"
            title="General"
          />
          <SettingsGroup.Content>
            <SettingsCard>
              <SettingsRow label="First" />
              <SettingsRow label="Second" />
            </SettingsCard>
          </SettingsGroup.Content>
          <SettingsGroup.Footer>A footer description</SettingsGroup.Footer>
        </SettingsGroup>
      </Frame>
      <Frame label="No subtitle, action footer" testId="group-plain">
        <SettingsGroup>
          <SettingsGroup.Header title="Title only" />
          <SettingsGroup.Content>
            <SettingsCard>
              <SettingsRow label="Only row" />
            </SettingsCard>
          </SettingsGroup.Content>
          <SettingsGroup.Footer variant="action">
            <Button color="outline">Footer action</Button>
          </SettingsGroup.Footer>
        </SettingsGroup>
      </Frame>
      <Frame label="Sizes: compact, base, large" testId="group-sizes">
        <div className="flex flex-col gap-2">
          {(["compact", "base", "large"] as const).map((size) => (
            <SettingsGroup.Header
              key={size}
              size={size}
              subtitle="Subtitle"
              title={`Size ${size}`}
            />
          ))}
          <SettingsGroup.Header
            size="compact"
            spacing="compact"
            subtitle="Subtitle"
            title="Compact spacing"
          />
          <SettingsGroup.Header
            size="compact"
            spacing="compact"
            title="Compact spacing, no subtitle"
          />
        </div>
      </Frame>
      <Frame
        label="Subtitle placement, wrap, alignment, gap"
        testId="group-subtitle"
      >
        <div className="flex flex-col gap-2">
          <SettingsGroup.Header
            actions={
              <Button color="outline" size="toolbar">
                Action
              </Button>
            }
            subtitle="Subtitle below the whole header, spanning the full width of the group"
            subtitlePlacement="below-header"
            title="Below header"
          />
          <SettingsGroup.Header
            subtitle="Subtitle that wraps normally instead of balancing across the lines of the header"
            subtitleWrap="wrap"
            title="Wrap"
          />
          <SettingsGroup.Header
            actions={
              <Button color="outline" size="toolbar">
                End
              </Button>
            }
            actionsAlignment="end"
            subtitle="Actions aligned to the end"
            title="Actions end"
            titleGap="none"
          />
        </div>
      </Frame>
    </div>
  </Section>
);

const DensityExamples = () => {
  const content = (
    <SettingsGroup>
      <SettingsGroup.Header subtitle="Subtitle" title="Group" />
      <SettingsGroup.Content>
        <SettingsCard variant="form">
          <SettingsRow
            control={<Toggle />}
            description="Description"
            label="Row"
            variant="nested"
          />
          <SettingsRow
            control={<Toggle />}
            label="Stacked row"
            variant="stacked"
          />
        </SettingsCard>
        <SettingsCard>
          <SettingsRow control={<Toggle />} label="Default card row" />
        </SettingsCard>
      </SettingsGroup.Content>
    </SettingsGroup>
  );

  return (
    <Section
      description="A group/settings ancestor with data-density switches the cards, rows and headers. Form density is set directly on a form, as the source does; compact and default come from the page layout."
      id="density"
      title="Density"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Frame label="default" testId="density-default">
          <div className="group/settings" data-density="default">
            {content}
          </div>
        </Frame>
        <Frame label="compact" testId="density-compact">
          <div className="group/settings" data-density="compact">
            {content}
          </div>
        </Frame>
        <Frame label="form" testId="density-form">
          <form className="group/settings" data-density="form">
            {content}
          </form>
        </Frame>
      </div>
    </Section>
  );
};

const DEEP_LINK_ROWS = Array.from({ length: 16 }, (_, index) => index + 1);

const PageSection = ({ id }: { id: string }) => (
  <SettingsGroup id={`${id}-group`}>
    <SettingsGroup.Header title="Preferences" />
    <SettingsGroup.Content>
      <SettingsCard>
        {DEEP_LINK_ROWS.map((number) => (
          <SettingsRow
            control={<Toggle />}
            id={`${id}-row-${number}`}
            key={number}
            label={`Example setting ${number}`}
          />
        ))}
      </SettingsCard>
    </SettingsGroup.Content>
  </SettingsGroup>
);

const PageExamples = () => {
  const [resetKey, setResetKey] = useState(0);

  const [target, setTarget] = useState<{
    id?: string;
    key: number;
    text?: string;
  }>({ key: 0 });

  const [compact, setCompact] = useState(false);

  return (
    <Section
      description="The page layout scrolls its content, resets the scroll when the key changes, scrolls a target id or text to the centre (text also flashes the row for 450ms, or holds it still with reduced motion), and shows a toolbar, sticky controls and a footer."
      id="page"
      title="Page layout"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          color="outline"
          onClick={() => {
            setResetKey((key) => key + 1);
          }}
        >
          Reset scroll
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setTarget((current) => ({
              key: current.key + 1,
              text: "Example setting 12",
            }));
          }}
        >
          Find text &quot;Example setting 12&quot;
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setTarget((current) => ({
              id: "page-row-3",
              key: current.key + 1,
            }));
          }}
        >
          Find id page-row-3
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setCompact((value) => !value);
          }}
        >
          Density: {compact ? "compact" : "default"}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Frame
          label="Page with toolbar, sticky controls and footer"
          testId="page-full"
        >
          <div className="h-[28rem] overflow-hidden rounded-lg border">
            <SettingsNavigationTarget
              navigationKey={target.key}
              targetId={target.id}
              targetText={target.text}
            >
              <SettingsContentLayout
                action={<Button color="outline">Header action</Button>}
                backSlot={<Button color="ghost">Back</Button>}
                density={compact ? "compact" : "default"}
                footer={
                  <>
                    <Button color="outline">Cancel</Button>
                    <Button>Save</Button>
                  </>
                }
                scrollResetKey={resetKey}
                stickyControls={<div className="text-sm">Sticky controls</div>}
                subtitle="A subtitle that balances across lines"
                title="Settings"
                toolbarActions={<Button color="outline">Toolbar</Button>}
              >
                <PageSection id="page" />
              </SettingsContentLayout>
            </SettingsNavigationTarget>
          </div>
        </Frame>
        <div className="flex flex-col gap-4">
          <Frame label="Embedded, default width" testId="page-embedded">
            <SettingsContentLayout
              backSlot={<Button color="ghost">Back</Button>}
              density="default"
              embedded
              subtitle="Embedded pages use the narrower width"
              title="Embedded"
            >
              <SettingsGroup>
                <SettingsGroup.Header title="Group" />
                <SettingsCard>
                  <SettingsRow label="Embedded row" />
                </SettingsCard>
              </SettingsGroup>
            </SettingsContentLayout>
          </Frame>
          <Frame
            label="Embedded compact, full width"
            testId="page-embedded-compact"
          >
            <SettingsContentLayout
              density="compact"
              embedded
              fullWidth
              title="Compact full width"
            >
              <SettingsGroup>
                <SettingsGroup.Header title="Group" />
                <SettingsCard>
                  <SettingsRow label="Compact row" />
                </SettingsCard>
              </SettingsGroup>
            </SettingsContentLayout>
          </Frame>
        </div>
      </div>
    </Section>
  );
};

const FrameNavigation = ({
  onSelect,
}: {
  onSelect: (page: string) => void;
}) => {
  const requestNavigation = useContext(SettingsNavigationRequestContext);

  return (
    <nav
      aria-label="Settings"
      className="flex w-32 shrink-0 flex-col border-r p-4"
    >
      {["General", "Settings"].map((page) => (
        <Button
          color="ghost"
          key={page}
          onClick={() => {
            if (requestNavigation) {
              requestNavigation(() => {
                onSelect(page);
              });
            } else {
              onSelect(page);
            }
          }}
        >
          {page}
        </Button>
      ))}
    </nav>
  );
};

const SlateFrameExamples = () => {
  const [workspace, setWorkspace] = useState("/settings");
  const [tab, setTab] = useState("General");
  const [newTab, setNewTab] = useState<string | null>(null);

  const [launcher, setLauncher] = useState<
    "direct" | "empty" | "loading" | "ready"
  >("ready");

  const [panelOpen, setPanelOpen] = useState(true);
  const [compact, setCompact] = useState(false);
  const [page, setPage] = useState("Settings");
  const [sticky, setSticky] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);

  return (
    <Section id="slate-frame" title="Page layout">
      <div className="flex gap-2">
        <Button
          color="outline"
          onClick={() => {
            setWorkspace("/settings");
          }}
        >
          Settings
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setWorkspace("/gallery");
          }}
        >
          Gallery
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setCompact(!compact);
          }}
        >
          Density: {compact ? "compact" : "default"}
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setPanelOpen(!panelOpen);
          }}
        >
          {panelOpen ? "Close" : "Settings"}
        </Button>
        {(["ready", "loading", "empty", "direct"] as const).map((mode) => (
          <Button
            key={mode}
            color="outline"
            aria-pressed={launcher === mode}
            onClick={() => {
              setLauncher(mode);
            }}
          >
            {
              {
                direct: "New tab",
                empty: "No tabs are available for this chat",
                loading: "Loading tabs…",
                ready: "Browser",
              }[mode]
            }
          </Button>
        ))}
        <Button
          color="outline"
          aria-pressed={sticky}
          onClick={() => {
            setSticky(!sticky);
          }}
        >
          Sticky controls
        </Button>
        <Button
          color="outline"
          aria-pressed={fullWidth}
          onClick={() => {
            setFullWidth(!fullWidth);
          }}
        >
          Full width
        </Button>
      </div>
      <div
        className="h-[28rem] overflow-hidden rounded-lg border"
        data-testid="settings-slate-frame"
      >
        <SettingsPageFrame
          requestNavigation={(navigate) => {
            navigate();
          }}
          sidebar={<FrameNavigation onSelect={setPage} />}
          titlebarLeftInset={80}
          workspaceKey={workspace}
          rightPanel={{
            activeTab: tab,
            launcher: {
              actions:
                launcher === "ready" || launcher === "direct"
                  ? ["Browser", "Terminal"].map((label) => ({
                      id: label,
                      label,
                      onSelect: () => {
                        setNewTab(label);
                        setTab(label);
                      },
                    }))
                  : [],
              emptyMessage: "No tabs are available for this chat",
              loading: launcher === "loading",
              loadingMessage: "Loading tabs…",
              suggested:
                launcher === "ready" || launcher === "direct"
                  ? [
                      {
                        id: "Files",
                        label: "Files",
                        onSelect: () => {
                          setNewTab("Files");
                          setTab("Files");
                        },
                      },
                    ]
                  : [],
              suggestedLabel: "Suggested",
            },
            launcherMode: launcher === "direct" ? "direct" : "menu",
            newTabLabel: "New tab",
            onActivate: setTab,
            onClose: () => {
              setNewTab(null);
              setTab("General");
            },
            onNewTab: () => {
              setNewTab("New tab");
              setTab("New tab");
            },
            onOpenChange: setPanelOpen,
            open: panelOpen,
            tabListLabel: "Settings",
            tabs: [
              "General",
              "Settings",
              ...(newTab === null ? [] : [newTab]),
            ].map((name) => ({
              closable: name === newTab,
              content: <div className="p-4">{name}</div>,
              id: name,
              title: name,
            })),
          }}
        >
          <SettingsNavigationTarget slateLayout>
            <SettingsContentLayout
              action={<Button color="outline">Header action</Button>}
              asset={<Globe aria-hidden="true" className="size-6" />}
              density={compact ? "compact" : "default"}
              fullWidth={fullWidth}
              stickyControls={
                sticky ? (
                  <div className="text-sm">Sticky controls</div>
                ) : undefined
              }
              subtitle="A subtitle that balances across lines"
              title={page}
            >
              <PageSection id="slate" />
            </SettingsContentLayout>
          </SettingsNavigationTarget>
        </SettingsPageFrame>
      </div>
    </Section>
  );
};

const PreferenceExamples = () => {
  const [value, setValue] = useState<Choice | null>("a");
  const [log, setLog] = useState("No change yet.");

  const change = (next: Choice | null) => {
    setValue(next);
    setLog(`onChange(${next === null ? "null" : `"${next}"`})`);
  };

  return (
    <Section
      description="The preference row shows the selected label, the default entry for no value, Unavailable for a value that is not an option, a loading status, and a disabled trigger."
      id="preference"
      title="Preference row"
    >
      <p aria-live="polite" className="text-sm" data-testid="preference-log">
        {log}
      </p>
      <Frame label="Select a value or the default" testId="preference-rows">
        <SettingsCard>
          <PreferenceRow
            description="Pick a value, or Use default"
            label="Selected"
            onChange={change}
            options={choices}
            value={value}
          />
          <PreferenceRow
            label="Value not among the options"
            onChange={change}
            options={choices}
            value="gone"
          />
          <PreferenceRow
            isLoading
            label="Loading"
            onChange={change}
            options={choices}
            value="a"
          />
          <PreferenceRow
            disabled
            label="Disabled"
            onChange={change}
            options={choices}
            value="b"
          />
        </SettingsCard>
      </Frame>
    </Section>
  );
};

const DetailExamples = () => (
  <Section
    description="The detail row is one column in a narrow container and two columns from 24rem. The label can stay hidden until then."
    id="detail"
    title="Detail property rows"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <Frame label="Narrow container (14rem)" testId="detail-narrow">
        <dl className="@container m-0 w-56">
          <DetailPropertyRow
            icon={<Globe aria-hidden="true" className="size-4" />}
            label="Created"
          >
            Today
          </DetailPropertyRow>
          <DetailPropertyRow hideLabelWhenNarrow label="Hidden label">
            Value
          </DetailPropertyRow>
          <DetailPropertyRow align="start" label="Start aligned">
            Value that is long enough to wrap in the narrow container
          </DetailPropertyRow>
        </dl>
      </Frame>
      <Frame
        label="Wide container (28rem), relaxed spacing"
        testId="detail-wide"
      >
        <dl className="@container m-0 w-[28rem] max-w-full">
          <DetailPropertyRow label="Created" spacing="relaxed">
            Today
          </DetailPropertyRow>
          <DetailPropertyRow
            hideLabelWhenNarrow
            label="Hidden label"
            spacing="relaxed"
          >
            Value
          </DetailPropertyRow>
          <DetailPropertyRow
            align="start"
            label="Start aligned"
            spacing="relaxed"
          >
            Value that is long enough to wrap onto a second line in the wide
            container too
          </DetailPropertyRow>
        </dl>
      </Frame>
    </div>
  </Section>
);

const PluginExamples = () => {
  const [log, setLog] = useState("Nothing pressed yet.");

  return (
    <Section
      description="The plugin row shows a logo tile (a dark-theme logo, a broken URL and no URL fall back to the plugin icon), actions before the trailing chevron, and a disabled state."
      id="plugin"
      title="Plugin rows"
    >
      <p aria-live="polite" className="text-sm" data-testid="plugin-log">
        {log}
      </p>
      <Frame label="Logo, fallback, actions, disabled" testId="plugin-rows">
        <SettingsCard>
          <SettingsRows variant="interactive">
            <PluginSettingsRow
              description="Light logo and a dark logo"
              label="With logos"
              logoDarkUrl={DARK_LOGO}
              logoUrl={LIGHT_LOGO}
              onClick={() => {
                setLog("With logos pressed");
              }}
            />
            <PluginSettingsRow
              actions={
                <Button
                  color="outline"
                  onClick={() => {
                    setLog("Row action pressed");
                  }}
                  size="toolbar"
                >
                  Action
                </Button>
              }
              description="Actions sit before the chevron"
              label="With actions"
              logoUrl={LIGHT_LOGO}
              onClick={() => {
                setLog("With actions pressed");
              }}
            />
            <PluginSettingsRow
              description="No logo URL"
              label="Fallback icon"
              onClick={() => {
                setLog("Fallback pressed");
              }}
            />
            <PluginSettingsRow
              description="The image fails to load"
              label="Broken logo URL"
              logoUrl="/missing-settings-logo.png"
              onClick={() => {
                setLog("Broken pressed");
              }}
            />
            <PluginSettingsRow
              description="knownAppId resolves the static registry icon"
              label="Known app"
              knownAppId=" Connector GitHub MCP Server "
              logoUrl="/missing-registry-priority.png"
              onClick={() => {
                setLog("Known app pressed");
              }}
            />
            <PluginSettingsRow
              description="A source-style /images/ URL maps to the packaged app icon"
              label="Packaged app icon"
              logoUrl="/images/ecosystem/apps/flight_search/icon.png"
              onClick={() => {
                setLog("Packaged pressed");
              }}
            />
            <PluginSettingsRow
              description="The wallet registry icon"
              label="Wallet"
              knownAppId="connector-wallet-mcp-server"
              onClick={() => {
                setLog("Wallet pressed");
              }}
            />
            <PluginSettingsRow
              description="The iconUrl registry image"
              label="Writing style"
              knownAppId="connector-write-like-me"
              onClick={() => {
                setLog("Writing style pressed");
              }}
            />
            <PluginSettingsRow
              actions={
                <Button color="outline" size="toolbar">
                  Hidden
                </Button>
              }
              description="Disabled rows drop their actions"
              disabled
              label="Disabled"
              logoUrl={LIGHT_LOGO}
            />
          </SettingsRows>
        </SettingsCard>
      </Frame>
    </Section>
  );
};

const RtlExample = () => (
  <Section
    description="Rows, headers and the plugin row mirrored in a right to left container."
    id="rtl"
    title="Right to left"
  >
    <div dir="rtl">
      <Frame label="rtl" testId="rtl-frame">
        <SettingsGroup>
          <SettingsGroup.Header
            actions={
              <Button color="outline" size="toolbar">
                إضافة
              </Button>
            }
            subtitle="عنوان فرعي"
            title="عام"
          />
          <SettingsGroup.Content>
            <SettingsCard>
              <SettingsRow
                control={<Toggle defaultChecked />}
                description="وصف الصف"
                label="الإشعارات"
              />
              <SettingsRow
                control={<Button color="outline">إجراء</Button>}
                label="صف ثانٍ"
                variant="nested"
              />
              <PluginSettingsRow
                description="وصف"
                label="إضافة"
                logoUrl={LIGHT_LOGO}
                onClick={() => {
                  /* Shown for appearance only. */
                }}
              />
            </SettingsCard>
          </SettingsGroup.Content>
          <SettingsGroup.Footer>تذييل</SettingsGroup.Footer>
        </SettingsGroup>
      </Frame>
    </div>
  </Section>
);

const PanelContent = () => (
  <SettingsGroup>
    <SettingsGroup.Header subtitle="Subtitle" title="Group" />
    <SettingsGroup.Content>
      <SettingsCard>
        <SettingsRow
          control={<Toggle defaultChecked />}
          description="Description"
          label="Default row"
        />
        <SettingsRow
          control={<Toggle />}
          label="Recommendation"
          variant="recommendation"
        />
      </SettingsCard>
      <SettingsCard variant="muted">
        <SettingsRow label="Muted card" />
      </SettingsCard>
      <SettingsCard variant="form">
        <SettingsRow label="Form card" />
      </SettingsCard>
      <SettingsCard variant="recommendation">
        <SettingsRow label="Recommendation card" />
      </SettingsCard>
      <SettingsCard decoration="daybreak">
        <SettingsRow label="Daybreak card" />
      </SettingsCard>
      <SettingsCard>
        <SettingsRows variant="interactive">
          <PluginSettingsRow
            description="The logo follows the scope"
            label="Plugin"
            logoDarkUrl={DARK_LOGO}
            logoUrl={LIGHT_LOGO}
            onClick={() => {
              /* Shown for appearance only. */
            }}
          />
        </SettingsRows>
      </SettingsCard>
    </SettingsGroup.Content>
  </SettingsGroup>
);

const AppearancePanel = ({
  id,
  nested,
  scope,
}: {
  id: string;
  nested?: Scope;
  scope: Scope;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className={`${scope} flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 text-foreground`}
    data-testid={id}
  >
    <h3 className="text-sm font-semibold" id={`${id}-heading`}>
      {scopeTitle(scope)}
      {nested === undefined ? "" : `, with a ${nested} panel inside`}
    </h3>
    <PanelContent />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <PanelContent />
      </section>
    )}
  </section>
);

const AppearanceExamples = () => (
  <Section
    description="Each panel sets its own theme scope, so the appearance control above does not change them. The two lower panels nest the opposite theme inside, and the nested parts follow the nearest scope."
    id="appearance"
    title="Light and dark"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <AppearancePanel id="appearance-light" scope="light" />
      <AppearancePanel id="appearance-dark" scope="dark" />
      <AppearancePanel id="appearance-dark-light" nested="light" scope="dark" />
      <AppearancePanel id="appearance-light-dark" nested="dark" scope="light" />
    </div>
  </Section>
);

const SettingsGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Settings</h1>
      <AppearanceControl id="settings-appearance" />
    </header>
    <RowExamples />
    <InteractiveRowExamples />
    <CardExamples />
    <GroupExamples />
    <DensityExamples />
    <PageExamples />
    <SlateFrameExamples />
    <PreferenceExamples />
    <DetailExamples />
    <PluginExamples />
    <RtlExample />
    <AppearanceExamples />
  </main>
);

export { SettingsGalleryExample };
