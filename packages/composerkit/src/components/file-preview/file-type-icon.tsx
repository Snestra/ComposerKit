/* oxlint-disable eslint/complexity, shadcn/no-inline-styles, anti-slop/no-known-value-widening -- FileTypeIcon keeps one branch per case, and the branded color is the per-type value of the icon table applied as an inline color. */

import { createIcon } from "composerkit/components/icon";
import { cn } from "composerkit/lib/utils";
import type { ComponentProps, CSSProperties } from "react";

import { classifyFile, decideFileIcon, filled } from "./file-classification";
import {
  artwork,
  brandGlyphs,
  documentGlyphs,
  fallbackIcons,
  figmaIcons,
  typeGlyphs,
} from "./file-type-artwork";
import type { FileGlyphSize } from "./file-type-artwork";

export type FileTypeIconVariant = "branded" | "monochrome";

export interface FileTypeIconProps extends Omit<
  ComponentProps<"svg">,
  "children" | "height" | "viewBox" | "width"
> {
  fileExtension?: string | null;
  fileName?: string | null;
  libraryArtifactType?: string | null;
  libraryProvider?: string | null;
  mimeType?: string | null;
  mountedLibraryFileId?: string | null;
  size?: FileGlyphSize;
  sourceMimeType?: string | null;
  sourceUrl?: string | null;
  /** `branded` (default) applies the type color. `monochrome` uses currentColor. */
  variant?: FileTypeIconVariant;
}

const glyphs = Object.fromEntries(
  Object.entries(artwork).map(([name, definition]) => [
    name,
    createIcon(definition),
  ])
);

const fallbacks = Object.fromEntries(
  Object.entries(fallbackIcons).map(([key, { brandColor, icon }]) => [
    key,
    { Icon: createIcon(icon), brandColor },
  ])
);

const figmaSizes = [12, 16, 20, 24, 32] as const;

// The component renders the Figma artwork at height and width `size`.
const figmaBySize = Object.fromEntries(
  figmaSizes.map((size) => [
    size,
    {
      dark: createIcon({
        ...figmaIcons.dark,
        canvas: { ...figmaIcons.dark.canvas, height: size, width: size },
        name: `${figmaIcons.dark.name}-${size}`,
      }),
      light: createIcon({
        ...figmaIcons.light,
        canvas: { ...figmaIcons.light.canvas, height: size, width: size },
        name: `${figmaIcons.light.name}-${size}`,
      }),
    },
  ])
);

// Text colour utilities `text-file-*` are the classes in globals.css.
const typeColorClasses: Readonly<Record<string, string>> = {
  "text-file-audio": "text-file-audio",
  "text-file-document": "text-file-document",
  "text-file-image": "text-file-image",
  "text-file-pdf": "text-file-pdf",
  "text-file-presentation": "text-file-presentation",
  "text-file-spreadsheet": "text-file-spreadsheet",
  "text-file-three-d": "text-file-three-d",
  "text-file-video": "text-file-video",
};

const BrandArtwork = ({
  artwork: key,
  className,
  size = 24,
  style,
  ...props
}: Omit<ComponentProps<"svg">, "children"> & {
  artwork: string;
  size?: FileGlyphSize;
}) => {
  const wrapper = cn(
    "inline-flex shrink-0 items-center justify-center",
    className
  );

  if (key === "figma-document") {
    const { dark: FigmaDark, light: FigmaLight } = figmaBySize[size];

    return (
      <span className={wrapper} style={style}>
        <FigmaLight {...props} className="dark:hidden" />
        <FigmaDark {...props} className="hidden dark:block" />
      </span>
    );
  }

  const name = brandGlyphs[key]?.[String(size)];
  const Glyph = name === undefined ? undefined : glyphs[name];

  return Glyph === undefined ? null : (
    <span className={wrapper} style={style}>
      <Glyph {...props} />
    </span>
  );
};

/**
 * File icon chosen from the extension, name, MIME type and source. Text and document types use a document glyph,
 * Figma and Office files use brand artwork, and the other types use a per-type
 * glyph. Variant `branded` applies the type color and `monochrome` uses
 * currentColor.
 */
export const FileTypeIcon = ({
  className,
  fileExtension,
  fileName,
  libraryArtifactType,
  libraryProvider,
  mimeType,
  mountedLibraryFileId,
  size,
  sourceMimeType,
  sourceUrl,
  style,
  variant = "branded",
  ...props
}: FileTypeIconProps) => {
  if (libraryArtifactType === "site_preview") {
    return (
      <BrandArtwork
        {...props}
        artwork="sites"
        className={className}
        size={size ?? 20}
        style={style}
      />
    );
  }

  const decision = decideFileIcon({
    fileExtension,
    fileName,
    libraryProvider,
    mimeType,
    mountedLibraryFileId,
    sourceMimeType,
    sourceUrl,
  });

  let iconKey = decision.kind === "brand" ? "file" : decision.iconKey;

  if (libraryArtifactType === "research_report") {
    iconKey = "text";
  } else if (!filled(sourceMimeType) && libraryArtifactType === "app_block") {
    iconKey = "app-block";
  } else if (
    !filled(sourceMimeType) &&
    !filled(libraryProvider) &&
    !filled(mountedLibraryFileId) &&
    filled(sourceUrl)
  ) {
    ({ iconKey } = classifyFile({ fileName, mimeType, sourceUrl }));
  }

  if (iconKey === "figma-document" || iconKey === "office-document") {
    return (
      <BrandArtwork
        {...props}
        artwork={iconKey}
        className={className}
        size={size}
        style={style}
      />
    );
  }

  if (
    iconKey === "file" &&
    decision.provider !== undefined &&
    decision.provider !== "imanage"
  ) {
    return (
      <BrandArtwork
        {...props}
        artwork={decision.provider}
        className={className}
        size={size}
        style={style}
      />
    );
  }

  const branded = variant === "branded";

  if (libraryArtifactType === "writing_block" || iconKey === "text") {
    const Glyph = glyphs[documentGlyphs[String(size ?? 20)]];

    return (
      <Glyph
        {...props}
        className={cn(branded && "text-file-document", className)}
        style={style}
      />
    );
  }

  const entry = typeGlyphs[iconKey];
  const glyphSize = size ?? 20;

  if (iconKey === "app-block" && glyphSize === 32) {
    const Glyph = glyphs[typeGlyphs["three-d"].assets["32"]];

    return <Glyph {...props} className={className} style={style} />;
  }

  const useAsset =
    entry !== undefined &&
    (glyphSize === 16 ||
      glyphSize === 32 ||
      (glyphSize === 20 && variant === "monochrome"));

  if (useAsset) {
    const Glyph = glyphs[entry.assets[String(glyphSize)]];

    const color =
      branded && entry.className !== undefined
        ? typeColorClasses[entry.className]
        : undefined;

    return <Glyph {...props} className={cn(color, className)} style={style} />;
  }

  const { Icon, brandColor } = fallbacks[iconKey] ?? fallbacks.file;

  const brandStyle: CSSProperties | undefined =
    branded && brandColor !== null ? { color: brandColor, ...style } : style;

  return (
    <Icon
      {...props}
      className={cn(iconKey === "mp4" && "size-[1em]", className)}
      style={brandStyle}
    />
  );
};
