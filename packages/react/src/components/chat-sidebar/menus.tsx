"use client";

/* oxlint-disable shadcn/no-restyle -- The options buttons are 24px tertiary icon buttons, which no Button variant carries. */

import { Button } from "@workspace/react/components/ui/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuFlyoutSubmenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSectionLabel,
  MenuSeparator,
} from "@workspace/react/components/ui/menu";
import type { MenuContextItem } from "@workspace/react/components/ui/menu";
import type { ComponentProps } from "react";

import {
  ArchiveMenuIcon,
  CopyMenuIcon,
  DeleteMenuIcon,
  EditMenuIcon,
  EllipsisIcon,
  ForkChatMenuIcon,
  ForkMenuIcon,
  MarkUnreadMenuIcon,
  MoveToProjectMenuIcon,
  OrganizeSidebarIcon,
  PinMenuIcon,
  ProjectMenuIcon,
  RemoveFromProjectMenuIcon,
  RemoveProjectMenuIcon,
  RenameMenuIcon,
  RevealFolderMenuIcon,
  SortChatsIcon,
} from "./icons";

/*
 * The sidebar menus: the section option menus (Radix dropdowns), the project actions menu, and the
 * thread and project context menus. The context menus keep the ids and
 * accelerators the app sends to `electronBridge.showContextMenu`, so on the
 * desktop the native menu receives the same template.
 */

type ChatSidebarSort = "manual" | "updated";

type ChatSidebarOrganize = "list" | "project";

type ChatSidebarThreadAction =
  | "archive"
  | "copy-deeplink"
  | "copy-markdown"
  | "copy-path"
  | "delete"
  | "fork"
  | "mark-read"
  | "mark-unread"
  | "pin"
  | "rename"
  | "unpin";

type ChatSidebarProjectAction =
  | "archive-chats"
  | "change-marker"
  | "edit"
  | "pin"
  | "remove"
  | "reveal";

interface MenuProject {
  id: string;
  name: string;
}

const message = (id: string, defaultMessage: string) => ({
  defaultMessage,
  id,
});

const separator = (id: string): MenuContextItem => ({ id, type: "separator" });

interface ThreadMenuOptions {
  currentProject?: MenuProject;
  onAction?: (action: ChatSidebarThreadAction) => void;
  onMoveToProject?: (projectId: string | null) => void;
  pinned: boolean;
  projects: readonly MenuProject[];
  unread: boolean;
}

/** The thread row's context menu, in the order the app builds it. */
const threadMenuItems = ({
  currentProject,
  onAction,
  onMoveToProject,
  pinned,
  projects,
  unread,
}: ThreadMenuOptions): MenuContextItem[] => {
  const act = (action: ChatSidebarThreadAction) => () => {
    onAction?.(action);
  };

  const moveTargets: MenuContextItem[] = projects
    .filter((project) => project.id !== currentProject?.id)
    .map((project) => ({
      icon: ProjectMenuIcon,
      id: `move-thread-to-project:${project.id}`,
      message: message("sidebar.thread.moveToProject.target", project.name),
      onSelect: () => {
        onMoveToProject?.(project.id);
      },
    }));

  if (currentProject !== undefined) {
    moveTargets.push({
      icon: RemoveFromProjectMenuIcon,
      id: "remove-thread-from-project",
      message: message(
        "sidebar.thread.removeFromProject",
        `Remove from ${currentProject.name}`
      ),
      onSelect: () => {
        onMoveToProject?.(null);
      },
    });
  }

  return [
    {
      accelerator: "CmdOrCtrl+Alt+R",
      icon: RenameMenuIcon,
      id: "rename-item",
      message: message("sidebar.thread.rename", "Rename"),
      onSelect: act("rename"),
    },
    {
      accelerator: "CmdOrCtrl+Alt+P",
      icon: PinMenuIcon,
      id: "pin-thread",
      message: pinned
        ? message("sidebar.thread.unpin", "Unpin")
        : message("sidebar.thread.pin", "Pin"),
      onSelect: act(pinned ? "unpin" : "pin"),
    },
    {
      accelerator: "CmdOrCtrl+Shift+U",
      icon: MarkUnreadMenuIcon,
      id: "mark-thread-unread",
      message: unread
        ? message("sidebar.thread.markRead", "Mark as read")
        : message("sidebar.thread.markUnread", "Mark as unread"),
      onSelect: act(unread ? "mark-read" : "mark-unread"),
    },
    {
      icon: MoveToProjectMenuIcon,
      id: "move-thread-to-project",
      message: message("sidebar.thread.moveToProject", "Project"),
      submenu: moveTargets,
    },
    separator("continuation-separator"),
    {
      icon: ForkMenuIcon,
      id: "fork",
      message: message("sidebar.thread.fork", "Fork"),
      submenu: [
        {
          icon: ForkChatMenuIcon,
          id: "fork-into-local",
          message: message("sidebar.thread.forkChat", "Fork chat"),
          onSelect: act("fork"),
        },
      ],
    },
    separator("copy-separator"),
    {
      icon: CopyMenuIcon,
      id: "copy-actions",
      message: message("sidebar.thread.copy", "Copy"),
      submenu: [
        {
          accelerator: "CmdOrCtrl+Alt+L",
          icon: CopyMenuIcon,
          id: "copy-deeplink",
          message: message("sidebar.thread.copyDeeplink", "Copy deeplink"),
          onSelect: act("copy-deeplink"),
        },
        {
          icon: CopyMenuIcon,
          id: "copy-markdown",
          message: message("sidebar.thread.copyMarkdown", "Copy as Markdown"),
          onSelect: act("copy-markdown"),
        },
        {
          accelerator: "CmdOrCtrl+Shift+C",
          icon: CopyMenuIcon,
          id: "copy-path",
          message: message(
            "sidebar.thread.copyWorkingDirectory",
            "Copy working directory"
          ),
          onSelect: act("copy-path"),
        },
      ],
    },
    separator("lifecycle-separator"),
    {
      accelerator: "CmdOrCtrl+Shift+A",
      icon: ArchiveMenuIcon,
      id: "archive-item",
      message: message("sidebar.thread.archive", "Archive"),
      onSelect: act("archive"),
    },
    {
      icon: DeleteMenuIcon,
      id: "delete-thread",
      message: message("sidebar.thread.delete", "Permanently delete"),
      onSelect: act("delete"),
    },
  ];
};

/** The project row's context menu and its actions button menu. */
const projectMenuItems = (
  onAction?: (action: ChatSidebarProjectAction) => void
): MenuContextItem[] => {
  const act = (action: ChatSidebarProjectAction) => () => {
    onAction?.(action);
  };

  return [
    {
      icon: PinMenuIcon,
      id: "pin-project",
      message: message("sidebar.project.pin", "Pin"),
      onSelect: act("pin"),
    },
    {
      icon: EditMenuIcon,
      id: "edit-project",
      message: message("sidebar.project.edit", "Edit"),
      onSelect: act("edit"),
    },
    separator("project-actions-separator"),
    {
      icon: RevealFolderMenuIcon,
      id: "reveal-project-folder",
      message: message("sidebar.project.reveal", "Open in File Manager"),
      onSelect: act("reveal"),
    },
    separator("project-chat-actions-separator"),
    {
      icon: ArchiveMenuIcon,
      id: "archive-project-threads",
      message: message("sidebar.project.archiveChats", "Archive chats"),
      onSelect: act("archive-chats"),
    },
    separator("project-remove-separator"),
    {
      icon: RemoveProjectMenuIcon,
      id: "remove-project",
      message: message("sidebar.project.remove", "Remove project"),
      onSelect: act("remove"),
    },
  ];
};

// The menu clones its trigger to add the open handlers, ref and ARIA state, so
// every prop it passes must reach the button.
const OptionsTrigger = ({
  label,
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & { label: string }) => (
  <Button
    {...props}
    aria-label={label}
    className="size-6 text-text-subtle"
    color="ghost"
    focusRing="inset"
    size="icon"
    type="button"
    uniform
  >
    <EllipsisIcon className="size-4" />
  </Button>
);

interface SortRadioProps {
  onChange: (sort: ChatSidebarSort) => void;
  value: ChatSidebarSort;
}

const SortRadios = ({ onChange, value }: SortRadioProps) => (
  <MenuRadioGroup
    onValueChange={(next) => {
      onChange(next === "manual" ? "manual" : "updated");
    }}
    value={value}
  >
    <MenuRadioItem value="updated">Last updated</MenuRadioItem>
    <MenuRadioItem value="manual">Manual order</MenuRadioItem>
  </MenuRadioGroup>
);

/** "Pinned options": how pinned chats are sorted. It opens aligned to its end. */
const PinnedOptionsMenu = ({ onChange, value }: SortRadioProps) => (
  <Menu
    align="end"
    contentWidth="menu"
    triggerButton={<OptionsTrigger label="Pinned options" />}
  >
    <SortRadios onChange={onChange} value={value} />
  </Menu>
);

interface ListOptionsProps {
  chatSort: ChatSidebarSort;
  onChatSortChange: (sort: ChatSidebarSort) => void;
  onOrganizeChange: (organize: ChatSidebarOrganize) => void;
  organize: ChatSidebarOrganize;
}

const ListOptions = ({
  chatSort,
  onChatSortChange,
  onOrganizeChange,
  organize,
}: ListOptionsProps) => (
  <>
    <MenuFlyoutSubmenuItem
      LeftIcon={OrganizeSidebarIcon}
      label="Organize sidebar"
    >
      <MenuRadioGroup
        onValueChange={(next) => {
          onOrganizeChange(next === "list" ? "list" : "project");
        }}
        value={organize}
      >
        <MenuRadioItem value="project">By project</MenuRadioItem>
        <MenuRadioItem value="list">In one list</MenuRadioItem>
      </MenuRadioGroup>
    </MenuFlyoutSubmenuItem>
    <MenuFlyoutSubmenuItem LeftIcon={SortChatsIcon} label="Sort chats by">
      <SortRadios onChange={onChatSortChange} value={chatSort} />
    </MenuFlyoutSubmenuItem>
  </>
);

/** "Project sidebar options": organize and sort. */
const ProjectOptionsMenu = (props: ListOptionsProps) => (
  <Menu
    align="start"
    contentWidth="menu"
    triggerButton={<OptionsTrigger label="Project sidebar options" />}
  >
    <ListOptions {...props} />
  </Menu>
);

interface ChatOptionsMenuProps extends ListOptionsProps {
  onShowProjectsChange: (show: boolean) => void;
  showProjects: boolean;
}

/** "Chat sidebar options": organize, sort, and whether Projects is shown. */
const ChatOptionsMenu = ({
  onShowProjectsChange,
  showProjects,
  ...props
}: ChatOptionsMenuProps) => (
  <Menu
    align="start"
    contentWidth="menu"
    triggerButton={<OptionsTrigger label="Chat sidebar options" />}
  >
    <ListOptions {...props} />
    <MenuSeparator />
    <MenuSectionLabel>Show</MenuSectionLabel>
    <MenuCheckboxItem
      checked={showProjects}
      onCheckedChange={onShowProjectsChange}
    >
      Projects
    </MenuCheckboxItem>
  </Menu>
);

export {
  ChatOptionsMenu,
  PinnedOptionsMenu,
  ProjectOptionsMenu,
  projectMenuItems,
  threadMenuItems,
};

export type {
  ChatSidebarOrganize,
  ChatSidebarProjectAction,
  ChatSidebarSort,
  ChatSidebarThreadAction,
};
