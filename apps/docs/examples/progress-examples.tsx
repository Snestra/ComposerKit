"use client";

import { Button } from "@workspace/react/components/ui/button";
import {
  BlossomShimmer,
  CircularProgress,
  DelayedLoadingIndicator,
  DelayedSpinner,
  GenerationProgressBadge,
  LinearProgress,
  LoadingStatus,
  Meter,
  ProgressBadge,
  Spinner,
  TypingDots,
  UploadOverlay,
  useResetFillAnimation,
} from "@workspace/react/components/ui/progress";
import { Slider } from "@workspace/react/components/ui/slider";
import {
  ReducedMotionAttribute,
  ReducedMotionProvider,
  useReducedMotion,
} from "@workspace/react/lib/reduced-motion";
import type { ReducedMotionPreference } from "@workspace/react/lib/reduced-motion";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

const SECOND_MS = 1000;
const FULL = 100;

const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {description === undefined ? null : (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {children}
  </section>
);

const PanelContent = ({ prefix }: { prefix: string }) => (
  <div className="flex flex-col gap-3" data-testid={`${prefix}-content`}>
    <div className="flex items-center gap-4">
      <Spinner className="size-7" />
      <Spinner className="size-3" />
      <CircularProgress percent={0} size={24} />
      <CircularProgress percent={35} size={24} />
      <CircularProgress percent={100} size={24} />
      <TypingDots />
      <BlossomShimmer className="size-10" />
    </div>
    <p className="text-sm" id={`${prefix}-linear-label`}>
      Linear bar at 60%
    </p>
    <LinearProgress labelledBy={`${prefix}-linear-label`} value={60} />
    <Meter accessibleLabel="Remaining 70 percent" remainingPercent={70} />
    <div className="relative h-24 overflow-hidden rounded-xl border bg-panel-secondary">
      <ProgressBadge progress={58} />
    </div>
    <div className="relative h-24 overflow-hidden rounded-xl border bg-panel-secondary">
      <UploadOverlay label="Uploading" percentage={60} />
    </div>
    <div className="h-16">
      <LoadingStatus />
    </div>
  </div>
);

// A theme scope sets color-scheme, so every theme-dependent value inside
// resolves at its nearest scope, at any depth.
const AppearancePanel = ({
  id,
  nested,
  scope,
}: {
  id: string;
  nested?: Scope;
  scope: Scope;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className={`${scope} flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 text-foreground`}
    data-testid={id}
  >
    <h3 className="text-sm font-semibold" id={`${id}-heading`}>
      {scopeTitle(scope)}
      {nested === undefined ? "" : `, with a ${nested} panel inside`}
    </h3>
    <PanelContent prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <PanelContent prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

const subscribeAttribute = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-ck-reduced-motion"],
    attributes: true,
  });

  return () => {
    observer.disconnect();
  };
};

const readAttribute = () =>
  document.documentElement.dataset.ckReducedMotion ?? "absent";

const readAttributeOnServer = () => "absent";

const PREFERENCES = ["system", "on", "off"] as const;

const preferenceLabel = (choice: ReducedMotionPreference) =>
  choice === "system" ? "System" : `Reduced ${choice}`;

const MotionPreferenceControl = ({
  hostMounted,
  onHostMountedChange,
  onPreferenceChange,
  onSettingsReadyChange,
  preference,
  settingsReady,
}: {
  hostMounted: boolean;
  onHostMountedChange: (mounted: boolean) => void;
  onPreferenceChange: (preference: ReducedMotionPreference) => void;
  onSettingsReadyChange: (ready: boolean) => void;
  preference: ReducedMotionPreference;
  settingsReady: boolean;
}) => {
  const reduced = useReducedMotion();
  const disabledHook = useReducedMotion(false);

  const attribute = useSyncExternalStore(
    subscribeAttribute,
    readAttribute,
    readAttributeOnServer
  );

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Reduced motion</legend>
      <span className="text-sm">Reduced motion preference:</span>
      {PREFERENCES.map((choice) => (
        <Button
          aria-pressed={preference === choice}
          key={choice}
          onClick={() => {
            onPreferenceChange(choice);
          }}
          size="compact"
          color={preference === choice ? "primary" : "outline"}
        >
          {preferenceLabel(choice)}
        </Button>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={settingsReady}
          onChange={(event) => {
            onSettingsReadyChange(event.currentTarget.checked);
          }}
          type="checkbox"
        />
        settings loaded
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={hostMounted}
          onChange={(event) => {
            onHostMountedChange(event.currentTarget.checked);
          }}
          type="checkbox"
        />
        host writes data-ck-reduced-motion
      </label>
      <output className="text-sm" data-testid="motion-readout">
        reduced: {String(reduced)}
      </output>
      <output className="text-sm" data-testid="motion-disabled-readout">
        enabled=false: {String(disabledHook)}
      </output>
      <output className="text-sm" data-testid="motion-attribute-readout">
        data-ck-reduced-motion: {attribute}
      </output>
    </fieldset>
  );
};

const MotionSettings = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] =
    useState<ReducedMotionPreference>("system");

  const [settingsReady, setSettingsReady] = useState(true);
  const [hostMounted, setHostMounted] = useState(true);

  return (
    <ReducedMotionProvider
      preference={preference}
      settingsReady={settingsReady}
    >
      {hostMounted ? <ReducedMotionAttribute /> : null}
      <MotionPreferenceControl
        hostMounted={hostMounted}
        onHostMountedChange={setHostMounted}
        onPreferenceChange={setPreference}
        onSettingsReadyChange={setSettingsReady}
        preference={preference}
        settingsReady={settingsReady}
      />
      {children}
    </ReducedMotionProvider>
  );
};

const CircularExample = () => {
  const [percent, setPercent] = useState(35);
  const [animateKey, setAnimateKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sliderId = useId();

  return (
    <Section
      description="Decorative ring, 12px by default. The arc eases between values in 120ms, hides at 0, and clamps to 0 to 100. Replay mounts new rings with the fill-from-empty animation."
      id="circular"
      title="Circular progress"
    >
      <div className="flex items-center gap-3">
        <label className="text-sm" htmlFor={sliderId}>
          Percent
        </label>
        <Slider
          id={sliderId}
          max={FULL}
          min={0}
          onChange={(event) => {
            setPercent(event.currentTarget.valueAsNumber);
          }}
          step={1}
          value={percent}
        />
        <output className="w-10 text-sm tabular-nums">{percent}</output>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["Zero", 0],
          ["Half", 50],
          ["Full", FULL],
          ["Over 100 (150)", 150],
          ["Negative (-20)", -20],
          ["Not a number", Number.NaN],
        ].map(([label, value]) => (
          <Button
            key={String(label)}
            onClick={() => {
              setPercent(Number(value));
            }}
            size="compact"
            color="outline"
          >
            {label}
          </Button>
        ))}
      </div>
      <div
        className="flex flex-wrap items-center gap-6"
        data-testid="circular-rings"
      >
        <CircularProgress percent={percent} reducedMotion={reducedMotion} />
        <CircularProgress
          percent={percent}
          reducedMotion={reducedMotion}
          size={24}
        />
        <CircularProgress
          percent={percent}
          reducedMotion={reducedMotion}
          size={48}
          strokeWidth={4}
        />
        <span className="text-text-notice">
          <CircularProgress
            percent={percent}
            reducedMotion={reducedMotion}
            size={48}
            strokeWidth={4}
            transitionDurationMs={800}
          />
        </span>
      </div>
      <p className="text-sm tabular-nums" data-testid="circular-readout">
        percent state: {String(percent)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            setAnimateKey((key) => key + 1);
          }}
          size="compact"
          color="outline"
        >
          Replay fill on mount
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={reducedMotion}
            onChange={(event) => {
              setReducedMotion(event.currentTarget.checked);
            }}
            type="checkbox"
          />
          reducedMotion prop
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-6" key={animateKey}>
        <CircularProgress
          animateOnMount
          percent={75}
          reducedMotion={reducedMotion}
          size={48}
          strokeWidth={4}
        />
        <CircularProgress
          animateOnMount
          animateOnMountDelayMs={600}
          percent={75}
          reducedMotion={reducedMotion}
          size={48}
          strokeWidth={4}
        />
        <span className="text-sm text-muted-foreground">
          Second ring starts after a 600ms delay.
        </span>
      </div>
    </Section>
  );
};

const SpinnerExample = () => {
  const [staggered, setStaggered] = useState(0);

  return (
    <Section
      description="Stepped 2s spin. Spinners mounted at different times stay in phase, and a spinner outside the viewport is paused (its --ck-decoration-playback is paused)."
      id="spinner"
      title="Spinner and loading status"
    >
      <div
        className="flex flex-wrap items-center gap-6"
        data-testid="spinner-row"
      >
        <Spinner className="size-7" />
        <Spinner className="size-3" />
        <span className="text-text-notice">
          <Spinner as="span" className="size-5" />
        </span>
        <span className="text-text-muted">
          <Spinner className="size-7" />
        </span>
        <div
          className="flex h-16 w-40 items-center rounded-xl border"
          data-testid="loading-status-frame"
        >
          <LoadingStatus />
        </div>
        <div
          className="flex h-16 w-40 items-center rounded-xl border"
          data-testid="loading-status-override-frame"
        >
          <LoadingStatus>Loading…</LoadingStatus>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            setStaggered((count) => count + 1);
          }}
          size="compact"
          color="outline"
        >
          Mount another spinner
        </Button>
        <div
          className="flex flex-wrap items-center gap-3"
          data-testid="staggered-spinners"
        >
          {Array.from({ length: staggered }, (_, index) => (
            <Spinner className="size-7" key={`staggered-${index + 1}`} />
          ))}
        </div>
      </div>
      <div
        className="h-24 overflow-y-auto rounded-xl border"
        data-testid="offscreen-scroller"
      >
        <div className="flex h-72 items-end justify-center pb-2">
          <span data-testid="offscreen-spinner">
            <Spinner className="size-7" />
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Scroll the box above to bring its spinner into view.
      </p>
    </Section>
  );
};

const BadgeExample = () => {
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [active, setActive] = useState(true);

  return (
    <Section
      description="The percent is an estimate from the elapsed time: 3% at the start, 90% at 45 seconds, then it creeps toward 99 and stops. It refreshes every 500ms while visible."
      id="badge"
      title="Generation progress badge"
    >
      <div className="relative h-40 overflow-hidden rounded-xl border bg-panel-secondary">
        <GenerationProgressBadge
          generationStartedAtMs={startedAt}
          isActive={active}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["Start now", 0],
          ["Started 10s ago", 10],
          ["Started 40s ago", 40],
          ["Started 3 min ago", 180],
        ].map(([label, seconds]) => (
          <Button
            key={String(label)}
            onClick={() => {
              setStartedAt(Date.now() - Number(seconds) * SECOND_MS);
            }}
            size="compact"
            color="outline"
          >
            {label}
          </Button>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={active}
            onChange={(event) => {
              setActive(event.currentTarget.checked);
            }}
            type="checkbox"
          />
          isActive
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[3, 58, 99].map((value) => (
          <div
            className="relative h-20 overflow-hidden rounded-xl border bg-panel-secondary"
            key={value}
          >
            <ProgressBadge progress={value} />
          </div>
        ))}
      </div>
    </Section>
  );
};

type Frame = "default" | "fillParent" | "overlay";

const LoadingIndicatorExample = () => {
  const [variant, setVariant] = useState<"blossom" | "page">("page");
  const [frame, setFrame] = useState<Frame>("default");
  const [delay, setDelay] = useState(true);
  const [status, setStatus] = useState(true);
  const [runKey, setRunKey] = useState(0);

  return (
    <Section
      description="Page variant stays hidden for 0.4s, then shows a spinner. Blossom variant fades in after a 1s delay. Replay remounts it. Overlay dims the content behind it."
      id="loading-indicator"
      title="Delayed loading indicator and blossom shimmer"
    >
      <div className="flex flex-wrap items-center gap-2">
        {(["page", "blossom"] as const).map((choice) => (
          <Button
            aria-pressed={variant === choice}
            key={choice}
            onClick={() => {
              setVariant(choice);
              setRunKey((key) => key + 1);
            }}
            size="compact"
            color={variant === choice ? "primary" : "outline"}
          >
            Variant {choice}
          </Button>
        ))}
        {(["default", "fillParent", "overlay"] as const).map((choice) => (
          <Button
            aria-pressed={frame === choice}
            key={choice}
            onClick={() => {
              setFrame(choice);
              setRunKey((key) => key + 1);
            }}
            size="compact"
            color={frame === choice ? "primary" : "outline"}
          >
            Frame {choice}
          </Button>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={delay}
            onChange={(event) => {
              setDelay(event.currentTarget.checked);
              setRunKey((key) => key + 1);
            }}
            type="checkbox"
          />
          delay
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={status}
            onChange={(event) => {
              setStatus(event.currentTarget.checked);
            }}
            type="checkbox"
          />
          status text
        </label>
        <Button
          onClick={() => {
            setRunKey((key) => key + 1);
          }}
          size="compact"
          color="outline"
        >
          Replay
        </Button>
      </div>
      <div
        className="relative h-56 overflow-hidden rounded-xl border bg-panel"
        data-testid="loading-indicator-stage"
      >
        <p className="p-4 text-sm">Content behind the indicator.</p>
        <DelayedLoadingIndicator
          delay={delay}
          fillParent={frame === "fillParent"}
          key={runKey}
          overlay={frame === "overlay"}
          status={status ? "Loading…" : undefined}
          variant={variant}
        />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <BlossomShimmer className="size-14" />
        <BlossomShimmer className="size-24" />
        <span className="text-sm text-muted-foreground">
          Blossom shimmer at two sizes.
        </span>
      </div>
    </Section>
  );
};

const TypingDotsExample = () => (
  <Section
    description="Three dots with a stepped wave, hidden from assistive technology. The wave is off when the system asks for reduced motion."
    id="typing-dots"
    title="Typing dots"
  >
    <div
      className="flex h-12 w-32 items-center justify-center rounded-xl border"
      data-testid="typing-dots-frame"
    >
      <TypingDots />
    </div>
  </Section>
);

const LinearExample = () => {
  const [value, setValue] = useState(30);
  const [complete, setComplete] = useState(false);
  const labelId = useId();
  const sliderId = useId();

  return (
    <Section
      description="The fill width eases over one second. aria-valuenow is only 100 when complete, and is otherwise left out."
      id="linear"
      title="Linear progress"
    >
      <p className="text-sm" id={labelId}>
        Download progress
      </p>
      <div className="w-72" data-testid="linear-frame">
        <LinearProgress
          complete={complete}
          labelledBy={labelId}
          value={value}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm" htmlFor={sliderId}>
          Value
        </label>
        <Slider
          id={sliderId}
          max={FULL}
          min={0}
          onChange={(event) => {
            setValue(event.currentTarget.valueAsNumber);
          }}
          step={1}
          value={value}
        />
        <output className="w-10 text-sm tabular-nums">{value}</output>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={complete}
            onChange={(event) => {
              setComplete(event.currentTarget.checked);
            }}
            type="checkbox"
          />
          complete
        </label>
      </div>
    </Section>
  );
};

const MeterExample = () => {
  const [remaining, setRemaining] = useState(40);
  const [compact, setCompact] = useState(false);
  const reducedMotion = useReducedMotion();
  const reset = useResetFillAnimation(reducedMotion);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(0);
  const sliderId = useId();
  const animatedPercent = remaining + (FULL - remaining) * reset.progress;

  const run = () => {
    setActive(true);
    reset.start(() => {
      setDone((count) => count + 1);
    });
  };

  const stop = () => {
    reset.reset();
    setActive(false);
  };

  return (
    <Section
      description="Usage meter with aria-valuemin 0, aria-valuemax 100 and aria-valuenow set to the remaining percent. Run reset plays the 1.96 second fill to 100% with a color shift, a bloom and a moving shimmer."
      id="meter"
      title="Usage meter and reset fill"
    >
      <div className="w-80 text-text" data-testid="meter-frame">
        <Meter
          accessibleLabel="Weekly usage remaining"
          animatedPercent={animatedPercent}
          isResetFillActive={active}
          remainingPercent={remaining}
          resetFillAnimation={reset}
          size={compact ? "compact" : "default"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm" htmlFor={sliderId}>
          Remaining
        </label>
        <Slider
          id={sliderId}
          max={FULL}
          min={0}
          onChange={(event) => {
            setRemaining(event.currentTarget.valueAsNumber);
          }}
          step={1}
          value={remaining}
        />
        <output className="w-10 text-sm tabular-nums">{remaining}</output>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={compact}
            onChange={(event) => {
              setCompact(event.currentTarget.checked);
            }}
            type="checkbox"
          />
          compact
        </label>
        <Button onClick={run} size="compact" color="outline">
          Run reset
        </Button>
        <Button onClick={stop} size="compact" color="outline">
          Stop and reset
        </Button>
      </div>
      <p className="text-sm tabular-nums" data-testid="meter-readout">
        active: {String(active)}, fill: {animatedPercent.toFixed(1)}%, color:{" "}
        {reset.fillColor.startsWith("color-mix") ? "mixing" : reset.fillColor},
        completions: {done}
      </p>
    </Section>
  );
};

const DelayedSpinnerExample = () => {
  const [mounted, setMounted] = useState(false);

  return (
    <Section
      description="Nothing renders for the first 200ms after mount. Then a span with role progressbar holds the spinner. It has no label or value."
      id="delayed-spinner"
      title="Delayed spinner"
    >
      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            setMounted((value) => !value);
          }}
          size="compact"
          color="outline"
        >
          {mounted ? "Unmount" : "Mount"}
        </Button>
        <div
          className="flex h-10 w-24 items-center justify-center rounded-xl border"
          data-testid="delayed-spinner-frame"
        >
          {mounted ? <DelayedSpinner className="size-5" /> : null}
        </div>
      </div>
    </Section>
  );
};

const UploadExample = () => {
  const percentages = [
    ["Indeterminate (null)", null],
    ["Zero", 0],
    ["25%", 25],
    ["60%", 60],
    ["100%", FULL],
  ] as const;

  return (
    <Section
      description="Overlay over a media tile. Without a percentage (or at 0) the ring shows 25% and spins, and aria-valuenow is left out. The ring stands still when the host attribute is true (reduced motion on, or the settings still loading) or, with no attribute, when the system asks for reduced motion."
      id="upload"
      title="Upload overlay"
    >
      <div className="flex flex-wrap gap-4">
        {percentages.map(([label, percentage]) => (
          <figure className="flex flex-col gap-2" key={label}>
            <div
              className="relative size-32 overflow-hidden rounded-xl bg-panel-tertiary"
              data-testid={`upload-${String(percentage)}`}
            >
              <UploadOverlay label="Uploading image" percentage={percentage} />
            </div>
            <figcaption className="text-xs text-muted-foreground">
              {label}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
};

const RtlExample = () => (
  <Section
    description="The badge moves to the end edge. The meter fill, bloom and shimmer use physical directions in the source, so the fill still grows from the left."
    id="rtl"
    title="Right to left"
  >
    <div className="flex flex-col gap-3" dir="rtl" lang="ar">
      <div
        className="relative h-24 overflow-hidden rounded-xl border bg-panel-secondary"
        data-testid="rtl-badge-frame"
      >
        <ProgressBadge locale="ar" progress={58} />
      </div>
      <div className="relative size-32 overflow-hidden rounded-xl bg-panel-tertiary">
        <UploadOverlay label="جارٍ الرفع" percentage={60} />
      </div>
      <div className="w-72 text-text">
        <Meter accessibleLabel="المتبقي" remainingPercent={40} />
      </div>
      <div className="w-72">
        <LinearProgress value={40} />
      </div>
      <div className="h-16 w-40 rounded-xl border">
        <LoadingStatus>جارٍ التحميل…</LoadingStatus>
      </div>
    </div>
  </Section>
);

const ProgressGalleryExample = () => (
  <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Progress and spinner</h1>
      <AppearanceControl id="progress-appearance" />
    </header>

    <MotionSettings>
      <Section
        description="Each panel sets its own theme scope, so the appearance control above does not change them. The two lower panels nest the opposite theme inside, and the nested parts follow the nearest scope."
        id="appearance"
        title="Light and dark"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AppearancePanel id="appearance-light" scope="light" />
          <AppearancePanel id="appearance-dark" scope="dark" />
          <AppearancePanel
            id="appearance-dark-light"
            nested="light"
            scope="dark"
          />
          <AppearancePanel
            id="appearance-light-dark"
            nested="dark"
            scope="light"
          />
        </div>
      </Section>

      <CircularExample />
      <SpinnerExample />
      <BadgeExample />
      <LoadingIndicatorExample />
      <TypingDotsExample />
      <LinearExample />
      <MeterExample />
      <DelayedSpinnerExample />
      <UploadExample />
      <RtlExample />
    </MotionSettings>
  </main>
);

export { ProgressGalleryExample };
