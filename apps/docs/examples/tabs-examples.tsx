"use client";

import { Button } from "@workspace/react/components/ui/button";
import {
  NavigationTab,
  NavigationTabs,
  NavigationTabsList,
  NavigationTabsPanel,
} from "@workspace/react/components/ui/navigation-tabs";
import {
  AppShellTab,
  AppShellTabList,
  NewTabButton,
  Tabs,
} from "@workspace/react/components/ui/tabs";
import type {
  TabItem,
  TabsActivationMode,
  TabsVariant,
} from "@workspace/react/components/ui/tabs";
import {
  FileText,
  Folder,
  Image as ImageIcon,
  Plus,
  Search,
} from "lucide-react";
import { useRef, useState } from "react";
import type { CSSProperties, FocusEvent, PointerEvent, ReactNode } from "react";

type Theme = "light" | "dark";

const variants = [
  "text",
  "segmented",
  "toolbar",
  "settings",
  "search",
  "inset",
  "page",
  "pill",
  "choice",
  "filter",
  "editor",
  "browse",
  "directory",
  "segmentedPill",
  "profile",
  "icon",
  "underline",
] as const satisfies readonly TabsVariant[];

const names = {
  activity: "Activity",
  overview: "Overview",
  settings: "Settings",
} as const;

const baseTabs = (
  prefix: string,
  onClose?: (key: string) => void
): TabItem[] => [
  {
    icon: <Folder aria-hidden className="size-full" />,
    key: "overview",
    name: names.overview,
    panelId: `${prefix}-overview`,
  },
  {
    icon: <FileText aria-hidden className="size-full" />,
    key: "activity",
    name: names.activity,
    panelId: `${prefix}-activity`,
  },
  {
    ariaLabel: onClose ? "Settings page" : undefined,
    closeLabel: onClose ? "Close Settings" : undefined,
    icon: <ImageIcon aria-hidden className="size-full" />,
    key: "settings",
    name: names.settings,
    onClose: onClose
      ? () => {
          onClose("settings");
        }
      : undefined,
    panelId: `${prefix}-settings`,
  },
];

interface ExampleProps {
  activationMode?: TabsActivationMode;
  animateSelection?: boolean;
  className?: string;
  closable?: boolean;
  fill?: boolean;
  id: string;
  label: string;
  onEvent: (message: string) => void;
  scrollable?: boolean;
  variant: TabsVariant;
}

const TabsExample = ({
  activationMode,
  animateSelection,
  className,
  closable = false,
  fill,
  id,
  label,
  onEvent,
  scrollable,
  variant,
}: ExampleProps) => {
  const [selected, setSelected] = useState("overview");
  const [closed, setClosed] = useState<readonly string[]>([]);

  const handleClose = (key: string) => {
    setClosed((list) => [...list, key]);
    onEvent(`${id} closed ${key}`);
  };

  const tabs = baseTabs(id, closable ? handleClose : undefined).filter(
    (tab) => !closed.includes(tab.key)
  );

  const current = tabs.find((tab) => tab.key === selected) ?? tabs[0];

  return (
    <div
      className="flex max-w-full min-w-0 flex-col gap-2 overflow-x-auto"
      data-testid={`example-${id}`}
    >
      <p className="m-0 text-sm text-text-muted">
        {label}. Selected:{" "}
        <span data-testid={`${id}-selected`}>{selected}</span>
      </p>
      <Tabs
        activationMode={activationMode}
        animateSelection={animateSelection}
        ariaLabel={label}
        className={className}
        fill={fill}
        onSelect={(key) => {
          setSelected(key);
          onEvent(`${id} selected ${key}`);
        }}
        onTabClick={(key) => {
          onEvent(`${id} clicked ${key}`);
        }}
        onTabHover={(key) => {
          onEvent(`${id} hovered ${key}`);
        }}
        scrollable={scrollable}
        selectedKey={selected}
        tabs={tabs}
        variant={variant}
      />
      {current?.panelId === undefined ? null : (
        <div
          aria-labelledby={`${current.panelId}-tab`}
          className="rounded-lg border border-border p-3 text-sm"
          id={current.panelId}
          role="tabpanel"
        >
          {current.name} panel
        </div>
      )}
    </div>
  );
};

const wideName = "Overview with a longer name";

// The sliding indicator follows a selection change, an
// interrupted change and a width change of the selected tab.
const SlidingExample = ({
  onEvent,
}: {
  onEvent: (message: string) => void;
}) => {
  const [selected, setSelected] = useState("overview");
  const [wide, setWide] = useState(false);

  const tabs = baseTabs("sliding").map((tab) =>
    tab.key === "overview" && wide ? { ...tab, name: wideName } : tab
  );

  return (
    <div
      className="flex max-w-full min-w-0 flex-col gap-2 overflow-x-auto"
      data-testid="example-sliding"
    >
      <p className="m-0 text-sm text-text-muted">
        Sliding selection. Selected:{" "}
        <span data-testid="sliding-selected">{selected}</span>
      </p>
      <Tabs
        activationMode="automatic"
        animateSelection
        ariaLabel="Sliding selection"
        onSelect={(key) => {
          setSelected(key);
          onEvent(`sliding selected ${key}`);
        }}
        selectedKey={selected}
        tabs={tabs}
        variant="segmentedPill"
      />
      <div>
        <Button
          color="outlineGhost"
          data-testid="sliding-width"
          onClick={() => {
            setWide((value) => !value);
          }}
          size="compact"
        >
          {wide ? "Shorten the first tab" : "Lengthen the first tab"}
        </Button>
      </div>
    </div>
  );
};

const DefaultsExample = ({
  onEvent,
}: {
  onEvent: (message: string) => void;
}) => {
  const [selected, setSelected] = useState("overview");
  const [listTag, setListTag] = useState("");

  return (
    <div className="flex flex-col gap-2" data-testid="example-defaults">
      <p className="m-0 text-sm text-text-muted">
        Only the required props, plus className and tabListRef. Selected:{" "}
        <span data-testid="defaults-selected">{selected}</span>. List element:{" "}
        <span data-testid="defaults-ref">{listTag}</span>
      </p>
      <Tabs
        className="max-w-sm"
        onSelect={(key) => {
          setSelected(key);
          onEvent(`defaults selected ${key}`);
        }}
        selectedKey={selected}
        tabListRef={(element) => {
          setListTag(
            element ? `${element.tagName.toLowerCase()} ${element.role}` : ""
          );
        }}
        tabs={baseTabs("defaults")}
      />
    </div>
  );
};

const scrollTabs = Array.from({ length: 12 }, (_, index) => ({
  key: `item-${index + 1}`,
  name: `Example item ${index + 1}`,
}));

const ScrollableExample = ({
  onEvent,
}: {
  onEvent: (message: string) => void;
}) => {
  const [selected, setSelected] = useState("item-1");

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm text-text-muted">
        Scrollable list in a narrow box. Selected:{" "}
        <span data-testid="scrollable-selected">{selected}</span>
      </p>
      <div className="w-64 max-w-full" data-testid="scrollable-box">
        <Tabs
          ariaLabel="Scrollable example"
          onSelect={(key) => {
            setSelected(key);
            onEvent(`scrollable selected ${key}`);
          }}
          scrollable
          selectedKey={selected}
          tabs={scrollTabs}
          variant="page"
        />
      </div>
    </div>
  );
};

interface DragTab {
  id: string;
  title: string;
}

const dragTabs: readonly DragTab[] = [
  { id: "alpha", title: "Alpha thread" },
  { id: "beta", title: "Beta thread" },
  { id: "gamma", title: "Gamma thread" },
];

type Activator = "container" | "tab";

const activationDistance = 6;

// A stable ref callback for `activatorRef`: it marks the wrapper the way the
// app's drag controller registers it.
const markActivator = (element: HTMLDivElement | null) => {
  if (element) {
    element.dataset.activatorRef = "set";
  }
};

// Local stand-in for the app's drag controller: it reads what the tab hands it
// (activator props, `data-ck-tab-id`, `data-ck-shell-tab-capture`) and reorders
// on pointer movement. It is demonstration code, not part of the tab.
const DragStrip = ({ onEvent }: { onEvent: (message: string) => void }) => {
  const [tabs, setTabs] = useState(dragTabs);
  const [dragging, setDragging] = useState<string | null>(null);
  const [activator, setActivator] = useState<Activator>("container");
  const [active, setActive] = useState("alpha");
  const [focusLine, setFocusLine] = useState("No focus yet");
  const stripRef = useRef<HTMLDivElement>(null);

  // The pointer sensor starts a drag after the pointer moved 6px; a press
  // that does not move stays a click.
  const startDrag = (id: string) => (start: PointerEvent<HTMLElement>) => {
    const { clientX, clientY } = start;
    let started = false;

    const move = (event: globalThis.PointerEvent) => {
      if (!started) {
        if (
          Math.hypot(event.clientX - clientX, event.clientY - clientY) <
          activationDistance
        ) {
          return;
        }

        started = true;
        setDragging(id);
        onEvent(`drag started ${id}`);
      }

      const elements = [
        ...(stripRef.current?.querySelectorAll<HTMLElement>(
          "[data-ck-tab-id]"
        ) ?? []),
      ];

      const index = elements.findIndex((element) => {
        const rect = element.getBoundingClientRect();

        return event.clientX < rect.left + rect.width / 2;
      });

      const target = index === -1 ? elements.length - 1 : index;

      setTabs((current) => {
        const from = current.findIndex((tab) => tab.id === id);

        if (from === target || from === -1) {
          return current;
        }

        const next = [...current];
        const [moved] = next.splice(from, 1);

        if (moved !== undefined) {
          next.splice(target, 0, moved);
        }

        return next;
      });
    };

    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);

      if (started) {
        setDragging(null);
        onEvent(`drag ended ${id}`);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    setFocusLine(
      `${event.target.getAttribute("aria-label") ?? event.target.tagName} :focus-visible ${String(event.target.matches(":focus-visible"))}`
    );
  };

  return (
    <div
      className="flex max-w-full min-w-0 flex-col gap-2 overflow-x-auto"
      data-testid="drag-strip-box"
    >
      <div className="flex items-center gap-2 text-sm">
        <span>Activator:</span>
        {(["container", "tab"] as const).map((value) => (
          <Button
            aria-pressed={activator === value}
            color={activator === value ? "secondary" : "outlineGhost"}
            data-testid={`activator-${value}`}
            key={value}
            onClick={() => {
              setActivator(value);
            }}
            size="compact"
          >
            {value}
          </Button>
        ))}
      </div>
      <div
        className="flex w-full max-w-xl items-center gap-1 rounded-lg border border-border p-1"
        data-testid="drag-strip"
        onFocus={handleFocus}
        ref={stripRef}
      >
        <AppShellTabList ariaLabel="Draggable threads">
          {tabs.map((tab, index) => {
            const activatorProps = {
              onPointerDown: startDrag(tab.id),
            };

            const demoStyle: CSSProperties & Record<`--${string}`, number> = {
              "--tab-demo-index": index,
            };

            return (
              <AppShellTab
                activateOnClick
                activatorProps={
                  activator === "container" ? activatorProps : undefined
                }
                activatorRef={markActivator}
                className="w-36 max-w-full"
                data-sortable="true"
                id={tab.id}
                isActive={tab.id === active}
                isClosable
                isDragging={dragging === tab.id}
                key={tab.id}
                onActivate={() => {
                  setActive(tab.id);
                }}
                onClose={() => {
                  setTabs((current) =>
                    current.filter((entry) => entry.id !== tab.id)
                  );
                }}
                style={demoStyle}
                tabActivatorProps={
                  activator === "tab" ? activatorProps : undefined
                }
                title={tab.title}
                tooltip={`${tab.title} tooltip`}
              />
            );
          })}
        </AppShellTabList>
      </div>
      <p className="m-0 text-sm text-text-muted" data-testid="drag-readout">
        Order: {tabs.map((tab) => tab.id).join(", ")}. Dragging:{" "}
        {dragging ?? "none"}.
      </p>
      <p className="m-0 text-sm text-text-muted" data-testid="focus-readout">
        Focus: {focusLine}
      </p>
    </div>
  );
};

const rtlTitle = "عنوان طويل جدا لا يتسع داخل علامة التبويب هذه";

const ShellStates = ({ onEvent }: { onEvent: (message: string) => void }) => (
  <div
    className="flex max-w-full min-w-0 flex-wrap items-center gap-2 overflow-x-auto"
    data-testid="shell-spacing"
  >
    <AppShellTabList ariaLabel="Close button spacing">
      <AppShellTab
        className="w-44 max-w-full"
        id="spacing-hover"
        isClosable
        onClose={() => {
          onEvent("spacing closed hover");
        }}
        title="Close on hover"
        trailingContent={
          <span className="rounded-full bg-fill-primary-soft px-1.5 text-xs">
            7
          </span>
        }
      />
      <AppShellTab
        className="w-44 max-w-full"
        id="spacing-always"
        isActive
        isClosable
        onClose={() => {
          onEvent("spacing closed always");
        }}
        title="Close always"
        trailingContent={
          <span className="rounded-full bg-fill-primary-soft px-1.5 text-xs">
            7
          </span>
        }
      />
      <AppShellTab
        className="w-44 max-w-full"
        id="spacing-fade-short"
        isClosable
        onClose={() => {
          onEvent("spacing closed fade short");
        }}
        title="Short"
      />
      <AppShellTab
        className="w-32 max-w-full"
        id="spacing-fade"
        isClosable
        onClose={() => {
          onEvent("spacing closed fade");
        }}
        title="A title that fades on hover"
      />
    </AppShellTabList>
    <AppShellTabList ariaLabel="Right to left titles">
      <div className="flex flex-wrap gap-2" dir="rtl" lang="ar">
        <AppShellTab
          className="w-32 max-w-full"
          id="rtl-overflow"
          isClosable
          onClose={() => {
            onEvent("rtl closed overflow");
          }}
          title={rtlTitle}
        />
        <AppShellTab
          className="w-44 max-w-full"
          id="rtl-hover"
          isClosable
          onClose={() => {
            onEvent("rtl closed hover");
          }}
          title="عنوان"
        />
      </div>
    </AppShellTabList>
  </div>
);

const ShellStrip = ({ onEvent }: { onEvent: (message: string) => void }) => {
  const [tabs, setTabs] = useState([
    { id: "one", title: "Example thread" },
    { id: "two", title: "Another thread" },
    { id: "three", title: "A thread with a title that is far too long to fit" },
  ]);

  const [active, setActive] = useState("one");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [created, setCreated] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex w-full max-w-xl items-center gap-1 overflow-hidden rounded-lg border border-border p-1"
        data-testid="shell-strip"
      >
        <AppShellTabList ariaLabel="Open threads">
          {tabs.map((tab) => (
            <AppShellTab
              activateOnClick
              className={
                tab.id === "three" ? "w-40 max-w-full" : "w-36 max-w-full"
              }
              icon={<Folder aria-hidden className="size-full" />}
              id={tab.id}
              isActive={tab.id === active}
              isClosable
              key={tab.id}
              onActivate={() => {
                setActive(tab.id);
                onEvent(`shell activated ${tab.id}`);
              }}
              onBeginRename={() => {
                setRenaming(tab.id);
              }}
              onClose={() => {
                setTabs((current) =>
                  current.filter((entry) => entry.id !== tab.id)
                );
                onEvent(`shell closed ${tab.id}`);
              }}
              onTabClick={() => {
                onEvent(`shell clicked ${tab.id}`);
              }}
              rename={
                renaming === tab.id
                  ? {
                      onFinishRenaming: () => {
                        setRenaming(null);
                      },
                      onRename: (value) => {
                        setTabs((current) =>
                          current.map((entry) =>
                            entry.id === tab.id
                              ? { ...entry, title: value ?? entry.title }
                              : entry
                          )
                        );
                        onEvent(`shell renamed ${tab.id} to ${value}`);
                      },
                      renameValue: tab.title,
                    }
                  : undefined
              }
              title={tab.title}
              tooltip={tab.title}
            />
          ))}
        </AppShellTabList>
        <NewTabButton
          onClick={() => {
            const id = `new-${created}`;
            setCreated((count) => count + 1);
            setTabs((current) => [
              ...current,
              { id, title: `New thread ${created + 1}` },
            ]);
            setActive(id);
            onEvent(`shell opened ${id}`);
          }}
          title="New tab"
        >
          <Plus aria-hidden className="size-4" />
        </NewTabButton>
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="shell-states"
      >
        <AppShellTabList ariaLabel="Tab states">
          <AppShellTab
            className="w-36 max-w-full"
            icon={<Search aria-hidden className="size-full" />}
            isActive
            isClosable
            onClose={() => {
              onEvent("states closed active");
            }}
            title="Active"
          />
          <AppShellTab
            className="w-36 max-w-full"
            isClosable
            isPreview
            onClose={() => {
              onEvent("states closed preview");
            }}
            title="Preview"
          />
          <AppShellTab
            accessibleStatus="Waiting for input"
            className="w-36 max-w-full"
            isClosable
            onClose={() => {
              onEvent("states closed status");
            }}
            title="With status"
            trailingContent={
              <span className="rounded-full bg-fill-primary-soft px-1.5 text-xs">
                3
              </span>
            }
          />
          <AppShellTab
            className="w-36 max-w-full"
            disabled
            isClosable
            title="Disabled"
          />
          <AppShellTab
            className="w-36 max-w-full"
            isActive
            isClosable
            isClosing
            title="Closing"
          />
          <AppShellTab
            className="w-44 max-w-full"
            isActive
            isClosable
            onClose={() => {
              onEvent("states closed actions");
            }}
            title="With actions"
            trailingActions={
              <button
                aria-label="Pin With actions"
                className="size-5 rounded-md text-xs hover:bg-fill-primary-transparent-hover"
                onClick={() => {
                  onEvent("states pinned");
                }}
                type="button"
              >
                P
              </button>
            }
          />
          <AppShellTab className="w-36 max-w-full" isLabel title="Label" />
          <AppShellTab
            className="w-36 max-w-full"
            isPresented
            showsPresentedTabChrome
            title="Presented"
          />
          <AppShellTab
            className="w-36 max-w-full"
            icon={<Folder aria-hidden className="size-full" />}
            isSuspended
            title="Suspended"
          />
          <AppShellTab
            className="w-36 max-w-full"
            highlightedIcon={<Plus aria-hidden className="size-full" />}
            icon={<Folder aria-hidden className="size-full" />}
            isHighlighted
            title="Highlighted"
          />
          <AppShellTab
            className="w-44 max-w-full"
            isActive
            isDragging
            shortcutHint={
              <span className="shrink-0 text-xs text-text-subtle">Ctrl 1</span>
            }
            title="Dragging with shortcut"
          />
        </AppShellTabList>
      </div>
      <ShellStates onEvent={onEvent} />
      <DragStrip onEvent={onEvent} />
    </div>
  );
};

const NavigationExample = ({
  onEvent,
}: {
  onEvent: (message: string) => void;
}) => (
  <div className="flex flex-wrap gap-6">
    <NavigationTabs
      defaultValue="first"
      onValueChange={(value) => {
        onEvent(`navigation selected ${String(value)}`);
      }}
    >
      <NavigationTabsList aria-label="Horizontal example">
        <NavigationTab value="first">First</NavigationTab>
        <NavigationTab value="second">Second</NavigationTab>
        <NavigationTab disabled value="disabled">
          Unavailable
        </NavigationTab>
      </NavigationTabsList>
      <NavigationTabsPanel value="first">First panel</NavigationTabsPanel>
      <NavigationTabsPanel value="second">Second panel</NavigationTabsPanel>
    </NavigationTabs>
    <NavigationTabs
      className="flex"
      defaultValue="first"
      orientation="vertical"
    >
      <NavigationTabsList aria-label="Vertical example">
        <NavigationTab value="first">First</NavigationTab>
        <NavigationTab value="second">Second</NavigationTab>
        <NavigationTab disabled value="disabled">
          Unavailable
        </NavigationTab>
      </NavigationTabsList>
      <NavigationTabsPanel value="first">First panel</NavigationTabsPanel>
      <NavigationTabsPanel value="second">Second panel</NavigationTabsPanel>
    </NavigationTabs>
  </div>
);

const Panel = ({
  children,
  prefix,
  theme,
}: {
  children: ReactNode;
  prefix: string;
  theme: Theme;
}) => (
  <div
    className={`${theme} flex min-w-0 flex-col gap-3 overflow-x-auto rounded-2xl border bg-panel p-4 text-text`}
    data-testid={`panel-${prefix}`}
  >
    {children}
  </div>
);

const ThemePanel = ({
  onEvent,
  theme,
}: {
  onEvent: (message: string) => void;
  theme: Theme;
}) => (
  <Panel prefix={theme} theme={theme}>
    <h4 className="m-0 text-base font-medium">
      {theme === "light" ? "Light" : "Dark"} appearance
    </h4>
    <div className="flex flex-col gap-4">
      {variants.map((variant) => (
        <TabsExample
          animateSelection={variant === "segmentedPill"}
          id={`${theme}-${variant}`}
          key={variant}
          label={`${variant} variant`}
          onEvent={onEvent}
          variant={variant}
        />
      ))}
    </div>
  </Panel>
);

const NestedPanels = ({
  onEvent,
  outer,
}: {
  onEvent: (message: string) => void;
  outer: Theme;
}) => {
  const inner: Theme = outer === "dark" ? "light" : "dark";

  return (
    <Panel prefix={`nested-${outer}`} theme={outer}>
      <h4 className="m-0 text-base font-medium">
        {inner === "light" ? "Light" : "Dark"} panel inside {outer}
      </h4>
      <TabsExample
        id={`nested-${outer}-outer`}
        label={`${outer} outer segmented`}
        onEvent={onEvent}
        variant="segmented"
      />
      <Panel prefix={`nested-${outer}-inner`} theme={inner}>
        <TabsExample
          id={`nested-${outer}-inner`}
          label={`${inner} inner segmented`}
          onEvent={onEvent}
          variant="segmented"
        />
        <TabsExample
          id={`nested-${outer}-inner-inset`}
          label={`${inner} inner inset`}
          onEvent={onEvent}
          variant="inset"
        />
        <TabsExample
          id={`nested-${outer}-inner-choice`}
          label={`${inner} inner choice`}
          onEvent={onEvent}
          variant="choice"
        />
      </Panel>
    </Panel>
  );
};

const TabsGalleryExample = () => {
  const [lastEvent, setLastEvent] = useState("No event yet.");

  return (
    <section
      aria-labelledby="tabs-heading"
      className="flex flex-col gap-6 p-4"
      id="tabs"
    >
      <h2 className="text-title-md font-semibold" id="tabs-heading">
        Tabs
      </h2>
      <p className="m-0 text-sm text-muted-foreground" data-testid="last-event">
        Last event: {lastEvent}
      </p>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-base font-medium">Preferences navigation</h3>
        <p className="m-0 text-sm text-muted-foreground">
          Vertical and disabled tabs are not part of the desktop tab list. They
          stay for the preferences screen.
        </p>
        <NavigationExample onEvent={setLastEvent} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ThemePanel onEvent={setLastEvent} theme="light" />
        <ThemePanel onEvent={setLastEvent} theme="dark" />
        <NestedPanels onEvent={setLastEvent} outer="dark" />
        <NestedPanels onEvent={setLastEvent} outer="light" />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="m-0 text-base font-medium">Options</h3>
        <TabsExample
          activationMode="manual"
          id="manual"
          label="Manual activation (arrow keys only move focus)"
          onEvent={setLastEvent}
          variant="pill"
        />
        <TabsExample
          fill
          id="fill"
          label="Fill (list takes the full width)"
          onEvent={setLastEvent}
          variant="segmented"
        />
        <TabsExample
          closable
          id="closable"
          label="Close buttons"
          onEvent={setLastEvent}
          variant="underline"
        />
        <SlidingExample onEvent={setLastEvent} />
        <ScrollableExample onEvent={setLastEvent} />
        <DefaultsExample onEvent={setLastEvent} />
      </div>

      <div className="flex flex-col gap-3" dir="rtl" data-testid="rtl">
        <h3 className="m-0 text-base font-medium">Right to left</h3>
        <TabsExample
          id="rtl-segmented"
          label="Right to left segmented"
          onEvent={setLastEvent}
          variant="segmented"
        />
        <TabsExample
          id="rtl-inset"
          label="Right to left inset"
          onEvent={setLastEvent}
          variant="inset"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-base font-medium">App shell tab strip</h3>
        <ShellStrip onEvent={setLastEvent} />
      </div>
    </section>
  );
};

export { TabsGalleryExample };
