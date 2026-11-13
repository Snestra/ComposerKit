import type { Metadata, Viewport } from 'next';

export const site = {
  name: 'ComposerKit',
  url: 'https://bjoernaagaard.github.io/ComposerKit',
  title: 'ComposerKit: React components for chat interfaces',
  description: 'Build message composers and conversations with React components. Install the source through the shadcn registry and connect your own backend.',
  themeColor: '#0f1f10',
  accent: '#c6f19d',
  llmsIntro: 'ComposerKit is a React component library for chat interfaces. Use the shadcn registry for the API documented here. Component pages include installation commands, live demo source and TypeScript props. You provide the model and backend.',
} as const;

/** The path the site is served under, taken from site.url. Empty at a domain root. */
export const basePath = new URL(site.url).pathname.replace(/\/$/u, '');

/** A root-relative path with the base path in front, for URLs that Next.js does not prefix itself. */
export const withBasePath = (path: string): string => `${basePath}${path}`;

export const siteMetadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: '%s | ComposerKit' },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    title: site.title,
    description: site.description,
    siteName: site.name,
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: site.title }],
  },
  twitter: { card: 'summary_large_image', title: site.title, description: site.description, images: ['/og.png'] },
  icons: { icon: withBasePath('/icon.svg') },
  other: { 'page-type': 'software', 'site-kind': 'software' },
};

export const siteViewport: Viewport = { themeColor: site.themeColor, width: 'device-width', initialScale: 1 };
