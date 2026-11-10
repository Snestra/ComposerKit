import type { ReactNode } from "react";

import { GalleryFrameTheme } from "@/components/gallery-frame-theme";
import { GalleryNavigation } from "@/components/gallery-navigation";

const GalleryLayout = ({ children }: { children: ReactNode }) => (
  <>
    <GalleryFrameTheme />
    <GalleryNavigation />
    {children}
  </>
);

export default GalleryLayout;
