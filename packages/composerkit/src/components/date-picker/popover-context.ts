import { createContext, use } from "react";
import type { RefObject } from "react";

/* Shared popover state for its parts and callers, including hover state and refs. */

const SIDES = ["bottom", "left", "right", "top"] as const;
const ALIGNS = ["center", "end", "start"] as const;

export type PopoverSide = (typeof SIDES)[number];

export type PopoverAlign = (typeof ALIGNS)[number];

export const isSide = (value: string): value is PopoverSide =>
  SIDES.some((side) => side === value);

export const isAlign = (value: string): value is PopoverAlign =>
  ALIGNS.some((align) => align === value);

export interface PopoverState {
  contentId: string;
  contentRef: RefObject<HTMLDivElement | null>;
  hoverOpenFocusTarget: RefObject<HTMLElement | null>;
  isPointerInTransitRef: RefObject<boolean>;
  onTriggerEnter: () => void;
  onTriggerLeave: () => void;
  open: boolean;
  setOpen: (next: boolean) => void;
  setShake: (next: boolean) => void;
  shake: boolean;
  showOnHover: boolean;
  temporarilyPreventClickToClose: boolean;
  triggerRef: RefObject<HTMLElement | null>;
}

export const PopoverContext = createContext<PopoverState | null>(null);

/** The popover's state, for the parts and for callers. */
export const usePopoverContext = (): PopoverState => {
  const state = use(PopoverContext);

  if (state === null) {
    throw new Error("Place popover parts under a Popover root");
  }

  return state;
};
