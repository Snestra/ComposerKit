"use client";

import { TitlebarLeftInsetContext } from "composerkit/components/layout/titlebar-inset";
import { Button } from "composerkit/components/ui/button";
import {
  Menu,
  MenuContextMenu,
  MenuItem,
  MenuMessage,
  MenuSectionLabel,
  MenuSeparator,
} from "composerkit/components/ui/menu";
import { SplitView } from "composerkit/components/ui/split-view";
import { AppShellTab, AppShellTabList } from "composerkit/components/ui/tabs";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import { isPresent } from "composerkit/lib/present";
import { Plus } from "lucide-react";
import { createContext, useContext, useId } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";

type SettingsNavigationRequest = (navigate: () => void) => void;

const SettingsNavigationRequestContext =
  createContext<SettingsNavigationRequest | null>(null);

interface SettingsPanelAction {
  id: string;
  label: string;
  onSelect: () => void;
}

interface SettingsPanelLauncher {
  actions: readonly SettingsPanelAction[];
  emptyMessage: string;
  loading: boolean;
  loadingMessage: string;
  suggested: readonly SettingsPanelAction[];
  suggestedLabel: string;
}

interface SettingsRightPanel {
  activeTab: string | null;
  launcher: SettingsPanelLauncher;
  launcherMode: "direct" | "menu";
  newTabLabel: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNewTab: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  tabListLabel: string;
  tabs: readonly {
    closable?: boolean;
    content: ReactNode;
    id: string;
    title: string;
  }[];
}

const SettingsPanelMenu = ({
  launcher,
  label,
}: {
  launcher: SettingsPanelLauncher;
  label: string;
}) => (
  <Menu
    align="start"
    contentWidth="panel"
    triggerButton={
      <Button aria-label={label} color="ghost" size="toolbar" uniform>
        <Plus aria-hidden="true" />
      </Button>
    }
  >
    {launcher.actions.length === 0 &&
    launcher.suggested.length === 0 &&
    !launcher.loading ? (
      <MenuMessage compact>{launcher.emptyMessage}</MenuMessage>
    ) : null}
    {launcher.actions.map((action) => (
      <MenuItem
        key={action.id}
        onSelect={() => {
          action.onSelect();
        }}
      >
        {action.label}
      </MenuItem>
    ))}
    {launcher.loading ? (
      <MenuMessage compact>{launcher.loadingMessage}</MenuMessage>
    ) : null}
    {launcher.suggested.length > 0 ? (
      <>
        {launcher.actions.length > 0 ? <MenuSeparator /> : null}
        <MenuSectionLabel>{launcher.suggestedLabel}</MenuSectionLabel>
        {launcher.suggested.map((action) => (
          <MenuItem
            key={action.id}
            onSelect={() => {
              action.onSelect();
            }}
          >
            {action.label}
          </MenuItem>
        ))}
      </>
    ) : null}
  </Menu>
);

const SettingsPanelDirectLauncher = ({
  launcher,
  label,
  onOpen,
}: {
  launcher: SettingsPanelLauncher;
  label: string;
  onOpen: () => void;
}) => (
  <TooltipHint content={label} openDelay={250}>
    <MenuContextMenu
      disableNative
      contentWidth="panel"
      items={[
        ...launcher.actions.map((action) => ({
          id: action.id,
          message: { defaultMessage: action.label, id: action.id },
          onSelect: action.onSelect,
        })),
        ...(launcher.loading
          ? [
              {
                id: "loading",
                message: {
                  defaultMessage: launcher.loadingMessage,
                  id: "loading",
                },
                type: "label" as const,
              },
            ]
          : []),
        ...(launcher.suggested.length > 0
          ? [
              {
                id: "suggested",
                message: {
                  defaultMessage: launcher.suggestedLabel,
                  id: "suggested",
                },
                type: "label" as const,
              },
              ...launcher.suggested.map((action) => ({
                id: action.id,
                message: { defaultMessage: action.label, id: action.id },
                onSelect: action.onSelect,
              })),
            ]
          : []),
        ...(launcher.actions.length === 0 &&
        launcher.suggested.length === 0 &&
        !launcher.loading
          ? [
              {
                id: "empty",
                message: { defaultMessage: launcher.emptyMessage, id: "empty" },
                type: "label" as const,
              },
            ]
          : []),
      ]}
    >
      <Button
        aria-label={label}
        color="ghost"
        size="toolbar"
        uniform
        onClick={onOpen}
      >
        <Plus aria-hidden="true" />
      </Button>
    </MenuContextMenu>
  </TooltipHint>
);

interface SettingsPageFrameProps {
  children?: ReactNode;
  legacyContentRef?: Ref<HTMLDivElement>;
  requestNavigation?: SettingsNavigationRequest | null;
  rightPanel?: SettingsRightPanel;
  sidebar?: ReactNode;
  titlebarLeftInset?: number;
  workspaceKey?: string | null;
}

const SettingsPageFrame = ({
  children,
  legacyContentRef,
  requestNavigation,
  rightPanel,
  sidebar,
  titlebarLeftInset = 0,
  workspaceKey,
}: SettingsPageFrameProps) => {
  const inheritedRequest = useContext(SettingsNavigationRequestContext);
  const panelPrefix = useId();

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const { target } = event;

    if (
      !(target instanceof HTMLButtonElement) ||
      target.getAttribute("role") !== "tab" ||
      !rightPanel
    ) {
      return;
    }

    const list = target.closest('[role="tablist"]');

    if (!list) {
      return;
    }

    const tabs = [
      ...list.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)'
      ),
    ];

    const index = tabs.indexOf(target);

    if (event.key === "Delete") {
      const tab = rightPanel.tabs[index];

      if (tab?.closable === true) {
        rightPanel.onClose(tab.id);
        event.preventDefault();
        requestAnimationFrame(() => {
          const remaining = [
            ...list.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]:not(:disabled)'
            ),
          ].filter((item) => !item.closest("[inert]"));

          (
            remaining.find(
              (item) => item.getAttribute("aria-selected") === "true"
            ) ?? remaining[0]
          )?.focus({ preventScroll: true });
        });
      }

      return;
    }

    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      return;
    }

    const rtl = getComputedStyle(list).direction === "rtl";
    let next: number;

    if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      const forward = (event.key === "ArrowRight") !== rtl;
      next = (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
    }

    const nextTab = tabs[next];

    if (nextTab !== undefined && nextTab !== target) {
      nextTab.focus();
      rightPanel.onActivate(rightPanel.tabs[next].id);
    }

    event.preventDefault();
  };

  const page = (
    <div
      className="relative isolate flex h-full min-h-0 min-w-0 flex-col overflow-visible"
      data-ui-navigation-page
      ref={legacyContentRef}
    >
      {children}
    </div>
  );

  return (
    <SettingsNavigationRequestContext.Provider
      value={requestNavigation ?? inheritedRequest}
    >
      <TitlebarLeftInsetContext.Provider value={titlebarLeftInset}>
        <div className="flex h-full min-h-0 min-w-0" data-ck-shell-frame>
          {sidebar}
          <main className="min-h-0 min-w-0 flex-1" data-ck-shell-main-surface>
            {workspaceKey === "/settings" && isPresent(rightPanel) ? (
              <SplitView
                id="settings-page-frame"
                isRightOpen={rightPanel.open}
                left={page}
                onRightOpenChange={(open) => {
                  rightPanel.onOpenChange(open);
                }}
                right={
                  <div className="flex h-full min-h-0 flex-col bg-panel">
                    <div className="flex border-b">
                      <AppShellTabList ariaLabel={rightPanel.tabListLabel}>
                        {rightPanel.tabs.map((tab) => (
                          <AppShellTab
                            isActive={rightPanel.activeTab === tab.id}
                            isClosable={tab.closable}
                            tabActivatorProps={{
                              "aria-controls": `${panelPrefix}-panel-${encodeURIComponent(tab.id)}`,
                              "aria-keyshortcuts":
                                tab.closable === true ? "Delete" : undefined,
                              id: `${panelPrefix}-tab-${encodeURIComponent(tab.id)}`,
                              onKeyDown: handlePanelKeyDown,
                              tabIndex:
                                rightPanel.activeTab === tab.id ? 0 : -1,
                            }}
                            key={tab.id}
                            onActivate={() => {
                              rightPanel.onActivate(tab.id);
                            }}
                            onClose={() => {
                              rightPanel.onClose(tab.id);
                            }}
                            title={tab.title}
                          />
                        ))}
                      </AppShellTabList>
                      {rightPanel.launcherMode === "menu" ? (
                        <SettingsPanelMenu
                          label={rightPanel.newTabLabel}
                          launcher={rightPanel.launcher}
                        />
                      ) : (
                        <SettingsPanelDirectLauncher
                          label={rightPanel.newTabLabel}
                          launcher={rightPanel.launcher}
                          onOpen={() => {
                            rightPanel.onNewTab();
                          }}
                        />
                      )}
                    </div>
                    {rightPanel.tabs.map((tab) => (
                      <div
                        aria-labelledby={`${panelPrefix}-tab-${encodeURIComponent(tab.id)}`}
                        className="min-h-0 flex-1 overflow-auto"
                        hidden={rightPanel.activeTab !== tab.id}
                        id={`${panelPrefix}-panel-${encodeURIComponent(tab.id)}`}
                        key={tab.id}
                        role="tabpanel"
                        tabIndex={-1}
                      >
                        {tab.content}
                      </div>
                    ))}
                  </div>
                }
              />
            ) : (
              page
            )}
          </main>
        </div>
      </TitlebarLeftInsetContext.Provider>
    </SettingsNavigationRequestContext.Provider>
  );
};

export { SettingsNavigationRequestContext, SettingsPageFrame };

export type {
  SettingsNavigationRequest,
  SettingsPageFrameProps,
  SettingsRightPanel,
};
