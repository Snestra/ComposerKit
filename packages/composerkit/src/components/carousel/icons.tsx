// Lucide artwork is covered by components/icon/lucide.license.
import { createIcon } from "composerkit/components/icon";

/** The form and compact option-carousel arrows. */
export const ChevronRight16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "chevron-right-16",
});

/** The gallery option-carousel arrows. */
export const ChevronRightGallery16Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "chevron-right-16",
});

/** The photo carousel previous arrow. */
export const ChevronLeft20Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "chevron-left-20",
});

/** The photo carousel next arrow. */
export const ChevronRight20Icon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "chevron-right-20",
});

// The image viewer controls are plain svg components (no icon definition, so
// no bounds), each with its own path data and canvas.

/** The viewer's arrow (previous image; rotated for next). */
export const ViewerArrowLeftIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "viewer-arrow-left",
});

/** The viewer's zoom-in plus. */
export const ViewerPlusIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line><line x1="11" x2="11" y1="8" y2="14"></line><line x1="8" x2="14" y1="11" y2="11"></line></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "viewer-plus",
});

/** (the viewer's zoom-out minus). */
export const ViewerMinusIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line><line x1="8" x2="14" y1="11" y2="11"></line></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "viewer-minus",
});

/** The viewer's 21px close mark. */
export const ViewerCloseIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 21, viewBox: "0 0 24 24", width: 21 },
  name: "viewer-close",
});

/** The viewer's download arrow. */
export const ViewerDownloadIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "viewer-download",
});
