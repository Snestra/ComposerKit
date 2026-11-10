"use client";

/* oxlint-disable unicorn/prefer-number-coercion -- CSS delay values include the ms unit. */

import { MarkdownProse } from "@workspace/react/components/markdown/prose";
import type { MarkdownProseProps } from "@workspace/react/components/markdown/prose";
import { useEffect, useEffectEvent, useRef } from "react";
import type { AnimationEvent } from "react";

type StreamingTextProps = Pick<
  MarkdownProseProps,
  "children" | "className" | "components"
> & {
  animate: boolean;
  completionFallbackMs?: number;
  fadeSegmentDelayMs?: number;
  onComplete?: () => void;
};

const StreamingText = ({
  animate,
  children,
  className,
  completionFallbackMs = 2800,
  components,
  fadeSegmentDelayMs = 26,
  onComplete,
}: StreamingTextProps) => {
  const timer = useRef<number | null>(null);

  const complete = useEffectEvent((scheduledText: string) => {
    if (scheduledText === children) {
      onComplete?.();
    }
  });

  useEffect(() => {
    let timeout: number | undefined;

    if (animate && onComplete) {
      timeout = window.setTimeout(() => {
        if (timer.current === timeout) {
          timer.current = null;
          complete(children);
        }
      }, completionFallbackMs);
      timer.current = timeout;
    }

    return () => {
      window.clearTimeout(timeout);

      if (timer.current === timeout) {
        timer.current = null;
      }
    };
  }, [animate, children, completionFallbackMs, onComplete]);

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (
      !(
        animate &&
        onComplete &&
        timer.current !== null &&
        event.target instanceof HTMLElement
      )
    ) {
      return;
    }

    const delay = event.target.style.getPropertyValue("--fade-delay");

    if (delay === "") {
      return;
    }

    const finishedDelay = Number.parseFloat(delay);

    const pending = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        '[style*="--fade-delay"]'
      ),
    ].some(
      (element) =>
        Number.parseFloat(element.style.getPropertyValue("--fade-delay")) >
        finishedDelay
    );

    if (!pending) {
      window.clearTimeout(timer.current);
      timer.current = null;
      onComplete();
    }
  };

  return (
    <div onAnimationEnd={handleAnimationEnd}>
      <MarkdownProse
        className={className}
        components={components}
        fadeSegmentDelayMs={fadeSegmentDelayMs}
        fadeSegmentMaxDelayMs={750}
        isStreaming={animate}
      >
        {children}
      </MarkdownProse>
    </div>
  );
};

export { StreamingText };

export type { StreamingTextProps };
