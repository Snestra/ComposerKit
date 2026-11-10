"use client";

/* oxlint-disable react/no-clone-element, anti-slop/no-runtime-typeof -- The Modal's trigger and close render the child they are given, as the asChild does. */
/* oxlint-disable shadcn/no-inline-styles -- The modal sets its max width as a custom property and merges the layer's pointer-events style. */

import {
  AUTOFOCUS_ON_UNMOUNT,
  afterFrames,
  isNil,
  useIsClient,
  loopTabKey,
  mergeRefs,
  useEscapeStack,
  useFocusScope,
  useMediaQuery,
} from "@workspace/react/components/dialog/dialog-layer";
import { useDialogPortalContainer } from "@workspace/react/components/ui/dialog";
import {
  LayerEvent,
  noCleanup,
  useDismissableLayer,
  useLatest,
} from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import {
  cloneElement,
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";
import { createPortal, flushSync } from "react-dom";

import styles from "../ui/dialog.module.css";

/*
 * The Modal compound: a
 * non-modal Radix dialog (`modal={false}`) inside a transition wrapper, with
 * its own backdrop, container and Escape handling.
 */

const ENTER_DURATION = 600;
const EXIT_DURATION = 300;

type ModalAllowClose = () => "allow" | "deny" | undefined;

interface ModalContextValue {
  checkAllowClose: RefObject<Set<ModalAllowClose>>;
  open: boolean;
  setOpen: (open: boolean) => void;
  setShake: (shake: boolean) => void;
  shake: boolean;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/** The Modal context, which only exists inside `<Modal />`. */
const useModalContext = (): ModalContextValue => {
  const context = use(ModalContext);

  if (!context) {
    throw new Error("Modal parts and hooks need a Modal ancestor");
  }

  return context;
};

/** Closes the modal. */
const useModalClose = () => {
  const { setOpen } = useModalContext();

  return useCallback(() => {
    setOpen(false);
  }, [setOpen]);
};

/** Restarts the shake animation. */
const useModalShake = () => {
  const { setShake } = useModalContext();

  return useCallback(() => {
    flushSync(() => {
      setShake(false);
    });
    afterFrames(() => {
      setShake(true);
    });
  }, [setShake]);
};

/** Registers a callback that can answer `"deny"` to a close request. */
const useModalCloseGuard = (onRequestClose: ModalAllowClose | undefined) => {
  const { checkAllowClose } = useModalContext();

  useEffect(() => {
    if (!onRequestClose) {
      return noCleanup;
    }

    const checks = checkAllowClose.current;
    checks.add(onRequestClose);

    return () => {
      checks.delete(onRequestClose);
    };
  }, [onRequestClose, checkAllowClose]);
};

/** `close` and `shake`, and the close guard. */
const useModalRequestClose = ({
  onRequestClose,
}: { onRequestClose?: ModalAllowClose } = {}) => {
  const shake = useModalShake();
  const close = useModalClose();

  useModalCloseGuard(onRequestClose);

  return { close, shake };
};

/* ----------------------------------------------- Radix dialog primitive --- */

interface PrimitiveContextValue {
  contentId: string;
  descriptionId: string;
  descriptionPresent: boolean;
  open: boolean;
  setDescriptionCount: (update: (count: number) => number) => void;
  setOpen: (open: boolean) => void;
  setTitleCount: (update: (count: number) => number) => void;
  setTrigger: (element: HTMLElement | null) => void;
  titleId: string;
  titlePresent: boolean;
  triggerRef: { current: HTMLElement | null };
}

const PrimitiveContext = createContext<PrimitiveContextValue | null>(null);

const usePrimitive = () => {
  const context = useContext(PrimitiveContext);

  if (!context) {
    throw new Error("Place modal parts under a Modal root");
  }

  return context;
};

/** The Radix non-modal dialog root. */
const PrimitiveRoot = ({
  children,
  onOpenChange,
  open,
}: {
  children?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);

  const setTrigger = useCallback((element: HTMLElement | null) => {
    triggerRef.current = element;
  }, []);

  const contentId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const [titles, setTitles] = useState(0);
  const [descriptions, setDescriptions] = useState(0);

  const value = useMemo(
    () => ({
      contentId,
      descriptionId,
      descriptionPresent: descriptions > 0,
      open,
      setDescriptionCount: setDescriptions,
      setOpen: onOpenChange,
      setTitleCount: setTitles,
      setTrigger,
      titleId,
      titlePresent: titles > 0,
      triggerRef,
    }),
    [
      contentId,
      descriptionId,
      descriptions,
      onOpenChange,
      open,
      setTrigger,
      titleId,
      titles,
    ]
  );

  return (
    <PrimitiveContext.Provider value={value}>
      {children}
    </PrimitiveContext.Provider>
  );
};

const stateOf = (open: boolean) => (open ? "open" : "closed");

/** Child handlers run before the slot's, as Radix's Slot merges them. */
const callAll =
  <A extends unknown[]>(
    ...handlers: readonly (((...args: A) => void) | undefined)[]
  ) =>
  (...args: A) => {
    for (const handler of handlers) {
      handler?.(...args);
    }
  };

interface ChildProps {
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: "dialog";
  "data-state"?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  ref?: Ref<HTMLElement>;
  type?: string;
}

/** Built on Radix `DialogTrigger` with `asChild`. */
const ModalTrigger = ({
  children,
  ref,
}: {
  children: ReactElement<ChildProps>;
  ref?: Ref<HTMLElement>;
}) => {
  const primitive = usePrimitive();
  const { setTrigger } = primitive;
  const childRef = children.props.ref;

  const mergedRef = useMemo(
    () =>
      mergeRefs<HTMLElement>(
        (node) => {
          setTrigger(node);

          return () => {
            setTrigger(null);
          };
        },
        // oxlint-disable-next-line react/refs -- The refs are merged into one callback ref; none is read during render.
        ref,
        childRef
      ),
    [setTrigger, ref, childRef]
  );

  return cloneElement(children, {
    "aria-controls": primitive.open ? primitive.contentId : undefined,
    "aria-expanded": primitive.open,
    "aria-haspopup": "dialog",
    "data-state": stateOf(primitive.open),
    onClick: callAll(children.props.onClick, () => {
      primitive.setOpen(!primitive.open);
    }),
    ref: mergedRef,
    type: children.props.type ?? "button",
  });
};

/** Built on Radix `DialogTitle`. */
const ModalTitle = ({
  children,
  className,
  ...props
}: ComponentProps<"h2">) => {
  const { setTitleCount, titleId } = usePrimitive();

  useLayoutEffect(() => {
    setTitleCount((count) => count + 1);

    return () => {
      setTitleCount((count) => count - 1);
    };
  }, [setTitleCount]);

  return (
    <h2 className={cn(styles.modalTitle, className)} id={titleId} {...props}>
      {children}
    </h2>
  );
};

/** Built on Radix `DialogDescription`. */
const ModalDescription = ({
  children,
  className,
  visuallyHidden = false,
}: {
  children?: ReactNode;
  className?: string;
  visuallyHidden?: boolean;
}) => {
  const { descriptionId, setDescriptionCount } = usePrimitive();

  useLayoutEffect(() => {
    setDescriptionCount((count) => count + 1);

    return () => {
      setDescriptionCount((count) => count - 1);
    };
  }, [setDescriptionCount]);

  return (
    <p
      className={cn(styles.modalDescription, className)}
      data-ck-visually-hidden={visuallyHidden ? "" : undefined}
      id={descriptionId}
    >
      {children}
    </p>
  );
};

/** A function child gets `{ close }`; an element child closes the modal. */
const ModalClose = ({
  children,
}: {
  children:
    | ReactElement<ChildProps>
    | ((api: { close: () => void }) => ReactNode);
}) => {
  const close = useModalClose();

  if (typeof children === "function") {
    return <>{children({ close })}</>;
  }

  return cloneElement(children, {
    onClick: callAll(children.props.onClick, close),
    type: children.props.type ?? "button",
  });
};

/* ------------------------------------------------- transition wrapper --- */

interface TransitionState {
  enter: boolean;
  enterActive: boolean;
  exit: boolean;
  exitActive: boolean;
  interrupted: boolean;
}

type TransitionAction =
  | "done"
  | "enter-active"
  | "enter-before"
  | "exit-active"
  | "exit-before";

const IDLE: TransitionState = {
  enter: false,
  enterActive: false,
  exit: false,
  exitActive: false,
  interrupted: false,
};

/** The state machine of one transitioning child. */
const transitionReducer = (
  state: TransitionState,
  action: TransitionAction
): TransitionState => {
  switch (action) {
    case "enter-before": {
      return {
        enter: true,
        enterActive: false,
        exit: false,
        exitActive: false,
        interrupted: state.interrupted || state.exit,
      };
    }

    case "enter-active": {
      return {
        enter: true,
        enterActive: true,
        exit: false,
        exitActive: false,
        interrupted: false,
      };
    }

    case "exit-before": {
      return {
        enter: false,
        enterActive: false,
        exit: true,
        exitActive: false,
        interrupted: state.interrupted || state.enter,
      };
    }

    case "exit-active": {
      return {
        enter: false,
        enterActive: false,
        exit: true,
        exitActive: true,
        interrupted: false,
      };
    }

    case "done": {
      return IDLE;
    }

    default: {
      return state;
    }
  }
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface TransitionChildProps {
  children: ReactNode;
  className?: string;
  enterDuration: number;
  exitDuration: number;
  onExited: () => void;
  preventMountTransition: boolean;
  shouldRender: boolean;
}

/** One child with the entering and exiting data attributes. */
const TransitionChild = ({
  children,
  className,
  enterDuration,
  exitDuration,
  onExited,
  preventMountTransition,
  shouldRender,
}: TransitionChildProps) => {
  const [state, dispatch] = useReducer(
    transitionReducer,
    preventMountTransition ? IDLE : { ...IDLE, enter: true }
  );

  const mountedOnce = useRef(false);
  const enterRef = useLatest(enterDuration);
  const exitRef = useLatest(exitDuration);
  const exited = useLatest(onExited);

  useLayoutEffect(() => {
    if (!shouldRender) {
      let timer: number | undefined;
      dispatch("exit-before");

      const cancel = afterFrames(() => {
        dispatch("exit-active");
        // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
        timer = window.setTimeout(() => {
          exited.current();
        }, exitRef.current);
      });

      return () => {
        cancel();

        if (!isNil(timer)) {
          clearTimeout(timer);
        }
      };
    }

    if (preventMountTransition && !mountedOnce.current) {
      mountedOnce.current = true;

      return noCleanup;
    }

    let timer: number | undefined;
    dispatch("enter-before");

    const cancel = afterFrames(() => {
      dispatch("enter-active");
      timer = window.setTimeout(() => {
        dispatch("done");
      }, enterRef.current);
    });

    return () => {
      cancel();

      if (!isNil(timer)) {
        clearTimeout(timer);
      }
    };
  }, [shouldRender, preventMountTransition, enterRef, exitRef, exited]);

  useEffect(
    () => () => {
      mountedOnce.current = false;
    },
    []
  );

  return (
    <span
      className={cn(className, styles.transitionGroupChild)}
      data-entering={state.enter ? "" : undefined}
      data-entering-active={state.enterActive ? "" : undefined}
      data-exiting={state.exit ? "" : undefined}
      data-exiting-active={state.exitActive ? "" : undefined}
      data-interrupted={state.interrupted ? "" : undefined}
    >
      {children}
    </span>
  );
};

interface ModalTransitionProps {
  /** One keyed element, or nothing. */
  children: ReactElement | false | null | undefined;
  className?: string;
  /** Skips every transition; defaults to the reduced-motion media query. */
  disableAnimations?: boolean;
  enterDuration: number;
  exitDuration: number;
  preventInitialTransition: boolean;
}

/**
 * For a single child: the child enters when it appears and stays
 * rendered through its exit until `exitDuration` has passed. With animations
 * disabled it renders and removes the child at once.
 */
const ModalTransition = ({
  children,
  className,
  disableAnimations,
  enterDuration,
  exitDuration,
  preventInitialTransition,
}: ModalTransitionProps) => {
  const disabled = disableAnimations ?? prefersReducedMotion();
  const current = children === false || isNil(children) ? null : children;
  const [kept, setKept] = useState<ReactElement | null>(current);
  // oxlint-disable-next-line react/hook-use-state -- It records whether a child was there at mount and never changes.
  const [initiallyPresent] = useState(current !== null);

  // The exit renders the element that was last shown.
  if (current !== null && current !== kept) {
    setKept(current);
  }

  const shown = current ?? kept;

  const finishExit = useCallback(() => {
    setKept(null);
  }, []);

  if (disabled) {
    return current === null ? null : (
      <span className={className}>{current}</span>
    );
  }

  if (shown === null) {
    return null;
  }

  return (
    <TransitionChild
      className={className}
      enterDuration={enterDuration}
      exitDuration={exitDuration}
      key={shown.key}
      preventMountTransition={preventInitialTransition && initiallyPresent}
      shouldRender={current !== null}
      onExited={finishExit}
    >
      {shown}
    </TransitionChild>
  );
};

/* --------------------------------------------------------- the Modal --- */

/** The modal root. */
const ModalRoot = ({
  children,
  defaultOpen = false,
  onOpenChange,
  open,
}: {
  children?: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) => {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const [shake, setShake] = useState(false);
  const checkAllowClose = useRef(new Set<ModalAllowClose>());
  const current = open ?? uncontrolled;
  const onChange = useLatest(onOpenChange);

  const setOpen = useCallback(
    (next: boolean) => {
      if (current === next) {
        return;
      }

      if (!next) {
        setShake(false);
      }

      onChange.current?.(next);

      if (typeof open !== "boolean") {
        setUncontrolled(next);
      }
    },
    [current, open, onChange]
  );

  const value = useMemo(
    () => ({ checkAllowClose, open: current, setOpen, setShake, shake }),
    [current, setOpen, shake]
  );

  return (
    <ModalContext value={value}>
      <PrimitiveRoot open={current} onOpenChange={setOpen}>
        {children}
      </PrimitiveRoot>
    </ModalContext>
  );
};

/** Presses on these never dismiss the Modal. */
const isIgnoredTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.matches("[data-ck-grammarly-shadow-root]") ||
    target.tagName === "COM-1PASSWORD-BUTTON" ||
    target.closest("[data-sonner-toast], [data-sonner-toaster]") !== null ||
    target.closest("[data-modal-outside-exempt]") !== null
  );
};

interface ModalContentProps extends Omit<ComponentProps<"div">, "ref"> {
  /** Plays the enter transition on the first render. Default `false`. */
  animateOnMount?: boolean;
  /** The `backdropStyle` setting; its default is `dim`. */
  backdrop?: "dim" | "fade";
  /** Width of the modal in pixels (`--ck-modal-max-width`); the CSS default is 450px. */
  maxWidth?: number;
  onAfterClose?: () => void;
  onCloseAutoFocus?: (event: LayerEvent) => void;
  portalClassName?: string;
  /** `inside` scrolls the body, `outside` scrolls the container; narrow screens force `inside`. */
  scroll?: "inside" | "outside";
}

/** The Radix content a Modal renders with forced mounting in non-modal mode. */
const ModalSurface = ({
  children,
  className,
  onCloseAutoFocus,
  style,
  surfaceRef,
  ...props
}: Omit<ModalContentProps, "backdrop" | "onAfterClose"> & {
  onCloseAutoFocus: (event: LayerEvent) => void;
  surfaceRef: Ref<HTMLDivElement>;
}) => {
  const primitive = usePrimitive();
  const modal = useModalContext();
  const hasInteractedOutside = useRef(false);
  const hasPointerDownOutside = useRef(false);
  const closeHandler = useLatest(onCloseAutoFocus);
  const { triggerRef } = primitive;

  const requestClose = useCallback(
    (event: LayerEvent) => {
      if (isIgnoredTarget(event.target)) {
        event.preventDefault();

        return;
      }

      if (
        event.type === "dismissableLayer.focusOutside" ||
        event.type === "dismissableLayer.blurOutside"
      ) {
        event.preventDefault();

        return;
      }

      for (const check of modal.checkAllowClose.current) {
        if (check() === "deny") {
          event.preventDefault();

          return;
        }
      }
    },
    [modal.checkAllowClose]
  );

  const { ref: focusScopeRef } = useFocusScope();

  const layer = useDismissableLayer({
    active: true,
    modal: false,
    onDismiss: () => {
      primitive.setOpen(false);
    },
    onEscapeKeyDown: (event) => {
      event.preventDefault();
    },
    onFocusOutside: requestClose,
    onInteractOutside: (event) => {
      requestClose(event);

      if (event.defaultPrevented) {
        return;
      }

      hasInteractedOutside.current = true;

      if (event.detail?.originalEvent.type === "pointerdown") {
        hasPointerDownOutside.current = true;
      }

      const { target } = event;

      if (
        target instanceof Node &&
        triggerRef.current?.contains(target) === true
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
    onPointerDownOutside: requestClose,
  });

  /* The focus scope's unmount event, dispatched after the content has left. */
  useEffect(
    () => () => {
      window.setTimeout(() => {
        const event = new LayerEvent(AUTOFOCUS_ON_UNMOUNT);
        closeHandler.current(event);

        if (!event.defaultPrevented) {
          if (!hasInteractedOutside.current) {
            triggerRef.current?.focus();
          }

          event.preventDefault();
        }

        hasInteractedOutside.current = false;
        hasPointerDownOutside.current = false;
      }, 0);
    },
    [closeHandler, triggerRef]
  );

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- The Radix content is a div with role dialog that handles keys itself.
    <div
      {...props}
      aria-describedby={
        primitive.descriptionPresent ? primitive.descriptionId : undefined
      }
      aria-labelledby={primitive.titlePresent ? primitive.titleId : undefined}
      className={cn(styles.modal, className)}
      data-state={stateOf(primitive.open)}
      id={primitive.contentId}
      ref={mergeRefs<HTMLDivElement>(surfaceRef, focusScopeRef)}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The content is a div with role dialog.
      role="dialog"
      style={{ ...layer.style, ...style }}
      tabIndex={-1}
      onBlurCapture={layer.handleBlurCapture}
      onFocusCapture={layer.handleFocusCapture}
      onKeyDown={(event) => {
        loopTabKey(event);
        props.onKeyDown?.(event);
      }}
      onPointerDownCapture={layer.handlePointerDownCapture}
    >
      {children}
    </div>
  );
};

/** The modal's portal, backdrop, container and surface. */
const ModalContent = ({
  animateOnMount = false,
  backdrop = "dim",
  children,
  className,
  maxWidth,
  onAfterClose,
  onCloseAutoFocus,
  portalClassName,
  scroll = "inside",
  style,
  ...props
}: ModalContentProps) => {
  const narrow = !useMediaQuery("(min-width: 48rem)");
  const { open, setOpen, shake, checkAllowClose } = useModalContext();
  const latest = useLatest({ onAfterClose, open });
  const portalContainer = useDialogPortalContainer();
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const insideOrOutside = narrow ? "inside" : scroll;
  const mounted = useIsClient();

  useEscapeStack(open, () => {
    for (const check of checkAllowClose.current) {
      if (check() === "deny") {
        return;
      }
    }

    setOpen(false);
  });

  useEffect(() => {
    if (surface && !surface.contains(document.activeElement)) {
      surface.focus({ preventScroll: true });
    }
  }, [surface]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      surface &&
      event.target === surface &&
      event.key === "Tab" &&
      event.shiftKey
    ) {
      event.preventDefault();
      event.stopPropagation();

      const candidates = [
        ...surface.querySelectorAll<HTMLElement>(
          'a[href], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex^="-"]), [contenteditable]'
        ),
      ];

      candidates.at(-1)?.focus();
    }
  };

  const modalStyle: CSSProperties = {
    ...(isNil(maxWidth)
      ? null
      : // oxlint-disable-next-line typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion -- SAFETY: React accepts custom properties in a style object; the type has no index for them.
        ({ "--ck-modal-max-width": `${maxWidth}px` } as CSSProperties)),
    ...style,
  };

  if (!mounted) {
    return null;
  }

  const element = open ? (
    <div
      className={styles.modalPortalInner}
      data-backdrop={backdrop}
      key="modal"
    >
      <div className={styles.modalBackdrop} key="overlay" />
      <div
        className={styles.modalContainer}
        data-ck-modal-scroll={insideOrOutside}
      >
        <div className={styles.modalContainerInner}>
          <ModalSurface
            {...props}
            className={className}
            data-animate={shake ? "shake" : undefined}
            style={modalStyle}
            surfaceRef={setSurface}
            onCloseAutoFocus={(event) => {
              onCloseAutoFocus?.(event);

              if (!latest.current.open) {
                latest.current.onAfterClose?.();
              }
            }}
            onKeyDown={onKeyDown}
          >
            {children}
          </ModalSurface>
        </div>
      </div>
    </div>
  ) : null;

  return createPortal(
    <ModalTransition
      className={cn(styles.modalPortal, portalClassName)}
      enterDuration={ENTER_DURATION}
      exitDuration={EXIT_DURATION}
      preventInitialTransition={!animateOnMount}
    >
      {element}
    </ModalTransition>,
    portalContainer ?? document.body
  );
};

/** A column-flex form. */
const ModalForm = ({
  children,
  className,
  ...props
}: ComponentProps<"form">) => (
  <form className={cn(styles.modalForm, className)} {...props}>
    {children}
  </form>
);

/** The 50px header row. */
const ModalHeader = ({ children }: { children?: ReactNode }) => (
  <div className={styles.modalHeader}>{children}</div>
);

/** Whether an element scrolls, and whether it is at the start. */
const useScrollState = (ref: RefObject<HTMLElement | null>) => {
  const [isScrollable, setIsScrollable] = useState(false);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return noCleanup;
    }

    const update = () => {
      const { scrollHeight, clientHeight, scrollTop } = element;
      setIsScrollable(scrollHeight > clientHeight);
      setIsAtStart(scrollTop === 0);
      setIsAtEnd(scrollTop + clientHeight >= scrollHeight);
    };

    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);

  return { isAtEnd, isAtStart, isScrollable };
};

/** The body; it reports `data-scrollable` and `data-ck-scroll-at-top`. */
const ModalBody = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => {
  const ref = useRef<HTMLDivElement>(null);
  const { isAtStart, isScrollable } = useScrollState(ref);

  return (
    <div
      className={cn(styles.modalBody, className)}
      data-ck-scroll-at-top={isAtStart}
      data-scrollable={isScrollable}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
};

/** The right-aligned footer row. */
const ModalFooter = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => (
  <div className={cn(styles.modalFooter, className)} {...props}>
    {children}
  </div>
);

const Modal = Object.assign(ModalRoot, {
  Body: ModalBody,
  Close: ModalClose,
  Content: ModalContent,
  Description: ModalDescription,
  Footer: ModalFooter,
  Form: ModalForm,
  Header: ModalHeader,
  Title: ModalTitle,
  Trigger: ModalTrigger,
});

export {
  Modal,
  ModalTransition,
  isIgnoredTarget,
  useModalClose,
  useModalCloseGuard,
  useModalRequestClose,
  useModalShake,
};

export type { ModalAllowClose, ModalContentProps, ModalTransitionProps };
