// Lucide artwork is covered by components/icon/lucide.license.
import { createIcon } from "composerkit/components/icon";

/** The back button; forward mirrors it. */
export const ArrowLeft16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "arrow-left-16",
});

/** The find bar's previous result; next rotates it 180 degrees. */
export const ArrowUp16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "arrow-up-16",
});

/** The find bar's search icon. */
export const MagnifyingGlass16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "magnifying-glass-16",
});
