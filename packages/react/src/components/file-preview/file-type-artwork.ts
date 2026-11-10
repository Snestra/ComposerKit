// Lucide artwork is covered by components/icon/lucide.license.
import type { IconDefinition } from "@workspace/react/lib/icon-markup";

/* oxlint-disable anti-slop/no-known-value-widening -- The tables are read with runtime file keys, so the open dictionary types are the contract. */

// Type glyphs, document glyphs, brand artwork, 20px branded fallback icons and Figma artwork.
export type FileGlyphSize = 12 | 16 | 20 | 24 | 32;

export interface FallbackIcon {
  readonly brandColor: string | null;
  readonly icon: IconDefinition;
}

export const artwork: Readonly<Record<string, IconDefinition>> = {
  "box-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "box-12",
  },
  "box-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "box-16",
  },
  "box-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "box-20",
  },
  "box-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "box-24",
  },
  "box-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "box-32",
  },
  "code-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "code-16",
  },
  "code-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "code-20",
  },
  "code-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "code-32",
  },
  "cube-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "cube-16",
  },
  "cube-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "cube-20",
  },
  "cube-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "cube-32",
  },
  "document-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "document-16",
  },
  "document-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "document-20",
  },
  "document-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "document-32",
  },
  "document-zip-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M8 12v-1"></path><path d="M8 18v-2"></path><path d="M8 7V6"></path><circle cx="8" cy="20" r="2"></circle></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "document-zip-16",
  },
  "document-zip-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M8 12v-1"></path><path d="M8 18v-2"></path><path d="M8 7V6"></path><circle cx="8" cy="20" r="2"></circle></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "document-zip-20",
  },
  "document-zip-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M8 12v-1"></path><path d="M8 18v-2"></path><path d="M8 7V6"></path><circle cx="8" cy="20" r="2"></circle></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "document-zip-32",
  },
  "dropbox-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"></path><path d="M12 10v4h4"></path><path d="m12 14 1.535-1.605a5 5 0 0 1 8 1.5"></path><path d="M22 22v-4h-4"></path><path d="m22 18-1.535 1.605a5 5 0 0 1-8-1.5"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "dropbox-12",
  },
  "dropbox-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"></path><path d="M12 10v4h4"></path><path d="m12 14 1.535-1.605a5 5 0 0 1 8 1.5"></path><path d="M22 22v-4h-4"></path><path d="m22 18-1.535 1.605a5 5 0 0 1-8-1.5"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "dropbox-16",
  },
  "dropbox-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"></path><path d="M12 10v4h4"></path><path d="m12 14 1.535-1.605a5 5 0 0 1 8 1.5"></path><path d="M22 22v-4h-4"></path><path d="m22 18-1.535 1.605a5 5 0 0 1-8-1.5"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "dropbox-20",
  },
  "dropbox-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"></path><path d="M12 10v4h4"></path><path d="m12 14 1.535-1.605a5 5 0 0 1 8 1.5"></path><path d="M22 22v-4h-4"></path><path d="m22 18-1.535 1.605a5 5 0 0 1-8-1.5"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "dropbox-24",
  },
  "dropbox-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"></path><path d="M12 10v4h4"></path><path d="m12 14 1.535-1.605a5 5 0 0 1 8 1.5"></path><path d="M22 22v-4h-4"></path><path d="m22 18-1.535 1.605a5 5 0 0 1-8-1.5"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "dropbox-32",
  },
  "excel-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "excel-16",
  },
  "excel-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "excel-20",
  },
  "excel-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "excel-32",
  },
  "film-strip-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "film-strip-16",
  },
  "film-strip-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "film-strip-20",
  },
  "film-strip-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "film-strip-32",
  },
  "globe-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "globe-16",
  },
  "globe-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "globe-20",
  },
  "globe-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "globe-32",
  },
  "google-drive-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16h.01"></path><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><path d="M21.946 12.013H2.054"></path><path d="M6 16h.01"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "google-drive-12",
  },
  "google-drive-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16h.01"></path><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><path d="M21.946 12.013H2.054"></path><path d="M6 16h.01"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "google-drive-16",
  },
  "google-drive-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16h.01"></path><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><path d="M21.946 12.013H2.054"></path><path d="M6 16h.01"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "google-drive-20",
  },
  "google-drive-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16h.01"></path><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><path d="M21.946 12.013H2.054"></path><path d="M6 16h.01"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "google-drive-24",
  },
  "google-drive-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16h.01"></path><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><path d="M21.946 12.013H2.054"></path><path d="M6 16h.01"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "google-drive-32",
  },
  "office-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"></path><path d="M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z"></path><path d="M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "office-12",
  },
  "office-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"></path><path d="M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z"></path><path d="M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "office-16",
  },
  "office-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"></path><path d="M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z"></path><path d="M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "office-20",
  },
  "office-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"></path><path d="M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z"></path><path d="M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "office-24",
  },
  "office-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"></path><path d="M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z"></path><path d="M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "office-32",
  },
  "onedrive-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "onedrive-12",
  },
  "onedrive-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "onedrive-16",
  },
  "onedrive-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "onedrive-20",
  },
  "onedrive-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "onedrive-24",
  },
  "onedrive-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "onedrive-32",
  },
  "pdf-document-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "pdf-document-16",
  },
  "pdf-document-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "pdf-document-20",
  },
  "pdf-document-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "pdf-document-32",
  },
  "photo-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "photo-16",
  },
  "photo-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "photo-20",
  },
  "photo-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "photo-32",
  },
  "powerpoint-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "powerpoint-16",
  },
  "powerpoint-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "powerpoint-20",
  },
  "powerpoint-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "powerpoint-32",
  },
  "sharepoint-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "sharepoint-12",
  },
  "sharepoint-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "sharepoint-16",
  },
  "sharepoint-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "sharepoint-20",
  },
  "sharepoint-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "sharepoint-24",
  },
  "sharepoint-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "sharepoint-32",
  },
  "sites-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "sites-12",
  },
  "sites-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "sites-16",
  },
  "sites-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "sites-20",
  },
  "sites-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "sites-24",
  },
  "sites-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "sites-32",
  },
  "slides-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "slides-16",
  },
  "slides-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "slides-20",
  },
  "slides-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "slides-32",
  },
  "spreadsheet-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "spreadsheet-16",
  },
  "spreadsheet-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "spreadsheet-20",
  },
  "spreadsheet-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "spreadsheet-32",
  },
  "terms-12": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
    name: "terms-12",
  },
  "terms-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "terms-16",
  },
  "terms-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "terms-20",
  },
  "terms-24": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "terms-24",
  },
  "terms-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "terms-32",
  },
  "wavelength-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"></path><path d="M6 6v11"></path><path d="M10 3v18"></path><path d="M14 8v7"></path><path d="M18 5v13"></path><path d="M22 10v3"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "wavelength-16",
  },
  "wavelength-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"></path><path d="M6 6v11"></path><path d="M10 3v18"></path><path d="M14 8v7"></path><path d="M18 5v13"></path><path d="M22 10v3"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "wavelength-20",
  },
  "wavelength-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"></path><path d="M6 6v11"></path><path d="M10 3v18"></path><path d="M14 8v7"></path><path d="M18 5v13"></path><path d="M22 10v3"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "wavelength-32",
  },
  "word-16": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
    name: "word-16",
  },
  "word-20": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
    name: "word-20",
  },
  "word-32": {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
    canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
    name: "word-32",
  },
};

export const typeGlyphs: Readonly<
  Record<
    string,
    {
      readonly assets: Readonly<Record<string, string>>;
      readonly className?: string;
    }
  >
> = {
  audio: {
    assets: {
      "16": "wavelength-16",
      "20": "wavelength-20",
      "32": "wavelength-32",
    },
    className: "text-file-audio",
  },
  code: {
    assets: {
      "16": "code-16",
      "20": "code-20",
      "32": "code-32",
    },
  },
  csv: {
    assets: {
      "16": "spreadsheet-16",
      "20": "spreadsheet-20",
      "32": "spreadsheet-32",
    },
    className: "text-file-spreadsheet",
  },
  document: {
    assets: {
      "16": "word-16",
      "20": "word-20",
      "32": "word-32",
    },
    className: "text-file-document",
  },
  file: {
    assets: {
      "16": "document-16",
      "20": "document-20",
      "32": "document-32",
    },
  },
  "file-video": {
    assets: {
      "16": "film-strip-16",
      "20": "film-strip-20",
      "32": "film-strip-32",
    },
    className: "text-file-video",
  },
  html: {
    assets: {
      "16": "globe-16",
      "20": "globe-20",
      "32": "globe-32",
    },
  },
  mp4: {
    assets: {
      "16": "film-strip-16",
      "20": "film-strip-20",
      "32": "film-strip-32",
    },
    className: "text-file-video",
  },
  pdf: {
    assets: {
      "16": "pdf-document-16",
      "20": "pdf-document-20",
      "32": "pdf-document-32",
    },
    className: "text-file-pdf",
  },
  photo: {
    assets: {
      "16": "photo-16",
      "20": "photo-20",
      "32": "photo-32",
    },
    className: "text-file-image",
  },
  ppt: {
    assets: {
      "16": "powerpoint-16",
      "20": "powerpoint-20",
      "32": "powerpoint-32",
    },
    className: "text-file-presentation",
  },
  slides: {
    assets: {
      "16": "slides-16",
      "20": "slides-20",
      "32": "slides-32",
    },
    className: "text-file-presentation",
  },
  "three-d": {
    assets: {
      "16": "cube-16",
      "20": "cube-20",
      "32": "cube-32",
    },
    className: "text-file-three-d",
  },
  xls: {
    assets: {
      "16": "excel-16",
      "20": "excel-20",
      "32": "excel-32",
    },
    className: "text-file-spreadsheet",
  },
  zip: {
    assets: {
      "16": "document-zip-16",
      "20": "document-zip-20",
      "32": "document-zip-32",
    },
  },
};

export const documentGlyphs: Readonly<Record<string, string>> = {
  "12": "terms-12",
  "16": "terms-16",
  "20": "terms-20",
  "24": "terms-24",
  "32": "terms-32",
};

export const brandGlyphs: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  box: {
    "12": "box-12",
    "16": "box-16",
    "20": "box-20",
    "24": "box-24",
    "32": "box-32",
  },
  dropbox: {
    "12": "dropbox-12",
    "16": "dropbox-16",
    "20": "dropbox-20",
    "24": "dropbox-24",
    "32": "dropbox-32",
  },
  google_drive: {
    "12": "google-drive-12",
    "16": "google-drive-16",
    "20": "google-drive-20",
    "24": "google-drive-24",
    "32": "google-drive-32",
  },
  "office-document": {
    "12": "office-12",
    "16": "office-16",
    "20": "office-20",
    "24": "office-24",
    "32": "office-32",
  },
  onedrive: {
    "12": "onedrive-12",
    "16": "onedrive-16",
    "20": "onedrive-20",
    "24": "onedrive-24",
    "32": "onedrive-32",
  },
  sharepoint: {
    "12": "sharepoint-12",
    "16": "sharepoint-16",
    "20": "sharepoint-20",
    "24": "sharepoint-24",
    "32": "sharepoint-32",
  },
  sites: {
    "12": "sites-12",
    "16": "sites-16",
    "20": "sites-20",
    "24": "sites-24",
    "32": "sites-32",
  },
};

export const fallbackIcons: Readonly<Record<string, FallbackIcon>> = {
  "app-block": {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"></path><rect x="14" y="2" width="8" height="8" rx="1"></rect></g>',
      canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
      name: "file-fallback-app-block",
    },
  },
  audio: {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.835V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-.343"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M2 19a2 2 0 0 1 4 0v1a2 2 0 0 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 0 1-4 0v-1a2 2 0 0 1 4 0"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-audio",
    },
  },
  code: {
    brandColor: "var(--icon-primary, var(--color-text, currentColor))",
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 12.5 8 15l2 2.5"></path><path d="m14 12.5 2 2.5-2 2.5"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-code",
    },
  },
  csv: {
    brandColor: "#30a46c",
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M8 13h2"></path><path d="M14 13h2"></path><path d="M8 17h2"></path><path d="M14 17h2"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-csv",
    },
  },
  document: {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-document",
    },
  },
  file: {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-file",
    },
  },
  "file-video": {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M15.033 13.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56v-4.704a.645.645 0 0 1 .967-.56z"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-file-video",
    },
  },
  "google-docs": {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
      canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
      name: "file-fallback-google-docs",
    },
  },
  "google-sheets": {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
      canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
      name: "file-fallback-google-sheets",
    },
  },
  "google-slides": {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
      canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
      name: "file-fallback-google-slides",
    },
  },
  html: {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 12.5 8 15l2 2.5"></path><path d="m14 12.5 2 2.5-2 2.5"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-html",
    },
  },
  mp4: {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></g>',
      canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
      name: "file-fallback-mp4",
    },
  },
  pdf: {
    brandColor: "#FF3B30",
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-pdf",
    },
  },
  photo: {
    brandColor: "#f7709c",
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-photo",
    },
  },
  ppt: {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-ppt",
    },
  },
  slides: {
    brandColor: "#FF3B30",
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-slides",
    },
  },
  text: {
    brandColor: "#0091ff",
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-text",
    },
  },
  "three-d": {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-three-d",
    },
  },
  xls: {
    brandColor: "#30a46c",
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="3" x2="21" y1="15" y2="15"></line><line x1="9" x2="9" y1="9" y2="21"></line><line x1="15" x2="15" y1="9" y2="21"></line></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-xls",
    },
  },
  zip: {
    brandColor: null,
    icon: {
      body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M8 12v-1"></path><path d="M8 18v-2"></path><path d="M8 7V6"></path><circle cx="8" cy="20" r="2"></circle></g>',
      canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
      name: "file-fallback-zip",
    },
  },
};

export const figmaIcons: Readonly<Record<"dark" | "light", IconDefinition>> = {
  dark: {
    body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18"></path><path d="M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z"></path><path d="m3 3 6.586 6.586"></path><circle cx="11" cy="11" r="2"></circle></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "figma-document-dark",
  },
  light: {
    body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18"></path><path d="M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z"></path><path d="m3 3 6.586 6.586"></path><circle cx="11" cy="11" r="2"></circle></g>',
    canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
    name: "figma-document-light",
  },
};
