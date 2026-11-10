"use client";

/* oxlint-disable shadcn/no-inline-styles, shadcn/no-arbitrary-values, shadcn/no-restyle -- FloatingSurface, PanelHeader and the side panel set CSS custom properties for the spring, use theme-length classes and put classes on their Button. */

import {
  SIDE_PANEL_SPRING_EASING,
  SIDE_PANEL_SPRING_SECONDS,
} from "@workspace/react/components/panes/spring";
import { Button } from "@workspace/react/components/ui/button";
import { useReducedMotion } from "@workspace/react/lib/reduced-motion";
import { cn } from "@workspace/react/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  ComponentProps,
  CSSProperties,
  ReactNode,
  TransitionEvent as ReactTransitionEvent,
} from "react";

import styles from "@workspace/react/components/panes/panes.module.css";

type FloatingSurfaceVariant =
  | "canvas"
  | "default"
  | "island"
  | "notice"
  | "single-line"
  | "viewer";

type FloatingSurfaceRadius = "composer";

interface FloatingSurfaceClassOptions {
  radius?: FloatingSurfaceRadius;
  unstyled?: boolean;
  variant?: FloatingSurfaceVariant;
}

const isSolidVariant = (variant: FloatingSurfaceVariant) =>
  variant === "island" || variant === "viewer";

const solidSurfaceClasses = (
  variant: FloatingSurfaceVariant,
  radius: FloatingSurfaceRadius | undefined
) => [
  radius !== "composer" && "rounded-2xl",
  variant === "viewer"
    ? cn("bg-fill-viewer-control backdrop-blur-xl", styles.viewerElevation)
    : cn("bg-panel-elevated-secondary", styles.islandElevation),
];

const layeredSurfaceClasses = (variant: FloatingSurfaceVariant) => [
  styles.floatingSurface,
  (variant === "single-line" || variant === "notice") &&
    styles.singleLineSurface,
  variant === "canvas" && styles.canvasSurface,
  variant === "canvas" ? "bg-panel-canvas" : "bg-panel-elevated-secondary",
  "ring-[0.5px] ring-border",
  variant === "notice" ? "shadow-(--shadow-subtle)" : "shadow-2xl",
];

const floatingSurfaceClassName = ({
  radius,
  unstyled = false,
  variant = "default",
}: FloatingSurfaceClassOptions = {}) =>
  cn(
    !unstyled &&
      (isSolidVariant(variant)
        ? solidSurfaceClasses(variant, radius)
        : layeredSurfaceClasses(variant)),
    !unstyled && radius === "composer" && styles.composerRadius
  );

interface FloatingSurfaceProps
  extends ComponentProps<"div">, FloatingSurfaceClassOptions {}

const FloatingSurface = ({
  className,
  radius,
  unstyled,
  variant,
  ...props
}: FloatingSurfaceProps) => (
  <div
    {...props}
    className={cn(
      floatingSurfaceClassName({ radius, unstyled, variant }),
      className
    )}
  />
);

const FloatingComposerInset = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div {...props} className={cn(styles.floatingComposerInset, className)} />
);

interface PanelHeaderProps {
  actions?: ReactNode;
  closeDisabled?: boolean;
  closeLabel: string;
  leading?: ReactNode;
  onClose: () => void;
  title: ReactNode;
  titleId?: string;
}

const PanelHeader = ({
  actions,
  closeDisabled,
  closeLabel,
  leading,
  onClose,
  title,
  titleId,
}: PanelHeaderProps) => (
  <div className="flex h-11 shrink-0 items-center justify-between gap-2 py-1 ps-4 pe-2">
    {leading}
    <h2 className="min-w-0 flex-1 truncate" id={titleId}>
      <span className="text-base font-semibold text-text select-none">
        {title}
      </span>
    </h2>
    {actions}
    <Button
      aria-label={closeLabel}
      color="secondary"
      disabled={closeDisabled}
      onClick={onClose}
      radius="full"
      size="toolbar"
      uniform
    >
      <X />
    </Button>
  </div>
);

type SidePanelSide = "end" | "start";

interface SidePanelProps {
  busy?: boolean;
  children?: ReactNode;
  className?: string;
  height?: "content" | "full";
  initial?: boolean;
  label: string;
  onExitComplete?: () => void;
  open: boolean;
  preserveContent?: boolean;
  side?: SidePanelSide;
  size?: "compact" | "default";
}

// oxlint-disable-next-line anti-slop/require-safety-comment-for-type-assertion, typescript/no-unsafe-type-assertion -- SAFETY: both keys are `--name` custom properties with string values, which React accepts in a style object; CSSProperties has no index for them.
const springStyle = {
  "--side-panel-duration": `${SIDE_PANEL_SPRING_SECONDS}s`,
  "--side-panel-easing": SIDE_PANEL_SPRING_EASING,
} as CSSProperties;

const SidePanel = ({
  busy,
  children,
  className,
  height = "full",
  initial = true,
  label,
  onExitComplete,
  open,
  preserveContent = false,
  side = "end",
  size = "default",
}: SidePanelProps) => {
  const reducedMotion = useReducedMotion();
  const wasOpen = useRef(open);
  const [previousOpen, setPreviousOpen] = useState(open);
  const [exited, setExited] = useState(!open);
  const [skipEnter, setSkipEnter] = useState(!initial && open);

  if (previousOpen !== open) {
    setPreviousOpen(open);
    setSkipEnter(false);

    if (open) {
      setExited(false);
    }
  }

  const hidden = !open && (reducedMotion || exited);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;

      return;
    }

    if (wasOpen.current && reducedMotion) {
      wasOpen.current = false;
      onExitComplete?.();
    }
  }, [onExitComplete, open, reducedMotion]);

  if (hidden && !preserveContent) {
    return null;
  }

  const handleTransitionEnd = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (
      open ||
      event.target !== event.currentTarget ||
      event.propertyName !== "transform"
    ) {
      return;
    }

    wasOpen.current = false;
    setExited(true);
    onExitComplete?.();
  };

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "z-40 col-start-1 row-start-1 flex h-full max-h-full min-h-0 max-w-full shrink-0 p-2 pt-px",
        height === "content" && "items-start",
        side === "start" &&
          "ps-[calc(var(--spacing)*2+var(--ck-viewer-header-start-inset,0px))]",
        styles.sidePanel
      )}
      data-hidden={hidden}
      data-ck-reduced-motion={reducedMotion}
      data-side={side}
      data-skip-enter={skipEnter ? "" : undefined}
      data-state={open ? "open" : "closed"}
      inert={!open}
      onTransitionEnd={handleTransitionEnd}
      style={springStyle}
    >
      <aside
        aria-busy={busy}
        aria-label={label}
        className={cn(
          floatingSurfaceClassName({ variant: "viewer" }),
          "flex max-h-full min-h-0 max-w-full flex-col text-text",
          height === "content" ? "overflow-y-auto" : "overflow-hidden",
          size === "compact" ? "w-74" : "w-80",
          className
        )}
      >
        {height === "content" ? (
          <div className="flex shrink-0 flex-col">{children}</div>
        ) : (
          children
        )}
      </aside>
    </div>
  );
};

export {
  FloatingComposerInset,
  FloatingSurface,
  PanelHeader,
  SidePanel,
  floatingSurfaceClassName,
};

export type {
  FloatingSurfaceProps,
  FloatingSurfaceRadius,
  FloatingSurfaceVariant,
  PanelHeaderProps,
  SidePanelProps,
  SidePanelSide,
};
