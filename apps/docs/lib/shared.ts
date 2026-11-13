import { createGetUrl } from 'fumadocs-core/source';

import { site } from './site';

export const appName = site.name;
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

// This app also serves the component gallery, under app/(gallery). Docs pages
// show its pages in frames, so the library's styles never mix with the docs.
export const galleryRoute = '/gallery';

export const gitConfig = {
  user: 'bjoernaagaard',
  repo: 'ComposerKit',
  branch: 'main',
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
