"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The component draws the code as an svg with role=img. */
/* oxlint-disable shadcn/no-raw-colors -- The component fixes black on white so codes stay scannable in every theme. */
/* oxlint-disable anti-slop/no-shape-in-symbol-names -- shapeRendering is the svg attribute name the component sets. */

import { createQr } from "composerkit/components/qr-code/encoder";
import type { BitMatrix } from "composerkit/components/qr-code/encoder";
import { buildPortraitModules } from "composerkit/components/qr-code/silhouette";
import type { PortraitPixels } from "composerkit/components/qr-code/silhouette";
import { cn } from "composerkit/lib/utils";
import { useMemo, useState } from "react";
import type { ReactElement, ReactNode, SyntheticEvent } from "react";

const QUIET_ZONE = 4;
const MAX_SAMPLE_EDGE = 256;

const SIZE_CLASSES = {
  compact: "size-40",
  default: "size-60",
  inline: "size-18.5",
} as const;

const PLAIN_MODULE = (x: number, y: number) => `M${x},${y}h1v1h-1z`;

const ROUNDED_MODULE = (x: number, y: number) =>
  `M${x + 0.21},${y + 0.025}h.6a.18,.18 0 0 1 .18,.18v.6a.18,.18 0 0 1 -.18,.18h-.6a.18,.18 0 0 1 -.18,-.18v-.6a.18,.18 0 0 1 .18,-.18z`;

export interface QrCodePortrait {
  readonly crop?: {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  };
  readonly fillSilhouette?: boolean;
  readonly src: string;
}

export interface QrCodeProps {
  ariaLabel: string;
  children?: ReactNode;
  fallback?: ReactElement;
  portrait?: QrCodePortrait;
  size?: keyof typeof SIZE_CLASSES;
  value: string;
}

interface SampledPortrait {
  readonly key: string;
  readonly pixels: PortraitPixels;
}

const samplePortrait = (
  image: HTMLImageElement,
  crop: NonNullable<QrCodePortrait["crop"]>
) => {
  const sourceWidth = image.naturalWidth * crop.width;
  const sourceHeight = image.naturalHeight * crop.height;

  const scale = Math.min(
    1,
    MAX_SAMPLE_EDGE / Math.max(sourceWidth, sourceHeight)
  );

  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext("2d");

  if (context === null) {
    return null;
  }

  try {
    context.drawImage(
      image,
      image.naturalWidth * crop.x,
      image.naturalHeight * crop.y,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return context.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
};

const buildModules = (
  value: string,
  fillSilhouette: boolean | undefined,
  pixels: PortraitPixels | null
): BitMatrix | null => {
  try {
    return fillSilhouette === undefined
      ? createQr(value, { errorCorrectionLevel: "M" }).modules
      : buildPortraitModules(value, pixels, fillSilhouette);
  } catch {
    return null;
  }
};

const QrCode = ({
  value,
  ariaLabel,
  size = "default",
  portrait,
  children,
  fallback,
}: QrCodeProps) => {
  const [sampled, setSampled] = useState<SampledPortrait | null>(null);
  const portraitKey = JSON.stringify([portrait?.src, portrait?.crop]);
  const pixels = sampled?.key === portraitKey ? sampled.pixels : null;
  const hasPortrait = portrait !== undefined;

  const fillSilhouette = hasPortrait
    ? (portrait.fillSilhouette ?? false)
    : undefined;

  const modules = useMemo(
    () => buildModules(value, fillSilhouette, pixels),
    [value, fillSilhouette, pixels]
  );

  if (modules === null) {
    return fallback ?? null;
  }

  const viewSize = modules.size + QUIET_ZONE * 2;
  const modulePath = hasPortrait ? ROUNDED_MODULE : PLAIN_MODULE;

  const path = [...modules.data]
    .flatMap((dark, index) =>
      dark
        ? [
            modulePath(
              (index % modules.size) + QUIET_ZONE,
              Math.floor(index / modules.size) + QUIET_ZONE
            ),
          ]
        : []
    )
    .join("");

  const sample = (image: HTMLImageElement) => {
    const crop = portrait?.crop ?? { height: 1, width: 1, x: 0, y: 0 };
    const imageData = samplePortrait(image, crop);

    if (imageData !== null) {
      setSampled({ key: portraitKey, pixels: imageData });
    }
  };

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    sample(event.currentTarget);
  };

  // A server-rendered image can finish loading before hydration attaches onLoad.
  const sampleLoadedImage = (image: HTMLImageElement | null) => {
    if (
      image !== null &&
      image.complete &&
      image.naturalWidth > 0 &&
      sampled?.key !== portraitKey
    ) {
      sample(image);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn("max-w-full shrink-0 self-center", SIZE_CLASSES[size])}
        data-ck-dd-privacy="hidden"
      >
        <svg
          aria-label={ariaLabel}
          className="size-full rounded-xl"
          data-ck-dd-privacy="hidden"
          focusable="false"
          role="img"
          shapeRendering={hasPortrait ? "geometricPrecision" : "crispEdges"}
          viewBox={`0 0 ${viewSize} ${viewSize}`}
        >
          <rect fill="white" height={viewSize} width={viewSize} />
          <path d={path} fill="black" />
        </svg>
        {portrait === undefined ? null : (
          // The image is only sampled on a canvas and never shown.
          // oxlint-disable-next-line next/no-img-element
          <img
            alt=""
            crossOrigin="anonymous"
            hidden
            key={portraitKey}
            onLoad={handleLoad}
            ref={sampleLoadedImage}
            src={portrait.src}
          />
        )}
      </div>
      {children}
    </div>
  );
};

export { QrCode };
