"use client";

/*
 * The CodeDiff context menu: the item list, the wrapper and the open targets,
 * and the wrapper around the whole diff. The menu family's MenuContextMenu draws it: with
 * `window.electronBridge.showContextMenu` the items go to the desktop shell as a native
 * template, otherwise the in-page menu is used.
 */

import { MenuContextMenu } from "@workspace/react/components/ui/menu";
import type { MenuContextItem } from "@workspace/react/components/ui/menu";
import type { ReactElement } from "react";

/** A message descriptor (id and default text). */
const message = (id: string, defaultMessage: string) => ({
  defaultMessage,
  id,
});

export const DIFF_CONTEXT_MENU_MESSAGES = {
  copyPath: message("codeDiff.menu.copyPath", "Copy path"),
  copyRelativePath: message(
    "codeDiff.menu.copyRelativePath",
    "Copy relative path"
  ),
  copySelection: message("codeDiff.menu.copySelection", "Copy selection"),
  newTab: message("codeDiff.menu.newTab", "New tab"),
  openInGitHub: message("codeDiff.menu.openInGitHub", "Open in GitHub"),
  openInTarget: message("codeDiff.menu.openInTarget", "Open in {target}"),
  openInTargetSubmenu: message("codeDiff.menu.openInTargetSubmenu", "{target}"),
  openWith: message("codeDiff.menu.openWith", "Open with"),
  requestChanges: message("codeDiff.menu.requestChanges", "Request changes"),
  toggleWrap: message("codeDiff.menu.toggleWrap", "Toggle line wrap"),
} as const;

/** One app the file can be opened in (the open-in service's target). */
export interface DiffOpenTarget {
  /** Set for an installed native app. */
  appPath?: string | null;
  default?: boolean;
  hidden?: boolean;
  icon?: MenuContextItem["icon"];
  id: string;
  kind?: string;
  label: string;
  target: string;
}

/** What `loadOpenTargets` returns (the open-in service's answer). */
export interface DiffOpenTargets {
  availableTargets?: readonly string[];
  mode?: "editor" | "native";
  preferredTarget?: string | null;
  targets?: readonly DiffOpenTarget[];
}

/** The targets the menu lists. */
export const visibleOpenTargets = ({
  availableTargets,
  includeHiddenTargets = false,
  mode = "editor",
  targets,
}: {
  availableTargets: readonly string[];
  includeHiddenTargets?: boolean;
  mode?: "editor" | "native";
  targets: readonly DiffOpenTarget[];
}) => {
  const installed = targets.filter(
    (target) => (target.appPath ?? null) !== null
  );

  if (installed.length > 0) {
    return installed;
  }

  if (mode === "native") {
    return targets.filter(
      (target) =>
        target.target === "systemDefault" || target.target === "fileManager"
    );
  }

  const available = new Set(availableTargets);

  return targets.filter(
    (target) =>
      available.has(target.target) &&
      (includeHiddenTargets || target.hidden !== true)
  );
};

/** The target of the "Open in" item. */
export const primaryOpenTarget = ({
  availableTargets,
  includeHiddenTargets = true,
  mode = "editor",
  preferredTarget,
  targets,
}: {
  availableTargets: readonly string[];
  includeHiddenTargets?: boolean;
  mode?: "editor" | "native";
  preferredTarget: string | null;
  targets: readonly DiffOpenTarget[];
}) => {
  const visible = visibleOpenTargets({
    availableTargets,
    includeHiddenTargets,
    mode,
    targets,
  });

  if (visible.length === 0) {
    return null;
  }

  if (preferredTarget === null) {
    return visible[0];
  }

  return (
    visible.find((target) => target.target === preferredTarget) ?? visible[0]
  );
};

/** Opening in an editor without an app path remembers the choice. */
export const persistsPreferredTarget = (target: DiffOpenTarget) =>
  (target.appPath ?? null) === null && target.kind === "editor";

/** The visible targets and the primary one, with an optional preferred override. */
const resolveOpenTargets = (
  data: DiffOpenTargets | null,
  preferredTargetOverride: string | undefined
) => {
  const preferred = preferredTargetOverride ?? data?.preferredTarget ?? null;
  const available = data?.availableTargets ?? [];
  const source = data?.targets ?? [];

  const targets =
    preferredTargetOverride === undefined
      ? source
      : source.map((target) => ({
          ...target,
          default: target.target === preferredTargetOverride || undefined,
        }));

  return {
    primaryTarget: primaryOpenTarget({
      availableTargets: available,
      mode: data?.mode,
      preferredTarget: preferred,
      targets,
    }),
    visibleTargets: visibleOpenTargets({
      availableTargets: available,
      includeHiddenTargets: true,
      mode: data?.mode,
      targets,
    }),
  };
};

export interface DiffContextMenuItemsOptions {
  canOpenFile: boolean;
  /** The GitHub URL of the file, or null when it has none. */
  githubFileLookup?: () => Promise<string | null>;
  handleOpenInTarget: (
    target: string,
    persistPreferred: boolean,
    appPath: string | undefined
  ) => void;
  loadNewTabIcon?: () => Promise<MenuContextItem["icon"] | null>;
  loadOpenTargets?: () => Promise<DiffOpenTargets | null>;
  /** The opener, or none when the file cannot open in a tab. */
  getOpenInNewTab?: () => (() => void) | null | undefined;
  onCopyPath: () => void;
  onCopyRelativePath?: () => void;
  onOpenGitHub: (href: string) => void;
  onRequestChanges: (() => void) | undefined;
  onToggleWrap: () => void;
  preferredTargetOverride?: string;
}

const settleToNull = async <Value,>(
  request: (() => Promise<Value>) | undefined
): Promise<Value | null> => {
  if (request === undefined) {
    return null;
  }

  try {
    return await request();
  } catch {
    return null;
  }
};

/** The items of the menu, with the targets, the GitHub URL and the tab icon loaded. */
export const buildDiffContextMenuItems = async ({
  canOpenFile,
  getOpenInNewTab,
  githubFileLookup,
  handleOpenInTarget,
  loadNewTabIcon,
  loadOpenTargets,
  onCopyPath,
  onCopyRelativePath,
  onOpenGitHub,
  onRequestChanges,
  onToggleWrap,
  preferredTargetOverride,
}: DiffContextMenuItemsOptions): Promise<MenuContextItem[]> => {
  const openInNewTab = getOpenInNewTab?.() ?? null;

  const [targets, githubHref, newTabIcon] = await Promise.all([
    loadOpenTargets?.() ?? null,
    settleToNull(githubFileLookup),
    openInNewTab === null ? null : settleToNull(loadNewTabIcon),
  ]);

  const { primaryTarget, visibleTargets } = resolveOpenTargets(
    targets,
    preferredTargetOverride
  );

  const items: MenuContextItem[] = [
    {
      id: "request-changes",
      message: DIFF_CONTEXT_MENU_MESSAGES.requestChanges,
      onSelect: onRequestChanges,
    },
  ];

  if (primaryTarget) {
    items.push({
      icon: primaryTarget.icon,
      id: "open-primary",
      message: DIFF_CONTEXT_MENU_MESSAGES.openInTarget,
      messageValues: { target: primaryTarget.label },
      onSelect: () => {
        handleOpenInTarget(
          primaryTarget.target,
          false,
          primaryTarget.appPath ?? undefined
        );
      },
    });
  }

  if (primaryTarget || openInNewTab !== null) {
    const submenu: MenuContextItem[] = [];

    if (openInNewTab !== null) {
      submenu.push({
        icon: newTabIcon ?? undefined,
        id: "open-in-new-tab",
        message: DIFF_CONTEXT_MENU_MESSAGES.newTab,
        onSelect: openInNewTab,
      });
    }

    submenu.push(
      ...visibleTargets.map((target): MenuContextItem => ({
        icon: target.icon,
        id: target.id,
        message: DIFF_CONTEXT_MENU_MESSAGES.openInTargetSubmenu,
        messageValues: { target: target.label },
        onSelect: () => {
          handleOpenInTarget(
            target.target,
            persistsPreferredTarget(target),
            target.appPath ?? undefined
          );
        },
      }))
    );
    items.push({
      id: "open-with",
      message: DIFF_CONTEXT_MENU_MESSAGES.openWith,
      submenu,
    });
  }

  if (githubHref !== null) {
    items.push({
      id: "open-in-github",
      message: DIFF_CONTEXT_MENU_MESSAGES.openInGitHub,
      onSelect: () => {
        onOpenGitHub(githubHref);
      },
    });
  }

  if (primaryTarget || openInNewTab !== null || githubHref !== null) {
    items.push({ id: "section-separator-1", type: "separator" });
  }

  items.push(
    {
      enabled: false,
      id: "copy-selection",
      message: DIFF_CONTEXT_MENU_MESSAGES.copySelection,
    },
    {
      enabled: canOpenFile,
      id: "copy-path",
      message: DIFF_CONTEXT_MENU_MESSAGES.copyPath,
      onSelect: onCopyPath,
    }
  );

  if (onCopyRelativePath !== undefined) {
    items.push({
      id: "copy-relative-path",
      message: DIFF_CONTEXT_MENU_MESSAGES.copyRelativePath,
      onSelect: onCopyRelativePath,
    });
  }

  items.push({
    id: "toggle-wrap",
    message: DIFF_CONTEXT_MENU_MESSAGES.toggleWrap,
    onSelect: onToggleWrap,
  });

  return items;
};

/** Writes text to the clipboard; a refused write is ignored. */
export const copyText = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => null);
};

export interface DiffContextMenuProps extends DiffContextMenuItemsOptions {
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the child element's props are the caller's, so their keys are open
  children: ReactElement<Record<string, unknown>>;
  /** Always use the in-page menu, even when the desktop bridge exists. */
  disableNative?: boolean;
  /** Items placed before the diff's own, with a separator. */
  getAdditionalItems?: () => MenuContextItem[] | Promise<MenuContextItem[]>;
}

/**
 * The context menu of a CodeDiff. "Copy selection" is enabled when the
 * page has selected text at the moment the menu opens, and copies it.
 */
export const DiffContextMenu = ({
  children,
  disableNative,
  getAdditionalItems,
  ...options
}: DiffContextMenuProps) => {
  const getItems = async () => {
    const selected = window.getSelection()?.toString().trim() ?? "";
    const base = await buildDiffContextMenuItems(options);

    const own = base.map((item) =>
      item.id === "copy-selection"
        ? {
            ...item,
            enabled: selected !== "",
            onSelect: () => {
              if (selected !== "") {
                copyText(selected);
              }
            },
          }
        : item
    );

    const additional = await getAdditionalItems?.();

    if (additional === undefined || additional.length === 0) {
      return own;
    }

    const separator: MenuContextItem = {
      id: "language-separator",
      type: "separator",
    };

    return [...additional, separator, ...own];
  };

  return (
    <MenuContextMenu disableNative={disableNative} getItems={getItems}>
      {children}
    </MenuContextMenu>
  );
};
