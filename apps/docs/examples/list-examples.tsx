"use client";

/* oxlint-disable eslint/complexity, eslint/max-lines-per-function, shadcn/no-restyle, shadcn/no-arbitrary-values -- The gallery draws one example per list option and measured frames around them. */

import { AppLink } from "composerkit/components/list/app-link";
import type {
  AppLinkServices,
  LinkOpenRequest,
} from "composerkit/components/list/app-link";
import { ListViewport } from "composerkit/components/list/list-viewport";
import {
  MarqueeText,
  MarqueeZoomProvider,
} from "composerkit/components/list/marquee-text";
import { ResourceCitation } from "composerkit/components/list/resource-citation";
import { ResourceRow, SubagentRow } from "composerkit/components/list/rows";
import {
  SelectableListLoading,
  SelectableListRow,
  SelectableListRowGroup,
  SelectableListRowGroupItem,
} from "composerkit/components/list/selectable-row";
import {
  SelectionList,
  SelectionListRow,
} from "composerkit/components/list/selection-list";
import { SubagentAvatar } from "composerkit/components/list/subagent-avatar";
import { ThumbnailRail } from "composerkit/components/list/thumbnail-rail";
import { Button } from "composerkit/components/ui/button";
import {
  DividedRows,
  DynamicIsleList,
  ExpandableList,
  ListCard,
  ListChannelButton,
  ListIconButton,
  ListItem,
  ListItemActionLink,
  ListItemActions,
  ListItemAvatarButton,
  ListItemAvatarGroup,
  ListItemButton,
  ListItemChevron,
  ListItemGroup,
  ListItemLabel,
  ListItemLeading,
  ListItemLink,
  ListItemMeta,
  ListItemTrigger,
  ListPanel,
  ListSectionActions,
  ListSectionIconButton,
} from "composerkit/components/ui/list";
import type {
  ListLeadingVariant,
  ListTone,
} from "composerkit/components/ui/list";
import { SettingsCard } from "composerkit/components/ui/settings";
import { ToastProvider } from "composerkit/components/ui/toast";
import { TooltipProvider } from "composerkit/components/ui/tooltip";
import {
  Check,
  File,
  FileText,
  Folder,
  Link2,
  MoreHorizontal,
  Plus,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

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
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
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

// The example data of the requirement record: nine items and their meta text.
const SAMPLE_ITEMS = [
  { id: "item-1", label: "List item 1", meta: "Done" },
  { id: "item-2", label: "List item 2", meta: "Pending" },
  { id: "item-3", label: "List item 3", meta: "Pending" },
  { id: "item-4", label: "List item 4", meta: "Done" },
  { id: "item-5", label: "List item 5", meta: "Pending" },
  { id: "item-6", label: "List item 6", meta: "Pending" },
  { id: "item-7", label: "List item 7", meta: "Done" },
  { id: "item-8", label: "List item 8", meta: "Pending" },
  { id: "item-9", label: "List item 9", meta: "Pending" },
] as const;

const GLYPH = <FileText className="size-full" />;

const TONES = [
  "default",
  "muted",
  "tertiary",
  "critical",
  "conversation-summary",
] as const satisfies readonly ListTone[];

const LEADING = [
  "glyph",
  "custom",
  "status",
  "preview",
  "thumbnail",
  "intrinsic",
] as const satisfies readonly ListLeadingVariant[];

/* ------------------------------------------------------------------ */
/* Items                                                                */
/* ------------------------------------------------------------------ */

const ItemExamples = () => {
  const [log, setLog] = useState("Nothing pressed yet");

  return (
    <Section
      description="Item (div), ItemButton, ItemLink and ItemTrigger with every tone, interaction, disabled, busy, unread and multiline state."
      id="items"
      title="Summary items"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="Item tones (div rows)" testId="items-tones">
          <ListItemGroup>
            {TONES.map((tone) => (
              <ListItem key={tone} tone={tone}>
                <ListItemLeading>{GLYPH}</ListItemLeading>
                <ListItemLabel>{tone}</ListItemLabel>
                <ListItemMeta>Meta</ListItemMeta>
              </ListItem>
            ))}
            <ListItem disabled>
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>Disabled item</ListItemLabel>
            </ListItem>
            <ListItem multiline>
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel truncate={false}>
                A multiline item aligns its leading slot with the first line and
                lets this label wrap onto more than one line.
              </ListItemLabel>
            </ListItem>
          </ListItemGroup>
        </Frame>
        <Frame label="ItemButton states" testId="items-buttons">
          <ListItemGroup>
            <ListItemButton
              onClick={() => {
                setLog("Background item pressed");
              }}
            >
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>Background interaction</ListItemLabel>
            </ListItemButton>
            <ListItemButton
              interaction="foreground"
              onClick={() => {
                setLog("Foreground item pressed");
              }}
              tone="muted"
            >
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>Foreground interaction</ListItemLabel>
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setLog("Unread item pressed");
              }}
              unread
            >
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>Unread updates</ListItemLabel>
            </ListItemButton>
            <ListItemButton aria-busy disabled tone="critical">
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>Busy keeps its color</ListItemLabel>
            </ListItemButton>
            <ListItemButton disabled>
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>Disabled button</ListItemLabel>
            </ListItemButton>
            <ListItemLink
              onClick={() => {
                setLog("Link pressed");
              }}
              to="#items-link"
            >
              <ListItemLeading>
                <Link2 className="size-full" />
              </ListItemLeading>
              <ListItemLabel>ItemLink to a hash</ListItemLabel>
            </ListItemLink>
          </ListItemGroup>
          <p className="px-2 pt-2 text-xs" data-testid="items-log">
            {log}
          </p>
        </Frame>
        <Frame label="Trigger with actions" testId="items-actions">
          <ListItemGroup>
            <ListItem interactive>
              <ListItemTrigger
                onClick={() => {
                  setLog("Trigger pressed");
                }}
              >
                <ListItemLeading>
                  <Folder className="size-full" />
                </ListItemLeading>
                <ListItemLabel>Row with actions on hover</ListItemLabel>
              </ListItemTrigger>
              <ListItemActions align="section-actions" visibility="interaction">
                <ListIconButton
                  label="More"
                  onClick={() => {
                    setLog("More pressed (row not pressed)");
                  }}
                >
                  <MoreHorizontal />
                </ListIconButton>
              </ListItemActions>
            </ListItem>
            <ListItem>
              <ListItemLeading>
                <Star className="size-full" />
              </ListItemLeading>
              <ListItemLabel>Section header actions</ListItemLabel>
              <ListSectionActions>
                <ListSectionIconButton label="Add">
                  <Plus />
                </ListSectionIconButton>
                <ListItemActionLink href="#items-action-link" label="Open link">
                  <Link2 />
                </ListItemActionLink>
              </ListSectionActions>
            </ListItem>
            <ListItem>
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>Meta variants</ListItemLabel>
              <ListItemMeta tone="critical">Critical</ListItemMeta>
              <ListItemMeta tone="default">Default</ListItemMeta>
              <ListItemMeta variant="section-status">
                <Check className="size-3.5" />
              </ListItemMeta>
              <ListItemChevron />
            </ListItem>
            <ListItem>
              <ListItemAvatarButton aria-label="Open profile">
                <Sparkles className="size-4" />
              </ListItemAvatarButton>
              <ListItemAvatarGroup>
                <Star />
                <Star />
              </ListItemAvatarGroup>
              <ListItemLabel description="A description under the label">
                Avatars and description
              </ListItemLabel>
            </ListItem>
          </ListItemGroup>
        </Frame>
        <Frame label="Leading visuals" testId="items-leading">
          <ListItemGroup>
            {LEADING.map((variant) => (
              <ListItem key={variant}>
                <ListItemLeading variant={variant}>{GLYPH}</ListItemLeading>
                <ListItemLabel>{variant}</ListItemLabel>
                <ListItemMeta variant="thumbnail">
                  <File className="size-4" />
                </ListItemMeta>
              </ListItem>
            ))}
            <ListItem>
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>
                A long label that does not fit scrolls on hover as a marquee
                text when the pointer rests on the row
              </ListItemLabel>
            </ListItem>
          </ListItemGroup>
        </Frame>
        <Frame label="ChannelButton" testId="items-channel">
          <ListItemGroup>
            <ListChannelButton icon={GLYPH}>Default mode</ListChannelButton>
            <ListChannelButton icon={GLYPH} mode="content">
              Content mode
            </ListChannelButton>
            <ListChannelButton icon={GLYPH} loading>
              Loading
            </ListChannelButton>
            <ListChannelButton icon={GLYPH} selectable>
              Selectable text
            </ListChannelButton>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <ListChannelButton icon={<Plus />} mode="shortcut">
                Shortcut
              </ListChannelButton>
              <ListChannelButton icon={<Settings />} iconOnly mode="shortcut">
                Settings
              </ListChannelButton>
            </div>
          </ListItemGroup>
        </Frame>
        <Frame label="Card and dynamic isle scopes" testId="items-scopes">
          <div className="flex flex-col gap-3">
            <ListCard>
              <ListItemGroup>
                <ListItem interactive>
                  <ListItemTrigger>
                    <ListItemLeading>{GLYPH}</ListItemLeading>
                    <ListItemLabel>Card item with divider</ListItemLabel>
                  </ListItemTrigger>
                </ListItem>
                <ListItemButton>
                  <ListItemLeading>{GLYPH}</ListItemLeading>
                  <ListItemLabel>Card button with chevron</ListItemLabel>
                </ListItemButton>
              </ListItemGroup>
            </ListCard>
            <ListPanel density="comfortable">
              <ListItemGroup density="comfortable">
                <ListItemButton>
                  <ListItemLeading>{GLYPH}</ListItemLeading>
                  <ListItemLabel>Comfortable density</ListItemLabel>
                </ListItemButton>
              </ListItemGroup>
            </ListPanel>
            <ListPanel variant="dynamic-isle">
              <ListItemGroup>
                <ListItemButton>
                  <ListItemLeading variant="custom">{GLYPH}</ListItemLeading>
                  <ListItemLabel>Dynamic isle row</ListItemLabel>
                  <ListItemMeta variant="section-status">
                    <Check className="size-3.5" />
                  </ListItemMeta>
                </ListItemButton>
              </ListItemGroup>
            </ListPanel>
          </div>
        </Frame>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Expandable list                                                      */
/* ------------------------------------------------------------------ */

interface OrderedItem {
  id: string;
  label: string;
  position: "end" | "start";
}

const PreservedOrderExample = () => {
  const [items, setItems] = useState<readonly OrderedItem[]>(
    SAMPLE_ITEMS.slice(0, 5).map((item) => ({ ...item, position: "end" }))
  );

  const [counter, setCounter] = useState(1);
  const [visibleLabels, setVisibleLabels] = useState("");
  const [analyticsLog, setAnalyticsLog] = useState("No toggle events");

  const onVisibleItemsChange = useCallback(
    (visible: readonly OrderedItem[]) => {
      setVisibleLabels(visible.map((item) => item.label).join(", "));
    },
    []
  );

  const add = (position: "end" | "start") => {
    setItems((current) => {
      const next = {
        id: `added-${counter}`,
        label: `Added ${counter} (${position})`,
        position,
      };

      return position === "start" ? [next, ...current] : [...current, next];
    });
    setCounter((count) => count + 1);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          onClick={() => {
            add("start");
          }}
          size="toolbar"
        >
          Add at start
        </Button>
        <Button
          onClick={() => {
            add("end");
          }}
          size="toolbar"
        >
          Add at end
        </Button>
      </div>
      <ExpandableList
        getKey={(item) => item.id}
        getNewItemPosition={(item) => item.position}
        items={items}
        onAnalyticsEvent={(control) => {
          setAnalyticsLog(`${control} before change: ${visibleLabels}`);
        }}
        onVisibleItemsChange={onVisibleItemsChange}
        preserveExpandedOrder
        visibleItemLimit={3}
      >
        {(item) => (
          <ListItem>
            <ListItemLabel>{item.label}</ListItemLabel>
          </ListItem>
        )}
      </ExpandableList>
      <p className="text-xs" data-testid="expandable-order-visible">
        Visible: {visibleLabels}
      </p>
      <p className="text-xs" data-testid="expandable-order-analytics">
        {analyticsLog}
      </p>
    </div>
  );
};

const ExpandableExamples = () => {
  const [loaded, setLoaded] = useState(4);
  const [busyEvent, setBusyEvent] = useState("No toggle events");
  const loadedItems = SAMPLE_ITEMS.slice(0, Math.min(loaded, 9));

  return (
    <Section
      description="The first six items show; the toggle reveals more. Summary, card and dynamic isle presentations, a labelled list with list roles, an empty list, and a loader that pages more items."
      id="expandable"
      title="Expandable list"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="summary (default)" testId="expandable-summary">
          <ExpandableList
            getKey={(item) => item.id}
            items={SAMPLE_ITEMS}
            visibleItemIncrement={2}
          >
            {(item) => (
              <ListItem>
                <ListItemLeading>{GLYPH}</ListItemLeading>
                <ListItemLabel>{item.label}</ListItemLabel>
                <ListItemMeta>{item.meta}</ListItemMeta>
              </ListItem>
            )}
          </ExpandableList>
        </Frame>
        <Frame label="plain presentation" testId="expandable-plain">
          <ExpandableList
            getKey={(item) => item.id}
            items={SAMPLE_ITEMS}
            presentation="plain"
          >
            {(item) => (
              <ListItem>
                <ListItemLabel>{item.label}</ListItemLabel>
              </ListItem>
            )}
          </ExpandableList>
        </Frame>
        <Frame label="plain while loading" testId="expandable-plain-busy">
          <ExpandableList
            getKey={(item) => item.id}
            isLoadingMore
            items={SAMPLE_ITEMS}
            onAnalyticsEvent={setBusyEvent}
            presentation="plain"
          >
            {(item) => (
              <ListItem>
                <ListItemLabel>{item.label}</ListItemLabel>
              </ListItem>
            )}
          </ExpandableList>
          <p className="text-xs" data-testid="expandable-plain-busy-event">
            {busyEvent}
          </p>
        </Frame>
        <Frame label="card presentation" testId="expandable-card">
          <ListCard>
            <ExpandableList
              getKey={(item) => item.id}
              items={SAMPLE_ITEMS}
              presentation="card"
            >
              {(item) => (
                <ListItem>
                  <ListItemLeading>{GLYPH}</ListItemLeading>
                  <ListItemLabel>{item.label}</ListItemLabel>
                </ListItem>
              )}
            </ExpandableList>
          </ListCard>
        </Frame>
        <Frame label="dynamic isle list" testId="expandable-isle">
          <ListPanel variant="dynamic-isle">
            <DynamicIsleList getKey={(item) => item.id} items={SAMPLE_ITEMS}>
              {(item) => (
                <ListItem>
                  <ListItemLeading variant="custom">{GLYPH}</ListItemLeading>
                  <ListItemLabel>{item.label}</ListItemLabel>
                </ListItem>
              )}
            </DynamicIsleList>
          </ListPanel>
        </Frame>
        <Frame label="listAriaLabel adds list roles" testId="expandable-roles">
          <ExpandableList
            getKey={(item) => item.id}
            items={SAMPLE_ITEMS.slice(0, 3)}
            listAriaLabel="Sample items"
          >
            {(item) => (
              <ListItem>
                <ListItemLabel>{item.label}</ListItemLabel>
              </ListItem>
            )}
          </ExpandableList>
        </Frame>
        <Frame
          label="isLoadingMore disables the toggle"
          testId="expandable-busy"
        >
          <ExpandableList
            getKey={(item) => item.id}
            isLoadingMore
            items={SAMPLE_ITEMS}
          >
            {(item) => (
              <ListItem>
                <ListItemLabel>{item.label}</ListItemLabel>
              </ListItem>
            )}
          </ExpandableList>
        </Frame>
        <Frame label="onLoadMore pages in more items" testId="expandable-load">
          <ExpandableList
            getKey={(item) => item.id}
            items={loadedItems}
            onLoadMore={() => {
              setLoaded((count) => Math.min(count + 1, SAMPLE_ITEMS.length));
            }}
            visibleItemIncrement={1}
            visibleItemLimit={3}
          >
            {(item) => (
              <ListItem>
                <ListItemLabel>{item.label}</ListItemLabel>
              </ListItem>
            )}
          </ExpandableList>
        </Frame>
        <Frame label="empty list renders `empty`" testId="expandable-empty">
          <ExpandableList
            empty={<p className="p-2 text-sm">No items</p>}
            getKey={(item: string) => item}
            items={[]}
          >
            {(item) => <ListItem>{item}</ListItem>}
          </ExpandableList>
        </Frame>
        <Frame
          label="preserveExpandedOrder keeps the order seen when expanded"
          testId="expandable-order"
        >
          <PreservedOrderExample />
        </Frame>
        <Frame
          label="renderPagination and renderFooter"
          testId="expandable-custom"
        >
          <ExpandableList
            getKey={(item) => item.id}
            items={SAMPLE_ITEMS}
            renderFooter={(visible) => (
              <p className="px-2 text-xs">{visible.length} visible</p>
            )}
            renderPagination={({ isExpanded, onToggle }) => (
              <Button onClick={onToggle} size="toolbar">
                {isExpanded ? "Collapse" : "Expand"}
              </Button>
            )}
          >
            {(item) => (
              <ListItem>
                <ListItemLabel>{item.label}</ListItemLabel>
              </ListItem>
            )}
          </ExpandableList>
        </Frame>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Selection list                                                       */
/* ------------------------------------------------------------------ */

const SelectionExamples = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>({
    a: true,
    b: false,
    c: false,
    d: true,
  });

  const toggle = (key: string) => (value: boolean) => {
    setChecked((current) => ({ ...current, [key]: value }));
  };

  return (
    <Section
      description="A 240px scrolling list box. Clicking a row's text toggles its checkbox; the control can sit on either side and rows can align to the center."
      id="selection"
      title="Selection list"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="Left control, start alignment" testId="selection-left">
          <SelectionList ariaLabel="Options">
            <SelectionListRow
              checkboxId="selection-a"
              checked={checked.a}
              description="Subtitle text"
              label="Option A"
              onCheckedChange={toggle("a")}
              trailingContent="Trailing"
            />
            <SelectionListRow
              checkboxId="selection-b"
              checked={checked.b}
              label="Option B"
              onCheckedChange={toggle("b")}
            />
            <SelectionListRow
              checkboxId="selection-c"
              checked={checked.c}
              disabled
              label="Disabled option"
              onCheckedChange={toggle("c")}
            />
          </SelectionList>
        </Frame>
        <Frame label="Right control, centered" testId="selection-right">
          <SelectionList ariaLabel="More options">
            <SelectionListRow
              alignment="center"
              checkboxId="selection-d"
              checked={checked.d}
              controlPlacement="right"
              description="Subtitle text"
              label="Option D"
              onCheckedChange={toggle("d")}
              trailingControl={<Star className="size-4" />}
            />
            <SelectionListRow
              control={<Check className="size-4" />}
              label="Custom control"
              leadingContent={<File className="size-4" />}
            />
          </SelectionList>
        </Frame>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Rail                                                                 */
/* ------------------------------------------------------------------ */

const RailExamples = () => {
  const [page, setPage] = useState(2);
  const [docked, setDocked] = useState(false);
  const [tall, setTall] = useState(true);

  return (
    <Section
      description="Hover the strip at the start edge, focus it with Tab or press it to open the page list. The dock button keeps it open. The current page has aria-current."
      id="rail"
      title="Page thumbnail rail"
    >
      <Button
        aria-pressed={!tall}
        color="secondary"
        data-testid="rail-resize"
        onClick={() => {
          setTall((value) => !value);
        }}
        type="button"
      >
        list-thumbnail-motion
      </Button>
      <div
        className={`relative overflow-hidden rounded-xl border bg-background ${tall ? "h-96" : "h-56"}`}
        data-testid="rail-viewer"
      >
        <div
          className={`absolute inset-0 flex items-center justify-center text-sm text-muted-foreground ${docked ? "ps-[166px]" : "ps-6"}`}
        >
          Page {page} of 8
        </div>
        <ThumbnailRail
          animateHeight
          currentPage={page}
          isDocked={docked}
          onDockedChange={setDocked}
          onPageSelect={setPage}
          renderThumbnail={(number) => (
            <span className="flex h-16 items-center justify-center text-xs text-black">
              Page {number}
            </span>
          )}
          totalPages={8}
        />
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Simple rows                                                          */
/* ------------------------------------------------------------------ */

const SimpleRowExamples = () => {
  const [opened, setOpened] = useState("Nothing opened yet");

  return (
    <Section
      description="The name and status row and the resource row, whose card button covers the card while the actions stay clickable."
      id="simple-rows"
      title="Name and resource rows"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="SubagentRow" testId="rows-subagent">
          <div className="flex flex-col gap-2">
            <SubagentRow
              avatar={<SubagentAvatar className="size-6" seed="agent-one" />}
              name="Agent name"
              status="Running"
            />
            <SubagentRow
              avatar={
                <SubagentAvatar
                  className="size-6"
                  palette="chat"
                  seed="agent-two"
                />
              }
              name="A subagent name that is far too long to fit in one line of the row"
              status="Done"
            />
          </div>
        </Frame>
        <Frame label="ResourceRow" testId="rows-resource">
          <div className="flex flex-col gap-2">
            <ResourceRow
              actions={
                <Button
                  aria-label="Share"
                  color="ghostActive"
                  onClick={() => {
                    setOpened("Share pressed (card not opened)");
                  }}
                  radius="large"
                  size="composer"
                  uniform
                >
                  <Link2 className="size-4" />
                </Button>
              }
              icon={<FileText className="size-5" />}
              onOpen={() => {
                setOpened("Resource opened");
              }}
              subtitle="Page"
              title="Resource title"
            />
            <ResourceRow
              busy
              disabled
              icon={<Folder className="size-5" />}
              subtitle="Space"
              title="Busy resource"
            />
            <p className="text-xs" data-testid="rows-log">
              {opened}
            </p>
          </div>
        </Frame>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* Divided rows                                                         */
/* ------------------------------------------------------------------ */

const DividedExamples = () => (
  <Section
    description="Rows with hairlines between them: inset (default), full width (dividerInset none) and interactive, where the line between two rows hides while either holds a hovered or focused control."
    id="divided"
    title="Divided rows"
  >
    <div className="grid gap-3 md:grid-cols-3">
      {(
        [
          ["default", "Inset divider", "default"],
          ["none", "Border divider", "default"],
          ["interactive", "Interactive", "interactive"],
        ] as const
      ).map(([inset, label, variant]) => (
        <Frame key={label} label={label} testId={`divided-${variant}-${inset}`}>
          <DividedRows
            dividerInset={inset === "none" ? "none" : "default"}
            variant={variant}
          >
            {["First row", "Second row", "Third row"].map((row) => (
              <div className="flex" key={row}>
                <Button className="flex-1 justify-start" color="ghost">
                  {row}
                </Button>
              </div>
            ))}
          </DividedRows>
        </Frame>
      ))}
    </div>
  </Section>
);

/* ------------------------------------------------------------------ */
/* Selectable rows                                                      */
/* ------------------------------------------------------------------ */

const SelectableExamples = () => {
  const [selected, setSelected] = useState("two");
  const [pressed, setPressed] = useState("Nothing pressed yet");

  const select = (key: string) => () => {
    setSelected(key);
    setPressed(`${key} selected`);
  };

  return (
    <Section
      description="Every density and surface, selected, muted and disabled rows, a link row, a row with its own controls, grouped rows and the loading skeletons."
      id="selectable"
      title="Selectable rows"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="Default density, plain" testId="selectable-plain">
          <div className="flex flex-col">
            <SelectableListRow
              icon={<FileText className="size-4" />}
              isSelected={selected === "one"}
              onSelect={select("one")}
              rightText="Today"
              secondLine="Second line text"
              secondLineRightText="2 files"
              secondaryTitle="in project"
              title="Row one"
              titleAdornment={<Star className="size-3.5" />}
            />
            <SelectableListRow
              isSelected={selected === "two"}
              onSelect={select("two")}
              secondLine="Selected rows keep their fill"
              title="Row two"
            />
            <SelectableListRow
              isSelected={selected === "three"}
              onSelect={select("three")}
              secondLine="Adjacent selected rows square their corners"
              title="Row three"
            />
            <SelectableListRow
              isDisabled
              onSelect={select("disabled")}
              secondLine="Disabled"
              title="Disabled row"
            />
            <SelectableListRow
              onSelect={select("muted")}
              title="Muted tone"
              tone="muted"
            />
            <SelectableListRow
              onSelect={select("wrap")}
              title="A wrapping title that is long enough to wrap onto a second line in this narrow frame"
              titleWrap
            />
          </div>
          <p className="px-2 pt-2 text-xs" data-testid="selectable-log">
            {pressed}
          </p>
        </Frame>
        <Frame
          label="Compact, row and profile densities"
          testId="selectable-density"
        >
          <div className="flex flex-col">
            <SelectableListRow
              density="compact"
              onSelect={select("compact")}
              rightText="Right"
              rightTextPosition="center"
              secondLine="Compact second line"
              title="Compact"
            />
            <SelectableListRow
              density="row"
              icon={<File className="size-4" />}
              onSelect={select("row")}
              title="Row density"
            />
            <SelectableListRow
              density="profile"
              icon={<Sparkles className="size-4" />}
              onSelect={select("profile")}
              secondLine="Profile rows have a taller minimum"
              title="Profile"
            />
          </div>
        </Frame>
        <Frame label="Surfaces" testId="selectable-surfaces">
          <div className="flex flex-col gap-2">
            <SelectableListRow
              onSelect={select("raised")}
              surface="raised"
              title="Raised surface"
            />
            <SelectableListRow
              isSelected
              onSelect={select("raised-selected")}
              surface="raised"
              title="Raised selected"
            />
            <SelectableListRow
              onSelect={select("flush")}
              surface="flush"
              title="Flush surface"
            />
            <SelectableListRow
              ariaLabel="Embedded row"
              hasInteractiveContent
              onSelect={select("embedded")}
              surface="embedded"
              title="Embedded with an overlay button"
            />
          </div>
        </Frame>
        <Frame
          label="Link row and interactive content"
          testId="selectable-links"
        >
          <div className="flex flex-col">
            <SelectableListRow
              ariaCurrent="page"
              ariaLabel="Link row"
              title="Link row (to a hash)"
              to="#selectable-link"
            />
            <SelectableListRow
              ariaLabel="Select row with its own control"
              hasInteractiveContent
              onSelect={select("interactive")}
              title="Row with its own control"
            >
              <div className="flex items-center justify-between">
                <span>Row with its own control</span>
                <Button
                  className="pointer-events-auto"
                  onClick={() => {
                    setPressed("Inner button pressed");
                  }}
                  size="toolbar"
                >
                  Inner
                </Button>
              </div>
            </SelectableListRow>
          </div>
        </Frame>
        <Frame label="Group wrappers" testId="selectable-group">
          <SelectableListRowGroup>
            <SelectableListRowGroupItem>
              <p
                className="px-3 py-3 text-sm"
                data-ck-selectable-list-row-group-header
              >
                Group item without a row draws its own divider
              </p>
            </SelectableListRowGroupItem>
            <SelectableListRowGroupItem>
              <SelectableListRow
                onSelect={select("grouped-one")}
                title="Grouped row (plain surface, its own divider)"
              />
            </SelectableListRowGroupItem>
            <SelectableListRowGroupItem>
              <SelectableListRow
                onSelect={select("grouped-two")}
                surface="flush"
                title="Last grouped row"
              />
            </SelectableListRowGroupItem>
          </SelectableListRowGroup>
        </Frame>
        <Frame label="Adjacent selected rows" testId="selectable-adjacent">
          <div className="flex flex-col">
            <SelectableListRow isSelected title="Selected row above" />
            <SelectableListRow isSelected title="Selected row below" />
            <SelectableListRow title="Unselected row" />
          </div>
        </Frame>
        <Frame label="Loading rows" testId="selectable-loading">
          <div className="flex flex-col gap-3">
            <SelectableListLoading
              loadingLabel="Loading default rows"
              rowCount={2}
            />
            <SelectableListLoading
              density="compact"
              loadingLabel="Loading compact rows"
              rowCount={2}
            />
            <SelectableListLoading
              density="row"
              icon={<File className="size-4" />}
              loadingLabel="Loading row density"
              rowCount={2}
            />
            <SelectableListLoading
              density="sidebar"
              loadingLabel="Loading sidebar rows"
              rowCount={2}
            />
          </div>
        </Frame>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ */
/* RTL and appearance                                                   */
/* ------------------------------------------------------------------ */

const RtlExample = () => (
  <Section
    description="The same lists in a right-to-left container."
    id="rtl"
    title="Right to left"
  >
    <div className="grid gap-3 md:grid-cols-2" dir="rtl" lang="ar">
      <Frame label="Items" testId="rtl-items">
        <ListCard>
          <ListItemGroup>
            <ListItemButton>
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel description="وصف قصير">عنصر القائمة</ListItemLabel>
              <ListItemMeta>تم</ListItemMeta>
            </ListItemButton>
            <ListItemButton>
              <ListItemLeading>{GLYPH}</ListItemLeading>
              <ListItemLabel>
                عنصر آخر في القائمة بعنوان طويل جدا لا يتسع في السطر
              </ListItemLabel>
            </ListItemButton>
          </ListItemGroup>
        </ListCard>
      </Frame>
      <Frame label="Selection list" testId="rtl-selection">
        <SelectionList ariaLabel="خيارات">
          <SelectionListRow
            checkboxId="rtl-a"
            checked
            description="نص فرعي"
            label="الخيار أ"
            onCheckedChange={() => {
              /* Layout only. */
            }}
            trailingContent="جانبي"
          />
        </SelectionList>
      </Frame>
      <Frame label="Selectable rows" testId="rtl-selectable">
        <SelectableListRow
          isSelected
          rightText="اليوم"
          secondLine="سطر ثان"
          title="صف قابل للتحديد"
        />
        <SelectableListRow density="row" title="صف" />
      </Frame>
      <Frame
        className="relative h-72"
        label="Thumbnail rail (panel slides in from the end side)"
        testId="rtl-rail"
      >
        <ThumbnailRail
          currentPage={1}
          isDocked
          onDockedChange={() => {
            /* Layout only. */
          }}
          onPageSelect={() => {
            /* Layout only. */
          }}
          renderThumbnail={(number) => (
            <span className="flex h-10 items-center justify-center text-xs text-black">
              {number}
            </span>
          )}
          side="right"
          totalPages={3}
        />
      </Frame>
    </div>
  </Section>
);

const PanelContent = ({ prefix }: { prefix: string }) => (
  <div className="flex flex-col gap-3">
    <Frame label="Items" testId={`${prefix}-items`}>
      <ListItemGroup>
        <ListItemButton>
          <ListItemLeading>{GLYPH}</ListItemLeading>
          <ListItemLabel>Button item</ListItemLabel>
          <ListItemMeta>Meta</ListItemMeta>
        </ListItemButton>
        <ListItem tone="critical">
          <ListItemLeading>{GLYPH}</ListItemLeading>
          <ListItemLabel>Critical item</ListItemLabel>
        </ListItem>
        <ListItem disabled>
          <ListItemLeading>{GLYPH}</ListItemLeading>
          <ListItemLabel>Disabled item</ListItemLabel>
        </ListItem>
      </ListItemGroup>
    </Frame>
    <Frame label="Selection and selectable rows" testId={`${prefix}-rows`}>
      <SelectionList ariaLabel="Options" className="h-24">
        <SelectionListRow
          checkboxId={`${prefix}-check`}
          checked
          label="Checked option"
          onCheckedChange={() => {
            /* Appearance only. */
          }}
        />
        <SelectionListRow
          checkboxId={`${prefix}-unchecked`}
          checked={false}
          label="Unchecked option"
          onCheckedChange={() => {
            /* Appearance only. */
          }}
        />
      </SelectionList>
      <SelectableListRow isSelected title="Selected row" />
      <SelectableListRow surface="raised" title="Raised row" />
    </Frame>
  </div>
);

// A theme scope sets color-scheme, so every theme-dependent value inside
// follows the nearest scope.
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
    <PanelContent prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <PanelContent prefix={`${id}-nested`} />
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

/* ------------------------------------------------------------------ */
/* Viewport, surfaces, avatars and zoom                                 */
/* ------------------------------------------------------------------ */

const SURFACE_VARIANTS = [
  "default",
  "metered",
  "secondary",
  "muted",
  "form",
  "outlined",
  "flat",
  "input",
  "recommendation",
  "outlinedLarge",
  "rows",
] as const;

const SurfaceRows = () => (
  <>
    <div className="px-4 py-2 text-sm">Row one</div>
    <div className="px-4 py-2 text-sm">Row two</div>
    <div className="px-4 py-2 text-sm">Row three</div>
  </>
);

const SurfaceExamples = () => (
  <Section id="surface-variants" title="list-surface-variants">
    <div className="grid gap-3 md:grid-cols-3">
      {SURFACE_VARIANTS.map((variant) => (
        <Frame key={variant} label={variant} testId={`surface-${variant}`}>
          <SettingsCard variant={variant}>
            <SurfaceRows />
          </SettingsCard>
        </Frame>
      ))}
      <Frame label="dividers=false" testId="surface-no-dividers">
        <SettingsCard dividers={false}>
          <SurfaceRows />
        </SettingsCard>
      </Frame>
      <Frame label="decoration=daybreak" testId="surface-daybreak">
        <SettingsCard decoration="daybreak">
          <SurfaceRows />
        </SettingsCard>
      </Frame>
      <Frame label="contentOverflow=visible" testId="surface-overflow">
        <SettingsCard contentOverflow="visible">
          <SurfaceRows />
        </SettingsCard>
      </Frame>
    </div>
  </Section>
);

const ViewportExamples = () => (
  <Section id="scroll-viewport" title="list-scroll-viewport">
    <Frame label="ListViewport" testId="scroll-viewport">
      <ListViewport tabIndex={0}>
        {Array.from({ length: 20 }, (_, index) => (
          <div className="py-1 text-sm" key={`viewport-row-${index + 1}`}>
            List item {index + 1}
          </div>
        ))}
      </ListViewport>
    </Frame>
  </Section>
);

const AVATAR_SEEDS = ["agent-1", "agent-2", "agent-3", "agent-4", "agent-5"];

const AvatarExamples = () => (
  <Section id="subagent-avatar" title="list-subagent-avatar">
    <div className="grid gap-3 md:grid-cols-2">
      <Frame label="palette code" testId="avatar-code">
        <div className="flex gap-2">
          {AVATAR_SEEDS.map((seed) => (
            <SubagentAvatar className="size-6" key={seed} seed={seed} />
          ))}
        </div>
      </Frame>
      <Frame label="palette chat" testId="avatar-chat">
        <div className="flex gap-2">
          {AVATAR_SEEDS.map((seed) => (
            <SubagentAvatar
              className="size-6"
              key={seed}
              palette="chat"
              seed={seed}
            />
          ))}
        </div>
      </Frame>
    </div>
  </Section>
);

const ZoomExamples = () => (
  <Section id="marquee-zoom" title="list-marquee-zoom">
    <div className="grid gap-3 md:grid-cols-2">
      {[1, 2].map((zoom) => (
        <Frame
          key={zoom}
          label={`zoom ${zoom}`}
          testId={`marquee-zoom-${zoom}`}
        >
          <div className={zoom === 1 ? "[zoom:1]" : "[zoom:2]"}>
            <MarqueeZoomProvider value={zoom}>
              <div className="group w-40">
                <MarqueeText animateOnGroupHover>
                  A label that is much wider than its viewport
                </MarqueeText>
              </div>
            </MarqueeZoomProvider>
          </div>
        </Frame>
      ))}
    </div>
  </Section>
);

/* ------------------------------------------------------------------ */
/* App link and cited resource                                          */
/* ------------------------------------------------------------------ */

const LinkExamples = () => {
  const [log, setLog] = useState("No link opened yet");
  const [interceptLog, setInterceptLog] = useState("No intercept call yet");

  const services: AppLinkServices = {
    canDownload: true,
    canOpenNewWindow: true,
    intercept: (link) => {
      setInterceptLog(JSON.stringify(link));

      return link.href.endsWith("/intercepted");
    },
    onDownloadLink: (href) => {
      setLog(`download ${href}`);
    },
    onOpenLink: (request: LinkOpenRequest) => {
      setLog(JSON.stringify(request));
    },
  };

  return (
    <Section id="item-link-open-behavior" title="list-item-link-open-behavior">
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="href" testId="link-plain">
          <AppLink
            appearance="primary"
            href="https://example.com/plain"
            services={services}
          >
            https://example.com/plain
          </AppLink>
        </Frame>
        <Frame
          label="isBrowserEnabled, initiator link_click"
          testId="link-browser"
        >
          <AppLink
            appearance="primary"
            href="https://example.com/browser"
            initiator="link_click"
            isBrowserEnabled
            services={services}
          >
            https://example.com/browser
          </AppLink>
        </Frame>
        <Frame label="intercept handles the click" testId="link-intercepted">
          <AppLink
            appearance="primary"
            href="https://example.com/intercepted"
            hostId="demo-machine"
            initiator="link_click"
            services={services}
          >
            https://example.com/intercepted
          </AppLink>
        </Frame>
        <Frame label="mailto:" testId="link-mailto">
          <AppLink
            appearance="primary"
            href="mailto:name@example.com"
            services={services}
          >
            mailto:name@example.com
          </AppLink>
        </Frame>
        <Frame label="requiresConfirmation" testId="link-confirm">
          <AppLink
            appearance="primary"
            href="https://example.com/confirm"
            initiator="link_click"
            originHostId="source-machine"
            requiresConfirmation
            services={services}
          >
            https://example.com/confirm
          </AppLink>
        </Frame>
        <Frame
          label="requiresConfirmation, showCopyLinkInConfirmation"
          testId="link-confirm-copy"
        >
          <AppLink
            appearance="primary"
            href="https://example.com/confirm-copy"
            requiresConfirmation
            services={services}
            showCopyLinkInConfirmation
          >
            https://example.com/confirm-copy
          </AppLink>
        </Frame>
        <Frame label="showHoverActions" testId="link-hover">
          <AppLink
            appearance="primary"
            href="https://example.com/hover"
            services={services}
            showHoverActions
          >
            https://example.com/hover
          </AppLink>
        </Frame>
        <Frame label="tooltipContent" testId="link-tooltip">
          <AppLink
            appearance="primary"
            href="https://example.com/tooltip"
            services={services}
            tooltipContent="https://example.com/tooltip"
          >
            https://example.com/tooltip
          </AppLink>
        </Frame>
        <Frame label="appearance source" testId="link-source">
          <AppLink
            appearance="source"
            href="https://example.com/source"
            services={services}
          >
            https://example.com/source
          </AppLink>
        </Frame>
      </div>
      <p className="text-xs break-all" data-testid="link-log">
        {log}
      </p>
      <p className="text-xs break-all" data-testid="link-intercept-log">
        {interceptLog}
      </p>
    </Section>
  );
};

const failedOpen = async () => await Promise.resolve(false);

const CitationExamples = () => {
  const [log, setLog] = useState("Nothing yet");

  const shared = {
    onCopyLink: () => {
      setLog("Copy link");
    },
    onShare: () => {
      setLog("Share");
    },
  };

  const opened = async (blockId: string | null) => {
    setLog(`Open ${blockId ?? "page"}`);

    return await Promise.resolve(true);
  };

  return (
    <Section id="resource-row-app-state" title="list-resource-row-app-state">
      <div className="grid gap-3 md:grid-cols-2">
        <Frame label="page" testId="citation-page">
          <ResourceCitation
            {...shared}
            canShare
            icon={<FileText className="size-5" />}
            onOpen={opened}
            pageId="page-1"
            reference={{ blockId: "block-1", id: "page-1", kind: "page" }}
            title="Page title"
          />
        </Frame>
        <Frame label="presentation" testId="citation-slide">
          <ResourceCitation
            {...shared}
            canShare
            documentType="presentation"
            icon={<FileText className="size-5" />}
            onOpen={opened}
            pageId="page-2"
            reference={{ id: "page-2", kind: "page" }}
            title="Page title"
          />
        </Frame>
        <Frame label="workbook" testId="citation-sheet">
          <ResourceCitation
            {...shared}
            canShare
            documentType="workbook"
            icon={<FileText className="size-5" />}
            onOpen={opened}
            pageId="page-3"
            reference={{ id: "page-3", kind: "page" }}
            title="Page title"
          />
        </Frame>
        <Frame label="space" testId="citation-space">
          <ResourceCitation
            {...shared}
            canShare
            icon={<Folder className="size-5" />}
            onOpen={opened}
            pageId="page-4"
            reference={{ id: "space-1", kind: "space" }}
            title="Space title"
          />
        </Frame>
        <Frame label="page, resolvedSpace" testId="citation-page-space-root">
          <ResourceCitation
            {...shared}
            canShare
            icon={<Folder className="size-5" />}
            onOpen={opened}
            pageId="page-8"
            reference={{ id: "page-8", kind: "page" }}
            resolvedSpace={{ spaceId: "space-3" }}
            title="Space root title"
          />
        </Frame>
        <Frame label="title undefined" testId="citation-loading">
          <ResourceCitation
            {...shared}
            canShare={false}
            icon={<FileText className="size-5" />}
            onOpen={opened}
            pageId={null}
            reference={{ id: "page-5", kind: "page" }}
            title={undefined}
          />
        </Frame>
        <Frame label="title null, page" testId="citation-unavailable-page">
          <ResourceCitation
            {...shared}
            canShare={false}
            icon={<FileText className="size-5" />}
            onOpen={opened}
            pageId={null}
            reference={{ id: "page-6", kind: "page" }}
            title={null}
          />
        </Frame>
        <Frame label="title null, space" testId="citation-unavailable-space">
          <ResourceCitation
            {...shared}
            canShare={false}
            icon={<Folder className="size-5" />}
            onOpen={opened}
            pageId={null}
            reference={{ id: "space-2", kind: "space" }}
            title={null}
          />
        </Frame>
        <Frame label="onOpen resolves false" testId="citation-open-error">
          <ResourceCitation
            {...shared}
            canShare
            icon={<FileText className="size-5" />}
            onOpen={failedOpen}
            pageId="page-7"
            reference={{ id: "page-7", kind: "page" }}
            title="Page title"
          />
        </Frame>
      </div>
      <p className="text-xs" data-testid="citation-log">
        {log}
      </p>
    </Section>
  );
};

const ListGalleryExample = () => (
  <TooltipProvider>
    <ToastProvider>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
        <header className="flex flex-wrap items-center gap-4">
          <Link className="text-sm underline" href="/gallery">
            Back to gallery
          </Link>
          <h1 className="text-title-lg font-semibold">List</h1>
          <AppearanceControl id="list-appearance" />
        </header>
        <ItemExamples />
        <ExpandableExamples />
        <SelectionExamples />
        <RailExamples />
        <SimpleRowExamples />
        <DividedExamples />
        <SelectableExamples />
        <RtlExample />
        <AppearanceExamples />
        <SurfaceExamples />
        <ViewportExamples />
        <AvatarExamples />
        <ZoomExamples />
        <LinkExamples />
        <CitationExamples />
      </main>
    </ToastProvider>
  </TooltipProvider>
);

export { ListGalleryExample };
