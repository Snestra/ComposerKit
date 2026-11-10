"use client";

// Lucide artwork is covered by components/icon/lucide.license.

import { createIcon } from "composerkit/components/icon";
import { ModeToggleTip } from "composerkit/components/segmented-control/mode-toggle-tip";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "composerkit/components/ui/tooltip";
import { usePrefersReducedMotion } from "composerkit/hooks/use-device";
import { hasReducedMotion } from "composerkit/lib/device";
import { cn } from "composerkit/lib/utils";
/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values, shadcn/require-static-classes -- The option is a restyled tooltip trigger with measured values that have no theme token (0.5px border, light-dark track, focus ring color). */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

// The "requires upgrade" mark and its sparkle icon.
const SparkleIcon = createIcon({
  body: '<g fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path></g>',
  canvas: { height: 12, viewBox: "0 0 24 24", width: 12 },
  name: "sparkle-fill-12",
});

// The indicator offset per option.
// --mode-toggle-sign is 1, or -1 for right to left languages.
const INDICATOR_OFFSETS = [
  "calc((0% - 0px) * var(--mode-toggle-sign))",
  "calc((100% - 17px) * var(--mode-toggle-sign))",
] as const;

// The indicator transition: { duration: 300 / 1e3, ease: [.23, 1, .32, 1] }; the
// indicator class holds the curve and --mode-toggle-duration the time.

// The event that closes open tooltips.
const DISMISS_TOOLTIPS_EVENT = "ui:dismiss-tooltips";

const rootClasses =
  "relative isolate inline-grid h-9 max-w-full min-w-0 grid-cols-2 gap-0 rounded-full select-none [&:has(>button[aria-pressed=true]:focus-visible)>button[aria-pressed=true]:focus-visible]:outline-none [&:has(>button[aria-pressed=true]:focus-visible)>[data-mode-toggle-indicator]]:[outline-color:-webkit-focus-ring-color] [&:has(>button[aria-pressed=true]:focus-visible)>[data-mode-toggle-indicator]]:[outline:auto]";

const trackClasses =
  "pointer-events-none absolute inset-x-px top-1/2 z-0 h-8.5 -translate-y-1/2 rounded-full [background:var(--theme-background-mode-toggle-track)]";

// Right-to-left languages reverse the indicator direction.
const indicatorClasses =
  "pointer-events-none relative z-10 col-start-1 row-start-1 -my-[0.5px] -ms-[0.5px] w-[calc(100%+9px)] [transform:translateX(var(--mode-toggle-x))] [transition:transform_var(--mode-toggle-duration)_cubic-bezier(0.23,1,0.32,1)] rounded-full border-[0.5px] border-(--theme-border-mode-toggle-selected) [background:light-dark(color-mix(in_oklab,var(--ck-palette-surface-control)_90%,transparent),var(--theme-background-mode-toggle-selected))] [box-shadow:var(--shadow-md)] [--mode-toggle-sign:1] [&:is(:lang(ae),:lang(ar),:lang(arc),:lang(bcc),:lang(bqi),:lang(ckb),:lang(dv),:lang(fa),:lang(glk),:lang(he),:lang(ku),:lang(mzn),:lang(nqo),:lang(pnb),:lang(ps),:lang(sd),:lang(ug),:lang(ur),:lang(yi))]:[--mode-toggle-sign:-1]";

// `cursor-interaction` is `default` on the Electron desktop window.
const optionClasses =
  "relative z-10 inline-flex h-full min-w-0 cursor-default items-center justify-center rounded-full px-10 text-sm font-medium whitespace-nowrap @max-xs/home-mode-toggle:px-2.5 disabled:cursor-not-allowed disabled:opacity-40";

const selectedTextClasses = "text-text";

const inactiveTextClasses =
  "text-[color-mix(in_oklab,var(--ck-palette-ink)_80%,transparent)] [&:focus-visible]:text-text [&:hover]:text-text";

const optionPadding = [
  "col-start-1 row-start-1 ps-11 pe-9",
  "col-start-2 row-start-1 ps-9 pe-11",
] as const;

interface ModeToggleOption {
  /** Dot before the label while the option is not selected. */
  discoveryBadge?: boolean;
  /** Accent instead of dimmed text on a locked, unselected option. */
  emphasizeUpgrade?: boolean;
  id: string;
  label: ReactNode;
  /** Shows the upgrade mark and the screen reader suffix. */
  requiresUpgrade?: boolean;
  tooltip: ReactNode;
  /** Screen reader text appended to a locked option. */
  upgradeSuffix?: ReactNode;
}

/** The text of an onboarding tip that points at the second option. */
interface ModeToggleTipContent {
  body: ReactNode;
  /** Accessible name of the tip's close button. */
  closeLabel?: string;
  /**
   * Called when the tip is closed (close button or Escape) and when the second
   * option is pressed. The application stores that decide whether a tip is due
   * are not part of this component: pass the content to show it and drop it
   * from the props in `onDismiss` to hide it.
   */
  onDismiss: () => void;
  title?: ReactNode;
}

interface ModeToggleProps {
  ariaLabel: string;
  autoFocusSelected?: boolean;
  className?: string;
  disabled?: boolean;
  /**
   * The targeted tip of the second option (target tpp-surface-mode-toggle).
   * It shows only while the first option is selected, the toggle is enabled
   * and the second option requires an upgrade.
   */
  onboardingTip?: ModeToggleTipContent;
  /**
   * The post-trial tooltip "Try it for free". It shows only while the
   * first option is selected, the toggle is enabled and the second option does
   * not require an upgrade, and any press outside the option and the tooltip
   * dismisses it.
   */
  noPaymentTrialTooltip?: ModeToggleTipContent;
  onSelectedAutoFocus?: () => void;
  onTransitionComplete?: () => void;
  onValueChange: (id: string) => void;
  options: readonly [ModeToggleOption, ModeToggleOption];
  value: string;
}

const noCleanup = () => {
  /* An effect with nothing to undo. */
};

const dismissTooltips = (event: MouseEvent<HTMLDivElement>) => {
  if (
    event.target instanceof Node &&
    event.currentTarget.contains(event.target)
  ) {
    window.dispatchEvent(new Event(DISMISS_TOOLTIPS_EVENT));
  }
};

const lockedClassName = (option: ModeToggleOption, selected: boolean) => {
  if (option.requiresUpgrade !== true || selected) {
    return "";
  }

  return option.emphasizeUpgrade === true
    ? "text-text-notice"
    : "text-text-subtle";
};

const OptionLabel = ({
  option,
  selected,
}: {
  option: ModeToggleOption;
  selected: boolean;
}) => {
  const locked = option.requiresUpgrade === true;

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1",
        lockedClassName(option, selected)
      )}
    >
      {option.discoveryBadge === true && !locked && !selected ? (
        <span
          aria-hidden="true"
          className="absolute end-full top-1/2 me-2 size-1.25 -translate-y-1/2 rounded-full bg-fill-info-solid"
        />
      ) : null}
      {locked ? <SparkleIcon /> : null}
      {option.label}
      {locked && option.upgradeSuffix !== undefined ? (
        <span className="sr-only">{option.upgradeSuffix}</span>
      ) : null}
    </span>
  );
};

// `initial` is the other option while the toggle autofocuses the selected
// option, so the indicator slides in on mount. A change of option, or the
// first placement without that slide, completes at once under reduced motion
// and otherwise when the transition ends.
const useIndicator = (
  selectedIndex: number,
  autoFocusSelected: boolean,
  onTransitionComplete: (() => void) | undefined
) => {
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const mountedRef = useRef(false);
  const completeRef = useRef(onTransitionComplete);

  useEffect(() => {
    completeRef.current = onTransitionComplete;
  });

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;

    if (indicator === null) {
      return;
    }

    const first = !mountedRef.current;

    mountedRef.current = true;

    // The store value is the server snapshot while hydrating, so ask the
    // browser.
    const reduced = hasReducedMotion();
    const slidesIn = first && autoFocusSelected && !reduced;

    if (slidesIn) {
      indicator.style.transition = "none";
      indicator.style.setProperty(
        "--mode-toggle-x",
        INDICATOR_OFFSETS[selectedIndex === 0 ? 1 : 0]
      );
      indicator.getBoundingClientRect();
      indicator.style.transition = "";
      indicator.style.setProperty(
        "--mode-toggle-x",
        INDICATOR_OFFSETS[selectedIndex]
      );
    }

    if (reduced || (first && !slidesIn)) {
      completeRef.current?.();
    }
  }, [autoFocusSelected, selectedIndex]);

  useEffect(() => {
    const indicator = indicatorRef.current;

    if (indicator === null) {
      return noCleanup;
    }

    const handleEnd = (event: TransitionEvent) => {
      if (event.target === indicator && event.propertyName === "transform") {
        completeRef.current?.();
      }
    };

    indicator.addEventListener("transitionend", handleEnd);

    return () => {
      indicator.removeEventListener("transitionend", handleEnd);
    };
  }, []);

  return indicatorRef;
};

// The no-payment trial tooltip:
// a press outside the option and the tooltip dismisses it. The listener is
// on the document in the capture phase.
const useOutsidePressDismiss = (
  anchor: HTMLElement | null,
  tooltipId: string,
  active: boolean,
  onDismiss: (() => void) | undefined
) => {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!active || anchor === null) {
      return noCleanup;
    }

    const { ownerDocument } = anchor;

    const handlePointerDown = (event: PointerEvent) => {
      const { target } = event;

      if (
        target instanceof Node &&
        (anchor.contains(target) ||
          ownerDocument
            .querySelector(`#${CSS.escape(tooltipId)}`)
            ?.contains(target) === true)
      ) {
        return;
      }

      dismissRef.current?.();
    };

    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [active, anchor, tooltipId]);
};

// The two-option "Composer mode" toggle: pressed buttons over one sliding indicator.
const ModeToggle = ({
  ariaLabel,
  autoFocusSelected = false,
  className,
  disabled = false,
  noPaymentTrialTooltip,
  onboardingTip,
  onSelectedAutoFocus,
  onTransitionComplete,
  onValueChange,
  options,
  value,
}: ModeToggleProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const selectedIndex = options[1].id === value ? 1 : 0;
  const tipId = useId();
  const trialId = useId();

  const [secondButton, setSecondButton] = useState<HTMLButtonElement | null>(
    null
  );

  // The component shows the targeted tip when the first option is selected,
  // the toggle is enabled and the second option needs an upgrade, once
  // its anchor exists. The trial tooltip takes the same
  // conditions with the second option not needing an upgrade.
  const firstSelected = selectedIndex === 0 && !disabled;
  const secondRequiresUpgrade = options[1].requiresUpgrade === true;
  const anchored = firstSelected && secondButton !== null;
  const tip = anchored && secondRequiresUpgrade ? onboardingTip : undefined;

  const trial =
    anchored && !secondRequiresUpgrade ? noPaymentTrialTooltip : undefined;

  const handleTipDismiss = () => {
    tip?.onDismiss();
  };

  const handleTrialDismiss = () => {
    trial?.onDismiss();
  };

  let describedBy: string | undefined;

  if (trial !== undefined) {
    describedBy = trialId;
  } else if (tip !== undefined) {
    describedBy = tipId;
  }

  useOutsidePressDismiss(
    secondButton,
    trialId,
    trial !== undefined,
    handleTrialDismiss
  );

  const indicatorRef = useIndicator(
    selectedIndex,
    autoFocusSelected,
    onTransitionComplete
  );

  const indicatorStyle: CSSProperties & Record<`--${string}`, string> = {
    "--mode-toggle-duration": reducedMotion ? "0s" : "300ms",
    "--mode-toggle-x": INDICATOR_OFFSETS[selectedIndex],
  };

  return (
    <div
      aria-label={ariaLabel}
      className={cn(rootClasses, className)}
      onClickCapture={dismissTooltips}
      // The group is <div role="group" aria-label>.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
    >
      <span aria-hidden="true" className={trackClasses} />
      <span
        aria-hidden="true"
        className={indicatorClasses}
        data-mode-toggle-indicator=""
        ref={indicatorRef}
        style={indicatorStyle}
      />
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        const focusSelected = autoFocusSelected && selected;
        const second = index === 1;

        // The second option's hover tooltip is off while a tip is shown.
        const tipShown = second && describedBy !== undefined;

        return (
          <Tooltip
            key={option.id}
            onBeforeOpen={() => (disabled || tipShown ? false : undefined)}
          >
            <TooltipTrigger
              {...(second && describedBy !== undefined
                ? { "aria-describedby": describedBy }
                : {})}
              aria-pressed={selected}
              autoFocus={focusSelected}
              disabled={disabled}
              onClick={() => {
                if (second) {
                  // The tip's onActivate, then the pending trial tooltip is cleared.
                  tip?.onDismiss();

                  noPaymentTrialTooltip?.onDismiss();
                }

                if (!selected) {
                  onValueChange(option.id);
                }
              }}
              onFocus={focusSelected ? onSelectedAutoFocus : undefined}
              ref={second ? setSecondButton : undefined}
              render={
                // The label is the option content passed as children.
                // oxlint-disable-next-line jsx-a11y/control-has-associated-label
                <button
                  className={cn(
                    optionClasses,
                    optionPadding[index],
                    selected ? selectedTextClasses : inactiveTextClasses
                  )}
                  disabled={disabled}
                  type="button"
                />
              }
            >
              <OptionLabel option={option} selected={selected} />
            </TooltipTrigger>
            <TooltipPopup>{option.tooltip}</TooltipPopup>
          </Tooltip>
        );
      })}
      {tip === undefined || secondButton === null ? null : (
        <ModeToggleTip
          anchor={secondButton}
          body={tip.body}
          closeLabel={tip.closeLabel}
          id={tipId}
          onDismiss={handleTipDismiss}
          title={tip.title}
        />
      )}
      {trial === undefined || secondButton === null ? null : (
        <ModeToggleTip
          anchor={secondButton}
          body={trial.body}
          closeLabel={trial.closeLabel}
          id={trialId}
          onDismiss={handleTrialDismiss}
          title={trial.title}
        />
      )}
    </div>
  );
};

export { ModeToggle };

export type { ModeToggleOption, ModeToggleProps, ModeToggleTipContent };
