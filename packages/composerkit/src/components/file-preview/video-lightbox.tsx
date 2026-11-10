"use client";

/* oxlint-disable shadcn/no-arbitrary-values -- The tiles and gap use the utilities aspect-[9/16], w-[min(85cqw,56.25cqh)] and md:gap-[min(10cqw,200px)]. */

import { ViewerCloseIcon } from "composerkit/components/carousel/icons";
import { Button } from "composerkit/components/ui/button";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { ImagePreviewDialog } from "./image-preview-dialog";

const HIDE_SCROLLBAR =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export interface LightboxVideo {
  readonly id: string;
  readonly title?: string;
}

export interface VideoLightboxProps {
  onOpenChange: (open: boolean) => void;
  open?: boolean;
  /** The player of the selected tile. The component embeds a YouTube player here. */
  renderPlayer: (video: LightboxVideo) => ReactNode;
  /** The preview of a neighbouring tile. */
  renderPreview: (video: LightboxVideo) => ReactNode;
  selectedIndex?: number;
  videos: readonly LightboxVideo[];
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * The video lightbox: a horizontally
 * snapped carousel of 9:16 tiles on the media background. Neighbours are
 * buttons at 40% opacity on md and up, and the selected tile holds the player.
 */
export const VideoLightbox = ({
  onOpenChange,
  open = true,
  renderPlayer,
  renderPreview,
  selectedIndex = 0,
  videos,
}: VideoLightboxProps) => {
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(selectedIndex);
  const video = videos[index];

  useEffect(() => {
    const root = track;

    let observer: IntersectionObserver | undefined;

    if (root !== null && videos.length > 0) {
      root
        .querySelector(`[data-ck-video-index="${selectedIndex}"]`)
        ?.scrollIntoView({
          behavior: "instant",
          block: "nearest",
          inline: "center",
        });
      observer = new IntersectionObserver(
        (entries) => {
          const centered = entries.find((entry) => entry.isIntersecting);

          if (centered?.target instanceof HTMLElement) {
            setIndex(Number(centered.target.dataset.ckVideoIndex));
          }
        },
        { root, rootMargin: "0px -40% 0px -40%", threshold: 0 }
      );

      for (const tile of root.querySelectorAll("[data-ck-video-index]")) {
        observer.observe(tile);
      }
    }

    return () => observer?.disconnect();
  }, [selectedIndex, track, videos.length]);

  if (video === undefined) {
    return null;
  }

  const go = (next: number) => {
    setIndex(next);
    track?.querySelector(`[data-ck-video-index="${next}"]`)?.scrollIntoView({
      behavior: window.matchMedia(REDUCED_MOTION).matches
        ? "instant"
        : "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const multiple = videos.length > 1;

  return (
    <ImagePreviewDialog
      footer={
        multiple ? (
          <output className="shrink-0 select-none">
            {`${index + 1} of ${videos.length}`}
          </output>
        ) : undefined
      }
      nextDisabled={index === videos.length - 1}
      nextLabel="Next video"
      open={open}
      previousDisabled={index === 0}
      previousLabel="Previous video"
      title="Video player"
      onNext={
        multiple
          ? () => {
              go(index + 1);
            }
          : undefined
      }
      onOpenChange={onOpenChange}
      onPrevious={
        multiple
          ? () => {
              go(index - 1);
            }
          : undefined
      }
    >
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-2">
        <span className="min-w-0 truncate text-sm font-medium text-text">
          Video
        </span>
        <div role="toolbar">
          <Button
            aria-label="Close video player"
            autoFocus
            uniform
            onClick={() => {
              onOpenChange(false);
            }}
          >
            <ViewerCloseIcon aria-hidden />
          </Button>
        </div>
      </div>
      <div className="[container-type:size] size-full min-w-0">
        <div
          ref={setTrack}
          className={`${HIDE_SCROLLBAR} flex size-full snap-x snap-mandatory items-center gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain md:gap-[min(10cqw,200px)]`}
          data-testid="video-lightbox-carousel"
          role="presentation"
        >
          <div className="pointer-events-none w-1/2 shrink-0" />
          {videos.map((item, position) => (
            <div
              key={item.id}
              className="flex h-full w-[min(85cqw,56.25cqh)] shrink-0 snap-center snap-always justify-center overflow-y-auto"
              data-ck-video-index={position}
            >
              {position === index ? (
                <div className="relative my-auto aspect-[9/16] w-full shrink-0 overflow-hidden rounded-lg bg-media-background">
                  <div className="absolute -inset-px">{renderPlayer(item)}</div>
                </div>
              ) : (
                <button
                  aria-label={
                    item.title ??
                    `Play video ${position + 1} of ${videos.length}`
                  }
                  className="my-auto aspect-[9/16] w-full shrink-0 cursor-(--ck-action-cursor) overflow-hidden rounded-lg bg-panel focus-visible:outline focus-visible:outline-ring md:opacity-40"
                  tabIndex={Math.abs(position - index) === 1 ? 0 : -1}
                  type="button"
                  onClick={() => {
                    go(position);
                  }}
                >
                  {renderPreview(item)}
                </button>
              )}
            </div>
          ))}
          <div className="pointer-events-none w-1/2 shrink-0" />
        </div>
      </div>
    </ImagePreviewDialog>
  );
};
