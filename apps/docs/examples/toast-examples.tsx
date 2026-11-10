"use client";

/* oxlint-disable eslint/no-empty-function -- The example actions do nothing; they only show the toast buttons. */

import { ToastAlert, ToastContent } from "composerkit/components/toast/alert";
import { ToastContentAnchor } from "composerkit/components/toast/manager";
import type { ToastRenderContext } from "composerkit/components/toast/manager";
import {
  SonnerToaster,
  sonnerToast,
} from "composerkit/components/toast/sonner";
import { Button } from "composerkit/components/ui/button";
import {
  ToastProvider,
  getActiveToastManager,
  showToastOnBoundManager,
  useToast,
} from "composerkit/components/ui/toast";
import type {
  ToastHandle,
  ToastOptions,
} from "composerkit/components/ui/toast";
import { cn } from "composerkit/lib/utils";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Level = "danger" | "info" | "success" | "warning";

interface Example {
  description?: string;
  duration?: number;
  level: Level;
  primaryAction?: string;
  secondaryAction?: string;
  title: string;
}

const EXAMPLES: readonly Example[] = [
  {
    description: "Your changes will apply next time.",
    level: "info",
    title: "Settings saved",
  },
  { level: "success", title: "Copied to clipboard" },
  {
    level: "warning",
    primaryAction: "Retry",
    title: "Connection is slow",
  },
  {
    description: "The file could not be sent.",
    level: "danger",
    primaryAction: "Try again",
    secondaryAction: "Dismiss",
    title: "Upload failed",
  },
  {
    duration: 0,
    level: "info",
    title:
      "Long title that wraps across several lines to test whitespace handling in the toast row",
  },
];

const LEVELS: readonly Level[] = ["info", "success", "warning", "danger"];

const VARIANTS = [
  "default",
  "successNeutral",
  "successSolid",
  "dangerSolid",
] as const;

const STACK_COUNT = 5;

const Group = ({ children, title }: { children: ReactNode; title: string }) => (
  <section className="flex flex-col gap-3">
    <h3 className="text-base font-medium">{title}</h3>
    {children}
  </section>
);

const Row = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-2">{children}</div>
);

const Action = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <Button
    className="max-w-full whitespace-normal"
    color="secondary"
    onClick={onClick}
    size="dialog"
  >
    {children}
  </Button>
);

const noop = () => {};

const CUSTOM_LEADING = <span aria-hidden="true">★</span>;

const renderCustomContent = ({ close, level }: ToastRenderContext) => (
  <ToastAlert level={level} onRemove={close} richColors testId="custom-content">
    Custom content ({level})
  </ToastAlert>
);

// The Alert keeps its actions at their width (shrink-0, so
// the samples scroll sideways in a narrow window instead of widening the page.
const Samples = () => (
  <div className="flex min-w-0 flex-col gap-3 overflow-x-auto p-1">
    {LEVELS.map((level) => (
      <ToastContent
        description={level === "info" ? "Short example text." : undefined}
        key={level}
        level={level}
        onClose={noop}
        primaryAction={
          level === "danger" ? { label: "Try again", onClick: noop } : undefined
        }
        secondaryAction={
          level === "danger" ? { label: "Dismiss", onClick: noop } : undefined
        }
        testId={`sample-${level}`}
        title={`${level} toast`}
      />
    ))}
    {VARIANTS.slice(1).map((variant) => (
      <ToastContent
        actionPlacement="inline"
        description="Short example text."
        key={variant}
        level={variant === "dangerSolid" ? "danger" : "success"}
        onClose={noop}
        primaryAction={{ label: "Open", onClick: noop }}
        testId={`sample-${variant}`}
        title={variant}
        variant={variant}
      />
    ))}
    <ToastContent
      level="info"
      leading={null}
      testId="sample-no-leading"
      title="No leading icon"
    />
    <ToastAlert level="warning" richColors={false} testId="sample-plain-alert">
      Alert with role alert and no rich colors
    </ToastAlert>
  </div>
);

const useShow = () => {
  const toast = useToast();
  const last = useRef<ToastHandle | null>(null);

  const show = (example: Example, options?: ToastOptions) => {
    last.current = toast[example.level](example.title, {
      description: example.description,
      duration: example.duration,
      primaryAction:
        example.primaryAction === undefined
          ? undefined
          : { label: example.primaryAction, onClick: noop },
      secondaryAction:
        example.secondaryAction === undefined
          ? undefined
          : { label: example.secondaryAction, onClick: noop },
      ...options,
    });

    return last.current;
  };

  return { last, show, toast };
};

const LevelButtons = () => {
  const { show, toast } = useShow();

  return (
    <Row>
      {EXAMPLES.map((example) => (
        <Action
          key={example.title}
          onClick={() => {
            show(example);
          }}
        >
          {example.duration === 0
            ? "Show toast that stays"
            : `Show ${example.level} toast`}
        </Action>
      ))}
      <Action
        onClick={() => {
          toast.info("Example action.", {
            primaryAction: {
              label: "Undo",
              onClick: () => {
                toast.info("Action undone.");
              },
            },
          });
        }}
      >
        Show toast with action
      </Action>
      <Action
        onClick={() => {
          for (let index = 1; index <= STACK_COUNT; index += 1) {
            toast.info(`Notification ${index}`);
          }
        }}
      >
        Show {STACK_COUNT} toasts
      </Action>
      <Action
        onClick={() => {
          toast.closeAll();
        }}
      >
        Close all
      </Action>
    </Row>
  );
};

const OptionButtons = () => {
  const { toast } = useShow();
  const [pending, setPending] = useState(false);

  return (
    <Row>
      <Action
        onClick={() => {
          toast.info("Without close button", {
            duration: 0,
            hasCloseButton: false,
          });
        }}
      >
        No close button, no swipe
      </Action>
      <Action
        onClick={() => {
          toast.info("Replaced notification", {
            description: new Date().toLocaleTimeString(),
            id: "gallery-replace",
          });
        }}
      >
        Replace by id
      </Action>
      <Action
        onClick={() => {
          toast.info("Inline actions", {
            actionPlacement: "inline",
            description: "Description with inline placement.",
            primaryAction: { label: "Open", onClick: noop },
          });
        }}
      >
        Inline actions
      </Action>
      <Action
        onClick={() => {
          setPending(true);
          toast.info("Saving", {
            duration: 0,
            primaryAction: {
              label: "Saving",
              loading: true,
              onClick: noop,
            },
          });
        }}
      >
        Action loading{pending ? " (shown)" : ""}
      </Action>
      <Action
        onClick={() => {
          toast.info("Custom leading", {
            leading: CUSTOM_LEADING,
          });
        }}
      >
        Custom leading
      </Action>
      <Action
        onClick={() => {
          toast.custom({
            content: renderCustomContent,
            level: "warning",
          });
        }}
      >
        Custom content
      </Action>
      <Action
        onClick={() => {
          toast.danger("Danger toast reports its analytics option", {
            errorAnalytics: { source: "gallery" },
          });
        }}
      >
        Danger with analytics
      </Action>
      <Action
        onClick={() => {
          toast.info("Bottom right", { position: "bottom-right" });
        }}
      >
        Bottom right list
      </Action>
    </Row>
  );
};

const VariantButtons = () => {
  const { toast } = useShow();

  return (
    <Row>
      {VARIANTS.map((variant) => (
        <Action
          key={variant}
          onClick={() => {
            toast[variant === "dangerSolid" ? "danger" : "success"](
              `${variant} toast`,
              {
                description: "Short example text.",
                primaryAction: { label: "Open", onClick: noop },
                secondaryAction: { label: "Dismiss", onClick: noop },
                variant,
              }
            );
          }}
        >
          {variant}
        </Action>
      ))}
    </Row>
  );
};

const AnchorDemo = () => {
  const { toast } = useShow();

  return (
    <div className="flex flex-col gap-3">
      <ToastContentAnchor
        className="w-full max-w-md rounded-xl border border-border p-4 text-center"
        data-testid="content-anchor"
      >
        Content column
      </ToastContentAnchor>
      <Row>
        <Action
          onClick={() => {
            toast.success("Centered over the content column", {
              actionPlacement: "inline",
              position: "top-center-content",
              primaryAction: { label: "Open", onClick: noop },
              variant: "successSolid",
            });
          }}
        >
          top-center-content
        </Action>
      </Row>
    </div>
  );
};

const SonnerDemo = () => (
  <div className="flex flex-col gap-3">
    <SonnerToaster closeButton position="bottom-left" richColors />
    <Row>
      <Action
        onClick={() => {
          sonnerToast.success("Styled success", {
            description: "Vendored helper.",
          });
        }}
      >
        Sonner success
      </Action>
      <Action
        onClick={() => {
          sonnerToast.error("Styled error");
        }}
      >
        Sonner error
      </Action>
      <Action
        onClick={() => {
          sonnerToast.loading("Styled loading", { duration: 3000 });
        }}
      >
        Sonner loading
      </Action>
      <Action
        onClick={() => {
          sonnerToast.promise(
            // oxlint-disable-next-line promise/avoid-new -- A timer promise stands in for a request.
            new Promise((resolve) => {
              setTimeout(resolve, 1500);
            }),
            {
              error: "Failed",
              loading: "Working",
              success: "Done",
            }
          );
        }}
      >
        Sonner promise
      </Action>
      <Action
        onClick={() => {
          sonnerToast.message("Styled message", {
            action: { label: "Act", onClick: noop },
            cancel: { label: "Cancel", onClick: noop },
          });
        }}
      >
        Sonner action and cancel
      </Action>
      <Action
        onClick={() => {
          sonnerToast.dismiss();
        }}
      >
        Sonner dismiss all
      </Action>
    </Row>
  </div>
);

const PanelBody = ({ label }: { label: string }) => {
  const { toast } = useShow();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{label}</p>
      <Row>
        <Action
          onClick={() => {
            toast.info(`${label}: info`, {
              description: "Short example text.",
              primaryAction: { label: "Undo", onClick: noop },
            });
          }}
        >
          Show info
        </Action>
        <Action
          onClick={() => {
            toast.danger(`${label}: danger`, { duration: 0 });
          }}
        >
          Show danger
        </Action>
        <Action
          onClick={() => {
            toast.closeAll();
          }}
        >
          Close all
        </Action>
      </Row>
      <Samples />
    </div>
  );
};

type Scheme = "dark" | "light";

/** A theme scope with its own provider, so live toasts follow the panel theme. */
const ThemePanel = ({
  children,
  dir,
  scheme,
  testId,
}: {
  children: (label: string) => ReactNode;
  dir?: "ltr" | "rtl";
  scheme: Scheme | undefined;
  testId: string;
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      className={cn(
        scheme,
        "relative flex min-h-80 flex-col gap-4 rounded-2xl border border-border bg-background p-4 text-foreground"
      )}
      data-testid={testId}
      dir={dir}
      lang={dir === "rtl" ? "ar" : undefined}
      ref={setContainer}
    >
      {container === null ? null : (
        <ToastProvider container={container} dir={dir}>
          {children(testId)}
        </ToastProvider>
      )}
    </div>
  );
};

const NestedPanels = () => (
  <div className="flex flex-col gap-4">
    <ThemePanel scheme="dark" testId="dark-panel">
      {(label) => (
        <>
          <PanelBody label={label} />
          <ThemePanel scheme="light" testId="light-in-dark-panel">
            {(inner) => <PanelBody label={inner} />}
          </ThemePanel>
        </>
      )}
    </ThemePanel>
    <ThemePanel scheme="light" testId="light-panel">
      {(label) => (
        <>
          <PanelBody label={label} />
          <ThemePanel scheme="dark" testId="dark-in-light-panel">
            {(inner) => <PanelBody label={inner} />}
          </ThemePanel>
        </>
      )}
    </ThemePanel>
  </div>
);

/** Toasts made outside React hooks through the module state. */
const GlobalManagerDemo = () => {
  const bound = useRef<ToastHandle | null>(null);

  return (
    <Row>
      <Action
        onClick={() => {
          getActiveToastManager().info("Shown through the active manager");
        }}
      >
        Active manager
      </Action>
      <Action
        onClick={() => {
          bound.current?.close();
          bound.current = showToastOnBoundManager({
            content: renderCustomContent,
            duration: 0,
            level: "info",
          });
        }}
      >
        Bound manager custom toast
      </Action>
      <Action
        onClick={() => {
          bound.current?.close();
          bound.current = null;
        }}
      >
        Close bound toast
      </Action>
    </Row>
  );
};

const ScopedButtons = () => {
  const toast = useToast();

  return (
    <Action
      onClick={() => {
        toast.info("Scoped provider toast", { duration: 0 });
      }}
    >
      Show persistent toast
    </Action>
  );
};

/** `closeAll` runs when a provider unmounts. */
const ScopedProviderDemo = () => {
  const [mounted, setMounted] = useState(true);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Row>
        <Action
          onClick={() => {
            setMounted((current) => !current);
          }}
        >
          {mounted ? "Unmount provider" : "Mount provider"}
        </Action>
      </Row>
      <div
        className="relative flex min-h-40 flex-col gap-3 rounded-2xl border border-border p-4"
        data-testid="scoped-provider"
        ref={setContainer}
      >
        {mounted && container !== null ? (
          <ToastProvider container={container}>
            <ScopedButtons />
          </ToastProvider>
        ) : (
          <p className="text-sm text-text-muted">Provider unmounted</p>
        )}
      </div>
    </div>
  );
};

/** Without a provider the default manager does nothing. */
const NoProviderDemo = () => {
  const toast = useToast();
  const [message, setMessage] = useState("");

  return (
    <Row>
      <Action
        onClick={() => {
          toast.info("Never shown").close();
          setMessage(
            "The default manager returned a handle and showed nothing."
          );
        }}
      >
        Toast without a provider
      </Action>
      <output className="self-center text-sm text-text-muted">{message}</output>
    </Row>
  );
};

const Main = () => (
  <div className="flex flex-col gap-8">
    <Group title="Levels">
      <LevelButtons />
    </Group>
    <Group title="Variants">
      <VariantButtons />
    </Group>
    <Group title="Options">
      <OptionButtons />
    </Group>
    <Group title="Top-center-content position">
      <AnchorDemo />
    </Group>
    <Group title="Vendored Sonner helpers (styled)">
      <SonnerDemo />
    </Group>
    <Group title="Global manager">
      <GlobalManagerDemo />
      <ScopedProviderDemo />
    </Group>
    <Group title="Toast content">
      <Samples />
    </Group>
    <Group title="Nested theme panels">
      <NestedPanels />
    </Group>
    <Group title="Right to left">
      <ThemePanel dir="rtl" scheme={undefined} testId="rtl-panel">
        {(label) => <PanelBody label={label} />}
      </ThemePanel>
    </Group>
  </div>
);

export const ToastGalleryExample = ({
  withProvider = true,
}: {
  withProvider?: boolean;
}) => (
  <section
    className={cn(
      "flex flex-col gap-6",
      withProvider && "mx-auto w-full max-w-5xl p-6"
    )}
    data-testid="toast-gallery"
  >
    <header className="flex flex-wrap items-center gap-4">
      {withProvider ? <Link href="/gallery">Back to gallery</Link> : null}
      <h2 className="text-lg font-medium">Toast</h2>
      {withProvider ? <AppearanceControl id="toast-appearance" /> : null}
    </header>
    <p className="text-sm text-text-muted">
      Press Alt+T to expand the stack and focus the list, and Escape to collapse
      it.
    </p>
    {withProvider ? (
      <>
        <ToastProvider>
          <Main />
        </ToastProvider>
        <Group title="No provider">
          <NoProviderDemo />
        </Group>
      </>
    ) : (
      <Main />
    )}
  </section>
);
