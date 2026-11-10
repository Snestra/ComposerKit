// Lucide artwork is covered by components/icon/lucide.license.
import { createIcon } from "@workspace/react/components/icon";
import type { IconDefinition } from "@workspace/react/lib/icon-markup";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * An icon that can also draw itself as a standalone SVG element, which
 * MenuContextMenu turns into the data URI the desktop's native menu shows.
 */
const defineIcon = (definition: IconDefinition) =>
  Object.assign(createIcon(definition), {
    createElement: (doc: Document) => {
      const svg = doc.createElementNS(SVG_NS, "svg");
      svg.setAttribute("width", String(definition.canvas.width));
      svg.setAttribute("height", String(definition.canvas.height));
      svg.setAttribute("viewBox", definition.canvas.viewBox);
      svg.setAttribute("fill", "none");
      svg.innerHTML = definition.body;

      return svg;
    },
  });

// Sidebar icon artwork.

export const SearchIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "search-16",
});

export const PinIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "pin-16",
});

export const UnpinIcon = createIcon({
  body: '<g fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "pin-fill-16",
});

export const ArchiveIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "archive-16",
});

export const PlusIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "plus-16",
});

export const EllipsisIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "ellipsis-16",
});

export const ComposeIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "compose-20",
});

export const DisclosureChevronIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 20 },
  name: "chevron-down-20",
});

export const ProjectFolderIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "folder-open-16",
});

export const ChatBubbleIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "chat-bubble",
});

export const ProjectDragFolderIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "project-drag-folder",
});

export const ThreadHostIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 21 },
  name: "thread-host",
});

export const PinProjectIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "pin-project",
});

export const OpenPathCompactIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "open-path-compact",
});

export const OpenPathIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "open-path",
});

export const EditProjectIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11.5V5a2 2 0 0 1 2-2h3.9c.7 0 1.3.3 1.7.9l.8 1.2c.4.6 1 .9 1.7.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5"></path><path d="M11.378 13.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "edit-project",
});

export const OrganizeSidebarIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "organize-sidebar",
});

export const SortChatsIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h20"></path><path d="M6 12h12"></path><path d="M9 19h6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "sort-chats",
});

export const RenameMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6"></path><path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"></path><path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"></path><path d="M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1"></path><path d="M9 6v12"></path></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 21 },
  name: "rename-menu",
});

export const PinMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "pin-menu",
});

export const MarkUnreadMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 21 },
  name: "mark-unread-menu",
});

export const MoveToProjectMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"></path><path d="M2 13h10"></path><path d="m9 16 3-3-3-3"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "move-to-project-menu",
});

export const ProjectMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "project-menu",
});

export const RemoveFromProjectMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 13h6"></path><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "remove-from-project-menu",
});

export const ForkMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"></path><path d="M12 12v3"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "fork-menu",
});

export const ForkChatMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"></path><path d="M12 12v3"></path></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 21 },
  name: "fork-chat-menu",
});

export const CopyMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 21 },
  name: "copy-menu",
});

export const ArchiveMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "archive-menu",
});

export const DeleteMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "delete-menu",
});

export const EditMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "edit-menu",
});

export const RevealFolderMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "reveal-folder-menu",
});

export const RemoveProjectMenuIcon = defineIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path><path d="m9.5 10.5 5 5"></path><path d="m14.5 10.5-5 5"></path></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 21 },
  name: "remove-project-menu",
});
