"use client";

/* oxlint-disable eslint/complexity -- resolveLinkDisposition and AppLink keep one branch per case. */

import { Button } from "@workspace/react/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from "@workspace/react/components/ui/dialog";
import { MenuContextMenu } from "@workspace/react/components/ui/menu";
import type { MenuContextItem } from "@workspace/react/components/ui/menu";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { resolvesToExternalWeb } from "@workspace/react/lib/link-destination";
import { cn } from "@workspace/react/lib/utils";
import { Download, ExternalLink, Link2, MoreHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from "react";

/*
 * The app link.
 *
 * The component opens links through the app's browser, download and window
 * services. Those are effects of the host, so they arrive as `services`
 * callbacks and receive the same request the component builds. Everything that
 * decides what a click means, and what the dialog, toolbar and menu show, is
 * here.
 */

type LinkDisposition = "new-background-tab" | "new-tab";

type LinkClickModifier = "alt" | "primary" | "primary-shift";

type LinkOpenTarget = "external-browser" | "in-app-browser";

type LinkPresentationIntent = "full-width" | "new-window" | "split";

interface LinkOpenRequest {
  clickModifiers?: LinkClickModifier;
  conversationId?: string | null;
  disposition?: LinkDisposition;
  hostId?: string;
  href: string;
  initiator?: string;
  openAsWebsite?: boolean;
  openTarget?: LinkOpenTarget;
  openTargetIntent?: "default";
  originHostId?: string;
  presentationIntent?: LinkPresentationIntent;
  useExternalBrowser?: boolean;
}

interface LinkOpenIntercept {
  conversationId?: string | null;
  hostId?: string;
  href: string;
  initiator?: string;
  title?: string;
}

interface AppLinkServices {
  /** Whether the host can start downloads. */
  canDownload?: boolean;
  /** Whether the host has detached windows. */
  canOpenNewWindow?: boolean;
  /** The setting `externalBrowserLinkShortcut`; `alt` keeps Alt-click for the external browser. */
  externalBrowserLinkShortcut?: string;
  /** Registered open listeners; true means one handled the open. */
  intercept?: (link: LinkOpenIntercept) => boolean;
  /** Whether the system browser is the default one (`browserPreferences.isDefaultBrowser`). */
  isDefaultBrowser?: boolean;
  onDownloadLink?: (href: string) => void;
  onOpenLink?: (request: LinkOpenRequest) => void;
  /** The desktop drag of a web link (`electronBridge.startLinkDrag`). */
  startLinkDrag?: (link: { html: string; title: string; url: string }) => void;
}

type AppLinkAppearance =
  | "button"
  | "default"
  | "inherit"
  | "primary"
  | "secondary"
  | "source";

type AppLinkUnderline = "always" | "hover" | "none";

/* ------------------------------------------------------------------ */
/* Helpers                                             */
/* ------------------------------------------------------------------ */

const MAC_PLATFORM = /Mac|iPhone|iPad|iPod/u;

const HAS_SCHEME = /^(?:[a-z][a-z0-9+.-]*:|www\.|\/\/)/iu;

// Hook class: `a.button-link{color:revert-layer}` cancels unlayered anchor colors.
// oxlint-disable-next-line shadcn/no-unknown-classes -- hook class kept as a styling target.
const LINK_MARKER = "button-link";

const WEB_URL = /^https?:\/\//iu;

const EXTERNAL_PROTOCOLS = new Set(["mailto:", "sms:", "tel:"]);

const VSCODE_HOSTS = new Set(["file", "vscode-remote"]);

type ClickLike = Pick<
  ReactMouseEvent<HTMLElement>,
  "altKey" | "button" | "ctrlKey" | "metaKey" | "shiftKey"
>;

/** Command on Apple platforms, Control elsewhere. */
const isPrimaryModifier = ({ ctrlKey, metaKey }: ClickLike) =>
  MAC_PLATFORM.test(navigator.platform) ? metaKey : ctrlKey;

/** A scheme, `www.` or `//` at the start. */
const hasScheme = (href: string) => HAS_SCHEME.test(href);

/** `//host` and `www.host` become https links. */
const normalizeHref = (href: string) => {
  if (href.startsWith("//")) {
    return `https:${href}`;
  }

  return /^www\./iu.test(href) ? `https://${href}` : href;
};

/** Mail, text and phone links, and vscode links to local hosts. */
const isExternalSchemeLink = (href: string) => {
  try {
    const url = new URL(href);

    if (url.protocol === "vscode:" || url.protocol === "vscode-insiders:") {
      return (
        url.username.length === 0 &&
        url.password.length === 0 &&
        VSCODE_HOSTS.has(url.host)
      );
    }

    return EXTERNAL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

/** An http or https link, local or not. */
const isWebLink = (href: string) => {
  if (!hasScheme(href)) {
    return false;
  }

  try {
    const { protocol } = new URL(normalizeHref(href.trim()));

    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

/** The click modifier a link open reports. */
const clickModifier = (
  event: ClickLike,
  primary: boolean
): LinkClickModifier | undefined => {
  if (event.button !== 0) {
    return undefined;
  }

  if (primary && !event.altKey && !(event.ctrlKey && event.metaKey)) {
    return event.shiftKey ? "primary-shift" : "primary";
  }

  return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
    ? "alt"
    : undefined;
};

/** Command or Control click, or a middle click, opens a tab. */
const tabDisposition = (event: ClickLike): LinkDisposition | undefined => {
  if (isPrimaryModifier(event) || event.button === 1) {
    return event.shiftKey ? "new-tab" : "new-background-tab";
  }

  return undefined;
};

/** A plain Alt click. */
const isAltClick = (event: ClickLike) =>
  event.button === 0 &&
  event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

/* ------------------------------------------------------------------ */
/* Disposition                                                         */
/* ------------------------------------------------------------------ */

interface LinkDispositionInput {
  conversationId?: string | null;
  defaultDisposition?: LinkDisposition;
  event: ReactMouseEvent<HTMLElement> | MouseEvent;
  hostId?: string;
  href: string;
  initiator?: string;
  intercept?: (link: LinkOpenIntercept) => boolean;
  isBrowserEnabled?: boolean;
  openAsWebsite?: boolean;
  openTarget?: LinkOpenTarget;
}

interface LinkDispositionResult {
  clickModifiers?: LinkClickModifier;
  disposition?: LinkDisposition;
  onOpen?: () => boolean;
  openTarget?: LinkOpenTarget;
  openTargetIntent?: "default";
  presentationIntent?: LinkPresentationIntent;
  useExternalBrowser?: boolean;
}

const linkTitle = (event: LinkDispositionInput["event"]) => {
  const current =
    event.currentTarget instanceof Element ? event.currentTarget : null;

  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null;

  return (anchor ?? current)?.textContent?.trim();
};

/**
 * What a click on a link asks for. Modified clicks open tabs, an
 * in-app markdown link outside the tab panels opens beside the thread (or
 * full width with Alt and the primary key), and mail, text and phone links go
 * to the external handler.
 */
const resolveLinkDisposition = ({
  conversationId,
  defaultDisposition,
  event,
  hostId,
  href,
  initiator,
  intercept,
  isBrowserEnabled,
  openAsWebsite,
  openTarget,
}: LinkDispositionInput): LinkDispositionResult => {
  const external = isExternalSchemeLink(href);
  const tab = external ? undefined : tabDisposition(event);

  const current =
    event.currentTarget instanceof Element ? event.currentTarget : null;

  const mainArea = current?.closest('[data-ck-shell-focus-area="main"]');
  const primary = isPrimaryModifier(event);

  const inApp =
    isBrowserEnabled === true &&
    initiator === "link_click" &&
    openTarget !== "external-browser" &&
    !external &&
    event.button === 0 &&
    !event.shiftKey &&
    (mainArea === null ||
      mainArea === undefined ||
      mainArea.getAttribute("role") === "tabpanel" ||
      (event.altKey && primary)) &&
    current?.closest("[data-app-shell-tab-panel-controller]") === null;

  const fullWidth =
    inApp && event.altKey && !(event.ctrlKey && event.metaKey) && primary;

  const clickModifiers =
    !external && openTarget === undefined && !fullWidth
      ? clickModifier(event, primary)
      : undefined;

  let disposition = defaultDisposition;

  if (tab !== undefined && !fullWidth) {
    disposition = tab;
  }

  let presentationIntent: LinkPresentationIntent | undefined;

  if (inApp && ((!event.ctrlKey && !event.metaKey) || fullWidth)) {
    presentationIntent = fullWidth ? "full-width" : "split";
  }

  const plainClick =
    openAsWebsite !== true &&
    openTarget === undefined &&
    defaultDisposition === undefined &&
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey;

  return {
    clickModifiers,
    disposition,
    onOpen: plainClick
      ? () =>
          intercept?.({
            conversationId,
            hostId,
            href: normalizeHref(href),
            initiator,
            title: linkTitle(event),
          }) ?? false
      : undefined,
    openTarget: fullWidth ? "in-app-browser" : openTarget,
    openTargetIntent: external ? undefined : "default",
    presentationIntent,
    useExternalBrowser: external ? true : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* Clipboard                                                           */
/* ------------------------------------------------------------------ */

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return false;
  }

  return true;
};

/* ------------------------------------------------------------------ */
/* Confirmation dialog                                           */
/* ------------------------------------------------------------------ */

interface LinkConfirmation extends LinkDispositionResult {
  downloadFilename?: string;
  href: string;
  initiator?: string;
  onDownload?: () => void;
  originHostId?: string;
  showCopyLink: boolean;
}

interface LinkConfirmationDialogProps {
  confirmation: LinkConfirmation;
  onClose: () => void;
  onOpenLink: (request: LinkOpenRequest) => void;
}

const confirmationTitle = (confirmation: LinkConfirmation) => {
  if (confirmation.downloadFilename !== undefined) {
    return "Download file?";
  }

  return confirmation.onDownload === undefined
    ? "Open external link?"
    : "Download external link?";
};

const LinkConfirmationDialog = ({
  confirmation,
  onClose,
  onOpenLink,
}: LinkConfirmationDialogProps) => {
  const { downloadFilename, href, onDownload, onOpen, showCopyLink } =
    confirmation;

  const title = confirmationTitle(confirmation);

  const copyAndClose = async () => {
    if (await copyText(href)) {
      onClose();
    }
  };

  const description =
    downloadFilename === undefined
      ? "Confirm before connecting to this website"
      : "This app wants to download a file to your device";

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
      size="compact"
      variant="form"
    >
      <DialogBody
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          onClose();

          if (onDownload !== undefined) {
            onDownload();
          } else if (onOpen === undefined || !onOpen()) {
            onOpenLink({
              clickModifiers: confirmation.clickModifiers,
              disposition: confirmation.disposition,
              href,
              initiator: confirmation.initiator,
              openTarget: confirmation.openTarget,
              openTargetIntent: confirmation.openTargetIntent,
              originHostId: confirmation.originHostId,
              presentationIntent: confirmation.presentationIntent,
              useExternalBrowser: confirmation.useExternalBrowser,
            });
          }
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <DialogSection>
          <DialogHeader subtitle={description} title={title} />
        </DialogSection>
        <DialogSection>
          <div className="rounded-md bg-panel-secondary/92 p-3 text-sm break-all text-secondary">
            {downloadFilename ?? href}
          </div>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            {showCopyLink ? (
              <Button
                color="secondary"
                onClick={() => {
                  void copyAndClose();
                }}
                type="button"
              >
                Copy link
              </Button>
            ) : null}
            <DialogClose render={<Button color="secondary" />}>
              Cancel
            </DialogClose>
            <Button type="submit">
              {onDownload === undefined ? "Open link" : "Download"}
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ */
/* Menu items                                                    */
/* ------------------------------------------------------------------ */

type LinkMenuPresentation = "context-menu" | "hover-menu";

interface LinkMenuInput {
  appLinkItems?: readonly MenuContextItem[];
  hostId?: string;
  href: string;
  initiator?: string;
  isBrowserEnabled: boolean;
  onActivate?: () => void;
  presentation: LinkMenuPresentation;
  selectedText?: string;
  services: AppLinkServices;
}

const message = (id: string, defaultMessage: string) => ({
  defaultMessage,
  id,
});

const menuIcon = (
  icon: ReactElement,
  presentation: LinkMenuPresentation
): ReactElement | undefined =>
  presentation === "context-menu" ? icon : undefined;

/** The destinations and actions of a link menu. */
const linkMenuItems = ({
  appLinkItems,
  hostId,
  href,
  initiator,
  isBrowserEnabled,
  onActivate,
  presentation,
  selectedText,
  services,
}: LinkMenuInput): MenuContextItem[] => {
  const contextMenu = presentation === "context-menu";
  const normalized = normalizeHref(href);

  const open = (request: Partial<LinkOpenRequest>) => {
    onActivate?.();
    services.onOpenLink?.({ hostId, href: normalized, initiator, ...request });
  };

  const openInBrowser = (intent?: LinkPresentationIntent) => {
    open({
      disposition: "new-tab",
      openTarget: "in-app-browser",
      presentationIntent: intent,
    });
  };

  const openExternal = () => {
    open({ openTarget: "external-browser" });
  };

  const items: MenuContextItem[] = [];

  if (contextMenu) {
    items.push({
      id: "open-in-label",
      message: message("linkMenu.openIn", "Open in"),
      type: "label",
    });
  }

  items.push(...(appLinkItems ?? []));

  if (appLinkItems !== undefined && appLinkItems.length > 0) {
    items.push({ id: "app-link-separator", type: "separator" });
  }

  if (isBrowserEnabled) {
    items.push({
      icon: menuIcon(<ExternalLink className="size-4" />, presentation),
      id: "open-in-new-tab",
      message: contextMenu
        ? message("linkMenu.newTab", "New tab")
        : message("linkMenu.openInNewTab", "Open in new tab"),
      onSelect: () => {
        openInBrowser();
      },
    });
  } else {
    items.push({
      icon: menuIcon(<ExternalLink className="size-4" />, presentation),
      id: "open-link",
      message: contextMenu
        ? message("linkMenu.defaultBrowserUnavailable", "Default browser")
        : message("linkMenu.openLink", "Open link"),
      onSelect: openExternal,
    });
  }

  if (isBrowserEnabled && services.canOpenNewWindow === true) {
    items.push({
      icon: menuIcon(<ExternalLink className="size-4" />, presentation),
      id: "open-in-new-window",
      message: contextMenu
        ? message("linkMenu.newWindow", "New window")
        : message("linkMenu.openInNewWindow", "Open in new window"),
      onSelect: () => {
        openInBrowser("new-window");
      },
    });
  }

  if (isBrowserEnabled && services.isDefaultBrowser !== true) {
    items.push({
      icon: menuIcon(<ExternalLink className="size-4" />, presentation),
      id: "open-in-external-browser",
      message: contextMenu
        ? message("linkMenu.defaultBrowser", "Default browser")
        : message("linkMenu.openInExternalBrowser", "Open in external browser"),
      onSelect: openExternal,
    });
  }

  items.push({ id: "external-link-separator", type: "separator" });

  if (selectedText !== undefined && selectedText.length > 0) {
    items.push({
      icon: menuIcon(<Link2 className="size-4" />, presentation),
      id: "copy-selection",
      message: message("linkMenu.copySelection", "Copy"),
      onSelect: () => {
        void copyText(selectedText);
      },
    });
  }

  items.push({
    icon: menuIcon(<Link2 className="size-4" />, presentation),
    id: "copy-link",
    message: message("linkMenu.copyLink", "Copy link"),
    onSelect: () => {
      void copyText(normalized);
    },
  });

  if (services.canDownload === true && WEB_URL.test(normalized)) {
    items.push({
      icon: menuIcon(<Download className="size-4" />, presentation),
      id: "save-link-as",
      message: message("linkMenu.saveLinkAs", "Save link as…"),
      onSelect: () => {
        services.onDownloadLink?.(normalized);
      },
      selectAfterClose: true,
    });
  }

  return items;
};

/* ------------------------------------------------------------------ */
/* Hover toolbar                                                 */
/* ------------------------------------------------------------------ */

interface HoverActionsProps extends LinkMenuInput {
  children: ReactElement;
  openTarget?: LinkOpenTarget;
  tooltipDelayDuration?: number;
}

const stopPropagation = (event: ReactMouseEvent<HTMLElement>) => {
  event.stopPropagation();
};

const HoverActions = ({
  children,
  openTarget,
  tooltipDelayDuration,
  ...menu
}: HoverActionsProps) => {
  const [open, setOpen] = useState(false);
  const [menuActive, setMenuActive] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const items = linkMenuItems(menu);
  const copy = items.find((item) => item.id === "copy-link");

  const more = items.filter(
    (item) =>
      item.id !== "copy-link" &&
      item.id !== "external-link-separator" &&
      item.id !== "open-link"
  );

  const changeOpen = (next: boolean) => {
    setOpen(next);
  };

  const toolbar = (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The toolbar is a presentation wrapper that keeps editor focus on press.
    <div
      className="pointer-events-auto flex w-fit max-w-full overflow-hidden rounded-lg border border-border/70 bg-panel-elevated-secondary shadow-lg"
      onMouseDown={(event) => {
        if (
          event.target instanceof Node &&
          event.currentTarget.contains(event.target)
        ) {
          event.preventDefault();
        }
      }}
      role="presentation"
    >
      <Button
        color="ghost"
        onClick={(event) => {
          event.stopPropagation();
          menu.onActivate?.();
          menu.services.onOpenLink?.({
            hostId: menu.hostId,
            href: normalizeHref(menu.href),
            initiator: menu.initiator,
            openAsWebsite: true,
            openTarget: menu.isBrowserEnabled ? openTarget : "external-browser",
          });
          changeOpen(false);
        }}
        size="composer"
      >
        <ExternalLink aria-hidden className="size-3" />
        Open link
      </Button>
      {copy?.message === undefined ? null : (
        <Button
          color="ghost"
          onClick={(event) => {
            event.stopPropagation();
            copy.onSelect?.();
            changeOpen(false);
          }}
          size="composer"
        >
          <Link2 aria-hidden className="size-3" />
          {copy.message.defaultMessage}
        </Button>
      )}
      {more.length > 0 ? (
        <MenuContextMenu
          items={more}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
            setMenuActive(false);
            changeOpen(false);
          }}
          onOpenChange={(next) => {
            if (next) {
              setMenuActive(true);
            }
          }}
          trigger="click"
        >
          <Button
            aria-label="More link actions"
            color="ghost"
            onClick={stopPropagation}
            size="composer"
          >
            <MoreHorizontal aria-hidden className="size-3" />
          </Button>
        </MenuContextMenu>
      ) : null}
    </div>
  );

  return (
    <TooltipHint
      closeOnPointerLeave={!menuActive}
      content={toolbar}
      delayDuration={tooltipDelayDuration}
      interactive
      keyboardNavigation={!menuActive}
      onOpenChange={changeOpen}
      open={menuActive || open}
      ref={triggerRef}
      variant="unstyled"
    >
      {children}
    </TooltipHint>
  );
};

/* ------------------------------------------------------------------ */
/* AppLink                                                       */
/* ------------------------------------------------------------------ */

interface AppLinkProps extends Omit<React.ComponentProps<"a">, "href" | "ref"> {
  appLinkItems?: readonly MenuContextItem[];
  appearance?: AppLinkAppearance;
  children?: ReactNode;
  contextMenuInitiator?: string;
  conversationId?: string | null;
  hostId?: string;
  href: string;
  initiator?: string;
  isBrowserEnabled?: boolean;
  onActivate?: () => void;
  onUnmodifiedClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  openAsWebsite?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  openTarget?: LinkOpenTarget;
  originHostId?: string;
  requiresConfirmation?: boolean;
  services?: AppLinkServices;
  showCopyLinkInConfirmation?: boolean;
  showHoverActions?: boolean;
  tooltipContent?: ReactNode;
  tooltipDelayDuration?: number;
  underline?: AppLinkUnderline;
}

const NO_SERVICES: AppLinkServices = {};

const AppLink = ({
  appLinkItems,
  appearance = "default",
  children,
  className,
  contextMenuInitiator,
  conversationId = null,
  hostId,
  href,
  initiator,
  isBrowserEnabled = false,
  onActivate,
  onUnmodifiedClick,
  openAsWebsite,
  openTarget,
  originHostId,
  ref,
  requiresConfirmation = false,
  services = NO_SERVICES,
  showCopyLinkInConfirmation = false,
  showHoverActions = false,
  tooltipContent,
  tooltipDelayDuration,
  underline: underlineProp,
  ...props
}: AppLinkProps) => {
  const underline =
    underlineProp ?? (appearance === "secondary" ? "always" : undefined);

  const [confirmation, setConfirmation] = useState<LinkConfirmation | null>(
    null
  );

  const normalized = normalizeHref(href);

  const confirms =
    requiresConfirmation && (hasScheme(href) || resolvesToExternalWeb(href));

  const openLink = (request: LinkOpenRequest) => {
    services.onOpenLink?.({ ...request, hostId: request.hostId ?? hostId });
  };

  const activate = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const resolved = resolveLinkDisposition({
      conversationId: requiresConfirmation ? null : conversationId,
      defaultDisposition: undefined,
      event,
      hostId: originHostId ?? hostId,
      href,
      initiator,
      intercept: services.intercept,
      isBrowserEnabled,
      openAsWebsite,
      openTarget,
    });

    const altDownload =
      isAltClick(event) &&
      WEB_URL.test(normalized) &&
      (resolved.clickModifiers !== "alt" ||
        services.externalBrowserLinkShortcut !== "alt");

    const download =
      altDownload && services.canDownload === true
        ? () => {
            services.onDownloadLink?.(normalized);
          }
        : undefined;

    if (confirms) {
      event.preventDefault();
      setConfirmation({
        ...resolved,
        href: normalized,
        initiator,
        onDownload: download,
        onOpen: () => {
          onActivate?.();

          return resolved.onOpen?.() ?? false;
        },
        originHostId,
        showCopyLink: showCopyLinkInConfirmation,
      });

      return;
    }

    if (altDownload) {
      if (download !== undefined) {
        event.preventDefault();
        download();
      }

      return;
    }

    onActivate?.();

    if (!(isExternalSchemeLink(href) || hasScheme(href))) {
      return;
    }

    if (services.onOpenLink !== undefined || services.intercept !== undefined) {
      event.preventDefault();

      if (
        resolved.useExternalBrowser !== true &&
        resolved.onOpen?.() === true
      ) {
        return;
      }

      openLink({
        clickModifiers: resolved.clickModifiers,
        conversationId,
        disposition: resolved.disposition,
        href: normalized,
        initiator,
        openAsWebsite,
        openTarget: resolved.openTarget,
        openTargetIntent: resolved.openTargetIntent,
        originHostId,
        presentationIntent: resolved.presentationIntent,
        useExternalBrowser: resolved.useExternalBrowser,
      });
    }
  };

  const anchor = (
    <a
      {...props}
      className={cn(
        className,
        appearance === "button" && LINK_MARKER,
        appearance === "primary" && "text-text!",
        appearance === "secondary" && "text-text-muted!",
        appearance === "inherit" && "text-inherit!",
        (appearance === "inherit" || appearance === "primary") &&
          "cursor-(--ck-action-cursor) rounded-xs underline-offset-4 hover:text-text! focus-visible:text-text! focus-visible:outline-2 focus-visible:-outline-offset-2",
        appearance === "source" &&
          "inline-flex h-6 max-w-40 cursor-(--ck-action-cursor) items-center gap-2 rounded-full bg-fill-secondary-soft py-1 ps-1 pe-2 text-xs text-text-muted! no-underline! select-none hover:bg-fill-primary-transparent-hover hover:no-underline! focus-visible:outline-2 focus-visible:outline-offset-2",
        underline === "always" && "underline!",
        underline === "hover" && "no-underline hover:underline",
        underline === "none" && "no-underline! hover:no-underline!"
      )}
      href={normalized}
      onAuxClick={(event) => {
        props.onAuxClick?.(event);

        if (!event.defaultPrevented && event.button === 1) {
          activate(event);
        }
      }}
      onClick={(event) => {
        props.onClick?.(event);

        if (
          !event.defaultPrevented &&
          !requiresConfirmation &&
          event.button === 0 &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey
        ) {
          onUnmodifiedClick?.(event);
        }

        if (!event.defaultPrevented) {
          activate(event);
        }
      }}
      onContextMenu={(event) => {
        if (confirms) {
          event.preventDefault();
        } else {
          props.onContextMenu?.(event);
        }
      }}
      onDragStart={(event) => {
        props.onDragStart?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (requiresConfirmation) {
          event.preventDefault();

          return;
        }

        const startDrag = services.startLinkDrag;

        if (startDrag === undefined) {
          return;
        }

        const url = new URL(normalized, window.location.href);

        if (url.protocol === "http:" || url.protocol === "https:") {
          const title = event.currentTarget.textContent?.trim() || url.href;
          const dragged = document.createElement("a");

          dragged.href = url.href;
          dragged.textContent = title;
          event.preventDefault();
          startDrag({ html: dragged.outerHTML, title, url: url.href });
        }
      }}
      ref={ref}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );

  const menuInput: LinkMenuInput = {
    appLinkItems,
    hostId: originHostId ?? hostId,
    href,
    initiator: contextMenuInitiator ?? initiator,
    isBrowserEnabled,
    onActivate,
    presentation: "context-menu",
    services,
  };

  let wrapped = anchor;

  if (showHoverActions && !requiresConfirmation && WEB_URL.test(normalized)) {
    wrapped = (
      <HoverActions
        {...menuInput}
        openTarget={openTarget}
        presentation="hover-menu"
        tooltipDelayDuration={tooltipDelayDuration}
      >
        {anchor}
      </HoverActions>
    );
  } else if (tooltipContent !== undefined && tooltipContent !== null) {
    wrapped = (
      <TooltipHint
        content={tooltipContent}
        delayDuration={tooltipDelayDuration}
      >
        {anchor}
      </TooltipHint>
    );
  }

  return (
    <>
      {isWebLink(href) && !requiresConfirmation ? (
        <MenuContextMenu
          getItems={() =>
            linkMenuItems({
              ...menuInput,
              selectedText: window.getSelection()?.toString(),
            })
          }
        >
          <span className="contents">{wrapped}</span>
        </MenuContextMenu>
      ) : (
        wrapped
      )}
      {confirmation === null ? null : (
        <LinkConfirmationDialog
          confirmation={confirmation}
          onClose={() => {
            setConfirmation(null);
          }}
          onOpenLink={openLink}
        />
      )}
    </>
  );
};

export { AppLink, resolveLinkDisposition };

export type {
  AppLinkProps,
  AppLinkServices,
  LinkClickModifier,
  LinkDisposition,
  LinkDispositionInput,
  LinkDispositionResult,
  LinkOpenRequest,
};
