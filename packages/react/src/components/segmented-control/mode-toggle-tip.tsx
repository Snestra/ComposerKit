"use client";

// Lucide artwork is covered by components/icon/lucide.license.

/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values, shadcn/require-static-classes -- The coachmark surface is an unstyled popover with measured values that have no theme token (the coachmark colours, the 36 x 14 arrow). */
import { Popover } from "@base-ui/react/popover";
import { createIcon } from "@workspace/react/components/icon";
import { useEffect } from "react";
import type { ReactNode } from "react";

const CloseIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-16",
});

interface ModeToggleTipProps {
  /** The button the tip points at. */
  anchor: HTMLElement;
  body: ReactNode;
  /** Accessible name of the close button. */
  closeLabel?: string;
  id: string;
  /** Called by the close button and by Escape; focus then returns to the anchor. */
  onDismiss: () => void;
  title?: ReactNode;
}

// The coachmark with its default props:
// align center, size default, below the anchor. The surface colours are the
// --color-fill-coachmark (--blue-500) and --color-text-coachmark
// (--white); neither depends on the theme.
const popupClasses =
  "group relative z-50 flex w-60 items-start gap-2 rounded-xl bg-(--color-status-info-solid) p-3 text-sm text-white shadow-lg outline-hidden select-none [-webkit-app-region:no-drag]";

// The 36 x 14 arrow, drawn above the surface for side bottom and
// flipped with -scale-y-100.
const arrowClasses =
  "pointer-events-none text-(--color-status-info-solid) absolute left-1/2 hidden h-3.5 w-9 origin-top -translate-x-1/2 overflow-visible group-data-[side=bottom]:top-0 group-data-[side=bottom]:block group-data-[side=bottom]:-scale-y-100 group-data-[side=top]:top-full group-data-[side=top]:block";

const closeButtonClasses =
  "relative flex size-4 shrink-0 cursor-default items-center justify-center rounded-sm before:absolute before:-inset-1 focus-visible:outline-2 focus-visible:outline-current";

// `sideOffset`: 18 for align center, multiplied by the UI scale, which is 1
// without a provider.
const SIDE_OFFSET = 18;
const COLLISION_PADDING = 9;

// A DismissableLayer listens for Escape only in the topmost open layer. The ids of the open tips, oldest
// first, stand for that stack.
const openTipIds: string[] = [];

const useTipLayer = (id: string) => {
  useEffect(() => {
    openTipIds.push(id);

    return () => {
      openTipIds.splice(openTipIds.lastIndexOf(id), 1);
    };
  }, [id]);
};

const ModeToggleTip = ({
  anchor,
  body,
  closeLabel = "Close tooltip",
  id,
  onDismiss,
  title,
}: ModeToggleTipProps) => {
  useTipLayer(id);

  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;

  const dismiss = () => {
    onDismiss();
    anchor.focus();
  };

  return (
    <Popover.Root
      modal={false}
      onOpenChange={(open, details) => {
        // The component ignores presses outside and focus changes
        // (onInteractOutside preventDefault); Escape closes.
        if (
          !open &&
          details.reason === "escape-key" &&
          openTipIds.at(-1) === id
        ) {
          dismiss();
        }
      }}
      open
    >
      <Popover.Portal>
        <Popover.Positioner
          align="center"
          anchor={anchor}
          className="z-50"
          collisionPadding={COLLISION_PADDING}
          side="bottom"
          sideOffset={SIDE_OFFSET}
        >
          <Popover.Popup
            aria-describedby={title === undefined ? undefined : bodyId}
            aria-labelledby={title === undefined ? bodyId : titleId}
            className={popupClasses}
            finalFocus={false}
            id={id}
            initialFocus={false}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {title === undefined ? null : (
                <div className="font-semibold" id={titleId}>
                  {title}
                </div>
              )}
              <div id={bodyId}>{body}</div>
            </div>
            <button
              aria-label={closeLabel}
              className={closeButtonClasses}
              onClick={(event) => {
                event.stopPropagation();
                dismiss();
              }}
              type="button"
            >
              <CloseIcon />
            </button>
            <svg
              aria-hidden="true"
              className={arrowClasses}
              fill="currentColor"
              viewBox="0 0 36 14"
            >
              <path d="M0 0C8 0 11 3.5 14.5 8.2L16.2 10.5C17.1 11.8 18.9 11.8 19.8 10.5L21.5 8.2C25 3.5 28 0 36 0V-1H0Z" />
            </svg>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};

export { ModeToggleTip };

export type { ModeToggleTipProps };
