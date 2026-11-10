import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Instrument_Sans } from 'next/font/google';
import { siteMetadata, siteViewport, withBasePath } from '@/lib/site';

const inter = Instrument_Sans({ subsets: ['latin'] });
export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <a className="docs-skip" href="#nd-page">Skip to content</a>
        <RootProvider search={{ options: { type: 'static', api: withBasePath('/api/search') } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
