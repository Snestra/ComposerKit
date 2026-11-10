"use client";

/* oxlint-disable typescript/strict-boolean-expressions, typescript/prefer-nullish-coalescing -- Sonner branches on JavaScript truthiness (`toast.duration || duration || 4000` skips 0, an id of 0 or "" counts as missing); each condition stays as written. */
/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-known-value-widening, anti-slop/no-unsafe-dictionary-type -- The store takes callers values (React nodes, functions, objects, promise results and thrown errors) and branches on their type. */
/* oxlint-disable typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-chained-type-assertions -- Toast custom properties, event targets and promise results are asserted where the component reads them untyped. */
/* oxlint-disable eslint/complexity -- The toast, its pointer handlers and the toaster keep one branch per case. */
/* oxlint-disable promise/avoid-new, promise/always-return, promise/valid-params, promise/prefer-await-to-callbacks, promise/no-multiple-resolved, eslint/no-unused-expressions -- toast.promise keeps the promise chain and its unwrap. */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- The toast li is focusable (tabIndex 0) and handles pointer swipes. */
/* oxlint-disable typescript/consistent-return, typescript/switch-exhaustiveness-check, typescript/promise-function-async, typescript/prefer-promise-reject-errors -- Effects return a cleanup only when they subscribed, the handler answers null for the types without an icon, resolveContent returns the caller's React node and unwrap rejects with the original reason. */
/* oxlint-disable shadcn/no-inline-styles -- Sonner sets its layout through style custom properties and forwards the style props of the caller. */
/* oxlint-disable unicorn/no-array-reduce -- The component sums the heights before a toast with reduce. */
/* oxlint-disable react/exhaustive-effect-dependencies -- The effects list these dependencies (content props re-measure the toast; the toast object re-arms the timer). */
/* oxlint-disable unicorn/no-instanceof-builtins -- toast.promise tests `instanceof Function` and `instanceof Error`. */

import { cn } from "@workspace/react/lib/utils";
import {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  Ref,
} from "react";
import { flushSync } from "react-dom";

import styles from "./toast.module.css";

/*
 * Toasts based on Sonner (MIT): the helpers and icons, the store, the
 * constants, Toast and Toaster. Both the unstyled path and the styled path
 * with Sonner's own defaults are kept.
 */

const VISIBLE_TOASTS = 3;
const FALLBACK_DURATION_MS = 4000;
const TOAST_WIDTH = 356;
const DEFAULT_GAP = 14;
const SWIPE_THRESHOLD = 45;
const SWIPE_VELOCITY = 0.11;
const REMOVAL_DELAY_MS = 200;
const DRAG_LOCK_DISTANCE = 1;
const DAMPING_BASE = 1.5;
const DAMPING_DISTANCE = 20;
const DEFAULT_OFFSET = "24px";
const DEFAULT_MOBILE_OFFSET = "16px";
const DEFAULT_HOTKEY = ["altKey", "KeyT"] as const;
const DEFAULT_ARIA_LABEL = "Notifications";
const DEFAULT_CLOSE_LABEL = "Close toast";
const KEY_PREFIX = /Key/gu;
const DIGIT_PREFIX = /Digit/gu;
const OFFSET_SIDES = ["top", "right", "bottom", "left"] as const;
const LOADER_BARS = Array.from({ length: 12 }, (_, bar) => bar);

export type ToastPosition =
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "top-left"
  | "top-right";

export type SwipeDirection = "bottom" | "left" | "right" | "top";

export type ToastId = number | string;

export type ToastType =
  | "default"
  | "error"
  | "info"
  | "loading"
  | "success"
  | "warning";

export type ToastTextContent = ReactNode | (() => ReactNode);

export interface ToastButton {
  label: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export interface ToastClassNames {
  actionButton?: string;
  cancelButton?: string;
  closeButton?: string;
  content?: string;
  default?: string;
  description?: string;
  error?: string;
  icon?: string;
  info?: string;
  loader?: string;
  loading?: string;
  success?: string;
  title?: string;
  toast?: string;
  warning?: string;
}

export interface ToastData {
  action?: ReactNode | ToastButton;
  actionButtonStyle?: CSSProperties;
  cancel?: ReactNode | ToastButton;
  cancelButtonStyle?: CSSProperties;
  className?: string;
  classNames?: ToastClassNames;
  closeButton?: boolean;
  delete?: boolean;
  description?: ToastTextContent;
  descriptionClassName?: string;
  dismissible?: boolean;
  duration?: number;
  icon?: ReactNode;
  id: ToastId;
  invert?: boolean;
  jsx?: ReactNode;
  onAutoClose?: (toast: ToastData) => void;
  onDismiss?: (toast: ToastData) => void;
  position?: ToastPosition;
  promise?: unknown;
  richColors?: boolean;
  style?: CSSProperties;
  testId?: string;
  title?: ToastTextContent;
  toasterId?: string;
  type?: ToastType;
  unstyled?: boolean;
}

export type ToastCreateOptions = Partial<Omit<ToastData, "title">> & {
  message?: ToastTextContent;
};

interface ToastHeight {
  height: number;
  position: ToastPosition | undefined;
  toastId: ToastId;
}

export type ToastOffset =
  | number
  | string
  | Partial<Record<(typeof OFFSET_SIDES)[number], number | string>>;

interface StoreEvent extends Partial<ToastData> {
  dismiss?: boolean;
  id: ToastId;
}

type Subscriber = (event: StoreEvent) => void;

/* One module-level Sonner store. */
const subscribers: Subscriber[] = [];
let storedToasts: ToastData[] = [];
const dismissedToasts = new Set<ToastId>();
let idCounter = 1;

const nextId = () => {
  const id = idCounter;
  idCounter += 1;

  return id;
};

const publish = (event: StoreEvent) => {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
};

const subscribe = (subscriber: Subscriber) => {
  subscribers.push(subscriber);

  return () => {
    const index = subscribers.indexOf(subscriber);
    subscribers.splice(index, 1);
  };
};

const addToast = (toast: ToastData) => {
  publish(toast);
  storedToasts = [...storedToasts, toast];
};

const hasUsableId = (id: ToastId | undefined): id is ToastId =>
  typeof id === "number" || (id?.length ?? 0) > 0;

const createToast = (options: ToastCreateOptions): ToastId => {
  const { message, ...rest } = options;
  const id = hasUsableId(options.id) ? options.id : nextId();
  const existing = storedToasts.find((toast) => toast.id === id);
  const dismissible = options.dismissible === undefined || options.dismissible;

  if (dismissedToasts.has(id)) {
    dismissedToasts.delete(id);
  }

  if (existing) {
    storedToasts = storedToasts.map((toast) => {
      if (toast.id !== id) {
        return toast;
      }

      publish({ ...toast, ...options, id, title: message });

      return { ...toast, ...options, dismissible, id, title: message };
    });
  } else {
    addToast({ title: message, ...rest, dismissible, id });
  }

  return id;
};

const dismissToast = (id?: ToastId) => {
  if (id) {
    dismissedToasts.add(id);
    requestAnimationFrame(() => {
      for (const subscriber of subscribers) {
        subscriber({ dismiss: true, id });
      }
    });
  } else {
    for (const toast of storedToasts) {
      for (const subscriber of subscribers) {
        subscriber({ dismiss: true, id: toast.id });
      }
    }
  }

  return id;
};

interface PromiseResultOptions extends ToastCreateOptions {
  message?: ToastTextContent;
}

type PromiseResult =
  | ReactNode
  | PromiseResultOptions
  | ((value: unknown) => PromiseResult | Promise<PromiseResult>);

export interface ToastPromiseData {
  description?:
    | ToastTextContent
    | ((value: unknown) => ToastTextContent | Promise<ToastTextContent>);
  error?: PromiseResult;
  finally?: () => Promise<void> | void;
  loading?: ReactNode;
  success?: PromiseResult;
}

const isHttpResponse = (
  value: unknown
): value is { ok: boolean; status: number } =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  typeof value.ok === "boolean" &&
  "status" in value &&
  typeof value.status === "number";

const resolveResult = async (
  result: PromiseResult,
  argument: unknown
): Promise<PromiseResult> =>
  typeof result === "function"
    ? await (result as (value: unknown) => Promise<PromiseResult>)(argument)
    : await result;

const resolveDescription = async (
  description: ToastPromiseData["description"],
  argument: unknown
) =>
  typeof description === "function"
    ? await (
        description as (
          value: unknown
        ) => ToastTextContent | Promise<ToastTextContent>
      )(argument)
    : await description;

const toResultOptions = (result: PromiseResult): PromiseResultOptions =>
  typeof result === "object" && result !== null && !isValidElement(result)
    ? (result as PromiseResultOptions)
    : { message: result as ReactNode };

const createWithType = (
  message: ToastTextContent,
  type: ToastType,
  options?: ToastCreateOptions
) => createToast({ ...options, message, type });

const promiseToast = (
  promise: Promise<unknown> | (() => Promise<unknown>),
  data?: ToastPromiseData
) => {
  if (!data) {
    return;
  }

  let id: ToastId | undefined;

  if (data.loading !== undefined) {
    id = createToast({
      ...data,
      description:
        typeof data.description === "function" ? undefined : data.description,
      message: data.loading,
      promise,
      type: "loading",
    });
  }

  const source = Promise.resolve(
    promise instanceof Function ? promise() : promise
  );

  let shouldDismiss = id !== undefined;
  let outcome: ["reject" | "resolve", unknown] | undefined;

  const settle = async (
    type: "error" | "success",
    result: PromiseResult,
    argument: unknown
  ) => {
    shouldDismiss = false;
    const resolved = await resolveResult(result, argument);
    const description = await resolveDescription(data.description, argument);
    createToast({
      description,
      id,
      type,
      ...toResultOptions(resolved),
    });
  };

  const chained = source
    .then(async (value) => {
      outcome = ["resolve", value];

      if (isValidElement(value)) {
        shouldDismiss = false;
        createToast({ id, message: value, type: "default" });
      } else if (isHttpResponse(value) && !value.ok) {
        await settle(
          "error",
          data.error,
          `HTTP error! status: ${value.status}`
        );
      } else if (value instanceof Error) {
        await settle("error", data.error, value);
      } else if (data.success !== undefined) {
        await settle("success", data.success, value);
      }
    })
    .catch(async (error: unknown) => {
      outcome = ["reject", error];

      if (data.error !== undefined) {
        await settle("error", data.error, error);
      }
    })
    .finally(() => {
      if (shouldDismiss) {
        dismissToast(id);
        id = undefined;
      }

      data.finally?.();
    });

  const unwrap = async () =>
    await new Promise((resolve, reject) => {
      chained
        .then(() => {
          outcome?.[0] === "reject"
            ? reject(outcome[1])
            : resolve(outcome?.[1]);
        })
        .catch(reject);
    });

  return typeof id === "string" || typeof id === "number"
    ? Object.assign(id, { unwrap })
    : { unwrap };
};

const customToast = (
  render: (id: ToastId) => ReactNode,
  options?: Partial<ToastData>
) => {
  const id = options?.id || nextId();
  createToast({ id, jsx: render(id), ...options });

  return id;
};

const callableToast = (
  message: ToastTextContent,
  options?: Partial<ToastData>
) => {
  const id = options?.id || nextId();
  addToast({ title: message, ...options, id });

  return id;
};

const getActiveToasts = () =>
  storedToasts.filter((toast) => !dismissedToasts.has(toast.id));

/** The vendored Sonner `toast` object. */
export const sonnerToast = Object.assign(callableToast, {
  custom: customToast,
  dismiss: dismissToast,
  error: (message: ToastTextContent, options?: ToastCreateOptions) =>
    createWithType(message, "error", options),
  getHistory: () => storedToasts,
  getToasts: getActiveToasts,
  info: (message: ToastTextContent, options?: ToastCreateOptions) =>
    createWithType(message, "info", options),
  loading: (message: ToastTextContent, options?: ToastCreateOptions) =>
    createWithType(message, "loading", options),
  message: (message: ToastTextContent, options?: ToastCreateOptions) =>
    createToast({ ...options, message }),
  promise: promiseToast,
  success: (message: ToastTextContent, options?: ToastCreateOptions) =>
    createWithType(message, "success", options),
  warning: (message: ToastTextContent, options?: ToastCreateOptions) =>
    createWithType(message, "warning", options),
});

const useDocumentHidden = () => {
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const update = () => {
      setHidden(document.hidden);
    };

    document.addEventListener("visibilitychange", update);

    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return hidden;
};

const swipeDirectionsFor = (position: ToastPosition): SwipeDirection[] => {
  const [first, second] = position.split("-");
  const directions: SwipeDirection[] = [];

  if (first) {
    directions.push(first as SwipeDirection);
  }

  if (second) {
    directions.push(second as SwipeDirection);
  }

  return directions;
};

const documentDirection = (): "ltr" | "rtl" => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "ltr";
  }

  const attribute = document.documentElement.getAttribute("dir");

  if (attribute === "rtl" || attribute === "ltr") {
    return attribute;
  }

  return window.getComputedStyle(document.documentElement).direction === "rtl"
    ? "rtl"
    : "ltr";
};

const toCssLength = (side: number | string) =>
  typeof side === "number" ? `${side}px` : side;

const offsetVariables = (
  offset: ToastOffset | undefined,
  mobileOffset: ToastOffset | undefined
) => {
  const variables: Record<string, string> = {};

  for (const [index, value] of [offset, mobileOffset].entries()) {
    const prefix = index === 1 ? "--mobile-offset" : "--offset";
    const fallback = index === 1 ? DEFAULT_MOBILE_OFFSET : DEFAULT_OFFSET;

    for (const side of OFFSET_SIDES) {
      let resolved = fallback;

      if (typeof value === "number" || typeof value === "string") {
        resolved = toCssLength(value);
      } else if (typeof value === "object" && value[side] !== undefined) {
        resolved = toCssLength(value[side]);
      }

      variables[`${prefix}-${side}`] = resolved;
    }
  }

  return variables;
};

const resolveContent = (value: ToastTextContent) =>
  typeof value === "function" ? value() : value;

const isButtonSpec = (value: unknown): value is ToastButton =>
  typeof value === "object" &&
  value !== null &&
  (value as ToastButton).label !== undefined;

const SuccessIcon = (
  <svg
    fill="currentColor"
    height="20"
    viewBox="0 0 20 20"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
      fillRule="evenodd"
    />
  </svg>
);

const WarningIcon = (
  <svg
    fill="currentColor"
    height="20"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
      fillRule="evenodd"
    />
  </svg>
);

const InfoIcon = (
  <svg
    fill="currentColor"
    height="20"
    viewBox="0 0 20 20"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
      fillRule="evenodd"
    />
  </svg>
);

const ErrorIcon = (
  <svg
    fill="currentColor"
    height="20"
    viewBox="0 0 20 20"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
      fillRule="evenodd"
    />
  </svg>
);

const CloseGlyph = (
  <svg
    fill="none"
    height="12"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="12"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const iconForType = (type: ToastType | undefined) => {
  switch (type) {
    case "success": {
      return SuccessIcon;
    }

    case "info": {
      return InfoIcon;
    }

    case "warning": {
      return WarningIcon;
    }

    case "error": {
      return ErrorIcon;
    }

    default: {
      return null;
    }
  }
};

const Loader = ({
  className,
  visible,
}: {
  className?: string;
  visible: boolean;
}) => (
  <div className={cn(styles.loadingWrapper, className)} data-visible={visible}>
    <div className={styles.spinner}>
      {LOADER_BARS.map((bar) => (
        <div className={styles.loadingBar} key={`spinner-bar-${bar}`} />
      ))}
    </div>
  </div>
);

export type ToastIcons = Partial<
  Record<
    "close" | "error" | "info" | "loading" | "success" | "warning",
    ReactNode
  >
>;

interface SonnerToastProps {
  actionButtonStyle?: CSSProperties;
  cancelButtonStyle?: CSSProperties;
  className?: string;
  classNames?: ToastClassNames;
  closeButton?: boolean;
  closeButtonAriaLabel?: string;
  defaultRichColors?: boolean;
  descriptionClassName?: string;
  duration?: number;
  expandByDefault?: boolean;
  expanded: boolean;
  gap: number;
  heights: ToastHeight[];
  icons?: ToastIcons;
  index: number;
  interacting: boolean;
  invert?: boolean;
  position: ToastPosition;
  removeToast: (toast: ToastData) => void;
  setHeights: (update: (heights: ToastHeight[]) => ToastHeight[]) => void;
  style?: CSSProperties;
  swipeDirections?: SwipeDirection[];
  toast: ToastData;
  toasts: ToastData[];
  unstyled?: boolean;
  visibleToasts: number;
}

type DragAxis = "x" | "y";

/* The damping applied to a drag against an allowed direction. */
const damping = (distance: number) =>
  1 / (DAMPING_BASE + Math.abs(distance) / DAMPING_DISTANCE);

type SwipeOutDirection = "down" | "left" | "right" | "up";

const readSwipeAmount = (element: HTMLElement | null, name: string) =>
  Number(element?.style.getPropertyValue(name).replace("px", "") || 0);

const toastIconSlot = (
  toast: ToastData,
  icons: ToastIcons | undefined,
  classNames: ToastClassNames | undefined
) => {
  const type = toast.type ?? undefined;

  const typeIcon =
    type === undefined ? undefined : icons?.[type as keyof ToastIcons];

  const showsSlot =
    (type || toast.icon || toast.promise) &&
    toast.icon !== null &&
    (typeIcon !== null || toast.icon);

  if (!showsSlot) {
    return null;
  }

  const loaderClassName = cn(classNames?.loader, toast.classNames?.loader);

  const loader = icons?.loading ? (
    <div
      className={cn(loaderClassName, styles.loader)}
      data-visible={type === "loading"}
    >
      {icons.loading}
    </div>
  ) : (
    <Loader className={loaderClassName} visible={type === "loading"} />
  );

  const fallbackIcon = toast.icon || typeIcon || iconForType(type);
  const showsLoader = toast.promise || (type === "loading" && !toast.icon);

  return (
    <div className={cn(classNames?.icon, toast.classNames?.icon)} data-icon="">
      {showsLoader ? toast.icon || loader : null}
      {type === "loading" ? null : fallbackIcon}
    </div>
  );
};

const SonnerToast = (props: SonnerToastProps) => {
  const {
    toast,
    unstyled,
    interacting,
    setHeights,
    visibleToasts,
    heights,
    index,
    toasts,
    expanded,
    removeToast,
    defaultRichColors,
    closeButton: closeButtonDefault,
    style,
    cancelButtonStyle,
    actionButtonStyle,
    className,
    descriptionClassName,
    duration,
    position,
    gap,
    expandByDefault,
    classNames,
    icons,
    closeButtonAriaLabel = DEFAULT_CLOSE_LABEL,
    invert,
    swipeDirections,
  } = props;

  const [swipeDirection, setSwipeDirection] = useState<DragAxis | null>(null);

  const [swipeOutDirection, setSwipeOutDirection] =
    useState<SwipeOutDirection | null>(null);

  const [mounted, setMounted] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [swipeOut, setSwipeOut] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);
  const [offsetBeforeRemove, setOffsetBeforeRemove] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);

  const remainingTime = useRef(
    toast.duration || duration || FALLBACK_DURATION_MS
  );

  const dragStartTime = useRef<Date | null>(null);
  const toastRef = useRef<HTMLLIElement | null>(null);
  const isFront = index === 0;
  const isVisible = index + 1 <= visibleToasts;
  const toastType = toast.type;
  const dismissible = toast.dismissible !== false;

  const heightIndex = useMemo(
    () => heights.findIndex((height) => height.toastId === toast.id) || 0,
    [heights, toast.id]
  );

  const showsCloseButton = useMemo(
    () => toast.closeButton ?? closeButtonDefault,
    [toast.closeButton, closeButtonDefault]
  );

  const toastDuration = useMemo(
    () => toast.duration || duration || FALLBACK_DURATION_MS,
    [toast.duration, duration]
  );

  const closeTimerStartTime = useRef(0);
  const offset = useRef(0);
  const lastCloseTimerStartTime = useRef(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [yPosition, xPosition] = position.split("-");

  const heightsBefore = useMemo(
    () =>
      heights.reduce(
        (total, height, heightsIndex) =>
          heightsIndex >= heightIndex ? total : total + height.height,
        0
      ),
    [heights, heightIndex]
  );

  const documentHidden = useDocumentHidden();
  const inverted = toast.invert || invert;
  const isLoading = toastType === "loading";

  const offsetValue = heightIndex * gap + heightsBefore;

  useLayoutEffect(() => {
    offset.current = offsetValue;
  }, [offsetValue]);

  useEffect(() => {
    remainingTime.current = toastDuration;
  }, [toastDuration]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- The mounted flag starts the enter transition after the first paint.
    setMounted(true);
  }, []);

  useEffect(() => {
    const element = toastRef.current;

    if (!element) {
      return;
    }

    const { height } = element.getBoundingClientRect();
    setInitialHeight(height);
    setHeights((current) => [
      { height, position: toast.position, toastId: toast.id },
      ...current,
    ]);

    return () => {
      setHeights((current) =>
        current.filter((entry) => entry.toastId !== toast.id)
      );
    };
  }, [setHeights, toast.id, toast.position]);

  useLayoutEffect(() => {
    if (!mounted) {
      return;
    }

    const element = toastRef.current;

    if (!element) {
      return;
    }

    const previousHeight = element.style.height;
    element.style.height = "auto";
    const { height } = element.getBoundingClientRect();
    element.style.height = previousHeight;
    setInitialHeight(height);
    setHeights((current) =>
      current.some((entry) => entry.toastId === toast.id)
        ? current.map((entry) =>
            entry.toastId === toast.id ? { ...entry, height } : entry
          )
        : [{ height, position: toast.position, toastId: toast.id }, ...current]
    );
  }, [
    mounted,
    toast.title,
    toast.description,
    setHeights,
    toast.id,
    toast.jsx,
    toast.action,
    toast.cancel,
    toast.position,
  ]);

  const deleteToast = useCallback(() => {
    setRemoved(true);
    setOffsetBeforeRemove(offset.current);
    setHeights((current) =>
      current.filter((entry) => entry.toastId !== toast.id)
    );
    setTimeout(() => {
      removeToast(toast);
    }, REMOVAL_DELAY_MS);
  }, [toast, removeToast, setHeights]);

  useEffect(() => {
    if (
      (toast.promise && toastType === "loading") ||
      toast.duration === Number.POSITIVE_INFINITY ||
      toast.type === "loading"
    ) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (expanded || interacting || documentHidden) {
      // Pause: subtract the time that ran since the timer started.
      if (lastCloseTimerStartTime.current < closeTimerStartTime.current) {
        const elapsed = Date.now() - closeTimerStartTime.current;
        remainingTime.current -= elapsed;
      }

      lastCloseTimerStartTime.current = Date.now();
    } else if (remainingTime.current !== Number.POSITIVE_INFINITY) {
      closeTimerStartTime.current = Date.now();
      timeoutId = setTimeout(() => {
        toast.onAutoClose?.(toast);
        deleteToast();
      }, remainingTime.current);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [expanded, interacting, toast, toastType, documentHidden, deleteToast]);

  useEffect(() => {
    if (toast.delete) {
      // oxlint-disable-next-line react/set-state-in-effect -- The delete flag from toast.dismiss starts the removal.
      deleteToast();
      toast.onDismiss?.(toast);
    }
  }, [deleteToast, toast.delete, toast]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLLIElement>) => {
    if (event.button === 2 || isLoading || !dismissible) {
      return;
    }

    dragStartTime.current = new Date();
    setOffsetBeforeRemove(offset.current);
    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);

    if (target.tagName !== "BUTTON") {
      setSwiping(true);
      pointerStart.current = { x: event.clientX, y: event.clientY };
    }
  };

  const handlePointerUp = () => {
    if (swipeOut || !dismissible) {
      return;
    }

    pointerStart.current = null;
    const swipeAmountX = readSwipeAmount(toastRef.current, "--swipe-amount-x");
    const swipeAmountY = readSwipeAmount(toastRef.current, "--swipe-amount-y");

    const elapsed =
      Date.now() - (dragStartTime.current?.getTime() ?? Number.NaN);

    const swipeAmount = swipeDirection === "x" ? swipeAmountX : swipeAmountY;
    const velocity = Math.abs(swipeAmount) / elapsed;

    if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY) {
      setOffsetBeforeRemove(offset.current);
      toast.onDismiss?.(toast);

      if (swipeDirection === "x") {
        setSwipeOutDirection(swipeAmountX > 0 ? "right" : "left");
      } else {
        setSwipeOutDirection(swipeAmountY > 0 ? "down" : "up");
      }

      deleteToast();
      setSwipeOut(true);
    } else {
      toastRef.current?.style.setProperty("--swipe-amount-x", "0px");
      toastRef.current?.style.setProperty("--swipe-amount-y", "0px");
      setIsSwiped(false);
      setSwiping(false);
      setSwipeDirection(null);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLLIElement>) => {
    if (
      !pointerStart.current ||
      !dismissible ||
      (window.getSelection()?.toString().length ?? 0) > 0
    ) {
      return;
    }

    const deltaY = event.clientY - pointerStart.current.y;
    const deltaX = event.clientX - pointerStart.current.x;
    const directions = swipeDirections ?? swipeDirectionsFor(position);

    if (
      !swipeDirection &&
      (Math.abs(deltaX) > DRAG_LOCK_DISTANCE ||
        Math.abs(deltaY) > DRAG_LOCK_DISTANCE)
    ) {
      setSwipeDirection(Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y");
    }

    const amount = { x: 0, y: 0 };

    if (swipeDirection === "y") {
      if (directions.includes("top") || directions.includes("bottom")) {
        if (
          (directions.includes("top") && deltaY < 0) ||
          (directions.includes("bottom") && deltaY > 0)
        ) {
          amount.y = deltaY;
        } else {
          const damped = deltaY * damping(deltaY);
          amount.y = Math.abs(damped) < Math.abs(deltaY) ? damped : deltaY;
        }
      }
    } else if (
      swipeDirection === "x" &&
      (directions.includes("left") || directions.includes("right"))
    ) {
      if (
        (directions.includes("left") && deltaX < 0) ||
        (directions.includes("right") && deltaX > 0)
      ) {
        amount.x = deltaX;
      } else {
        const damped = deltaX * damping(deltaX);
        amount.x = Math.abs(damped) < Math.abs(deltaX) ? damped : deltaX;
      }
    }

    if (Math.abs(amount.x) > 0 || Math.abs(amount.y) > 0) {
      setIsSwiped(true);
    }

    toastRef.current?.style.setProperty("--swipe-amount-x", `${amount.x}px`);
    toastRef.current?.style.setProperty("--swipe-amount-y", `${amount.y}px`);
  };

  const liStyle = {
    "--index": index,
    "--initial-height": expandByDefault ? "auto" : `${initialHeight}px`,
    "--offset": `${removed ? offsetBeforeRemove : offsetValue}px`,
    "--toasts-before": index,
    "--z-index": toasts.length - index,
    ...style,
    ...toast.style,
  } as CSSProperties;

  const typeClassName = toastType
    ? classNames?.[toastType as keyof ToastClassNames]
    : undefined;

  const toastTypeClassName = toastType
    ? toast.classNames?.[toastType as keyof ToastClassNames]
    : undefined;

  const cancelButton = (() => {
    if (isValidElement(toast.cancel)) {
      return toast.cancel;
    }

    const { cancel } = toast;

    if (!cancel || !isButtonSpec(cancel)) {
      return null;
    }

    return (
      <button
        className={cn(classNames?.cancelButton, toast.classNames?.cancelButton)}
        data-button
        data-cancel
        onClick={(event) => {
          if (dismissible) {
            cancel.onClick?.(event);
            deleteToast();
          }
        }}
        style={toast.cancelButtonStyle || cancelButtonStyle}
        type="button"
      >
        {cancel.label}
      </button>
    );
  })();

  const actionButton = (() => {
    if (isValidElement(toast.action)) {
      return toast.action;
    }

    const { action } = toast;

    if (!action || !isButtonSpec(action)) {
      return null;
    }

    return (
      <button
        className={cn(classNames?.actionButton, toast.classNames?.actionButton)}
        data-action
        data-button
        onClick={(event) => {
          action.onClick?.(event);

          if (!event.defaultPrevented) {
            deleteToast();
          }
        }}
        style={toast.actionButtonStyle || actionButtonStyle}
        type="button"
      >
        {action.label}
      </button>
    );
  })();

  const closeControl =
    showsCloseButton && !toast.jsx && toastType !== "loading" ? (
      <button
        aria-label={closeButtonAriaLabel}
        className={cn(classNames?.closeButton, toast.classNames?.closeButton)}
        data-ck-close-button
        data-disabled={isLoading}
        onClick={() => {
          if (isLoading || !dismissible) {
            return;
          }

          deleteToast();
          toast.onDismiss?.(toast);
        }}
        type="button"
      >
        {icons?.close ?? CloseGlyph}
      </button>
    ) : null;

  return (
    // The li is focusable and handles pointer swipes; keyboard dismissal
    // goes through the close or action buttons inside it.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex
    <li
      className={cn(
        styles.toast,
        className,
        toast.className,
        classNames?.toast,
        toast.classNames?.toast,
        classNames?.default,
        typeClassName,
        toastTypeClassName
      )}
      data-dismissible={dismissible}
      data-expanded={Boolean(expanded || (expandByDefault && mounted))}
      data-front={isFront}
      data-index={index}
      data-invert={inverted}
      data-mounted={mounted}
      data-promise={Boolean(toast.promise)}
      data-removed={removed}
      data-ck-rich-colors={toast.richColors ?? defaultRichColors}
      data-sonner-toast=""
      data-styled={!(toast.jsx || toast.unstyled || unstyled)}
      data-ck-swipe-direction={swipeOutDirection}
      data-ck-swipe-out={swipeOut}
      data-swiped={isSwiped}
      data-swiping={swiping}
      data-testid={toast.testId}
      data-type={toastType}
      data-visible={isVisible}
      data-ck-x-position={xPosition}
      data-ck-y-position={yPosition}
      onDragEnd={() => {
        setSwiping(false);
        setSwipeDirection(null);
        pointerStart.current = null;
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={toastRef}
      style={liStyle}
      tabIndex={0}
    >
      {closeControl}
      {toastIconSlot(toast, icons, classNames)}
      <div
        className={cn(classNames?.content, toast.classNames?.content)}
        data-content=""
      >
        <div
          className={cn(classNames?.title, toast.classNames?.title)}
          data-title=""
        >
          {toast.jsx || resolveContent(toast.title)}
        </div>
        {toast.description ? (
          <div
            className={cn(
              descriptionClassName,
              toast.descriptionClassName,
              classNames?.description,
              toast.classNames?.description
            )}
            data-description=""
          >
            {resolveContent(toast.description)}
          </div>
        ) : null}
      </div>
      {cancelButton}
      {actionButton}
    </li>
  );
};

export interface SonnerToasterProps {
  className?: string;
  closeButton?: boolean;
  containerAriaLabel?: string;
  dir?: "auto" | "ltr" | "rtl";
  duration?: number;
  expand?: boolean;
  gap?: number;
  hotkey?: readonly string[];
  icons?: ToastIcons;
  id?: string;
  invert?: boolean;
  mobileOffset?: ToastOffset;
  offset?: ToastOffset;
  position?: ToastPosition;
  ref?: Ref<HTMLElement>;
  richColors?: boolean;
  style?: CSSProperties;
  swipeDirections?: SwipeDirection[];
  theme?: "dark" | "light" | "system";
  toastOptions?: {
    actionButtonStyle?: CSSProperties;
    cancelButtonStyle?: CSSProperties;
    className?: string;
    classNames?: ToastClassNames;
    closeButton?: boolean;
    closeButtonAriaLabel?: string;
    descriptionClassName?: string;
    duration?: number;
    style?: CSSProperties;
    unstyled?: boolean;
  };
  visibleToasts?: number;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

/* The system colour scheme, read and followed like the theme=system. */
const systemTheme = (): "dark" | "light" =>
  window.matchMedia(DARK_QUERY).matches ? "dark" : "light";

const lightTheme = (): "dark" | "light" => "light";

const subscribeSystemTheme = (onChange: () => void) => {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
};

const upsertToast = (current: ToastData[], event: ToastData) => {
  const index = current.findIndex((toast) => toast.id === event.id);

  if (index === -1) {
    return [event, ...current];
  }

  return [
    ...current.slice(0, index),
    { ...current[index], ...event },
    ...current.slice(index + 1),
  ];
};

const eventHasKey = (event: KeyboardEvent, key: string) =>
  Boolean((event as unknown as Record<string, unknown>)[key]) ||
  event.code === key;

export const SonnerToaster = ({
  id,
  invert,
  position = "bottom-right",
  hotkey = DEFAULT_HOTKEY,
  expand,
  closeButton,
  className,
  offset,
  mobileOffset,
  theme = "light",
  richColors,
  duration,
  style,
  visibleToasts = VISIBLE_TOASTS,
  toastOptions,
  dir = documentDirection(),
  gap = DEFAULT_GAP,
  icons,
  containerAriaLabel = DEFAULT_ARIA_LABEL,
  swipeDirections,
  ref,
}: SonnerToasterProps) => {
  const [allToasts, setAllToasts] = useState<ToastData[]>([]);

  const toasts = useMemo(
    () =>
      id
        ? allToasts.filter((toast) => toast.toasterId === id)
        : allToasts.filter((toast) => !toast.toasterId),
    [allToasts, id]
  );

  const positions = useMemo(
    () => [
      ...new Set([
        position,
        ...toasts.flatMap((toast) => (toast.position ? [toast.position] : [])),
      ]),
    ],
    [toasts, position]
  );

  const [heights, setHeights] = useState<ToastHeight[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [interacting, setInteracting] = useState(false);

  const systemScheme = useSyncExternalStore(
    subscribeSystemTheme,
    systemTheme,
    lightTheme
  );

  const resolvedTheme = theme === "system" ? systemScheme : theme;

  const listRef = useRef<HTMLOListElement | null>(null);

  const hotkeyLabel = hotkey
    .join("+")
    .replaceAll(KEY_PREFIX, "")
    .replaceAll(DIGIT_PREFIX, "");

  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const isFocusWithin = useRef(false);
  const [listMounted, setListMounted] = useState(false);

  const removeToast = useCallback((toast: ToastData) => {
    setAllToasts((current) => {
      if (!current.find((entry) => entry.id === toast.id)?.delete) {
        dismissToast(toast.id);
      }

      return current.filter(({ id: toastId }) => toastId !== toast.id);
    });
  }, []);

  useEffect(
    () =>
      subscribe((event) => {
        if (event.dismiss) {
          requestAnimationFrame(() => {
            setAllToasts((current) =>
              current.map((toast) =>
                toast.id === event.id ? { ...toast, delete: true } : toast
              )
            );
          });

          return;
        }

        setTimeout(() => {
          flushSync(() => {
            setAllToasts((current) => upsertToast(current, event));
          });
        }, 0);
      }),
    []
  );

  useEffect(() => {
    if (allToasts.length <= 1) {
      // oxlint-disable-next-line react/set-state-in-effect -- The component collapses the list when the toast state changes to one or none.
      setExpanded(false);
    }
  }, [allToasts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (hotkey.every((key) => eventHasKey(event, key))) {
        setExpanded(true);
        listRef.current?.focus();
      }

      if (
        event.code === "Escape" &&
        (document.activeElement === listRef.current ||
          listRef.current?.contains(document.activeElement))
      ) {
        setExpanded(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [hotkey]);

  useEffect(() => {
    if (listMounted) {
      return () => {
        if (lastFocusedElement.current) {
          lastFocusedElement.current.focus({ preventScroll: true });
          lastFocusedElement.current = null;
          isFocusWithin.current = false;
        }
      };
    }
  }, [listMounted]);

  const setList = useCallback((element: HTMLOListElement | null) => {
    listRef.current = element;
    setListMounted(element !== null);

    return () => {
      listRef.current = null;
      setListMounted(false);
    };
  }, []);

  return (
    <section
      aria-atomic="false"
      aria-label={`${containerAriaLabel} ${hotkeyLabel}`}
      aria-live="polite"
      aria-relevant="additions text"
      ref={ref}
      suppressHydrationWarning
      tabIndex={-1}
    >
      {positions.map((listPosition, positionIndex) => {
        const [yPosition, xPosition] = listPosition.split("-");

        if (!toasts.length) {
          return null;
        }

        return (
          <ol
            className={cn(styles.toaster, className)}
            data-sonner-theme={resolvedTheme}
            data-sonner-toaster
            data-ck-x-position={xPosition}
            data-ck-y-position={yPosition}
            dir={dir === "auto" ? documentDirection() : dir}
            key={listPosition}
            onBlur={(event) => {
              if (
                isFocusWithin.current &&
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                isFocusWithin.current = false;

                if (lastFocusedElement.current) {
                  lastFocusedElement.current.focus({ preventScroll: true });
                  lastFocusedElement.current = null;
                }
              }
            }}
            onDragEnd={() => {
              setExpanded(false);
            }}
            onFocus={(event) => {
              if (
                (event.target instanceof HTMLElement &&
                  event.target.dataset.dismissible === "false") ||
                isFocusWithin.current
              ) {
                return;
              }

              isFocusWithin.current = true;
              lastFocusedElement.current =
                event.relatedTarget instanceof HTMLElement
                  ? event.relatedTarget
                  : null;
            }}
            onMouseEnter={() => {
              setExpanded(true);
            }}
            onMouseLeave={() => {
              if (!interacting) {
                setExpanded(false);
              }
            }}
            onMouseMove={() => {
              setExpanded(true);
            }}
            onPointerDown={(event) => {
              if (
                event.target instanceof HTMLElement &&
                event.target.dataset.dismissible === "false"
              ) {
                return;
              }

              setInteracting(true);
            }}
            onPointerUp={() => {
              setInteracting(false);
            }}
            ref={setList}
            style={
              {
                "--front-toast-height": `${heights[0]?.height || 0}px`,
                "--gap": `${gap}px`,
                "--width": `${TOAST_WIDTH}px`,
                ...style,
                ...offsetVariables(offset, mobileOffset),
              } as CSSProperties
            }
            tabIndex={-1}
          >
            {toasts
              .filter(
                (toast) =>
                  (!toast.position && positionIndex === 0) ||
                  toast.position === listPosition
              )
              .map((toast, index) => (
                <SonnerToast
                  actionButtonStyle={toastOptions?.actionButtonStyle}
                  cancelButtonStyle={toastOptions?.cancelButtonStyle}
                  className={toastOptions?.className}
                  classNames={toastOptions?.classNames}
                  closeButton={toastOptions?.closeButton ?? closeButton}
                  closeButtonAriaLabel={toastOptions?.closeButtonAriaLabel}
                  defaultRichColors={richColors}
                  descriptionClassName={toastOptions?.descriptionClassName}
                  duration={toastOptions?.duration ?? duration}
                  expandByDefault={expand}
                  expanded={expanded}
                  gap={gap}
                  heights={heights.filter(
                    (height) => height.position === toast.position
                  )}
                  icons={icons}
                  index={index}
                  interacting={interacting}
                  invert={invert}
                  key={toast.id}
                  position={listPosition}
                  removeToast={removeToast}
                  setHeights={setHeights}
                  style={toastOptions?.style}
                  swipeDirections={swipeDirections}
                  toast={toast}
                  toasts={toasts.filter(
                    (entry) => entry.position === toast.position
                  )}
                  unstyled={toastOptions?.unstyled}
                  visibleToasts={visibleToasts}
                />
              ))}
          </ol>
        );
      })}
    </section>
  );
};
