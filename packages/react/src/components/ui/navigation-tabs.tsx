"use client";

/* oxlint-disable anti-slop/no-runtime-typeof, shadcn/no-unknown-classes -- Base UI accepts state callbacks, and the existing end-to-end tests select the `tab` class. */
import { Tabs as Primitive } from "@base-ui/react/tabs";
import { cn } from "@workspace/react/lib/utils";

/*
 * Base UI tabs with vertical orientation and disabled tabs, used by the
 * preferences navigation. The `tab` class stays because the existing end-to-end
 * tests select `.tab[data-active]`.
 */
const NavigationTabs = Primitive.Root;

function NavigationTabsList({ className, ...props }: Primitive.List.Props) {
  return (
    <Primitive.List
      activateOnFocus
      className={(state) =>
        cn(
          "flex flex-wrap gap-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  );
}

function NavigationTab({ className, ...props }: Primitive.Tab.Props) {
  return (
    <Primitive.Tab
      className={(state) =>
        cn(
          "tab min-h-9 cursor-pointer rounded-(--radius-control) px-3 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring) data-disabled:cursor-not-allowed data-disabled:opacity-50 data-active:bg-(--secondary) data-active:font-semibold data-active:[box-shadow:inset_0_-3px_var(--foreground)]",
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  );
}

function NavigationTabsPanel({ className, ...props }: Primitive.Panel.Props) {
  return (
    <Primitive.Panel
      className={(state) =>
        cn(
          "min-w-0 outline-offset-4",
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  );
}

export {
  NavigationTab,
  NavigationTabs,
  NavigationTabsList,
  NavigationTabsPanel,
};
