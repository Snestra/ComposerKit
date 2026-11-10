"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "composerkit/lib/utils";
import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import styles from "./labelled-switch.module.css";

type LabelledSwitchProps = Omit<
  ComponentProps<typeof SwitchPrimitive.Root>,
  "className"
> & {
  className?: string;
  label?: ReactNode;
  labelPosition?: "start" | "end";
  linkSwitch?: boolean;
};

function LabelledSwitch({
  className,
  disabled = false,
  id,
  inert,
  label,
  labelPosition = "end",
  linkSwitch = false,
  ...props
}: LabelledSwitchProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  const hasLabel =
    label !== undefined && label !== null && label !== false && label !== "";

  return (
    <div
      className={cn(
        styles.container,
        linkSwitch && styles.linkSwitch,
        className
      )}
      data-disabled={disabled ? "" : undefined}
      data-ck-has-label={hasLabel ? "" : undefined}
      data-ck-label-position={labelPosition}
      inert={inert}
    >
      <SwitchPrimitive.Root
        {...props}
        className={styles.track}
        disabled={disabled}
        id={controlId}
        inert={inert}
        nativeButton
        render={(rootProps, state) => (
          <button
            {...rootProps}
            data-state={state.checked ? "checked" : "unchecked"}
            type="button"
          />
        )}
      >
        <SwitchPrimitive.Thumb
          className={styles.thumb}
          render={(thumbProps, state) => (
            <span
              {...thumbProps}
              data-state={state.checked ? "checked" : "unchecked"}
            />
          )}
        />
      </SwitchPrimitive.Root>
      {hasLabel ? (
        <label className={styles.label} htmlFor={controlId}>
          {label}
        </label>
      ) : null}
    </div>
  );
}

export { LabelledSwitch };

export type { LabelledSwitchProps };
