"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values -- The gallery generates its example photos as inline SVG. */

import type { CarouselImage } from "@workspace/react/components/ui/carousel";
import type { ReactNode } from "react";

const HUE_STEP = 47;
export const WIDE = { height: 400, width: 500 } as const;
const TALL = { height: 500, width: 400 } as const;

/** A local example photo: a tinted SVG with its number, so no request is made. */
export const photoSource = (
  number: number,
  size: { height: number; width: number }
) => {
  const hue = (number * HUE_STEP) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"><rect width="100%" height="100%" fill="hsl(${hue} 55% 55%)"/><circle cx="${size.width * 0.7}" cy="${size.height * 0.3}" r="${size.height * 0.12}" fill="hsl(${hue} 70% 85%)"/><path d="M0 ${size.height} L${size.width * 0.35} ${size.height * 0.55} L${size.width * 0.6} ${size.height * 0.8} L${size.width * 0.8} ${size.height * 0.62} L${size.width} ${size.height} Z" fill="hsl(${hue} 45% 35%)"/><text x="50%" y="14%" text-anchor="middle" font-family="sans-serif" font-size="${size.height * 0.1}" fill="white">${number}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const photos = (count: number): CarouselImage[] =>
  Array.from({ length: count }, (_, index) => {
    const size = index % 3 === 1 ? TALL : WIDE;

    return {
      height: size.height,
      id: `photo-${index + 1}`,
      src: photoSource(index + 1, size),
      width: size.width,
    };
  });

export const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {description === undefined ? null : (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {children}
  </section>
);

export const Frame = ({
  children,
  className,
  label,
  testId,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  testId: string;
}) => (
  <figure
    className={`flex min-w-0 flex-col gap-1 ${className ?? ""}`}
    data-testid={testId}
  >
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    <div className="min-w-0 rounded-xl border bg-background p-3">
      {children}
    </div>
  </figure>
);
