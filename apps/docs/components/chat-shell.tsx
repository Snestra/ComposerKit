"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@workspace/react/components/ui/button";
import { cn } from "cn";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

// The navigation drawer is a chat-shell surface, not a dialog variant.
const DRAWER_BACKDROP = "fixed inset-0 z-50 bg-black/50";

const DRAWER_POPUP =
  "fixed top-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(var(--chat-sidebar-width,340px),100vw)] flex-col gap-2 overflow-y-auto border bg-popover p-3 text-popover-foreground shadow-lg outline-none";

type ChatShellProps = Omit<ComponentProps<"div">, "children"> & {
  navigation: ReactNode;
  children: ReactNode;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
};

const ChatShell = ({
  navigation,
  children,
  drawerOpen,
  onDrawerOpenChange,
  className,
  ...props
}: ChatShellProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [fit, setFit] = useState<"pending" | "narrow" | "wide">("pending");
  const narrow = fit === "narrow";

  useEffect(() => {
    const shell = shellRef.current;
    const probe = fitRef.current;

    if (!(shell && probe)) {
      // oxlint-disable-next-line unicorn/no-useless-undefined
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setFit(
        shell.clientWidth < probe.getBoundingClientRect().width
          ? "narrow"
          : "wide"
      );
    });

    observer.observe(shell);
    observer.observe(probe);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (fit === "wide" && drawerOpen) {
      onDrawerOpenChange(false);
    }
  }, [fit, drawerOpen, onDrawerOpenChange]);

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background text-foreground",
        className
      )}
      {...props}
    >
      <div
        ref={fitRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute h-0 w-[calc(var(--chat-sidebar-width,340px)+var(--chat-content-min-width,320px))]"
      />
      <Dialog.Root
        open={narrow && drawerOpen}
        onOpenChange={onDrawerOpenChange}
      >
        {!narrow && (
          <aside className="min-h-0 w-[var(--chat-sidebar-width,340px)] shrink-0 overflow-y-auto">
            {navigation}
          </aside>
        )}
        <main
          ref={contentRef}
          tabIndex={-1}
          className="m-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-overlay bg-card text-card-foreground outline-none"
        >
          {narrow && (
            <div className="px-3 pt-3">
              <Dialog.Trigger
                render={
                  <Button
                    ref={triggerRef}
                    color="ghostActive"
                    size="iconCircleLg"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu />
              </Dialog.Trigger>
            </div>
          )}
          {children}
        </main>
        {(narrow || drawerOpen) && (
          <Dialog.Portal>
            <Dialog.Backdrop className={DRAWER_BACKDROP} />
            <Dialog.Popup
              className={DRAWER_POPUP}
              finalFocus={() => triggerRef.current ?? contentRef.current}
            >
              <Dialog.Title className="sr-only">Threads</Dialog.Title>
              <Dialog.Close
                render={
                  <Button
                    color="ghostActive"
                    size="iconCircleLg"
                    aria-label="Close navigation"
                    className="self-end"
                  />
                }
              >
                <X />
              </Dialog.Close>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {narrow && navigation}
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </Dialog.Root>
    </div>
  );
};

export { ChatShell };
