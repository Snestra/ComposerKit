"use client";

import { ToastProvider } from "@workspace/react/components/ui/toast";
import { TooltipProvider } from "@workspace/react/components/ui/tooltip";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

const ComponentGallery = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>
    <ToastProvider>
      <main className="gallery">
        <header>
          <Link href="/preview">Back to preview</Link>
          <h1>Component gallery</h1>
          <AppearanceControl id="gallery-appearance" />
        </header>
        {children}
      </main>
    </ToastProvider>
  </TooltipProvider>
);

export { ComponentGallery };
