"use client";

import { cn } from "composerkit/lib/utils";
import { useEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";

import styles from "./skeleton.module.css";

type CadencedShimmerProps = ComponentProps<"span"> & { active?: boolean };

const CadencedShimmer = ({
  active = true,
  children,
  className,
  ...props
}: CadencedShimmerProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;

    if (!element || !active) {
      return () => {
        element?.classList.remove(styles.active);
      };
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    let visible = false;
    let running = false;
    let start: ReturnType<typeof setTimeout>;
    let finish: ReturnType<typeof setTimeout>;
    let repeat: ReturnType<typeof setInterval>;

    const stop = () => {
      running = false;
      clearTimeout(start);
      clearTimeout(finish);
      clearInterval(repeat);
      element.classList.remove(styles.active);
    };

    const burst = () => {
      clearTimeout(finish);
      element.classList.remove(styles.active);
      element.classList.add(styles.active);
      finish = setTimeout(() => {
        element.classList.remove(styles.active);
      }, 900);
    };

    const update = () => {
      const preference = root.dataset.ckReducedMotion;

      const reduced =
        preference === undefined ? media.matches : preference === "true";

      const shouldRun = visible && !document.hidden && !reduced;

      if (shouldRun === running) {
        return;
      }

      if (!shouldRun) {
        stop();

        return;
      }

      running = true;
      start = setTimeout(() => {
        burst();
        repeat = setInterval(burst, 4200);
      }, 550);
    };

    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      update();
    });

    intersection.observe(element);
    const mutation = new MutationObserver(update);
    mutation.observe(root, {
      attributeFilter: ["data-ck-reduced-motion"],
      attributes: true,
    });
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      intersection.disconnect();
      mutation.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      stop();
    };
  }, [active]);

  if (!active) {
    return (
      <span className={className} {...props}>
        {children}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn(
        "relative inline-block align-top",
        styles.cadenced,
        className
      )}
      {...props}
    >
      {children}
      <span aria-hidden="true" className={styles.cadencedSweep}>
        <span className={styles.highlight}>{children}</span>
      </span>
    </span>
  );
};

const ThinkingShimmer = ({
  message = "Thinking",
  className,
  ...props
}: Omit<CadencedShimmerProps, "children"> & { message?: ReactNode }) => (
  // eslint-disable-next-line shadcn/require-static-classes -- The caller may add classes to the typography.
  <CadencedShimmer {...props} className={cn(styles.thinking, className)}>
    {message}
  </CadencedShimmer>
);

export { CadencedShimmer, ThinkingShimmer };

export type { CadencedShimmerProps };
