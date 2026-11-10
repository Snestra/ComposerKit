"use client";

import { AnimatedSegmentedToggle } from "composerkit/components/segmented-control/animated-segmented-toggle";
import type { AnimatedSegmentedToggleSize } from "composerkit/components/segmented-control/animated-segmented-toggle";
import { ModeToggle } from "composerkit/components/segmented-control/mode-toggle";
import type {
  ModeToggleOption,
  ModeToggleTipContent,
} from "composerkit/components/segmented-control/mode-toggle";
import {
  SegmentedControl,
  SegmentedItem,
} from "composerkit/components/ui/segmented-control";
import type {
  SegmentedControlGutterSize,
  SegmentedControlSize,
} from "composerkit/components/ui/segmented-control";
import { Columns3, LayoutGrid, List } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Scope = "dark" | "light";

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
] as const satisfies readonly SegmentedControlSize[];

const gutterSizes = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
] as const satisfies readonly SegmentedControlGutterSize[];

const views = [
  { label: "List", value: "list" },
  { label: "Grid", value: "grid" },
  { label: "Board", value: "board" },
] as const;

const manyOptions = Array.from({ length: 12 }, (_, index) => ({
  label: `Option ${index + 1}`,
  value: `option-${index + 1}`,
}));

const Row = ({ children, title }: { children: ReactNode; title: string }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
    <span className="basis-full text-sm text-text-muted">{title}</span>
    {children}
  </div>
);

const Views = ({ disabledBoard = true }: { disabledBoard?: boolean }) =>
  views.map((view) => (
    <SegmentedItem
      disabled={view.value === "board" && disabledBoard}
      key={view.value}
      value={view.value}
    >
      {view.label}
    </SegmentedItem>
  ));

const BasicExample = () => {
  const [value, setValue] = useState("list");
  const [calls, setCalls] = useState(0);
  const [clicks, setClicks] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-base font-medium">Selection</h3>
      <SegmentedControl
        aria-label="View mode"
        id="gallery-view-mode"
        onChange={(next) => {
          setValue(next);
          setCalls((count) => count + 1);
        }}
        onClick={() => {
          setClicks((count) => count + 1);
        }}
        value={value}
      >
        <Views />
      </SegmentedControl>
      <p className="m-0 text-sm" data-testid="segmented-readout">
        value: {value}, onChange calls: {calls}, root onClick calls: {clicks}
      </p>
      <p className="m-0 text-sm text-muted-foreground">
        Board is disabled. Choosing the selected option again does not call
        onChange, so a selection cannot be cleared. Tab enters the selected
        option, the arrow keys move focus without wrapping, and Space or Enter
        selects.
      </p>
    </div>
  );
};

const SizesExample = () => {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-base font-medium">Sizes</h3>
      {sizes.map((size) => (
        <Row key={size} title={`size ${size}`}>
          <SegmentedControl
            aria-label={`Size ${size}`}
            data-testid={`size-${size}`}
            onChange={(next) => {
              setValues((current) => ({ ...current, [size]: next }));
            }}
            size={size}
            value={values[size] ?? "grid"}
          >
            <Views disabledBoard={false} />
          </SegmentedControl>
        </Row>
      ))}
      <Row title="gutterSize at size md">
        {gutterSizes.map((gutterSize) => (
          <SegmentedControl
            aria-label={`Gutter ${gutterSize}`}
            data-testid={`gutter-${gutterSize}`}
            gutterSize={gutterSize}
            key={gutterSize}
            onChange={(next) => {
              setValues((current) => ({ ...current, [gutterSize]: next }));
            }}
            value={values[gutterSize] ?? "list"}
          >
            <SegmentedItem value="list">List</SegmentedItem>
            <SegmentedItem value="grid">Grid</SegmentedItem>
          </SegmentedControl>
        ))}
      </Row>
    </div>
  );
};

const FlagsExample = () => {
  const [values, setValues] = useState<Record<string, string>>({});

  const change = (key: string) => (next: string) => {
    setValues((current) => ({ ...current, [key]: next }));
  };

  const valueOf = (key: string) => values[key] ?? "list";

  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-base font-medium">
        Block, pill, ghost and state
      </h3>
      <Row title="block">
        <div className="w-full max-w-md">
          <SegmentedControl
            aria-label="Block"
            block
            data-testid="flag-block"
            onChange={change("block")}
            value={valueOf("block")}
          >
            <Views disabledBoard={false} />
          </SegmentedControl>
        </div>
      </Row>
      <Row title="pill">
        <SegmentedControl
          aria-label="Pill"
          data-testid="flag-pill"
          onChange={change("pill")}
          pill
          value={valueOf("pill")}
        >
          <Views disabledBoard={false} />
        </SegmentedControl>
      </Row>
      <Row title="variant ghost">
        <SegmentedControl
          aria-label="Ghost"
          data-testid="flag-ghost"
          onChange={change("ghost")}
          value={valueOf("ghost")}
          variant="ghost"
        >
          <Views />
        </SegmentedControl>
        <SegmentedControl
          aria-label="Ghost pill"
          data-testid="flag-transparent-pill"
          onChange={change("transparent-pill")}
          pill
          value={valueOf("transparent-pill")}
          variant="ghost"
        >
          <Views disabledBoard={false} />
        </SegmentedControl>
      </Row>
      <Row title="disabled group">
        <SegmentedControl
          aria-label="Disabled group"
          data-testid="flag-disabled"
          disabled
          onChange={change("disabled")}
          value="grid"
        >
          <Views disabledBoard={false} />
        </SegmentedControl>
      </Row>
      <Row title="orientation vertical (only Up and Down keys move focus)">
        <SegmentedControl
          aria-label="Vertical keys"
          data-testid="flag-vertical"
          onChange={change("vertical")}
          orientation="vertical"
          value={valueOf("vertical")}
        >
          <Views disabledBoard={false} />
        </SegmentedControl>
      </Row>
      <Row title="loop (focus wraps from the last option to the first)">
        <SegmentedControl
          aria-label="Looping focus"
          data-testid="flag-loop"
          loop
          onChange={change("loop")}
          value={valueOf("loop")}
        >
          <Views disabledBoard={false} />
        </SegmentedControl>
      </Row>
      <Row title="icons as option content">
        <SegmentedControl
          aria-label="Icon options"
          data-testid="flag-icons"
          onChange={change("icons")}
          size="lg"
          value={valueOf("icons")}
        >
          <SegmentedItem aria-label="List" value="list">
            <List size={16} />
          </SegmentedItem>
          <SegmentedItem aria-label="Grid" value="grid">
            <LayoutGrid size={16} />
          </SegmentedItem>
          <SegmentedItem aria-label="Board" value="board">
            <Columns3 size={16} />
          </SegmentedItem>
        </SegmentedControl>
      </Row>
    </div>
  );
};

const OverflowExample = () => {
  const [value, setValue] = useState("option-1");

  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-base font-medium">Overflow and scrolling</h3>
      <div className="flex max-w-xs">
        <SegmentedControl
          aria-label="Many options"
          className="max-w-full"
          data-testid="overflow-control"
          onChange={setValue}
          value={value}
        >
          {manyOptions.map((option) => (
            <SegmentedItem key={option.value} value={option.value}>
              {option.label}
            </SegmentedItem>
          ))}
        </SegmentedControl>
      </div>
      <div className="flex flex-wrap gap-2">
        {["option-1", "option-6", "option-12"].map((target) => (
          <button
            className="rounded-md border px-2 py-1 text-sm"
            key={target}
            onClick={() => {
              setValue(target);
            }}
            type="button"
          >
            Set {target}
          </button>
        ))}
      </div>
    </div>
  );
};

const RtlExample = () => {
  const [value, setValue] = useState("list");

  return (
    <div className="flex flex-col items-start gap-2" dir="rtl" lang="ar">
      <h3 className="m-0 text-base font-medium">Right to left</h3>
      <SegmentedControl
        aria-label="Right to left view"
        data-testid="rtl-control"
        dir="rtl"
        onChange={setValue}
        value={value}
      >
        <SegmentedItem value="list">قائمة</SegmentedItem>
        <SegmentedItem value="grid">شبكة</SegmentedItem>
        <SegmentedItem value="board">لوحة</SegmentedItem>
      </SegmentedControl>
    </div>
  );
};

const modeOptions = [
  {
    id: "chat",
    label: "Chat",
    tooltip: "Ask questions and explore ideas",
  },
  {
    id: "work",
    label: "Work",
    tooltip: "Get tasks done with your files and apps",
  },
] as const satisfies readonly ModeToggleOption[];

const lockedOptions = [
  modeOptions[0],
  {
    ...modeOptions[1],
    discoveryBadge: false,
    emphasizeUpgrade: false,
    requiresUpgrade: true,
    upgradeSuffix: "Requires upgrade",
  },
] as const satisfies readonly [ModeToggleOption, ModeToggleOption];

const badgedOptions = [
  modeOptions[0],
  { ...modeOptions[1], discoveryBadge: true },
] as const satisfies readonly [ModeToggleOption, ModeToggleOption];

const emphasizedOptions = [
  modeOptions[0],
  { ...lockedOptions[1], emphasizeUpgrade: true },
] as const satisfies readonly [ModeToggleOption, ModeToggleOption];

const ModeRow = ({
  autoFocusSelected,
  disabled,
  label,
  options,
  testId,
}: {
  autoFocusSelected?: boolean;
  disabled?: boolean;
  label: string;
  options: readonly [ModeToggleOption, ModeToggleOption];
  testId: string;
}) => {
  const [value, setValue] = useState("chat");
  const [completed, setCompleted] = useState(0);
  const [focused, setFocused] = useState(0);
  const [generation, setGeneration] = useState(0);
  // A toggle that takes focus when it mounts is mounted on request, so the
  // page does not move focus on load.
  const mounted = autoFocusSelected !== true || generation > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="basis-full text-sm text-text-muted">{label}</span>
      {mounted ? (
        <ModeToggle
          ariaLabel={`Composer mode, ${label}`}
          autoFocusSelected={autoFocusSelected}
          disabled={disabled}
          key={generation}
          onSelectedAutoFocus={() => {
            setFocused((count) => count + 1);
          }}
          onTransitionComplete={() => {
            setCompleted((count) => count + 1);
          }}
          onValueChange={setValue}
          options={options}
          value={value}
        />
      ) : null}
      <span className="text-sm" data-testid={`${testId}-readout`}>
        value: {value}, transitions complete: {completed}, selected focused:{" "}
        {focused}
      </span>
      {autoFocusSelected === true ? (
        <button
          className="rounded-md border px-2 py-1 text-sm"
          onClick={() => {
            setGeneration((count) => count + 1);
          }}
          type="button"
        >
          {generation === 0 ? "Mount" : "Mount again"}
        </button>
      ) : null}
    </div>
  );
};

const ModeToggleExample = () => (
  <div className="flex flex-col gap-3">
    <h3 className="m-0 text-base font-medium">Mode toggle</h3>
    <ModeRow label="two options" options={modeOptions} testId="mode-basic" />
    <ModeRow
      disabled
      label="disabled"
      options={modeOptions}
      testId="mode-disabled"
    />
    <ModeRow
      autoFocusSelected
      label="autoFocusSelected"
      options={modeOptions}
      testId="mode-autofocus"
    />
    <ModeRow
      label="second option requires an upgrade"
      options={lockedOptions}
      testId="mode-locked"
    />
    <ModeRow
      label="upgrade emphasized"
      options={emphasizedOptions}
      testId="mode-emphasized"
    />
    <ModeRow
      label="discovery badge"
      options={badgedOptions}
      testId="mode-badge"
    />
    <div dir="rtl" lang="ar">
      <ModeRow label="right to left" options={modeOptions} testId="mode-rtl" />
    </div>
  </div>
);

// Local example data for the Work onboarding tip. The desktop app picks the
// tip from its stores and telemetry; here each row holds the content and a
// "shown" flag in its own state. The trial strings are the app's own.
const tipTexts = {
  bodyOnly: { body: "Get tasks done with your files and apps" },
  titleAndBody: {
    body: "Take actions across your files and apps.",
    title: "Try Work",
  },
  trial: {
    body: "Take actions across your favorite apps and files.",
    title: "Try it for free",
  },
} as const satisfies Record<
  string,
  Pick<ModeToggleTipContent, "body" | "title">
>;

type TipKind = "onboardingTip" | "noPaymentTrialTooltip";

const TipRow = ({
  disabled,
  initialValue = "chat",
  kind,
  label,
  options,
  testId,
  text,
}: {
  disabled?: boolean;
  initialValue?: "chat" | "work";
  kind: TipKind;
  label: string;
  options: readonly [ModeToggleOption, ModeToggleOption];
  testId: string;
  text: Pick<ModeToggleTipContent, "body" | "title">;
}) => {
  const [value, setValue] = useState<string>(initialValue);
  const [shown, setShown] = useState(true);
  const [dismissed, setDismissed] = useState(0);

  const content: ModeToggleTipContent | undefined = shown
    ? {
        ...text,
        onDismiss: () => {
          setShown(false);
          setDismissed((count) => count + 1);
        },
      }
    : undefined;

  return (
    <div className="flex min-h-44 flex-wrap content-start items-start gap-x-4 gap-y-2">
      <span className="basis-full text-sm text-text-muted">{label}</span>
      <ModeToggle
        ariaLabel={`Composer mode, ${label}`}
        disabled={disabled}
        noPaymentTrialTooltip={
          kind === "noPaymentTrialTooltip" ? content : undefined
        }
        onboardingTip={kind === "onboardingTip" ? content : undefined}
        onValueChange={setValue}
        options={options}
        value={value}
      />
      <span className="text-sm" data-testid={`${testId}-readout`}>
        value: {value}, tip content given: {shown ? "yes" : "no"}, dismissals:{" "}
        {dismissed}
      </span>
      <button
        className="rounded-md border px-2 py-1 text-sm"
        onClick={() => {
          setShown(true);
        }}
        type="button"
      >
        Show again
      </button>
    </div>
  );
};

const WorkOnboardingExample = () => (
  <div className="flex flex-col gap-3">
    <h3 className="m-0 text-base font-medium">Work onboarding tip</h3>
    <p className="m-0 text-sm text-muted-foreground">
      The tip below the Work option opens by itself. Close it with its button or
      Escape (focus returns to Work), or press Work. A press elsewhere closes
      only the trial tooltip. Hovering Work shows no tooltip while a tip is
      open.
    </p>
    <TipRow
      kind="onboardingTip"
      label="targeted tip, title and body (Work requires an upgrade)"
      options={lockedOptions}
      testId="tip-title"
      text={tipTexts.titleAndBody}
    />
    <TipRow
      kind="onboardingTip"
      label="targeted tip, body only"
      options={lockedOptions}
      testId="tip-body"
      text={tipTexts.bodyOnly}
    />
    <TipRow
      kind="noPaymentTrialTooltip"
      label="no-payment-trial tooltip (Work does not require an upgrade)"
      options={modeOptions}
      testId="tip-trial"
      text={tipTexts.trial}
    />
    <TipRow
      initialValue="work"
      kind="onboardingTip"
      label="no tip while Work is selected (press Chat to show it)"
      options={lockedOptions}
      testId="tip-work-selected"
      text={tipTexts.bodyOnly}
    />
    <TipRow
      disabled
      kind="onboardingTip"
      label="no tip while the toggle is disabled"
      options={lockedOptions}
      testId="tip-disabled"
      text={tipTexts.bodyOnly}
    />
  </div>
);

const animatedOptions = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

const AnimatedRow = ({
  animateSelection,
  size,
  title,
}: {
  animateSelection?: boolean;
  size: AnimatedSegmentedToggleSize;
  title: string;
}) => {
  const [selected, setSelected] = useState("light");

  return (
    <Row title={title}>
      <AnimatedSegmentedToggle
        animateSelection={animateSelection}
        ariaLabel={title}
        onSelect={setSelected}
        options={animatedOptions}
        selectedId={selected}
        size={size}
      />
    </Row>
  );
};

// The selection comes from outside the toggle, as when a parent resets it.
const DrivenRow = () => {
  const [selected, setSelected] = useState("light");

  return (
    <Row title="default size, set from outside">
      <AnimatedSegmentedToggle
        ariaLabel="default size, set from outside"
        onSelect={setSelected}
        options={animatedOptions}
        selectedId={selected}
      />
      {animatedOptions.map((option) => (
        <button
          className="rounded-md border px-2 py-1 text-sm"
          data-testid={`driven-${option.id}`}
          key={option.id}
          onClick={() => {
            setSelected(option.id);
          }}
          type="button"
        >
          Set {option.label}
        </button>
      ))}
    </Row>
  );
};

const AnimatedExample = () => (
  <div className="flex flex-col gap-3">
    <h3 className="m-0 text-base font-medium">Animated toggle</h3>
    <AnimatedRow size="default" title="default size" />
    <DrivenRow />
    <AnimatedRow size="compact" title="compact size" />
    <AnimatedRow
      animateSelection={false}
      size="compact"
      title="compact, animateSelection false"
    />
  </div>
);

const ThemePanel = ({ nested, scope }: { nested?: Scope; scope: Scope }) => {
  const [value, setValue] = useState("grid");
  const [mode, setMode] = useState("chat");
  const [animated, setAnimated] = useState("light");
  const title = nested ? `${scope} with a ${nested} panel inside` : scope;
  const id = nested ? `${scope}-${nested}` : scope;

  const content = (
    <>
      <SegmentedControl
        aria-label={`Default in ${id}`}
        data-testid={`theme-${id}-default`}
        onChange={setValue}
        value={value}
      >
        <Views />
      </SegmentedControl>
      <SegmentedControl
        aria-label={`Ghost in ${id}`}
        data-testid={`theme-${id}-ghost`}
        onChange={setValue}
        value={value}
        variant="ghost"
      >
        <Views />
      </SegmentedControl>
      <ModeToggle
        ariaLabel={`Composer mode in ${id}`}
        onValueChange={setMode}
        options={modeOptions}
        value={mode}
      />
      <AnimatedSegmentedToggle
        ariaLabel={`Animated in ${id}`}
        onSelect={setAnimated}
        options={animatedOptions}
        selectedId={animated}
        size="compact"
      />
    </>
  );

  return (
    <div
      className={`${scope} flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 text-foreground`}
      data-testid={`theme-panel-${id}`}
    >
      <h3 className="m-0 text-base font-medium">{title}</h3>
      {content}
      {nested ? (
        <div
          className={`${nested} flex flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
          data-testid={`theme-panel-${id}-inner`}
        >
          <h4 className="m-0 text-sm font-medium">
            {nested} inside {scope}
          </h4>
          <SegmentedControl
            aria-label={`Nested default in ${id}`}
            data-testid={`theme-${id}-nested-default`}
            onChange={setValue}
            value={value}
          >
            <Views />
          </SegmentedControl>
          <SegmentedControl
            aria-label={`Nested ghost in ${id}`}
            data-testid={`theme-${id}-nested-ghost`}
            onChange={setValue}
            value={value}
            variant="ghost"
          >
            <Views />
          </SegmentedControl>
          <ModeToggle
            ariaLabel={`Nested composer mode in ${id}`}
            onValueChange={setMode}
            options={modeOptions}
            value={mode}
          />
        </div>
      ) : null}
    </div>
  );
};

const SegmentedControlExamples = () => (
  <>
    <BasicExample />
    <SizesExample />
    <FlagsExample />
    <OverflowExample />
    <RtlExample />
    <ModeToggleExample />
    <WorkOnboardingExample />
    <AnimatedExample />
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-base font-medium">Light and dark</h3>
      <p className="m-0 text-sm text-muted-foreground">
        Each panel sets its own theme scope. The two lower panels nest the
        opposite theme inside, and the controls there follow the nearest scope.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <ThemePanel scope="light" />
        <ThemePanel scope="dark" />
        <ThemePanel nested="light" scope="dark" />
        <ThemePanel nested="dark" scope="light" />
      </div>
    </div>
  </>
);

// The demonstrations are many controls long. They render in a transition
// after the route has hydrated, so the other examples on /gallery become
// interactive as soon as they did before this family was added.
const SegmentedControlGalleryExample = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setReady(true);
    });
  }, []);

  return (
    <section
      aria-labelledby="segmented-control-heading"
      className="flex flex-col gap-6 p-4"
      id="segmented-control"
    >
      <h2
        className="text-title-md font-semibold"
        id="segmented-control-heading"
      >
        SegmentedControl
      </h2>
      {ready ? <SegmentedControlExamples /> : null}
    </section>
  );
};

export { SegmentedControlGalleryExample };
