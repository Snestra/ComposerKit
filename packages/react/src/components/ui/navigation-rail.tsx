"use client";

import { MarkdownProse } from "@workspace/react/components/markdown/prose";
import {
  BookmarkFillIcon,
  BookmarkIcon,
  HeartbeatIcon,
} from "@workspace/react/components/navigation-rail/icons";
import { NavigationRailOutputs } from "@workspace/react/components/navigation-rail/output-chips";
import type { NavigationRailOutput } from "@workspace/react/components/navigation-rail/output-chips";
import { Button } from "@workspace/react/components/ui/button";
import type { MarkdownComponents } from "@workspace/react/components/ui/markdown";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { useReducedMotion } from "@workspace/react/lib/reduced-motion";
import { cn } from "@workspace/react/lib/utils";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type {
  ComponentProps,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";

import styles from "@workspace/react/components/navigation-rail/navigation-rail.module.css";

/*
 * The thread navigation rail: the marker, the card, the room check and
 * scrollItemIntoView, with its stylesheet, the rail, the preview and the
 * grouping.
 */

/** The anchor must sit this far (px) from the container's left edge. */
const ROOM_FOR_RAIL_MIN_LEFT = 46;

/** Items per `content-visibility: auto` group. */
const MAX_GROUP_SIZE = 60;

/** Hover delay before a preview is requested. */
const PREVIEW_REQUEST_DELAY_MS = 160;

/** The rail only appears for four or more items. */
const MIN_RAIL_ITEMS = 4;

/** Markers further than this from the hovered or scrubbed item stay at rest. */
const MAX_NEIGHBOR_DISTANCE = 3;

const POINTER_LEFT_BUTTON = 0;

const noop = (): void => undefined;
const SKIP_DELAY_KEY = "user-message-navigation";
const CONTENT_SELECTOR = "[data-user-message-navigation-content]";
const ITEM_ID_ATTRIBUTE = "data-user-message-navigation-item-id";

/**
 * The rail sits 16px from the
 * left in a window typed browser, chrome-extension or electron, and 12px
 * (`left-3`) elsewhere.
 */
const RAIL_ELECTRON_LEFT =
  "[&:where(:is([data-ui-window-kind=browser],[data-ui-window-kind=chrome-extension],[data-ui-window-kind=electron])_&)]:left-4";

const TOOLTIP_MAX_WIDTH = "min(20rem, calc(100vw - 16px))";

/** Whether the anchor sits at least 46px (+`extra`) from the container's left edge, scale-corrected. */
const hasRoomForRail = (
  container: HTMLElement,
  anchor: HTMLElement,
  extra = 0
) => {
  const containerRect = container.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();

  const scale =
    container.offsetWidth > 0 ? containerRect.width / container.offsetWidth : 1;

  return (
    (anchorRect.left - containerRect.left) / (scale > 0 ? scale : 1) >=
    ROOM_FOR_RAIL_MIN_LEFT + extra
  );
};

/** Scrolls the list minimally so the item is fully visible, with 1px of bottom padding. */
const scrollItemIntoView = (
  container: HTMLElement | null | undefined,
  item: HTMLElement | null | undefined
) => {
  if (container === null || container === undefined) {
    return;
  }

  if (item === null || item === undefined) {
    return;
  }

  let top = item.offsetTop;

  for (
    let parent = item.offsetParent;
    parent instanceof HTMLElement &&
    parent !== container &&
    parent !== container.offsetParent;
    parent = parent.offsetParent
  ) {
    top += parent.offsetTop;
  }

  if (top < container.scrollTop) {
    container.scrollTop = top;
  } else if (
    top + item.offsetHeight >
    container.scrollTop + container.clientHeight
  ) {
    container.scrollTop = top + item.offsetHeight - container.clientHeight + 1;
  }
};

type NavigationRailHierarchyLevel = 1 | 2 | 3;

interface NavigationRailMarkerProps extends ComponentProps<"span"> {
  bookmarked?: boolean;
  hierarchyLevel?: NavigationRailHierarchyLevel;
  neighborDistance?: number;
}

/** The 26px line, with a sliding dot when the item is bookmarked. */
function NavigationRailMarker({
  bookmarked = false,
  className,
  hierarchyLevel,
  neighborDistance,
  ...props
}: NavigationRailMarkerProps) {
  return (
    <span
      {...props}
      className={cn("flex h-0.5 w-[30px] items-center", className)}
    >
      <span
        className={styles.marker}
        data-ck-hierarchy-level={hierarchyLevel}
        data-ck-neighbor-distance={neighborDistance}
      >
        <span className={styles.markerLine} />
        {bookmarked ? (
          <span
            aria-hidden="true"
            className={cn(styles.bookmarkDot, "size-0.5 rounded-full")}
          />
        ) : null}
      </span>
    </span>
  );
}

/** The popover card. */
function NavigationRailCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "w-80 max-w-[calc(100vw-1rem)] rounded-xl bg-panel-elevated-secondary p-2 text-sm leading-5 text-text shadow-[0_0_0_0.5px_var(--border),var(--shadow-xl)] ring-[0.5px] ring-border",
        className
      )}
    />
  );
}

type NavigationRailPreviewState = "loaded" | "loading" | "unavailable";

interface NavigationRailItem {
  bookmarkId?: string | null;
  id: string;
  isBookmarked?: boolean;
  /** Marks the preview title and its loading placeholder. */
  isHeartbeat?: boolean;
  label: string;
  /** The first two show as chips, the rest as a count. */
  outputs?: readonly NavigationRailOutput[];
  /** The assistant response shown under the label. */
  response: string;
  previewState?: NavigationRailPreviewState;
  turnKey?: string;
}

type NavigationRailScrollBehavior = "instant" | "smooth";

interface NavigationRailProps {
  /** Ids of the items in view; the first one in list order is the active item. Defaults to the last item. */
  activeItemIds?: ReadonlySet<string>;
  className?: string;
  /** When set, the rail renders into the scroll element's parent and only while it has room. */
  getScrollElement?: () => HTMLElement | null;
  items: readonly NavigationRailItem[];
  onBookmarkChange?: (item: NavigationRailItem, bookmarked: boolean) => void;
  onNavigate: (
    item: NavigationRailItem,
    behavior: NavigationRailScrollBehavior
  ) => void;
  /** Called once per item when its preview is first wanted. Resolve `false` to allow another request. */
  onPreviewItem?: (item: NavigationRailItem) => Promise<boolean> | boolean;
  prefersReducedMotion?: boolean;
  /** Overrides the response renderer in the card. */
  renderResponse?: (response: string) => ReactNode;
  tooltipPortalContainer?: HTMLElement | null;
}

interface RailGroup {
  itemIds: string[];
  key: number;
  startIndex: number;
}

/** Splits the ids into stable groups of at most 60, keeping earlier group keys. */
const groupRailItems = (
  ids: readonly string[],
  previous: readonly RailGroup[] = []
): RailGroup[] => {
  const keyById = new Map(
    previous.flatMap((group) =>
      group.itemIds.map((id) => [id, group.key] as const)
    )
  );

  const upcomingKey: (number | undefined)[] = Array.from({
    length: ids.length,
  });

  let upcoming: number | undefined;

  for (let index = ids.length - 1; index >= 0; index -= 1) {
    upcoming = keyById.get(ids[index]) ?? upcoming;
    upcomingKey[index] = upcoming;
  }

  let freshKey = Math.max(-1, ...previous.map((group) => group.key)) + 1;
  const used = new Set<number>();
  const groups: RailGroup[] = [];

  for (const [index, id] of ids.entries()) {
    const key = keyById.get(id);
    let current = groups.at(-1);

    const startsGroup =
      current === undefined ||
      (key !== undefined && key !== current.key) ||
      (key === undefined &&
        current.itemIds.length >= MAX_GROUP_SIZE &&
        upcomingKey[index] !== current.key);

    if (current === undefined || startsGroup) {
      let groupKey = freshKey;

      if (key !== undefined && !used.has(key)) {
        groupKey = key;
      } else {
        freshKey += 1;
      }

      current = { itemIds: [], key: groupKey, startIndex: index };
      groups.push(current);
      used.add(groupKey);
    }

    current.itemIds.push(id);
  }

  return groups;
};

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

interface TooltipTarget {
  button: HTMLButtonElement;
  item: NavigationRailItem;
}

interface Scrub {
  itemId: string;
  pointerCaptureTarget: HTMLElement;
  pointerId: number;
}

/** The item button under the event target. */
const targetFromElement = (
  items: readonly NavigationRailItem[],
  list: HTMLElement,
  target: Element | null
): TooltipTarget | null => {
  const button = target?.closest<HTMLButtonElement>(`[${ITEM_ID_ATTRIBUTE}]`);

  if (button === null || button === undefined || !list.contains(button)) {
    return null;
  }

  const item = items.find(
    (candidate) => candidate.id === button.getAttribute(ITEM_ID_ATTRIBUTE)
  );

  return item === undefined ? null : { button, item };
};

const findItemButton = (
  list: HTMLElement | null,
  id: string | null | undefined
) => {
  if (list === null || id === null || id === undefined) {
    return null;
  }

  return list.querySelector<HTMLElement>(
    `[${ITEM_ID_ATTRIBUTE}="${CSS.escape(id)}"]`
  );
};

function PreviewPlaceholder({ heartbeat }: { heartbeat: boolean }) {
  return (
    <output className="block motion-safe:animate-pulse">
      <span className="sr-only">Loading preview</span>
      <div aria-hidden="true" className="flex h-5 min-w-0 items-center gap-1.5">
        {heartbeat ? (
          <div className="size-3 shrink-0 rounded-full bg-text/10" />
        ) : null}
        <div className="h-3 w-3/5 rounded bg-text/10" />
      </div>
      <div aria-hidden="true" className="mt-1 flex flex-col">
        <div className="flex h-5 items-center">
          <div className="h-3 w-full rounded bg-text/10" />
        </div>
        <div className="flex h-5 items-center">
          <div className="h-3 w-11/12 rounded bg-text/10" />
        </div>
        <div className="flex h-5 items-center">
          <div className="h-3 w-4/5 rounded bg-text/10" />
        </div>
      </div>
    </output>
  );
}

const previewTitle = (item: NavigationRailItem) => {
  if (item.previewState === "unavailable") {
    return "Preview unavailable";
  }

  return item.label.trim().length === 0 ? "(No content)" : item.label;
};

const previewComponents: MarkdownComponents = {
  a: ({ children }: { children?: ReactNode }): ReactNode => children,
  code: ({ children }: { children?: ReactNode }): ReactNode => children,
  img: ({ alt }: { alt?: string }) => alt,
  pre: ({ children }: { children?: ReactNode }): ReactNode => children,
  table: ({ children }: { children?: ReactNode }) => (
    <table className="w-full table-fixed border-collapse text-sm leading-5">
      {children}
    </table>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="truncate">{children}</td>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="truncate text-start font-medium">{children}</th>
  ),
};

const renderMarkdownResponse = (response: string) => (
  <MarkdownProse
    className="mt-1 line-clamp-3 text-[color:var(--color-description,var(--ck-palette-ink-tertiary))] [--ck-prose-line-height:calc(var(--text-sm)+8px)] [&:has(table)]:max-h-[calc(var(--ck-prose-line-height)*3)] [&:has(table)]:[-webkit-line-clamp:unset]"
    components={previewComponents}
    externalResourcePolicy="restricted"
    textStyle={{ kind: "small" }}
  >
    {response}
  </MarkdownProse>
);

function NavigationRailPreview({
  item,
  onBookmarkChange,
  renderResponse = renderMarkdownResponse,
}: {
  item: NavigationRailItem;
  onBookmarkChange: NavigationRailProps["onBookmarkChange"];
  renderResponse?: (response: string) => ReactNode;
}) {
  const bookmarked = item.isBookmarked === true;
  const response = item.response.trim();

  return (
    <NavigationRailCard
      className="overflow-hidden"
      data-user-message-navigation-tooltip-preview
    >
      {item.previewState === "loading" ? (
        <PreviewPlaceholder heartbeat={item.isHeartbeat === true} />
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-1.5 font-medium">
            {item.isHeartbeat === true ? (
              <HeartbeatIcon aria-hidden={false} className="text-text-subtle" />
            ) : null}
            <span className="min-w-0 flex-1 truncate">
              {previewTitle(item)}
            </span>
            {onBookmarkChange === undefined ? null : (
              <Button
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark turn"}
                aria-pressed={bookmarked}
                className="shrink-0"
                color={bookmarked ? "ghostActive" : "ghostTertiary"}
                disabled={item.bookmarkId === null && !bookmarked}
                radius="small"
                size="inline"
                onClick={(event) => {
                  event.stopPropagation();
                  onBookmarkChange(item, !bookmarked);
                }}
              >
                {bookmarked ? <BookmarkFillIcon /> : <BookmarkIcon />}
              </Button>
            )}
          </div>
          {response.length > 0 ? renderResponse(response) : null}
          <NavigationRailOutputs outputs={item.outputs ?? []} />
        </>
      )}
    </NavigationRailCard>
  );
}

const neighborDistanceOf = (index: number, focusIndex: number) => {
  const distance = Math.abs(index - focusIndex);

  return focusIndex >= 0 && distance <= MAX_NEIGHBOR_DISTANCE
    ? distance
    : undefined;
};

function NavigationRailList({
  activeItemIds,
  className,
  items,
  onBookmarkChange,
  onNavigate,
  onPreviewItem,
  prefersReducedMotion = false,
  renderResponse,
  tooltipPortalContainer,
  listRef,
  scrubbedItemId,
  onScrubbedItemChange,
}: Omit<NavigationRailProps, "getScrollElement"> & {
  listRef: { current: HTMLDivElement | null };
  onScrubbedItemChange: (id: string | null) => void;
  scrubbedItemId: string | null;
}) {
  const tooltipId = useId();
  const lastId = items.at(-1)?.id ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointerInside, setPointerInside] = useState(false);

  const [tooltipTarget, setTooltipTarget] = useState<TooltipTarget | null>(
    null
  );

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const scrubRef = useRef<Scrub | null>(null);
  const suppressClickRef = useRef(false);
  const requestedRef = useRef(new Set<string>());

  const previewTimerRef = useRef<{ itemId: string; timeoutId: number } | null>(
    null
  );

  const idsKey = items.map((item) => item.id).join("\0");

  const [grouping, setGrouping] = useState(() => ({
    groups: groupRailItems(items.map((item) => item.id)),
    idsKey,
  }));

  let { groups } = grouping;

  if (grouping.idsKey !== idsKey) {
    groups = groupRailItems(
      items.map((item) => item.id),
      groups
    );
    setGrouping({ groups, idsKey });
  }

  const focusId = scrubbedItemId ?? hoveredId;
  const focusIndex = items.findIndex((item) => item.id === focusId);
  const active = activeItemIds ?? new Set(lastId === null ? [] : [lastId]);
  const firstActiveId = items.find((item) => active.has(item.id))?.id ?? lastId;

  const requestPreview = (item: NavigationRailItem) => {
    if (
      onPreviewItem === undefined ||
      scrubRef.current !== null ||
      requestedRef.current.has(item.id)
    ) {
      return;
    }

    requestedRef.current.add(item.id);

    Promise.resolve(onPreviewItem(item))
      .then((result) =>
        result ? undefined : requestedRef.current.delete(item.id)
      )
      .catch(() => {
        requestedRef.current.delete(item.id);
      });
  };

  const cancelPreview = () => {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current.timeoutId);
      previewTimerRef.current = null;
    }
  };

  const schedulePreview = (item: NavigationRailItem) => {
    if (
      onPreviewItem === undefined ||
      scrubRef.current !== null ||
      previewTimerRef.current?.itemId === item.id
    ) {
      return;
    }

    cancelPreview();

    if (requestedRef.current.has(item.id)) {
      return;
    }

    previewTimerRef.current = {
      itemId: item.id,
      timeoutId: window.setTimeout(() => {
        previewTimerRef.current = null;
        requestPreview(item);
      }, PREVIEW_REQUEST_DELAY_MS),
    };
  };

  useEffect(
    () => () => {
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current.timeoutId);
        previewTimerRef.current = null;
      }
    },
    [previewTimerRef]
  );

  useLayoutEffect(() => {
    if (scrubbedItemId === null) {
      scrollItemIntoView(
        listRef.current,
        findItemButton(listRef.current, firstActiveId)
      );
    }
  }, [firstActiveId, listRef, scrubbedItemId]);

  const endScrub = (event: ReactPointerEvent<HTMLElement>) => {
    const scrub = scrubRef.current;

    if (scrub?.pointerId !== event.pointerId) {
      return;
    }

    scrubRef.current = null;
    onScrubbedItemChange(null);
    setHoveredId(pointerInside ? scrub.itemId : null);

    if (scrub.pointerCaptureTarget.hasPointerCapture(event.pointerId)) {
      scrub.pointerCaptureTarget.releasePointerCapture(event.pointerId);
    }

    if (!pointerInside) {
      setTooltipTarget(null);
      setTooltipOpen(false);
    }

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== POINTER_LEFT_BUTTON) {
      return;
    }

    const target = targetFromElement(
      items,
      event.currentTarget,
      event.target instanceof Element ? event.target : null
    );

    if (target === null) {
      return;
    }

    cancelPreview();
    suppressClickRef.current = false;
    setPointerInside(true);

    scrubRef.current = {
      itemId: target.item.id,
      pointerCaptureTarget: target.button,
      pointerId: event.pointerId,
    };

    onScrubbedItemChange(target.item.id);
    setTooltipTarget(target);
    setTooltipOpen(true);
    target.button.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scrub = scrubRef.current;

    if (scrub === null) {
      const target = targetFromElement(
        items,
        event.currentTarget,
        event.target instanceof Element ? event.target : null
      );

      setHoveredId(target?.item.id ?? null);

      if (target !== null) {
        schedulePreview(target.item);
        setTooltipTarget((current) =>
          current?.item.id === target.item.id ? current : target
        );
      }

      return;
    }

    if (scrub.pointerId !== event.pointerId) {
      return;
    }

    if (event.buttons % 2 === 0) {
      endScrub(event);

      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const target = targetFromElement(
      items,
      event.currentTarget,
      document.elementFromPoint(
        rect.left + rect.width / 2,
        Math.max(rect.top, Math.min(event.clientY, rect.bottom - 1))
      )
    );

    if (target !== null && target.item.id !== scrub.itemId) {
      scrubRef.current = { ...scrub, itemId: target.item.id };
      onScrubbedItemChange(target.item.id);
      setTooltipTarget(target);
      suppressClickRef.current = true;
      onNavigate(target.item, "instant");
    }
  };

  const handlePointerLeave = () => {
    cancelPreview();
    setPointerInside(false);
    setHoveredId(null);

    if (onBookmarkChange === undefined && scrubRef.current === null) {
      setTooltipTarget(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open || scrubRef.current === null) {
      setTooltipOpen(open);

      if (!open) {
        setTooltipTarget(null);
      }
    }
  };

  const cardItem =
    items.find((item) => item.id === tooltipTarget?.item.id) ??
    items.find((item) => item.turnKey === tooltipTarget?.item.turnKey) ??
    tooltipTarget?.item ??
    items[0];

  const buttons = groups.map((group) => {
    const groupStyle: CustomStyle = {
      "--rail-group-height": `calc(var(--spacing) * ${group.itemIds.length * 2.5})`,
    };

    return (
      <div
        className="flex h-(--rail-group-height) w-9 shrink-0 flex-col [content-visibility:auto]"
        key={group.key}
        style={groupStyle}
      >
        {items
          .slice(group.startIndex, group.startIndex + group.itemIds.length)
          .map((item, offset) => {
            const index = group.startIndex + offset;
            const position = index + 1;

            return (
              <button
                aria-current={active.has(item.id) ? "true" : undefined}
                aria-describedby={
                  tooltipOpen && tooltipTarget?.item.id === item.id
                    ? tooltipId
                    : undefined
                }
                aria-label={
                  item.isBookmarked === true
                    ? `Jump to user message ${position}, bookmarked turn`
                    : `Jump to user message ${position}`
                }
                className="flex h-2.5 w-9 shrink-0 cursor-(--ck-action-cursor) items-center outline-none"
                data-ck-scrub-target={scrubbedItemId === item.id || undefined}
                data-user-message-navigation-item-id={item.id}
                key={item.id}
                type="button"
                onClick={(event) => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;

                    return;
                  }

                  setTooltipTarget({ button: event.currentTarget, item });
                  setTooltipOpen(true);
                  onNavigate(item, prefersReducedMotion ? "instant" : "smooth");
                }}
                onFocus={(event) => {
                  cancelPreview();
                  requestPreview(item);
                  setTooltipTarget({ button: event.currentTarget, item });
                  setTooltipOpen(true);
                }}
                onPointerEnter={() => {
                  setHoveredId(item.id);
                  schedulePreview(item);
                }}
              >
                <NavigationRailMarker
                  bookmarked={item.isBookmarked}
                  neighborDistance={neighborDistanceOf(index, focusIndex)}
                />
              </button>
            );
          })}
      </div>
    );
  });

  return (
    <nav
      aria-label="User messages"
      className={cn(
        styles.rail,
        "absolute top-1/2 left-3 z-20 -translate-y-1/2",
        RAIL_ELECTRON_LEFT,
        className
      )}
    >
      <TooltipHint
        align="center"
        container={tooltipPortalContainer}
        content={
          cardItem === undefined ? null : (
            <NavigationRailPreview
              item={cardItem}
              renderResponse={renderResponse}
              onBookmarkChange={onBookmarkChange}
            />
          )
        }
        delayOpen
        interactive={onBookmarkChange !== undefined}
        maxWidth={TOOLTIP_MAX_WIDTH}
        open={tooltipOpen}
        positioningElement={tooltipTarget?.button}
        side="right"
        sideOffset={0}
        skipDelayKey={SKIP_DELAY_KEY}
        tooltipId={tooltipId}
        variant="floating-navigation-rail"
        onOpenChange={handleOpenChange}
      >
        <div
          ref={listRef}
          className={cn(
            styles.list,
            "flex max-h-[min(70vh,40rem)] flex-col overflow-y-auto overscroll-contain"
          )}
          data-ck-floating-navigation-rail-list
          data-scrubbing={scrubbedItemId === null ? undefined : true}
          data-user-message-navigation-rail-list
          onLostPointerCapture={endScrub}
          onPointerCancelCapture={endScrub}
          onPointerDownCapture={handlePointerDown}
          onPointerEnter={() => {
            setPointerInside(true);
          }}
          onPointerLeave={handlePointerLeave}
          onPointerMove={handlePointerMove}
          onPointerUpCapture={endScrub}
        >
          <div className="flex flex-col">{buttons}</div>
        </div>
      </TooltipHint>
    </nav>
  );
}

/**
 * The floating rail of jump markers for a
 * thread's user messages. With `getScrollElement` the rail renders into the
 * scroll element's parent while `hasRoomForRail` holds.
 */
function NavigationRail({
  getScrollElement,
  prefersReducedMotion,
  ...props
}: NavigationRailProps) {
  const systemReducedMotion = useReducedMotion();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrubbedItemId, setScrubbedItemId] = useState<string | null>(null);
  const [hasRoom, setHasRoom] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (getScrollElement === undefined) {
      return noop;
    }

    const scroll = getScrollElement();

    const content =
      scroll?.querySelector<HTMLElement>(CONTENT_SELECTOR) ?? null;

    if (scroll === null || content === null) {
      return noop;
    }

    let frame: number | null = null;

    const measure = () => {
      if (frame !== null) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;
        setHost(scroll.parentElement);
        setHasRoom(hasRoomForRail(scroll, content));
      });
    };

    const resize = new ResizeObserver(measure);
    resize.observe(scroll);
    resize.observe(content);
    const mutation = new MutationObserver(measure);
    mutation.observe(scroll.firstElementChild ?? scroll, {
      attributeFilter: ["style"],
      attributes: true,
    });
    window.addEventListener("resize", measure);
    measure();

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [getScrollElement]);

  if (props.items.length < MIN_RAIL_ITEMS) {
    return null;
  }

  const rail = (
    <NavigationRailList
      {...props}
      listRef={listRef}
      prefersReducedMotion={prefersReducedMotion ?? systemReducedMotion}
      scrubbedItemId={scrubbedItemId}
      onScrubbedItemChange={setScrubbedItemId}
    />
  );

  if (getScrollElement === undefined) {
    return rail;
  }

  return hasRoom && host !== null ? createPortal(rail, host) : null;
}

export {
  groupRailItems,
  hasRoomForRail,
  NavigationRail,
  NavigationRailCard,
  NavigationRailMarker,
  NavigationRailPreview,
  scrollItemIntoView,
};

export type {
  NavigationRailHierarchyLevel,
  NavigationRailItem,
  NavigationRailMarkerProps,
  NavigationRailPreviewState,
  NavigationRailProps,
  NavigationRailScrollBehavior,
};
