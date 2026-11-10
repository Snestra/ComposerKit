"use client";

import { useCallback, useEffect } from "react";

const TOGGLE_ALL_EVENT = "toggle-all-diffs";

interface ToggleDetail {
  open: boolean;
  scope: string | undefined;
}

const isToggleEvent = (event: Event): event is CustomEvent<ToggleDetail> =>
  event instanceof CustomEvent;

/**
 * Alt-clicking a file header toggles every diff
 * in the same scope through a window event.
 */
export const useToggleAllDiffs = (
  onOpenChange: (open: boolean) => void,
  scope?: string
) => {
  useEffect(() => {
    const listener = (event: Event) => {
      if (!isToggleEvent(event)) {
        return;
      }

      const { open, scope: eventScope } = event.detail;

      if (scope !== undefined && scope !== "" && eventScope !== scope) {
        return;
      }

      if (
        (scope !== undefined && scope !== "") ||
        eventScope === undefined ||
        eventScope === ""
      ) {
        onOpenChange(open);
      }
    };

    window.addEventListener(TOGGLE_ALL_EVENT, listener);

    return () => {
      window.removeEventListener(TOGGLE_ALL_EVENT, listener);
    };
  }, [onOpenChange, scope]);

  return useCallback(
    (open: boolean) => {
      window.dispatchEvent(
        new CustomEvent<ToggleDetail>(TOGGLE_ALL_EVENT, {
          detail: { open, scope },
        })
      );
    },
    [scope]
  );
};
