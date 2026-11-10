"use client";

import { useCallback, useRef, useState } from "react";

export type DiffContextStatus = "error" | "idle" | "loading";

const CONTEXT_LOADING_DELAY_MS = 500;

/**
 * Wraps the context loader.
 * The status turns "loading" when a load takes longer than 500ms and stays
 * "error" after a failure until the next load starts.
 */
export const useDiffContextLoader = <Args extends unknown[], Result>(
  load: ((...args: Args) => Promise<Result>) | undefined
) => {
  const [status, setStatus] = useState<DiffContextStatus>("idle");
  const generation = useRef(0);

  const track = useCallback(
    async (...args: Args): Promise<Result> => {
      if (load === undefined) {
        throw new Error(
          "Diff context loading needs a loader before tracking can begin"
        );
      }

      generation.current += 1;
      const mine = generation.current;

      const update = (next: DiffContextStatus) => {
        if (mine === generation.current) {
          setStatus(next);
        }
      };

      update("idle");

      const timer = setTimeout(() => {
        update("loading");
      }, CONTEXT_LOADING_DELAY_MS);

      try {
        const result = await load(...args);

        clearTimeout(timer);
        update("idle");

        return result;
      } catch (error) {
        clearTimeout(timer);
        update("error");
        throw error;
      }
    },
    [load]
  );

  return { status, track };
};
