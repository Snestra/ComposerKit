"use client";

/* oxlint-disable typescript/strict-boolean-expressions -- Branches test optional handlers and flags by truthiness. */

import { Button } from "@workspace/react/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from "@workspace/react/components/ui/dialog";
import { copyMarkdownText } from "@workspace/react/components/ui/markdown";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { resolvesToExternalWeb } from "@workspace/react/lib/link-destination";
import { createContext, useState } from "react";
import type {
  ComponentProps,
  ComponentType,
  SubmitEvent,
  MouseEvent,
  ReactNode,
} from "react";

/** `restricted` asks before a link opens. */
export type ExternalResourcePolicy = "allow" | "restricted";

/** A restricted ancestor makes every link below it restricted. */
export const ExternalResourcePolicyContext =
  createContext<ExternalResourcePolicy>("allow");

export interface LinkProviderRenderOptions {
  customIcon?: ReactNode;
  customTooltip?: ReactNode;
  tooltipDelayDuration?: number;
}

export interface LinkProviderProps {
  children: (options?: LinkProviderRenderOptions) => ReactNode;
  href: string;
}

export type LinkProviderComponent = ComponentType<LinkProviderProps>;

/**
 * The host's link provider. When one is set, the component hands it the
 * link and a render function, and the provider decides how the link shows
 * (preview card, custom icon, custom tooltip). Default none.
 */
export const LinkProviderContext = createContext<LinkProviderComponent | null>(
  null
);

const HTTP_URL = /^https?:\/\//iu;

export interface ExternalLinkProps extends Omit<ComponentProps<"a">, "href"> {
  href: string;
  /** Runs when the link is opened. */
  onActivate?: () => void;
  /** Opens the link after confirmation. Default: a new tab without opener. */
  onOpen?: (href: string) => void;
  /** An http(s) link asks before it opens. */
  requiresConfirmation?: boolean;
  showCopyLinkInConfirmation?: boolean;
  tooltipContent?: ReactNode;
  tooltipDelayDuration?: number;
}

export type ExternalLinkComponent = ComponentType<ExternalLinkProps>;

const openInNewTab = (href: string) => {
  window.open(href, "_blank", "noopener,noreferrer");
};

/** The dialog that stands between a restricted link and the website. */
const ExternalLinkConfirmation = ({
  href,
  onClose,
  onOpen,
  showCopyLink,
}: {
  href: string;
  onClose: () => void;
  onOpen: () => void;
  showCopyLink: boolean;
}) => {
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onClose();
    onOpen();
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
      size="compact"
    >
      <DialogBody as="form" onSubmit={submit}>
        <DialogSection>
          <DialogHeader
            subtitle={
              <DialogDescription className="contents">
                Confirm before connecting to this website
              </DialogDescription>
            }
            title={
              <DialogTitle className="contents">
                Open external link?
              </DialogTitle>
            }
          />
        </DialogSection>
        <DialogSection>
          <div
            className="rounded-md bg-panel-secondary/92 p-3 text-sm break-all text-text-muted"
            data-testid="external-link-confirmation-url"
          >
            {href}
          </div>
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            {showCopyLink ? (
              <Button
                color="secondary"
                onClick={() => {
                  copyMarkdownText(href)
                    .then((copied) => {
                      if (copied) {
                        onClose();
                      }

                      return copied;
                    })
                    .catch(() => false);
                }}
                type="button"
              >
                Copy link
              </Button>
            ) : null}
            <Button color="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit">Open link</Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
};

/**
 * The link the prose renders by default. It is
 * an anchor that opens in a new tab with `rel="noopener noreferrer"`. With
 * `requiresConfirmation`, a click, a middle click or a keyboard activation on
 * an http(s) link opens the confirmation dialog instead, and the context menu
 * and drag are blocked so nothing opens the link around the dialog. Host
 * services (in-app browser tabs, downloads, the link context
 * menu with its app destinations) stay with the host and replace this
 * component through `ExternalLinkComponent`.
 */
export const ExternalLink = ({
  children,
  href,
  onActivate,
  onAuxClick,
  onClick,
  onContextMenu,
  onDragStart,
  onOpen = openInNewTab,
  requiresConfirmation = false,
  showCopyLinkInConfirmation = false,
  tooltipContent,
  tooltipDelayDuration,
  ...props
}: ExternalLinkProps) => {
  const [confirming, setConfirming] = useState(false);
  const external = HTTP_URL.test(href);

  const confirm =
    requiresConfirmation && (external || resolvesToExternalWeb(href));

  const activate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (confirm) {
      event.preventDefault();
      setConfirming(true);

      return;
    }

    onActivate?.();
  };

  const link = (
    <a
      {...props}
      href={href}
      onAuxClick={(event) => {
        onAuxClick?.(event);

        if (!event.defaultPrevented && event.button === 1) {
          activate(event);
        }
      }}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          activate(event);
        }
      }}
      onContextMenu={(event) => {
        if (confirm) {
          event.preventDefault();

          return;
        }

        onContextMenu?.(event);
      }}
      onDragStart={(event) => {
        onDragStart?.(event);

        if (confirm) {
          event.preventDefault();
        }
      }}
      rel={external ? "noopener noreferrer" : props.rel}
      target={external ? "_blank" : props.target}
    >
      {children}
    </a>
  );

  return (
    <>
      {tooltipContent === undefined ? (
        link
      ) : (
        <TooltipHint
          cloneCustomTrigger
          content={tooltipContent}
          delayDuration={tooltipDelayDuration}
        >
          {link}
        </TooltipHint>
      )}
      {confirming ? (
        <ExternalLinkConfirmation
          href={href}
          onClose={() => {
            setConfirming(false);
          }}
          onOpen={() => {
            onActivate?.();
            onOpen(href);
          }}
          showCopyLink={showCopyLinkInConfirmation}
        />
      ) : null}
    </>
  );
};
