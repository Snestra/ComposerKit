"use client";

/* oxlint-disable shadcn/no-arbitrary-values -- The thumbnail takes the radius of its parent with rounded-[inherit]. */

import {
  ViewerCloseIcon,
  ViewerDownloadIcon,
} from "composerkit/components/carousel/icons";
import { Banner } from "composerkit/components/ui/banner";
import { Button, Spinner } from "composerkit/components/ui/button";
import { useToast } from "composerkit/components/ui/toast";
import { cn } from "composerkit/lib/utils";
import { useRef, useState } from "react";
import type { ComponentProps } from "react";

import { ImagePreviewDialog } from "./image-preview-dialog";

export interface LightboxImage {
  readonly src: string;
  readonly title?: string;
}

export interface ImageLightboxProps {
  images: readonly LightboxImage[];
  /** Runs the download. Resolve to `false` or reject for "Could not download image". */
  onDownload?: (image: LightboxImage) => Promise<boolean> | boolean;
  onOpenChange: (open: boolean) => void;
  open?: boolean;
  selectedIndex?: number;
}

/**
 * A thumbnail fills its box: size-full, the parent's radius, a 1px default
 * border and object-cover.
 */
export const ImageThumbnail = ({
  alt,
  className,
  ...props
}: ComponentProps<"img"> & { alt: string }) => (
  // The src is a caller URL, so the Next image optimizer does not apply.
  // oxlint-disable-next-line nextjs/no-img-element
  <img
    {...props}
    alt={alt}
    className={cn(
      "size-full rounded-[inherit] border border-border object-cover",
      className
    )}
  />
);

/**
 * The image lightbox: Image {n} alternative text, a "{current} of {total}"
 * status, a retry callout when an image fails to load, a download action and
 * Close viewer, over the image preview dialog.
 */
export const ImageLightbox = ({
  images,
  onDownload,
  onOpenChange,
  open = true,
  selectedIndex = 0,
}: ImageLightboxProps) => {
  const toast = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const [index, setIndex] = useState(selectedIndex);
  const [failed, setFailed] = useState<readonly string[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const image = images[index];

  if (image === undefined) {
    return null;
  }

  const alt = image.title ?? `Image ${index + 1}`;
  const hasFailed = failed.includes(image.src);
  const ready = loaded === image.src && !hasFailed;

  const download = async () => {
    setDownloading(true);

    let ok = true;

    try {
      ok = (await onDownload?.(image)) ?? true;
    } catch {
      ok = false;
    }

    setDownloading(false);

    if (!ok) {
      toast.danger("Could not download image");
    }
  };

  return (
    <ImagePreviewDialog
      footer={
        images.length > 1 ? (
          <output className="shrink-0 select-none">
            {`${index + 1} of ${images.length}`}
          </output>
        ) : undefined
      }
      imageRef={imageRef}
      open={open}
      onNext={
        index >= images.length - 1
          ? undefined
          : () => {
              setIndex(index + 1);
            }
      }
      onOpenChange={onOpenChange}
      onPrevious={
        index === 0
          ? undefined
          : () => {
              setIndex(index - 1);
            }
      }
    >
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-text">
            {alt}
          </span>
        </div>
        <div className="flex items-center gap-1" role="toolbar">
          {onDownload === undefined ? null : (
            <Button
              aria-label="Download image"
              disabled={downloading || !ready}
              uniform
              onClick={() => {
                void download();
              }}
            >
              <ViewerDownloadIcon aria-hidden />
            </Button>
          )}
          <Button
            aria-label="Close viewer"
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
      <div className="flex size-full items-center justify-center">
        {hasFailed ? (
          <div className="m-auto select-none">
            <Banner
              content="Couldn't load this image"
              layout="vertical"
              primaryCtaText="Try again"
              // The callout is announced as a status.
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
              role="status"
              variant="callout"
              onPrimaryCtaClick={() => {
                setFailed(failed.filter((src) => src !== image.src));
              }}
            />
          </div>
        ) : (
          <>
            {ready ? null : (
              <div className="m-auto">
                <Spinner />
              </div>
            )}
            {/* The lightbox shows a caller URL, so the Next image optimizer does not apply. */}
            {/* oxlint-disable-next-line nextjs/no-img-element */}
            <img
              ref={imageRef}
              alt={alt}
              className={cn(
                "max-h-full max-w-full object-contain select-none",
                !ready && "hidden"
              )}
              key={image.src}
              referrerPolicy="no-referrer"
              src={image.src}
              onError={() => {
                setFailed([...failed, image.src]);
              }}
              onLoad={() => {
                setLoaded(image.src);
              }}
            />
          </>
        )}
      </div>
    </ImagePreviewDialog>
  );
};
