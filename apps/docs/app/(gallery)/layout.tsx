import "composerkit/globals.css";
import "./fonts.css";
import "./site.css";
import { siteMetadata, siteViewport } from "@/lib/site";

export const metadata = siteMetadata;
export const viewport = siteViewport;
import { ThemeProvider } from "@/components/theme-provider";

import { FontPreloads } from "./font-preloads";

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en" suppressHydrationWarning className="font-sans antialiased">
    <body>
      <FontPreloads />
      <ThemeProvider>{children}</ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
