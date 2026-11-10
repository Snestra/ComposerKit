import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

import { basePath } from './lib/site';

const withMDX = createMDX();

const config: NextConfig = {
  // GitHub Pages serves the build as static files under the path of site.url.
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // oxc-parser loads a native binding at run time, which the bundler cannot follow.
  serverExternalPackages: ['oxc-parser'],
  // The component gallery under app/(gallery) imports the library source.
  transpilePackages: ['composerkit'],
};

export default withMDX(config);
