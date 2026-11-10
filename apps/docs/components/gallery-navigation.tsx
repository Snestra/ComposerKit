"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { AppearanceControl } from "@/components/appearance-control";

const subscribe = () => () => {};

export function GalleryNavigation() {
  const standalone = useSyncExternalStore(
    subscribe,
    () => window.parent === window,
    () => false
  );

  if (!standalone) return null;

  return (
    <header className="gallery-site-nav">
      <Link className="site-wordmark" href="/" prefetch={false}>
        ComposerKit
      </Link>
      <nav aria-label="Site navigation">
        <Link href="/docs" prefetch={false}>
          Documentation
        </Link>
        <Link href="/gallery" aria-current="page" prefetch={false}>
          Gallery
        </Link>
      </nav>
      <AppearanceControl id="site-appearance" />
    </header>
  );
}
