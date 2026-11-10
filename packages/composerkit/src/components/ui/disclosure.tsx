"use client";

import { Button } from "composerkit/components/ui/button";
import { Spinner } from "composerkit/components/ui/progress";
import { cn } from "composerkit/lib/utils";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

interface DisclosureToggleProps extends Omit<
  ComponentProps<typeof Button>,
  "children" | "color" | "loading"
> {
  children?: ReactNode;
  expanded: boolean;
  isLoading?: boolean;
  kind: "space" | "page";
  label?: string;
  title: string;
}

const layer =
  "col-start-1 row-start-1 flex items-center justify-center transition-opacity duration-(--motion-duration-fast) ease-(--ease-enter) group-focus-visible/disclosure:duration-0 motion-reduce:duration-0";

function DisclosureToggle({
  children,
  className,
  expanded,
  isLoading = false,
  kind,
  label,
  onClick,
  title,
  ...props
}: DisclosureToggleProps) {
  const action = expanded ? "Collapse" : "Expand";

  const defaultLabel =
    kind === "space" ? `${action} ${title}` : `${action} pages inside ${title}`;

  const chevron = (
    <ChevronRight
      className={cn(
        "size-4 transition-[rotate] duration-(--motion-duration-slow) ease-(--ease-enter) group-focus-visible/disclosure:duration-0 motion-reduce:duration-0",
        expanded && "rotate-90"
      )}
    />
  );

  return (
    <Button
      {...props}
      aria-busy={isLoading}
      aria-expanded={expanded}
      aria-label={label ?? defaultLabel}
      className={cn("group/disclosure", className)}
      color="disclosure"
      onClick={isLoading ? undefined : onClick}
      size="icon"
      uniform
    >
      <span aria-hidden="true" className="grid" data-loading={isLoading}>
        <span
          className={cn(
            layer,
            isLoading && "opacity-0 delay-50 starting:opacity-100"
          )}
        >
          {kind === "space" && children !== null && children !== undefined ? (
            <>
              <span className="flex items-center justify-center group-hover/disclosure:hidden group-focus-visible/disclosure:hidden">
                {children}
              </span>
              <span className="hidden group-hover/disclosure:block group-focus-visible/disclosure:block">
                {chevron}
              </span>
            </>
          ) : (
            (children ?? chevron)
          )}
        </span>
        <span
          className={cn(
            layer,
            isLoading ? "opacity-100 delay-50 starting:opacity-0" : "opacity-0"
          )}
        >
          <Spinner
            as="span"
            className="size-4"
            containerClassName={
              isLoading
                ? "[animation-play-state:running]"
                : "[animation-play-state:paused]"
            }
          />
        </span>
      </span>
    </Button>
  );
}

export { DisclosureToggle };

export type { DisclosureToggleProps };
