import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import type { ReactNode } from "react";

import styles from "./typography.module.css";

/*
 * HeaderTitleChip. The pill and
 * its surface come from the _title and _controlSurface rules of module
 * _1b0lv.
 */

const HeaderTitleChip = ({
  icon,
  showTooltip = true,
  title,
}: {
  icon?: ReactNode;
  showTooltip?: boolean;
  title: string;
}) => {
  const chip = (
    <div
      className={cn(
        styles.title,
        styles.controlSurface,
        "inline-flex min-w-0 items-center gap-2 rounded-full border-0 px-3 text-sm text-text"
      )}
    >
      {icon}
      <span
        className="block max-w-[168px] min-w-0 truncate"
        data-ck-viewer-header-collapsible={
          icon === undefined ? undefined : true
        }
      >
        {title}
      </span>
    </div>
  );

  return showTooltip ? (
    <TooltipHint content={title} side="bottom">
      {chip}
    </TooltipHint>
  ) : (
    chip
  );
};

export { HeaderTitleChip };
