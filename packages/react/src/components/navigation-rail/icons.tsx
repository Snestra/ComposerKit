// Lucide artwork is covered by components/icon/lucide.license.
import { createIcon } from "@workspace/react/components/icon";

/** The unpressed bookmark button in the rail preview. */
export const BookmarkIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "bookmark-16",
});

/** The pressed bookmark button in the rail preview. */
export const BookmarkFillIcon = createIcon({
  body: '<g fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "bookmark-fill-16",
});

/** The heartbeat mark before the preview title. */
export const HeartbeatIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "clock-16",
});

/** The file icon for folders and archives. */
export const FolderIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "folder-16",
});
