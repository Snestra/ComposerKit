"use client";

// Lucide artwork is covered by components/icon/lucide.license.

/* oxlint-disable react/no-clone-element, anti-slop/no-runtime-typeof, shadcn/no-arbitrary-values, shadcn/no-restyle -- The Modal dialog host and the shell restyle one frame with measured values. */
/* oxlint-disable complexity -- DialogLayout and DialogShell keep one branch per case. */
/* oxlint-disable shadcn/require-static-classes -- The image sheet and frame classes come from the dialog CSS module. */

import { DataButton } from "@workspace/react/components/button/data-button";
import {
  isNil,
  mergeRefs,
  useIsClient,
} from "@workspace/react/components/dialog/dialog-layer";
import {
  Modal,
  useModalRequestClose,
} from "@workspace/react/components/dialog/modal";
import { createIcon } from "@workspace/react/components/icon";
import { Button } from "@workspace/react/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortalContainerProvider,
  DialogTitle,
  useOverlayOwner,
} from "@workspace/react/components/ui/dialog";
import type {
  DialogProps,
  DialogSize,
  DialogVariant,
} from "@workspace/react/components/ui/dialog";
import type { LayerEvent } from "@workspace/react/lib/dismissable-layer";
import { noCleanup } from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type {
  ComponentProps,
  ReactNode,
  Ref,
  SubmitEvent as ReactSubmitEvent,
} from "react";
import { createPortal } from "react-dom";

import styles from "@workspace/react/components/ui/dialog.module.css";

const DEFAULT_CLOSE_LABEL = "Close dialog";

const ModalCloseGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "xmark-20",
});

const SheetCloseGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 24, viewBox: "0 0 24 24", width: 24 },
  name: "xmark-24",
});

/** The link glyph. */
const LinkGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "link-16",
});

/* ------------------------------------------------------- scroll fade --- */

type ScrollFadeKind = "divider" | "mask" | "overlay";

interface ScrollFadeProps {
  children?: ReactNode;
  className?: string;
  /** `overlay` (default), `divider` or `mask`. */
  fade?: ScrollFadeKind;
  fadeClassName?: string;
  onOverflowChange?: (overflow: boolean) => void;
  /** Sizes the scroll area to a whole number of menu items. */
  peekMenuItems?: boolean;
  scrollClassName?: string;
  scrollProps?: ComponentProps<"div">;
}

const MENU_ITEMS =
  '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

/**
 * A scroll area that reports overflow and
 * the scroll direction as data attributes, and shows a divider, an overlay
 * or a mask at an edge that can still scroll.
 */
const ScrollFade = ({
  children,
  className,
  fade = "overlay",
  fadeClassName,
  onOverflowChange,
  peekMenuItems = false,
  scrollClassName,
  scrollProps,
}: ScrollFadeProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const latestOverflow = useRef(onOverflowChange);

  useLayoutEffect(() => {
    latestOverflow.current = onOverflowChange;
  });

  const maxHeightProp = scrollProps?.style?.maxHeight;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const scroll = scrollRef.current;
    const inner = innerRef.current;

    if (isNil(root) || isNil(scroll) || isNil(inner)) {
      return noCleanup;
    }

    const report = () => {
      const overflow =
        (fade === "overlay" ? inner : scroll).scrollHeight >
        scroll.clientHeight + 1;

      const canScrollDown =
        scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1;

      latestOverflow.current?.(overflow);
      root.dataset.ckHasOverflow = overflow ? "true" : "false";
      root.dataset.ckCanScrollUp = scroll.scrollTop > 1 ? "true" : "false";
      root.dataset.ckCanScrollDown =
        overflow && canScrollDown ? "true" : "false";
    };

    const originalMaxHeight = scroll.style.maxHeight;
    let peekMaxHeight: string | undefined;

    const update = () => {
      if (peekMenuItems) {
        const { scrollTop } = scroll;
        scroll.style.maxHeight = originalMaxHeight;
        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        peekMaxHeight = undefined;
        const { clientHeight } = scroll;

        if (scroll.scrollHeight > clientHeight + 1) {
          const box = scroll.getBoundingClientRect();
          const scale = box.height / scroll.offsetHeight;
          let fitting = 0;

          if (scale > 0) {
            for (const item of inner.querySelectorAll(MENU_ITEMS)) {
              const rect = item.getBoundingClientRect();

              const middle =
                (rect.top - box.top + rect.height / 2) / scale -
                scroll.clientTop +
                scroll.scrollTop;

              if (rect.height > 0 && middle <= clientHeight) {
                fitting = Math.max(fitting, middle);
              }
            }
          }

          if (fitting > 0) {
            peekMaxHeight = `${fitting}px`;
            scroll.style.maxHeight = peekMaxHeight;
          }
        }

        scroll.scrollTop = scrollTop;
      }

      report();
    };

    update();
    scroll.addEventListener("scroll", report, { passive: true });

    const resize =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(update);

    resize?.observe(scroll);
    resize?.observe(inner);
    const mutation = peekMenuItems ? new MutationObserver(update) : undefined;
    mutation?.observe(inner, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    if (peekMenuItems) {
      window.addEventListener("resize", update);
    }

    return () => {
      scroll.removeEventListener("scroll", report);
      resize?.disconnect();
      mutation?.disconnect();
      window.removeEventListener("resize", update);

      if (scroll.style.maxHeight === peekMaxHeight) {
        scroll.style.maxHeight = originalMaxHeight;
      }
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- The effect reads the scroll element's inline max-height, which follows this prop, so it must run again when the prop changes ().
  }, [fade, peekMenuItems, maxHeightProp]);

  return (
    <div
      className={cn("group", styles.scrollFadeRoot, className)}
      data-ck-can-scroll-down="false"
      data-ck-can-scroll-up="false"
      data-ck-has-overflow="false"
      ref={rootRef}
    >
      <div
        {...scrollProps}
        className={cn(
          fade === "mask" && styles.scrollFadeMask,
          scrollClassName,
          scrollProps?.className
        )}
        ref={mergeRefs<HTMLDivElement>(scrollRef, scrollProps?.ref)}
      >
        <div ref={innerRef}>{children}</div>
      </div>
      {fade === "divider" && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 hidden border-t border-stroke-subtle group-data-[can-scroll-up=true]:block"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden border-t border-stroke-subtle group-data-[can-scroll-down=true]:block"
          />
        </>
      )}
      {fade === "overlay" && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 hidden h-10 bg-linear-to-b from-transparent to-panel-elevated-secondary/90 group-data-[can-scroll-down=true]:block",
            fadeClassName
          )}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------ dialog layout --- */

type DialogLayoutVariant = "compact" | "default" | "sectioned";

interface DialogLayoutProps {
  children?: ReactNode;
  /** With no children, the scrolling body row is dropped. */
  collapseEmptyContent?: boolean;
  footer?: ReactNode;
  header?: ReactNode;
  headerContent?: ReactNode;
  onSubmit?: (event: ReactSubmitEvent<HTMLFormElement>) => void;
  variant?: DialogLayoutVariant;
}

/**
 * A grid of a header row, a scrolling
 * body row and a footer row. With `onSubmit` the grid is a form.
 */
const DialogLayout = ({
  children,
  collapseEmptyContent = false,
  footer,
  header,
  headerContent,
  onSubmit,
  variant = "default",
}: DialogLayoutProps) => {
  const collapsed = collapseEmptyContent && isNil(children);
  const compact = variant === "compact";
  const sectioned = variant === "sectioned";
  const plain = variant === "default";

  const content = compact ? (
    <ScrollFade
      className="relative -mx-5 -mt-2 flex min-h-0 flex-col"
      fade="divider"
      scrollClassName="min-h-0 overflow-y-auto overscroll-contain px-5 pt-2 pb-5"
    >
      {header}
      {!isNil(headerContent) && <div className="pt-5">{headerContent}</div>}
      {!isNil(children) && <div className="pt-5">{children}</div>}
    </ScrollFade>
  ) : (
    <>
      <div
        className={cn(
          "min-h-0 overflow-y-auto overscroll-contain",
          plain && "-mt-2 pt-2"
        )}
      >
        <div className={cn(sectioned && "ps-6 pe-4 pt-4")}>{header}</div>
        {!isNil(headerContent) && (
          <div className="px-6 pt-4 empty:hidden">{headerContent}</div>
        )}
      </div>
      {collapsed ? null : (
        <ScrollFade
          className={cn(
            "relative flex flex-col",
            plain && "-mx-5 min-h-24",
            sectioned && "min-h-0"
          )}
          fade="divider"
          scrollClassName={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            sectioned && "px-6",
            plain && "px-5"
          )}
        >
          <div
            className={cn(
              sectioned && cn("pb-6", isNil(headerContent) ? "pt-4" : "pt-6"),
              plain && "py-5"
            )}
          >
            {children}
          </div>
        </ScrollFade>
      )}
    </>
  );

  const rows = cn(
    "grid grid-cols-1",
    compact && "grid-rows-[minmax(0,1fr)_auto]",
    !compact &&
      (collapsed
        ? "grid-rows-[minmax(0,max-content)_auto]"
        : "grid-rows-[minmax(0,max-content)_1fr_auto]")
  );

  return (
    <DialogBody
      as={isNil(onSubmit) ? "div" : "form"}
      className={rows}
      size="scrollable"
      variant={sectioned ? "sectioned" : "default"}
      onSubmit={onSubmit}
    >
      {content}
      {sectioned && !isNil(footer) && (
        <Modal.Footer className="flex-wrap">{footer}</Modal.Footer>
      )}
      {!sectioned && (
        <DialogFooter className="shrink-0 flex-wrap" expandSingleButton={false}>
          {footer}
        </DialogFooter>
      )}
    </DialogBody>
  );
};

/* -------------------------------------------------------- Modal dialog --- */

interface ModalDialogContentProps {
  children?: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  headerContent?: ReactNode;
  /** Locks the close button and denies every close request. */
  isDismissalDisabled?: boolean;
  /** With no footer, shows a disabled "Copy link" and "Done" pair. */
  isLoading?: boolean;
  /** Called when a close is requested; answer `"deny"` to keep the dialog open. */
  onRequestClose?: () => "allow" | "deny" | undefined;
  onPortalContainerChange?: Ref<HTMLDivElement>;
  onSubmit?: () => void;
  subtitle?: ReactNode;
  title?: ReactNode;
  variant?: DialogLayoutVariant;
  /** Breaks a long title over lines instead of truncating it. */
  wrapTitle?: boolean;
}

/** The title row, close button and footer of a Modal dialog. */
const ModalDialogContent = ({
  children,
  footer,
  headerActions,
  headerContent,
  isDismissalDisabled = false,
  isLoading = false,
  onPortalContainerChange,
  onRequestClose,
  onSubmit,
  subtitle,
  title,
  variant = "sectioned",
  wrapTitle = false,
}: ModalDialogContentProps) => {
  const requestClose = () =>
    isDismissalDisabled ? "deny" : (onRequestClose?.() ?? "allow");

  const { close } = useModalRequestClose({ onRequestClose: requestClose });

  const headerRow = (
    <div className="flex items-start gap-3">
      <DialogHeader
        className="min-w-0 flex-1"
        subtitle={
          isNil(subtitle) || variant === "compact" ? undefined : (
            <Modal.Description className="contents">
              {subtitle}
            </Modal.Description>
          )
        }
        title={<Modal.Title className="contents">{title}</Modal.Title>}
        titleClassName={wrapTitle ? "break-words" : "truncate"}
      />
      <div className="relative -top-1 flex shrink-0 items-center gap-3">
        {headerActions}
        <DataButton
          aria-label={DEFAULT_CLOSE_LABEL}
          color="primary"
          disabled={isDismissalDisabled}
          iconSize="lg"
          size="xl"
          uniform
          variant="ghost"
          onClick={() => {
            if (requestClose() === "allow") {
              close();
            }
          }}
        >
          <ModalCloseGlyph />
        </DataButton>
      </div>
      {isNil(subtitle) && (
        <Modal.Description className="sr-only">{subtitle}</Modal.Description>
      )}
    </div>
  );

  const header = (
    <>
      {headerRow}
      {variant === "compact" && !isNil(subtitle) && (
        <div className="pt-6 text-text-subtle">
          <Modal.Description className="contents">{subtitle}</Modal.Description>
        </div>
      )}
    </>
  );

  const bottom =
    isLoading && isNil(footer) ? (
      <>
        <div className="me-auto">
          <DataButton
            color="primary"
            disabled
            size="xl"
            type="button"
            variant="outline"
          >
            <LinkGlyph />
            Copy link
          </DataButton>
        </div>
        <Modal.Close>
          <DataButton
            color="primary"
            disabled={isDismissalDisabled}
            size="xl"
            type="button"
          >
            Done
          </DataButton>
        </Modal.Close>
      </>
    ) : (
      footer
    );

  return (
    <DialogLayout
      footer={bottom}
      header={header}
      headerContent={headerContent}
      variant={variant}
      onSubmit={
        isNil(onSubmit)
          ? undefined
          : (event) => {
              event.preventDefault();
              event.stopPropagation();

              if (!isDismissalDisabled && !isLoading) {
                onSubmit();
              }
            }
      }
    >
      {variant === "compact" && isNil(children) ? null : (
        <div className="contents" ref={onPortalContainerChange}>
          {children}
        </div>
      )}
    </DialogLayout>
  );
};

interface ModalDialogHostProps {
  animateOnMount?: boolean;
  children?: ReactNode;
  onClose?: () => void;
  onCloseAutoFocus?: (event: LayerEvent) => void;
  /** Keeps the dialog's top edge still while its height changes. */
  preserveTopOnResize?: boolean;
}

/** A fixed viewport layer holding an open Modal. */
const ModalDialogHost = ({
  animateOnMount = true,
  children,
  onClose,
  onCloseAutoFocus,
  preserveTopOnResize = false,
}: ModalDialogHostProps) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null | undefined>(undefined);
  const owner = useOverlayOwner();
  const isClient = useIsClient();

  useLayoutEffect(() => {
    const dialog = container?.querySelector<HTMLElement>('[role="dialog"]');
    const parent = dialog?.parentElement;

    if (
      !preserveTopOnResize ||
      isNil(dialog) ||
      isNil(parent) ||
      typeof ResizeObserver === "undefined"
    ) {
      return noCleanup;
    }

    let height = dialog.offsetHeight;
    let anchorHeight: number | undefined;
    let width = dialog.offsetWidth;
    let parentHeight = parent.clientHeight;

    const observer = new ResizeObserver((entries) => {
      height =
        entries.find((entry) => entry.target === dialog)?.borderBoxSize[0]
          ?.blockSize ?? height;

      if (isNil(anchorHeight)) {
        anchorHeight = height;
      }

      if (getComputedStyle(dialog).position !== "static") {
        dialog.style.removeProperty("translate");

        return;
      }

      if (
        dialog.offsetWidth !== width ||
        parent.clientHeight !== parentHeight
      ) {
        anchorHeight = height;
        width = dialog.offsetWidth;
        parentHeight = parent.clientHeight;
      }

      const padding =
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- The padding is a length such as "16px", which Number cannot read.
        Number.parseFloat(getComputedStyle(parent).paddingBottom) || 0;

      const shift = Math.min(
        (height - anchorHeight) / 2,
        Math.max(0, (parent.clientHeight - height) / 2 - padding)
      );

      dialog.style.translate = `0 ${shift}px`;
    });

    observer.observe(dialog);
    observer.observe(parent);

    return () => {
      observer.disconnect();
      dialog.style.removeProperty("translate");
    };
  }, [container, preserveTopOnResize]);

  const attach = useCallback((element: HTMLDivElement | null) => {
    if (!isNil(element) && isNil(previouslyFocused.current)) {
      const active = element.ownerDocument.activeElement;
      previouslyFocused.current =
        active instanceof HTMLElement &&
        active !== element.ownerDocument.body &&
        active !== element.ownerDocument.documentElement
          ? active
          : null;
    }

    if (!isNil(element)) {
      setContainer(element);
    }
  }, []);

  if (!isClient) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 h-[calc(100dvh/var(--ui-display-scale,1))] w-[calc(100vw/var(--ui-display-scale,1))] [zoom:var(--ui-display-scale,1)] contain-layout"
      data-ck-overlay-owner={owner?.id}
      ref={attach}
    >
      {!isNil(container) && (
        <DialogPortalContainerProvider value={container}>
          <Modal defaultOpen>
            <Modal.Content
              animateOnMount={animateOnMount}
              className="bg-[light-dark(var(--ck-palette-surface-surface),var(--ck-palette-surface-editor-opaque))]"
              maxWidth={512}
              onAfterClose={onClose}
              onCloseAutoFocus={(event) => {
                const active = container.ownerDocument.activeElement;

                if (
                  active === container.ownerDocument.body ||
                  container.contains(active)
                ) {
                  onCloseAutoFocus?.(event);

                  if (
                    !event.defaultPrevented &&
                    previouslyFocused.current?.isConnected === true
                  ) {
                    previouslyFocused.current.focus({ preventScroll: true });
                  }
                }

                event.preventDefault();
              }}
            >
              {children}
            </Modal.Content>
          </Modal>
        </DialogPortalContainerProvider>
      )}
    </div>,
    document.body
  );
};

interface ModalDialogProps
  extends
    ModalDialogContentProps,
    Omit<ModalDialogHostProps, "children" | "onCloseAutoFocus"> {}

/** A Modal dialog with a title, close button, body and footer. */
const ModalDialog = ({
  animateOnMount,
  onClose,
  preserveTopOnResize,
  ...content
}: ModalDialogProps) => (
  <ModalDialogHost
    animateOnMount={animateOnMount}
    preserveTopOnResize={preserveTopOnResize}
    onClose={onClose}
  >
    <ModalDialogContent {...content} />
  </ModalDialogHost>
);

/* -------------------------------------------------------- dialog shell --- */

interface DialogShellProps {
  children?: ReactNode;
  collapseEmptyContent?: boolean;
  compactImageSheetFooter?: boolean;
  footer?: ReactNode;
  headerActions?: ReactNode;
  headerContent?: ReactNode;
  isDismissalDisabled?: boolean;
  onClose: () => void;
  onCloseAutoFocus?: (event: LayerEvent) => void;
  onOpenAutoFocus?: (event: LayerEvent) => void;
  onPortalContainerChange?: (element: HTMLElement) => void;
  onSubmit?: () => void;
  presentation?: "imageSheet";
  size?: DialogSize;
  subtitle?: ReactNode;
  title?: ReactNode;
  variant?: DialogVariant;
}

/**
 * The standard shell, an open
 * Dialog with a title, optional subtitle, form submit and a lock that stops
 * every close. `presentation="imageSheet"` draws the image sheet.
 */
const DialogShell = ({
  children,
  collapseEmptyContent = false,
  compactImageSheetFooter = false,
  footer,
  headerActions,
  headerContent,
  isDismissalDisabled = false,
  onClose,
  onCloseAutoFocus,
  onOpenAutoFocus,
  onPortalContainerChange,
  onSubmit,
  presentation,
  size,
  subtitle,
  title,
  variant,
}: DialogShellProps) => {
  const imageSheet = presentation === "imageSheet";

  const handleSubmit = (event: ReactSubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isDismissalDisabled) {
      onSubmit?.();
    }
  };

  const heading = imageSheet ? (
    <div
      className={cn(
        "shrink-0",
        styles.imageSheetHeader,
        compactImageSheetFooter && styles.imageSheetTwoRowsHeader
      )}
    >
      <DialogTitle className={styles.imageSheetTitle}>{title}</DialogTitle>
      {!isNil(subtitle) && (
        <DialogDescription className={styles.imageSheetSubtitle}>
          {subtitle}
        </DialogDescription>
      )}
      {!isDismissalDisabled && (
        <Button
          aria-label={DEFAULT_CLOSE_LABEL}
          className={cn(
            styles.imageSheetClose,
            compactImageSheetFooter && styles.imageSheetTwoRowsClose
          )}
          unstyled
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <SheetCloseGlyph />
        </Button>
      )}
    </div>
  ) : (
    <div className="mb-2 flex items-center gap-2 pe-8">
      <DialogHeader
        className="min-w-0 flex-1"
        subtitle={
          isNil(subtitle) ? undefined : (
            <DialogDescription className="contents">
              {subtitle}
            </DialogDescription>
          )
        }
        title={<DialogTitle className="contents">{title}</DialogTitle>}
        titleClassName="truncate"
      />
      {headerActions}
    </div>
  );

  const header = (
    <>
      {heading}
      {headerContent}
    </>
  );

  const contentProps: NonNullable<DialogProps["contentProps"]> = {
    ...(isNil(subtitle) ? { "aria-describedby": undefined } : null),
    onCloseAutoFocus,
    onOpenAutoFocus: (event) => {
      if (event.currentTarget instanceof HTMLElement) {
        onPortalContainerChange?.(event.currentTarget);
      }

      onOpenAutoFocus?.(event);
    },
    shouldStopPointerDownPropagation: false,
  };

  return (
    <Dialog
      contentClassName={imageSheet ? styles.imageSheetSurface : undefined}
      contentOverflow="visible"
      contentProps={contentProps}
      open
      overlayClassName={imageSheet ? styles.imageSheetOverlay : undefined}
      shouldIgnoreClickOutside={isDismissalDisabled}
      showDialogClose={!isDismissalDisabled && !imageSheet}
      size={size}
      unstyledContent={imageSheet}
      variant={variant ?? "opaque"}
      onOpenChange={(open) => {
        if (!open && !isDismissalDisabled) {
          onClose();
        }
      }}
    >
      {imageSheet ? (
        <DialogBody
          as={isNil(onSubmit) ? "div" : "form"}
          className={cn(
            styles.imageSheetBody,
            "min-h-0",
            compactImageSheetFooter && styles.imageSheetTwoRowsBody
          )}
          variant="sectioned"
          onSubmit={isNil(onSubmit) ? undefined : handleSubmit}
        >
          <div className="flex min-h-0 flex-col">
            {header}
            {children}
          </div>
          <div
            className={cn(
              "shrink-0",
              compactImageSheetFooter ? "mt-2" : "mt-12"
            )}
          >
            {footer}
          </div>
        </DialogBody>
      ) : (
        <DialogLayout
          collapseEmptyContent={collapseEmptyContent}
          footer={footer}
          header={header}
          onSubmit={isNil(onSubmit) ? undefined : handleSubmit}
        >
          {children}
        </DialogLayout>
      )}
    </Dialog>
  );
};

/* -------------------------------------------------------- dialog frame --- */

/**
 * The large anchored frame, 460px
 * tall and 720px wide, which fills the screen without radius or shadow under
 * 768px. Its overlay is transparent.
 */
const DialogFrame = (props: DialogProps) => (
  <Dialog
    {...props}
    contentClassName={cn(
      styles.anchoredFrame,
      "flex h-[min(calc(var(--spacing)*115),calc(100dvh/var(--ui-display-scale,1)-var(--spacing)*10))] w-[min(calc(var(--spacing)*180),calc(100vw/var(--ui-display-scale,1)-var(--spacing)*8))] max-w-none min-w-0 flex-col max-md:h-[calc(100dvh/var(--ui-display-scale,1))] max-md:w-[calc(100vw/var(--ui-display-scale,1))] max-md:rounded-none max-md:shadow-none"
    )}
    contentPosition="anchored"
    overlayClassName="bg-transparent"
    variant="sectioned"
  />
);

export {
  DialogFrame,
  DialogLayout,
  DialogShell,
  ModalDialog,
  ModalDialogContent,
  ModalDialogHost,
  ScrollFade,
};

export type {
  DialogLayoutProps,
  DialogLayoutVariant,
  DialogShellProps,
  ModalDialogContentProps,
  ModalDialogHostProps,
  ModalDialogProps,
  ScrollFadeProps,
};
