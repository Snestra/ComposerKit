"use client";

import {
  ChevronLeft20Icon,
  ChevronRight20Icon,
} from "composerkit/components/carousel/icons";
import { Button } from "composerkit/components/ui/button";
import { Dialog, DialogTitle } from "composerkit/components/ui/dialog";
import { useRef } from "react";
import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";

/** A click that moves less than this many pixels counts as a click, not a drag. */
const CLICK_TRAVEL_LIMIT = 5;

const INTERACTIVE_TARGETS =
  'button, a, input, textarea, select, video, iframe, [role="toolbar"], [role="menu"], [role="menuitem"], [data-ck-annotation-control], [data-ck-image-preview-composer], [contenteditable="true"]';

export interface ImagePreviewDialogProps {
  /** Disables the navigation buttons and makes the image area inert. */
  busy?: boolean;
  /** The image area. */
  children?: ReactNode;
  /** An editing mode in the image area turns off arrow keys and click dismissal. */
  editing?: boolean;
  /** Content under the image row, for example the position counter. */
  footer?: ReactNode;
  /** The image element. A click inside its box never dismisses. */
  imageRef?: RefObject<HTMLElement | null>;
  /** Space under the footer for a composer (the `px-6 pb-6` row). */
  composer?: ReactNode;
  /** Label of the next button. The default is "Next image". */
  nextLabel?: string;
  /** Keeps the next button but disables it, as the video lightbox does at the last item. */
  nextDisabled?: boolean;
  onNext?: () => void;
  onOpenChange: (open: boolean) => void;
  onPrevious?: () => void;
  open?: boolean;
  /** Keeps the previous button but disables it, as the video lightbox does at the first item. */
  previousDisabled?: boolean;
  /** Label of the previous button. The default is "Previous image". */
  previousLabel?: string;
  /** The screen reader only title. The default is "Image preview". */
  title?: string;
}

const isDismissTarget = (
  event: MouseEvent<HTMLElement>,
  imageRef: RefObject<HTMLElement | null> | undefined
) => {
  const { target } = event;

  if (
    !(target instanceof Element) ||
    !event.currentTarget.contains(target) ||
    target.closest(INTERACTIVE_TARGETS)
  ) {
    return false;
  }

  const box = imageRef?.current?.getBoundingClientRect();

  return (
    box === undefined ||
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
};

const hasModifier = (event: KeyboardEvent<HTMLElement>) =>
  event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

/**
 * The image preview dialog: a flex
 * column with the image area, w-18 gutters for Previous image and Next image,
 * and a footer row. ArrowLeft and ArrowRight navigate, and a click that moves
 * less than 5px outside the image dismisses it.
 */
export const ImagePreviewDialog = ({
  busy = false,
  children,
  composer,
  editing = false,
  footer,
  imageRef,
  nextDisabled = false,
  nextLabel = "Next image",
  onNext,
  onOpenChange,
  onPrevious,
  open = true,
  previousDisabled = false,
  previousLabel = "Previous image",
  title = "Image preview",
}: ImagePreviewDialogProps) => {
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const inToolbar =
      event.target instanceof Element &&
      event.target.closest('[role="toolbar"]') !== null;

    if (
      busy ||
      editing ||
      event.defaultPrevented ||
      hasModifier(event) ||
      event.nativeEvent.isComposing ||
      inToolbar
    ) {
      return;
    }

    let navigate: (() => void) | undefined;

    if (event.key === "ArrowLeft" && !previousDisabled) {
      navigate = onPrevious;
    } else if (event.key === "ArrowRight" && !nextDisabled) {
      navigate = onNext;
    }

    if (navigate === undefined) {
      return;
    }

    event.preventDefault();
    navigate();
  };

  const onPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    pressStart.current =
      !editing &&
      event.isPrimary &&
      event.button === 0 &&
      isDismissTarget(event, imageRef)
        ? { x: event.clientX, y: event.clientY }
        : null;
  };

  const onPointerMoveCapture = (event: PointerEvent<HTMLDivElement>) => {
    const start = pressStart.current;

    if (
      start !== null &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) >
        CLICK_TRAVEL_LIMIT
    ) {
      pressStart.current = null;
    }
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const pressed = pressStart.current !== null;
    pressStart.current = null;

    if (
      !editing &&
      pressed &&
      event.detail > 0 &&
      !event.defaultPrevented &&
      isDismissTarget(event, imageRef)
    ) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      contentProps={{
        "aria-describedby": undefined,
        onClick,
        // The component stops the built-in outside dismissal, so only the click rule above closes it.
        onInteractOutside: (event) => {
          event.preventDefault();
        },
        onKeyDown,
        onPointerCancelCapture: () => {
          pressStart.current = null;
        },
        onPointerDownCapture,
        onPointerMoveCapture,
      }}
      open={open}
      showDialogClose={false}
      variant="image"
      viewportSized
      onOpenChange={onOpenChange}
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1">
          <div className="pointer-events-none relative z-30 flex w-18 shrink-0 items-center justify-center">
            {onPrevious === undefined ? null : (
              <Button
                aria-label={previousLabel}
                className="pointer-events-auto"
                disabled={busy || previousDisabled}
                uniform
                onClick={onPrevious}
              >
                <ChevronLeft20Icon aria-hidden />
              </Button>
            )}
          </div>
          <div
            className="@container relative min-h-0 min-w-0 flex-1"
            inert={busy}
          >
            {children}
          </div>
          <div className="pointer-events-none relative z-30 flex w-18 shrink-0 items-center justify-center">
            {onNext === undefined ? null : (
              <Button
                aria-label={nextLabel}
                className="pointer-events-auto"
                disabled={busy || nextDisabled}
                uniform
                onClick={onNext}
              >
                <ChevronRight20Icon aria-hidden />
              </Button>
            )}
          </div>
        </div>
        <div className="relative z-30 shrink-0">
          {footer === undefined ? null : (
            <div className="flex min-w-0 items-center justify-center gap-3 p-4 text-sm">
              {footer}
            </div>
          )}
          {composer === undefined ? null : (
            <div
              className="px-6 pb-6"
              data-ck-image-preview-composer
              inert={busy}
            >
              {composer}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
