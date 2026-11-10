import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The component gallery under app/(gallery) imports the library source.
  transpilePackages: ['@workspace/react'],
};

export default withMDX(config);
