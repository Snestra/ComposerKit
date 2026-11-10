/* oxlint-disable next/no-css-tags -- The supplied design kit loads unchanged from public assets. */
import { Instrument_Sans, DM_Mono } from "next/font/google";

import { siteMetadata, siteViewport, withBasePath } from "@/lib/site";

import "./landing.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--site-sans",
});
const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--site-mono",
});
export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-type="software"
      data-radius="sharp"
      data-ground="sage"
      data-buttons="solid"
      data-motion="on"
      data-tone="dark"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script>{`document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)`}</script>
        <link rel="stylesheet" href={withBasePath("/assets/system.css")} />
        <link rel="stylesheet" href={withBasePath("/assets/ui/cards.css")} />
        <link
          rel="stylesheet"
          href={withBasePath("/assets/motion/motion.css")}
        />
        <link
          rel="stylesheet"
          href={withBasePath("/assets/layout/layout.css")}
        />
        <link rel="stylesheet" href={withBasePath("/site-palette.css")} />
      </head>
      <body>
        {children}
        <script src={withBasePath("/assets/system.js")} type="module" defer />
        <script
          src={withBasePath("/assets/layout/layout.js")}
          type="module"
          defer
        />
        <script
          src={withBasePath("/assets/motion/motion.js")}
          type="module"
          defer
        />
      </body>
    </html>
  );
}
