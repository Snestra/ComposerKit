"use client";

import { DataButton } from "@workspace/react/components/button/data-button";
import { DateTime } from "@workspace/react/components/date-picker/date-time";
import {
  Popover,
  PopoverContent,
  usePopoverTrigger,
} from "@workspace/react/components/date-picker/popover";
import { usePopoverContext } from "@workspace/react/components/date-picker/popover-context";
import { SelectControl } from "@workspace/react/components/date-picker/select-control";
import { useIsClient } from "@workspace/react/components/dialog/dialog-layer";
import { PlatformProvider } from "@workspace/react/components/platform-provider";
import { DatePicker } from "@workspace/react/components/ui/date-picker";
import type { DatePickerProps } from "@workspace/react/components/ui/date-picker";
import { cn } from "@workspace/react/lib/utils";
import { Component, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

const dateAt = (year: number, month: number, day: number) =>
  DateTime.fromObject({ day, month, year });

const DUE_DATE = dateAt(2026, 3, 14);
const RANGE_MIN = dateAt(2026, 3, 5);
const RANGE_MAX = dateAt(2026, 3, 25);

const sizes = [
  "3xs",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
] as const;

const variants = ["outline", "soft", "ghost"] as const;

type LuxonPickerProps = Extract<DatePickerProps, { valueType?: "luxon" }>;

type DemoProps = Omit<LuxonPickerProps, "onChange" | "value" | "valueType"> & {
  initial?: DateTime | null;
  label: string;
};

const readout = (value: DateTime | null) =>
  value === null ? "none" : value.toFormat("yyyy-MM-dd");

/** A labelled picker that keeps its own value and prints it. */
const Demo = ({ initial = null, label, ...props }: DemoProps) => {
  const id = useId();
  const [value, setValue] = useState<DateTime | null>(initial);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm text-text-muted" id={`${id}-label`}>
        {label}
      </span>
      <DatePicker
        aria-labelledby={`${id}-label`}
        id={id}
        onChange={setValue}
        value={value}
        {...props}
      />
      <output className="text-xs text-text-subtle" data-testid={`${id}-out`}>
        {readout(value)}
      </output>
    </div>
  );
};

const Group = ({ children, title }: { children: ReactNode; title: string }) => (
  <section aria-label={title} className="flex flex-col gap-3">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] items-start gap-x-6 gap-y-5">
      {children}
    </div>
  </section>
);

const States = () => (
  <Group title="States">
    <Demo label="Empty" />
    <Demo initial={DUE_DATE} label="Value" />
    <Demo clearable initial={DUE_DATE} label="Clearable" />
    <Demo disabled initial={dateAt(2026, 1, 1)} label="Disabled" />
    <Demo
      clearable
      dropdownIconType="none"
      initial={DUE_DATE}
      label="Clearable, no dropdown icon"
    />
    <Demo disabled label="Disabled, empty" />
    <Demo
      aria-describedby="date-picker-error"
      aria-invalid
      initial={DUE_DATE}
      invalid
      label="Error"
    />
    <Demo label="Custom placeholder" placeholder="Pick a day" />
  </Group>
);

const Variants = () => (
  <Group title="Variants">
    {variants.map((variant) => (
      <Demo
        initial={DUE_DATE}
        key={variant}
        label={variant}
        variant={variant}
      />
    ))}
    {variants.map((variant) => (
      <Demo
        initial={DUE_DATE}
        invalid
        key={`${variant}-invalid`}
        label={`${variant}, error`}
        variant={variant}
      />
    ))}
    {variants.map((variant) => (
      <Demo
        disabled
        initial={DUE_DATE}
        key={`${variant}-disabled`}
        label={`${variant}, disabled`}
        variant={variant}
      />
    ))}
  </Group>
);

const Sizes = () => (
  <Group title="Sizes">
    {sizes.map((size) => (
      <Demo clearable initial={DUE_DATE} key={size} label={size} size={size} />
    ))}
  </Group>
);

const TriggerOptions = () => (
  <Group title="Shape and icons">
    <Demo clearable initial={DUE_DATE} label="Pill" pill />
    <Demo block initial={DUE_DATE} label="Block" />
    <Demo
      dropdownIconType="chevronDown"
      initial={DUE_DATE}
      label="Chevron icon"
    />
    <Demo dropdownIconType="none" initial={DUE_DATE} label="No dropdown icon" />
    <Demo initial={DUE_DATE} label="No calendar icon" triggerShowIcon={false} />
    <Demo
      initial={DUE_DATE}
      label="Format MMMM d, yyyy"
      triggerDateFormat="MMMM d, yyyy"
    />
    <Demo
      initial={DUE_DATE}
      label="Format EEE d MMM"
      triggerDateFormat="EEE d MMM"
    />
    <Demo disablePressable initial={DUE_DATE} label="No press scale" />
  </Group>
);

const Locales = () => (
  <Group title="Locale">
    <Demo initial={DUE_DATE} label="de" locale="de" />
    <Demo
      initial={DUE_DATE}
      label="fr, MMMM d, yyyy"
      locale="fr"
      triggerDateFormat="MMMM d, yyyy"
    />
    <Demo initial={DUE_DATE} label="ja" locale="ja" />
  </Group>
);

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  message: string | null;
}

/** Shows the error a picker throws, as a page boundary would. */
class PickerBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { message: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { message: error.message };
  }

  // oxlint-disable-next-line typescript/promise-function-async -- ReactNode includes promises, but this returns the node it is given.
  render() {
    return this.state.message === null ? (
      this.props.children
    ) : (
      <output className="text-sm text-text-muted" data-testid="min-max-error">
        {this.state.message}
      </output>
    );
  }
}

/**
 * The picker throws while it renders, and an error boundary only catches that
 * in the browser, so the example mounts there.
 */
const MinAfterMax = () =>
  useIsClient() ? (
    <PickerBoundary>
      <Demo label="Min after max" max={RANGE_MIN} min={RANGE_MAX} />
    </PickerBoundary>
  ) : null;

/** A value that changes by itself two seconds after the button is pressed. */
const DelayedValue = () => {
  const id = useId();
  const [value, setValue] = useState<DateTime | null>(DUE_DATE);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    []
  );

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm text-text-muted" id={`${id}-label`}>
        Value changes after 2 seconds
      </span>
      <DatePicker
        aria-labelledby={`${id}-label`}
        id={id}
        onChange={setValue}
        value={value}
      />
      <button
        className="w-fit rounded-md border border-border px-2 py-1 text-xs"
        onClick={() => {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            setValue(dateAt(2027, 6, 10));
          }, 2000);
        }}
        type="button"
      >
        Set to Jun 10, 2027 in 2 seconds
      </button>
      <output className="text-xs text-text-subtle" data-testid="delayed-out">
        {readout(value)}
      </output>
    </div>
  );
};

const Ranges = () => (
  <Group title="Range and start month">
    <Demo
      initial={DUE_DATE}
      label="Min Mar 5, max Mar 25"
      max={RANGE_MAX}
      min={RANGE_MIN}
    />
    <Demo label="Min Mar 5 (earlier months disabled)" min={RANGE_MIN} />
    <Demo initialCalendarDate={dateAt(2027, 1, 1)} label="Starts in Jan 2027" />
    <DelayedValue />
    <div className="flex min-w-0 flex-col gap-1.5">
      <MinAfterMax />
    </div>
    <Demo
      label="Custom month labels"
      nextMonthLabel="Show the next month"
      previousMonthLabel="Show the previous month"
    />
  </Group>
);

const Placement = () => (
  <Group title="Placement">
    <Demo align="start" initial={DUE_DATE} label="Start aligned" />
    <Demo align="end" initial={DUE_DATE} label="End aligned" />
    <Demo initial={DUE_DATE} label="Opens above" side="top" />
    <Demo initial={DUE_DATE} label="Offset 24" sideOffset={24} />
  </Group>
);

const Collisions = () => (
  <Group title="Collisions">
    <div className="col-span-full flex justify-end">
      <div className="w-56">
        <Demo
          align="end"
          initial={DUE_DATE}
          label="Right edge: shifts inside a narrow window"
        />
      </div>
    </div>
    <Demo
      initial={DUE_DATE}
      label="Scroll until this is near the bottom: flips above"
    />
    <Demo
      initial={DUE_DATE}
      label="Open, then scroll it out of view: hides"
      side="top"
    />
  </Group>
);

const DemoCell = ({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <span className="text-sm text-text-muted">{label}</span>
    {children}
  </div>
);

/** A button that carries the popover trigger props (`usePopoverTrigger`). */
const PopoverButton = ({ children }: { children: ReactNode }) => {
  const trigger = usePopoverTrigger();

  return (
    <DataButton color="secondary" size="md" variant="outline" {...trigger}>
      {children}
    </DataButton>
  );
};

const PopoverBody = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-2 p-3 text-sm">{children}</div>
);

/** Calls the popover's `setShake`, as other callers of the shared popover do. */
const ShakeButton = () => {
  const { setShake } = usePopoverContext();

  return (
    <DataButton
      color="secondary"
      onClick={() => {
        setShake(false);
        window.requestAnimationFrame(() => {
          setShake(true);
        });
      }}
      size="sm"
      variant="outline"
    >
      Shake
    </DataButton>
  );
};

const InteractDemo = ({
  label,
  loading = false,
  testId,
}: {
  label: string;
  loading?: boolean;
  testId: string;
}) => {
  const [count, setCount] = useState(0);

  return (
    <DemoCell label={label}>
      <SelectControl
        loading={loading}
        onInteract={() => {
          setCount((current) => current + 1);
        }}
      >
        Interact
      </SelectControl>
      <output className="text-xs text-text-subtle" data-testid={testId}>
        {count} calls
      </output>
    </DemoCell>
  );
};

/** Loading hides the clear button, so this is never called. */
const clearNothing = () => {
  /* nothing to clear */
};

const SelectControlOptions = () => (
  <>
    <DemoCell label="loading">
      <SelectControl loading selected>
        Loading
      </SelectControl>
    </DemoCell>
    <DemoCell label="loading, pill, clearable">
      <SelectControl loading onClearClick={clearNothing} pill selected>
        Loading
      </SelectControl>
    </DemoCell>
    <InteractDemo
      label="onInteract: presses and keys call it"
      testId="interact-count"
    />
    <InteractDemo
      label="onInteract, loading: ignored"
      loading
      testId="interact-loading-count"
    />
    <DemoCell label="opticallyAlign start (dashed line = the column edge)">
      <div className="flex flex-col gap-1 border-s border-dashed border-border">
        <SelectControl variant="soft">Aligned</SelectControl>
        <SelectControl opticallyAlign="start" variant="soft">
          Optically aligned
        </SelectControl>
      </div>
    </DemoCell>
    <DemoCell label="opticallyAlign end (dashed line = the column edge)">
      <div className="flex flex-col items-end gap-1 border-e border-dashed border-border">
        <SelectControl variant="soft">Aligned</SelectControl>
        <SelectControl opticallyAlign="end" variant="soft">
          Optically aligned
        </SelectControl>
      </div>
    </DemoCell>
  </>
);

const PopoverOptions = () => (
  <>
    <DemoCell label="showOnHover: opens after 150 ms, Tab enters it">
      <Popover showOnHover>
        <PopoverButton>Hover me</PopoverButton>
        <PopoverContent side="right" sideOffset={12}>
          <PopoverBody>
            <span>Opens on hover or focus.</span>
            <DataButton color="secondary" size="sm" variant="outline">
              Inside
            </DataButton>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </DemoCell>
    <DemoCell label="translucent, width 360, aria-label">
      <div className="rounded-xl bg-linear-to-br from-fill-info-solid to-text-notice p-4">
        <Popover>
          <PopoverButton>Translucent</PopoverButton>
          <PopoverContent
            aria-label="Translucent popover"
            translucent
            width={360}
          >
            <PopoverBody>The surface is blurred and translucent.</PopoverBody>
          </PopoverContent>
        </Popover>
      </div>
    </DemoCell>
    <DemoCell label="shake">
      <Popover>
        <PopoverButton>Shake</PopoverButton>
        <PopoverContent>
          <PopoverBody>
            <span>Press to shake the popover.</span>
            <ShakeButton />
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </DemoCell>
    <DemoCell label="autoFocus off, focus outside kept, no focus return">
      <Popover>
        <PopoverButton>Focus options</PopoverButton>
        <PopoverContent
          autoFocus={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
          }}
          preventCloseOnFocusOutside
        >
          <PopoverBody>Tab out: the popover stays open.</PopoverBody>
        </PopoverContent>
      </Popover>
    </DemoCell>
    <div className="col-span-full flex justify-end">
      <DemoCell label="avoidCollisions off, hideWhenDetached off, maxWidth 160">
        <Popover>
          <PopoverButton>No collision handling</PopoverButton>
          <PopoverContent
            align="start"
            avoidCollisions={false}
            collisionPadding={0}
            hideWhenDetached={false}
            side="right"
            maxWidth={160}
            minWidth={160}
            sticky="always"
          >
            <PopoverBody>
              Not shifted or flipped at the window edge.
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </DemoCell>
    </div>
  </>
);

const SharedParts = () => (
  <Group title="Shared popover and select control">
    <SelectControlOptions />
    <PopoverOptions />
  </Group>
);

const DateValue = () => {
  const id = useId();
  const [value, setValue] = useState<Date | null>(new Date(2026, 2, 14));

  return (
    <Group title="Date values">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm text-text-muted" id={`${id}-label`}>
          JS Date value
        </span>
        <DatePicker
          aria-labelledby={`${id}-label`}
          clearable
          id={id}
          onChange={setValue}
          value={value}
          valueType="date"
        />
        <output className="text-xs text-text-subtle">
          {value === null ? "none" : value.toDateString()}
        </output>
      </div>
    </Group>
  );
};

/**
 * A theme scope with its own portal container, so the popover resolves the
 * nearest scope's colors.
 */
const Scope = ({
  children,
  className,
  dir,
  lang,
  testId,
}: {
  children: ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
  lang?: string;
  testId: string;
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 text-foreground",
        className
      )}
      data-testid={testId}
      dir={dir}
      lang={lang}
      ref={setContainer}
    >
      <PlatformProvider radixPortalContainer={container}>
        {children}
      </PlatformProvider>
    </div>
  );
};

const Themes = () => (
  <section aria-label="Themes" className="flex flex-col gap-3">
    <h2 className="text-base font-semibold">Themes</h2>
    <div className="grid gap-4 md:grid-cols-2">
      <Scope className="dark" testId="dark-scope">
        <h3 className="text-sm font-semibold">Dark</h3>
        <div className="grid grid-cols-2 gap-4">
          <Demo clearable initial={DUE_DATE} label="Dark" />
          <Demo label="Dark, empty" variant="soft" />
        </div>
        <Scope className="light" testId="light-in-dark">
          <h3 className="text-sm font-semibold">Light inside dark</h3>
          <div className="grid grid-cols-2 gap-4">
            <Demo clearable initial={DUE_DATE} label="Light" />
            <Demo label="Light, empty" variant="soft" />
          </div>
        </Scope>
      </Scope>
      <Scope className="light" testId="light-scope">
        <h3 className="text-sm font-semibold">Light</h3>
        <div className="grid grid-cols-2 gap-4">
          <Demo clearable initial={DUE_DATE} label="Light" />
          <Demo label="Light, empty" variant="soft" />
        </div>
        <Scope className="dark" testId="dark-in-light">
          <h3 className="text-sm font-semibold">Dark inside light</h3>
          <div className="grid grid-cols-2 gap-4">
            <Demo clearable initial={DUE_DATE} label="Dark" />
            <Demo label="Dark, empty" variant="soft" />
          </div>
        </Scope>
      </Scope>
    </div>
  </section>
);

const RightToLeft = () => (
  <section aria-label="Right to left" className="flex flex-col gap-3">
    <h2 className="text-base font-semibold">Right to left</h2>
    <Scope dir="rtl" lang="ar" testId="rtl-scope">
      <div className="grid grid-cols-2 gap-4">
        <Demo
          clearable
          initial={DUE_DATE}
          label="ar"
          locale="ar"
          triggerDateFormat="d MMMM yyyy"
        />
        <Demo label="ar, empty" locale="ar" />
        <Demo align="start" initial={DUE_DATE} label="ar, start" locale="ar" />
        <Demo
          initial={DUE_DATE}
          label="ar, range"
          locale="ar"
          max={RANGE_MAX}
          min={RANGE_MIN}
        />
      </div>
    </Scope>
  </section>
);

const DatePickerGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-10 bg-background p-6 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <h1 className="text-xl font-semibold">Date picker</h1>
      <AppearanceControl id="date-picker-appearance" />
    </header>
    <p className="text-sm text-text-muted" id="date-picker-error">
      The date is required.
    </p>
    <States />
    <Variants />
    <Sizes />
    <TriggerOptions />
    <Locales />
    <Ranges />
    <Placement />
    <Collisions />
    <DateValue />
    <SharedParts />
    <Themes />
    <RightToLeft />
  </main>
);

export { DatePickerGalleryExample };
