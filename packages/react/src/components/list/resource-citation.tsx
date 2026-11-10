"use client";

import { ResourceRow } from "@workspace/react/components/list/rows";
import { Button } from "@workspace/react/components/ui/button";
import { MenuContextMenu } from "@workspace/react/components/ui/menu";
import type { MenuContextItem } from "@workspace/react/components/ui/menu";
import { useToast } from "@workspace/react/components/ui/toast";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { Link2, Share2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

/** A page or space citation with loading, unavailable, copy and share states. */

type ResourceCitationKind = "page" | "space";

interface ResourceCitationReference {
  blockId?: string;
  id: string;
  kind: ResourceCitationKind;
}

/** The space a reference resolves to. */
interface ResourceCitationResolvedSpace {
  spaceId: string;
}

interface ResourceCitationProps {
  /** Whether the user may share the page. */
  canShare: boolean;
  /** The page's document type (`presentation`, `workbook` or another). */
  documentType?: string;
  /** The page or space icon. */
  icon?: ReactNode;
  /** Runs the copy for the Copy link item. */
  onCopyLink: () => Promise<void> | void;
  /** Opens the target. It resolves true when it opened, and false or rejects when it did not. */
  onOpen: (blockId: string | null) => Promise<boolean>;
  /** Opens the share dialog. */
  onShare: () => void;
  /** The resolved page id; null until the page is known. */
  pageId: string | null;
  reference: ResourceCitationReference;
  /** Set when the reference resolves to a space, such as a page that is a space root. */
  resolvedSpace?: ResourceCitationResolvedSpace | null;
  /** `undefined` while loading, `null` when the target cannot be read. */
  title: string | null | undefined;
}

const COPY_LINK_MESSAGE = {
  defaultMessage: "Copy link",
  id: "space.endResource.copyLink",
} as const;

const OPEN_ERROR_ANALYTICS = {
  errorAnalytics: { toastId: "resourceCitation.openFailed" },
} as const;

const documentTypeSubtitle = (documentType: string | undefined) => {
  if (documentType === "presentation") {
    return "Slide";
  }

  return documentType === "workbook" ? "Sheet" : "Page";
};

const resolveTitle = (
  title: string | null | undefined,
  kind: ResourceCitationKind
) => {
  if (title === undefined) {
    return "…";
  }

  if (title === null) {
    return kind === "space" ? "Unavailable Space" : "Unavailable Page";
  }

  return title;
};

const ResourceCitation = ({
  canShare,
  documentType,
  icon,
  onCopyLink,
  onOpen,
  onShare,
  pageId,
  reference,
  resolvedSpace,
  title,
}: ResourceCitationProps) => {
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  const [copying, setCopying] = useState(false);
  const displayTitle = resolveTitle(title, reference.kind);
  const copyDisabled = copying || pageId === null;

  const isSpace =
    reference.kind === "space" ||
    (resolvedSpace !== undefined && resolvedSpace !== null);

  const tryOpen = async (blockId: string | null) => {
    try {
      return await onOpen(blockId);
    } catch {
      return false;
    }
  };

  const open = async () => {
    setOpening(true);

    const opened = await tryOpen(
      reference.kind === "page" ? (reference.blockId ?? null) : null
    );

    setOpening(false);

    if (!opened) {
      toast.danger("Couldn't open source", OPEN_ERROR_ANALYTICS);
    }
  };

  const tryCopy = async () => {
    try {
      await onCopyLink();
    } catch {
      return false;
    }

    return true;
  };

  const copyLink = async () => {
    setCopying(true);
    await tryCopy();
    setCopying(false);
  };

  const getItems = (): MenuContextItem[] => [
    {
      enabled: !copyDisabled,
      icon: <Link2 className="size-4" />,
      id: "copy-page-link",
      message: COPY_LINK_MESSAGE,
      onSelect: () => {
        void copyLink();
      },
    },
  ];

  return (
    <MenuContextMenu getItems={getItems}>
      <div>
        <ResourceRow
          actions={
            <TooltipHint content="Share">
              <Button
                aria-haspopup="dialog"
                aria-label="Share"
                color="ghostActive"
                disabled={!canShare}
                onClick={onShare}
                radius="large"
                size="composer"
                uniform
              >
                <Share2 className="size-4" />
              </Button>
            </TooltipHint>
          }
          busy={opening}
          disabled={opening}
          icon={icon}
          onOpen={() => {
            void open();
          }}
          subtitle={isSpace ? "Space" : documentTypeSubtitle(documentType)}
          title={displayTitle}
        />
      </div>
    </MenuContextMenu>
  );
};

export { ResourceCitation };

export type {
  ResourceCitationProps,
  ResourceCitationReference,
  ResourceCitationResolvedSpace,
};
