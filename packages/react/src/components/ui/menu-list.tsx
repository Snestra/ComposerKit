"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { DataButton } from "@workspace/react/components/button/data-button";
import {
  ItemIndicatorContext,
  MenuContent,
  MenuItemIndicator,
  MenuItemShell,
  MenuRadioGroup,
  MenuRoot,
  leaveSubTrigger,
  mergeRefs,
  useKeyboardIntent,
  useMenuContent,
} from "@workspace/react/components/ui/menu";
import { useDismissableLayer } from "@workspace/react/lib/dismissable-layer";
import { cn } from "@workspace/react/lib/utils";
import {
  Check as LucideCheck,
  ChevronRight as LucideChevronRight,
} from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
  SVGProps,
} from "react";

/*
 * The Menu compound. The Electron
 * window sets menuAnimations to false, so the content mounts
 * without the enter and exit transition the CSS module also defines.
 */

/* Escape stack. */

interface EscapeEntry {
  callback: { current: () => void };
  id: string;
  /** The Escape the shared layer last handed to this entry as the newest layer. */
  newestFor: { current: Event | null };
}

let escapeStack: EscapeEntry[] = [];
let escapeListening = false;

const onEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    const [top] = escapeStack;

    // The stack only knows ListMenus; a dialog, popover, tooltip or other menu
    // opened above the newest ListMenu keeps Escape, so the entry acts only on
    // an Escape its layer received as the newest layer.
    if (top !== undefined && top.newestFor.current === event) {
      top.newestFor.current = null;
      event.preventDefault();
      top.callback.current();
    }
  }
};

const syncEscapeListener = () => {
  if (escapeStack.length > 0 && !escapeListening) {
    document.body.addEventListener("keydown", onEscape);
    escapeListening = true;
  } else if (escapeStack.length === 0 && escapeListening) {
    document.body.removeEventListener("keydown", onEscape);
    escapeListening = false;
  }
};

/**
 * While `active`, Escape runs the callback of the most recently opened entry.
 * The listener is on the body in the bubbling phase, so a descendant that
 * stops the Escape keeps the menu open. Base UI stops the propagation of an Escape it
 * handles; the menus cancel that close and allow propagation (see `onOpenChange` below).
 */
const useEscapeStack = (active: boolean, onEscapeKey: () => void) => {
  const id = useId();
  const latest = useRef(onEscapeKey);
  const newestFor = useRef<Event | null>(null);

  // Registers the menu in the shared layer set. The stack above still
  // closes it, in the bubble phase; the layer only reports whether it is the
  // newest.
  useDismissableLayer({
    active,
    modal: false,
    onDismiss: () => {
      // The Escape stack closes the menu.
    },
    onEscapeKeyDown: (event) => {
      newestFor.current = event;
    },
    onInteractOutside: (event) => {
      event.preventDefault();
    },
  });

  useLayoutEffect(() => {
    latest.current = onEscapeKey;
  });

  // Escape reaching the menu's own popup, from a row or the popup itself (not
  // from an input, which keeps it). A dialog around the menu stops the event
  // before the body listener runs, so the menu answers here too, once.
  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && newestFor.current === event.nativeEvent) {
      newestFor.current = null;
      latest.current();
    }
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    escapeStack.unshift({ callback: latest, id, newestFor });
    syncEscapeListener();

    // oxlint-disable-next-line typescript/consistent-return -- the effect returns a cleanup only on the paths that set something up
    return () => {
      escapeStack = escapeStack.filter((entry) => entry.id !== id);
      syncEscapeListener();
    };
  }, [active, id]);

  return onKeyDown;
};

/* ------------------------------------------------------------- tokens */

const radiusFull = "rounded-full";

/**
 * The `--ck-choice-menu-*` variables the Electron window sets, on top of the defaults in the same sheet.
 */
const menuTokens = [
  "[--ck-choice-menu-background-color:var(--theme-background-control-opaque)]",
  "[--ck-choice-menu-box-shadow:0_0_0_0.5px_var(--border),var(--shadow-xl)]",
  "[--ck-choice-menu-gutter:var(--spacing)]",
  "[--ck-choice-menu-radius:var(--radius-2xl)]",
  "[--ck-choice-menu-font-size:var(--text-sm)]",
  "[--ck-choice-menu-line-height:var(--text-sm--line-height)]",
  "[--ck-choice-menu-item-padding:calc(var(--spacing)*1.25)_8px]",
  "[--ck-choice-menu-item-content-padding:var(--spacing)_8px]",
  "[--ck-choice-menu-item-extra-padding-end:calc(var(--spacing)*3)]",
  "[--ck-choice-menu-item-gap:calc(var(--spacing)*1.5)]",
  "[--ck-choice-menu-item-radius:var(--radius-xl)]",
  "[--ck-choice-menu-item-background-color:var(--ck-palette-surface-button-secondary-hover)]",
  "[--ck-choice-menu-choice-item-gap:var(--ck-choice-menu-item-gap)]",
  "[--ck-choice-menu-choice-item-gap-end:var(--ck-choice-menu-item-gap)]",
  "[--ck-choice-menu-indicator-margin-start:calc(var(--spacing)*1.5)]",
  "[--ck-choice-menu-checkbox-indicator-size:calc(var(--spacing)*4)]",
  "[--ck-choice-menu-radio-indicator-size:1.125rem]",
  "[--ck-choice-menu-radio-indicator-hole-size:0.5rem]",
  "[--ck-choice-menu-separator-gutter:var(--spacing)_8px]",
  "[--ck-choice-menu-separator-background-color:var(--border)]",
  "[--ck-radio-indicator-border-color:var(--ck-palette-border-heavy)]",
  "[--ck-radio-indicator-border-color-hover:color-mix(in_oklab,var(--ck-palette-ink)_25%,transparent)]",
  "[--ck-radio-indicator-background-color:var(--ck-palette-ink)]",
  "[--ck-radio-indicator-hole-background-color:var(--theme-background-control-opaque)]",
  "[--ck-toggle-track-width:32px]",
  "[--ck-toggle-track-height:19px]",
  "[--ck-toggle-track-color:color-mix(in_oklab,var(--ck-palette-ink)_18%,transparent)]",
  "[--ck-toggle-track-color-hover:color-mix(in_oklab,var(--ck-palette-ink)_25%,transparent)]",
  "[--ck-toggle-track-color-checked:var(--ck-palette-accent-blue)]",
  "[--ck-toggle-track-color-checked-disabled:var(--ck-toggle-track-color-checked)]",
  "[--ck-toggle-track-color-disabled:color-mix(in_oklab,var(--ck-palette-ink)_8%,transparent)]",
  "[--ck-toggle-thumb-offset:3px]",
  "[--ck-toggle-thumb-size:calc(var(--ck-toggle-track-height)-2*var(--ck-toggle-thumb-offset))]",
  "[--ck-toggle-thumb-shadow:var(--shadow-sm)]",
  "[--ck-toggle-thumb-color:var(--theme-background-control-opaque)]",
  "[--ck-toggle-thumb-color-disabled:var(--theme-background-control-opaque)]",
].join(" ");

const listClasses = [
  menuTokens,
  "w-[var(--ck-choice-menu-width,auto)] min-w-[min(var(--ck-choice-menu-min-width,300px),var(--available-width))] max-w-[var(--available-width)] max-h-[min(var(--available-height),var(--ck-choice-menu-max-height,1200px))]",
  "overflow-auto p-[var(--ck-choice-menu-gutter)] rounded-[var(--ck-choice-menu-radius)] bg-[var(--ck-choice-menu-background-color)] shadow-[var(--ck-choice-menu-box-shadow)]",
  "text-text text-[length:var(--ck-choice-menu-font-size)] leading-[var(--ck-choice-menu-line-height)] pointer-events-auto origin-(--transform-origin) will-change-transform focus:outline-none",
  "data-[variant=descriptive]:[--ck-choice-menu-gutter:calc(var(--spacing)*1.5)] data-[variant=descriptive]:[--ck-choice-menu-radius:calc(var(--spacing)*5)] data-[variant=descriptive]:[--ck-choice-menu-font-size:0.8125rem] data-[variant=descriptive]:[--ck-choice-menu-line-height:1.125rem] data-[variant=descriptive]:[--ck-choice-menu-item-padding:var(--spacing)_calc(var(--spacing)*2)] data-[variant=descriptive]:[--ck-choice-menu-choice-item-gap:calc(var(--spacing)*3)] data-[variant=descriptive]:[--ck-choice-menu-choice-item-gap-end:calc(var(--spacing)*3)]",
  "data-[variant=descriptive]:[&_[data-menu-list-item]]:min-h-[calc(var(--spacing)*11)]",
  "data-[compact]:[--ck-choice-menu-item-extra-padding-end:0px]",
].join(" ");

const itemClasses = cn(
  "group relative block cursor-(--ck-action-cursor) items-center gap-[var(--ck-choice-menu-item-gap)] p-[var(--ck-choice-menu-item-padding)] text-text select-none focus:outline-none",
  "before:absolute before:inset-0 before:block before:scale-[var(--scale,.98)] before:rounded-[var(--ck-choice-menu-item-radius)] before:bg-[var(--ck-choice-menu-item-background-color)] before:opacity-0 before:transition-transform before:duration-(--motion-duration-fast) before:ease-(--ck-curve-enter) before:will-change-transform before:content-['']",
  "data-[highlighted]:before:scale-100 data-[highlighted]:before:opacity-100 data-[state=open]:before:scale-100 data-[state=open]:before:opacity-100",
  "data-[highlighted]:[&:has([data-menu-list-item-actions]:hover)]:before:opacity-40 data-[state=open]:[&:has([data-menu-list-item-actions]:hover)]:before:opacity-40",
  "data-[highlighted]:[&:not(:has([data-menu-list-item-actions]:hover)):active]:before:scale-[var(--scale,.98)]",
  "data-[highlighted]:[&_[data-menu-list-item-actions]]:opacity-100 data-[state=open]:[&_[data-menu-list-item-actions]]:opacity-100",
  "data-[color=danger]:text-[color:var(--color-status-danger)] data-[color=danger]:before:bg-[color-mix(in_oklab,#e5484d_16%,transparent)]",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:before:hidden"
);

/** `collisionPadding` of the content and the sub content. */
const listCollisionPadding = { bottom: 30, left: 12, right: 12, top: 30 };

const pressableInner =
  "relative flex [align-items:inherit] [justify-content:inherit] gap-[inherit] pe-[var(--ck-choice-menu-item-extra-padding-end,0)] has-[>[data-menu-list-item-actions]]:pe-0";

/* ------------------------------------------------------------- context */

interface ListMenuContextValue {
  compact: boolean;
  handleEscapeKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ListMenuContext = createContext<ListMenuContextValue | null>(null);

const useListMenu = () => {
  const context = use(ListMenuContext);

  if (!context) {
    throw new Error("Place list menu parts under a ListMenu root");
  }

  return context;
};

/** Width and height props become `--ck-choice-menu-*` variables. */
const menuVariables = (values: Record<string, number | string | undefined>) => {
  const styles: Record<string, string> = {};

  for (const [name, value] of Object.entries(values)) {
    // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
    if (value || value === 0) {
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Numeric menu dimensions need a pixel unit; strings already carry CSS units.
      const dimension = typeof value === "number" ? `${value}px` : value;
      styles[`--ck-choice-${name}`] = dimension;
    }
  }

  // oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion -- SAFETY: every key added is a `--name` custom property with a string value, which CSSProperties accepts
  return styles as CSSProperties;
};

/* --------------------------------------------------------------- icons */

/** The sub trigger chevron. */
const SubChevron = (props: SVGProps<SVGSVGElement>) => (
  <LucideChevronRight
    aria-hidden
    height="1em"
    width="1em"
    {...props}
    strokeWidth={1.5}
  />
);

/** The check mark of the indicators. */
const IndicatorCheck = (props: SVGProps<SVGSVGElement>) => (
  <LucideCheck
    aria-hidden
    height="1em"
    width="1em"
    {...props}
    strokeWidth={1.5}
  />
);

/* ----------------------------------------------------------- Root */

interface ListMenuProps {
  children?: ReactNode;
  compact?: boolean;
  forceOpen?: boolean;
  modal?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

/** The menu root. `modal` defaults to false. */
function ListMenu({
  children,
  compact = false,
  forceOpen,
  modal = false,
  onClose,
  onOpen,
}: ListMenuProps) {
  const [internal, setInternal] = useState(false);
  const open = forceOpen ?? internal;
  const isUsingKeyboard = useKeyboardIntent();
  const latestOpen = useRef(onOpen);
  const latestClose = useRef(onClose);

  useLayoutEffect(() => {
    latestOpen.current = onOpen;
    latestClose.current = onClose;
  });

  const setOpen = useCallback((next: boolean) => {
    setInternal(next);

    if (next) {
      latestOpen.current?.();
    } else {
      latestClose.current?.();
    }
  }, []);

  const handleEscapeKeyDown = useEscapeStack(open, () => {
    setOpen(false);
  });

  const value = useMemo(
    () => ({ compact, handleEscapeKeyDown, open, setOpen }),
    [compact, handleEscapeKeyDown, open, setOpen]
  );

  return (
    <ListMenuContext value={value}>
      <MenuRoot
        escapePhase="bubble"
        isUsingKeyboard={isUsingKeyboard}
        modal={modal}
        onOpenChange={(next, details) => {
          if (details?.reason === "escape-key") {
            // The Escape stack closes the menu from the body listener. Base UI would close
            // it here and stop the event, so the close is cancelled and the event may bubble.
            details.cancel();
            details.allowPropagation();

            return;
          }

          setOpen(next);
        }}
        open={open}
      >
        {children}
      </MenuRoot>
    </ListMenuContext>
  );
}

/** The trigger, passed as the child element. */
function ListMenuTrigger({
  children,
  disabled,
}: {
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the child element's props are the caller's, so their keys are open
  children: ReactElement<Record<string, unknown>>;
  disabled?: boolean;
}) {
  return (
    <MenuPrimitive.Trigger
      disabled={disabled}
      nativeButton={
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a trigger element type is a tag name or a component
        !(typeof children.type === "string" && children.type !== "button")
      }
      render={children}
    />
  );
}

/* --------------------------------------------------------- Content */

interface ListMenuContentProps {
  align?: "center" | "end" | "start";
  alignOffset?: number;
  children?: ReactNode;
  className?: string;
  container?: HTMLElement | null;
  maxHeight?: number | string;
  minWidth?: number | string;
  onCloseAutoFocus?: (event: Event) => void;
  side?: "bottom" | "left" | "right" | "top";
  sideOffset?: number;
  variant?: "default" | "descriptive";
  width?: number | string;
}

/** The positioned list. */
function ListMenuContent({
  align,
  alignOffset,
  children,
  className,
  container,
  maxHeight,
  minWidth = "auto",
  onCloseAutoFocus,
  side,
  sideOffset = 5,
  variant = "default",
  width = "auto",
}: ListMenuContentProps) {
  const { compact, handleEscapeKeyDown } = useListMenu();

  return (
    <MenuPrimitive.Portal container={container ?? undefined}>
      <MenuContent
        align={align}
        alignOffset={alignOffset ?? (align === "center" ? 0 : -5)}
        className={cn(listClasses, className)}
        collisionPadding={listCollisionPadding}
        data-compact={compact ? "" : undefined}
        data-variant={variant}
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={handleEscapeKeyDown}
        side={side}
        sideOffset={sideOffset}
        style={{
          // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets the menu variables and scale through a style prop
          scale: "1",
          // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets the menu variables and scale through a style prop
          ...menuVariables({
            "menu-max-height": maxHeight,
            "menu-min-width": minWidth,
            "menu-width": width,
          }),
        }}
        unstyled
      >
        {children}
      </MenuContent>
    </MenuPrimitive.Portal>
  );
}

/* ----------------------------------------------------------- Item */

/** A selectable row, or a plain content row without handlers. */
function ListMenuItem({
  children,
  className,
  color,
  disabled,
  onClick,
  onSelect,
}: {
  children?: ReactNode;
  className?: string;
  color?: "danger";
  disabled?: boolean;
  onClick?: ComponentProps<"div">["onClick"];
  onSelect?: (event: Event) => void;
}) {
  const { open } = useListMenu();

  if (!onSelect && !onClick) {
    return (
      <div
        className={cn(
          "p-[var(--ck-choice-menu-item-content-padding,var(--ck-choice-menu-item-padding))]",
          className
        )}
      >
        {children}
      </div>
    );
  }

  const guard = (event: { preventDefault: () => void }) => {
    if (!open) {
      event.preventDefault();
    }
  };

  return (
    <MenuItemShell
      className={cn(itemClasses, className)}
      data-color={color}
      data-menu-list-item=""
      disabled={disabled}
      onClick={onClick}
      onPointerLeave={guard}
      onPointerMove={guard}
      onSelect={onSelect}
    >
      <div className={pressableInner}>{children}</div>
    </MenuItemShell>
  );
}

function ListMenuItemActions({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mr-[-5px] flex h-0 items-center opacity-0", className)}
      data-menu-list-item-actions=""
    >
      {children}
    </div>
  );
}

/**
 * An icon button inside the actions slot. It renders the design-system Button
 * as a ghost, secondary, small, uniform square with
 * small icons and no pill. The click stops propagation, closes the menu, then calls the handler.
 */
function ListMenuItemAction({
  children,
  onClick,
}: {
  children?: ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { setOpen } = useListMenu();

  return (
    <DataButton
      color="secondary"
      iconSize="sm"
      onClick={(event) => {
        event.stopPropagation();
        setOpen(false);
        onClick(event);
      }}
      pill={false}
      size="sm"
      uniform
      variant="ghost"
    >
      {children}
    </DataButton>
  );
}

/** A link row. Absolute http(s) hrefs open in a new tab. */
function ListMenuLink({
  as,
  children,
  className,
  disabled,
  href,
  to,
  ...props
}: Omit<ComponentProps<"a">, "href"> & {
  as?: React.ElementType;
  disabled?: boolean;
  href?: string;
  to?: string;
}) {
  const { open } = useListMenu();
  const target = href === undefined || href === "" ? to : href;
  // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
  const external = !target || /^https?:\/\//u.test(target);
  const Tag = as ?? "a";

  const guard = external
    ? undefined
    : (event: { preventDefault: () => void }) => {
        if (!open) {
          event.preventDefault();
        }
      };

  const linkProps = external
    ? { href: href ?? to, rel: "noopener noreferrer", target: "_blank" }
    : { href, to };

  return (
    <MenuItemShell
      asChild
      className={cn(itemClasses, className)}
      data-menu-list-item=""
      disabled={disabled}
      onPointerLeave={guard}
      onPointerMove={guard}
    >
      <Tag {...linkProps} {...props}>
        <span className={pressableInner}>{children}</span>
      </Tag>
    </MenuItemShell>
  );
}

/** `role=separator`, 1px high. */
function ListMenuSeparator({ className }: { className?: string }) {
  return (
    // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a separator is not a control and has no label
    <div
      className={cn(
        "m-[var(--ck-choice-menu-separator-gutter)] h-px bg-[var(--ck-choice-menu-separator-background-color)]",
        className
      )}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the component renders a div with this role
      role="separator"
    />
  );
}

function ListMenuDescription({ children }: { children?: ReactNode }) {
  return (
    <span className="text-[length:0.75rem] leading-[1.125rem] text-text-subtle">
      {children}
    </span>
  );
}

/* Submenus. */

interface ListSubContextValue {
  handleEscapeKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  popupRef: { current: HTMLDivElement | null };
  triggerRef: { current: HTMLElement | null };
}

const ListSubContext = createContext<ListSubContextValue | null>(null);

const useListSub = () => {
  const context = use(ListSubContext);

  if (!context) {
    throw new Error("Place submenu parts under a Sub root");
  }

  return context;
};

function ListMenuSub({
  children,
  forceOpen,
  onClose,
  onOpen,
}: {
  children?: ReactNode;
  forceOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}) {
  const [internal, setInternal] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const open = forceOpen ?? internal;
  const latestOpen = useRef(onOpen);
  const latestClose = useRef(onClose);

  useLayoutEffect(() => {
    latestOpen.current = onOpen;
    latestClose.current = onClose;
  });

  const setOpen = useCallback((next: boolean) => {
    setInternal(next);

    if (next) {
      latestOpen.current?.();
    } else {
      latestClose.current?.();
    }
  }, []);

  const handleEscapeKeyDown = useEscapeStack(open, () => {
    setOpen(false);
    triggerRef.current?.focus();
  });

  const value = useMemo(
    () => ({ handleEscapeKeyDown, open, popupRef, setOpen, triggerRef }),
    [handleEscapeKeyDown, open, setOpen]
  );

  return (
    <ListSubContext value={value}>
      <MenuPrimitive.SubmenuRoot
        onOpenChange={(next, details) => {
          if (details.reason === "escape-key") {
            details.cancel();
            details.allowPropagation();

            return;
          }

          setOpen(next);
        }}
        open={open}
      >
        {children}
      </MenuPrimitive.SubmenuRoot>
    </ListSubContext>
  );
}

/** The row that opens a submenu. Hover opens after 100ms. */
function ListMenuSubTrigger({
  children,
  className,
  disabled,
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { open } = useListMenu();
  const sub = useListSub();
  const parent = useMenuContent();
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const guard = (event: { preventDefault: () => void }) => {
    if (!open) {
      event.preventDefault();
    }
  };

  return (
    <MenuPrimitive.SubmenuTrigger
      aria-haspopup="menu"
      className={cn(itemClasses, "justify-between", className)}
      data-menu-list-item=""
      data-state={sub.open ? "open" : "closed"}
      disabled={disabled}
      nativeButton={false}
      onClick={(event) => {
        // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
        if (!disabled && !event.defaultPrevented) {
          event.currentTarget.focus();

          if (!sub.open) {
            sub.setOpen(true);
          }
        }
      }}
      onPointerLeave={(event) => {
        clear();
        guard(event);

        if (event.pointerType === "mouse") {
          leaveSubTrigger(parent, event, sub.popupRef.current);
        }
      }}
      onPointerMove={(event) => {
        guard(event);

        if (event.pointerType !== "mouse") {
          return;
        }

        parent.onItemEnter(event);

        if (
          !event.defaultPrevented &&
          // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
          !disabled &&
          !sub.open &&
          timer.current === null
        ) {
          parent.onPointerGraceIntentChange(null);
          timer.current = window.setTimeout(() => {
            sub.setOpen(true);
            clear();
          }, 100);
        }
      }}
      openOnHover={false}
      ref={mergeRefs(sub.triggerRef)}
      render={<div />}
    >
      <div className={cn(pressableInner, "[&]:pe-0")}>
        {children}
        <SubChevron
          className={cn(
            "mr-[-2px] size-4 opacity-75",
            // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
            (sub.open || undefined) && "opacity-100",
            "group-data-[highlighted]:opacity-100"
          )}
        />
      </div>
    </MenuPrimitive.SubmenuTrigger>
  );
}

/** Submenu content. Defaults sideOffset 4 and alignOffset -6. */
function ListMenuSubContent({
  alignOffset = -6,
  children,
  maxHeight,
  minWidth = "auto",
  sideOffset = 4,
  width = "auto",
}: {
  alignOffset?: number;
  children?: ReactNode;
  maxHeight?: number | string;
  minWidth?: number | string;
  sideOffset?: number;
  width?: number | string;
}) {
  const { compact } = useListMenu();
  const sub = useListSub();
  const { handleEscapeKeyDown } = useListSub();

  return (
    <MenuPrimitive.Portal>
      <MenuContent
        alignOffset={alignOffset}
        className={listClasses}
        collisionPadding={listCollisionPadding}
        data-compact={compact ? "" : undefined}
        kind="sub"
        onKeyDown={handleEscapeKeyDown}
        // oxlint-disable-next-line react/refs -- refs are only handed on (merged, passed to `ref`, or read in handlers); no `.current` is read to produce output
        ref={sub.popupRef}
        side="right"
        sideOffset={sideOffset}
        style={{
          // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets the menu variables and scale through a style prop
          scale: "1",
          // oxlint-disable-next-line shadcn/no-inline-styles -- the component sets the menu variables and scale through a style prop
          ...menuVariables({
            "menu-max-height": maxHeight,
            "menu-min-width": minWidth,
            "menu-width": width,
          }),
        }}
        unstyled
      >
        {children}
      </MenuContent>
    </MenuPrimitive.Portal>
  );
}

/* Choice items. */

type IndicatorPosition = "end" | "start";

const ListRadioValue = createContext<{
  onChange?: (value: string) => void;
  value?: string;
}>({});

/** Sets `data-ck-indicator-position` for its radio items. */
function ListMenuRadioGroup({
  children,
  indicatorPosition = "end",
  onChange,
  value,
}: {
  children?: ReactNode;
  indicatorPosition?: IndicatorPosition;
  onChange: (value: string) => void;
  value?: string;
}) {
  return (
    // oxlint-disable-next-line react/jsx-no-constructed-context-values -- the value closes over this render's handlers and state, as the Radix context does
    <ListRadioValue value={{ onChange, value }}>
      <MenuRadioGroup
        data-ck-indicator-position={indicatorPosition}
        onValueChange={onChange}
        value={value}
      >
        {children}
      </MenuRadioGroup>
    </ListRadioValue>
  );
}

const choiceGap =
  "gap-[var(--ck-choice-menu-choice-item-gap)] in-data-[indicator-position=end]:justify-between in-data-[indicator-position=end]:gap-[var(--ck-choice-menu-choice-item-gap-end)]";

/** `[data-ck-indicator-position=end]` placement of an indicator. */
const endPlacement =
  "in-data-[indicator-position=end]:order-1 in-data-[indicator-position=end]:ms-[var(--ck-choice-menu-indicator-margin-start,0)]";

interface ListChoiceItemProps {
  checked?: boolean;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  kind: "checkbox" | "radio";
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
  value?: string;
  variant?: string;
  indicatorPosition?: IndicatorPosition;
  indicatorVariant?: string;
}

/** Shared row of the checkbox and radio items: Radix item plus `PressableInner`. */
function ListChoiceItem({
  checked,
  children,
  className,
  disabled,
  indicatorPosition,
  indicatorVariant,
  kind,
  onCheckedChange,
  onSelect,
  value,
  variant,
}: ListChoiceItemProps) {
  const group = use(ListRadioValue);
  const isChecked = kind === "radio" ? group.value === value : Boolean(checked);

  return (
    <ItemIndicatorContext value={isChecked}>
      <MenuItemShell
        aria-checked={isChecked}
        className={cn(itemClasses, className)}
        data-ck-indicator-position={indicatorPosition}
        data-ck-indicator-variant={indicatorVariant}
        data-menu-list-item=""
        data-state={isChecked ? "checked" : "unchecked"}
        data-variant={variant}
        disabled={disabled}
        onClick={() => {
          // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
          if (kind === "checkbox" && !disabled) {
            onCheckedChange?.(!isChecked);
          }
        }}
        onSelect={(event) => {
          if (kind === "radio" && value !== undefined) {
            group.onChange?.(value);
          }

          if (kind === "checkbox") {
            event.preventDefault();
          }

          onSelect?.(event);
        }}
        role={kind === "radio" ? "menuitemradio" : "menuitemcheckbox"}
      >
        <div className={pressableInner}>{children}</div>
      </MenuItemShell>
    </ItemIndicatorContext>
  );
}

/** A radio row. `indicatorVariant` is `radio` or `checkmark`. */
function ListMenuRadioItem({
  children,
  className,
  disabled,
  indicatorVariant = "radio",
  onSelect,
  value,
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  indicatorVariant?: "checkmark" | "radio";
  onSelect?: (event: Event) => void;
  value: string;
}) {
  return (
    <ListChoiceItem
      className={cn(choiceGap, className)}
      disabled={disabled}
      kind="radio"
      onSelect={onSelect}
      value={value}
    >
      {indicatorVariant === "checkmark" ? (
        <div
          className={cn(
            "size-[var(--ck-choice-menu-checkbox-indicator-size)] shrink-0",
            endPlacement
          )}
        >
          <MenuItemIndicator>
            <IndicatorCheck className="size-4" />
          </MenuItemIndicator>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex size-[var(--ck-choice-menu-radio-indicator-size)] shrink-0 cursor-(--ck-action-cursor) items-center justify-center rounded-full border-none bg-transparent p-0 shadow-[inset_0_0_0_1px_var(--ck-radio-indicator-border-color)] group-data-[disabled]:cursor-not-allowed group-data-[highlighted]:shadow-[inset_0_0_0_1px_var(--ck-radio-indicator-border-color-hover)]",
            endPlacement
          )}
        >
          <MenuItemIndicator>
            <span className="relative inline-grid h-full w-full items-center justify-center before:col-start-1 before:row-start-1 before:block before:size-[var(--ck-choice-menu-radio-indicator-size)] before:animate-in before:place-self-center before:rounded-full before:bg-[var(--ck-radio-indicator-background-color)] before:duration-[400ms] before:ease-(--ck-curve-enter) before:content-[''] before:fade-in-0 after:col-start-1 after:row-start-1 after:block after:size-[var(--ck-choice-menu-radio-indicator-hole-size)] after:animate-in after:place-self-center after:rounded-full after:bg-[var(--ck-radio-indicator-hole-background-color)] after:duration-[400ms] after:ease-(--ck-curve-enter) after:content-[''] after:zoom-in-0" />
          </MenuItemIndicator>
        </div>
      )}
      {children}
    </ListChoiceItem>
  );
}

/** A checkbox row. `variant` is `checkbox` or `switch`. */
function ListMenuCheckboxItem({
  checked,
  children,
  className,
  disabled,
  indicatorPosition = "end",
  indicatorVariant = "solid",
  onCheckedChange,
  onSelect,
  variant = "checkbox",
}: {
  checked?: boolean;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  indicatorPosition?: IndicatorPosition;
  indicatorVariant?: "ghost" | "solid";
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
  variant?: "checkbox" | "switch";
}) {
  const indicatorBox = cn(
    "size-[var(--ck-choice-menu-checkbox-indicator-size)] shrink-0",
    indicatorPosition === "end" &&
      "order-1 ms-[var(--ck-choice-menu-indicator-margin-start,0)]",
    indicatorVariant === "solid" &&
      "rounded-full shadow-[inset_0_0_0_1px_var(--ck-radio-indicator-border-color)]"
  );

  return (
    <ListChoiceItem
      checked={checked}
      className={cn(
        "gap-[var(--ck-choice-menu-choice-item-gap)]",
        indicatorPosition === "end" &&
          "justify-between gap-[var(--ck-choice-menu-choice-item-gap-end)]",
        className
      )}
      disabled={disabled}
      indicatorPosition={indicatorPosition}
      indicatorVariant={indicatorVariant}
      kind="checkbox"
      onCheckedChange={onCheckedChange}
      onSelect={onSelect}
      variant={variant}
    >
      {variant === "switch" ? (
        <div
          aria-hidden="true"
          className={cn(
            "relative h-[var(--ck-toggle-track-height)] w-[var(--ck-toggle-track-width)] shrink-0 rounded-full bg-[var(--ck-toggle-track-color)] transition-colors delay-50 duration-[175ms] ease-linear group-data-[highlighted]:bg-[var(--ck-toggle-track-color-hover)] data-[state=checked]:bg-[var(--ck-toggle-track-color-checked)]",
            "group-data-[disabled]:bg-[var(--ck-toggle-track-color-disabled)] group-data-[disabled]:data-[state=checked]:bg-[var(--ck-toggle-track-color-checked-disabled)]",
            indicatorPosition === "end" &&
              "order-1 ms-[var(--ck-choice-menu-indicator-margin-start,0)]"
          )}
          // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
          data-state={checked ? "checked" : "unchecked"}
        >
          <div
            className={cn(
              "absolute [inset-inline-start:var(--ck-toggle-thumb-offset)] top-[var(--ck-toggle-thumb-offset)] size-[var(--ck-toggle-thumb-size)] rounded-full bg-[var(--ck-toggle-thumb-color)] shadow-[var(--ck-toggle-thumb-shadow)] transition-[inset-inline-start] duration-[250ms] ease-(--ck-curve-move)",
              // oxlint-disable-next-line typescript/strict-boolean-expressions -- the code keeps the truthiness test of an optional value, where false, undefined and an empty string all mean absent
              checked &&
                "[inset-inline-start:calc(var(--ck-toggle-track-width)-var(--ck-toggle-thumb-size)-var(--ck-toggle-thumb-offset))]",
              "group-data-[disabled]:bg-[var(--ck-toggle-thumb-color-disabled)] group-data-[disabled]:shadow-none"
            )}
          />
        </div>
      ) : (
        <div className={indicatorBox}>
          <MenuItemIndicator>
            {indicatorVariant === "ghost" ? (
              <IndicatorCheck className="size-4" />
            ) : (
              <div
                className={cn(
                  "relative flex size-[var(--ck-choice-menu-checkbox-indicator-size)] shrink-0 animate-in items-center justify-center rounded-full bg-[var(--ck-radio-indicator-background-color)] text-[var(--ck-radio-indicator-hole-background-color)] duration-500 ease-(--ck-curve-enter) fade-in-0",
                  radiusFull
                )}
              >
                <IndicatorCheck className="size-4" />
              </div>
            )}
          </MenuItemIndicator>
        </div>
      )}
      {children}
    </ListChoiceItem>
  );
}

export {
  ListMenu,
  ListMenuCheckboxItem,
  ListMenuContent,
  ListMenuDescription,
  ListMenuItem,
  ListMenuItemAction,
  ListMenuItemActions,
  ListMenuLink,
  ListMenuRadioGroup,
  ListMenuRadioItem,
  ListMenuSeparator,
  ListMenuSub,
  ListMenuSubContent,
  ListMenuSubTrigger,
  ListMenuTrigger,
};

export type { ListMenuContentProps, ListMenuProps };
