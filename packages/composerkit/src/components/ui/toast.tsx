"use client";

/* oxlint-disable eslint/no-empty-function -- The default manager is a no-op manager: every method does nothing and returns a handle whose close does nothing. */
/* oxlint-disable eslint/no-use-before-define, typescript/consistent-return -- The progress controller's finish, stop and onChange refer to each other, and show returns a release function only when a manager is bound. */
/* oxlint-disable react/refs, react/memo-dependencies, react/exhaustive-effect-dependencies -- The danger callback is read through a ref when a toast is made, so the manager does not change with the callback. */
/* oxlint-disable anti-slop/no-unknown-parameters -- The analytics payload is an opaque option that the host forwards. */

import { createToastManager } from "composerkit/components/toast/manager";
import type {
  ToastHandle,
  ToastManager,
} from "composerkit/components/toast/manager";
import { SonnerToaster } from "composerkit/components/toast/sonner";
import { cn } from "composerkit/lib/utils";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "composerkit/components/toast/toast.module.css";

export type {
  ToastHandle,
  ToastManager,
  ToastOptions,
} from "composerkit/components/toast/manager";

/*
 * The toast provider and viewport, the no-op manager and the module state.
 */

const DEFAULT_ARIA_LABEL = "Notifications";
const VISIBLE_TOASTS = 3;
const TOAST_GAP = 8;
const SWIPE_DIRECTIONS: "right"[] = ["right"];

const TOAST_OPTIONS = {
  className: styles.appToast,
  classNames: { content: styles.contents, title: styles.contents },
  unstyled: true,
} as const;

// --ck-compose-adjacent-max-width in the Electron body block: the thread width
// 48rem plus 2 * 6 spacing of overhang minus 2 * 3.25 spacing of inset.
const AREA_CLASS_NAME =
  "pointer-events-none inset-0 z-[60] px-2 pt-12 [--ck-compose-adjacent-max-width:calc(48rem_+_var(--spacing)_*_6_*_2_-_var(--spacing)_*_3.25_*_2)] [&:not(:has([data-sonner-toast]))]:invisible";

const LIST_CLASS_NAME =
  "flex max-w-(--ck-compose-adjacent-max-width) justify-center";

const noopHandle: ToastHandle = {
  close: () => {},
};

/** The manager used when no provider or host registered one. */
export const noopToastManager: ToastManager = {
  closeAll: () => {},
  custom: () => noopHandle,
  danger: () => noopHandle,
  info: () => noopHandle,
  registerViewport: () => () => {},
  success: () => noopHandle,
  warning: () => noopHandle,
};

/* The globally active manager. */
let activeManager: ToastManager = noopToastManager;

/** The active manager, for code that runs outside React. */
export const getActiveToastManager = () => activeManager;

/** Makes a manager the active one; the returned function restores the default. */
export const activateToastManager = (manager: ToastManager) => {
  activeManager = manager;

  return () => {
    if (activeManager === manager) {
      activeManager = noopToastManager;
    }
  };
};

/* The manager bound to the progress controller. */
let boundManager: ToastManager = noopToastManager;
const boundListeners = new Set<() => void>();

const setBoundManager = (manager: ToastManager) => {
  boundManager = manager;

  for (const listener of boundListeners) {
    listener();
  }
};

/** Binds a manager; the returned function unbinds it and closes its toasts. */
export const bindToastManager = (manager: ToastManager) => {
  setBoundManager(manager);

  return () => {
    if (boundManager === manager) {
      setBoundManager(noopToastManager);
    }

    manager.closeAll();
  };
};

interface WatchedToast {
  release: (() => void) | undefined;
}

/**
 * Shows a custom toast on the bound manager, again whenever the bound
 * manager changes. `close` removes it and stops following the manager.
 */
export const showToastOnBoundManager = (
  options: Parameters<ToastManager["custom"]>[0]
): ToastHandle => {
  let done = false;

  const watch: WatchedToast = { release: undefined };

  const stopWatching = () => {
    boundListeners.delete(onChange);
    watch.release?.();
  };

  const finish = () => {
    if (!done) {
      done = true;
      stopWatching();

      try {
        options.onRemove?.();
      } catch {
        // A failing onRemove must not stop the removal.
      }
    }
  };

  const show = () => {
    const manager = boundManager;

    if (done || manager === noopToastManager) {
      return;
    }

    let released = false;

    const handle = manager.custom({
      ...options,
      onRemove: () => {
        if (!released && boundManager === manager) {
          finish();
        }
      },
      onUserDismiss: () => {
        if (!done && !released && boundManager === manager) {
          options.onUserDismiss?.();
        }
      },
    });

    return () => {
      released = true;
      handle.close();
    };
  };

  function onChange() {
    watch.release?.();
    watch.release = show();
  }

  watch.release = show();
  boundListeners.add(onChange);

  return { close: finish };
};

const ToastContext = createContext<ToastManager>(noopToastManager);

/** The manager of the nearest ToastProvider, or the no-op manager without one. */
export const useToast = () => useContext(ToastContext);

const subscribeNothing = () => () => {};
const readClient = () => true;
const readServer = () => false;

export interface ToastViewportProps {
  /** Label of the notifications region; the default is "Notifications". */
  ariaLabel?: string;
  /** Portal target; the component uses document.body. */
  container?: HTMLElement;
  dir?: "auto" | "ltr" | "rtl";
  /** The scope id of the manager whose toasts this viewport shows. */
  toasterId: string;
  toaster: ToastManager;
}

/** Portals the toast layer and the sonner list into the document. */
export const ToastViewport = ({
  ariaLabel = DEFAULT_ARIA_LABEL,
  container,
  dir,
  toaster,
  toasterId,
}: ToastViewportProps) => {
  const isClient = useSyncExternalStore(
    subscribeNothing,
    readClient,
    readServer
  );

  useEffect(() => toaster.registerViewport(), [toaster]);

  if (!isClient) {
    return null;
  }

  return createPortal(
    <div className={cn(container ? "absolute" : "fixed", AREA_CLASS_NAME)}>
      <div className="relative w-full">
        <SonnerToaster
          className={cn(styles.viewport, LIST_CLASS_NAME)}
          containerAriaLabel={ariaLabel}
          dir={dir}
          gap={TOAST_GAP}
          id={toasterId}
          mobileOffset={0}
          offset={0}
          position="top-center"
          swipeDirections={SWIPE_DIRECTIONS}
          toastOptions={TOAST_OPTIONS}
          visibleToasts={VISIBLE_TOASTS}
        />
      </div>
    </div>,
    container ?? document.body
  );
};

export interface ToastProviderProps {
  children?: ReactNode;
  /** Close button label of the alerts; the default is "Close". */
  closeLabel?: string;
  /** Portal target of the viewport; the component uses document.body. */
  container?: HTMLElement;
  dir?: "auto" | "ltr" | "rtl";
  /** Called for every danger toast with its errorAnalytics option. */
  onDangerToast?: (analytics: unknown) => void;
  /** Label of the notifications region; the default is "Notifications". */
  viewportLabel?: string;
}

/** One manager per provider, bound for its lifetime, with its viewport. */
export const ToastProvider = ({
  children,
  closeLabel,
  container,
  dir,
  onDangerToast,
  viewportLabel,
}: ToastProviderProps) => {
  const scopeId = useId();
  const onDangerRef = useRef(onDangerToast);

  const manager = useMemo(
    () =>
      createToastManager({
        closeLabel,
        onDanger: (analytics) => {
          // oxlint-disable-next-line react/refs -- The callback runs when a danger toast is made, never during render.
          onDangerRef.current?.(analytics);
        },
        scopeId,
      }),
    [closeLabel, scopeId]
  );

  useEffect(() => {
    onDangerRef.current = onDangerToast;
  }, [onDangerToast]);

  useLayoutEffect(() => {
    const unbind = bindToastManager(manager);
    const deactivate = activateToastManager(manager);

    return () => {
      unbind();
      deactivate();
    };
  }, [manager]);

  return (
    <ToastContext.Provider value={manager}>
      <ToastViewport
        ariaLabel={viewportLabel}
        container={container}
        dir={dir}
        toaster={manager}
        toasterId={scopeId}
      />
      {children}
    </ToastContext.Provider>
  );
};
