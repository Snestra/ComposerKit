"use client";

/* oxlint-disable shadcn/no-arbitrary-values, shadcn/no-inline-styles -- The drag preview follows the pointer and uses the sidebar's 32px pill. */

import { dismissTooltips } from "composerkit/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

import { ChatBubbleIcon, ProjectDragFolderIcon } from "./icons";

interface ReorderTarget {
  group: string;
  id: string;
  label: string;
}

interface Drag {
  active: boolean;
  origin: ReorderTarget;
  over: ReorderTarget | null;
  pointerId: number;
  root: HTMLElement;
  startX: number;
  startY: number;
}

const targetAt = (element: Element | null): ReorderTarget | null => {
  const item = element?.closest<HTMLElement>("[data-ck-reorder-id]");
  const id = item?.dataset.ckReorderId;
  const group = item?.dataset.ckReorderGroup;
  const label = item?.dataset.ckReorderLabel;

  return id === undefined || group === undefined || label === undefined
    ? null
    : { group, id, label };
};

const ReorderItem = ({
  children,
  group,
  id,
  label,
}: ReorderTarget & { children: ReactNode }) => (
  <div
    className="contents"
    data-ck-reorder-group={group}
    data-ck-reorder-id={id}
    data-ck-reorder-label={label}
  >
    {children}
  </div>
);

const SidebarReorder = ({
  children,
  onReorder,
}: {
  children: ReactNode;
  onReorder: (group: string, from: string, to: string) => void;
}) => {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  const [preview, setPreview] = useState<{
    item: ReorderTarget;
    x: number;
    y: number;
  } | null>(null);

  const [announcement, setAnnouncement] = useState("");

  const finish = (cancelled: boolean) => {
    const { current } = drag;
    drag.current = null;
    setPreview(null);

    if (current === null) {
      return;
    }

    if (current.root.hasPointerCapture(current.pointerId)) {
      current.root.releasePointerCapture(current.pointerId);
    }

    if (!current.active) {
      return;
    }

    suppressClick.current = true;

    if (!cancelled && current.over !== null) {
      onReorder(current.origin.group, current.origin.id, current.over.id);
      setAnnouncement(
        `${current.origin.label} dropped over ${current.over.label}.`
      );
    } else {
      setAnnouncement(`${current.origin.label} drag cancelled.`);
    }
  };

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const { current } = drag;

        if (current === null) {
          return;
        }

        drag.current = null;
        suppressClick.current = current.active;
        setPreview(null);
        setAnnouncement(`${current.origin.label} drag cancelled.`);

        if (current.root.hasPointerCapture(current.pointerId)) {
          current.root.releasePointerCapture(current.pointerId);
        }
      }
    };

    window.addEventListener("keydown", cancel);

    return () => {
      window.removeEventListener("keydown", cancel);
    };
  }, []);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const { current } = drag;

    if (current === null || event.pointerId !== current.pointerId) {
      return;
    }

    if (
      !current.active &&
      Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY
      ) < 8
    ) {
      return;
    }

    if (!current.active) {
      current.active = true;
      dismissTooltips();
      current.root.setPointerCapture(current.pointerId);
    }

    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const over = current.root.contains(target) ? targetAt(target) : null;
    current.over = over?.group === current.origin.group ? over : null;
    setPreview({
      item: current.origin,
      x: event.clientX - 10,
      y: event.clientY - 14,
    });

    if (current.over !== null) {
      setAnnouncement(
        `${current.origin.label} moved over ${current.over.label}.`
      );
    }

    const scroll = current.root.querySelector<HTMLElement>(
      "[data-sidebar-scroll]"
    );

    if (scroll !== null) {
      const bounds = scroll.getBoundingClientRect();

      if (event.clientY < bounds.top + 28) {
        scroll.scrollBy(0, -14);
      }

      if (event.clientY > bounds.bottom - 28) {
        scroll.scrollBy(0, 14);
      }
    }
  };

  return (
    <div
      className="relative flex h-full min-h-0 flex-col text-text/85 select-none [&_.text-text]:text-text/85"
      onClickCapture={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onLostPointerCapture={() => {
        finish(true);
      }}
      onPointerCancel={() => {
        finish(true);
      }}
      onPointerDown={(event) => {
        suppressClick.current = false;

        if (
          event.button !== 0 ||
          event.pointerType !== "mouse" ||
          !(event.target instanceof Element)
        ) {
          return;
        }

        if (event.target.closest("button, a, input, textarea, [role=menu]")) {
          return;
        }

        const origin = targetAt(event.target);

        if (origin === null) {
          return;
        }

        drag.current = {
          active: false,
          origin,
          over: null,
          pointerId: event.pointerId,
          root: event.currentTarget,
          startX: event.clientX,
          startY: event.clientY,
        };
      }}
      onPointerLeave={() => {
        if (drag.current?.active === false) {
          drag.current = null;
        }
      }}
      onPointerMove={move}
      onPointerUp={() => {
        finish(false);
      }}
    >
      {children}
      <span aria-live="assertive" className="sr-only">
        {announcement}
      </span>
      {preview === null
        ? null
        : createPortal(
            <div
              aria-hidden
              className="pointer-events-none fixed z-50 flex h-8 max-w-80 items-center gap-2 rounded-xl border border-border bg-panel-secondary px-2 text-base text-text opacity-70 shadow-lg"
              style={{ left: preview.x, top: preview.y }}
            >
              {preview.item.group === "projects" ? (
                <ProjectDragFolderIcon className="size-4" />
              ) : (
                <ChatBubbleIcon className="size-4" />
              )}
              <span className="min-w-0 truncate">{preview.item.label}</span>
            </div>,
            document.body
          )}
    </div>
  );
};

const reorderIds = (
  items: readonly { id: string }[],
  from: string,
  to: string
): string[] => {
  const ids = items.map((item) => item.id);
  const start = ids.indexOf(from);
  const end = ids.indexOf(to);

  if (start === -1 || end === -1 || start === end) {
    return ids;
  }

  return ids.toSpliced(start, 1).toSpliced(end, 0, from);
};

export { ReorderItem, reorderIds, SidebarReorder };
