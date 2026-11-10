"use client";

import { Field } from "@base-ui/react/field";
import { Select } from "@workspace/react/components/ui/select";
import { cn } from "@workspace/react/lib/utils";
import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";

const themes = [
  { label: "Follow device", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

// Hydration is the only change, so no external subscription is needed.
const subscribe = () => () => {
  /* No subscription to remove. */
};

const SettingsForm = ({ className }: { className?: string }) => {
  const { theme, setTheme, forcedTheme } = useTheme();
  const labelId = useId();

  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  return (
    <Field.Root className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Field.Label className="font-medium" id={labelId}>
        Appearance
      </Field.Label>
      <Field.Description className="text-sm text-muted-foreground">
        Choose how the workspace looks.
      </Field.Description>
      {mounted && (
        <Select
          aria-labelledby={labelId}
          disabled={Boolean(forcedTheme)}
          onChange={(option) => {
            setTheme(option.value);
          }}
          options={themes}
          value={theme ?? ""}
        />
      )}
    </Field.Root>
  );
};

export { SettingsForm };
