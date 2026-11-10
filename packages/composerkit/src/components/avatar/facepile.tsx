"use client";

import {
  TooltipHint,
  TooltipProvider,
} from "composerkit/components/ui/tooltip";
import { useReducedMotion } from "composerkit/lib/reduced-motion";
import { cn } from "composerkit/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";

type CustomProperties = CSSProperties & Record<`--${string}`, number | string>;

export interface FacepilePerson {
  /** The avatar element drawn in the stack and in the overflow list. */
  avatar: ReactNode;
  id: string;
  /** Shown beside the avatar in the overflow list; the name when absent. */
  label?: string;
  name: string;
}

export interface FacepileProps {
  /** Which end of the stack lies on top. */
  front?: "first" | "last";
  /** When false the overflow count is plain text, out of the tab order. */
  interactive?: boolean;
  overflowSideOffset?: number;
  people: readonly FacepilePerson[];
  /** Drawn when there are no people. */
  placeholder?: ReactNode;
  size?: "md" | "sm";
}

const MAX_VISIBLE = 5;
const FADE_DURATION_MS = 160;
const FADE_START_OPACITY = 0.88;

// Each avatar fades in with this easing.
const FADE_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";

type OverflowOpen = "click" | "hover" | null;

const noCleanup = () => {
  // Nothing was started, so there is nothing to stop.
};

const moreLabel = (count: number) =>
  new Intl.PluralRules("en-US").select(count) === "one"
    ? `${count} more person`
    : `${count} more people`;

interface FadeState {
  first: boolean;
  reducedMotion: boolean;
}

// Fade on mount and when an avatar becomes first. Interrupted fades continue
// from their current opacity. Reduced motion settles at full opacity.
const fadePlays = (
  before: FadeState | null,
  now: FadeState,
  blockInitial: boolean
) => {
  if (before === null) {
    return !blockInitial && !now.reducedMotion;
  }

  return (
    now.first && !now.reducedMotion && (!before.first || before.reducedMotion)
  );
};

const FacepileAvatar = ({
  blockInitial,
  children,
  front,
  index,
  reducedMotion,
  total,
  visibleCount,
}: {
  blockInitial: boolean;
  children: ReactNode;
  front: "first" | "last";
  index: number;
  reducedMotion: boolean;
  total: number;
  visibleCount: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<FadeState | null>(null);
  const running = useRef<Animation | null>(null);
  const hidden = index >= visibleCount;
  const first = index === 0;

  const stackOrder: CustomProperties = {
    "--facepile-z": front === "first" ? total - index : index,
  };

  useEffect(() => {
    const now = { first, reducedMotion };
    const before = previous.current;

    previous.current = now;

    if (fadePlays(before, now, blockInitial)) {
      running.current?.cancel();
      running.current =
        ref.current?.animate(
          [{ opacity: FADE_START_OPACITY }, { opacity: 1 }],
          { duration: FADE_DURATION_MS, easing: FADE_EASING }
        ) ?? null;
    } else if (first && reducedMotion && before?.reducedMotion === false) {
      running.current?.cancel();
      running.current = null;
    } else if (before?.first === true && !first && !before.reducedMotion) {
      const fade = running.current;

      if (fade?.playState === "running" && ref.current !== null) {
        const current = getComputedStyle(ref.current).opacity;

        fade.cancel();
        running.current = reducedMotion
          ? null
          : ref.current.animate([{ opacity: current }, { opacity: 1 }], {
              duration: FADE_DURATION_MS,
              easing: FADE_EASING,
            });
      }
    }
  }, [blockInitial, first, reducedMotion]);

  return (
    <span
      aria-hidden={hidden || undefined}
      className={cn(
        "pointer-events-auto relative z-(--facepile-z) inline-flex shrink-0",
        hidden && "invisible"
      )}
      data-page-facepile-avatar
      inert={hidden}
      ref={ref}
      style={stackOrder}
    >
      {children}
    </span>
  );
};

// Measures the stack and the +N control, and keeps the number of avatars that
// fit. The control sits after the last fitting avatar.
const observeFacepile = ({
  onCount,
  root,
  shownLength,
  total,
}: {
  onCount: (count: number) => void;
  root: HTMLSpanElement | null;
  shownLength: number;
  total: number;
}) => {
  const stack = root?.firstElementChild;
  const control = root?.lastElementChild;

  if (
    root === null ||
    !(stack instanceof HTMLElement) ||
    !(control instanceof HTMLElement)
  ) {
    return noCleanup;
  }

  control.style.minWidth = "";

  let widest = 0;

  const update = () => {
    widest = Math.max(widest, control.offsetWidth);
    control.style.minWidth = `${widest}px`;

    // oxlint-disable-next-line unicorn/prefer-number-coercion -- The value has a px suffix, so Number would give NaN.
    const controlPadding = Number.parseFloat(
      getComputedStyle(control).paddingInlineStart
    );

    const reserved = widest - controlPadding;

    stack.style.paddingInlineEnd = total > shownLength ? `${reserved}px` : "";

    const fitsWithoutControl =
      total === shownLength && stack.clientWidth <= root.clientWidth;

    const limit = fitsWithoutControl
      ? root.clientWidth
      : root.clientWidth - reserved;

    const rtl = getComputedStyle(root).direction === "rtl";
    let count = 0;
    let edge = 0;

    for (const item of stack.querySelectorAll("[data-page-facepile-avatar]")) {
      if (!(item instanceof HTMLElement)) {
        continue;
      }

      const end = rtl
        ? stack.clientWidth - item.offsetLeft
        : item.offsetLeft + item.offsetWidth;

      if (fitsWithoutControl || end <= limit) {
        count += 1;
        edge = end;
      }
    }

    control.style.insetInlineStart = `${Math.max(0, edge - controlPadding)}px`;
    onCount(count);
  };

  const observer = new ResizeObserver(update);

  observer.observe(root);
  observer.observe(stack);
  observer.observe(control);
  update();

  return () => {
    observer.disconnect();
  };
};

/**
 * Overlapping avatars that fit their box, with a +N count for the rest.
 * The overflow list opens on the Base UI tooltip.
 */
export const Facepile = ({
  front = "first",
  interactive = true,
  overflowSideOffset,
  people,
  placeholder,
  size = "md",
}: FacepileProps) => {
  const reducedMotion = useReducedMotion();
  const total = people.length;
  const shown = people.slice(0, MAX_VISIBLE);
  const shownLength = Math.min(total, MAX_VISIBLE);
  const [visibleCount, setVisibleCount] = useState(shownLength);
  const [open, setOpen] = useState<OverflowOpen>(null);
  const hiddenCount = total - Math.min(visibleCount, shownLength);

  // The ref callback keeps its identity until the number shown or the total
  // changes, like the memoised callback ref. React calls a callback
  // ref again, after its cleanup, when the identity changes, which is when
  // the measured minimum width starts over; a re-render must not do that.
  const measure = useCallback(
    (root: HTMLSpanElement | null) =>
      observeFacepile({
        onCount: setVisibleCount,
        root,
        shownLength,
        total,
      }),
    [shownLength, total]
  );

  const small = size === "sm";
  const hasPlaceholder = placeholder !== undefined && placeholder !== null;
  const controlOpen = hiddenCount > 0 && open !== null;

  const onClick = interactive
    ? (event: MouseEvent) => {
        event.stopPropagation();
        setOpen((current) => (current === "click" ? null : "click"));
      }
    : undefined;

  const onKeyDown = (event: KeyboardEvent) => {
    if (interactive && (event.key === "Enter" || event.key === " ")) {
      event.stopPropagation();
    }
  };

  const controlProps = {
    "aria-hidden": hiddenCount === 0 || undefined,
    "aria-label": moreLabel(hiddenCount),
    className: cn(
      "pointer-events-auto absolute z-0 inline-flex cursor-(--ck-action-cursor) items-center justify-center rounded-full border border-border bg-panel text-xs text-text-muted",
      small ? "h-6 min-w-6 ps-1 pe-0.5" : "h-7 min-w-7 ps-1.5 pe-1",
      hiddenCount === 0 && "invisible"
    ),
    onClick,
    onKeyDown,
    tabIndex: interactive && hiddenCount > 0 ? 0 : -1,
  };

  const count = <span>{`+${hiddenCount || total}`}</span>;

  // The component lets the tooltip create the count button (triggerAsChild
  // false) when interactive and clones the count span otherwise. The same
  // element is passed in here, because the tooltip does not take styling.
  const control = interactive ? (
    <button type="button" {...controlProps}>
      {count}
    </button>
  ) : (
    <span {...controlProps}>{count}</span>
  );

  return (
    <span
      className={cn(
        "relative inline-flex min-w-0 items-center overflow-hidden select-none",
        small ? "max-w-28" : "max-w-32"
      )}
      data-ck-facepile
      ref={measure}
    >
      <span
        className={cn(
          "pointer-events-none relative isolate z-10 flex shrink-0 items-center",
          small ? "-space-x-1.5" : "-space-x-2"
        )}
      >
        {shownLength === 0 && hasPlaceholder ? (
          <span
            className="pointer-events-auto relative inline-flex shrink-0"
            data-page-facepile-avatar
          >
            {placeholder}
          </span>
        ) : (
          shown.map((person, index) => (
            <FacepileAvatar
              blockInitial={hasPlaceholder}
              front={front}
              index={index}
              key={person.id}
              reducedMotion={reducedMotion}
              total={shownLength}
              visibleCount={visibleCount}
            >
              {person.avatar}
            </FacepileAvatar>
          ))
        )}
      </span>
      <TooltipHint
        align="end"
        content={
          <TooltipProvider>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto p-2">
              {people.slice(visibleCount).map((person) => (
                <div className="flex items-center gap-2" key={person.id}>
                  {person.avatar}
                  <span className="text-sm text-text">
                    {person.label ?? person.name}
                  </span>
                </div>
              ))}
            </div>
          </TooltipProvider>
        }
        interactive={interactive}
        onOpenChange={(next) => {
          setOpen(next ? "hover" : null);
        }}
        open={controlOpen}
        side="bottom"
        sideOffset={overflowSideOffset}
        variant="rich"
      >
        {control}
      </TooltipHint>
    </span>
  );
};
