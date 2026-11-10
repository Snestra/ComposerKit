"use client";

import { AppShell } from "composerkit/components/ui/app-shell";
import type { AppShellTabItem } from "composerkit/components/ui/app-shell";
import { Button } from "composerkit/components/ui/button";
import {
  Copy,
  GitFork,
  Globe,
  ListChecks,
  MoreHorizontal,
  Pin,
  Plus,
  RotateCw,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

const Conversation = () => (
  <div className="flex h-full min-h-0 items-center justify-center p-8">
    <div className="max-w-md text-center">
      <h2 className="text-title-md font-semibold">Conversation</h2>
      <p className="mt-2 text-sm text-text-muted">
        This conversation is a slot. Tabs, panes and the rail are controlled by
        the gallery.
      </p>
    </div>
  </div>
);

const TabPage = ({ title }: { title: string }) => (
  <div className="p-5 text-sm">
    <h2 className="font-semibold">{title}</h2>
    <p className="mt-2 text-text-muted">Content tab slot.</p>
  </div>
);

const Rail = () => (
  <nav aria-label="Demo navigation" className="flex h-full flex-col gap-1 p-3">
    <span className="px-2 py-1 text-sm font-semibold">Code</span>
    <Button color="ghost" size="pageAction">
      <Plus aria-hidden="true" />
      New chat
    </Button>
    <span className="mt-4 px-2 text-xs text-text-muted">Recents</span>
    <span className="px-2 py-1 text-sm text-text-subtle">No chats</span>
  </nav>
);

const tabTypeItem = (id: string, label: string, icon: ReactNode) => ({
  icon,
  id,
  message: { defaultMessage: label, id: `gallery.appShell.${id}` },
});

// The browser tab type puts Pin first and its actions after New tab to the
// right.
const browserLeadingItems = [
  tabTypeItem("pin", "Pin to sidebar", <Pin aria-hidden="true" />),
];

const browserTabItems = [
  tabTypeItem("reload", "Reload", <RotateCw aria-hidden="true" />),
  tabTypeItem("duplicate", "Duplicate", <Copy aria-hidden="true" />),
  tabTypeItem("fork", "Fork", <GitFork aria-hidden="true" />),
];

const makeTab = (count: number, title = "New tab"): AppShellTabItem => ({
  content: <TabPage title={title} />,
  icon: <Globe aria-hidden="true" />,
  id: `tab-${count}`,
  leadingMenuItems: browserLeadingItems,
  menuItems: browserTabItems,
  title,
});

const ChatActions = () => (
  <>
    <Button aria-label="Chat actions" color="ghost" size="toolbar" uniform>
      <MoreHorizontal aria-hidden="true" />
    </Button>
    <Button aria-label="Toggle summary" color="ghost" size="toolbar" uniform>
      <ListChecks aria-hidden="true" />
    </Button>
  </>
);

const AppShellGalleryExample = () => {
  const [tabs, setTabs] = useState<AppShellTabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [count, setCount] = useState(0);

  const insertTab = (index: number) => {
    const tab = makeTab(count + 1);
    setCount(count + 1);
    setTabs([...tabs.slice(0, index), tab, ...tabs.slice(index)]);
    setActiveTabId(tab.id);
  };

  const closeTab = (id: string) => {
    setTabs((current) => current.filter((tab) => tab.id !== id));
  };

  const renameTab = (id: string) => {
    setTabs((current) =>
      current.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              content: <TabPage title="Renamed tab" />,
              title: "Renamed tab",
            }
          : tab
      )
    );
  };

  return (
    <div className="h-dvh min-h-0 overflow-hidden bg-panel">
      <AppShell
        activeTabId={activeTabId}
        chatActions={<ChatActions />}
        onActiveTabChange={setActiveTabId}
        onNewTab={() => {
          insertTab(tabs.length);
        }}
        onNewTabToRight={(id) => {
          insertTab(tabs.findIndex((tab) => tab.id === id) + 1);
        }}
        onTabClose={closeTab}
        onTabRename={renameTab}
        rail={<Rail />}
        tabs={tabs}
      >
        <Conversation />
      </AppShell>
    </div>
  );
};

export { AppShellGalleryExample };
