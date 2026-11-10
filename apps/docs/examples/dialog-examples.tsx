"use client";

/* oxlint-disable shadcn/no-arbitrary-values, shadcn/no-restyle -- The gallery draws measured frames. */

import {
  DialogFrame,
  DialogLayout,
  DialogShell,
  ModalDialog,
  ScrollFade,
} from "composerkit/components/dialog/dialog-layout";
import {
  Modal,
  useModalRequestClose,
} from "composerkit/components/dialog/modal";
import { Button } from "composerkit/components/ui/button";
import {
  Dialog,
  DialogBackdropStyleProvider,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFieldStack,
  DialogFooter,
  DialogFormRow,
  DialogHeader,
  DialogSection,
  DialogTitle,
  DialogZoomProvider,
} from "composerkit/components/ui/dialog";
import type {
  DialogBackdropKind,
  DialogCloseButtonSize,
  DialogCloseButtonVariant,
  DialogContentPosition,
  DialogRadius,
  DialogSize,
  DialogVariant,
} from "composerkit/components/ui/dialog";
import { cn } from "composerkit/lib/utils";
import Link from "next/link";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

/* ------------------------------------------------------------- the log --- */

const LogContext = createContext<(message: string) => void>(() => {
  /* No log outside the gallery. */
});

const useLog = () => useContext(LogContext);

/* ------------------------------------------------------------ helpers --- */

const NEUTRAL_TITLE = "Delete item?";
const NEUTRAL_BODY = "This action cannot be undone.";

const Panel = ({
  children,
  id,
  title,
  note,
}: {
  children: ReactNode;
  id: string;
  note?: string;
  title: string;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="flex flex-col gap-3"
    id={id}
  >
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {note === undefined ? null : (
      <p className="text-sm text-muted-foreground">{note}</p>
    )}
    {children}
  </section>
);

const Select = <T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) => (
  <label className="flex flex-col gap-1 text-sm">
    {label}
    <select
      className="h-8 rounded-md border border-border bg-background px-2"
      value={value}
      onChange={(event) => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion -- SAFETY: the options of this select are the values of T.
        onChange(event.target.value as T);
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const Toggle = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center gap-2 text-sm">
    <input
      checked={checked}
      type="checkbox"
      onChange={(event) => {
        onChange(event.target.checked);
      }}
    />
    {label}
  </label>
);

/* -------------------------------------------------------------- data --- */

const variants = [
  "default",
  "opaque",
  "translucent",
  "sectioned",
  "sectionedConfirmation",
  "photoSetup",
  "beacon",
  "beaconModal",
  "expressiveBeacon",
  "voicePicker",
  "onboarding",
  "mediaDetail",
  "detailPanel",
  "promotional",
  "form",
  "catalog",
  "centeredText",
  "confirmation",
  "creditCheckout",
  "image",
] as const satisfies readonly DialogVariant[];

const sizes = [
  "default",
  "pinEntry",
  "large",
  "narrow",
  "feature",
  "setup",
  "catalogDetail",
  "beacon",
  "compact",
  "medium",
  "wide",
  "wideTall",
  "share",
  "feedback",
  "xwide",
  "xwideTall",
  "xxwide",
  "xxxwideTall",
  "editor",
  "appLauncher",
  "square",
  "sheet",
  "splitCatalog",
  "catalogSetup",
  "responsiveSheet",
  "edgeToEdgeSheet",
] as const satisfies readonly DialogSize[];

const positions = [
  "centered",
  "top",
  "scrollable",
  "anchored",
  "inline",
] as const satisfies readonly DialogContentPosition[];

const closeSizes = [
  "default",
  "compact",
  "large",
] as const satisfies readonly DialogCloseButtonSize[];

const closeVariants = [
  "default",
  "mediaOverlay",
] as const satisfies readonly DialogCloseButtonVariant[];

const radii = ["default", "compact"] as const satisfies readonly DialogRadius[];

const backdrops = ["variant", "modal", "soft"] as const satisfies readonly (
  | "variant"
  | DialogBackdropKind
)[];

/* ------------------------------------------------- a configurable dialog --- */

interface DemoConfig {
  animateHeight: boolean;
  autoFocusCloseButton: boolean;
  backdrop: (typeof backdrops)[number];
  /** The `backdropStyle` setting that `backdrop="modal"` reads. */
  backdropStyle: "dim" | "fade";
  closeButtonSize: DialogCloseButtonSize;
  closeButtonVariant: DialogCloseButtonVariant;
  contentOverflow: "hidden" | "visible";
  contentPosition: DialogContentPosition;
  longBody: boolean;
  modal: boolean;
  radius: DialogRadius;
  shouldIgnoreClickOutside: boolean;
  showDialogClose: boolean;
  size: DialogSize;
  variant: DialogVariant;
}

const defaultConfig: DemoConfig = {
  animateHeight: true,
  autoFocusCloseButton: false,
  backdrop: "variant",
  backdropStyle: "dim",
  closeButtonSize: "default",
  closeButtonVariant: "default",
  contentOverflow: "hidden",
  contentPosition: "centered",
  longBody: false,
  modal: true,
  radius: "default",
  shouldIgnoreClickOutside: false,
  showDialogClose: true,
  size: "default",
  variant: "default",
};

const paragraphs = Array.from(
  { length: 18 },
  (_, index) => `Line ${index + 1} of a long body.`
);

/** The body of a configurable demo: a header, optional long text and a footer. */
const DemoBody = ({ config }: { config: DemoConfig }) => {
  const confirmation = config.variant === "confirmation";
  const checkout = config.variant === "creditCheckout";
  const quiet = config.variant === "sectionedConfirmation";

  let bodyVariant:
    | "sectionedConfirmation"
    | "checkoutConfirmation"
    | "default" = "default";

  if (checkout) {
    bodyVariant = "checkoutConfirmation";
  } else if (quiet) {
    bodyVariant = "sectionedConfirmation";
  }

  if (config.variant === "image") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-panel-secondary text-sm">
        An image fills the frame.
      </div>
    );
  }

  if (confirmation) {
    return (
      <DialogBody variant="confirmation">
        <div className="flex flex-col gap-2">
          <DialogTitle variant="confirmation">{NEUTRAL_TITLE}</DialogTitle>
          <DialogDescription className="px-6 text-center text-text-subtle">
            {NEUTRAL_BODY}
          </DialogDescription>
        </div>
        <DialogFooter>
          <DialogClose render={<Button color="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button color="danger" />}>Delete</DialogClose>
        </DialogFooter>
      </DialogBody>
    );
  }

  return (
    <DialogBody variant={bodyVariant}>
      <DialogSection>
        <DialogHeader
          subtitle={
            <DialogDescription className="contents">
              {NEUTRAL_BODY}
            </DialogDescription>
          }
          title={
            <DialogTitle className="contents" variant={config.variant}>
              {NEUTRAL_TITLE}
            </DialogTitle>
          }
          variant={quiet ? "sectionedConfirmation" : "default"}
        />
      </DialogSection>
      {config.longBody ? (
        <DialogSection>
          {paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </DialogSection>
      ) : null}
      <DialogSection spacing="large">
        <DialogFooter variant={quiet ? "sectionedConfirmation" : "default"}>
          <DialogClose render={<Button color="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button color="danger" />}>Delete</DialogClose>
        </DialogFooter>
      </DialogSection>
    </DialogBody>
  );
};

const ConfiguredDialog = ({
  config,
  label,
  portalContainer,
}: {
  config: DemoConfig;
  label: string;
  portalContainer?: HTMLElement | null;
}) => {
  const log = useLog();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        color="outline"
        size="dialog"
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <DialogBackdropStyleProvider value={config.backdropStyle}>
        <Dialog
          className={
            config.contentPosition === "anchored"
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              : undefined
          }
          animateHeight={config.animateHeight}
          autoFocusCloseButton={config.autoFocusCloseButton}
          backdrop={config.backdrop === "variant" ? undefined : config.backdrop}
          closeButtonSize={config.closeButtonSize}
          closeButtonVariant={config.closeButtonVariant}
          contentOverflow={config.contentOverflow}
          contentPosition={config.contentPosition}
          modal={config.modal}
          open={open}
          portalContainer={portalContainer}
          radius={config.radius}
          shouldIgnoreClickOutside={config.shouldIgnoreClickOutside}
          showDialogClose={config.showDialogClose}
          size={config.size}
          variant={config.variant}
          onOpenChange={(next) => {
            log(`${label}: onOpenChange(${next})`);
            setOpen(next);
          }}
        >
          <DemoBody config={config} />
        </Dialog>
      </DialogBackdropStyleProvider>
    </>
  );
};

/* --------------------------------------------------------- variants --- */

const variantPresets: readonly {
  config: Partial<DemoConfig>;
  label: string;
}[] = [
  { config: { variant: "default" }, label: "default" },
  { config: { variant: "opaque" }, label: "opaque" },
  { config: { variant: "translucent" }, label: "translucent" },
  {
    config: { contentPosition: "anchored", variant: "sectioned" },
    label: "sectioned anchored",
  },
  { config: { variant: "sectioned" }, label: "sectioned" },
  {
    config: { variant: "sectionedConfirmation" },
    label: "sectionedConfirmation",
  },
  { config: { variant: "photoSetup" }, label: "photoSetup" },
  { config: { size: "beacon", variant: "beacon" }, label: "beacon" },
  { config: { size: "beacon", variant: "beaconModal" }, label: "beaconModal" },
  {
    config: { size: "beacon", variant: "expressiveBeacon" },
    label: "expressiveBeacon",
  },
  { config: { variant: "voicePicker" }, label: "voicePicker" },
  { config: { variant: "onboarding" }, label: "onboarding" },
  { config: { variant: "mediaDetail" }, label: "mediaDetail" },
  { config: { size: "wide", variant: "detailPanel" }, label: "detailPanel" },
  { config: { variant: "promotional" }, label: "promotional" },
  {
    config: { size: "responsiveSheet", variant: "promotional" },
    label: "promotional sheet",
  },
  { config: { variant: "form" }, label: "form" },
  { config: { variant: "catalog" }, label: "catalog" },
  {
    config: { radius: "compact", variant: "catalog" },
    label: "catalog compact",
  },
  { config: { variant: "centeredText" }, label: "centeredText" },
  { config: { variant: "confirmation" }, label: "confirmation" },
  { config: { variant: "creditCheckout" }, label: "creditCheckout" },
  { config: { variant: "image" }, label: "image" },
  {
    config: { size: "splitCatalog", variant: "sectioned" },
    label: "splitCatalog",
  },
  {
    config: { size: "catalogSetup", variant: "sectioned" },
    label: "catalogSetup",
  },
  {
    config: { size: "edgeToEdgeSheet", variant: "beacon" },
    label: "edgeToEdgeSheet",
  },
  { config: { size: "sheet", variant: "sectioned" }, label: "sheet" },
];

const VariantsExample = () => (
  <Panel
    id="variants"
    note="Each button opens the dialog with that variant. Escape, the close button or a press on the overlay closes it."
    title="Variants"
  >
    <div className="flex flex-wrap gap-2">
      {variantPresets.map((preset) => (
        <ConfiguredDialog
          config={{ ...defaultConfig, ...preset.config }}
          key={preset.label}
          label={`Open ${preset.label}`}
        />
      ))}
    </div>
  </Panel>
);

const SizesExample = () => (
  <Panel
    id="sizes"
    note="One dialog per size preset, all with the opaque variant."
    title="Sizes"
  >
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => (
        <ConfiguredDialog
          config={{ ...defaultConfig, size, variant: "opaque" }}
          key={size}
          label={`Size ${size}`}
        />
      ))}
    </div>
  </Panel>
);

/**
 * A native click listener that stops the event, as a third-party widget
 * might. React's own listener sits on the document in this app, so only a
 * listener on the element itself keeps the click from the document.
 */
const stopEvent = (event: Event) => {
  event.stopPropagation();
};

const stopClickPropagation = (element: HTMLElement | null) => {
  element?.addEventListener("click", stopEvent);

  return () => {
    element?.removeEventListener("click", stopEvent);
  };
};

const Playground = () => {
  const [config, setConfig] = useState(defaultConfig);

  const set = <K extends keyof DemoConfig>(key: K, value: DemoConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  return (
    <Panel
      id="playground"
      note="Every option of the dialog frame. Position anchored and scrollable apply to any variant."
      title="Playground"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Variant"
          options={variants}
          value={config.variant}
          onChange={(value) => {
            set("variant", value);
          }}
        />
        <Select
          label="Size"
          options={sizes}
          value={config.size}
          onChange={(value) => {
            set("size", value);
          }}
        />
        <Select
          label="Position"
          options={positions}
          value={config.contentPosition}
          onChange={(value) => {
            set("contentPosition", value);
          }}
        />
        <Select
          label="Close button size"
          options={closeSizes}
          value={config.closeButtonSize}
          onChange={(value) => {
            set("closeButtonSize", value);
          }}
        />
        <Select
          label="Close button variant"
          options={closeVariants}
          value={config.closeButtonVariant}
          onChange={(value) => {
            set("closeButtonVariant", value);
          }}
        />
        <Select
          label="Radius"
          options={radii}
          value={config.radius}
          onChange={(value) => {
            set("radius", value);
          }}
        />
        <Select
          label="Backdrop"
          options={backdrops}
          value={config.backdrop}
          onChange={(value) => {
            set("backdrop", value);
          }}
        />
        <Select
          label="Backdrop style setting"
          options={["dim", "fade"] as const}
          value={config.backdropStyle}
          onChange={(value) => {
            set("backdropStyle", value);
          }}
        />
        <Select
          label="Overflow"
          options={["hidden", "visible"] as const}
          value={config.contentOverflow}
          onChange={(value) => {
            set("contentOverflow", value);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <Toggle
          checked={config.modal}
          label="Modal"
          onChange={(value) => {
            set("modal", value);
          }}
        />
        <Toggle
          checked={config.showDialogClose}
          label="Close button"
          onChange={(value) => {
            set("showDialogClose", value);
          }}
        />
        <Toggle
          checked={config.autoFocusCloseButton}
          label="Focus the close button"
          onChange={(value) => {
            set("autoFocusCloseButton", value);
          }}
        />
        <Toggle
          checked={config.shouldIgnoreClickOutside}
          label="Ignore presses outside"
          onChange={(value) => {
            set("shouldIgnoreClickOutside", value);
          }}
        />
        <Toggle
          checked={config.animateHeight}
          label="Animate height"
          onChange={(value) => {
            set("animateHeight", value);
          }}
        />
        <Toggle
          checked={config.longBody}
          label="Long body"
          onChange={(value) => {
            set("longBody", value);
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ConfiguredDialog config={config} label="Open playground dialog" />
        <Button color="outline" ref={stopClickPropagation} size="dialog">
          Press that stops propagation
        </Button>
      </div>
    </Panel>
  );
};

/* -------------------------------------------------------------- slots --- */

const bodySizes = [
  "scrollable",
  "viewport",
  "topPositioned",
  "full",
  "tall",
] as const;

const BodySizes = () => (
  <div className="grid gap-3 md:grid-cols-5">
    {bodySizes.map((size) => (
      <div
        className="flex h-40 flex-col overflow-hidden rounded-xl bg-panel-elevated-secondary"
        key={size}
      >
        <DialogBody size={size}>
          <p>Body size {size}</p>
          <p>{NEUTRAL_BODY}</p>
        </DialogBody>
      </div>
    ))}
  </div>
);

const SlotsExample = () => (
  <Panel
    id="slots"
    note="Header, body, section, footer, form row and field stack drawn outside a dialog."
    title="Slots"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-2xl bg-panel-elevated-secondary p-5">
        <DialogHeader
          icon={<span aria-hidden="true">i</span>}
          subtitle="Subtitle in the tertiary tone."
          title="Header with an icon"
        />
        <DialogHeader
          icon={<span aria-hidden="true">i</span>}
          iconVariant="outlinedCircle"
          subtitle="The outlined circle widens the gap."
          title="Outlined circle"
        />
        <DialogHeader
          icon={<span aria-hidden="true">i</span>}
          iconLoading
          subtitle="The icon shows a spinner ring."
          title="Loading icon"
        />
        <DialogHeader
          subtitle="Secondary tone, small."
          subtitleSize="sm"
          subtitleTone="secondary"
          title="Title size lg"
          titleSize="lg"
        />
        <DialogHeader
          subtitle="Default tone."
          subtitleTone="default"
          title="Title size base"
          titleSize="base"
        />
        <DialogHeader title="Title size sm" titleSize="sm" />
        <DialogHeader
          subtitle="Used by sectionedConfirmation."
          title="Confirmation header"
          variant="sectionedConfirmation"
        />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-panel-elevated-secondary">
        <DialogBody>
          <DialogSection>
            <DialogFieldStack>
              <label htmlFor="slot-name">Name</label>
              <DialogFormRow>
                <input
                  className="h-8 flex-1 rounded-md border border-border bg-background px-2"
                  id="slot-name"
                  placeholder="Name"
                />
                <Button color="outline">Check</Button>
              </DialogFormRow>
            </DialogFieldStack>
          </DialogSection>
          <DialogSection>
            <p>A section after the first has 12px of padding above.</p>
          </DialogSection>
          <DialogSection spacing="large">
            <p>A large section has 20px.</p>
          </DialogSection>
          <DialogSection spacing="large">
            <DialogFooter>
              <Button>Only button</Button>
            </DialogFooter>
          </DialogSection>
          <DialogSection>
            <DialogFooter>
              <Button color="outline">Cancel</Button>
              <Button>Save</Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </div>
    </div>
    <BodySizes />
  </Panel>
);

/* ---------------------------------------------------------- behaviour --- */

const FocusAndDismiss = () => {
  const log = useLog();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm" id="selectable-text">
        Select this sentence, then open the dialog: the selection is cleared.
      </p>
      <div>
        <Dialog
          size="compact"
          triggerContent={<Button color="outline">Open with a trigger</Button>}
          onOpenChange={(open) => {
            log(`Trigger dialog: onOpenChange(${open})`);
          }}
        >
          <DialogBody>
            <DialogHeader
              subtitle={
                <DialogDescription className="contents">
                  Focus moves to the first field. Close it and focus returns to
                  the trigger.
                </DialogDescription>
              }
              title={<DialogTitle className="contents">Rename</DialogTitle>}
            />
            <DialogSection spacing="large">
              <DialogFieldStack>
                <label htmlFor="rename-name">Name</label>
                <input
                  className="h-8 rounded-md border border-border bg-background px-2"
                  defaultValue="Untitled"
                  id="rename-name"
                />
              </DialogFieldStack>
            </DialogSection>
            <DialogSection spacing="large">
              <DialogFooter>
                <DialogClose render={<Button color="outline" />}>
                  Cancel
                </DialogClose>
                <DialogClose render={<Button />}>Save</DialogClose>
              </DialogFooter>
            </DialogSection>
          </DialogBody>
        </Dialog>
      </div>
    </div>
  );
};

const NestedDialogs = () => {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  const log = useLog();

  return (
    <div>
      <Button
        color="outline"
        onClick={() => {
          setOuter(true);
        }}
      >
        Open nested dialogs
      </Button>
      <Dialog
        open={outer}
        size="compact"
        onOpenChange={(next) => {
          log(`Outer: onOpenChange(${next})`);
          setOuter(next);
        }}
      >
        <DialogBody>
          <DialogHeader
            title={<DialogTitle className="contents">Outer dialog</DialogTitle>}
          />
          <DialogSection spacing="large">
            <Button
              onClick={() => {
                setInner(true);
              }}
            >
              Open the inner dialog
            </Button>
          </DialogSection>
        </DialogBody>
      </Dialog>
      <Dialog
        open={inner}
        size="narrow"
        onOpenChange={(next) => {
          log(`Inner: onOpenChange(${next})`);
          setInner(next);
        }}
      >
        <DialogBody>
          <DialogHeader
            title={<DialogTitle className="contents">Inner dialog</DialogTitle>}
          />
          <DialogSection>
            <p>Escape closes this one first.</p>
          </DialogSection>
        </DialogBody>
      </Dialog>
    </div>
  );
};

const HeightExample = () => {
  const [rows, setRows] = useState(2);

  return (
    <div>
      <Dialog
        size="compact"
        triggerContent={<Button color="outline">Open a growing dialog</Button>}
      >
        <DialogBody>
          <DialogHeader
            title={<DialogTitle className="contents">Rows</DialogTitle>}
          />
          <DialogSection spacing="large">
            {Array.from({ length: rows }, (_, index) => (
              <p key={`row-${index + 1}`}>Row {index + 1}</p>
            ))}
          </DialogSection>
          <DialogSection spacing="large">
            <DialogFooter expandSingleButton={false}>
              <Button
                color="outline"
                onClick={() => {
                  setRows((count) => Math.max(1, count - 1));
                }}
              >
                Remove a row
              </Button>
              <Button
                onClick={() => {
                  setRows((count) => count + 1);
                }}
              >
                Add a row
              </Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </Dialog>
    </div>
  );
};

const LockedShell = () => {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(true);
  const log = useLog();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toggle
        checked={locked}
        label="Dismissal disabled"
        onChange={setLocked}
      />
      <Button
        color="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open the shell dialog
      </Button>
      {open ? (
        <DialogShell
          footer={
            <Button
              disabled={false}
              onClick={() => {
                setLocked(false);
              }}
            >
              Unlock
            </Button>
          }
          isDismissalDisabled={locked}
          size="compact"
          subtitle={
            locked
              ? "Escape, outside presses and the close button do nothing."
              : "Unlocked: every way to close works."
          }
          title="Saving"
          onClose={() => {
            log("Shell: onClose");
            setOpen(false);
          }}
        >
          <p>{NEUTRAL_BODY}</p>
        </DialogShell>
      ) : null}
    </div>
  );
};

const FormError = () => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  return (
    <div>
      <Button
        color="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open a form with an error
      </Button>
      <Dialog open={open} size="compact" variant="form" onOpenChange={setOpen}>
        <DialogBody
          as="form"
          onSubmit={(event) => {
            event.preventDefault();

            if (value.trim() === "") {
              setError(true);

              return;
            }

            setError(false);
            setOpen(false);
          }}
        >
          <DialogHeader
            title={<DialogTitle className="contents">Rename</DialogTitle>}
          />
          <DialogSection spacing="large">
            <DialogFieldStack>
              <label htmlFor="error-name">Name</label>
              <input
                aria-describedby={error ? "error-name-message" : undefined}
                aria-invalid={error}
                className="h-8 rounded-md border border-border bg-background px-2"
                id="error-name"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                }}
              />
              {error ? (
                <p id="error-name-message" role="alert">
                  Enter a name.
                </p>
              ) : null}
            </DialogFieldStack>
          </DialogSection>
          <DialogSection spacing="large">
            <DialogFooter>
              <DialogClose render={<Button color="outline" />}>
                Cancel
              </DialogClose>
              <Button disabled={false} type="submit">
                Save
              </Button>
              <Button disabled>Unavailable</Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </Dialog>
    </div>
  );
};

const DebugToggle = () => {
  const [on, setOn] = useState(false);

  return (
    <Toggle
      checked={on}
      label='Outline the layout parts (sets localStorage "composerkit.debug.dialogLayout")'
      onChange={(next) => {
        setOn(next);

        if (next) {
          window.localStorage.setItem("composerkit.debug.dialogLayout", "1");
        } else {
          window.localStorage.removeItem("composerkit.debug.dialogLayout");
        }

        // The storage event is how the dialog parts learn that the flag changed in this tab.
        window.dispatchEvent(
          new StorageEvent("storage", { key: "composerkit.debug.dialogLayout" })
        );
      }}
    />
  );
};

const BehaviourExample = () => (
  <Panel
    id="behaviour"
    note="Focus, dismissal, nested layers, height animation, locked dismissal and a form with an error and a disabled button."
    title="Behaviour"
  >
    <FocusAndDismiss />
    <NestedDialogs />
    <HeightExample />
    <LockedShell />
    <FormError />
    <DebugToggle />
  </Panel>
);

/* ---------------------------------------------------------- the Modal --- */

const ModalContents = ({
  backdrop,
  guarded,
  scroll,
  visuallyHidden,
}: {
  backdrop: "dim" | "fade";
  guarded: boolean;
  scroll: "inside" | "outside";
  visuallyHidden: boolean;
}) => {
  const [dirty, setDirty] = useState(true);

  const { close, shake } = useModalRequestClose({
    onRequestClose: () => {
      if (guarded && dirty) {
        shake();

        return "deny";
      }

      return "allow";
    },
  });

  return (
    <Modal.Form
      onSubmit={(event) => {
        event.preventDefault();
        setDirty(false);
        close();
      }}
    >
      <Modal.Header>
        <Modal.Title>Rename</Modal.Title>
        <Button
          aria-label="Close modal"
          color="ghost"
          size="compact"
          type="button"
          onClick={() => {
            close();
          }}
        >
          x
        </Button>
      </Modal.Header>
      <Modal.Body>
        <Modal.Description visuallyHidden={visuallyHidden}>
          {backdrop === "fade" ? "Fade backdrop." : "Dim backdrop."} Scroll{" "}
          {scroll}.
        </Modal.Description>
        <label htmlFor="modal-name">Name</label>
        <input
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2"
          id="modal-name"
          onChange={() => {
            setDirty(true);
          }}
        />
        {paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close>
          <Button color="outline" type="button">
            Cancel
          </Button>
        </Modal.Close>
        <Button type="submit">Save</Button>
      </Modal.Footer>
    </Modal.Form>
  );
};

/**
 * Page elements from other libraries that the Modal never treats as outside
 * presses: a Grammarly shadow root, a 1Password button, a
 * sonner toast and toaster, and anything marked
 * `data-modal-outside-exempt`. They sit above the Modal backdrop,
 * as the real ones do, so they can be pressed while the Modal is open.
 */
const PageElementsAboveBackdrop = () => {
  const log = useLog();

  const attachShadowButton = useCallback((host: HTMLElement | null) => {
    if (!host || host.shadowRoot) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Grammarly shadow root";
    host.attachShadow({ mode: "open" }).append(button);
  }, []);

  const chip = "rounded-md bg-panel px-3 py-1.5 text-sm shadow-md";

  return (
    <div className="fixed right-4 bottom-4 z-[100] flex flex-col items-end gap-2">
      {createElement("grammarly-desktop-integration", {
        className: chip,
        "data-ck-grammarly-shadow-root": "true",
        onClick: () => {
          log("Pressed the Grammarly shadow root");
        },
        ref: attachShadowButton,
      })}
      {createElement(
        "com-1password-button",
        {
          className: chip,
          onClick: () => {
            log("Pressed the 1Password button");
          },
          role: "button",
          tabIndex: 0,
        },
        "1Password button"
      )}
      <div data-sonner-toaster="true">
        <button
          className={chip}
          data-sonner-toast="true"
          type="button"
          onClick={() => {
            log("Pressed the sonner toast");
          }}
        >
          Sonner toast
        </button>
      </div>
      <button
        className={chip}
        data-modal-outside-exempt="true"
        type="button"
        onClick={() => {
          log("Pressed the puik-ignored element");
        }}
      >
        Puik-ignored element
      </button>
    </div>
  );
};

const ModalExample = () => {
  const log = useLog();
  const [pageElements, setPageElements] = useState(false);
  const [backdrop, setBackdrop] = useState<"dim" | "fade">("dim");
  const [scroll, setScroll] = useState<"inside" | "outside">("inside");
  const [guarded, setGuarded] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <Panel
      id="modal"
      note="The Modal compound. With the guard on, Escape and presses outside are denied while the form has changes, and the modal shakes."
      title="Modal"
    >
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Backdrop"
          options={["dim", "fade"] as const}
          value={backdrop}
          onChange={setBackdrop}
        />
        <Select
          label="Scroll"
          options={["inside", "outside"] as const}
          value={scroll}
          onChange={setScroll}
        />
        <Toggle
          checked={guarded}
          label="Guard unsaved changes"
          onChange={setGuarded}
        />
        <Toggle
          checked={hidden}
          label="Hide the description"
          onChange={setHidden}
        />
        <Toggle
          checked={pageElements}
          label="Show page elements above the backdrop"
          onChange={setPageElements}
        />
      </div>
      {pageElements ? <PageElementsAboveBackdrop /> : null}
      <div>
        <Modal
          open={open}
          onOpenChange={(next) => {
            log(`Modal: onOpenChange(${next})`);
            setOpen(next);
          }}
        >
          <Modal.Trigger>
            <Button color="outline">Open the modal</Button>
          </Modal.Trigger>
          <Modal.Content
            animateOnMount
            backdrop={backdrop}
            maxWidth={480}
            scroll={scroll}
            onAfterClose={() => {
              log("Modal: onAfterClose");
            }}
          >
            <ModalContents
              backdrop={backdrop}
              guarded={guarded}
              scroll={scroll}
              visuallyHidden={hidden}
            />
          </Modal.Content>
        </Modal>
      </div>
    </Panel>
  );
};

const ModalDialogVariant = ({
  config,
  label,
}: {
  config: Partial<React.ComponentProps<typeof ModalDialog>>;
  label: string;
}) => {
  const [open, setOpen] = useState(false);
  const log = useLog();

  return (
    <>
      <Button
        color="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {open ? (
        <ModalDialog
          title="Share"
          onClose={() => {
            log(`${label}: onClose`);
            setOpen(false);
          }}
          {...config}
        />
      ) : null}
    </>
  );
};

const ModalDialogExample = () => (
  <Panel
    id="modal-dialog"
    note="The Modal-based dialog with its own header, close button and footer."
    title="Modal dialog"
  >
    <div className="flex flex-wrap gap-2">
      <ModalDialogVariant
        config={{
          children: <p>{NEUTRAL_BODY}</p>,
          footer: <Button>Done</Button>,
          subtitle: "Sectioned layout.",
        }}
        label="Sectioned"
      />
      <ModalDialogVariant
        config={{
          children: <p>{NEUTRAL_BODY}</p>,
          footer: <Button>Done</Button>,
          subtitle: "Default layout.",
          variant: "default",
        }}
        label="Default"
      />
      <ModalDialogVariant
        config={{
          children: <p>{NEUTRAL_BODY}</p>,
          footer: <Button>Done</Button>,
          subtitle: "Compact layout puts the subtitle under the header.",
          variant: "compact",
        }}
        label="Compact"
      />
      <ModalDialogVariant
        config={{ isLoading: true, subtitle: "Loading footer." }}
        label="Loading"
      />
      <ModalDialogVariant
        config={{
          children: <p>{NEUTRAL_BODY}</p>,
          isDismissalDisabled: true,
          subtitle: "The close button is disabled.",
        }}
        label="Dismissal disabled"
      />
      <ModalDialogVariant
        config={{
          children: <p>{NEUTRAL_BODY}</p>,
          title:
            "A very long title that would be cut off unless it is allowed to wrap onto more lines",
          wrapTitle: true,
        }}
        label="Wrapped title"
      />
      <ModalDialogVariant
        config={{
          children: <p>{NEUTRAL_BODY}</p>,
          headerActions: <Button color="outline">Action</Button>,
          onRequestClose: () => "deny",
          title: "Close is denied",
        }}
        label="Close denied"
      />
      <ModalDialogVariant
        config={{
          children: <p>{NEUTRAL_BODY}</p>,
          onSubmit: () => {
            /* The demo has nothing to submit. */
          },
          preserveTopOnResize: true,
          subtitle: "Submit with Enter.",
        }}
        label="Form submit"
      />
    </div>
  </Panel>
);

/* -------------------------------------------------------- shell/frame --- */

const ShellExample = () => {
  const [open, setOpen] = useState<null | "frame" | "sheet" | "sheet-compact">(
    null
  );

  return (
    <Panel
      id="shell"
      note="The standard shell, its image sheet, and the anchored frame."
      title="Shell, sheet and frame"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          color="outline"
          onClick={() => {
            setOpen("sheet");
          }}
        >
          Open the image sheet
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setOpen("sheet-compact");
          }}
        >
          Open the compact image sheet
        </Button>
        <Button
          color="outline"
          onClick={() => {
            setOpen("frame");
          }}
        >
          Open the anchored frame
        </Button>
      </div>
      {open === "sheet" || open === "sheet-compact" ? (
        <DialogShell
          compactImageSheetFooter={open === "sheet-compact"}
          footer={<Button>Continue</Button>}
          presentation="imageSheet"
          subtitle="A neutral subtitle."
          title="Image sheet"
          onClose={() => {
            setOpen(null);
          }}
        >
          <p className="px-6 text-center">{NEUTRAL_BODY}</p>
        </DialogShell>
      ) : null}
      <DialogFrame
        open={open === "frame"}
        onOpenChange={(next) => {
          setOpen(next ? "frame" : null);
        }}
      >
        <DialogLayout
          footer={
            <DialogClose render={<Button />}>Close the frame</DialogClose>
          }
          header={
            <DialogHeader
              subtitle="Full screen under 768px."
              title={
                <DialogTitle className="contents">Anchored frame</DialogTitle>
              }
            />
          }
        >
          <ScrollFade fade="divider" scrollClassName="max-h-24 overflow-y-auto">
            {paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </ScrollFade>
        </DialogLayout>
      </DialogFrame>
    </Panel>
  );
};

/* ----------------------------------------------------------- themes --- */

const ScopePanel = ({
  dir,
  id,
  inner,
  outer,
  title,
}: {
  dir?: "ltr" | "rtl";
  id: string;
  inner?: "dark" | "light";
  outer: "dark" | "light";
  title: string;
}) => {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const body = (
    <div
      className={cn(
        "relative flex min-h-[420px] flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-background p-4 text-foreground",
        inner
      )}
      dir={dir}
      id={`${id}-host`}
      ref={setHost}
    >
      <p className="text-sm">{title}</p>
      <div>
        <Button
          color="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          Open {id}
        </Button>
      </div>
      <Dialog
        modal={false}
        open={open}
        portalContainer={host}
        size="compact"
        variant="default"
        onOpenChange={setOpen}
      >
        <DialogBody>
          <DialogHeader
            subtitle={
              <DialogDescription className="contents">
                {NEUTRAL_BODY}
              </DialogDescription>
            }
            title={
              <DialogTitle className="contents">{NEUTRAL_TITLE}</DialogTitle>
            }
          />
          <DialogSection spacing="large">
            <DialogFooter>
              <DialogClose render={<Button color="outline" />}>
                Cancel
              </DialogClose>
              <DialogClose render={<Button color="danger" />}>
                Delete
              </DialogClose>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </Dialog>
    </div>
  );

  const scoped = (
    <div className={cn(outer, "rounded-2xl bg-background p-2 text-foreground")}>
      {body}
    </div>
  );

  return scoped;
};

const ZoomExample = () => (
  <div className="flex flex-col gap-2">
    <p className="text-sm">
      Page zoom 1.25: the dialog is drawn with CSS zoom 1.25 (a dialog in a
      portal container is not scaled).
    </p>
    <DialogZoomProvider zoom={1.25}>
      <div>
        <ConfiguredDialog
          config={{ ...defaultConfig, size: "compact", variant: "opaque" }}
          label="Open at zoom 1.25"
        />
      </div>
    </DialogZoomProvider>
  </div>
);

const ThemesExample = () => (
  <Panel
    id="themes"
    note="Each panel sets its own theme scope and holds its dialog (non-modal, so the page stays usable). The nested panels put the opposite theme inside; their dialogs follow the nearest scope."
    title="Light, dark, right to left and zoom"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <ScopePanel id="light-panel" outer="light" title="Light panel" />
      <ScopePanel id="dark-panel" outer="dark" title="Dark panel" />
      <ScopePanel
        id="light-in-dark"
        inner="light"
        outer="dark"
        title="Light panel nested in a dark one"
      />
      <ScopePanel
        id="dark-in-light"
        inner="dark"
        outer="light"
        title="Dark panel nested in a light one"
      />
      <ZoomExample />
      <ScopePanel
        dir="rtl"
        id="rtl-panel"
        outer="light"
        title="Right to left"
      />
    </div>
  </Panel>
);

/* -------------------------------------------------------------- root --- */

const DialogGalleryExample = () => {
  const [entries, setEntries] = useState<string[]>([]);

  const log = useCallback((message: string) => {
    setEntries((current) => [...current.slice(-7), message]);
  }, []);

  return (
    <LogContext value={log}>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
        <header className="flex flex-wrap items-center gap-4">
          <Link className="text-sm underline" href="/gallery">
            Back to gallery
          </Link>
          <h1 className="text-title-lg font-semibold">Dialog</h1>
          <AppearanceControl id="dialog-appearance" />
        </header>
        <section aria-label="Event log" className="text-sm">
          <h2 className="font-semibold">Event log</h2>
          <ol aria-live="polite" className="list-decimal ps-5" id="dialog-log">
            {entries.length === 0 ? (
              <li className="list-none">Nothing yet.</li>
            ) : (
              entries.map((entry, index) => (
                <li key={`${index + 1}-${entry}`}>{entry}</li>
              ))
            )}
          </ol>
        </section>
        <VariantsExample />
        <SizesExample />
        <Playground />
        <SlotsExample />
        <BehaviourExample />
        <ModalExample />
        <ModalDialogExample />
        <ShellExample />
        <ThemesExample />
      </main>
    </LogContext>
  );
};

export { DialogGalleryExample };
