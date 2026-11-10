"use client";

import { AppLink } from "@workspace/react/components/list/app-link";
import {
  ExternalResourcePolicyContext,
  LinkProviderContext,
} from "@workspace/react/components/markdown/external-link";
import type {
  ExternalResourcePolicy,
  LinkProviderRenderOptions,
} from "@workspace/react/components/markdown/external-link";
import { TEXT_LINK_CLASSES } from "@workspace/react/components/ui/markdown";
import { InlineMention } from "@workspace/react/components/ui/mention";
import { isValidElement, useContext } from "react";
import type { ComponentProps, ComponentType, ReactNode } from "react";

/*
 * The link inside an approval reason draws AppLink around the mention
 * family's InlineMention, with the URL as its tooltip. A link provider set by
 * the host receives the href and a render function, and decides on a preview
 * card, a custom icon or tooltip. A restricted resource policy, from the
 * prop or an ancestor, makes the link ask before it opens.
 */

type ReasonLinkAppearance = "decorated" | "inline-mention" | "underlined-text";

type AppLinkComponent = ComponentType<ComponentProps<typeof AppLink>>;

interface ApprovalReasonLinkProps {
  /** How the link renders, default `inline-mention`. */
  appearance?: ReasonLinkAppearance;
  children?: ReactNode;
  conversationId?: string | null;
  /** The external link component, default the app link. */
  ExternalLinkComponent?: AppLinkComponent;
  /** The external resource policy, default `allow`. */
  externalResourcePolicy?: ExternalResourcePolicy;
  href?: string;
  isBrowserEnabled?: boolean;
  openTarget?: ComponentProps<typeof AppLink>["openTarget"];
  originHostId?: string;
  services?: ComponentProps<typeof AppLink>["services"];
  title?: string;
}

/** The host effect that opens a link; without a host the page opens it in a new tab. */
const DEFAULT_SERVICES: ComponentProps<typeof AppLink>["services"] = {
  onOpenLink: ({ href }) => {
    window.open(href, "_blank", "noopener,noreferrer");
  },
};

interface ReasonLinkBodyProps extends Omit<
  ApprovalReasonLinkProps,
  "externalResourcePolicy" | "href"
> {
  href: string;
  options?: LinkProviderRenderOptions;
  policy: ExternalResourcePolicy;
}

const ReasonLinkBody = ({
  appearance = "inline-mention",
  children,
  conversationId,
  ExternalLinkComponent: Link = AppLink,
  href,
  isBrowserEnabled,
  openTarget,
  options,
  originHostId,
  policy,
  services = DEFAULT_SERVICES,
  title,
}: ReasonLinkBodyProps) => {
  const decorated = appearance === "decorated";
  const tooltip = options?.customTooltip ?? (decorated ? undefined : href);

  const content =
    decorated && !isValidElement(options?.customIcon) ? (
      children
    ) : (
      <InlineMention
        appearance={decorated ? "inline-mention" : appearance}
        icon={
          isValidElement<{ className?: string }>(options?.customIcon)
            ? options.customIcon
            : undefined
        }
        underlineOnHover={appearance !== "underlined-text"}
      >
        {children}
      </InlineMention>
    );

  return (
    <Link
      className={TEXT_LINK_CLASSES}
      contextMenuInitiator="link_menu"
      conversationId={conversationId}
      data-ck-inline-mention-interactive=""
      href={href}
      initiator="link_click"
      isBrowserEnabled={isBrowserEnabled}
      openTarget={openTarget}
      originHostId={originHostId}
      requiresConfirmation={policy === "restricted"}
      services={services}
      title={title}
      tooltipContent={tooltip}
      tooltipDelayDuration={options?.tooltipDelayDuration}
    >
      {content}
    </Link>
  );
};

/** No href renders the children as they are. */
// oxlint-disable-next-line typescript/promise-function-async -- the component returns its children as they are, which the ReactNode type allows to be a promise
const ApprovalReasonLink = ({
  children,
  externalResourcePolicy,
  href,
  ...props
}: ApprovalReasonLinkProps) => {
  const inherited = useContext(ExternalResourcePolicyContext);
  const Provider = useContext(LinkProviderContext);

  if (href === undefined || href === "") {
    return children;
  }

  const policy: ExternalResourcePolicy =
    externalResourcePolicy === "restricted" || inherited === "restricted"
      ? "restricted"
      : "allow";

  const render = (options?: LinkProviderRenderOptions) => (
    <ReasonLinkBody {...props} href={href} options={options} policy={policy}>
      {children}
    </ReasonLinkBody>
  );

  // oxlint-disable-next-line react/static-components -- the provider is a component the host sets in context, not one made here
  return Provider ? <Provider href={href}>{render}</Provider> : render();
};

export { ApprovalReasonLink };

export type { ApprovalReasonLinkProps, ReasonLinkAppearance };
