import { Button } from "composerkit/components/ui/button";
import { cn } from "composerkit/lib/utils";
import type { ComponentProps } from "react";

type RequestActionChipProps = ComponentProps<typeof Button> & {
  transcript?: boolean;
};

const RequestActionChip = ({
  transcript = false,
  radius,
  ...props
}: RequestActionChipProps) => {
  const button = <Button {...props} radius={radius} />;

  if (!transcript) {
    return button;
  }

  return (
    <div
      className={cn(
        "flex w-fit max-w-full rounded-full border-0 bg-(--ck-avatar-layer-material-background,color-mix(in_srgb,var(--ck-palette-surface-elevated-primary)_90%,transparent)) shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--color-fixed-white)_60%,transparent),inset_0_-1px_2px_color-mix(in_srgb,var(--color-fixed-white)_20%,transparent)]",
        radius === "messageBubble" &&
          "rounded-[var(--ck-bubble-radius,var(--radius-pill))]"
      )}
      data-ck-overlay-material="css"
      data-ck-overlay-variant="transcript-chip"
    >
      {button}
    </div>
  );
};

export { RequestActionChip };

export type { RequestActionChipProps };
