"use client";

import {
  SegmentedControl,
  SegmentedItem,
} from "@workspace/react/components/ui/segmented-control";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {
  /* Hydration is the only change. */
};

const AppearanceControl = ({ id }: { id: string }) => {
  const { theme, setTheme, forcedTheme } = useTheme();

  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return null;
  }

  return (
    <SegmentedControl
      id={id}
      aria-label="Appearance"
      value={forcedTheme ?? theme ?? "system"}
      onChange={setTheme}
      disabled={Boolean(forcedTheme)}
    >
      <SegmentedItem value="system">Follow device</SegmentedItem>
      <SegmentedItem value="light">Light</SegmentedItem>
      <SegmentedItem value="dark">Dark</SegmentedItem>
    </SegmentedControl>
  );
};

export { AppearanceControl };
