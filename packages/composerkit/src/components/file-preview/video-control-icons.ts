// Lucide artwork is covered by components/icon/lucide.license.
import { createIcon } from "composerkit/components/icon";

// Video control artwork: play, pause, volume, muted, options, fullscreen and exit fullscreen.
export const VideoPlayIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "play-16",
});

export const VideoPauseIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="3" width="5" height="18" rx="1"></rect><rect x="5" y="3" width="5" height="18" rx="1"></rect></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "pause-fill-16",
});

export const VideoVolumeIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "speaker-sound-wave-2-16",
});

export const VideoMutedIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.7.7 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.7.7 0 0 0 11 19.298z"></path><path d="m16.5 14.5 5-5"></path><path d="m16.5 9.5 5 5"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "speaker-sound-wave-2-slash-16",
});

export const VideoOptionsIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "ellipsis-horizontal-16",
});

export const VideoFullscreenIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="m21 3-7 7"></path><path d="m3 21 7-7"></path><path d="M9 21H3v-6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "arrow-up-right-arrow-down-left-16",
});

export const VideoExitFullscreenIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m14 10 7-7"></path><path d="M20 10h-6V4"></path><path d="m3 21 7-7"></path><path d="M4 14h6v6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "arrow-down-left-arrow-up-right-16",
});
