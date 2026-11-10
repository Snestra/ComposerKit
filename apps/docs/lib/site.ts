import type { Metadata, Viewport } from 'next';

export const site = {
  name: 'ComposerKit',
  url: 'https://composerkit.taildfc6b2.ts.net',
  title: 'ComposerKit: React components for chat interfaces',
  description: 'Build message composers and conversations with React components. Install the source through the shadcn registry and connect your own backend.',
  themeColor: '#0f1f10',
  accent: '#c6f19d',
  llmsIntro: 'ComposerKit is a React component library for chat interfaces. Use the shadcn registry for the API documented here. Component pages include installation commands, live demo source and TypeScript props. You provide the model and backend.',
} as const;

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
    images: [{ url: '/og', width: 1200, height: 630, alt: site.title }],
  },
  twitter: { card: 'summary_large_image', title: site.title, description: site.description, images: ['/og'] },
  icons: { icon: '/icon.svg' },
  other: { 'page-type': 'software', 'site-kind': 'software' },
};

export const siteViewport: Viewport = { themeColor: site.themeColor, width: 'device-width', initialScale: 1 };
