"use client";

import { ThinkingShimmer } from "@workspace/react/components/skeleton/cadenced-shimmer";
import { Button } from "@workspace/react/components/ui/button";
import {
  LoadingPlaceholder,
  LoadingResultsShimmer,
  LoadingResultsShimmerLines,
} from "@workspace/react/components/ui/skeleton";
import Link from "next/link";
import { useState } from "react";

import styles from "@workspace/react/components/skeleton/skeleton.module.css";

const SkeletonGalleryExample = () => {
  const [paused, setPaused] = useState(false);
  const [thinking, setThinking] = useState(true);

  const playState: React.CSSProperties & {
    "--ck-decoration-playback": string;
  } = {
    "--ck-decoration-playback": paused ? "paused" : "running",
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 text-foreground">
      <header>
        <Link className="underline" href="/gallery">
          Back to gallery
        </Link>
        <h1 className="text-title-lg font-semibold">Skeleton</h1>
      </header>
      <section className="flex flex-col gap-4" aria-label="Seeded lines">
        <h2>Seeded lines</h2>
        <LoadingResultsShimmerLines />
        <LoadingResultsShimmerLines />
        <LoadingResultsShimmerLines seed="another" />
      </section>
      <section
        className="flex flex-col gap-4"
        aria-label="Bar sizes and variants"
      >
        <h2>Bar sizes and variants</h2>
        <div className="flex gap-2">
          <Button
            color="outline"
            size="pageAction"
            onClick={() => {
              setPaused(!paused);
            }}
          >
            {paused ? "Resume animation" : "Pause animation"}
          </Button>
        </div>
        <div className="flex flex-col gap-4" style={playState}>
          {(["sm", "md", "lg", "thumbnail", "fill"] as const).map((size) => (
            <div key={size} className="flex h-12 items-center gap-4">
              <span className="w-24">{size}</span>
              <div className="h-10 w-48">
                <LoadingResultsShimmer size={size} />
              </div>
            </div>
          ))}
          {(
            [
              "standard",
              "project",
              "edge-to-edge",
              "conversation-followup",
            ] as const
          ).map((variant) => (
            <div key={variant} className="flex items-center gap-4">
              <span className="w-40">{variant}</span>
              <LoadingResultsShimmer className="w-48" variant={variant} />
            </div>
          ))}
          <div className="flex items-center gap-4">
            <span className="w-40">No animation</span>
            <LoadingResultsShimmer animate={false} className="w-48" />
          </div>
        </div>
      </section>
      <section
        className="flex flex-col gap-4"
        aria-label="Placeholder variants"
      >
        <h2>Placeholder variants</h2>
        {(["default", "solid", "prominent"] as const).map((variant) => (
          <div key={variant} className="flex items-center gap-4">
            <span className="w-24">{variant}</span>
            <LoadingPlaceholder variant={variant} className="h-12 w-48" />
          </div>
        ))}
        <div data-theme="dark" className={`${styles.themeScope} p-4`}>
          <div data-theme="light" className={`${styles.themeScope} p-4`}>
            <LoadingPlaceholder className="h-12 w-48" />
          </div>
        </div>
        <div data-theme="light" className={`${styles.themeScope} p-4`}>
          <div data-theme="dark" className={`${styles.themeScope} p-4`}>
            <LoadingPlaceholder className="h-12 w-48" />
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-4" aria-label="Thinking shimmer">
        <h2>Thinking shimmer</h2>
        <Button
          color="outline"
          size="pageAction"
          onClick={() => {
            setThinking(!thinking);
          }}
        >
          {thinking ? "Stop shimmer" : "Start shimmer"}
        </Button>
        <ThinkingShimmer active={thinking} />
      </section>
    </main>
  );
};

export { SkeletonGalleryExample };
