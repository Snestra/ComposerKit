import { Check as LucideCheck, Copy as LucideCopy } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * Icons of the copy button: 24px glyphs filled with currentColor and sized 1em.
 */
export const MarkdownCopyIcon = (props: ComponentProps<"svg">) => (
  <LucideCopy
    aria-hidden="true"
    height="1em"
    width="1em"
    {...props}
    strokeWidth={1.5}
  />
);

export const MarkdownCheckIcon = (props: ComponentProps<"svg">) => (
  <LucideCheck
    aria-hidden="true"
    height="1em"
    width="1em"
    {...props}
    strokeWidth={1.5}
  />
);
