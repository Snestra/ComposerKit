"use client";

// Lucide artwork is covered by components/icon/lucide.license.

/* oxlint-disable shadcn/no-restyle, shadcn/require-static-classes -- The component passes `unstyled` and gives the coachmark its own surface, size and shape through className. */

import { createIcon } from "@workspace/react/components/icon";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverUiScaleContext,
} from "@workspace/react/components/ui/popover";
import type { PopoverSide } from "@workspace/react/components/ui/popover";
import { cn } from "@workspace/react/lib/utils";
import { useContext, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

type CoachmarkAlign = "center" | "end" | "start";

type CoachmarkSide = "bottom" | "end" | "start" | "top";

type CoachmarkSize = "default" | "large" | "wide";

interface CoachmarkProps {
  align?: CoachmarkAlign;
  /** Element the coachmark points at; it takes focus back on dismissal. */
  anchor: HTMLElement;
  body: ReactNode;
  /** Text direction. Without it the direction comes from the document language. */
  direction?: "ltr" | "rtl";
  id: string;
  onDismiss: () => void;
  side: CoachmarkSide;
  size?: CoachmarkSize;
  title?: ReactNode;
  updatePositionStrategy?: "always" | "optimized";
}

const CloseTooltipIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-16",
});

interface TextInfoLocale extends Intl.Locale {
  getTextInfo?: () => { direction?: string };
  textInfo?: { direction?: string };
}

// The text direction of a locale.
const directionOfLocale = (locale: string): "ltr" | "rtl" => {
  const info: TextInfoLocale = new Intl.Locale(locale);

  return (info.getTextInfo?.().direction ?? info.textInfo?.direction) === "rtl"
    ? "rtl"
    : "ltr";
};

// The component reads the locale from its intl provider. That
// provider writes the same locale to
// document.documentElement.lang in an effect, so the document language is the
// locale the component uses. Following the attribute reproduces the direction for
// every locale, including a language change after the Coachmark is open. The
// translated "Close tooltip" label is not included: this library ships no
// message catalogs, so the label is the default message.
const subscribeToLanguage = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    attributeFilter: ["lang"],
    attributes: true,
  });

  return () => {
    observer.disconnect();
  };
};

const readLanguage = () => document.documentElement.lang;

const useDocumentLanguage = () =>
  useSyncExternalStore(subscribeToLanguage, readLanguage, () => "");

const preventDefault = (event: Event) => {
  event.preventDefault();
};

const sizeClasses: Record<CoachmarkSize, string> = {
  default: "w-60",
  large: "w-90",
  wide: "w-72",
};

// The tail path, centered or pointing from a corner.
const CENTER_TAIL =
  "M0 0C8 0 11 3.5 14.5 8.2L16.2 10.5C17.1 11.8 18.9 11.8 19.8 10.5L21.5 8.2C25 3.5 28 0 36 0V-1H0Z";

const CORNER_TAIL =
  "M0 0C4.2 0 6.6 1.3 8.2 4.5C9.6 7.8 9.2 10.8 11.2 12.5C12.4 13.5 13.8 13.5 15.1 12.2C19.4 7.5 25.6 2.6 32.1 0.8C33.8 0.3 34.8 0 36 0V-1H0Z";

// Electron resolves --color-fill-coachmark to --blue-500; a host can redefine the token.
const COACHMARK_FILL = "var(--color-status-info-solid)";

const CoachmarkArrow = ({
  align,
  isRtl,
}: {
  align: CoachmarkAlign;
  isRtl: boolean;
}) => {
  const mirrored = (align === "start" && isRtl) || (align === "end" && !isRtl);

  return (
    <>
      <svg
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute hidden h-3.5 w-9 origin-top overflow-visible group-data-[side=bottom]:top-0 group-data-[side=bottom]:block group-data-[side=bottom]:-scale-y-100 group-data-[side=top]:top-full group-data-[side=top]:block",
          align === "start" && "start-4",
          align === "end" && "end-4",
          align === "center" && "left-1/2 -translate-x-1/2"
        )}
        fill={COACHMARK_FILL}
        viewBox="0 0 36 14"
      >
        <path
          d={align === "center" ? CENTER_TAIL : CORNER_TAIL}
          transform={mirrored ? "translate(36 0) scale(-1 1)" : undefined}
        />
      </svg>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 hidden h-9 w-3.5 origin-left -translate-y-1/2 overflow-visible group-data-[side=left]:left-full group-data-[side=left]:block group-data-[side=right]:left-0 group-data-[side=right]:block group-data-[side=right]:-scale-x-100"
        fill={COACHMARK_FILL}
        viewBox="0 0 14 36"
      >
        <path d={CENTER_TAIL} transform="matrix(0 -1 1 0 0 36)" />
      </svg>
    </>
  );
};

/**
 * Always-open popover that points at `anchor`. It never takes focus; the close button, or Escape, calls
 * `onDismiss` and returns focus to the anchor.
 */
const Coachmark = ({
  align = "center",
  anchor,
  body,
  direction,
  id,
  onDismiss,
  side,
  size = "default",
  title,
  updatePositionStrategy = "always",
}: CoachmarkProps) => {
  const scale = useContext(PopoverUiScaleContext);

  const documentLanguage = useDocumentLanguage();

  const isRtl =
    (direction ??
      directionOfLocale(documentLanguage === "" ? "en" : documentLanguage)) ===
    "rtl";

  const physicalSides: Record<CoachmarkSide, PopoverSide> = {
    bottom: "bottom",
    end: isRtl ? "left" : "right",
    start: isRtl ? "right" : "left",
    top: "top",
  };

  const dismiss = () => {
    onDismiss();
    anchor.focus();
  };

  const bodyId = `${id}-body`;
  const labelledBy = title === undefined ? bodyId : `${id}-title`;

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          dismiss();
        }
      }}
      open
    >
      <PopoverAnchor virtualRef={{ current: anchor }} />
      <PopoverContent
        align={align}
        alignOffset={align === "center" ? 0 : -10 * scale}
        aria-describedby={title === undefined ? undefined : bodyId}
        aria-labelledby={labelledBy}
        className={cn(
          "group relative z-50 flex items-start gap-2 rounded-xl bg-(--color-status-info-solid) p-3 text-sm text-(--color-text-on-status) shadow-lg outline-hidden select-none [-webkit-app-region:no-drag]",
          sizeClasses[size]
        )}
        collisionPadding={9}
        id={id}
        onCloseAutoFocus={preventDefault}
        onInteractOutside={preventDefault}
        onOpenAutoFocus={preventDefault}
        side={physicalSides[side]}
        sideOffset={(align === "center" ? 18 : 20) * scale}
        unstyled
        updatePositionStrategy={updatePositionStrategy}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title !== undefined && (
            <div className="font-semibold" id={`${id}-title`}>
              {title}
            </div>
          )}
          <div id={bodyId}>{body}</div>
        </div>
        <button
          aria-label="Close tooltip"
          className="relative flex size-4 shrink-0 cursor-(--ck-action-cursor,default) items-center justify-center rounded-sm before:absolute before:-inset-1 focus-visible:outline-2 focus-visible:outline-current"
          onClick={(event) => {
            event.stopPropagation();
            dismiss();
          }}
          type="button"
        >
          <CloseTooltipIcon />
        </button>
        <CoachmarkArrow align={align} isRtl={isRtl} />
      </PopoverContent>
    </Popover>
  );
};

export { Coachmark };

export type { CoachmarkAlign, CoachmarkProps, CoachmarkSide, CoachmarkSize };
