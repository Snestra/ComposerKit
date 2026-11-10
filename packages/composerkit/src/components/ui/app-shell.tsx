"use client";

/* oxlint-disable shadcn/no-arbitrary-values, shadcn/no-restyle, eslint/complexity -- Headers read host toolbar lengths and compose public prop defaults and title bar controls. */

import { Button } from "composerkit/components/ui/button";
import { MenuContextMenu } from "composerkit/components/ui/menu";
import type { MenuContextItem } from "composerkit/components/ui/menu";
import { PanelResizer } from "composerkit/components/ui/panel-resizer";
import { SplitView } from "composerkit/components/ui/split-view";
import {
  AppShellTab,
  AppShellTabList,
  NewTabButton,
} from "composerkit/components/ui/tabs";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { cn } from "composerkit/lib/utils";
import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

type PaneSide = "left" | "right";

type WorkspaceLayout = "full" | "split";

interface AppShellTabItem {
  accessibleStatus?: string;
  closable?: boolean;
  content?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  /** Tab items shown first in the tab context menu, before a separator. */
  leadingMenuItems?: readonly MenuContextItem[];
  /** Tab items shown after New tab to the right, in the same group. */
  menuItems?: readonly MenuContextItem[];
  title: string;
}

interface AppShellProps {
  activeTabId?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  chatActions?: ReactNode;
  chatTitle?: string;
  /** The conversation slot, shown in the chat pane. */
  children: ReactNode;
  className?: string;
  contentSide?: PaneSide;
  defaultActiveTabId?: string;
  defaultContentSide?: PaneSide;
  defaultLayout?: WorkspaceLayout;
  defaultRailOpen?: boolean;
  defaultRailWidth?: number;
  defaultTabsOpen?: boolean;
  id?: string;
  layout?: WorkspaceLayout;
  newTabLabel?: string;
  onActiveTabChange?: (id: string) => void;
  onBack?: () => void;
  onContentSideChange?: (side: PaneSide) => void;
  onForward?: () => void;
  onLayoutChange?: (layout: WorkspaceLayout) => void;
  onMoveTabToWindow?: (id: string) => void;
  onNewTab?: () => void;
  onNewTabToRight?: (id: string) => void;
  onRailOpenChange?: (open: boolean) => void;
  onRailWidthChange?: (width: number) => void;
  onTabClose?: (id: string) => void;
  onTabRename?: (id: string) => void;
  onTabsOpenChange?: (open: boolean) => void;
  /** The sidebar slot. */
  rail: ReactNode;
  railLabel?: string;
  railOpen?: boolean;
  railWidth?: number;
  tabListLabel?: string;
  tabs?: readonly AppShellTabItem[];
  tabsOpen?: boolean;
}

type ShellKeyAction =
  | { kind: "close"; tabId: string }
  | { kind: "new" }
  | { kind: "toggle-tabs" }
  | { focus: boolean; kind: "select"; tabId: string };

interface DragState {
  over: PaneSide | null;
  started: boolean;
  startX: number;
  startY: number;
  tabId: string;
}

const NO_TABS: readonly AppShellTabItem[] = [];
const RAIL_MIN_WIDTH = 200;
const RAIL_MAX_WIDTH = 480;
const DRAG_THRESHOLD = 6;

// The title bar controls darken to the text color on hover with no
// fill, and show the not-allowed cursor when disabled.
const titlebarButtonClassName =
  "not-disabled:hover:text-text disabled:cursor-not-allowed";

const CHAT_PANE_PERCENT = 34;
const DIGIT_KEY = /^[1-9]$/u;

const noCleanup = () => {
  // Nothing to undo when no drag is pending.
};

const useControlledValue = <T,>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
) => {
  const [internal, setInternal] = useState(defaultValue);

  const setValue = useCallback(
    (next: T) => {
      setInternal(next);
      onChange?.(next);
    },
    [onChange]
  );

  return [controlled ?? internal, setValue] as const;
};

const enabledTabs = (tabs: readonly AppShellTabItem[]) =>
  tabs.filter((tab) => tab.disabled !== true);

const isClosable = (tab: AppShellTabItem | undefined, canClose: boolean) =>
  canClose && tab !== undefined && tab.closable !== false;

const cycledTab = (
  tabs: readonly AppShellTabItem[],
  activeTabId: string,
  step: number
) => {
  const enabled = enabledTabs(tabs);
  const index = enabled.findIndex((tab) => tab.id === activeTabId);

  return enabled.at((index + step + enabled.length) % enabled.length);
};

const isRightToLeft = (element: HTMLElement) => {
  const list = element.closest('[role="tablist"]');

  return list !== null && getComputedStyle(list).direction === "rtl";
};

const selectAction = (
  tab: AppShellTabItem | undefined
): ShellKeyAction | null =>
  tab === undefined ? null : { focus: true, kind: "select", tabId: tab.id };

const tabListKeyAction = (
  event: KeyboardEvent<HTMLDivElement>,
  tabs: readonly AppShellTabItem[],
  activeTabId: string
): ShellKeyAction | null => {
  const enabled = enabledTabs(tabs);

  switch (event.key) {
    case "Home": {
      return selectAction(enabled.at(0));
    }

    case "End": {
      return selectAction(enabled.at(-1));
    }

    case "ArrowLeft":
    case "ArrowRight": {
      const forward =
        (event.key === "ArrowRight") !==
        (event.target instanceof HTMLElement && isRightToLeft(event.target));

      return selectAction(cycledTab(tabs, activeTabId, forward ? 1 : -1));
    }

    case "Delete": {
      return { kind: "close", tabId: activeTabId };
    }

    default: {
      return null;
    }
  }
};

const shortcutKeyAction = (
  event: KeyboardEvent<HTMLDivElement>,
  tabs: readonly AppShellTabItem[],
  activeTabId: string
): ShellKeyAction | null => {
  const key = event.key.toLowerCase();

  if (event.shiftKey && key === "b") {
    return { kind: "toggle-tabs" };
  }

  if (key === "t") {
    return { kind: "new" };
  }

  if (tabs.length === 0) {
    return null;
  }

  if (event.key === "Tab") {
    return selectAction(cycledTab(tabs, activeTabId, event.shiftKey ? -1 : 1));
  }

  if (key === "w") {
    return { kind: "close", tabId: activeTabId };
  }

  if (DIGIT_KEY.test(event.key)) {
    return selectAction(enabledTabs(tabs).at(Number(event.key) - 1));
  }

  return null;
};

const shellKeyAction = (
  event: KeyboardEvent<HTMLDivElement>,
  tabs: readonly AppShellTabItem[],
  activeTabId: string
) => {
  if (event.defaultPrevented || event.altKey) {
    return null;
  }

  if (event.ctrlKey || event.metaKey) {
    return shortcutKeyAction(event, tabs, activeTabId);
  }

  const onTab =
    event.target instanceof HTMLButtonElement &&
    event.target.getAttribute("role") === "tab";

  return onTab && tabs.length > 0
    ? tabListKeyAction(event, tabs, activeTabId)
    : null;
};

const focusElement = (elementId: string) => {
  document
    .querySelector<HTMLElement>(`#${CSS.escape(elementId)}`)
    ?.focus({ preventScroll: true });
};

const menuSeparator = (key: string): MenuContextItem => ({
  id: key,
  type: "separator",
});

const message = (id: string, defaultMessage: string) => ({
  defaultMessage,
  id: `appShell.tabMenu.${id}`,
});

const AppShellSplitter = ({
  currentSize,
  onResize,
}: {
  currentSize: number;
  onResize: (size: number) => void;
}) => {
  const getCurrentSize = useCallback(() => currentSize, [currentSize]);

  return (
    <PanelResizer
      currentSize={currentSize}
      edge="right"
      extendIntoToolbar="titlebar"
      getCurrentSize={getCurrentSize}
      maximumSize={RAIL_MAX_WIDTH}
      minimumSize={RAIL_MIN_WIDTH}
      onResizeEnd={onResize}
      setSize={onResize}
    />
  );
};

const ToolbarAction = ({
  icon,
  label,
  onClick,
  pressed,
  shortcut,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  shortcut?: string;
}) => (
  <TooltipHint
    content={shortcut === undefined ? label : `${label} ${shortcut}`}
    openDelay={250}
  >
    <Button
      aria-label={label}
      aria-pressed={pressed}
      color="ghost"
      onClick={onClick}
      size="toolbar"
      uniform
    >
      {icon}
    </Button>
  </TooltipHint>
);

const DropZones = ({ over }: { over: PaneSide | null }) => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 z-50"
    data-app-shell-drop-zones
    dir="ltr"
  >
    {(["left", "right"] as const).map((side) => (
      <div
        className={cn(
          "pointer-events-none absolute top-0 bottom-0 w-1/4",
          side === "left" ? "left-0" : "right-0"
        )}
        data-unified-workspace-drop-target={side}
        key={side}
      />
    ))}
    {over === null ? null : (
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 w-1/2 rounded-lg bg-text/5 ring-2 ring-ring ring-inset",
          over === "left" ? "left-0" : "right-0"
        )}
        data-app-shell-drop-preview={over}
      />
    )}
  </div>
);

const zoneAt = (element: HTMLElement | null, clientX: number) => {
  if (element === null) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const quarter = rect.width / 4;

  if (clientX <= rect.left + quarter) {
    return "left";
  }

  if (clientX >= rect.right - quarter) {
    return "right";
  }

  return null;
};

const useTabDrag = (
  workspace: React.RefObject<HTMLDivElement | null>,
  onDrop: (tabId: string, side: PaneSide) => void
) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const pending = drag !== null;
  const dropRef = useRef(onDrop);

  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    if (!pending) {
      return noCleanup;
    }

    const move = (event: PointerEvent) => {
      setDrag((current) => {
        if (current === null) {
          return current;
        }

        const started =
          current.started ||
          Math.hypot(
            event.clientX - current.startX,
            event.clientY - current.startY
          ) > DRAG_THRESHOLD;

        return {
          ...current,
          over: started ? zoneAt(workspace.current, event.clientX) : null,
          started,
        };
      });
    };

    const end = (event: PointerEvent) => {
      setDrag((current) => {
        if (current?.started === true) {
          const side = zoneAt(workspace.current, event.clientX);

          if (side !== null) {
            dropRef.current(current.tabId, side);
          }
        }

        return null;
      });
    };

    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrag(null);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("keydown", cancel, true);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("keydown", cancel, true);
    };
  }, [pending, workspace]);

  const start = (tabId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    setDrag({
      over: null,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
      tabId,
    });
  };

  return {
    dragging: drag?.started === true ? drag : null,
    start,
  };
};

const AppShell = ({
  activeTabId: activeTabIdProp,
  canGoBack = false,
  canGoForward = false,
  chatActions,
  chatTitle = "Chat",
  children,
  className,
  contentSide: contentSideProp,
  defaultActiveTabId,
  defaultContentSide = "right",
  defaultLayout = "split",
  defaultRailOpen = true,
  defaultRailWidth = 340,
  defaultTabsOpen = true,
  id: idProp,
  layout: layoutProp,
  newTabLabel = "New tab",
  onActiveTabChange,
  onBack,
  onContentSideChange,
  onForward,
  onLayoutChange,
  onMoveTabToWindow,
  onNewTab,
  onNewTabToRight,
  onRailOpenChange,
  onRailWidthChange,
  onTabClose,
  onTabRename,
  onTabsOpenChange,
  rail,
  railLabel = "Chat history",
  railOpen: railOpenProp,
  railWidth: railWidthProp,
  tabListLabel = "Chat tabs",
  tabs = NO_TABS,
  tabsOpen: tabsOpenProp,
}: AppShellProps) => {
  const generatedId = useId();
  const id = idProp ?? `app-shell-${generatedId.replaceAll(":", "")}`;
  const workspace = useRef<HTMLDivElement>(null);

  const [railOpen, setRailOpen] = useControlledValue(
    railOpenProp,
    defaultRailOpen,
    onRailOpenChange
  );

  const [railWidth, setRailWidth] = useControlledValue(
    railWidthProp,
    defaultRailWidth,
    onRailWidthChange
  );

  const [tabsOpen, setTabsOpen] = useControlledValue(
    tabsOpenProp,
    defaultTabsOpen,
    onTabsOpenChange
  );

  const [layout, setLayout] = useControlledValue(
    layoutProp,
    defaultLayout,
    onLayoutChange
  );

  const [contentSide, setContentSide] = useControlledValue(
    contentSideProp,
    defaultContentSide,
    onContentSideChange
  );

  const [selectedTabId, setSelectedTabId] = useControlledValue(
    activeTabIdProp,
    defaultActiveTabId ?? tabs.at(0)?.id ?? "",
    onActiveTabChange
  );

  const activeTab =
    tabs.find((tab) => tab.id === selectedTabId) ?? enabledTabs(tabs).at(0);

  const activeTabId = activeTab?.id ?? "";
  const canClose = onTabClose !== undefined;
  const hasTabs = tabs.length > 0;

  const selectTab = (tabId: string) => {
    if (enabledTabs(tabs).some((tab) => tab.id === tabId)) {
      setSelectedTabId(tabId);
    }
  };

  const closeTabs = (ids: readonly string[]) => {
    const closing = new Set(
      ids.filter((tabId) =>
        isClosable(
          tabs.find((tab) => tab.id === tabId),
          canClose
        )
      )
    );

    if (closing.size === 0) {
      return;
    }

    const enabled = enabledTabs(tabs);
    const index = enabled.findIndex((tab) => tab.id === activeTabId);
    const remaining = enabled.filter((tab) => !closing.has(tab.id));

    const next = closing.has(activeTabId)
      ? remaining.at(Math.min(index, remaining.length - 1))
      : undefined;

    for (const tabId of closing) {
      onTabClose?.(tabId);
    }

    if (next !== undefined) {
      setSelectedTabId(next.id);
      requestAnimationFrame(() => {
        focusElement(`${id}-tab-${next.id}`);
      });
    }
  };

  const moveTab = (tabId: string, side: PaneSide) => {
    selectTab(tabId);

    if (side !== contentSide) {
      setContentSide(side);
    }

    if (!tabsOpen) {
      setTabsOpen(true);
    }
  };

  const { dragging, start: startDrag } = useTabDrag(workspace, moveTab);

  const tabMenuItems = (tab: AppShellTabItem): MenuContextItem[] => {
    const index = tabs.findIndex((item) => item.id === tab.id);
    const right = tabs.slice(index + 1).map((item) => item.id);

    const others = tabs
      .filter((item) => item.id !== tab.id)
      .map((item) => item.id);

    // Order, grouping and enabled rules follow the menu: the tab's
    // leading items, then New tab to the right with the tab's own actions,
    // then Rename, the pane moves and the close actions. The component keeps
    // Move to new window visible and disables it without a window host.
    const leading = tab.leadingMenuItems ?? [];

    const actions: MenuContextItem[] = [
      ...(onNewTabToRight === undefined
        ? []
        : [
            {
              icon: <Plus aria-hidden="true" />,
              id: "new-tab-right",
              message: message("newTabRight", "New tab to the right"),
              onSelect: () => {
                onNewTabToRight(tab.id);
              },
            },
          ]),
      ...(tab.menuItems ?? []),
    ];

    const rename: MenuContextItem[] =
      onTabRename === undefined
        ? []
        : [
            {
              icon: <Pencil aria-hidden="true" />,
              id: "rename",
              message: message("rename", "Rename"),
              onSelect: () => {
                onTabRename(tab.id);
              },
            },
          ];

    const moves: MenuContextItem[] = [
      contentSide === "left"
        ? {
            icon: <ArrowRight aria-hidden="true" />,
            id: "workspace-tab-move-right",
            message: message("moveRight", "Move to right pane"),
            onSelect: () => {
              moveTab(tab.id, "right");
            },
          }
        : {
            icon: <ArrowLeft aria-hidden="true" />,
            id: "workspace-tab-move-left",
            message: message("moveLeft", "Move to left pane"),
            onSelect: () => {
              moveTab(tab.id, "left");
            },
          },
      {
        enabled: onMoveTabToWindow !== undefined,
        icon: <AppWindow aria-hidden="true" />,
        id: "workspace-tab-move-new-window",
        message: message("moveWindow", "Move to new window"),
        onSelect: () => {
          onMoveTabToWindow?.(tab.id);
        },
      },
    ];

    const closes: MenuContextItem[] = canClose
      ? [
          {
            enabled: isClosable(tab, canClose),
            icon: <X aria-hidden="true" />,
            id: "close-tab",
            message: message("close", "Close"),
            onSelect: () => {
              closeTabs([tab.id]);
            },
          },
          {
            enabled: others.length > 0,
            icon: <X aria-hidden="true" />,
            id: "close-other-tabs",
            message: message("closeOthers", "Close other tabs"),
            onSelect: () => {
              closeTabs(others);
            },
          },
          {
            enabled: right.length > 0,
            icon: <X aria-hidden="true" />,
            id: "close-tabs-right",
            message: message("closeRight", "Close tabs to the right"),
            onSelect: () => {
              closeTabs(right);
            },
          },
          {
            enabled: others.length > 0,
            icon: <X aria-hidden="true" />,
            id: "close-all-tabs",
            message: message("closeAll", "Close all tabs"),
            onSelect: () => {
              closeTabs(tabs.map((item) => item.id));
            },
          },
        ]
      : [];

    return [leading, actions, rename, moves, closes]
      .filter((group) => group.length > 0)
      .flatMap((group, groupIndex) =>
        groupIndex === 0
          ? group
          : [menuSeparator(`group-${groupIndex}`), ...group]
      );
  };

  const toggleTabs = () => {
    setTabsOpen(!tabsOpen);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = shellKeyAction(event, tabs, activeTabId);

    if (action === null || (action.kind === "new" && onNewTab === undefined)) {
      return;
    }

    event.preventDefault();

    if (action.kind === "new") {
      onNewTab?.();
    } else if (action.kind === "toggle-tabs") {
      if (hasTabs) {
        toggleTabs();
      }
    } else if (action.kind === "close") {
      closeTabs([action.tabId]);
    } else {
      selectTab(action.tabId);
      focusElement(`${id}-tab-${action.tabId}`);
    }
  };

  const showsChat = !hasTabs || !tabsOpen || layout === "split";
  const showsTabs = hasTabs && tabsOpen;
  const chatOnLeft = !showsTabs || contentSide === "right";
  // The start controls sit over the window's top-left corner, so the pane
  // there leaves room for them when the rail is closed.
  const gutter = railOpen ? "ps-2" : "ps-28";

  const startControls = (
    <div
      className="absolute start-3 top-0 z-30 flex h-[var(--height-bar,46px)] items-center gap-1.5 [-webkit-app-region:no-drag]"
      data-ck-shell-header-slot="start"
    >
      <Button
        aria-label="Back"
        className={titlebarButtonClassName}
        color="disclosure"
        disabled={!canGoBack}
        onClick={onBack}
        size="toolbar"
        uniform
      >
        <ArrowLeft aria-hidden="true" />
      </Button>
      <Button
        aria-label="Forward"
        className={titlebarButtonClassName}
        color="disclosure"
        disabled={!canGoForward}
        onClick={onForward}
        size="toolbar"
        uniform
      >
        <ArrowRight aria-hidden="true" />
      </Button>
      <Button
        aria-expanded={railOpen}
        aria-label={railOpen ? "Hide sidebar" : "Show sidebar"}
        className={titlebarButtonClassName}
        color="disclosure"
        onClick={() => {
          setRailOpen(!railOpen);
        }}
        size="toolbar"
        uniform
      >
        <PanelLeft aria-hidden="true" />
      </Button>
    </div>
  );

  const chatPane = (
    <section
      aria-label={chatTitle}
      className="flex h-full min-h-0 min-w-0 flex-col"
      data-app-shell-chat-pane
    >
      <div
        className={cn(
          "flex h-[var(--height-bar,46px)] min-w-0 shrink-0 items-center gap-1 pe-2 select-none",
          chatOnLeft ? gutter : "ps-2"
        )}
        data-ck-shell-titlebar
        role="toolbar"
        aria-label={`${chatTitle} toolbar`}
      >
        <div className="min-w-0 flex-1 truncate px-2 text-sm font-medium">
          {chatTitle}
        </div>
        {chatActions}
        {hasTabs && !tabsOpen ? (
          <ToolbarAction
            icon={<PanelRight aria-hidden="true" />}
            label="Show tabs"
            onClick={toggleTabs}
            shortcut="Ctrl+Shift+B"
          />
        ) : null}
        {!hasTabs && onNewTab !== undefined ? (
          <NewTabButton onClick={onNewTab} title={newTabLabel}>
            <Plus aria-hidden="true" />
          </NewTabButton>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </section>
  );

  const tabsPane = (
    <section
      aria-label={tabListLabel}
      className="flex h-full min-h-0 min-w-0 flex-col border-border bg-panel"
      data-ck-shell-tab-pane
    >
      <div
        className={cn(
          "flex h-[var(--height-bar,46px)] min-w-0 shrink-0 items-center gap-1 pe-2 select-none",
          chatOnLeft ? "ps-2" : gutter
        )}
        data-ck-shell-tab-row
      >
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto [-webkit-app-region:no-drag]">
          <AppShellTabList ariaLabel={tabListLabel}>
            {tabs.map((tab) => {
              const closable = isClosable(tab, canClose);
              const active = tab.id === activeTabId;

              return (
                <MenuContextMenu
                  disableNative
                  getItems={() => tabMenuItems(tab)}
                  key={tab.id}
                >
                  <AppShellTab
                    accessibleStatus={tab.accessibleStatus}
                    activateOnClick
                    className="max-w-60 min-w-0 flex-1"
                    closeButtonTabIndex={-1}
                    disabled={tab.disabled}
                    icon={tab.icon}
                    id={tab.id}
                    isActive={active}
                    isClosable={closable}
                    isDragging={dragging?.tabId === tab.id}
                    isPresented={active}
                    onActivate={() => {
                      selectTab(tab.id);
                    }}
                    onClose={() => {
                      closeTabs([tab.id]);
                    }}
                    onPointerDown={(event) => {
                      startDrag(tab.id, event);
                    }}
                    showsPresentedTabChrome
                    tabActivatorProps={{
                      "aria-controls": `${id}-tab-panel`,
                      "aria-keyshortcuts": closable ? "Delete" : undefined,
                      id: `${id}-tab-${tab.id}`,
                      tabIndex: active ? 0 : -1,
                    }}
                    title={tab.title}
                  />
                </MenuContextMenu>
              );
            })}
          </AppShellTabList>
          {onNewTab === undefined ? null : (
            <NewTabButton onClick={onNewTab} title={newTabLabel}>
              <Plus aria-hidden="true" />
            </NewTabButton>
          )}
        </div>
        <ToolbarAction
          icon={
            layout === "full" ? (
              <Minimize2 aria-hidden="true" />
            ) : (
              <Maximize2 aria-hidden="true" />
            )
          }
          label={layout === "full" ? "Exit full view" : "Enter full view"}
          onClick={() => {
            setLayout(layout === "full" ? "split" : "full");
          }}
        />
        <ToolbarAction
          icon={<PanelRight aria-hidden="true" />}
          label="Hide tabs"
          onClick={toggleTabs}
          pressed
          shortcut="Ctrl+Shift+B"
        />
      </div>
      <div
        aria-labelledby={`${id}-tab-${activeTabId}`}
        className="min-h-0 min-w-0 flex-1"
        id={`${id}-tab-panel`}
        role="tabpanel"
      >
        {activeTab?.content}
      </div>
    </section>
  );

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: the one key is a `--name` custom property with a string value, which React accepts in a style object.
  const railStyle = {
    "--ck-shell-rail-width": `${railWidth}px`,
  } as CSSProperties;

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the frame catches tab shortcuts that bubble from any focused control inside the shell.
    <div
      className={cn(
        "relative flex h-full min-h-0 min-w-0 overflow-hidden",
        className
      )}
      data-active-tab={activeTabId === "" ? undefined : activeTabId}
      data-app-shell-content-side={contentSide}
      data-ck-shell-frame
      data-app-shell-layout={layout}
      data-app-shell-rail-open={railOpen}
      data-app-shell-tabs-open={showsTabs}
      id={id}
      onKeyDown={handleKeyDown}
      // oxlint-disable-next-line shadcn/no-inline-styles -- the rail width is a dynamic custom property.
      style={railStyle}
    >
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-panel focus:px-2 focus:py-1 focus:text-sm"
        href={`#${id}-content`}
      >
        Skip to content
      </a>
      {railOpen ? (
        <aside
          aria-label={railLabel}
          className="relative min-h-0 w-(--ck-shell-rail-width) shrink-0 overflow-visible border-r border-border"
          data-app-shell-rail
        >
          <div className="h-full min-h-0 overflow-hidden pt-[var(--height-bar,46px)]">
            {rail}
          </div>
          <AppShellSplitter currentSize={railWidth} onResize={setRailWidth} />
        </aside>
      ) : null}
      <main
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        data-ck-shell-main-surface
        id={`${id}-content`}
      >
        {startControls}
        <div
          className="relative min-h-0 min-w-0 flex-1"
          data-ck-shell-workspace
          ref={workspace}
        >
          {showsTabs ? (
            <SplitView
              // The chat pane opens at about a third of the workspace on
              // either side, as in the split layout.
              defaultLeftPercent={
                chatOnLeft ? CHAT_PANE_PERCENT : 100 - CHAT_PANE_PERCENT
              }
              id={`${id}-workspace-${contentSide}`}
              key={contentSide}
              isLeftOpen={chatOnLeft ? showsChat : true}
              isRightOpen={chatOnLeft ? true : showsChat}
              left={chatOnLeft ? chatPane : tabsPane}
              right={chatOnLeft ? tabsPane : chatPane}
            />
          ) : (
            chatPane
          )}
          {dragging === null ? null : <DropZones over={dragging.over} />}
        </div>
      </main>
    </div>
  );
};

export { AppShell, AppShellSplitter };

export type { AppShellProps, AppShellTabItem, PaneSide, WorkspaceLayout };
