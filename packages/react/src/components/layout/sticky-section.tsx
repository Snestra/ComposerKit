"use client";

/* oxlint-disable shadcn/no-arbitrary-values -- The heading row reads --ck-row-height-row, which has no theme utility here. */

import { cn } from "@workspace/react/lib/utils";
import type { ComponentProps, ReactNode } from "react";

import styles from "./layout.module.css";

/*
 * StickySection and the scroll
 * host classes of its sidebar container: headerFadeMask,
 * withoutFooterFade and stickyHeaders.
 */

interface StickySectionProps {
  children?: ReactNode;
  heading?: ReactNode;
}

/** A heading that sticks under the scroll mask while its rows clip away beneath it. */
const StickySection = ({ children, heading }: StickySectionProps) => (
  <div className="flex flex-col">
    <div
      className={cn(
        "sticky top-(--ck-sidebar-scroll-header-mask-start) z-10 h-[var(--ck-row-height-row,31px)] shrink-0",
        styles.sectionHeading
      )}
    >
      {heading}
    </div>
    <div className={styles.sectionContent}>
      <div className={styles.clipWindow}>
        <div className={cn(styles.clipContent, "flex flex-col gap-px")}>
          {children}
        </div>
      </div>
    </div>
  </div>
);

interface ScrollMaskHostProps extends ComponentProps<"div"> {
  /** Drops the bottom fade and keeps the top one. */
  withoutFooterFade?: boolean;
  /** Narrows the top fade to half a spacing unit for sticky section headings. */
  stickyHeaders?: boolean;
}

/** A scroll container whose top and bottom edges fade through a mask image. */
const ScrollMaskHost = ({
  className,
  stickyHeaders = false,
  withoutFooterFade = false,
  ...props
}: ScrollMaskHostProps) => (
  <div
    {...props}
    className={cn(
      "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto",
      styles.headerFadeMask,
      withoutFooterFade && styles.withoutFooterFade,
      stickyHeaders && styles.stickyHeaders,
      styles.scrollMask,
      className
    )}
  />
);

export { ScrollMaskHost, StickySection };

export type { ScrollMaskHostProps, StickySectionProps };
