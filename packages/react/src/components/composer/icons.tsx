// Lucide artwork is covered by components/icon/lucide.license.
import { createIcon } from "@workspace/react/components/icon";

/** The arrow-up send icon of the inline composer submit button. */
export const ComposerSendIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "composer-send",
});

/** The rounded-square stop icon. */
export const ComposerStopIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "composer-stop",
});

export const ComposerVoiceIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"></path><path d="M6 6v11"></path><path d="M10 3v18"></path><path d="M14 8v7"></path><path d="M18 5v13"></path><path d="M22 10v3"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "composer-voice",
});

/** The dismiss icon of the tip bar. */
export const Xmark16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-16",
});

export const ChevronDown16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "chevron-down-16",
});

/** The default chevron of the compound button's dropdown target. */
export const ChevronDownIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 20 },
  name: "chevron-down",
});

/** The info icon of the "Allow this conversation" row. */
export const CircleInfoLight16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "circle-info-16",
});
