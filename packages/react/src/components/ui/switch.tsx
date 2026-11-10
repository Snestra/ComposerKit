"use client";

import { cn } from "@workspace/react/lib/utils";
import type { ComponentProps, MouseEvent } from "react";

type SwitchSize = "default" | "sm";

type SwitchTone = "accent" | "neutral";

interface SwitchProps extends Omit<
  ComponentProps<"button">,
  "onChange" | "role" | "type"
> {
  ariaLabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: SwitchSize;
  thumbClassName?: string;
  tone?: SwitchTone;
  trackClassName?: string;
}

const trackSizes = {
  default: "h-5 w-8",
  sm: "h-4 w-7",
} as const satisfies Record<SwitchSize, string>;

const thumbOffsets =
  "data-[state=unchecked]:translate-x-[2px] data-[state=checked]:translate-x-[14px] rtl:data-[state=unchecked]:-translate-x-[2px] rtl:data-[state=checked]:-translate-x-[14px]";

const thumbSizes = {
  default: `h-4 w-4 ${thumbOffsets}`,
  sm: `h-3 w-3 ${thumbOffsets}`,
} as const satisfies Record<SwitchSize, string>;

function Switch({
  ariaLabel,
  checked,
  className,
  disabled = false,
  onChange,
  onClick,
  size = "default",
  thumbClassName,
  tone = "accent",
  trackClassName,
  ...props
}: SwitchProps) {
  const state = checked ? "checked" : "unchecked";
  const neutralOn = tone === "neutral" && checked;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented && !disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center text-sm focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-(--ck-palette-border-focus) focus-visible:outline-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-default",
        className
      )}
      data-state={state}
      {...props}
      onClick={handleClick}
      disabled={disabled}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-(--motion-duration-fast) ease-out",
          checked && (tone === "neutral" ? "bg-text" : "bg-blue"),
          !checked && "bg-text/10",
          trackSizes[size],
          trackClassName
        )}
        data-state={state}
      >
        <span
          className={cn(
            "rounded-full border shadow-sm transition-transform duration-(--motion-duration-fast) ease-out data-[state=unchecked]:translate-x-0",
            neutralOn ? "border-transparent bg-panel" : "border-white bg-white",
            thumbSizes[size],
            thumbClassName
          )}
          data-state={state}
        />
      </span>
    </button>
  );
}

export { Switch };

export type { SwitchProps, SwitchSize, SwitchTone };
