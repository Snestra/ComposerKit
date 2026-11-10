import { BlankGlyph } from "composerkit/components/icon/glyphs";
import type { GlyphProps } from "composerkit/components/icon/glyphs";
import { Bell, Pin, Tag } from "lucide-react";

interface EvernoteIconProps extends GlyphProps {
  name: string;
}

const EvernoteIcon = ({ name, ...props }: EvernoteIconProps) => {
  switch (name) {
    case "Bell": {
      return <Bell width="1em" height="1em" {...props} />;
    }

    case "Pin": {
      return <Pin width="1em" height="1em" {...props} />;
    }

    case "Tag": {
      return <Tag width="1em" height="1em" {...props} />;
    }

    default: {
      return <BlankGlyph {...props} />;
    }
  }
};

export default EvernoteIcon;
