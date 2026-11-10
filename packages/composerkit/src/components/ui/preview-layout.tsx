"use client";

/* oxlint-disable typescript/no-deprecated, shadcn/no-arbitrary-values, shadcn/no-restyle, shadcn/no-inline-styles -- PreviewLayout ignores Escape while keyCode is 229 (IME composition), reserves composer space with --ck-side-compose-overlay-reserve calc classes and a calc height, and styles its close Button with these classes. */

import { Button } from "composerkit/components/ui/button";
import { cn } from "composerkit/lib/utils";
import { X } from "lucide-react";
import { useEffect, useEffectEvent } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";

type ComposerPresentation = "footer" | "inline" | "overlay";

interface PreviewLayoutProps {
  assetName: ReactNode;
  bottomContent?: ReactNode;
  children?: ReactNode;
  composerPresentation?: ComposerPresentation;
  contentOwnsHeader?: boolean;
  contentRef?: Ref<HTMLDivElement>;
  endContent?: ReactNode;
  headerVariant?: "document";
  onClose: () => void;
  reserveBottomContentSpace?: boolean;
  reserveImageComposerSpace?: boolean;
  titleEndContent?: ReactNode;
}

const IMAGE_COMPOSER_RESERVE =
  "calc(100% - var(--ck-side-compose-overlay-reserve, 118px))";

const useEscapeToClose = (onClose: () => void) => {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.isComposing ||
        event.keyCode === 229
      ) {
        return;
      }

      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;

        if (!event.defaultPrevented) {
          close();
        }
      }, 0);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      clearTimeout(timer);
    };
  }, []);
};

const PreviewLayout = ({
  assetName,
  bottomContent,
  children,
  composerPresentation,
  contentOwnsHeader = false,
  contentRef,
  endContent,
  headerVariant,
  onClose,
  reserveBottomContentSpace = true,
  reserveImageComposerSpace = false,
  titleEndContent,
}: PreviewLayoutProps) => {
  useEscapeToClose(onClose);

  const hasBottomContent =
    bottomContent !== null && bottomContent !== undefined;

  const overlay = composerPresentation === "overlay";

  const fillsHeight =
    !reserveImageComposerSpace &&
    (!hasBottomContent || !overlay || !reserveBottomContentSpace);

  const reservesOverlay =
    !reserveImageComposerSpace &&
    hasBottomContent &&
    overlay &&
    reserveBottomContentSpace;

  const contentStyle: CSSProperties | undefined = reserveImageComposerSpace
    ? { height: IMAGE_COMPOSER_RESERVE }
    : undefined;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col bg-panel",
        composerPresentation === "inline" &&
          "pt-[var(--ck-side-compose-overlay-top-reserve,0px)] pb-[var(--ck-side-compose-overlay-reserve,0px)]"
      )}
    >
      {contentOwnsHeader ? null : (
        <div
          className={cn(
            "flex h-bar shrink-0 items-center justify-between gap-4 border-b border-stroke-subtle px-3",
            headerVariant === "document" && "bg-panel-elevated-secondary"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Button
              aria-label="Close preview"
              color="ghost"
              onClick={onClose}
              size="toolbar"
              uniform
            >
              <X />
            </Button>
            <div className="truncate text-sm font-medium text-text">
              {assetName}
            </div>
            {titleEndContent}
          </div>
          {endContent}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <div
          className={cn(
            "min-h-0",
            fillsHeight && "h-full",
            reservesOverlay &&
              "h-[calc(100%_-_var(--ck-side-compose-overlay-reserve,0px))]"
          )}
          ref={contentRef}
          style={contentStyle}
        >
          {children}
        </div>
      </div>
      {bottomContent}
    </div>
  );
};

interface PreviewComposerProps {
  children?: ReactNode;
  presentation?: ComposerPresentation;
}

const PreviewComposer = ({ children, presentation }: PreviewComposerProps) => (
  <div
    className={cn(
      "shrink-0",
      presentation === "footer" &&
        "bg-panel-card px-3 pt-1 pb-4 sm:px-6 sm:pt-4 sm:pb-6",
      presentation === "inline" && "p-3"
    )}
  >
    {children}
  </div>
);

export { PreviewComposer, PreviewLayout };

export type { ComposerPresentation, PreviewComposerProps, PreviewLayoutProps };
