"use client";

import { CheckIcon } from "composerkit/components/icon";
import { Button } from "composerkit/components/ui/button";
import {
  SegmentedControl,
  SegmentedItem,
} from "composerkit/components/ui/segmented-control";
import { Switch } from "composerkit/components/ui/switch";
import {
  useDarkMode,
  useDeviceLocales,
  usePrefersReducedMotion,
  useViewport,
} from "composerkit/hooks/use-device";
import {
  motionDuration,
  getAppearancePreference,
  prefersRightToLeft,
  watchDarkAppearance,
  setAppearancePreference,
} from "composerkit/lib/device";
import { useEffect, useState } from "react";

const MOTION_DURATION_MS = 600;

const Readout = ({
  label,
  testId,
  value,
}: {
  label: string;
  testId: string;
  value: string;
}) => (
  <div className="flex flex-wrap gap-x-2">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="m-0 font-medium" data-testid={testId}>
      {value}
    </dd>
  </div>
);

const yesNo = (value: boolean) => (value ? "yes" : "no");

const MotionExample = () => {
  const reduced = usePrefersReducedMotion();
  const [moved, setMoved] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  return (
    <section
      aria-labelledby="motion-device-heading"
      className="flex flex-col gap-3"
      id="reduced-motion"
    >
      <h2 className="text-title-md font-semibold" id="motion-device-heading">
        Reduced motion
      </h2>
      <p className="text-sm text-muted-foreground">
        hasReducedMotion follows the system setting. The button below asks
        motionDuration for a {MOTION_DURATION_MS} ms move, and gets 0 ms when
        motion is reduced.
      </p>
      <dl className="m-0 flex flex-col gap-1 text-sm">
        <Readout
          label="hasReducedMotion():"
          testId="reduced-motion-value"
          value={yesNo(reduced)}
        />
        <Readout
          label="Duration used by the last run:"
          testId="reduced-motion-duration"
          value={duration === null ? "not run yet" : `${duration} ms`}
        />
      </dl>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          onClick={() => {
            setDuration(motionDuration(MOTION_DURATION_MS));
            setMoved((current) => !current);
          }}
          color="outline"
          size="dialog"
        >
          Run motion
        </Button>
        <span className="relative block h-4 w-64 rounded-full bg-muted">
          <span
            className={`absolute top-0 left-0 size-4 rounded-full bg-primary transition-transform ease-out ${
              duration === MOTION_DURATION_MS ? "duration-600" : "duration-0"
            } ${moved ? "translate-x-60" : "translate-x-0"}`}
            data-testid="reduced-motion-dot"
          />
        </span>
      </div>
    </section>
  );
};

type OverrideChoice = "dark" | "light" | "system";

const overrideValues: Record<OverrideChoice, boolean | undefined> = {
  dark: true,
  light: false,
  system: undefined,
};

const choiceFromOverride = (value: boolean | undefined): OverrideChoice => {
  if (value === undefined) {
    return "system";
  }

  return value ? "dark" : "light";
};

const DarkModeExample = () => {
  const dark = useDarkMode();

  const [choice, setChoice] = useState(() =>
    choiceFromOverride(getAppearancePreference())
  );

  const [notifications, setNotifications] = useState<boolean[]>([]);
  const [failing, setFailing] = useState(false);

  useEffect(() => {
    const subscription = watchDarkAppearance((isDark) => {
      setNotifications((previous) => [...previous, isDark]);
    });

    return subscription.cancel;
  }, []);

  useEffect(() => {
    const subscription = failing
      ? watchDarkAppearance(() => {
          throw new Error("The demo listener deliberately threw an error");
        })
      : null;

    return () => subscription?.cancel();
  }, [failing]);

  return (
    <section
      aria-labelledby="dark-mode-heading"
      className="flex flex-col gap-3"
      id="dark-mode"
    >
      <h2 className="text-title-md font-semibold" id="dark-mode-heading">
        Dark mode
      </h2>
      <p className="text-sm text-muted-foreground">
        readDarkAppearance follows the system color scheme. The override setter
        replaces it until you pick System again. The panel takes its colors from
        the value, not from the page theme.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl<OverrideChoice>
          aria-label="Dark mode override"
          onChange={(next) => {
            setChoice(next);
            setAppearancePreference(overrideValues[next]);
          }}
          value={choice}
        >
          <SegmentedItem value="system">System</SegmentedItem>
          <SegmentedItem value="dark">Override dark</SegmentedItem>
          <SegmentedItem value="light">Override light</SegmentedItem>
        </SegmentedControl>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="dark-mode-failing"
        >
          Add an observer that throws
          <Switch
            checked={failing}
            id="dark-mode-failing"
            onChange={setFailing}
          />
        </label>
      </div>
      <div
        className={`${dark ? "dark" : "light"} flex flex-col gap-1 rounded-2xl border bg-background p-4 text-foreground`}
        data-testid="dark-mode-panel"
      >
        <dl className="m-0 flex flex-col gap-1 text-sm">
          <Readout
            label="readDarkAppearance():"
            testId="dark-mode-value"
            value={yesNo(dark)}
          />
          <Readout
            label="Observer calls:"
            testId="dark-mode-calls"
            value={`${notifications.length}, last ${
              notifications.length === 0
                ? "none"
                : yesNo(notifications.at(-1) ?? false)
            }`}
          />
        </dl>
        {failing && (
          <p className="m-0 text-xs text-muted-foreground">
            The throwing observer is attached. Its error is caught and logged as
            a warning, and the counter above keeps counting.
          </p>
        )}
      </div>
    </section>
  );
};

const localeExamples = [
  ["Device", ""],
  ["en-US", "en-US"],
  ["ar-EG", "ar-EG, en-US"],
  ["he-IL", "he-IL"],
  ["fa_IR", "fa_IR"],
  ["ckb-IQ", "ckb-IQ"],
  ["fr-FR", "fr-FR"],
] as const;

const RtlExample = () => {
  const deviceLocales = useDeviceLocales();
  const [input, setInput] = useState("");

  const typed = input
    .split(",")
    .map((locale) => locale.trim())
    .filter(Boolean);

  const locales = typed.length > 0 ? typed : deviceLocales;
  const rtl = prefersRightToLeft(locales);

  return (
    <section
      aria-labelledby="rtl-heading"
      className="flex flex-col gap-3"
      id="rtl"
    >
      <h2 className="text-title-md font-semibold" id="rtl-heading">
        Right to left
      </h2>
      <p className="text-sm text-muted-foreground">
        prefersRightToLeft looks at the language of the first locale only. Pick
        an example list or type your own, separated by commas. Device uses the
        browser language list.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {localeExamples.map(([label, value]) => (
          <Button
            key={label}
            onClick={() => {
              setInput(value);
            }}
            size="pageAction"
            color="outline"
          >
            {label}
          </Button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm" htmlFor="rtl-locales">
        Locale list
        <input
          className="max-w-md rounded-lg border bg-background px-3 py-2 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          id="rtl-locales"
          onChange={(event) => {
            setInput(event.target.value);
          }}
          placeholder={deviceLocales.join(", ") || "Device locales"}
          value={input}
        />
      </label>
      <dl className="m-0 flex flex-col gap-1 text-sm">
        <Readout
          label="Device locales:"
          testId="rtl-device"
          value={deviceLocales.join(", ") || "none"}
        />
        <Readout
          label="Locales checked:"
          testId="rtl-checked"
          value={locales.join(", ") || "none"}
        />
        <Readout
          label="prefersRightToLeft():"
          testId="rtl-value"
          value={yesNo(rtl)}
        />
      </dl>
      <div
        className="flex max-w-md items-center gap-3 rounded-2xl border bg-card p-4 text-card-foreground"
        data-testid="rtl-panel"
        dir={rtl ? "rtl" : "ltr"}
      >
        <CheckIcon aria-hidden className="size-5 shrink-0" />
        <span className="min-w-0 flex-1 text-sm">
          This row follows the direction prefersRightToLeft reports.
        </span>
        <span className="text-xs text-muted-foreground">
          dir={rtl ? "rtl" : "ltr"}
        </span>
      </div>
    </section>
  );
};

const inchesOf = (value: number) => `${value}px`;

const ViewportExample = () => {
  const viewport = useViewport();

  return (
    <section
      aria-labelledby="viewport-heading"
      className="flex flex-col gap-3"
      id="viewport-insets"
    >
      <h2 className="text-title-md font-semibold" id="viewport-heading">
        Viewport and insets
      </h2>
      <p className="text-sm text-muted-foreground">
        Resize the window or change the zoom to see the size and scale update.
        Insets are read from env(safe-area-inset-*) and stay 0 on a screen
        without a notch or rounded corners.
      </p>
      {viewport === null ? (
        <p className="m-0 text-sm">Measuring...</p>
      ) : (
        <dl className="m-0 grid max-w-md grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Window width</dt>
          <dd className="m-0" data-testid="viewport-width">
            {inchesOf(viewport.width)}
          </dd>
          <dt className="text-muted-foreground">Window height</dt>
          <dd className="m-0" data-testid="viewport-height">
            {inchesOf(viewport.height)}
          </dd>
          <dt className="text-muted-foreground">Display scale</dt>
          <dd className="m-0" data-testid="viewport-scale">
            {viewport.scale}
          </dd>
          <dt className="text-muted-foreground">Inset left</dt>
          <dd className="m-0" data-testid="viewport-inset-left">
            {inchesOf(viewport.insets.left)}
          </dd>
          <dt className="text-muted-foreground">Inset right</dt>
          <dd className="m-0" data-testid="viewport-inset-right">
            {inchesOf(viewport.insets.right)}
          </dd>
          <dt className="text-muted-foreground">Inset top</dt>
          <dd className="m-0" data-testid="viewport-inset-top">
            {inchesOf(viewport.insets.top)}
          </dd>
          <dt className="text-muted-foreground">Inset bottom</dt>
          <dd className="m-0" data-testid="viewport-inset-bottom">
            {inchesOf(viewport.insets.bottom)}
          </dd>
          <dt className="text-muted-foreground">isDesktopPlatform</dt>
          <dd className="m-0" data-testid="viewport-desktop">
            {yesNo(viewport.desktop)}
          </dd>
        </dl>
      )}
    </section>
  );
};

export { DarkModeExample, MotionExample, RtlExample, ViewportExample };
