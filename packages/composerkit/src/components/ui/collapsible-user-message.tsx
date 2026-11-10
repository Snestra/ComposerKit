"use client";

/* oxlint-disable complexity -- The collapse and observer lifecycles follow the component. */
/* oxlint-disable anti-slop/no-runtime-typeof -- Children may be a render function or React content. */
/* oxlint-disable unicorn/prefer-number-coercion -- Computed line heights include CSS units. */
/* oxlint-disable typescript/consistent-return -- Effects without a mounted element have nothing to clean up. */
/* oxlint-disable shadcn/no-inline-styles -- The measured line count determines the clamp. */

import { Button } from "composerkit/components/ui/button";
import { cn } from "composerkit/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";

const FOCUSABLE =
  'a[href], area[href], button, input, select, textarea, summary, audio[controls], video[controls], iframe, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

const LINKS = "a[href], area[href]";
const CODE_BLOCK = '[data-ck-markdown-copy="code-block"]:not(pre)';

interface CollapsibleUserMessageProps {
  children: ReactNode | ((text: string) => ReactNode);
  text: string;
  collapsedLineCount?: number;
  collapseIndicator?: "ellipsis" | "fade";
  textTone?: "default" | "user-message";
}

const CollapsibleUserMessage = ({
  children,
  text,
  collapsedLineCount = 20,
  collapseIndicator = "ellipsis",
  textTone = "default",
}: CollapsibleUserMessageProps) => {
  const [expanded, setExpanded] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  const forceCollapsible =
    typeof children === "function" && text.length > collapsedLineCount * 512;

  const collapsed = !printing && !expanded && (collapsible || forceCollapsible);

  const showEllipsis =
    collapsed && collapseIndicator === "ellipsis" && collapsedLineCount > 2;

  const lines = collapsedLineCount - Number(showEllipsis);

  useEffect(() => {
    const before = () => {
      flushSync(() => {
        setPrinting(true);
      });
    };

    const after = () => {
      setPrinting(false);
    };

    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);

    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const measure = () => {
      const lineHeight =
        Number.parseFloat(getComputedStyle(content).lineHeight) || 13;

      setCollapsible(
        content.scrollHeight > collapsedLineCount * lineHeight + 1
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);

    return () => {
      observer.disconnect();
    };
  }, [collapsedLineCount]);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = contentRef.current;

    if (!(outer && inner && collapsed && !forceCollapsible)) {
      return;
    }

    const adjust = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(outer).lineHeight);

      if (!Number.isFinite(lineHeight)) {
        return;
      }

      const bounds = outer.getBoundingClientRect();

      const scale =
        outer.offsetHeight === 0 ? 1 : bounds.height / outer.offsetHeight;

      let height = Math.ceil(lineHeight * lines);

      for (const element of outer.querySelectorAll(`${CODE_BLOCK}, ${LINKS}`)) {
        const rect = element.getBoundingClientRect();
        const top = (rect.top - bounds.top) / scale;
        const bottom = (rect.bottom - bounds.top) / scale;

        if (top < height && bottom > height) {
          height = Math.ceil(bottom);
        }
      }

      outer.style.maxHeight = `${height}px`;
    };

    adjust();
    const resize = new ResizeObserver(adjust);
    const mutation = new MutationObserver(adjust);
    resize.observe(inner);
    mutation.observe(inner, { childList: true, subtree: true });

    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [collapsed, forceCollapsible, lines]);

  useEffect(() => {
    const root = outerRef.current;

    if (!(root && collapsed)) {
      return;
    }

    const originals = new Map<HTMLElement, string | null>();

    const update = (element: HTMLElement, visible: boolean) => {
      const original = originals.get(element);
      element.toggleAttribute("inert", !visible);

      if (visible) {
        if (original === null || original === undefined) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", original);
        }
      } else {
        element.setAttribute("aria-hidden", "true");
      }
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const element = entry.target;

                if (element instanceof HTMLElement && originals.has(element)) {
                  update(
                    element,
                    entry.isIntersecting &&
                      (element.matches(LINKS)
                        ? entry.intersectionRatio > 0
                        : entry.intersectionRatio >= 1)
                  );
                }
              }
            },
            { root, threshold: [Number.EPSILON, 1] }
          );

    const scan = () => {
      for (const element of originals.keys()) {
        if (!root.contains(element)) {
          observer?.unobserve(element);
          update(element, true);
          originals.delete(element);
        }
      }

      for (const element of root.querySelectorAll<HTMLElement>(FOCUSABLE)) {
        if (originals.has(element) || element.hasAttribute("inert")) {
          continue;
        }

        originals.set(element, element.getAttribute("aria-hidden"));

        if (observer === null) {
          const target = element.getBoundingClientRect();
          const viewport = root.getBoundingClientRect();

          const visible = element.matches(LINKS)
            ? Math.min(target.right, viewport.right) >
                Math.max(target.left, viewport.left) &&
              Math.min(target.bottom, viewport.bottom) >
                Math.max(target.top, viewport.top)
            : target.top >= viewport.top &&
              target.left >= viewport.left &&
              target.right <= viewport.right &&
              target.bottom <= viewport.bottom;

          update(element, visible);
        } else {
          update(element, false);
          observer.observe(element);
        }
      }
    };

    scan();
    const mutation = new MutationObserver(scan);
    mutation.observe(root, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      mutation.disconnect();

      for (const element of originals.keys()) {
        update(element, true);
      }
    };
  }, [collapsed]);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="relative w-full min-w-0 text-[length:var(--ui-message-text-size,13px)] leading-relaxed">
        <div
          ref={outerRef}
          className={cn(
            collapsed && "overflow-hidden",
            collapsed &&
              collapseIndicator === "fade" &&
              "mask-b-from-80% mask-b-to-100%"
          )}
          style={collapsed ? { maxHeight: `${lines}lh` } : undefined}
        >
          <div ref={contentRef}>
            {typeof children === "function"
              ? children(
                  collapsed ? text.slice(0, collapsedLineCount * 512) : text
                )
              : children}
          </div>
        </div>
        {showEllipsis && (
          <span aria-hidden className="block">
            …
          </span>
        )}
      </div>
      {!printing && (collapsible || forceCollapsible) && (
        <Button
          aria-expanded={expanded}
          className="mt-1.5 self-start"
          color={
            textTone === "user-message" ? "ghostUserMessage" : "disclosure"
          }
          data-ck-markdown-copy="exclude"
          data-ck-thread-skip
          onClick={() => {
            setExpanded((value) => !value);
          }}
          size="inline"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={cn("size-3", expanded && "rotate-180")} />
        </Button>
      )}
    </div>
  );
};

export { CollapsibleUserMessage };

export type { CollapsibleUserMessageProps };
