"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
// Lucide artwork is covered by components/icon/lucide.license.
/* oxlint-disable react/no-react-children, react/no-clone-element, anti-slop/no-runtime-typeof, shadcn/no-arbitrary-values, shadcn/no-restyle, shadcn/no-inline-styles -- The dialog restyles one frame per variant with measured values, and its footer walks and clones its children. */
/* oxlint-disable complexity -- The overlay and the content keep one branch per case. */
/* oxlint-disable shadcn/no-unknown-classes -- `dialog-surface` and `overlay-layer` are the marker classes; other stylesheets select them. */
import {
  AUTOFOCUS_ON_MOUNT,
  AUTOFOCUS_ON_UNMOUNT,
  containsDeep,
  deepActiveElement,
  focusElement,
  focusFirstCandidate,
  isNil,
  loopTabKey,
  mergeRefs,
  useFocusScope,
} from "@workspace/react/components/dialog/dialog-layer";
import { createIcon } from "@workspace/react/components/icon";
import { Button } from "@workspace/react/components/ui/button";
import {
  TooltipOverlayOwnerProvider,
  TooltipZoomProvider,
  dismissTooltips,
} from "@workspace/react/components/ui/tooltip";
import {
  LayerEvent,
  noCleanup,
  useDismissableLayer,
  useDismissableLayerSurface,
} from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import { ChevronDown as LucideChevronDown } from "lucide-react";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentProps, CSSProperties, ReactNode, Ref } from "react";

import styles from "./dialog.module.css";

/* -------------------------------------------------------------- types --- */

type DialogVariant =
  | "beacon"
  | "beaconModal"
  | "catalog"
  | "centeredText"
  | "sectioned"
  | "sectionedConfirmation"
  | "confirmation"
  | "creditCheckout"
  | "default"
  | "detailPanel"
  | "expressiveBeacon"
  | "form"
  | "image"
  | "mediaDetail"
  | "onboarding"
  | "opaque"
  | "photoSetup"
  | "promotional"
  | "translucent"
  | "voicePicker";

type DialogSize =
  | "appLauncher"
  | "beacon"
  | "catalogDetail"
  | "catalogSetup"
  | "compact"
  | "default"
  | "edgeToEdgeSheet"
  | "editor"
  | "feature"
  | "feedback"
  | "large"
  | "medium"
  | "narrow"
  | "pinEntry"
  | "responsiveSheet"
  | "setup"
  | "share"
  | "sheet"
  | "splitCatalog"
  | "square"
  | "wide"
  | "wideTall"
  | "xwide"
  | "xwideTall"
  | "xxwide"
  | "xxxwideTall";

type DialogContentPosition =
  | "anchored"
  | "centered"
  | "inline"
  | "scrollable"
  | "top";

type DialogCloseButtonSize = "compact" | "default" | "large";

type DialogCloseButtonVariant = "default" | "mediaOverlay";

type DialogRadius = "compact" | "default";

type DialogBackdropKind = "modal" | "soft";

/** Sizes that become a bottom sheet on a narrow screen. */
const isResponsiveSheetSize = (size: DialogSize | undefined) =>
  size === "responsiveSheet" ||
  size === "edgeToEdgeSheet" ||
  size === "splitCatalog" ||
  size === "catalogSetup";

const SIZE_CLASSES = {
  appLauncher: "w-[750px] h-[720px]",
  beacon: "w-120",
  catalogDetail: "w-143.5",
  catalogSetup: styles.catalogSetup,
  compact: "w-105",
  default: "w-130",
  edgeToEdgeSheet: cn(styles.responsiveSheet, styles.edgeToEdgeSheet),
  editor: "w-[600px] h-[720px] max-w-full max-h-full",
  feature: "w-[400px]",
  feedback: "w-xl",
  large: "w-lg",
  medium: "w-md",
  narrow: "w-[380px]",
  pinEntry: "w-52.5",
  responsiveSheet: styles.responsiveSheet,
  setup: "h-[min(600px,calc(100dvh-2rem))] w-120",
  share: "w-160",
  sheet: "rounded-b-none",
  splitCatalog: styles.splitCatalog,
  square: "aspect-square",
  wide: "w-150",
  wideTall: "h-140 max-h-[calc(100dvh/var(--ui-display-scale,1)-2rem)] w-150",
  xwide: "w-[680px]",
  xwideTall: "h-[min(92vh,800px)] max-h-[min(92vh,800px)] w-[680px]",
  xxwide: "w-[800px]",
  xxxwideTall: "h-[min(85vh,740px)] max-h-[min(85vh,740px)] w-[960px]",
} as const satisfies Record<DialogSize, string>;

/** The width, height and sheet classes of a size. */
const sizeClassName = (size: DialogSize | undefined): string =>
  SIZE_CLASSES[size ?? "default"];

/* ---------------------------------------------------------- contexts --- */

/** Page zoom. The tooltip family reads the same value. */
const ZoomContext = createContext(1);

const useDialogZoom = () => useContext(ZoomContext);

/** Supplies the page zoom to dialogs and, tooltips. */
const DialogZoomProvider = ({
  children,
  zoom,
}: {
  children?: ReactNode;
  zoom: number;
}) => (
  <ZoomContext.Provider value={zoom}>
    <TooltipZoomProvider zoom={zoom}>{children}</TooltipZoomProvider>
  </ZoomContext.Provider>
);

interface OverlayOwner {
  id: string;
  /** Called when an overlay below it opens; may return a cleanup. */
  registerOpen?: () => (() => void) | undefined;
}

/** The surrounding overlay owner. */
const OverlayOwnerContext = createContext<OverlayOwner | undefined>(undefined);

const useOverlayOwner = () => useContext(OverlayOwnerContext);

/** Supplies the overlay owner to dialogs and, tooltips. */
const DialogOverlayOwnerProvider = ({
  children,
  id,
  registerOpen,
}: OverlayOwner & { children?: ReactNode }) => {
  const value = useMemo(() => ({ id, registerOpen }), [id, registerOpen]);

  return (
    <OverlayOwnerContext.Provider value={value}>
      <TooltipOverlayOwnerProvider id={id}>
        {children}
      </TooltipOverlayOwnerProvider>
    </OverlayOwnerContext.Provider>
  );
};

/** Where nested dialogs portal to. */
const PortalContainerContext = createContext<HTMLElement | undefined>(
  undefined
);

const DialogPortalContainerProvider = PortalContainerContext.Provider;

const useDialogPortalContainer = () => useContext(PortalContainerContext);

interface DialogRootContextValue {
  modal: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  setTrigger: (element: HTMLElement | null) => void;
  triggerRef: { current: HTMLElement | null };
}

const DialogRootContext = createContext<DialogRootContextValue | undefined>(
  undefined
);

const useDialogRoot = (part: string): DialogRootContextValue => {
  const context = useContext(DialogRootContext);

  if (!context) {
    throw new Error(`Place ${part} under a Dialog root`);
  }

  return context;
};

const DEBUG_LAYOUT_KEY = "composerkit.debug.dialogLayout";

const subscribeDebugLayout = (listener: () => void) => {
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener("storage", listener);
  };
};

const readDebugLayout = () =>
  typeof window.localStorage?.getItem === "function" &&
  window.localStorage.getItem(DEBUG_LAYOUT_KEY) === "1";

/**
 * `localStorage["composerkit.debug.dialogLayout"] === "1"` outlines the
 * layout parts. The server render has no storage, so it answers false and the
 * client switches over after hydration.
 */
const useDebugLayout = () =>
  useSyncExternalStore(subscribeDebugLayout, readDebugLayout, () => false);

const DEBUG_OUTLINE = styles.debugOutline;

const DebugLabel = ({ name }: { name: string }) => (
  <span className={styles.debugLabel}>{name}</span>
);

/* -------------------------------------------------------------- icons --- */

const CatalogCloseGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "xmark-20",
});

const LargeCloseGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "xmark-20",
});

const MediumCloseGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 20, viewBox: "0 0 24 24", width: 20 },
  name: "xmark-20",
});

const SmallCloseGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-16",
});

/** The 21px close mark of the default and opaque variants. */
const DefaultCloseMark = ({ className }: { className?: string }) => (
  <LucideChevronDown
    aria-hidden="true"
    className={className}
    height={21}
    width={21}
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth={1.5}
  />
);

/* ------------------------------------------------------------ helpers --- */

/** Radix `composeEventHandlers`: the second handler runs unless the first prevented the default. */
const compose =
  <E extends { defaultPrevented: boolean }>(
    first: ((event: E) => void) | undefined,
    second: (event: E) => void
  ) =>
  (event: E) => {
    first?.(event);

    if (!event.defaultPrevented) {
      second(event);
    }
  };

const stopPropagation = (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
};

/* ---------------------------------------------------------- the root --- */

interface DialogRootProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  /** Radix `modal`: `true` by default. */
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

/**
 * The Radix dialog root. Open state is controlled with
 * `open`/`onOpenChange` or kept inside with `defaultOpen`. Base UI's own
 * dismissal is off: Escape and outside presses run through the layer stack
 * in `DialogContent`, which is where the component decides them.
 */
const DialogRoot = ({
  children,
  defaultOpen,
  modal = true,
  onOpenChange,
  open: openProp,
}: DialogRootProps) => {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen ?? false);
  const open = openProp ?? uncontrolled;
  const openRef = useRef(open);
  const onChange = useRef(onOpenChange);

  useLayoutEffect(() => {
    openRef.current = open;
    onChange.current = onOpenChange;
  });

  const controlled = !isNil(openProp);
  const triggerRef = useRef<HTMLElement | null>(null);

  const setTrigger = useCallback((element: HTMLElement | null) => {
    triggerRef.current = element;
  }, []);

  const setOpen = useCallback(
    (next: boolean) => {
      if (next === openRef.current) {
        return;
      }

      if (!controlled) {
        setUncontrolled(next);
      }

      onChange.current?.(next);
    },
    [controlled]
  );

  const value = useMemo(
    () => ({ modal, open, setOpen, setTrigger, triggerRef }),
    [modal, open, setOpen, setTrigger]
  );

  return (
    <DialogRootContext.Provider value={value}>
      <BaseDialog.Root
        disablePointerDismissal
        modal={modal}
        open={open}
        onOpenChange={(next, details) => {
          const { reason } = details;

          if (
            reason === "escape-key" ||
            reason === "outside-press" ||
            reason === "focus-out"
          ) {
            details.cancel();

            return;
          }

          setOpen(next);
        }}
      >
        {children}
      </BaseDialog.Root>
    </DialogRootContext.Provider>
  );
};

/** A visible node is not null, undefined, false, zero or an empty string. */
const isPresent = (node: ReactNode): boolean =>
  node !== null &&
  node !== undefined &&
  node !== false &&
  node !== "" &&
  node !== 0;

/** With `asChild` the child element is rendered as the part, so its own children are the content. */
// oxlint-disable-next-line typescript/promise-function-async -- ReactNode includes promises, but this returns the node it is given.
const childContent = (asChild: boolean | undefined, children: ReactNode) =>
  asChild === true && isValidElement<{ children?: ReactNode }>(children)
    ? children.props.children
    : children;

interface DialogTriggerProps extends Omit<ComponentProps<"button">, "ref"> {
  /** Renders the single child as the trigger. Default `true`. */
  asChild?: boolean;
  /** Whether the rendered element is a native button. Default `true`. */
  nativeButton?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
}

/** Built on Radix `DialogTrigger`: `asChild` defaults to `true`. */
const DialogTrigger = ({
  asChild = true,
  children,
  nativeButton = true,
  triggerRef,
  ...props
}: DialogTriggerProps) => {
  const root = useDialogRoot("DialogTrigger");

  const { setTrigger } = root;

  const ref = useMemo(
    () =>
      mergeRefs<HTMLButtonElement>((node) => {
        setTrigger(node);

        return () => {
          setTrigger(null);
        };
      }, triggerRef),
    [setTrigger, triggerRef]
  );

  return (
    <BaseDialog.Trigger
      {...props}
      data-state={root.open ? "open" : "closed"}
      nativeButton={nativeButton}
      ref={ref}
      render={asChild && isValidElement(children) ? children : undefined}
    >
      {childContent(asChild, children)}
    </BaseDialog.Trigger>
  );
};

/** Radix `DialogClose`: a button that closes the dialog. */
const DialogClose = ({
  asChild,
  children,
  nativeButton = true,
  ...props
}: ComponentProps<typeof BaseDialog.Close> & { asChild?: boolean }) => (
  <BaseDialog.Close
    nativeButton={nativeButton}
    render={asChild === true && isValidElement(children) ? children : undefined}
    {...props}
  >
    {childContent(asChild, children)}
  </BaseDialog.Close>
);

/* ------------------------------------------------- title/description --- */

interface DialogTitleProps extends ComponentProps<"h2"> {
  variant?: DialogVariant | "responsiveExpressiveBeacon";
}

/** The Radix title with per-variant text classes. */
const DialogTitle = ({
  className,
  variant = "default",
  ...props
}: DialogTitleProps) => (
  <BaseDialog.Title
    className={cn(
      className,
      variant === "promotional" && styles.promotionalTitle,
      variant === "confirmation" &&
        "px-6 text-center text-title-lg leading-7 font-semibold select-none",
      (variant === "expressiveBeacon" ||
        variant === "responsiveExpressiveBeacon") &&
        styles.expressiveBeaconTitle,
      variant === "responsiveExpressiveBeacon" &&
        styles.responsiveExpressiveBeaconTitle
    )}
    {...props}
  />
);

/** The Radix description. */
const DialogDescription = (props: ComponentProps<"p">) => (
  <BaseDialog.Description {...props} />
);

/* ------------------------------------------------------------ overlay --- */

interface DialogOverlayProps extends Omit<ComponentProps<"div">, "ref"> {
  backdrop?: DialogBackdropKind;
  position?: "absolute" | "fixed";
  size?: DialogSize;
  transparentImage?: boolean;
  variant?: DialogVariant;
}

/** The component reads the `backdropStyle` setting; its default is `dim`. */
const BackdropStyleContext = createContext<"dim" | "fade">("dim");

const DialogBackdropStyleProvider = BackdropStyleContext.Provider;

const useDialogBackdropStyle = () => useContext(BackdropStyleContext);

/** The full-screen layer behind the content. */
const DialogOverlay = ({
  backdrop,
  className,
  position = "fixed",
  size = "default",
  transparentImage,
  variant = "default",
  ...props
}: DialogOverlayProps) => {
  const backdropStyle = useDialogBackdropStyle();
  const registerSurface = useDismissableLayerSurface();
  const sheet = isResponsiveSheetSize(size);

  const modalBackdrop =
    backdrop === "modal" &&
    (backdropStyle === "fade"
      ? styles.beaconModalOverlay
      : styles.modalDimOverlay);

  return (
    <BaseDialog.Backdrop
      className={cn(
        "overlay-layer pointer-events-auto inset-0 z-50",
        position,
        modalBackdrop,
        backdrop === "soft" && styles.softOverlay,
        isNil(backdrop) && [
          (variant === "beaconModal" ||
            variant === "expressiveBeacon" ||
            (sheet && variant !== "promotional")) &&
            styles.beaconModalOverlay,
          sheet && variant === "promotional" && styles.promotionalSheetOverlay,
          (variant === "opaque" ||
            variant === "form" ||
            variant === "catalog" ||
            variant === "confirmation" ||
            variant === "sectionedConfirmation" ||
            variant === "centeredText" ||
            variant === "creditCheckout" ||
            variant === "image") &&
            styles.dimmedOverlay,
          variant === "image" && styles.imageOverlay,
          variant === "voicePicker" && styles.voicePickerOverlay,
          variant === "detailPanel" && "bg-text/5",
          (variant === "beacon" || variant === "promotional") &&
            "bg-text/5 backdrop-blur-sm",
          (variant === "default" ||
            variant === "translucent" ||
            variant === "sectioned" ||
            variant === "photoSetup" ||
            variant === "mediaDetail") &&
            !sheet &&
            "overlay-layer fixed inset-0 z-50 bg-(--ck-palette-simple-scrim)",
        ],
        className
      )}
      data-transparent={variant === "image" ? transparentImage : undefined}
      ref={registerSurface}
      {...props}
    />
  );
};

/* ------------------------------------------------------------ content --- */

/** Tells the surrounding overlay owner that a dialog opened. */
const OverlayRegistration = () => {
  const registerOpen = useOverlayOwner()?.registerOpen;

  useLayoutEffect(() => registerOpen?.(), [registerOpen]);

  return null;
};

type DialogLayerEventHandler = (event: LayerEvent) => void;

interface DialogContentProps extends Omit<
  ComponentProps<"div">,
  "onPointerDown" | "ref"
> {
  animateHeight?: boolean;
  asChild?: boolean;
  autoFocusCloseButton?: boolean;
  backdrop?: DialogBackdropKind;
  closeButtonSize?: DialogCloseButtonSize;
  closeButtonVariant?: DialogCloseButtonVariant;
  contentClassName?: string;
  contentOverflow?: "hidden" | "visible";
  contentPosition?: DialogContentPosition;
  dialogCloseClassName?: string;
  dialogCloseLabel?: string;
  headerActions?: ReactNode;
  /** Radix `modal`; also the `aria-modal` value. */
  modal?: boolean;
  onCloseAutoFocus?: DialogLayerEventHandler;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onFocusOutside?: DialogLayerEventHandler;
  onInteractOutside?: DialogLayerEventHandler;
  onOpenAutoFocus?: DialogLayerEventHandler;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerDownOutside?: DialogLayerEventHandler;
  overlayClassName?: string;
  portalContainer?: HTMLElement | null;
  radius?: DialogRadius;
  shouldIgnoreClickOutside?: boolean;
  shouldStopPointerDownPropagation?: boolean;
  showDialogClose?: boolean;
  size?: DialogSize;
  transparentImage?: boolean;
  unstyledContent?: boolean;
  variant?: DialogVariant;
  viewportSized?: boolean;
  widthHint?: number;
}

/*
 * The `dark:` utilities, as the nearest scope's colour: light, then dark.
 * Tailwind finds a class only when it is written out in full, so these are
 * literals and not built from the variable names.
 */
const ELEVATED_BACKGROUND =
  "bg-[light-dark(var(--ck-palette-surface-elevated-primary),var(--ck-palette-surface-editor-opaque))]";

const SURFACE_BACKGROUND =
  "bg-[light-dark(var(--ck-palette-surface-surface),var(--ck-palette-surface-editor-opaque))]";

const FIXED_HEIGHT = /\bh-(?!auto\b)[^\s]+/u;

const DEFAULT_CLOSE_LABEL = "Close dialog";

/** The dialog content with its overlay and close button. */
const DialogContent = ({
  animateHeight,
  asChild,
  autoFocusCloseButton,
  backdrop,
  children,
  className,
  closeButtonSize = "default",
  closeButtonVariant = "default",
  contentClassName,
  contentOverflow,
  contentPosition,
  dialogCloseClassName,
  dialogCloseLabel,
  headerActions,
  modal: modalProp,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onFocusOutside,
  onInteractOutside,
  onOpenAutoFocus,
  onPointerDown,
  onPointerDownOutside,
  overlayClassName,
  portalContainer,
  radius = "default",
  shouldIgnoreClickOutside = false,
  shouldStopPointerDownPropagation = true,
  showDialogClose = true,
  size,
  style,
  transparentImage,
  unstyledContent = false,
  variant = "default",
  viewportSized = false,
  widthHint,
  ...rest
}: DialogContentProps) => {
  const root = useDialogRoot("DialogContent");
  const zoom = useDialogZoom();
  const owner = useOverlayOwner();
  const { modal } = root;
  const popupRef = useRef<HTMLDivElement | null>(null);

  const [contentElement, setContentElement] = useState<HTMLElement | null>(
    null
  );

  const [innerElement, setInnerElement] = useState<HTMLDivElement | null>(null);
  const [inlineHost, setInlineHost] = useState<HTMLDivElement | null>(null);
  const hasInteractedOutside = useRef(false);
  const hasPointerDownOutside = useRef(false);

  const plain = variant === "default" || variant === "opaque";

  const beaconLike =
    variant === "beacon" ||
    variant === "beaconModal" ||
    variant === "expressiveBeacon";

  const catalogLike =
    variant === "catalog" ||
    variant === "centeredText" ||
    variant === "confirmation";

  const checkout = variant === "creditCheckout";

  const anchoredConfirmation =
    variant === "sectionedConfirmation" && contentPosition === "centered";

  const sheetSize = isResponsiveSheetSize(size);
  const splitOrSetup = size === "splitCatalog" || size === "catalogSetup";

  const positionClassName = cn(
    "dialog-surface z-50",
    variant !== "centeredText" && "outline-none",
    size === "sheet" && "bottom-0 left-0",
    contentPosition === "centered" &&
      !anchoredConfirmation &&
      variant !== "image" &&
      size !== "sheet" &&
      !sheetSize && [
        "left-1/2 -translate-x-1/2 -translate-y-1/2",
        variant === "photoSetup" ? styles.photoSetupPosition : "top-1/2",
      ],
    contentPosition === "top" && [
      "left-1/2 -translate-x-1/2",
      styles.topPosition,
    ],
    contentPosition === "scrollable" &&
      "pointer-events-auto relative m-auto shrink-0",
    anchoredConfirmation &&
      "pointer-events-auto relative col-start-2 row-start-2 justify-self-center",
    contentPosition !== "inline" &&
      contentPosition !== "scrollable" &&
      !anchoredConfirmation &&
      (isNil(portalContainer) ? "fixed" : "absolute")
  );

  const surfaceClassName = cn(
    (variant === "default" || variant === "translucent") && [
      "text-text shadow-lg ring-[0.5px] ring-border",
      variant === "translucent"
        ? "bg-panel-elevated-secondary/70 backdrop-blur-lg"
        : "bg-panel-elevated-secondary/90 backdrop-blur-xl",
    ],
    (variant === "sectioned" || variant === "photoSetup" || beaconLike) && [
      "text-text",
      variant === "sectioned" &&
      contentPosition === "anchored" &&
      size !== "sheet" &&
      !sheetSize
        ? [
            "bg-clip-padding md:border md:border-border md:shadow-2xl",
            splitOrSetup ? "bg-panel-elevated" : ELEVATED_BACKGROUND,
          ]
        : ["shadow-lg", splitOrSetup ? "bg-panel" : SURFACE_BACKGROUND],
    ],
    variant === "expressiveBeacon" && [
      "border border-border bg-clip-padding",
      styles.expressiveBeaconSurface,
    ],
    variant === "voicePicker" && styles.voicePickerSurface,
    variant === "sectionedConfirmation" && styles.sectionedConfirmationSurface,
    variant === "onboarding" && "bg-panel-elevated text-text shadow-lg",
    variant === "mediaDetail" && "bg-panel text-text shadow-lg",
    variant === "detailPanel" &&
      "border border-border bg-panel text-text shadow-sm",
    (variant === "opaque" || variant === "promotional") &&
      "bg-panel-elevated-secondary text-text shadow-lg ring-[0.5px] ring-border",
    variant === "form" &&
      "rounded-[calc(var(--spacing)*6*var(--ck-rounding-scale,1))] bg-panel-elevated-secondary text-text shadow-[0_8px_10px_-6px_#0000001a,0_20px_25px_-5px_#0000001a] ring-[0.5px] ring-border",
    catalogLike && [
      "bg-panel-elevated-secondary text-text",
      styles.catalogSurface,
    ],
    variant === "centeredText" && styles.centeredTextSurface,
    catalogLike && radius === "compact" && styles.catalogCompact,
    checkout && ["relative rounded-2xl bg-panel", styles.creditCheckoutSurface],
    variant !== "image" &&
      variant !== "expressiveBeacon" &&
      variant !== "form" &&
      variant !== "voicePicker" &&
      !catalogLike &&
      !checkout &&
      !sheetSize &&
      (radius === "compact" ||
      variant === "sectioned" ||
      variant === "sectionedConfirmation" ||
      beaconLike
        ? "rounded-2xl"
        : "rounded-3xl"),
    variant !== "image" &&
      variant !== "voicePicker" &&
      !checkout &&
      size !== "sheet" &&
      size !== "square" &&
      !sheetSize &&
      (contentPosition === "scrollable" || anchoredConfirmation
        ? "max-w-full"
        : "max-w-[92vw]"),
    contentOverflow === "visible" ? "overflow-visible" : "overflow-hidden",
    beaconLike && "max-h-[92dvh] overflow-y-auto"
  );

  const sizeStyle: CSSProperties = {};

  if (size === "square") {
    sizeStyle.width = `min(760px, calc(100vw / ${zoom} - 4rem), calc(100dvh / ${zoom} - 6rem))`;
  } else if (size === "sheet") {
    sizeStyle.width = `calc(100vw / ${zoom})`;
    sizeStyle.height = `calc(70dvh / ${zoom})`;
    sizeStyle.maxHeight = `calc(100dvh / ${zoom} - 1rem)`;
  } else if (size === "appLauncher") {
    sizeStyle.maxWidth = `calc(92vw / ${zoom})`;
    sizeStyle.maxHeight = `calc(90dvh / ${zoom})`;
  }

  if (contentPosition === "scrollable" && isNil(portalContainer)) {
    sizeStyle.maxWidth = `calc((100vw - 2rem) / ${zoom})`;
  }

  let sizeClass = sizeClassName(size);

  if (variant === "image") {
    sizeClass = "inset-0 flex h-full w-full flex-col";
  } else if (variant === "detailPanel") {
    sizeClass = cn(
      sizeClass,
      "h-[calc(100dvh/var(--ui-display-scale,1)-2rem)]"
    );
  } else if (variant === "sectionedConfirmation" && size === "default") {
    sizeClass = "w-125";
  } else if (checkout) {
    sizeClass = "max-w-125";
  }

  const hasFixedHeight =
    !isNil(style?.height) ||
    FIXED_HEIGHT.test(sizeClass) ||
    FIXED_HEIGHT.test(contentClassName ?? "") ||
    FIXED_HEIGHT.test(className ?? "");

  const animatesHeight =
    animateHeight === true &&
    asChild !== true &&
    !unstyledContent &&
    !viewportSized &&
    contentPosition !== "top" &&
    size !== "editor" &&
    size !== "square" &&
    size !== "sheet" &&
    !sheetSize &&
    size !== "xxxwideTall" &&
    !hasFixedHeight;

  const closeLabel =
    dialogCloseLabel === undefined || dialogCloseLabel === ""
      ? DEFAULT_CLOSE_LABEL
      : dialogCloseLabel;

  const label = <span className="sr-only">{closeLabel}</span>;

  const translucent = variant === "translucent";

  const closeButton = showDialogClose ? (
    <DialogClose
      asChild={translucent}
      autoFocus={autoFocusCloseButton}
      className={
        translucent
          ? dialogCloseClassName
          : cn(
              "cursor-(--ck-action-cursor) leading-none [-webkit-app-region:no-drag]",
              closeButtonVariant === "mediaOverlay"
                ? styles.closeMediaOverlay
                : "hover:bg-fill-primary-transparent-hover",
              variant !== "voicePicker" &&
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
              checkout &&
                "flex size-9 items-center justify-center rounded-lg text-text-muted",
              !checkout &&
                closeButtonVariant === "default" &&
                variant !== "form" &&
                (catalogLike ||
                variant === "voicePicker" ||
                variant === "sectionedConfirmation"
                  ? "text-text"
                  : "text-text/80"),
              variant === "form" && "text-text-subtle hover:text-text",
              variant === "voicePicker" &&
                "absolute flex items-center justify-center",
              variant !== "voicePicker" &&
                !checkout &&
                (!plain || closeButtonSize !== "default"
                  ? cn(
                      "flex items-center justify-center",
                      variant === "sectioned" ||
                        variant === "sectionedConfirmation" ||
                        variant === "photoSetup"
                        ? "rounded-lg"
                        : "rounded-full",
                      closeButtonSize === "compact" &&
                        "size-7 bg-panel shadow-xs ring-[0.5px] ring-border",
                      closeButtonSize !== "compact" &&
                        variant !== "sectionedConfirmation" &&
                        (variant === "centeredText" ||
                        variant === "expressiveBeacon" ||
                        closeButtonSize === "large"
                          ? "size-9"
                          : "size-8")
                    )
                  : "rounded p-1"),
              isNil(headerActions) && checkout && "absolute end-4 top-4",
              isNil(headerActions) &&
                variant !== "voicePicker" &&
                !checkout &&
                closeButtonSize === "large" &&
                "absolute end-4.5 top-4.5",
              isNil(headerActions) &&
                variant !== "voicePicker" &&
                !checkout &&
                closeButtonSize !== "large" &&
                variant === "form" &&
                "absolute top-4 right-3.5",
              isNil(headerActions) &&
                variant !== "voicePicker" &&
                !checkout &&
                closeButtonSize !== "large" &&
                variant !== "form" &&
                variant !== "centeredText" && [
                  "absolute",
                  variant === "photoSetup" && "top-2 right-2",
                  (variant === "sectioned" || variant === "promotional") &&
                    "top-3 right-3",
                  variant !== "photoSetup" &&
                    variant !== "sectioned" &&
                    variant !== "sectionedConfirmation" &&
                    variant !== "promotional" &&
                    "top-4 right-4",
                ],
              (variant === "beacon" || size === "edgeToEdgeSheet") &&
                closeButtonSize !== "compact" &&
                "size-9 bg-panel/80 shadow-xs backdrop-blur-md",
              variant === "beaconModal" &&
                closeButtonSize !== "compact" &&
                "size-9 bg-panel/20 shadow-xs backdrop-blur-md transition-colors hover:bg-panel/30 active:bg-[light-dark(color-mix(in_oklab,var(--ck-palette-surface-surface)_80%,transparent),color-mix(in_oklab,var(--ck-palette-surface-surface)_70%,transparent))]",
              variant === "centeredText" && styles.centeredTextClose,
              variant === "voicePicker" && styles.voicePickerClose,
              variant === "sectionedConfirmation" &&
                styles.sectionedConfirmationClose,
              dialogCloseClassName,
              size === "responsiveSheet" &&
                variant === "promotional" &&
                styles.promotionalSheetClose
            )
      }
      onClick={stopPropagation}
    >
      {translucent ? (
        <Button color="outlineSurfaceRaised" radius="full" size="iconCircle">
          <SmallCloseGlyph />
          {label}
        </Button>
      ) : (
        <>
          {closeButtonSize !== "default" && <LargeCloseGlyph />}
          {closeButtonSize === "default" && catalogLike && (
            <CatalogCloseGlyph />
          )}
          {closeButtonSize === "default" && variant === "form" && (
            <MediumCloseGlyph />
          )}
          {closeButtonSize === "default" &&
            !catalogLike &&
            !plain &&
            variant !== "form" && <MediumCloseGlyph />}
          {closeButtonSize === "default" && plain && (
            <DefaultCloseMark className="size-(--ck-control-icon-size-xs,0.875rem)" />
          )}
          {label}
        </>
      )}
    </DialogClose>
  ) : null;

  const closeGroup =
    !isNil(headerActions) || (translucent && showDialogClose) ? (
      <div
        className={cn(
          "absolute flex items-center [-webkit-app-region:no-drag]",
          translucent ? "end-2 top-2 gap-2" : "top-5 right-5 gap-1"
        )}
      >
        {headerActions}
        {closeButton}
      </div>
    ) : (
      closeButton
    );

  /* Height animation (a layout effect): follows the inner wrapper. */
  useLayoutEffect(() => {
    if (!animatesHeight || isNil(contentElement) || isNil(innerElement)) {
      return noCleanup;
    }

    if (typeof ResizeObserver === "undefined") {
      return noCleanup;
    }

    let frame: number | null = null;
    let readyFrame: number | null = null;
    let last = -1;
    let ready = false;

    const apply = (height: number) => {
      if (!Number.isFinite(height) || Math.abs(height - last) < 0.5) {
        return;
      }

      last = height;
      contentElement.style.setProperty(
        "--ck-dialog-content-height",
        `${height}px`
      );
      contentElement.style.height = "var(--ck-dialog-content-height)";

      if (!ready) {
        if (!isNil(readyFrame)) {
          cancelAnimationFrame(readyFrame);
        }

        readyFrame = requestAnimationFrame(() => {
          ready = true;
          contentElement.dataset.ckDialogHeightReady = "true";
        });
      }
    };

    const measure = () => {
      const { borderTopWidth, borderBottomWidth } =
        getComputedStyle(contentElement);

      const height = innerElement.offsetHeight || innerElement.scrollHeight;

      apply(
        height +
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- The widths are lengths such as "1px", which Number cannot read.
          Number.parseFloat(borderTopWidth) +
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- The widths are lengths such as "1px", which Number cannot read.
          Number.parseFloat(borderBottomWidth)
      );
    };

    const schedule = () => {
      if (isNil(frame)) {
        frame = requestAnimationFrame(() => {
          frame = null;
          measure();
        });
      }
    };

    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(innerElement);

    return () => {
      observer.disconnect();

      if (!isNil(frame)) {
        cancelAnimationFrame(frame);
      }

      if (!isNil(readyFrame)) {
        cancelAnimationFrame(readyFrame);
      }

      contentElement.style.removeProperty("--ck-dialog-content-height");
      contentElement.style.height = "";
      delete contentElement.dataset.ckDialogHeightReady;
    };
  }, [animatesHeight, contentElement, innerElement]);

  const overlayOwnerId = owner?.id;

  const widthStyle =
    !isNil(widthHint) && Number.isFinite(widthHint) && widthHint > 0
      ? widthHint
      : undefined;

  const zoomStyle =
    contentPosition !== "inline" && isNil(portalContainer) && zoom !== 1
      ? zoom
      : undefined;

  const viewportStyle =
    viewportSized && isNil(portalContainer)
      ? { height: `calc(100dvh / ${zoom})`, width: `calc(100vw / ${zoom})` }
      : null;

  const setupStyle =
    size === "setup" && isNil(portalContainer)
      ? {
          height: `min(600px, calc((100dvh - 2rem) / ${zoom}))`,
          maxWidth: `calc((100dvw - 2rem) / ${zoom})`,
        }
      : null;

  const { ref: focusScopeRef } = useFocusScope();

  const layer = useDismissableLayer({
    active: root.open,
    modal,
    onDismiss: () => {
      root.setOpen(false);
    },
    onEscapeKeyDown,
    onFocusOutside: compose(onFocusOutside, (event) => {
      if (modal) {
        event.preventDefault();
      }
    }),
    onInteractOutside: (event) => {
      onInteractOutside?.(event);

      if (modal || event.defaultPrevented) {
        return;
      }

      hasInteractedOutside.current = true;

      if (event.detail?.originalEvent.type === "pointerdown") {
        hasPointerDownOutside.current = true;
      }

      const { target } = event;

      if (
        target instanceof Node &&
        root.triggerRef.current?.contains(target) === true
      ) {
        event.preventDefault();
      }

      if (
        event.detail?.originalEvent.type === "focusin" &&
        hasPointerDownOutside.current
      ) {
        event.preventDefault();
      }
    },
    onPointerDownOutside: compose(
      (event: LayerEvent) => {
        if (shouldIgnoreClickOutside) {
          event.preventDefault();
        }

        onPointerDownOutside?.(event);
      },
      (event) => {
        if (!modal) {
          return;
        }

        const original = event.detail?.originalEvent;

        if (
          original instanceof MouseEvent &&
          (original.button === 2 || (original.button === 0 && original.ctrlKey))
        ) {
          event.preventDefault();
        }
      }
    ),
  });

  const initialFocus = useCallback(() => {
    const popup = popupRef.current;

    if (isNil(popup) || containsDeep(popup, deepActiveElement())) {
      return false;
    }

    const event = new LayerEvent(AUTOFOCUS_ON_MOUNT);
    event.currentTarget = popup;

    dismissTooltips();
    window.getSelection()?.removeAllRanges();
    onOpenAutoFocus?.(event);

    if (event.defaultPrevented) {
      return false;
    }

    const previous = deepActiveElement();
    focusFirstCandidate(popup);

    if (deepActiveElement() === previous) {
      focusElement(popup);
    }

    return false;
  }, [onOpenAutoFocus]);

  const finalFocus = useCallback(() => {
    const event = new LayerEvent(AUTOFOCUS_ON_UNMOUNT);
    onCloseAutoFocus?.(event);

    if (event.defaultPrevented) {
      return false;
    }

    if (modal) {
      root.triggerRef.current?.focus();
    } else {
      if (!hasInteractedOutside.current) {
        root.triggerRef.current?.focus();
      }

      hasInteractedOutside.current = false;
      hasPointerDownOutside.current = false;
    }

    return false;
  }, [modal, onCloseAutoFocus, root.triggerRef]);

  const asChildElement =
    asChild === true && isValidElement<{ children?: ReactNode }>(children)
      ? children
      : null;

  const popupContent = asChildElement ? (
    <>
      <OverlayRegistration key="overlay-registration" />
      {asChildElement.props.children}
      {closeGroup}
    </>
  ) : (
    <>
      <OverlayRegistration />
      {animatesHeight ? <div ref={setInnerElement}>{children}</div> : children}
      {closeGroup}
    </>
  );

  const content = (
    <BaseDialog.Popup
      aria-modal={modalProp}
      className={cn(
        positionClassName,
        !unstyledContent && surfaceClassName,
        !unstyledContent && variant !== "voicePicker" && sizeClass,
        sheetSize && variant === "promotional" && styles.promotionalSheet,
        animatesHeight && styles.heightAnimated,
        contentClassName,
        className
      )}
      data-ck-overlay-owner={overlayOwnerId}
      data-state={root.open ? "open" : "closed"}
      finalFocus={finalFocus}
      initialFocus={initialFocus}
      onBlurCapture={layer.handleBlurCapture}
      onFocusCapture={layer.handleFocusCapture}
      onKeyDown={(event) => {
        loopTabKey(event);
        rest.onKeyDown?.(event);
      }}
      onPointerDown={(event) => {
        if (shouldStopPointerDownPropagation) {
          event.stopPropagation();
        }

        onPointerDown?.(event);
      }}
      onPointerDownCapture={layer.handlePointerDownCapture}
      ref={mergeRefs<HTMLDivElement>(
        popupRef,
        setContentElement,
        focusScopeRef
      )}
      render={asChildElement ?? undefined}
      style={{
        width: widthStyle,
        zoom: zoomStyle,
        ...sizeStyle,
        ...viewportStyle,
        ...setupStyle,
        ...layer.style,
        ...style,
      }}
      {...rest}
    >
      {popupContent}
    </BaseDialog.Popup>
  );

  const portalOwner = portalContainer ?? undefined;

  const overlayPosition =
    variant === "image" && !isNil(portalContainer) ? "absolute" : "fixed";

  const scrollsInPage = contentPosition === "scrollable" && !modal;

  const body: ReactNode = scrollsInPage ? (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full p-4">{content}</div>
    </div>
  ) : (
    <>
      {modal ? (
        <DialogOverlay
          backdrop={backdrop}
          className={cn(
            overlayClassName,
            contentPosition === "scrollable" && "overflow-y-auto"
          )}
          position={overlayPosition}
          size={size}
          transparentImage={transparentImage}
          variant={variant}
        >
          {contentPosition === "scrollable" ? (
            <div className="flex min-h-full p-4">{content}</div>
          ) : null}
        </DialogOverlay>
      ) : null}
      {anchoredConfirmation ? (
        <div
          className={cn(
            "pointer-events-none inset-0 z-50",
            isNil(portalContainer) ? "fixed" : "absolute",
            styles.sectionedConfirmationPosition
          )}
        >
          {content}
        </div>
      ) : null}
      {!anchoredConfirmation && contentPosition !== "scrollable"
        ? content
        : null}
    </>
  );

  if (contentPosition === "inline") {
    // The component renders inline content where it stands, without a portal.
    // Base UI needs its portal part, so the portal's container is an element
    // placed here, which keeps the content inside the surrounding theme scope.
    return (
      <>
        <div className="contents" ref={setInlineHost} />
        {inlineHost ? (
          <BaseDialog.Portal className="contents" container={inlineHost}>
            {body}
          </BaseDialog.Portal>
        ) : null}
      </>
    );
  }

  return (
    <BaseDialog.Portal
      className="contents"
      container={portalOwner ?? undefined}
    >
      {body}
    </BaseDialog.Portal>
  );
};

/* ------------------------------------------------------- the composite --- */

interface DialogProps extends Omit<
  DialogContentProps,
  "children" | "modal" | "onOpenChange"
> {
  children?: ReactNode;
  /** Props handed to the content element. */
  contentProps?: Omit<DialogContentProps, "children">;
  defaultOpen?: boolean;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  /** An element that opens the dialog. */
  triggerAsChild?: boolean;
  triggerContent?: ReactNode;
  triggerRef?: Ref<HTMLButtonElement>;
}

/**
 * The dialog. It renders the optional trigger, the overlay, and
 * the content with its close button. Defaults: modal, height animated,
 * `centered`, overflow hidden, close button shown.
 */
const Dialog = ({
  animateHeight = true,
  children,
  contentProps,
  defaultOpen,
  modal = true,
  onOpenChange,
  open,
  triggerAsChild = true,
  triggerContent,
  triggerRef,
  contentOverflow = "hidden",
  contentPosition = "centered",
  radius = "default",
  showDialogClose = true,
  shouldIgnoreClickOutside = false,
  unstyledContent = false,
  viewportSized = false,
  variant = "default",
  size = "default",
  ...content
}: DialogProps) => (
  <DialogRoot
    defaultOpen={defaultOpen}
    modal={modal}
    open={open}
    onOpenChange={onOpenChange}
  >
    {isPresent(triggerContent) ? (
      <DialogTrigger asChild={triggerAsChild} triggerRef={triggerRef}>
        {triggerContent}
      </DialogTrigger>
    ) : null}
    <DialogContent
      animateHeight={animateHeight}
      modal={modal}
      contentOverflow={contentOverflow}
      contentPosition={contentPosition}
      radius={radius}
      shouldIgnoreClickOutside={shouldIgnoreClickOutside}
      showDialogClose={showDialogClose}
      size={size}
      unstyledContent={unstyledContent}
      variant={variant}
      viewportSized={viewportSized}
      {...content}
      {...contentProps}
    >
      {children}
    </DialogContent>
  </DialogRoot>
);

/* -------------------------------------------------------------- slots --- */

interface DialogHeaderProps {
  className?: string;
  icon?: ReactNode;
  iconBackgroundClassName?: string;
  iconClassName?: string;
  iconLoading?: boolean;
  iconVariant?: "default" | "outlinedCircle";
  subtitle?: ReactNode;
  subtitleClassName?: string;
  subtitleSize?: "base" | "sm";
  subtitleTone?: "default" | "secondary" | "tertiary";
  title?: ReactNode;
  titleClassName?: string;
  titleSize?: "base" | "dialog" | "lg" | "sm";
  variant?: "sectionedConfirmation" | "default";
}

const TITLE_SIZE = {
  base: styles.headingBase,
  dialog: styles.headingDialog,
  lg: styles.headingLg,
  sm: styles.headingSm,
} as const;

const SUBTITLE_TONE = {
  default: "text-text",
  secondary: "text-text-muted",
  tertiary: "text-text-subtle",
} as const;

/** The icon, title and subtitle at the top of a dialog. */
const DialogHeader = ({
  className,
  icon,
  iconBackgroundClassName,
  iconClassName,
  iconLoading = false,
  iconVariant = "default",
  subtitle,
  subtitleClassName,
  subtitleSize = "base",
  subtitleTone = "tertiary",
  title,
  titleClassName,
  titleSize = "dialog",
  variant = "default",
}: DialogHeaderProps) => {
  const debug = useDebugLayout();
  const confirmation = variant === "sectionedConfirmation";

  return (
    <div
      className={cn(
        "flex flex-col items-start",
        iconVariant === "outlinedCircle" ? "gap-4" : "gap-3",
        debug && DEBUG_OUTLINE,
        className
      )}
    >
      {debug ? <DebugLabel name="DialogHeader" /> : null}
      {isPresent(icon) ? (
        <span
          className={cn(
            "relative flex shrink-0 items-center justify-center",
            iconVariant === "outlinedCircle"
              ? "size-15 rounded-full border border-stroke-subtle bg-panel p-4"
              : "h-9 w-9 rounded-xl p-2",
            iconBackgroundClassName ??
              (iconVariant === "default" ? "bg-text/5" : undefined),
            iconClassName
          )}
        >
          {iconLoading ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-transparent border-t-current text-text motion-safe:animate-spin"
            />
          ) : null}
          {icon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1 self-stretch">
        {isPresent(title) ? (
          <div
            className={cn(
              confirmation
                ? styles.sectionedConfirmationHeaderTitle
                : TITLE_SIZE[titleSize],
              "min-w-0",
              !confirmation && "font-semibold",
              titleClassName
            )}
          >
            {title}
          </div>
        ) : null}
        {isPresent(subtitle) ? (
          <div
            className={cn(
              SUBTITLE_TONE[subtitleTone],
              subtitleSize === "base"
                ? "text-base leading-normal tracking-normal"
                : "text-sm leading-normal tracking-normal",
              subtitleClassName
            )}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
};

type DialogBodySize =
  | "full"
  | "scrollable"
  | "tall"
  | "topPositioned"
  | "viewport";

type DialogBodyVariant =
  | "sectioned"
  | "sectionedConfirmation"
  | "checkoutConfirmation"
  | "codeEntry"
  | "confirmation"
  | "default";

/** The height limit of a body. */
const BODY_SIZE_CLASSES = {
  full: "h-full min-h-0",
  scrollable:
    "max-h-[min(calc(85dvh/var(--ui-display-scale,1)),calc(var(--spacing)*176))] overflow-hidden",
  tall: "min-h-[520px] max-h-[560px]",
  topPositioned:
    "max-h-[min(var(--ck-dialog-top-content-max-height),calc(85dvh/var(--ui-display-scale,1)))] overflow-y-auto",
  viewport:
    "max-h-[calc(100dvh/var(--ui-display-scale,1)-2rem)] overflow-y-auto",
} as const satisfies Record<DialogBodySize, string>;

const bodySizeClassName = (size: DialogBodySize | undefined) =>
  size === undefined ? undefined : BODY_SIZE_CLASSES[size];

interface DialogBodyProps extends Omit<
  ComponentProps<"div">,
  "onSubmit" | "ref"
> {
  as?: "div" | "form";
  onSubmit?: ComponentProps<"form">["onSubmit"];
  size?: DialogBodySize;
  variant?: DialogBodyVariant;
}

/** The padded column that holds the dialog's content. `as="form"` makes it a form. */
const DialogBody = ({
  as,
  children,
  className,
  onSubmit,
  size,
  variant = "default",
  ...props
}: DialogBodyProps) => {
  const debug = useDebugLayout();

  const classes = cn(
    "flex flex-col text-base leading-normal tracking-normal",
    variant === "confirmation" ? "gap-6 p-8" : "gap-0",
    variant === "default" && styles.body,
    variant === "codeEntry" && "p-8",
    variant === "sectionedConfirmation" && styles.sectionedConfirmationBody,
    variant === "checkoutConfirmation" && styles.checkoutConfirmationBody,
    debug && DEBUG_OUTLINE,
    bodySizeClassName(size),
    className
  );

  if (as === "form") {
    return (
      <form
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion -- SAFETY: a body rendered as a form takes the same attributes; only the element type in the event handlers differs.
        {...(props as Omit<ComponentProps<"form">, "ref">)}
        className={classes}
        onSubmit={onSubmit}
      >
        {debug ? <DebugLabel name="DialogBody" /> : null}
        {children}
      </form>
    );
  }

  return (
    <div {...props} className={classes}>
      {debug ? <DebugLabel name="DialogBody" /> : null}
      {children}
    </div>
  );
};

interface DialogFooterProps {
  children?: ReactNode | ((size: "medium") => ReactNode);
  className?: string;
  /** A lone Button fills the width. Default `true`. */
  expandSingleButton?: boolean;
  variant?: "sectionedConfirmation" | "default";
}

/** The button row. Its Buttons default to the medium size. */
const DialogFooter = ({
  children,
  className,
  expandSingleButton = true,
  variant = "default",
}: DialogFooterProps) => {
  const debug = useDebugLayout();

  const items = Children.toArray(
    typeof children === "function" ? null : children
  );

  const buttons = items.filter(
    (item) => isValidElement(item) && item.type === Button
  ).length;

  const rendered =
    typeof children === "function"
      ? children("medium")
      : // oxlint-disable-next-line typescript/promise-function-async -- The items are elements and text; none is a promise.
        items.map((item) => {
          if (
            !isValidElement<{ className?: string; size?: string }>(item) ||
            item.type !== Button
          ) {
            return item;
          }

          return cloneElement(item, {
            className: cn(
              item.props.className,
              expandSingleButton && buttons === 1
                ? "w-full justify-center"
                : undefined
            ),
            size: item.props.size ?? "medium",
          });
        });

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-end",
        variant === "sectionedConfirmation" ? "gap-2" : "gap-3",
        styles.footer,
        debug && DEBUG_OUTLINE,
        className
      )}
    >
      {debug ? <DebugLabel name="DialogFooter" /> : null}
      {rendered}
    </div>
  );
};

interface DialogSectionProps {
  children?: ReactNode;
  className?: string;
  spacing?: "default" | "large";
}

/** A block separated from the one before by padding. */
const DialogSection = ({
  children,
  className,
  spacing = "default",
}: DialogSectionProps) => {
  const debug = useDebugLayout();

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        styles.section,
        spacing === "large" && styles.largeSection,
        debug && DEBUG_OUTLINE,
        className
      )}
    >
      {debug ? <DebugLabel name="DialogSection" /> : null}
      {children}
    </div>
  );
};

/** Controls side by side. */
const DialogFormRow = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const debug = useDebugLayout();

  return (
    <div
      className={cn(
        "relative flex items-center gap-2",
        debug && DEBUG_OUTLINE,
        className
      )}
    >
      {debug ? <DebugLabel name="FormRow" /> : null}
      {children}
    </div>
  );
};

/** Controls stacked. */
const DialogFieldStack = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const debug = useDebugLayout();

  return (
    <div
      className={cn("flex flex-col gap-2", debug && DEBUG_OUTLINE, className)}
    >
      {debug ? <DebugLabel name="FieldStack" /> : null}
      {children}
    </div>
  );
};

export {
  Dialog,
  DialogBackdropStyleProvider,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFieldStack,
  DialogFooter,
  DialogFormRow,
  DialogHeader,
  DialogOverlay,
  DialogOverlayOwnerProvider,
  DialogPortalContainerProvider,
  DialogRoot,
  DialogSection,
  DialogTitle,
  DialogTrigger,
  DialogZoomProvider,
  isResponsiveSheetSize,
  sizeClassName,
  useDialogBackdropStyle,
  useDialogPortalContainer,
  useDialogZoom,
  useOverlayOwner,
};

export type {
  DialogBackdropKind,
  DialogBodyProps,
  DialogBodySize,
  DialogBodyVariant,
  DialogCloseButtonSize,
  DialogCloseButtonVariant,
  DialogContentPosition,
  DialogContentProps,
  DialogFooterProps,
  DialogHeaderProps,
  DialogOverlayProps,
  DialogProps,
  DialogRadius,
  DialogRootProps,
  DialogSectionProps,
  DialogSize,
  DialogTitleProps,
  DialogTriggerProps,
  DialogVariant,
};
