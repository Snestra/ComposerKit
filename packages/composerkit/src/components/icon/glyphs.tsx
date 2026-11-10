import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  File,
  Folder,
  Search,
  Settings,
  X,
} from "lucide-react";
import type { ComponentProps } from "react";

export type GlyphProps = ComponentProps<"svg">;

interface GlyphPath {
  clipRule?: "evenodd";
  d: string;
  fill?: string;
  fillRule?: "evenodd";
}

interface GlyphDefinition {
  fill: string;
  name: string;
  paths: readonly GlyphPath[];
  size: number | string;
  viewBox: string;
}

/**
 * An inline svg that spreads its props last.
 * It fills with currentColor, so it takes the text color of its parent.
 */
export const createGlyph = ({
  fill,
  name,
  paths,
  size,
  viewBox,
}: GlyphDefinition) => {
  const Glyph = (props: GlyphProps) => (
    <svg
      fill={fill}
      focusable="false"
      height={size}
      viewBox={viewBox}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {paths.map((path) => (
        <path key={path.d} {...path} />
      ))}
    </svg>
  );

  Glyph.displayName = `Glyph(${name})`;

  return Glyph;
};

export const CheckGlyph = (props: GlyphProps) => (
  <Check width="1em" height="1em" strokeWidth={2} {...props} />
);

export const CopyGlyph = (props: GlyphProps) => (
  <Copy width="1em" height="1em" strokeWidth={2} {...props} />
);

export const XGlyph = (props: GlyphProps) => (
  <X width="1em" height="1em" strokeWidth={2} {...props} />
);

export const ChevronLeftGlyph = (props: GlyphProps) => (
  <ChevronLeft width="1em" height="1em" strokeWidth={2} {...props} />
);

export const ChevronRightGlyph = (props: GlyphProps) => (
  <ChevronRight width="1em" height="1em" strokeWidth={2} {...props} />
);

export const ChevronDownGlyph = (props: GlyphProps) => (
  <ChevronDown width="1em" height="1em" strokeWidth={2} {...props} />
);

export const FileGlyph = (props: GlyphProps) => (
  <File width="1em" height="1em" strokeWidth={2} {...props} />
);

export const FolderGlyph = (props: GlyphProps) => (
  <Folder width="1em" height="1em" strokeWidth={2} {...props} />
);

export const SearchGlyph = (props: GlyphProps) => (
  <Search width="1em" height="1em" strokeWidth={2} {...props} />
);

export const SearchLightGlyph = (props: GlyphProps) => (
  <Search width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const SettingsGlyph = (props: GlyphProps) => (
  <Settings width="1em" height="1em" strokeWidth={2} {...props} />
);

export const SharedCheckIcon = (props: GlyphProps) => (
  <Check width={17} height={17} strokeWidth={2} {...props} />
);

export const SharedChevronRightIcon = (props: GlyphProps) => (
  <ChevronRight width={20} height={20} strokeWidth={2} {...props} />
);

export const SharedCloseIcon = (props: GlyphProps) => (
  <X width={21} height={21} strokeWidth={2} {...props} />
);

/** The empty svg the registry renders while a lazy icon loads or when a name has no icon. */
export const BlankGlyph = (props: GlyphProps) => (
  <svg height="1em" viewBox="0 0 24 24" width="1em" {...props} />
);
