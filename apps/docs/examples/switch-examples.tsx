"use client";

import { LabelledSwitch } from "composerkit/components/ui/labelled-switch";
import { Switch } from "composerkit/components/ui/switch";
import type { SwitchSize, SwitchTone } from "composerkit/components/ui/switch";
import { useState } from "react";

type Theme = "light" | "dark";

const initialValues = {
  "dark-accent-default-off": false,
  "dark-accent-default-on": true,
  "dark-accent-sm-off": false,
  "dark-accent-sm-on": true,
  "dark-neutral-default-off": false,
  "dark-neutral-default-on": true,
  "dark-neutral-sm-off": false,
  "dark-neutral-sm-on": true,
  labelled: true,
  "light-accent-default-off": false,
  "light-accent-default-on": true,
  "light-accent-sm-off": false,
  "light-accent-sm-on": true,
  "light-neutral-default-off": false,
  "light-neutral-default-on": true,
  "light-neutral-sm-off": false,
  "light-neutral-sm-on": true,
  prevented: false,
  rtl: true,
  "rtl-sm": false,
  slots: true,
} as const satisfies Record<string, boolean>;

const sizes = ["default", "sm"] as const satisfies readonly SwitchSize[];
const tones = ["accent", "neutral"] as const satisfies readonly SwitchTone[];
const themes = ["light", "dark"] as const satisfies readonly Theme[];

const onOff = (value: boolean) => (value ? "On" : "Off");

const SwitchGalleryExample = () => {
  const [values, setValues] = useState<Record<string, boolean>>(initialValues);
  const [lastChange, setLastChange] = useState("No change yet.");
  const [preventedClicks, setPreventedClicks] = useState(0);

  const set = (key: string, next: boolean) => {
    setValues((current) => ({ ...current, [key]: next }));
    setLastChange(`${key} called onChange(${next})`);
  };

  return (
    <section
      aria-labelledby="switch-heading"
      className="flex flex-col gap-6 p-4"
      id="switch"
    >
      <h2 className="text-title-md font-semibold" id="switch-heading">
        Switch
      </h2>
      <p
        className="m-0 text-sm text-muted-foreground"
        data-testid="last-change"
      >
        Last change: {lastChange}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => (
          <div
            className={`${theme} flex flex-col gap-3 rounded-2xl border bg-panel p-4 text-text`}
            data-testid={`panel-${theme}`}
            key={theme}
          >
            <h3 className="m-0 text-base font-medium">
              {theme === "light" ? "Light" : "Dark"} appearance
            </h3>
            <div
              className="flex flex-col items-start gap-5 py-4"
              data-testid={`labelled-${theme}`}
            >
              {(["end", "start"] as const).map((labelPosition) => (
                <LabelledSwitch
                  defaultChecked={labelPosition === "start"}
                  key={labelPosition}
                  label="Play a sound when a reply arrives"
                  labelPosition={labelPosition}
                />
              ))}
              <LabelledSwitch aria-label="On" defaultChecked />
              <LabelledSwitch disabled label="Off" />
              <LabelledSwitch defaultChecked disabled label="On" />
              <LabelledSwitch inert label="Play a sound when a reply arrives" />
              <LabelledSwitch
                label="Play a sound when a reply arrives"
                linkSwitch
              />
              <div dir="rtl">
                <LabelledSwitch
                  defaultChecked
                  label="Play a sound when a reply arrives"
                />
              </div>
            </div>
            {tones.map((tone) =>
              sizes.map((size) => (
                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-1"
                  key={`${tone}-${size}`}
                >
                  <span className="basis-full text-sm text-text-muted">
                    {tone}, {size}
                  </span>
                  {(["on", "off"] as const).map((position) => {
                    const key = `${theme}-${tone}-${size}-${position}`;

                    return (
                      <span
                        className="inline-flex items-center gap-2 text-sm"
                        key={key}
                      >
                        <Switch
                          ariaLabel={`${theme} ${tone} ${size} ${position}`}
                          checked={values[key] ?? false}
                          data-testid={key}
                          onChange={(next) => {
                            set(key, next);
                          }}
                          size={size}
                          tone={tone}
                        />
                        {onOff(values[key] ?? false)}
                      </span>
                    );
                  })}
                </div>
              ))
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="basis-full text-sm text-text-muted">
                disabled
              </span>
              {([false, true] as const).map((checked) => (
                <span
                  className="inline-flex items-center gap-2 text-sm"
                  key={String(checked)}
                >
                  <Switch
                    ariaLabel={`${theme} disabled ${onOff(checked)}`}
                    checked={checked}
                    data-testid={`${theme}-disabled-${checked ? "on" : "off"}`}
                    disabled
                    onChange={(next) => {
                      set(`${theme}-disabled-${checked}`, next);
                    }}
                  />
                  {onOff(checked)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground">
        <h3 className="m-0 text-base font-medium">Name, click and slots</h3>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="switch-labelled"
        >
          Play a sound when a reply arrives
          <Switch
            checked={values.labelled ?? false}
            id="switch-labelled"
            onChange={(next) => {
              set("labelled", next);
            }}
          />
        </label>
        <div className="flex items-center gap-2 text-sm">
          <Switch
            ariaLabel="Click handler prevents the toggle"
            checked={values.prevented ?? false}
            data-testid="prevented"
            onChange={(next) => {
              set("prevented", next);
            }}
            onClick={(event) => {
              event.preventDefault();
              setPreventedClicks((count) => count + 1);
            }}
          />
          onClick calls preventDefault. Clicks received: {preventedClicks}.
          State stays {onOff(values.prevented ?? false)}.
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Switch
            ariaLabel="Slot classes"
            checked={values.slots ?? false}
            className="mx-2"
            data-testid="slots"
            onChange={(next) => {
              set("slots", next);
            }}
            thumbClassName="mt-px"
            trackClassName="w-10"
          />
          className (mx-2) on the button, trackClassName (w-10) and
          thumbClassName (mt-px) on the inner spans.
        </div>
      </div>

      <div
        className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground"
        data-testid="panel-rtl"
        dir="rtl"
      >
        <h3 className="m-0 text-base font-medium">Right to left</h3>
        <label className="flex items-center gap-2 text-sm" htmlFor="switch-rtl">
          Default size
          <Switch
            checked={values.rtl ?? false}
            id="switch-rtl"
            onChange={(next) => {
              set("rtl", next);
            }}
          />
        </label>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="switch-rtl-sm"
        >
          Small size
          <Switch
            checked={values["rtl-sm"] ?? false}
            id="switch-rtl-sm"
            onChange={(next) => {
              set("rtl-sm", next);
            }}
            size="sm"
          />
        </label>
      </div>
    </section>
  );
};

export { SwitchGalleryExample };
